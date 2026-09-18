/**
 * The model-facing tools.
 *
 * Four tools, each answering a question the model can actually be asked:
 *
 * - `security_scan_audit` — "is this plugin safe to install?" (layer one, on demand)
 * - `security_scan_status` — "what is the plugin doing right now?"
 * - `security_scan_log` — "what has the guard blocked or redacted?"
 * - `security_scan_verify` — "has the audit log been tampered with?"
 *
 * Unlike most of this plugin, these are defined without the harness's
 * `defineTool` helper, because importing that helper would mean importing
 * `@deepseek-ai/dsh-tools` at runtime, and a zero-dependency plugin does not do
 * that. The definitions below produce exactly the object shape that helper
 * produces — `{ name, description, parameters, output: { schema, render },
 * execute }` with JSON Schema parameters — and argument validation happens in
 * `execute`, which is what the registry would otherwise have done for us.
 *
 * @module dsh-security-scan/tools
 */

import type {
  ContentBlock,
  Disposer,
  HarnessContext,
  JsonSchema,
  ToolDefinitionLike,
  ToolExecutionLike,
} from './dsh.js';
import type { PluginConfig } from './config.js';
import type { AuditKind, Grade, JsonValue, Severity } from './types.js';
import type { AuditLog } from './audit/log.js';
import type { AuditRegistry } from './scan/registry.js';
import type { PluginStats } from './state.js';
import { type Locale, type RuleTextZh, actionName, t, translationCoverage } from './i18n.js';
import { auditSource } from './scan/engine.js';
import { LINE_RULES, PACKAGE_RULES } from './scan/rules.catalog.js';
import { SCAN_RULE_TEXT_ZH } from './scan/rules.zh.js';
import { GUARD_RULES } from './guard/rules.catalog.js';
import { GUARD_RULE_TEXT_ZH } from './guard/rules.zh.js';
import { renderJson, renderReport, renderSummary } from './scan/report.js';

/** Everything the tools need from the plugin's shared state. */
export interface ToolDeps {
  config: PluginConfig;
  registry: AuditRegistry;
  log: AuditLog;
  stats: PluginStats;
}

