/**
 * The model-facing tools.
 *
 * Four tools, each answering a question the model can actually be asked:
 *
 * - `security_gate_audit` — "is this plugin safe to install?" (layer one, on demand)
 * - `security_gate_status` — "what is the gate doing right now?"
 * - `security_gate_log` — "what has the gate blocked or redacted?"
 * - `security_gate_verify` — "has the audit log been tampered with?"
 *
 * Unlike most of this plugin, these are defined without the harness's
 * `defineTool` helper, because importing that helper would mean importing
 * `@deepseek-ai/dsh-tools` at runtime, and a zero-dependency plugin does not do
 * that. The definitions below produce exactly the object shape that helper
 * produces — `{ name, description, parameters, output: { schema, render },
 * execute }` with JSON Schema parameters — and argument validation happens in
 * `execute`, which is what the registry would otherwise have done for us.
 *
 * @module dsh-security-gate/tools
 */

import type {
  ContentBlock,
  Disposer,
  GateContext,
  JsonSchema,
  ToolDefinitionLike,
  ToolExecutionLike,
} from './dsh.js';
import type { GateConfig } from './config.js';
import type { AuditKind, Grade, JsonValue, Severity } from './types.js';
import type { AuditLog } from './audit/log.js';
import type { AuditRegistry } from './scan/registry.js';
import type { GateStats } from './state.js';
import { auditSource } from './scan/engine.js';
import { renderJson, renderReport, renderSummary } from './scan/report.js';
import { normalizeSpec } from './scan/registry.js';

/** Everything the tools need from the plugin's shared state. */
export interface ToolDeps {
  config: GateConfig;
  registry: AuditRegistry;
  log: AuditLog;
  stats: GateStats;
}

/** Definition helper that keeps argument and result types while erasing them on the seam. */
function defineGateTool<A, V>(spec: {
  name: string;
  description: string;
  parameters: JsonSchema;
  outputSchema: JsonSchema;
  execute: (args: A, exec: ToolExecutionLike) => Promise<V> | V;
  render: (args: A, value: V) => ContentBlock[];
}): ToolDefinitionLike {
  return {
    name: spec.name,
    description: spec.description,
    parameters: spec.parameters,
    output: {
      schema: spec.outputSchema,
      render: (args: never, value: never) => spec.render(args as unknown as A, value as unknown as V),
    },
    execute: (args: never, exec: ToolExecutionLike) => spec.execute(args as unknown as A, exec),
  };
}

/** The JSON-Schema idiom shared by every tool result here. */
const FINDING_COUNT_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    critical: { type: 'integer' },
    high: { type: 'integer' },
    medium: { type: 'integer' },
    low: { type: 'integer' },
    info: { type: 'integer' },
  },
  required: ['critical', 'high', 'medium', 'low', 'info'],
};

/** Shape of the audit tool's structured result. */
interface AuditValue {
  source: string;
  grade: Grade;
  score: number;
  refused: boolean;
  digest: string;
  files: number;
  truncated: boolean;
  counts: Record<Severity, number>;
  installScripts: number;
  report: string;
}

/** Count findings by severity. */
function counts(findings: readonly { severity: Severity }[]): Record<Severity, number> {
  const out: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const finding of findings) out[finding.severity] += 1;
  return out;
}

