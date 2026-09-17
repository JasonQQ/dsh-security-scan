/**
 * The output side of the runtime guard.
 *
 * Runs after a tool returns, over the result text, and decides whether that text
 * may enter the conversation. The asymmetry with the input side is deliberate:
 *
 * - On the **input** side the guard is deciding about an *action*, so refusing is
 *   cheap and reversible — the model can try a different approach.
 * - On the **output** side the guard is deciding about *information*. Blocking a
 *   result the user explicitly asked for is hostile, and the model will often
 *   just ask again. So the default is to **redact and continue**: the secret
 *   never reaches the transcript or the model, and the call still succeeds.
 *
 * `block` is reserved for a private key block, where partial redaction is
 * meaningless and any surviving byte is a live credential.
 *
 * @module dsh-security-scan/guard/output
 */

import type { Detection, DetectionReport, JsonValue } from '../types.js';
import { type PluginConfig, outputRuleAction } from '../config.js';
import { OUTPUT_RULES } from './rules.catalog.js';
import { type ToolResultContext, appliesTo } from './rule-types.js';

/** Cap on the text a single result audit will scan. */
export const OUTPUT_SCAN_CAP = 2_000_000;

/** Rule ids of the output catalog, for override resolution. */
const OUTPUT_RULE_IDS: readonly string[] = OUTPUT_RULES.map((rule) => rule.id);

/** What to do with one result. */
export interface OutputAudit {
  /** The detections that fired. */
  detections: Detection[];
  /** `block` when the result must be withheld outright. */
  action?: 'block' | 'warn';
  /** The result text with every `warn`-level hit replaced. */
  text: string;
  /** How many substitutions were made. */
  redactions: number;
}

/**
 * Replace every literal occurrence of `needle` in `haystack`.
 *
 * Uses string splitting rather than a regular expression so a matched secret
 * containing regex metacharacters is replaced literally — the bug this avoids
 * is a key like `sk-a+b*c` being partially replaced and surviving in the log.
 *
 * @param haystack - the text to edit.
 * @param needle - the exact substring to remove.
 * @param replacement - its replacement.
 * @returns the edited text and how many replacements were made.
 */
function replaceLiteral(haystack: string, needle: string, replacement: string): { text: string; count: number } {
  if (needle.length === 0) return { text: haystack, count: 0 };
  const parts = haystack.split(needle);
  return { text: parts.join(replacement), count: parts.length - 1 };
}

/**
 * Audit one tool result.
 *
 * @param tool - the tool that produced the result.
 * @param text - the result text.
 * @param isError - whether the tool reported failure.
 * @param config - the resolved plugin configuration.
 * @returns the audit outcome.
 */
export function auditToolResult(
  tool: string,
  text: string,
  isError: boolean,
  config: PluginConfig,
): OutputAudit {
  const mode = config.output.mode;
  if (mode === 'off' || text.length === 0) return { detections: [], text, redactions: 0 };

  const ctx: ToolResultContext = { tool, text: text.slice(0, OUTPUT_SCAN_CAP), isError };
  const detections: Detection[] = [];
  const replacements: { matched: string; replacement: string }[] = [];
  let block = false;

  for (const rule of OUTPUT_RULES) {
    if (!appliesTo(rule.tools, tool)) continue;
    const effective = outputRuleAction(config, rule.id, rule.action);
    if (effective === 'off') continue;
    let hits: ReturnType<typeof rule.test>;
    try {
      hits = rule.test(ctx);
    } catch {
      continue;
    }
    if (hits === undefined) continue;
    for (const hit of hits) {
      if (hit.matched.length === 0) continue;
      const severity = hit.severity ?? rule.severity;
      const action = hit.action ?? effective;
      detections.push({
        id: rule.id,
        category: rule.category,
        severity,
        action: action === 'block' ? 'block' : 'warn',
        title: rule.title,
        detail: hit.detail ?? rule.detail,
        matched: `${hit.matched.slice(0, 24)}…`,
        remediation: rule.remediation,
      });
      // A blocked result is withheld whole, so its redactions are moot.
      if (action === 'block' && severity === 'critical') {
        block = true;
        continue;
      }
      replacements.push({ matched: hit.matched, replacement: hit.replacement });
    }
    if (detections.length >= 40) break;
  }

  if (block) {
    return { detections, action: 'block', text, redactions: 0 };
  }
  if (mode === 'monitor') {
    return { detections, text, redactions: 0 };
  }

  // Apply longest-first so an overlapping shorter match cannot corrupt a longer
  // one — e.g. a JWT containing a shorter token-shaped run.
  let out = text;
  let count = 0;
  for (const item of [...replacements].sort((left, right) => right.matched.length - left.matched.length)) {
    const result = replaceLiteral(out, item.matched, item.replacement);
    out = result.text;
    count += result.count;
  }
  return {
    detections,
    ...(detections.length > 0 ? { action: 'warn' as const } : {}),
    text: out,
    redactions: count,
  };
}

/** Every output-rule id, so the status tool can report the disabled ones. */
export function outputRuleIds(): readonly string[] {
  return OUTPUT_RULE_IDS;
}

/** A JSON-safe projection of an output audit, for the audit log. */
export function summarizeOutput(audit: OutputAudit): JsonValue {
  return {
    detections: audit.detections.map((detection) => ({
      id: detection.id,
      severity: detection.severity,
      action: detection.action,
    })),
    redactions: audit.redactions,
    ...(audit.action !== undefined ? { action: audit.action } : {}),
  };
}

/** Build the report shape shared with the input side. */
export function toReport(audit: OutputAudit): DetectionReport {
  return audit.action === undefined ? { detections: audit.detections } : { detections: audit.detections, action: audit.action };
}
