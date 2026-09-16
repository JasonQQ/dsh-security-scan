/**
 * Turning staged bytes into the facts rules reason about.
 *
 * This module builds three things: per-file `FileInfo` (decoded, split, kind-
 * classified), the capability inventory (what paths, commands and domains the
 * plugin touches), and the manifest-derived install-script list.
 *
 * One subtlety worth stating, because it drives the design of `lineViews`:
 * capabilities are usually assembled, not written literally. A plugin that
 * steals an SSH key usually reads
 *
 * ```js
 * fs.readFileSync(path.join(os.homedir(), '.ssh', 'id_rsa'))
 * ```
 *
 * where no single token is `~/.ssh/id_rsa`. A line rule matching the literal
 * path would miss it. So each line is presented to rules in more than one
 * spelling, including a concatenation-joined form, and a finding is deduplicated
 * across spellings.
 *
 * @module dsh-security-gate/scan/extract
 */

import { basename, extname } from 'node:path';

import type {
  Capability,
  Capabilities,
  Evidence,
  InstallScript,
  ScannedManifest,
} from '../types.js';
import { HOSTNAME_RE, normalizeIPv4 } from '../util/patterns.js';
import { parseJsonLoose, redact, safeClip } from '../util/text.js';
import { extractUrls, parseUrlParts } from '../util/normalize.js';
import type { FileInfo, FileKind } from './rule-types.js';
import {
  ALL_CREDENTIAL_PATHS,
  COMMAND_SINKS,
  DECODE_SINKS,
  DYNAMIC_CODE_SINKS,
  FS_READ_SINKS,
  FS_WRITE_SINKS,
  NETWORK_SINKS,
  hasSink,
  isCommentLine,
  looksLikePath,
  stringLiterals,
} from './helpers.js';
import { type StagedSource, looksBinary } from './load.js';

/** Extensions treated as executable code. */
const CODE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.jsx', '.ts', '.mts', '.cts', '.tsx']);

/** Extensions treated as shell or shell-adjacent scripts. */
const SCRIPT_EXTENSIONS = new Set(['.sh', '.bash', '.zsh', '.fish', '.ps1', '.psm1', '.bat', '.cmd', '.command']);

/** Extensions treated as prose, where instruction-shaped text is a finding. */
const DOC_EXTENSIONS = new Set(['.md', '.mdx', '.txt', '.rst', '.adoc', '.markdown']);

/** Extensions treated as configuration. */
const CONFIG_EXTENSIONS = new Set([
  '.json',
  '.jsonc',
  '.yaml',
  '.yml',
  '.toml',
  '.ini',
  '.cfg',
  '.conf',
  '.properties',
  '.env',
  '.xml',
  '.plist',
]);

/** Filenames that are configuration regardless of extension. */
const CONFIG_BASENAMES = new Set(['.npmrc', '.yarnrc', '.env', '.gitignore', '.npmignore', 'Dockerfile', 'Makefile', '.babelrc']);

/** Statistics the correlation rules consult. */
export interface ExtractionStats {
  codeFiles: number;
  codeBytes: number;
  totalLines: number;
  /** Longest line in a code file — a minified blob shows up here. */
  maxCodeLineLength: number;
  dynamicCodeLines: number;
  decodeLines: number;
  networkSinkLines: number;
  commandSinkLines: number;
  credentialPathLines: number;
  /** Files skipped because they are binary, with their paths. */
  binaryFiles: string[];
}

/** Everything the rule engine consumes. */
export interface Extraction {
  files: FileInfo[];
  manifest?: ScannedManifest;
  /** Path of the manifest that was parsed, relative to the root. */
  manifestPath?: string;
  installScripts: InstallScript[];
  capabilities: Capabilities;
  stats: ExtractionStats;
  /** Notes raised while extracting, e.g. undecodable files. */
  notes: string[];
}

/** npm lifecycle hooks that run during install, in the order npm runs them. */
const LIFECYCLE_HOOKS: readonly string[] = [
  'preinstall',
  'install',
  'postinstall',
  'prepublish',
  'prepublishOnly',
  'prepare',
  'prepack',
  'postpack',
];

/** Classify a file path. */
export function classifyFile(path: string): FileKind {
  const base = basename(path);
  const lower = base.toLowerCase();
  const extension = extname(lower);
  if (lower === 'package.json') return 'manifest';
  if (CODE_EXTENSIONS.has(extension)) return 'code';
  if (SCRIPT_EXTENSIONS.has(extension)) return 'script';
  if (DOC_EXTENSIONS.has(extension)) return 'doc';
  if (CONFIG_EXTENSIONS.has(extension)) return 'config';
  if (CONFIG_BASENAMES.has(base)) return 'config';
  return 'other';
}

