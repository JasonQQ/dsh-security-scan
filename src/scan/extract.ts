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
 * @module dsh-security-scan/scan/extract
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

/**
 * Hooks that run on the machine that *installs* the package.
 *
 * The distinction is the whole point of the install-script rules, and conflating
 * the two produced a critical finding on a plugin whose only hook was `prepack`.
 * `prepack`, `postpack`, `prepublish` and `prepublishOnly` run in the
 * maintainer's checkout when they pack or publish — they never execute on a
 * user's machine, so pairing them with a network sink proves nothing about what
 * installing the tarball does.
 *
 * `prepare` is included because npm does run it on a bare `npm install` in a
 * package root and when installing a git dependency, which are both paths a user
 * can take.
 */
const INSTALL_TIME_HOOKS: readonly string[] = ['preinstall', 'install', 'postinstall', 'prepare'];

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
  const lines = text.split(/\r?\n/);
  const generated = kind === 'code' || kind === 'script' ? looksGenerated(lines, bytes.length) : false;
  return {
    ...info,
    text,
    lines,
    ...(generated ? { generated: true } : {}),
    ...(isBuildConfig(path) ? { devOnly: true } : {}),
    role: fileRoleOf(path, kind, generated),
  };
}

/**
 * Whether a path names build-tool configuration.
 *
 * Kept narrow on purpose. `<name>.config.<ext>` is the convention every bundler
 * uses, and `tsconfig*.json` is the compiler's. Matching more broadly — anything
 * named `config`, or a whole `scripts/` directory — would start excluding files
 * that genuinely run at install time.
 *
 * @param path - path relative to the scanned root.
 * @returns true when the file configures a build rather than shipping behaviour.
 */
export function isBuildConfig(path: string): boolean {
  const base = basename(path).toLowerCase();
  if (/\.config\.(?:[cm]?[jt]s|tsx)$/.test(base)) return true;
  return /^tsconfig(?:\.[a-z0-9-]+)?\.json$/.test(base);
}

/**
 * Whether a file is machine-generated output rather than authored source.
 *
 * Structural, not name-based: a bundled `lib/client.js` is a handful of
 * enormous lines, whereas an authored file has many short ones. Matching on the
 * path (`lib/`, `dist/`) would be wrong in both directions — plenty of plugins
 * hand-write `lib/`, and plenty bundle into `src/`.
 *
 * The structural tests alone missed the commonest shape in the wild. A bundle
 * produced with `--minify-whitespace` (or a lightly-bundled CJS build) keeps
 * thousands of medium-length lines, so it looks authored by shape while being
 * generated in fact — and the batch run showed the consequence: the obfuscation
 * correlations fired on 67% of real plugins, because the "obfuscated payload"
 * they found was the bundler's own module-loader preamble. Emitting a runtime
 * loader is what bundling *is*, so those signatures are conclusive on their own.
 *
 * @param lines - the decoded lines.
 * @param bytes - the file's size.
 * @returns true when the shape says a build tool wrote it.
 */