/** Definition helper that keeps argument and result types while erasing them on the seam. */
function definePluginTool<A, V>(spec: {
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

/** Register every plugin tool. */
export function applyTools(ctx: HarnessContext, deps: ToolDeps): Disposer[] {
  const disposers: Disposer[] = [];

  disposers.push(ctx.tools.register(definePluginTool<{ source: string; format?: 'summary' | 'report' | 'json' }, AuditValue>({
    name: 'security_scan_audit',
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
      const locale = deps.config.report.locale;
      const body = format === 'json' ? renderJson(result) : format === 'report' ? renderReport(result, locale) : renderSummary(result, locale);
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

  disposers.push(ctx.tools.register(definePluginTool<Record<string, never>, JsonValue>({
    name: 'security_scan_status',
    description:
      'Report dsh-security-scan\'s current posture: guard and output-audit modes, which rule overrides are active, how many tool calls have been blocked, read or redacted, the audit-log chain state, and the audits currently held.',
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
        locale: deps.config.report.locale,
        // Reported rather than hidden: a rule without Chinese text renders in
        // English only, and a bilingual report with untranslated findings is a
        // gap the reader should be able to see rather than infer.
        translations: {
          guard: coverageOf(GUARD_RULE_TEXT_ZH, GUARD_RULES.map((rule) => rule.id)),
          scan: coverageOf(SCAN_RULE_TEXT_ZH, [...LINE_RULES, ...PACKAGE_RULES].map((rule) => rule.id)),
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
    render: (_args, value) => [{ type: 'text', text: renderStatusText(value, deps.config.report.locale) }],
  })));

  disposers.push(ctx.tools.register(definePluginTool<{ limit?: number; kind?: AuditKind; event?: string }, JsonValue>({
    name: 'security_scan_log',
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
    render: (_args, value) => [{ type: 'text', text: renderLogText(value, deps.config.report.locale) }],
  })));

  disposers.push(ctx.tools.register(definePluginTool<Record<string, never>, JsonValue>({
    name: 'security_scan_verify',
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
    render: (_args, value) => [{ type: 'text', text: renderVerifyText(value, deps.config.report.locale) }],
  })));

  return disposers;
}

/**
 * Render the status value as text.
 *
 * @param value - the status payload.
 * @param locale - how much language to emit; defaults to bilingual.
 * @returns the status text.
 */
/**
 * Translation coverage as JSON, without the missing-id list.
 *
 * The list is useful in `npm run inventory` but not in a status line, and a
 * hundred ids would bury the number that matters.
 */
function coverageOf(table: Readonly<Record<string, RuleTextZh>>, ids: readonly string[]): JsonValue {
  const coverage = translationCoverage(table, ids);
  return { translated: coverage.translated, total: coverage.total, missing: coverage.missing.length };
}

export function renderStatusText(value: JsonValue, locale: Locale = 'bilingual'): string {
  const record = value as Record<string, JsonValue>;
  const counters = record['counters'] as Record<string, number>;
  const log = record['log'] as Record<string, JsonValue>;
  const top = record['topRules'] as { id: string; count: number }[];
  const audits = record['auditsHeld'] as Record<string, JsonValue>[];
  const yes = t(locale, 'yes', '是');
  const no = t(locale, 'no', '否');
  const lines = [
    t(locale, 'Security scan status', '安全扫描状态'),
    `  ${t(locale, 'guard mode', '护栏模式')}: ${actionName(locale, String(record['guardMode']))} | ${t(locale, 'output mode', '输出模式')}: ${actionName(locale, String(record['outputMode']))} | ${t(locale, 'install floor', '安装阈值')}: ${String(record['installFloor'])}`,
    `  ${t(locale, 'audit required before install', '安装前强制体检')}: ${record['requireAuditForInstall'] === true ? yes : no} | ${t(locale, 'outbound fetch for audits', '体检时允许联网下载')}: ${record['fetchEnabled'] === true ? yes : no} | ${t(locale, 'report locale', '报告语言')}: ${String(record['locale'] ?? 'bilingual')}`,
    `  ${t(locale, 'calls inspected', '已检查调用')} ${counters['callsInspected']}, ${t(locale, 'blocked', '拒绝')} ${counters['callsBlocked']}, ${t(locale, 'asked', '升级审批')} ${counters['callsAsked']}, ${t(locale, 'warned', '仅记录')} ${counters['callsWarned']}`,
    `  ${t(locale, 'results audited', '已审计结果')} ${counters['resultsAudited']}, ${t(locale, 'redacted', '已打码')} ${counters['resultsRedacted']}, ${t(locale, 'blocked', '扣留')} ${counters['resultsBlocked']}`,
    `  ${t(locale, 'log', '日志')}: ${String(log['entries'])} ${t(locale, 'entries at', '条，位于')} ${String(log['dir'])} (${t(locale, 'key', '密钥')}: ${String(log['keySource'])})`,
    `  ${t(locale, 'chain', '哈希链')}: ${log['chainOk'] === true ? t(locale, 'verified', '校验通过') : t(locale, `BROKEN — ${String(log['chainProblem'] ?? 'unknown')}`, `已断裂 —— ${String(log['chainProblem'] ?? '原因未知')}`)}`,
    `  ${t(locale, 'rule overrides', '规则覆盖')}: ${Object.keys(record['guardRuleOverrides'] as object).length} ${t(locale, 'guard', '护栏')}, ${Object.keys(record['outputRuleOverrides'] as object).length} ${t(locale, 'output', '输出')}`,
  ];
  const translations = record['translations'] as Record<string, JsonValue> | undefined;
  if (translations !== undefined) {
    const coverage = (label: { en: string; zh: string }, item: JsonValue | undefined): string | undefined => {
      if (item === undefined) return undefined;
      const part = item as Record<string, JsonValue>;
      return `${t(locale, label.en, label.zh)} ${String(part['translated'])}/${String(part['total'])}`;
    };
    const parts = [
      coverage({ en: 'guard', zh: '护栏' }, translations['guard']),
      coverage({ en: 'static', zh: '静态' }, translations['scan']),
    ].filter((part): part is string => part !== undefined);
    if (parts.length > 0) {
      lines.push(`  ${t(locale, 'Chinese rule text', '规则中文文案')}: ${parts.join(', ')}`);
    }
  }
  if (top.length > 0) {
    lines.push(`  ${t(locale, 'most frequent detections', '最常触发的检测')}:`);
    for (const item of top) lines.push(`    ${item.count}× ${item.id}`);
  }
  if (audits.length > 0) {
    lines.push(`  ${t(locale, 'audits held', '持有的体检记录')}:`);
    for (const audit of audits) {
      lines.push(`    ${String(audit['key'])} — ${t(locale, 'grade', '评级')} ${String(audit['grade'])} (${String(audit['score'])}/100) @ ${String(audit['scannedAt'])}`);
    }
  }
  return lines.join('\n');
}

/**
 * Render the log value as text.
 *
 * Entries themselves stay as recorded: a log line's summary is written once, at
 * the moment the decision was taken, and re-rendering it in another language
 * later would put words in the log's mouth.
 *
 * @param value - the log payload.
 * @param locale - how much language to emit; defaults to bilingual.
 * @returns the log text.
 */
export function renderLogText(value: JsonValue, locale: Locale = 'bilingual'): string {
  const record = value as Record<string, JsonValue>;
  const entries = record['entries'] as Record<string, JsonValue>[];
  if (entries.length === 0) return t(locale, 'The audit log holds no matching entries.', '审计日志中没有匹配的记录。');
  const shown = entries.length;
  const total = String(record['total']);
  const lines = [
    t(locale, `Audit log (${shown} of ${total} entries shown)`, `审计日志（显示 ${shown} / 共 ${total} 条）`),
    '',
  ];
  for (const entry of entries) {
    lines.push(`#${String(entry['seq'])} ${String(entry['ts'])} [${String(entry['kind'])}] ${String(entry['event'])}`);
    lines.push(`  ${String(entry['summary'])}`);
    lines.push(`  ${t(locale, 'hash', '哈希')} ${String(entry['hash'])}…`);
  }
  return lines.join('\n');
}

/**
 * Render the verify value as text.
 *
 * @param value - the verification payload.
 * @param locale - how much language to emit; defaults to bilingual.
 * @returns the verification text.
 */
export function renderVerifyText(value: JsonValue, locale: Locale = 'bilingual'): string {
  const record = value as Record<string, JsonValue>;
  if (record['ok'] === true) {
    const entries = String(record['entries']);
    const head = String(record['head']).slice(0, 24);
    return t(
      locale,
      `Audit chain verified: ${entries} entries, head ${head}…`,
      `审计哈希链校验通过：${entries} 条记录，链头 ${head}……`,
    );
  }
  const brokenAt = record['brokenAt'] === undefined ? t(locale, 'unknown', '未知') : String(record['brokenAt']);
  return [
    t(locale, 'Audit chain verification FAILED', '审计哈希链校验失败'),
    `  ${t(locale, 'entries', '记录数')}: ${String(record['entries'])}`,
    `  ${t(locale, 'first untrustworthy sequence', '第一个不可信序号')}: ${brokenAt}`,
    `  ${t(locale, 'reason', '原因')}: ${String(record['reason'] ?? t(locale, 'unknown', '未知'))}`,
  ].join('\n');
}