/** Register every gate tool. */
export function applyTools(ctx: GateContext, deps: ToolDeps): Disposer[] {
  const disposers: Disposer[] = [];

  disposers.push(ctx.tools.register(defineGateTool<{ source: string; format?: 'summary' | 'report' | 'json' }, AuditValue>({
    name: 'security_gate_audit',
    description:
      'Statically audit a DSH plugin before installing it. Accepts a local directory, a local .tgz/.tar.gz, or (only when install.fetch is enabled) an https .tgz URL. Returns file paths, spawned commands and contacted domains the plugin reaches, plus findings graded A-D; grade D means the install is refused. Nothing is executed and nothing is written outside the audit log.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        source: {
          type: 'string',
          description: 'Directory path, .tgz path, or https .tgz URL of the plugin to audit.',
        },
        format: {
          type: 'string',
          enum: ['summary', 'report', 'json'],
          description: "How much detail to return. Default 'summary'.",
        },
      },
      required: ['source'],
    },
    outputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        source: { type: 'string' },
        grade: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
        score: { type: 'integer' },
        refused: { type: 'boolean' },
        digest: { type: 'string' },
        files: { type: 'integer' },
        truncated: { type: 'boolean' },
        counts: FINDING_COUNT_SCHEMA,
        installScripts: { type: 'integer' },
        report: { type: 'string' },
      },
      required: ['source', 'grade', 'score', 'refused', 'digest', 'files', 'truncated', 'counts', 'installScripts', 'report'],
    },
    async execute(args) {
      if (typeof args.source !== 'string' || args.source.trim().length === 0) {
        throw new Error('source must be a non-empty path or https URL');
      }
      const format = args.format ?? 'summary';
      const result = await auditSource(args.source, {
        allowFetch: deps.config.install.fetch,
        blockAtOrBelow: deps.config.install.blockAtOrBelow,
      });
      deps.registry.record(result);
      deps.log.append({
        kind: 'install-audit',
        event: 'audit-completed',
        summary: `audited ${result.manifest?.name ?? args.source}: grade ${result.grade} (${result.score}/100)${result.blocked ? ' — refused' : ''}`,
        data: {
          source: args.source,
          name: result.manifest?.name ?? null,
          grade: result.grade,
          score: result.score,
          refused: result.blocked,
          findings: result.findings.length,
          digest: result.digest,
          truncated: result.truncated,
        },
      });
      const body = format === 'json' ? renderJson(result) : format === 'report' ? renderReport(result) : renderSummary(result);
      return {
        source: result.source.value,
        grade: result.grade,
        score: result.score,
        refused: result.blocked,
        digest: result.digest,
        files: result.files.length,
        truncated: result.truncated,
        counts: counts(result.findings),
        installScripts: result.installScripts.length,
        report: body,
      };
    },
    render: (_args, value) => [{ type: 'text', text: value.report }],
  })));

  disposers.push(ctx.tools.register(defineGateTool<Record<string, never>, JsonValue>({
    name: 'security_gate_status',
    description:
      'Report the security gate\'s current posture: guard and output-audit modes, which rule overrides are active, how many tool calls have been blocked, read or redacted, the audit-log chain state, and the audits currently held.',
    parameters: { type: 'object', additionalProperties: false, properties: {} },
    outputSchema: { type: 'object' },
    execute() {
      const status = deps.log.status();
      const verification = deps.log.verify();
      const records = deps.registry.list();
      return {
        guardMode: deps.config.guard.mode,
        outputMode: deps.config.output.mode,
        installFloor: deps.config.install.blockAtOrBelow,
        requireAuditForInstall: deps.config.guard.requireAuditForInstall,
        fetchEnabled: deps.config.install.fetch,
        guardRuleOverrides: deps.config.guard.rules as JsonValue,
        outputRuleOverrides: deps.config.output.rules as JsonValue,
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
        auditsHeld: records.slice(0, 10).map((record) => ({
          key: record.key,
          name: record.name ?? null,
          grade: record.grade,
          score: record.score,
          scannedAt: record.scannedAt,
        })),
      } as JsonValue;
    },
    render: (_args, value) => [{ type: 'text', text: renderStatusText(value) }],
  })));

  disposers.push(ctx.tools.register(defineGateTool<{ limit?: number; kind?: AuditKind; event?: string }, JsonValue>({
    name: 'security_gate_log',
    description:
      'Read the tamper-evident audit log: every tool call the guard inspected and acted on, every secret the output audit redacted, and every pre-install audit run. Entries are returned oldest-last.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        limit: { type: 'integer', description: 'How many recent entries to return. Default 20, maximum 200.' },
        kind: {
          type: 'string',
          enum: ['guard', 'output', 'install-audit', 'verify', 'lifecycle'],
          description: 'Restrict to one record kind.',
        },
        event: { type: 'string', description: 'Restrict to one event name, e.g. tool-blocked.' },
      },
    },
    outputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        entries: { type: 'array', items: { type: 'object' } },
        total: { type: 'integer' },
      },
      required: ['entries', 'total'],
    },
    execute(args) {
      const limit = args.limit === undefined ? 20 : Math.max(1, Math.min(200, Math.trunc(args.limit)));
      const entries = deps.log.read({
        limit,
        ...(args.kind !== undefined ? { kind: args.kind } : {}),
        ...(args.event !== undefined ? { event: args.event } : {}),
      });
      return {
        entries: entries.map((entry) => ({
          seq: entry.seq,
          ts: entry.ts,
          kind: entry.kind,
          event: entry.event,
          summary: entry.summary,
          data: entry.data,
          hash: entry.hash.slice(0, 16),
        })) as JsonValue,
        total: deps.log.status().entries,
      };
    },
    render: (_args, value) => [{ type: 'text', text: renderLogText(value) }],
  })));

  disposers.push(ctx.tools.register(defineGateTool<Record<string, never>, JsonValue>({
    name: 'security_gate_verify',
    description:
      'Verify the HMAC hash chain of the audit log. Detects an edited entry, a deleted or reordered entry, a truncated log, and an edited anchor. Reports the first sequence number where the log stopped being trustworthy.',
    parameters: { type: 'object', additionalProperties: false, properties: {} },
    outputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        ok: { type: 'boolean' },
        entries: { type: 'integer' },
        head: { type: 'string' },
        brokenAt: { type: 'integer' },
        reason: { type: 'string' },
      },
      required: ['ok', 'entries', 'head'],
    },
    execute() {
      const result = deps.log.verify();
      deps.log.append({
        kind: 'verify',
        event: result.ok ? 'chain-verified' : 'chain-broken',
        summary: result.ok
          ? `audit chain verified over ${result.entries} entries`
          : `audit chain verification FAILED at seq ${result.brokenAt ?? '?'}: ${result.reason ?? 'unknown'}`,
        data: {
          ok: result.ok,
          entries: result.entries,
          head: result.head,
          ...(result.brokenAt !== undefined ? { brokenAt: result.brokenAt } : {}),
        },
      });
      return {
        ok: result.ok,
        entries: result.entries,
        head: result.head,
        ...(result.brokenAt !== undefined ? { brokenAt: result.brokenAt } : {}),
        ...(result.reason !== undefined ? { reason: result.reason } : {}),
      } as JsonValue;
    },
    render: (_args, value) => [{ type: 'text', text: renderVerifyText(value) }],
  })));

  return disposers;
}

