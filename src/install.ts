/**
 * The install check: layer one's enforcement point.
 *
 * Auditing a plugin is only useful if the audit stands between the package and
 * the machine. This module recognizes the commands that install something, and
 * turns the registry's verdict into a decision the tool pipeline acts on.
 *
 * The interesting case is a **local source**. `dsh plugin add ./some-plugin`, a
 * path, or a local tarball names bytes the scanner can read *right now*, so for
 * those it audits the real artifact inline and refuses on the real grade —
 * not on a name it hopes matches. For a registry spec the scanner can only bind a
 * grade to the name that was audited earlier, which is weaker, and the refusal
 * text says so rather than implying a guarantee it cannot make.
 *
 * @module dsh-security-scan/install
 */

import { existsSync, statSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

import type { Grade, ScanResult } from './types.js';
import type { PluginConfig } from './config.js';
import { type AuditRegistry, normalizeSpec } from './scan/registry.js';
import { auditSource } from './scan/engine.js';
import { renderSummary } from './scan/report.js';

/** A recognized install command. */
export interface InstallAttempt {
  /** Which installer: `dsh`, `npm`, `pnpm`, `yarn`, or `bun`. */
  manager: 'dsh' | 'npm' | 'pnpm' | 'yarn' | 'bun';
  /** The specs the command would install; empty means "whatever is declared here". */
  specs: string[];
  /** The command line the specs were read from. */
  command: string;
}

/** The outcome of enforcing the install policy. */
export interface InstallDecision {
  action: 'allow' | 'ask' | 'block';
  /** Why, phrased for the model that issued the command. */
  reason?: string;
  /**
   * Set when the install would have been refused but `install.allow` matched.
   *
   * Carried out to the caller rather than logged here, because logging is the
   * plugin's job and this module stays free of I/O so it can be tested directly.
   * The caller records it, which is what makes the override reviewable.
   */
  override?: {
    /** The `install.allow` entry that matched. */
    entry: string;
    /** The grade that entry overrode. */
    grade: Grade;
    /** Digest of the audited content, when the audit produced one. */
    digest?: string;
  };
}

/** Normalized digest form, so `sha256:<hex>` and a bare hex digest compare equal. */
function normalizeDigest(value: string): string | undefined {
  const match = /^(?:sha256:)?([0-9a-f]{64})$/i.exec(value.trim());
  return match === undefined || match === null ? undefined : (match[1] as string).toLowerCase();
}

/**
 * Find the `install.allow` entry that permits a source, if any.
 *
 * An entry matches either the source's identity (package name or resolved path,
 * compared through the same normalization the audit registry uses) or the digest
 * of the exact bytes that were audited. The digest form is the stronger claim:
 * it permits one artifact rather than one name.
 *
 * @param allow - the configured entries.
 * @param spec - the spec being installed.
 * @param digest - the digest of the audited content, when one is known.
 * @returns the matching entry as configured, or `undefined`.
 */
export function matchAllowEntry(
  allow: readonly string[],
  spec: string | readonly string[],
  digest?: string,
): string | undefined {
  // A source has more than one identity, and they differ by how it arrived. A
  // registry install names a package; a local install names a path whose manifest
  // declares a package name; both have a digest. Accepting only one of those
  // would mean `install.allow: [my-plugin]` silently failed to match
  // `dsh plugin add ./my-plugin`, which is the same plugin.
  const candidates = (typeof spec === 'string' ? [spec] : spec)
    .map((candidate) => normalizeSpec(candidate))
    .filter((candidate) => candidate.length > 0);
  const normalizedDigest = digest === undefined ? undefined : normalizeDigest(digest);
  for (const entry of allow) {
    const trimmed = entry.trim();
    if (trimmed.length === 0) continue;
    const entryDigest = normalizeDigest(trimmed);
    if (entryDigest !== undefined) {
      // A digest entry only ever matches a digest, never a name: comparing a
      // digest-shaped string against a package name would be meaningless.
      if (normalizedDigest !== undefined && entryDigest === normalizedDigest) return trimmed;
      continue;
    }
    const normalizedEntry = normalizeSpec(trimmed);
    if (normalizedEntry.length > 0 && candidates.includes(normalizedEntry)) return trimmed;
  }
  return undefined;
}

/**
 * Command prefixes that install packages.
 *
 * Anchored with `^` (against a command position, see {@link commandSegments}),
 * never a bare substring: `grep -rn "npm install" README.md` contains a real
 * installer invocation as text, and refusing it would be a false positive on
 * ordinary documentation work. An optional `sudo`/`env` prefix is allowed
 * because `sudo npm i -g x` genuinely installs.
 */
const INSTALL_FORMS: readonly { re: RegExp; manager: InstallAttempt['manager'] }[] = [
  { re: /^(?:sudo\s+)?dsh\s+plugin\s+(?:--?\S+\s+|--profile[=\s]\S+\s+)*add\b/, manager: 'dsh' },
  { re: /^(?:sudo\s+)?(?:env\s+\S+\s+)?(?:pnpm|pnpx)\s+(?:add|install|i)\b/, manager: 'pnpm' },
  { re: /^(?:sudo\s+)?(?:env\s+\S+\s+)?(?:npm|npx)\s+(?:install|i|add)\b/, manager: 'npm' },
  { re: /^(?:sudo\s+)?(?:env\s+\S+\s+)?yarn\s+(?:add|install)\b/, manager: 'yarn' },
  { re: /^(?:sudo\s+)?(?:env\s+\S+\s+)?bun\s+(?:add|install|i)\b/, manager: 'bun' },
];

/** Flags that are not package specs. */
function isFlag(token: string): boolean {
  return token.startsWith('-');
}

/** Split a command into shell-ish tokens, respecting simple quoting. */
export function tokenize(command: string): string[] {
  const tokens: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(command)) !== null) {
    const value = match[1] ?? match[2] ?? match[3] ?? '';
    if (value.length > 0) tokens.push(value);
  }
  return tokens;
}