export function looksGenerated(lines: readonly string[], bytes: number): boolean {
  if (bytes < 8 * 1024) return false;
  // A sourcemap trailer is a build tool's signature even in lightly bundled output.
  if (/\/\/[#@]\s*sourceMappingURL=/.test(lines.slice(-3).join('\n'))) return true;
  // Few lines, many bytes: the definition of minification.
  if (lines.length <= 40 && bytes / Math.max(1, lines.length) > 2000) return true;
  // One enormous line that is almost all non-whitespace.
  if (lines.some((line) => line.length > 50_000 && line.split(/\s+/).length < line.length / 200)) return true;
  return hasBundlerRuntime(lines);
}

/**
 * Signatures of a module bundle's own runtime.
 *
 * Each of these is something a bundler writes and a person does not: the private
 * helper names esbuild emits (`__toESM`, `__commonJS`, `__defProp`) exist so
 * generated code cannot collide with application identifiers, and webpack's
 * `__webpack_require__`/`webpackJsonp` are its public runtime. One is enough to
 * identify the file, because no hand-written module defines them accidentally.
 *
 * Scanned across the whole file, not just its head. A bundle's loader is emitted
 * where the first module that needs it is defined, which for a concatenated build
 * is frequently near the end — the file this check was written for carried its
 * `__modules[id]` table on line 2138, and a head-only scan missed it.
 *
 * @param lines - the decoded lines.
 * @returns true when a bundler's runtime is present.
 */
function hasBundlerRuntime(lines: readonly string[]): boolean {
  for (const line of lines) {
    // Cheap pre-filter: the markers all contain one of these, and most lines in
    // a file contain none of them, so the regexes run on a small subset.
    if (!line.includes('__') && !line.includes('webpack') && !line.includes('System.register')) continue;
    for (const pattern of BUNDLER_RUNTIME_MARKERS) {
      if (pattern.test(line)) return true;
    }
  }
  return false;
}

/** Markers that only a bundler's runtime emits. */
const BUNDLER_RUNTIME_MARKERS: readonly RegExp[] = [
  /__webpack_require__|webpackJsonp|__webpack_modules__/,
  /\bSystem\.register\(/,
  /\b__d\(function/,
  /__commonJS\(|__toESM\(|__toCommonJS\(|__defProp\(|__getOwnPropNames\(|__export\(|__require\(/,
  /\b__modules\[/,
];

/**
 * What kind of evidence a file is, for judging how strong a finding in it is.
 *
 * `kind` answers "what language is this"; role answers "whose behavior does a
 * finding here describe". Those are different questions, and the batch run is
 * what showed the difference matters:
 *
 * - A `rm -rf /` in `test/sanitize-command.test.js` is an *input to a sanitizer*
 *   — the file asserts that the destructive command is rejected. Read as shipped
 *   behavior it is a critical finding, and it graded 11 of 91 real plugins D.
 * - A credential path in a `CHANGELOG.md` entry is prose about a past release,
 *   but it satisfied the credential half of an exfiltration correlation.
 * - A semgrep rule that *blocks* `169.254.169.254` was reported as reaching it.
 *
 * Findings in these files are still worth reporting — a skill file's instructions
 * are exactly what the prompt-injection rules exist for, and a fixture can reveal
 * what the code was built to handle. They are not, however, evidence about what
 * the package does when a user installs it, which is the question a trust grade
 * answers. So they are reported at a capped severity instead of deciding a grade.
 */
export type FileRole = 'source' | 'test' | 'doc' | 'generated' | 'config';

/**
 * Classify a file's role.
 *
 * @param path - path relative to the scanned root.
 * @param kind - the file kind.
 * @param generated - whether the shape says a build tool wrote it.
 * @returns the role.
 */
export function fileRoleOf(path: string, kind: FileKind, generated: boolean): FileRole {
  // Generated output wins over everything: a bundled test helper is still a
  // bundle, and the reviewed source it came from is usually staged beside it.
  if (generated) return 'generated';
  if (kind === 'manifest' || kind === 'config') return 'config';
  if (kind === 'doc') return 'doc';
  if (isTestPath(path)) return 'test';
  return 'source';
}

/**
 * Whether a path names test code, a fixture, or an example.
 *
 * `examples/` and `docs/` are included deliberately: an example plugin's
 * `fetch(…)` and `spawn(…)` document how to call the API, and a proof-of-concept
 * script under `docs/` is an illustration — one such file spawns
 * `"/usr/bin/logger; rm -rf /"` precisely to demonstrate that the hook is unsafe,
 * which read as a shipped destructive command.
 *
 * @param path - path relative to the scanned root.
 * @returns true when the file is development-only test material.
 */
export function isTestPath(path: string): boolean {
  const lower = path.toLowerCase();
  const base = lower.slice(lower.lastIndexOf('/') + 1);
  if (/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(base)) return true;
  if (/^(?:test|tests|__tests__|__mocks__|fixtures|__fixtures__|e2e|examples?|bench|benchmarks|docs?)\//.test(lower)) return true;
  return /\/(?:test|tests|__tests__|__mocks__|fixtures|__fixtures__|e2e|examples?|docs?)\//.test(lower);
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
    out.push({
      hook,
      command: manifest.scripts[hook] as string,
      file: path,
      fromDependency,
      installTime: INSTALL_TIME_HOOKS.includes(hook),
    });
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

    // Documentation describes the package; it does not run. A README's link list
    // is not a set of destinations the plugin contacts, and a changelog naming a
    // credential path is not a credential read — but every URL and path in prose
    // was being recorded as a capability, and the batch run showed the cost: the
    // "domains contacted" list for a real plugin was
    // `keepachangelog.com`, `www.contributor-covenant.org`, `www.w3.org`, and
    // `net.excessive-distinct-hosts` fired on 57 of 91 packages counting README
    // links. Line rules still scan documents — that is where prompt injection
    // lives — but the capability inventory is about code.
    if (info.kind === 'doc') continue;

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