/** Render the status value as text. */
export function renderStatusText(value: JsonValue): string {
  const record = value as Record<string, JsonValue>;
  const counters = record['counters'] as Record<string, number>;
  const log = record['log'] as Record<string, JsonValue>;
  const top = record['topRules'] as { id: string; count: number }[];
  const audits = record['auditsHeld'] as Record<string, JsonValue>[];
  const lines = [
    `Security gate status`,
    `  guard mode: ${String(record['guardMode'])} | output mode: ${String(record['outputMode'])} | install floor: ${String(record['installFloor'])}`,
    `  audit required before install: ${String(record['requireAuditForInstall'])} | outbound fetch for audits: ${String(record['fetchEnabled'])}`,
    `  calls inspected ${counters['callsInspected']}, blocked ${counters['callsBlocked']}, asked ${counters['callsAsked']}, warned ${counters['callsWarned']}`,
    `  results audited ${counters['resultsAudited']}, redacted ${counters['resultsRedacted']}, blocked ${counters['resultsBlocked']}`,
    `  log: ${String(log['entries'])} entries at ${String(log['dir'])} (key: ${String(log['keySource'])})`,
    `  chain: ${log['chainOk'] === true ? 'verified' : `BROKEN — ${String(log['chainProblem'] ?? 'unknown')}`}`,
    `  rule overrides: ${Object.keys(record['guardRuleOverrides'] as object).length} guard, ${Object.keys(record['outputRuleOverrides'] as object).length} output`,
  ];
  if (top.length > 0) {
    lines.push('  most frequent detections:');
    for (const item of top) lines.push(`    ${item.count}× ${item.id}`);
  }
  if (audits.length > 0) {
    lines.push('  audits held:');
    for (const audit of audits) {
      lines.push(`    ${String(audit['key'])} — grade ${String(audit['grade'])} (${String(audit['score'])}/100) at ${String(audit['scannedAt'])}`);
    }
  }
  return lines.join('\n');
}

/** Render the log value as text. */
export function renderLogText(value: JsonValue): string {
  const record = value as Record<string, JsonValue>;
  const entries = record['entries'] as Record<string, JsonValue>[];
  if (entries.length === 0) return 'The audit log holds no matching entries.';
  const lines = [`Audit log (${entries.length} of ${String(record['total'])} entries shown)`, ''];
  for (const entry of entries) {
    lines.push(`#${String(entry['seq'])} ${String(entry['ts'])} [${String(entry['kind'])}] ${String(entry['event'])}`);
    lines.push(`  ${String(entry['summary'])}`);
    lines.push(`  hash ${String(entry['hash'])}…`);
  }
  return lines.join('\n');
}

/** Render the verify value as text. */
export function renderVerifyText(value: JsonValue): string {
  const record = value as Record<string, JsonValue>;
  if (record['ok'] === true) {
    return `Audit chain verified: ${String(record['entries'])} entries, head ${String(record['head']).slice(0, 24)}…`;
  }
  return [
    `Audit chain verification FAILED`,
    `  entries: ${String(record['entries'])}`,
    `  first untrustworthy sequence: ${record['brokenAt'] === undefined ? 'unknown' : String(record['brokenAt'])}`,
    `  reason: ${String(record['reason'] ?? 'unknown')}`,
  ].join('\n');
}

/** Normalize a spec for the audit tool, re-exported for the command surface. */
export { normalizeSpec };
