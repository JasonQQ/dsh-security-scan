/**
 * `dsh-security-scan` — two-layer runtime security for the DeepSeek Harness.
 *
 * **Layer one, before install.** `security_scan_audit` statically analyses a
 * plugin and grades it A–D, listing the file paths it reads, the commands it
 * spawns and the domains it contacts; a grade at or below the configured floor
 * is refused, and an install command for a local source is audited inline at the
 * moment it runs.
 *
 * **Layer two, at runtime.** Every tool call is inspected before it executes —
 * destructive parameters, credential reads, SSRF destinations, sandbox escapes —
 * and every tool result is inspected after, redacting leaked secrets and
 * internal addresses before they reach the transcript.
 *
 * **Every decision is recorded** in an HMAC hash-chained log, so an edited,
 * deleted or truncated entry is detectable rather than merely regrettable.
 *
 * The plugin imports nothing at runtime. Its only module specifiers are `node:`
 * builtins. For a plugin whose purpose is to shrink supply-chain surface,
 * shipping a dependency tree would defeat the claim and make the plugin itself the
 * risk it exists to measure.
 *
 * @module dsh-security-scan
 */

import { AuditLog } from './audit/log.js';
import { type PluginConfig, normalizeConfig } from './config.js';
import { applyCommand } from './commands.js';
import type {
  ContentBlock,
  Disposer,
  HarnessContext,
  PostToolDecision,
  PreToolDecision,
  SystemPromptLike,
  ToolExecutionLike,
} from './dsh.js';
import type { Detection, JsonValue } from './types.js';
import { SEVERITY_ORDER } from './types.js';
import { AuditRegistry } from './scan/registry.js';
import { auditSource } from './scan/engine.js';
import { detectInstallAttempt, enforceInstallAttempt } from './install.js';
import { type GuardMode, inspectToolCall, summarizeCall } from './guard/inspect.js';
import { GUARD_RULES, OUTPUT_RULES } from './guard/rules.catalog.js';
import { auditToolResult, outputRuleIds, summarizeOutput } from './guard/output.js';
import { buildToolCallContext } from './guard/target.js';
import { type PluginStats, createStats, tally } from './state.js';
import { applyTools } from './tools.js';
import { asJsonValue } from './dsh.js';

/** Cordis plugin name, used in loader diagnostics. */
export const name = 'security-scan';

/**
 * Services the plugin requires.
 *
 * Only `tools`: both layers hook the tool pipeline, and nothing else is load-
 * bearing. The command registry and the system prompt are consumed
 * opportunistically through `inject`, so a composition that omits them still
 * gets a working guard rather than a plugin that refuses to load.
 */
export const inject = ['tools'];

/** How many rule detections a single refusal message will name. */
const REASON_RULE_CAP = 5;

/** Format the refusal text a blocked call returns to the model. */
function formatBlockReason(tool: string, detections: readonly Detection[]): string {
  const ranked = [...detections].sort(
    (left, right) => SEVERITY_ORDER.indexOf(left.severity) - SEVERITY_ORDER.indexOf(right.severity),
  );
  const lines = [`dsh-security-scan blocked this ${tool} call.`, ''];
  for (const detection of ranked.slice(0, REASON_RULE_CAP)) {
    lines.push(`[${detection.severity}] ${detection.id} — ${detection.title}`);
    lines.push(`  ${detection.detail}`);
    lines.push(`  matched: ${detection.matched}`);
    lines.push(`  fix: ${detection.remediation}`);
    lines.push('');
  }
  if (ranked.length > REASON_RULE_CAP) {
    lines.push(`(${ranked.length - REASON_RULE_CAP} further finding(s) are in the audit log.)`);
    lines.push('');
  }
  lines.push(
    'If this call is legitimate, narrow it to the specific target instead of the wildcard, or ask the user to allow the rule (guard.rules in the plugin config) or list the destination under guard.allowedHosts / guard.allowedPaths.',
  );
  return lines.join('\n');
}

/** Format the escalation text an `ask` decision carries into the approval prompt. */
function formatAskReason(tool: string, detections: readonly Detection[]): string {
  const worst = [...detections].sort(
    (left, right) => SEVERITY_ORDER.indexOf(left.severity) - SEVERITY_ORDER.indexOf(right.severity),
  )[0];
  if (worst === undefined) return `dsh-security-scan: ${tool} requires confirmation.`;
  return `dsh-security-scan: ${worst.id} — ${worst.title}. ${worst.matched}. ${worst.remediation}`;
}

/** Build the dependency bundle the tools and command share. */
export interface PluginDeps {
  config: PluginConfig;
  registry: AuditRegistry;
  log: AuditLog;
  stats: PluginStats;
}

/**
 * Register the plugin.
 *
 * @param ctx - the harness context; `tools` must be present.
 * @param rawConfig - the `config` row from the profile, validated here.
 */