/**
 * Split a command line into the segments that each start a command.
 *
 * Quoting is respected, so `echo "a; npm install b"` is one segment beginning
 * with `echo` rather than two. `&&`, `||`, `|`, `;`, newlines and a leading `(`
 * or `$(` all begin a new command position.
 *
 * @param command - the command line.
 * @returns the segments, each trimmed, in source order.
 */
export function commandSegments(command: string): string[] {
  const segments: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let escaped = false;
  const push = (): void => {
    const trimmed = current.trim();
    if (trimmed.length > 0) segments.push(trimmed);
    current = '';
  };
  for (let index = 0; index < command.length; index += 1) {
    const char = command[index] as string;
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === '\\' && quote !== "'") {
      current += char;
      escaped = true;
      continue;
    }
    if (quote !== null) {
      current += char;
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (char === ';' || char === '\n') {
      push();
      continue;
    }
    if (char === '&' || char === '|') {
      // Consume the second character of `&&` and `||`.
      if (command[index + 1] === char) index += 1;
      push();
      continue;
    }
    if (char === '(') {
      push();
      continue;
    }
    current += char;
  }
  push();
  return segments;
}

/**
 * Recognize an install command and extract its targets.
 *
 * @param command - the shell command text.
 * @returns the attempt, or `undefined` when the command installs nothing.
 */
export function detectInstallAttempt(command: string): InstallAttempt | undefined {
  for (const segment of commandSegments(command)) {
    for (const form of INSTALL_FORMS) {
      const match = form.re.exec(segment);
      if (match === null) continue;
      const rest = segment.slice(match[0].length);
      const tokens = tokenize(rest);
      const specs: string[] = [];
      for (const token of tokens) {
        if (isFlag(token)) continue;
        // Stop at a redirection or the next command word.
        if (/^[<>]/.test(token)) break;
        specs.push(token);
      }
      return { manager: form.manager, specs, command: segment.slice(0, 200) };
    }
  }
  return undefined;
}

