/**
 * The rule contract for the runtime guard.
 *
 * The guard has two halves that look symmetric but answer different questions:
 *
 * - **Input rules** inspect a tool call *before* it runs and answer "should this
 *   happen?". Their vocabulary is the request: `rm -rf /`, a read of
 *   `~/.ssh/id_rsa`, a fetch of `169.254.169.254`.
 * - **Output rules** inspect a tool result *after* it ran and answer "should
 *   this come back?". Their vocabulary is the response: a live API key, an
 *   internal address, a private key block.
 *
 * Both receive pre-canonicalized views rather than raw text, so a rule author
 * never has to think about quoting, `$IFS`, or base64 — see
 * `util/normalize.ts`.
 *
 * @module dsh-security-scan/guard/rule-types
 */

import type { Category, GuardAction, JsonValue, Severity } from '../types.js';

/** Everything an input rule may inspect about one tool call. */
export interface ToolCallContext {
  /** Tool name, e.g. `bash`, `read`, `write`, `edit`, `web_search`. */
  tool: string;
  /** Canonical views of the call's text payload: raw, decoded, shell, base64. */
  views: string[];
  /** All views joined for whole-payload matching. */
  text: string;
  /** The raw tool arguments. */
  args: JsonValue;
  /** First path-like argument, when the tool has one. */
  path?: string;
  /** Shell command text, when the tool runs one. */
  command?: string;
  /** Every URL found in the payload, deduplicated. */
  urls: string[];
  /** Every string argument that looks like a filesystem path. */
  paths: string[];
}

/** One reason an input rule fires. */
export interface GuardHit {
  /** The canonical text that matched — quoted in the finding, so keep it short. */
  matched: string;
  /** Overrides the rule's `detail` when the specifics matter. */
  detail?: string;
  /** Escalates or de-escalates the rule's severity for this hit. */
  severity?: Severity;
  /** Overrides the rule's action for this hit. */
  action?: GuardAction;
}

/** A rule evaluated once per tool call, before execution. */
export interface GuardRule {
  /** Stable id, e.g. `destructive.rm-root`. */
  id: string;
  category: Category;
  severity: Severity;
  /** What the guard should do by default when this rule fires. */
  action: GuardAction;
  title: string;
  detail: string;
  remediation: string;
  /** Tool names this rule applies to; `['*']` means every tool. */
  tools: readonly string[];
  /** Inspect one call; return the reason(s) it must not proceed, or `undefined`. */
  test: (ctx: ToolCallContext) => GuardHit | GuardHit[] | undefined;
}

/** Everything an output rule may inspect about one tool result. */
export interface ToolResultContext {
  /** Tool name that produced the result. */
  tool: string;
  /** The result's text. */
  text: string;
  /** Whether the tool already reported failure. */
  isError: boolean;
}

/** One thing an output rule wants removed. */
export interface OutputHit {
  /** The exact substring to replace. */
  matched: string;
  /** Text substituted in its place. */
  replacement: string;
  /** Short label for the finding, e.g. `aws-access-key`. */
  label: string;
  /** Overrides the rule's `detail` when the specifics matter. */
  detail?: string;
  /** Overrides the rule's severity. */
  severity?: Severity;
  /** Overrides the rule's action. */
  action?: 'block' | 'warn';
}

/** A rule evaluated once per tool result, after execution. */
export interface OutputRule {
  /** Stable id, e.g. `leak.aws-access-key`. */
  id: string;
  category: Category;
  severity: Severity;
  /** `block` withholds the result; `warn` redacts in place and lets it through. */
  action: 'block' | 'warn';
  title: string;
  detail: string;
  remediation: string;
  /** Tool names this rule applies to; `['*']` means every tool. */
  tools: readonly string[];
  /** Inspect one result; return what to redact, or `undefined`. */
  test: (ctx: ToolResultContext) => OutputHit[] | undefined;
}

/**
 * Whether a rule applies to a tool.
 *
 * @param tools - the rule's `tools` list.
 * @param tool - the tool being inspected.
 * @returns true when the rule should run.
 */
export function appliesTo(tools: readonly string[], tool: string): boolean {
  if (tools.includes('*')) return true;
  return tools.includes(tool);
}
