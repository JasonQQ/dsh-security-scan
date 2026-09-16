/**
 * The input side of the runtime guard.
 *
 * Runs before a tool call executes, over the canonical context built by
 * `target.ts`, and decides whether the call may proceed. The decision folds
 * three inputs into one action:
 *
 * 1. what the rules found,
 * 2. the operator's per-rule overrides,
 * 3. the deployment mode — `enforce` acts, `monitor` only records.
 *
 * `monitor` exists because a guard that blocks on day one gets turned off on
 * day one. A deployment can run it in `monitor`, read the audit log, and learn
 * which rules its own workflow trips before any call is refused.
 *
 * @module dsh-security-gate/guard/inspect
 */

import type { Detection, DetectionReport, GuardAction, JsonValue } from '../types.js';
import { lookupOverride } from '../config.js';
import { GUARD_RULES } from './rules.catalog.js';
import { type ToolCallContext, appliesTo } from './rule-types.js';
import { parseContextUrls } from './target.js';

/** How the guard behaves in this deployment. */
export type GuardMode = 'enforce' | 'monitor' | 'off';

/** The operator's guard configuration. */
export interface GuardPolicy {
  mode: GuardMode;
  /** Per-rule action overrides; `off` disables a rule entirely. */
  rules: Record<string, GuardAction | 'off'>;
  /** Hostnames (or suffixes) exempt from destination rules. */
  allowedHosts: string[];
  /** Path prefixes exempt from path rules. */
  allowedPaths: string[];
}

/** Action ranking, strongest last. */
const ACTION_RANK: Readonly<Record<GuardAction, number>> = { warn: 0, ask: 1, block: 2 };

/** The strongest action in a list, or `undefined` when empty. */
export function strongestAction(actions: readonly GuardAction[]): GuardAction | undefined {
  let best: GuardAction | undefined;
  for (const action of actions) {
    if (best === undefined || ACTION_RANK[action] > ACTION_RANK[best]) best = action;
  }
  return best;
}

/** Whether a host matches an allowlist entry (exact or suffix). */
function hostMatches(host: string, list: readonly string[]): boolean {
  const lowered = host.toLowerCase();
  return list.some((entry) => {
    const candidate = entry.toLowerCase().replace(/^\*\./, '').replace(/\/.*$/, '');
    return lowered === candidate || lowered.endsWith(`.${candidate}`);
  });
}

/** Whether every destination in the call is allowlisted (and there is one). */
function allHostsAllowed(ctx: ToolCallContext, policy: GuardPolicy): boolean {
  if (policy.allowedHosts.length === 0) return false;
  const { hosts } = parseContextUrls(ctx);
  if (hosts.length === 0) return false;
  return hosts.every((host) => hostMatches(host, policy.allowedHosts));
}

/** Whether every path argument in the call is allowlisted (and there is one). */
function allPathsAllowed(ctx: ToolCallContext, policy: GuardPolicy): boolean {
  if (policy.allowedPaths.length === 0) return false;
  if (ctx.paths.length === 0) return false;
  return ctx.paths.every((path) => policy.allowedPaths.some((prefix) => path.startsWith(prefix)));
}

/** Resolve the action for one rule under the policy. */
function resolveAction(ruleId: string, fallback: GuardAction, policy: GuardPolicy): GuardAction | 'off' {
  const override = lookupOverride(policy.rules, ruleId);
  if (override === 'off') return 'off';
  const action = override ?? fallback;
  // In monitor mode nothing is ever refused or escalated to a prompt; the
  // finding is still recorded, which is the whole point of the mode.
  return policy.mode === 'monitor' ? 'warn' : action;
}

/**
 * Options that narrow a single inspection.
 */
export interface InspectOptions {
  /**
   * Rule ids that must not run for this call.
   *
   * Used when another part of the plugin has already made the decision: the
   * install gate consults the audit registry, which a stateless rule cannot, so
   * for an install command the gate owns the verdict and
   * `harness.plugin-install` would only duplicate it.
   */
  suppress?: ReadonlySet<string>;
}

/**
 * Inspect one tool call.
 *
 * @param ctx - the canonical call context.
 * @param policy - the operator's policy.
 * @param options - per-call narrowing.
 * @returns the detections and the strongest resulting action.
 */
export function inspectToolCall(
  ctx: ToolCallContext,
  policy: GuardPolicy,
  options: InspectOptions = {},
): DetectionReport {
  if (policy.mode === 'off') return { detections: [] };

  const detections: Detection[] = [];
  const hostExempt = allHostsAllowed(ctx, policy);
  const pathExempt = allPathsAllowed(ctx, policy);

  for (const rule of GUARD_RULES) {
    if (options.suppress?.has(rule.id) === true) continue;
    if (!appliesTo(rule.tools, ctx.tool)) continue;
    const action = resolveAction(rule.id, rule.action, policy);
    if (action === 'off') continue;
    // An allowlisted destination is the operator's explicit decision; suppressing
    // the whole rule (rather than blanking the message) keeps the log honest.
    if (rule.category === 'ssrf' && hostExempt) continue;
    if (rule.category === 'credential-access' && pathExempt) continue;

    let hits: ReturnType<typeof rule.test>;
    try {
      hits = rule.test(ctx);
    } catch {
      // A rule that throws on exotic input must not disable the whole guard.
      continue;
    }
    if (hits === undefined) continue;
    const list = Array.isArray(hits) ? hits : [hits];
    for (const hit of list) {
      if (hit.matched.length === 0) continue;
      detections.push({
        id: rule.id,
        category: rule.category,
        severity: hit.severity ?? rule.severity,
        action: hit.action !== undefined && policy.mode !== 'monitor' ? hit.action : action,
        title: rule.title,
        detail: hit.detail ?? rule.detail,
        matched: hit.matched,
        remediation: rule.remediation,
      });
    }
    if (detections.length >= 24) break;
  }

  const action = strongestAction(detections.map((detection) => detection.action));
  return action === undefined ? { detections } : { detections, action };
}

/**
 * Look one guard rule up by id.
 *
 * @param id - the rule id.
 * @returns the rule's id, title and detail, when it exists.
 */
export function describeGuardRule(id: string): { id: string; title: string; detail: string } | undefined {
  const rule = GUARD_RULES.find((candidate) => candidate.id === id);
  return rule === undefined ? undefined : { id: rule.id, title: rule.title, detail: rule.detail };
}

/** A JSON-safe projection of a call, for the audit log. */
export function summarizeCall(ctx: ToolCallContext): JsonValue {
  return {
    tool: ctx.tool,
    ...(ctx.command !== undefined ? { command: ctx.command.slice(0, 300) } : {}),
    ...(ctx.path !== undefined ? { path: ctx.path.slice(0, 300) } : {}),
    ...(ctx.urls.length > 0 ? { urls: ctx.urls.slice(0, 10) } : {}),
  };
}
