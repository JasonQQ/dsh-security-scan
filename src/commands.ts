/**
 * The `/security` command.
 *
 * The tools are for the model; this is for the person at the keyboard. It exists
 * because the two most important plugin operations — checking a plugin before you
 * install it, and confirming nobody edited the audit log — should not require
 * asking the model to do them.
 *
 * @module dsh-security-scan/commands
 */

import type { CommandResultLike, Disposer, HarnessContext } from './dsh.js';
import type { ToolDeps } from './tools.js';
import { auditSource } from './scan/engine.js';
import { renderReport, renderSummary } from './scan/report.js';
import { renderLogText, renderStatusText } from './tools.js';

/** Usage text shown for a bare invocation or a bad subcommand. */
const USAGE = [
  'Usage: /security <subcommand>',
  '',
  '  audit <path|https .tgz>   statically audit a plugin and grade it A-D',
  '  status                    current guard mode, counters, and log chain state',
  '  log [n]                   the n most recent audit-log entries (default 10)',
  '  verify                    verify the HMAC chain of the audit log',
  '  rules                     list the guard rules that can be overridden',
].join('\n');

/** Format one counter line for `status`. */
function statusText(deps: ToolDeps): string {
  const status = deps.log.status();
  const verification = deps.log.verify();
  return renderStatusText({
    guardMode: deps.config.guard.mode,
    outputMode: deps.config.output.mode,
    installFloor: deps.config.install.blockAtOrBelow,
    requireAuditForInstall: deps.config.guard.requireAuditForInstall,
    fetchEnabled: deps.config.install.fetch,
    guardRuleOverrides: deps.config.guard.rules,
    outputRuleOverrides: deps.config.output.rules,
    allowedHosts: deps.config.guard.allowedHosts,
    counters: {
      callsInspected: deps.stats.callsInspected,
      callsBlocked: deps.stats.callsBlocked,
      callsAsked: deps.stats.callsAsked,
      callsWarned: deps.stats.callsWarned,
      resultsAudited: deps.stats.resultsAudited,
      resultsRedacted: deps.stats.resultsRedacted,
      resultsBlocked: deps.stats.resultsBlocked,
    },
    topRules: [...deps.stats.ruleHits.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 10)
      .map(([id, count]) => ({ id, count })),
    log: {
      dir: status.dir,
      entries: status.entries,
      bytes: status.bytes,
      keySource: status.keySource,
      rotatedSegments: status.rotatedSegments,
      corruptLines: status.corruptLines,
      chainOk: verification.ok,
      ...(verification.ok ? {} : { chainProblem: verification.reason ?? 'unknown' }),
      ...(deps.log.lastWriteError !== undefined ? { writeError: deps.log.lastWriteError } : {}),
    },
    auditsHeld: deps.registry.list().slice(0, 10).map((record) => ({
      key: record.key,
      name: record.name ?? null,
      grade: record.grade,
      score: record.score,
      scannedAt: record.scannedAt,
    })),
  });
}

/** Run one `/security` invocation. */
async function runSecurity(deps: ToolDeps, ruleIds: () => { guard: string[]; output: string[] }, rawInput: string): Promise<CommandResultLike> {
  const [subcommand = '', ...rest] = rawInput.trim().split(/\s+/);
  switch (subcommand) {
    case '':
      return { kind: 'error', text: USAGE };

    case 'audit': {
      const source = rest.join(' ').trim();
      if (source.length === 0) return { kind: 'error', text: `Audit needs a source.\n\n${USAGE}` };
      try {
        const result = await auditSource(source, {
          allowFetch: deps.config.install.fetch,
          blockAtOrBelow: deps.config.install.blockAtOrBelow,
        });
        deps.registry.record(result);
        deps.log.append({
          kind: 'install-audit',
          event: 'audit-completed',
          summary: `audited ${result.manifest?.name ?? source}: grade ${result.grade} (${result.score}/100)${result.blocked ? ' — refused' : ''}`,
          data: {
            source,
            grade: result.grade,
            score: result.score,
            refused: result.blocked,
            findings: result.findings.length,
            digest: result.digest,
          },
        });
        return { kind: result.blocked ? 'error' : 'success', text: renderReport(result, deps.config.report.locale) };
      } catch (error) {
        return { kind: 'error', text: `Audit failed: ${error instanceof Error ? error.message : String(error)}` };
      }
    }

    case 'status':
      return { kind: 'success', text: statusText(deps) };

    case 'log': {
      const requested = Number.parseInt(rest[0] ?? '10', 10);
      const limit = Number.isFinite(requested) ? Math.max(1, Math.min(200, requested)) : 10;
      const entries = deps.log.read({ limit });
      return {
        kind: 'success',
        text: renderLogText({
          entries: entries.map((entry) => ({
            seq: entry.seq,
            ts: entry.ts,
            kind: entry.kind,
            event: entry.event,
            summary: entry.summary,
            data: entry.data,
            hash: entry.hash.slice(0, 16),
          })),
          total: deps.log.status().entries,
        }),
      };
    }

    case 'verify': {
      const result = deps.log.verify();
      deps.log.append({
        kind: 'verify',
        event: result.ok ? 'chain-verified' : 'chain-broken',
        summary: result.ok
          ? `audit chain verified over ${result.entries} entries`
          : `audit chain verification FAILED at seq ${result.brokenAt ?? '?'}: ${result.reason ?? 'unknown'}`,
        data: { ok: result.ok, entries: result.entries, head: result.head },
      });
      if (result.ok) {
        return { kind: 'success', text: `Audit chain verified: ${result.entries} entries, head ${result.head.slice(0, 24)}…` };
      }
      return {
        kind: 'error',
        text: [
          'Audit chain verification FAILED',
          `  entries: ${result.entries}`,
          `  first untrustworthy sequence: ${result.brokenAt ?? 'unknown'}`,
          `  reason: ${result.reason ?? 'unknown'}`,
          '',
          'Treat every entry after the break as unverified. See SECURITY.md for what this can and cannot prove.',
        ].join('\n'),
      };
    }

    case 'rules': {
      const ids = ruleIds();
      return {
        kind: 'success',
        text: [
          `Guard rules (${ids.guard.length}) — override with guard.rules:`,
          ...ids.guard.map((id) => `  ${id}`),
          '',
          `Output rules (${ids.output.length}) — override with output.rules:`,
          ...ids.output.map((id) => `  ${id}`),
          '',
          'An override key ending in * matches by prefix, e.g. "net.*: off".',
        ].join('\n'),
      };
    }

    default:
      return { kind: 'error', text: `Unknown subcommand "${subcommand}".\n\n${USAGE}` };
  }
}

/** Register `/security`. */
export function applyCommand(
  ctx: HarnessContext,
  deps: ToolDeps,
  ruleIds: () => { guard: string[]; output: string[] },
): Disposer[] {
  if (ctx.commands === undefined) return [];
  return [
    ctx.commands.register({
      name: 'security',
      description: 'Audit a plugin before installing it, and inspect the security scanner',
      input: { hint: '<audit|status|log|verify|rules>' },
      handler: (invocation) => runSecurity(deps, ruleIds, invocation.rawInput),
    }),
  ];
}

/** Re-exported for tests. */
export { runSecurity, USAGE as SECURITY_USAGE, renderSummary };