export function apply(ctx: HarnessContext, rawConfig?: unknown): void {
  const config = normalizeConfig(rawConfig);
  const log = AuditLog.open({ dir: config.log.dir, maxBytes: config.log.maxBytes });
  const registry = new AuditRegistry({ ttlMs: config.log.ttlMs });
  const stats = createStats();
  const deps: PluginDeps = { config, registry, log, stats };

  log.append({
    kind: 'lifecycle',
    event: 'plugin-loaded',
    summary: `security scan loaded: guard ${config.guard.mode}, output ${config.output.mode}, install floor ${config.install.blockAtOrBelow}`,
    data: {
      guardMode: config.guard.mode,
      outputMode: config.output.mode,
      installFloor: config.install.blockAtOrBelow,
      requireAuditForInstall: config.guard.requireAuditForInstall,
      fetch: config.install.fetch,
      guardRules: GUARD_RULES.length,
      outputRules: OUTPUT_RULES.length,
      logDir: config.log.dir,
    },
  });

  const ruleIds = (): { guard: string[]; output: string[] } => ({
    guard: GUARD_RULES.map((rule) => rule.id).sort(),
    output: outputRuleIds().slice().sort(),
  });

  applyTools(ctx, deps);

  // The command registry and system prompt are optional surfaces: consume them
  // when the composition provides them, and keep guarding when it does not.
  const optional = (names: string[], callback: (sctx: HarnessContext) => void): void => {
    if (typeof ctx.inject === 'function') ctx.inject(names, callback);
    else callback(ctx);
  };
  optional(['commands'], (sctx) => {
    applyCommand(sctx, deps, ruleIds);
  });
  optional(['systemPrompt'], (sctx) => {
    const prompt = sctx.systemPrompt ?? (sctx.get('systemPrompt') as SystemPromptLike | undefined);
    prompt?.section({
      name: 'security-scan',
      order: 108,
      text: [
        'A security plugin (dsh-security-scan) inspects every tool call before it runs and every tool result before it returns.',
        'A refused call comes back as an error naming the rule, the matched text and a fix; narrow the call to the specific target rather than retrying it unchanged.',
        'A result containing a credential or an internal address may come back with those values replaced by `«redacted»` markers; treat the markers as "this value exists but is not being shown to you" and do not try to recover it.',
        'Before installing a plugin, run `security_scan_audit` on its source: a grade at or below the configured floor is refused, and local sources are audited automatically at install time.',
      ].join(' '),
    });
  });

  // ---- Layer two: input guard -------------------------------------------------
  ctx.on(
    'tools/pre-execute',
    async (exec: ToolExecutionLike, next: () => Promise<PreToolDecision>): Promise<PreToolDecision> => {
      if (config.guard.mode === 'off') return next();
      stats.callsInspected += 1;

      const args = asJsonValue(exec.arguments);
      const call = buildToolCallContext(exec.name, args);

      // The install check runs first for install commands: it consults the audit
      // registry, which a stateless rule cannot, so it owns the verdict and
      // `harness.plugin-install` is suppressed for this call to avoid emitting a
      // second, unbacked opinion about the same command.
      let suppress: Set<string> | undefined;
      if (call.command !== undefined) {
        const attempt = detectInstallAttempt(call.command);
        if (attempt !== undefined) {
          const { decision, audited } = await enforceInstallAttempt(attempt, registry, config);
          const specs = attempt.specs.length > 0 ? attempt.specs.join(', ') : 'declared dependencies';
          if (decision.action === 'allow') {
            log.append({
              kind: 'guard',
              event: 'install-allowed',
              summary: `${attempt.manager} install of ${specs} — allowed by the install policy`,
              data: {
                tool: exec.name,
                manager: attempt.manager,
                specs: attempt.specs,
                ...(audited !== undefined ? { grade: audited.grade, score: audited.score, digest: audited.digest } : {}),
              },
            });
          } else {
            const action = config.guard.mode === 'monitor' ? 'allow' : decision.action;
            log.append({
              kind: 'guard',
              event: action === 'block' ? 'install-blocked' : 'install-needs-approval',
              summary: `${attempt.manager} install of ${specs} — ${action}`,
              data: {
                tool: exec.name,
                manager: attempt.manager,
                specs: attempt.specs,
                decision: action,
                ...(audited !== undefined ? { grade: audited.grade, score: audited.score, digest: audited.digest } : {}),
              },
            });
            if (action === 'block') {
              stats.callsBlocked += 1;
              return { kind: 'deny', reason: decision.reason ?? 'install refused by dsh-security-scan' };
            }
            if (action === 'ask') {
              stats.callsAsked += 1;
              return { kind: 'ask', reason: decision.reason ?? 'install requires confirmation' };
            }
          }
          suppress = new Set(['harness.plugin-install']);
        }
      }

      const report = inspectToolCall(
        call,
        {
          mode: config.guard.mode as GuardMode,
          rules: config.guard.rules,
          allowedHosts: config.guard.allowedHosts,
          allowedPaths: config.guard.allowedPaths,
        },
        suppress === undefined ? {} : { suppress },
      );
      if (report.detections.length === 0) return next();

      tally(stats, report.detections);
      const action = report.action;
      log.append({
        kind: 'guard',
        event: action === 'block' ? 'tool-blocked' : action === 'ask' ? 'tool-needs-approval' : 'tool-flagged',
        summary: `${exec.name}: ${report.detections.map((detection) => detection.id).join(', ')}`,
        data: {
          call: summarizeCall(call),
          detections: report.detections.map((detection) => ({
            id: detection.id,
            severity: detection.severity,
            action: detection.action,
            matched: detection.matched,
          })),
        },
      });

      if (action === 'block') {
        stats.callsBlocked += 1;
        return { kind: 'deny', reason: formatBlockReason(exec.name, report.detections) };
      }
      if (action === 'ask') {
        stats.callsAsked += 1;
        return { kind: 'ask', reason: formatAskReason(exec.name, report.detections) };
      }
      stats.callsWarned += 1;
      return next();
    },
    { prepend: true },
  );

  // ---- Layer two: output audit ------------------------------------------------
  ctx.on(
    'tools/post-execute',
    async (
      exec: ToolExecutionLike,
      result: { content: ContentBlock[]; isError: boolean },
      next: () => Promise<PostToolDecision>,
    ): Promise<PostToolDecision> => {
      if (config.output.mode === 'off') return next();
      const hasText = result.content.some((block) => block.type === 'text' && typeof block.text === 'string');
      if (!hasText) return next();
      stats.resultsAudited += 1;

      // Each text block is audited on its own. Auditing the joined body and then
      // slicing the redacted text back apart would misalign the moment a
      // replacement changes a block's length — which is the normal case, since
      // that is what redaction does.
      const detections: Detection[] = [];
      let blockResult = false;
      let redactions = 0;
      const content = result.content.map((block) => {
        if (block.type !== 'text' || typeof block.text !== 'string') return block;
        const audit = auditToolResult(exec.name, block.text, result.isError, config);
        detections.push(...audit.detections);
        redactions += audit.redactions;
        if (audit.action === 'block') blockResult = true;
        return { ...block, text: audit.text };
      });
      if (detections.length === 0) return next();

      tally(stats, detections);
      // The recorded event must describe what actually happened. In monitor mode
      // nothing is withheld and nothing is edited, and a log that said otherwise
      // would be the one artifact a reader trusts most and that lies first.
      const enforcing = config.output.mode === 'enforce';
      const withheld = blockResult && enforcing;
      const redacted = enforcing && !withheld && redactions > 0;
      log.append({
        kind: 'output',
        event: withheld ? 'result-withheld' : redacted ? 'result-redacted' : 'result-flagged',
        summary: `${exec.name}: ${detections.map((detection) => detection.id).join(', ')}`,
        data: {
          tool: exec.name,
          redactions: redacted ? redactions : 0,
          withheld,
          mode: config.output.mode,
          ...summarizeOutput({ detections, text: '', redactions, action: withheld ? 'block' : 'warn' }) as JsonValue & object,
        } as JsonValue,
      });

      if (withheld) {
        stats.resultsBlocked += 1;
        return {
          kind: 'block',
          feedback: [
            {
              type: 'text',
              text: [
                `dsh-security-scan withheld this ${exec.name} result.`,
                '',
                ...detections.map((detection) => `[${detection.severity}] ${detection.id} — ${detection.title}: ${detection.detail}`),
                '',
                'The result contained key material that cannot be partially redacted. Read the specific value you need from the file directly, or narrow the command so the key is not in its output.',
              ].join('\n'),
            },
          ],
        };
      }

      if (!redacted) return next();
      stats.resultsRedacted += 1;
      return { kind: 'accept', content };
    },
  );

  // ---- Optional: audit configured sources at load ------------------------------
  for (const target of config.install.autoAudit) {
    void auditSource(target, { allowFetch: config.install.fetch, blockAtOrBelow: config.install.blockAtOrBelow })
      .then((result) => {
        registry.record(result);
        log.append({
          kind: 'install-audit',
          event: 'auto-audit-completed',
          summary: `auto-audited ${target}: grade ${result.grade} (${result.score}/100)`,
          data: { target, grade: result.grade, score: result.score, refused: result.blocked, digest: result.digest },
        });
      })
      .catch((error: unknown) => {
        ctx.logger?.warn(`security-scan: auto-audit of ${target} failed: ${error instanceof Error ? error.message : String(error)}`);
      });
  }
}

/** Re-exported so a caller can build a configured plugin without the loader. */
export type { PluginConfig } from './config.js';
export { DEFAULT_CONFIG, normalizeConfig, ConfigError } from './config.js';
export { AuditLog } from './audit/log.js';
export { AuditRegistry } from './scan/registry.js';
export { auditSource } from './scan/engine.js';
export { inspectToolCall } from './guard/inspect.js';
export { auditToolResult } from './guard/output.js';
export { detectInstallAttempt } from './install.js';

/** Disposer type re-exported for callers that manage the lifecycle themselves. */
export type { Disposer };