/** Whether a spec names something already on disk. */
function localPathOf(spec: string): string | undefined {
  const trimmed = spec.replace(/^file:/, '').replace(/^['"]|['"]$/g, '');
  if (!/^(?:\.{0,2}\/|\/|~\/)/.test(trimmed) && !/\.(?:tgz|tar\.gz|tar)$/i.test(trimmed)) return undefined;
  const expanded = trimmed.startsWith('~') ? resolve(process.env['HOME'] ?? '~', trimmed.slice(2)) : trimmed;
  const absolute = isAbsolute(expanded) ? expanded : resolve(process.cwd(), expanded);
  try {
    return statSync(absolute).isDirectory() || statSync(absolute).isFile() ? absolute : undefined;
  } catch {
    return undefined;
  }
}

/** Format the one-line reason a grade was refused. */
function refusalReason(result: ScanResult, why: string): string {
  return [
    `dsh-security-scan refused this install: ${why}`,
    '',
    renderSummary(result),
    '',
    'Run `security_scan_audit` on the source to see the full report.',
    'If you have read the findings and accept the risk, add the package name or the content digest above to `install.allow` — the override is permitted and recorded in the audit log rather than unavailable, because a gate that cannot be overridden is one that gets uninstalled instead of argued with.',
  ].join('\n');
}

/**
 * Enforce the install policy against one command.
 *
 * @param attempt - the recognized install command.
 * @param registry - the audit registry.
 * @param config - the resolved configuration.
 * @returns the decision, plus an audit record when a local source was audited inline.
 */
export async function enforceInstallAttempt(
  attempt: InstallAttempt,
  registry: AuditRegistry,
  config: PluginConfig,
): Promise<{ decision: InstallDecision; audited?: ScanResult }> {
  const floor: Grade = config.install.blockAtOrBelow;
  let audited: ScanResult | undefined;

  for (const spec of attempt.specs) {
    const local = localPathOf(spec);
    if (local !== undefined) {
      // The bytes are right here: audit them and decide on the real grade.
      let result: ScanResult;
      try {
        result = await auditSource(local, {
          allowFetch: false,
          blockAtOrBelow: floor,
        });
      } catch (error) {
        return {
          decision: {
            action: 'ask',
            reason: `dsh-security-scan could not audit the local source ${spec}: ${error instanceof Error ? error.message : String(error)}. Confirm before installing an unaudited package.`,
          },
        };
      }
      registry.record(result);
      audited = result;
      if (result.blocked) {
        // The path, the manifest's package name, and the digest are all
        // identities of the same artifact; an allow entry may name any of them.
        const entry = matchAllowEntry(
          config.install.allow,
          [local, result.manifest?.name ?? ''],
          result.digest,
        );
        if (entry !== undefined) {
          return {
            decision: { action: 'allow', override: { entry, grade: result.grade, digest: result.digest } },
            audited: result,
          };
        }
        return {
          decision: { action: 'block', reason: refusalReason(result, `${spec} scored grade ${result.grade} (${result.score}/100), at or below the refusal floor ${floor}`) },
          audited: result,
        };
      }
      continue;
    }

    const verdict = registry.verdictFor(spec, floor);
    if (verdict.kind === 'fail') {
      const entry = matchAllowEntry(config.install.allow, spec, verdict.record.digest);
      if (entry !== undefined) {
        return {
          decision: { action: 'allow', override: { entry, grade: verdict.record.grade, digest: verdict.record.digest } },
        };
      }
      return {
        decision: {
          action: 'block',
          reason: refusalReason(
            verdict.record.result,
            `${spec} was audited as grade ${verdict.record.grade} (${verdict.record.score}/100), at or below the refusal floor ${floor}`,
          ),
        },
      };
    }
    if (verdict.kind === 'unknown' || verdict.kind === 'stale') {
      if (!config.guard.requireAuditForInstall) continue;
      const stale = verdict.kind === 'stale';
      return {
        decision: {
          action: 'ask',
          reason: [
            `dsh-security-scan has no ${stale ? 'current' : ''} audit for "${spec}".`,
            stale
              ? `The last audit of "${spec}" is older than the ${Math.round(config.log.ttlMs / 3_600_000)}h validity window, and it described different bytes than a registry install would fetch.`
              : 'Nothing has been audited under this name in this session.',
            '',
            `Run \`security_scan_audit\` with source "${spec}" first, then retry the install.`,
            'A registry install fetches bytes the scanner has not seen, so an audit binds to the name that was audited, not to what npm or git will serve.',
          ].join('\n'),
        },
      };
    }
  }

  const emptyNote = attempt.specs.length === 0
    ? 'This command installs the dependencies declared by the current project, whose lifecycle scripts run on this machine.'
    : undefined;
  if (emptyNote !== undefined && config.guard.requireAuditForInstall) {
    return { decision: { action: 'ask', reason: `dsh-security-scan: ${emptyNote} Confirm before proceeding.` } };
  }
  return { decision: { action: 'allow' }, ...(audited !== undefined ? { audited } : {}) };
}

/** Whether a path exists, used by the status tool to report auto-audit targets. */
export function pathExists(path: string): boolean {
  return existsSync(path);
}
