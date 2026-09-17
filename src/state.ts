/**
 * Runtime counters for the plugin.
 *
 * Kept as plain counters rather than derived from the audit log on demand: the
 * log is the durable record, but reading and parsing it to answer "how many
 * calls did you block?" would make the status tool do file I/O proportional to
 * session length. These are the cheap numbers; the log is the evidence.
 *
 * @module dsh-security-scan/state
 */

import type { Detection } from './types.js';

/** Counters and per-rule tallies. */
export interface PluginStats {
  /** Tool calls the guard inspected. */
  callsInspected: number;
  /** Calls refused. */
  callsBlocked: number;
  /** Calls escalated to the approval seam. */
  callsAsked: number;
  /** Calls allowed but recorded. */
  callsWarned: number;
  /** Results the output audit inspected. */
  resultsAudited: number;
  /** Results where at least one secret was replaced. */
  resultsRedacted: number;
  /** Results withheld entirely. */
  resultsBlocked: number;
  /** How many times each rule id fired, across both layers. */
  ruleHits: Map<string, number>;
}

/** Fresh counters. */
export function createStats(): PluginStats {
  return {
    callsInspected: 0,
    callsBlocked: 0,
    callsAsked: 0,
    callsWarned: 0,
    resultsAudited: 0,
    resultsRedacted: 0,
    resultsBlocked: 0,
    ruleHits: new Map(),
  };
}

/**
 * Tally one detection.
 *
 * @param stats - the counters to update.
 * @param detections - detections that fired.
 */
export function tally(stats: PluginStats, detections: readonly Detection[]): void {
  for (const detection of detections) {
    stats.ruleHits.set(detection.id, (stats.ruleHits.get(detection.id) ?? 0) + 1);
  }
}