/**
 * Decode a staged file into a `FileInfo`.
 *
 * Binary files are still listed — a shipped binary is a fact worth reporting —
 * but carry no lines, so no line rule can match inside them.
 *
 * @param path - path relative to the scanned root.
 * @param bytes - the file's bytes.
 * @returns the decoded file info.
 */
export function toFileInfo(path: string, bytes: Buffer): FileInfo {
  const kind = classifyFile(path);
  const info: FileInfo = { path, text: '', lines: [], kind, bytes: bytes.length };
  if (looksBinary(bytes)) {
    return { ...info, decodeError: 'binary file: contents are not scanned' };
  }
  const text = bytes.toString('utf8');
  return { ...info, text, lines: text.split(/\r?\n/) };
}

/**
 * The spellings of one line that rules are tested against.
 *
 * Always includes the raw line. When the line concatenates two or more string
 * literals — the `path.join('a', 'b')` / `'a' + 'b'` patterns — an additional
 * spelling joins them, so a rule written against the assembled value matches.
 *
 * @param line - the raw source line.
 * @returns the distinct line views, raw first.
 */
export function lineViews(line: string): string[] {
  const views = [line];
  if (line.length < 6) return views;
  if (!/(?:\+|\bjoin\s*\(|\bresolve\s*\(|\bconcat\s*\(|,\s*['"`])/.test(line)) return views;
  const literals = stringLiterals(line).filter((literal) => literal.value.length > 0);
  if (literals.length < 2) return views;
  const values = literals.map((literal) => literal.value);
  const joined = values.join('');
  if (joined !== line && !views.includes(joined)) views.push(joined);
  // A path-joined spelling only makes sense when the source looks like it is
  // building a path; emitting it everywhere would invent paths that do not exist.
  if (/\bjoin\s*\(|\bresolve\s*\(|['"`]\//.test(line)) {
    const pathJoined = values.join('/').replace(/\/{2,}/g, '/');
    if (!views.includes(pathJoined)) views.push(pathJoined);
  }
  return views;
}

/** Parse a `package.json`-shaped manifest. */
export function parseManifest(text: string): ScannedManifest | undefined {
  const parsed = parseJsonLoose(text);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return undefined;
  const record = parsed as Record<string, unknown>;
  const strings = (value: unknown): Record<string, string> => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
    const out: Record<string, string> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (typeof item === 'string') out[key] = item;
    }
    return out;
  };
  const manifest: ScannedManifest = {
    scripts: strings(record['scripts']),
    dependencies: strings(record['dependencies']),
    devDependencies: strings(record['devDependencies']),
    optionalDependencies: strings(record['optionalDependencies']),
    hasBin: record['bin'] !== undefined,
  };
  if (typeof record['name'] === 'string') manifest.name = record['name'];
  if (typeof record['version'] === 'string') manifest.version = record['version'];
  if (record['dsh'] !== undefined) manifest.dsh = record['dsh'];
  return manifest;
}

/** Extract lifecycle scripts from a manifest. */
function installScriptsFrom(
  manifest: ScannedManifest,
  path: string,
  fromDependency: boolean,
): InstallScript[] {
  const out: InstallScript[] = [];
  for (const hook of Object.keys(manifest.scripts)) {
    if (!LIFECYCLE_HOOKS.includes(hook)) continue;
    out.push({ hook, command: manifest.scripts[hook] as string, file: path, fromDependency });
  }
  return out;
}

/** Whether a literal should be recorded as a path touched by a sink on the same line. */
function pathCandidate(value: string): boolean {
  if (looksLikePath(value)) return true;
  if (value.length === 0 || value.length > 512) return false;
  if (!/^[\w.@$~-]+(?:\.[A-Za-z0-9]{1,8})?$/.test(value)) return false;
  return /^\.?\w/.test(value) && /\.[A-Za-z0-9]{1,8}$/.test(value);
}

/**
 * The text inside the parentheses of the first `join(`/`resolve(` call on a line.
 *
 * Scoping matters: in `readFileSync(path.join(dir, 'a'), 'utf8')` the `'utf8'`
 * literal is an encoding, not a path segment, and including it produces
 * `~/.ssh/id_rsa/utf8` — an inventory entry that names nothing real.
 *
 * @param line - the source line.
 * @returns the argument text, or `undefined` when the line has no such call.
 */
function joinArguments(line: string): string | undefined {
  const call = /\b(?:join|resolve)\s*\(/.exec(line);
  if (call === null) return undefined;
  const start = call.index + call[0].length;
  let depth = 1;
  let quote: '"' | "'" | '`' | null = null;
  let escaped = false;
  for (let index = start; index < line.length; index += 1) {
    const char = line[index] as string;
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (quote !== null) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === '(') depth += 1;
    else if (char === ')') {
      depth -= 1;
      if (depth === 0) return line.slice(start, index);
    }
  }
  return line.slice(start);
}

/**
 * Reassemble a path built by concatenation on one line.
 *
 * `path.join(os.homedir(), '.ssh', 'id_rsa')` is recorded as `~/.ssh/id_rsa`.
 * The substitution of `~` for a home-directory call is what makes the result
 * recognizable in a report; it is a display convention, not a claim about the
 * resolved value.
 *
 * @param line - the source line.
 * @returns the assembled path, or `undefined` when the line builds no path.
 */
function assemblePath(line: string): string | undefined {
  const argumentsText = joinArguments(line);
  const scope = argumentsText ?? line;
  const literals = stringLiterals(scope)
    .map((literal) => literal.value)
    .filter((value) => value.length > 0 && !/^(?:https?|file):/.test(value));
  if (literals.length === 0) return undefined;
  const usesHome = /\bhomedir\s*\(|\bprocess\.env\.HOME\b|\bprocess\.env\[['"]HOME['"]\]/.test(line);
  const assembled = literals.join('/').replace(/\/{2,}/g, '/');
  if (usesHome) return assembled.startsWith('/') ? `~${assembled}` : `~/${assembled}`;
  return assembled;
}

/**
 * Record a capability once per (kind, value, file) — repeats add nothing.
 *
 * Values are redacted on entry. A capability value is a source literal, so it can
 * itself be a secret: `curl -H "Authorization: Bearer sk-…"` puts a live token in
 * the command inventory, and the inventory is printed into reports and tool
 * results. Redacting at the point of recording means no downstream consumer — a
 * report, a tool result, a future one — can leak it.
 */
class CapabilitySet {
  private readonly seen = new Set<string>();

  constructor(private readonly buckets: Capability[]) {}

  add(kind: string, value: string, evidence: Evidence): void {
    const key = `${kind}\u0000${value}\u0000${evidence.file}`;
    if (this.seen.has(key)) return;
    if (this.buckets.length >= 500) return;
    this.seen.add(key);
    this.buckets.push({ value: redact(value), evidence });
  }
}

/**
 * Extract the capability inventory and statistics from staged files.
 *
 * @param staged - the staged source tree.
 * @returns the extraction result.
 */
export function extract(staged: StagedSource): Extraction {
  const files: FileInfo[] = [];
  const notes: string[] = [...staged.notes];
  const capabilities: Capabilities = {
    fileReads: [],
    fileWrites: [],
    commands: [],
    domains: [],
    envVars: [],
    networkSinks: [],
  };
  const reads = new CapabilitySet(capabilities.fileReads);
  const writes = new CapabilitySet(capabilities.fileWrites);
  const commands = new CapabilitySet(capabilities.commands);
  const domains = new CapabilitySet(capabilities.domains);
  const envVars = new CapabilitySet(capabilities.envVars);
  const sinks = new CapabilitySet(capabilities.networkSinks);

  const stats: ExtractionStats = {
    codeFiles: 0,
    codeBytes: 0,
    totalLines: 0,
    maxCodeLineLength: 0,
    dynamicCodeLines: 0,
    decodeLines: 0,
    networkSinkLines: 0,
    commandSinkLines: 0,
    credentialPathLines: 0,
    binaryFiles: [],
  };

  let manifest: ScannedManifest | undefined;
  let manifestPath: string | undefined;
  const installScripts: InstallScript[] = [];

  for (const file of staged.files) {
    const info = toFileInfo(file.path, file.bytes);
    files.push(info);

    if (info.decodeError !== undefined) {
      stats.binaryFiles.push(info.path);
      continue;
    }
    if (info.kind === 'code') {
      stats.codeFiles += 1;
      stats.codeBytes += info.bytes;
    }
    stats.totalLines += info.lines.length;

    if (info.kind === 'manifest' && manifest === undefined) {
      const parsed = parseManifest(info.text);
      if (parsed !== undefined) {
        manifest = parsed;
        manifestPath = info.path;
        installScripts.push(...installScriptsFrom(parsed, info.path, false));
      } else {
        notes.push(`${info.path} is not valid JSON and was not treated as a manifest`);
      }
    }

    for (let index = 0; index < info.lines.length; index += 1) {
      const raw = info.lines[index] as string;
      if (info.kind === 'code' && raw.length > stats.maxCodeLineLength) stats.maxCodeLineLength = raw.length;
      if (isCommentLine(raw, info)) continue;
      const lineNumber = index + 1;

      const hasRead = hasSink(raw, FS_READ_SINKS);
      const hasWrite = hasSink(raw, FS_WRITE_SINKS);
      const hasCommand = hasSink(raw, COMMAND_SINKS);
      const hasNetwork = hasSink(raw, NETWORK_SINKS);
      const isDynamic = hasSink(raw, DYNAMIC_CODE_SINKS);
      const isDecode = hasSink(raw, DECODE_SINKS);

      if (isDynamic) stats.dynamicCodeLines += 1;
      if (isDecode) stats.decodeLines += 1;
      if (hasNetwork) stats.networkSinkLines += 1;
      if (hasCommand) stats.commandSinkLines += 1;
      if (ALL_CREDENTIAL_PATHS.some((fragment) => raw.includes(fragment))) stats.credentialPathLines += 1;

      const evidenceFor = (snippet: string): Evidence => ({
        file: info.path,
        line: lineNumber,
        snippet: safeClip(snippet),
      });

      for (const view of lineViews(raw)) {
        for (const literal of stringLiterals(view)) {
          const value = literal.value;
          if (value.length === 0 || value.length > 512) continue;
          if (hasRead && pathCandidate(value)) reads.add('file-read', value, evidenceFor(literal.raw));
          if (hasWrite && pathCandidate(value)) writes.add('file-write', value, evidenceFor(literal.raw));
          if (hasCommand && value.length > 1) commands.add('command', value, evidenceFor(literal.raw));
        }

        // `path.join(os.homedir(), '.ssh', 'id_rsa')` yields no single token that
        // is `~/.ssh/id_rsa`, so the assembled value is recorded explicitly.
        // Without this the inventory reports the fragments (`.ssh`, `id_rsa`)
        // and the reader has to reassemble the path themselves.
        if ((hasRead || hasWrite) && /\b(?:join|resolve)\s*\(|\bhomedir\s*\(/.test(raw)) {
          const assembled = assemblePath(raw);
          if (assembled !== undefined && assembled.length > 2) {
            const evidence = evidenceFor(assembled);
            if (hasRead && pathCandidate(assembled)) reads.add('file-read', assembled, evidence);
            if (hasWrite && pathCandidate(assembled)) writes.add('file-write', assembled, evidence);
          }
        }

        for (const url of extractUrls(view)) {
          const parts = parseUrlParts(url);
          if (parts === undefined) continue;
          const evidence = evidenceFor(url);
          const host = normalizeIPv4(parts.host) ?? parts.host;
          if (host.length === 0) continue;
          domains.add('domain', host, evidence);
          if (hasNetwork) sinks.add('network-sink', `${parts.scheme}://${host}`, evidence);
        }

        if (hasNetwork) {
          for (const literal of stringLiterals(view)) {
            if (literal.value.includes('://')) continue;
            const candidate = literal.value.trim();
            if (candidate.length < 4 || candidate.length > 253) continue;
            if (looksLikePath(candidate)) continue;
            const hostname = new RegExp(HOSTNAME_RE.source, 'i').exec(candidate);
            if (hostname === null || hostname[0] !== candidate) continue;
            domains.add('domain', candidate.toLowerCase(), evidenceFor(literal.raw));
          }
        }
      }

      for (const match of raw.matchAll(/process\.env(?:\.([A-Za-z_][A-Za-z0-9_]*)|\['([^']+)'\]|\["([^"]+)"\])/g)) {
        const name = match[1] ?? match[2] ?? match[3];
        if (name !== undefined) envVars.add('env', name, evidenceFor(match[0]));
      }
      // A bulk `process.env` reference reads every exported variable — including
      // the API keys a CI runner or a harness session exports — so it belongs in
      // the inventory even though it names no single variable.
      if (/(?<![\w.])process\.env(?![.\w[])/.test(raw)) {
        envVars.add('env', 'process.env (every variable)', evidenceFor(raw));
      }
    }
  }

  notes.push(...staged.notes.filter((note) => !notes.includes(note)));
  if (stats.binaryFiles.length > 0) {
    // Reported rather than silently skipped: a shipped binary is opaque to every
    // line rule, and a reader needs to know the grade does not cover it.
    const shown = stats.binaryFiles.slice(0, 5).join(', ');
    notes.push(
      stats.binaryFiles.length <= 5
        ? `not scanned (binary, contents unreadable as text): ${shown}`
        : `not scanned (binary): ${shown} and ${stats.binaryFiles.length - 5} more`,
    );
  }
  return {
    files,
    ...(manifest !== undefined ? { manifest } : {}),
    ...(manifestPath !== undefined ? { manifestPath } : {}),
    installScripts,
    capabilities,
    stats,
    notes: [...new Set(notes)],
  };
}
