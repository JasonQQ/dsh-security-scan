/**
 * Turning findings into a trust grade.
 *
 * The model is deliberately simple and auditable, because a grade nobody can
 * reproduce is a grade nobody should act on:
 *
 * 1. Each finding deducts its severity's weight, with diminishing returns per
 *    rule — a rule that fires forty times on forty lines is one problem, not
 *    forty, and letting repetition drive the score would let a noisy benign
 *    pattern outrank a single credential-theft rule.
 * 2. Breadth escalates. Findings spread across several independent categories
 *    indicate a package that does a lot of unrelated dangerous things, which is
 *    the shape of a malicious plugin rather than a sloppy one.
 * 3. Any `critical` finding pins the grade to `D` regardless of score. There is
 *    no arithmetic that makes a credential read plus an outbound POST acceptable.
 *
 * @module dsh-security-scan/scan/score
 */

import type { Finding, Grade, Severity } from '../types.js';
import { SEVERITY_WEIGHT } from '../types.js';

/** Score band for each grade, inclusive lower bound. */
export const GRADE_BANDS: readonly { grade: Grade; min: number }[] = [
  { grade: 'A', min: 90 },
  { grade: 'B', min: 75 },
  { grade: 'C', min: 50 },
  { grade: 'D', min: 0 },
];

/** Rank of each grade, so floors can be compared. */
const GRADE_RANK: Readonly<Record<Grade, number>> = { A: 3, B: 2, C: 1, D: 0 };

/** One line of the score explanation. */
export interface ScoreReason {
  /** What caused the deduction. */
  label: string;
  /** Points removed. */
  points: number;
}

/** The scoring outcome. */
export interface ScoreResult {
  score: number;
  grade: Grade;
  /** Why the score is what it is, worst first. */
  reasons: ScoreReason[];
  /** Set when a critical finding forced the grade rather than the arithmetic. */
  forcedBy?: string;
}

/** Grade from a numeric score. */
export function gradeForScore(score: number): Grade {
  for (const band of GRADE_BANDS) {
    if (score >= band.min) return band.grade;
  }
  return 'D';
}

/**
 * Whether `grade` is at least as good as `floor`.
 *
 * @param grade - the grade under test.
 * @param floor - the minimum acceptable grade.
 * @returns true when the grade meets the floor.
 */
export function meetsFloor(grade: Grade, floor: Grade): boolean {
  return GRADE_RANK[grade] >= GRADE_RANK[floor];
}

/**
 * Whether `grade` is at or below `ceiling` — i.e. bad enough to block.
 *
 * @param grade - the grade under test.
 * @param ceiling - the worst still-acceptable grade.
 * @returns true when the grade is worse than or equal to the ceiling.
 */
export function atOrBelow(grade: Grade, ceiling: Grade): boolean {
  return GRADE_RANK[grade] <= GRADE_RANK[ceiling];
}

/** Deduction multiplier for a rule that fired `count` times. */
function repetitionFactor(count: number): number {
  if (count <= 1) return 1;
  return Math.min(2.5, 1 + 0.25 * (count - 1));
}

/**
 * Score a finding set.
 *
 * @param findings - every finding from both rule kinds.
 * @returns the score, grade, and the deductions that produced them.
 */
export function scoreFindings(findings: readonly Finding[]): ScoreResult {
  if (findings.length === 0) {
    return { score: 100, grade: 'A', reasons: [] };
  }

  const byRule = new Map<string, { severity: Severity; count: number; title: string }>();
  const categories = new Set<string>();
  let worstCritical: Finding | undefined;

  for (const finding of findings) {
    categories.add(finding.category);
    const existing = byRule.get(finding.id);
    if (existing === undefined) {
      byRule.set(finding.id, { severity: finding.severity, count: 1, title: finding.title });
    } else {
      existing.count += 1;
      // A rule that fires at two severities is scored at its worst.
      if (SEVERITY_WEIGHT[finding.severity] > SEVERITY_WEIGHT[existing.severity]) {
        existing.severity = finding.severity;
      }
    }
    if (finding.severity === 'critical' && worstCritical === undefined) worstCritical = finding;
  }

  const reasons: ScoreReason[] = [];
  let deduction = 0;
  for (const [id, entry] of byRule) {
    const weight = SEVERITY_WEIGHT[entry.severity];
    if (weight === 0) continue;
    const points = Math.round(weight * repetitionFactor(entry.count));
    deduction += points;
    reasons.push({ label: `${id} — ${entry.title}${entry.count > 1 ? ` (${entry.count}×)` : ''}`, points });
  }

  // Breadth: four or more distinct categories carrying high-or-worse findings is
  // the signature of a package doing many unrelated dangerous things at once.
  const severeCategories = new Set(
    findings.filter((finding) => finding.severity === 'high' || finding.severity === 'critical').map((finding) => finding.category),
  );
  if (severeCategories.size >= 3) {
    const breadth = (severeCategories.size - 2) * 6;
    deduction += breadth;
    reasons.push({
      label: `breadth — high-or-worse findings across ${severeCategories.size} independent categories (${[...severeCategories].sort().join(', ')})`,
      points: breadth,
    });
  }

  const score = Math.max(0, Math.min(100, 100 - deduction));
  reasons.sort((left, right) => right.points - left.points);

  if (worstCritical !== undefined) {
    return { score, grade: 'D', reasons, forcedBy: `${worstCritical.id} — ${worstCritical.title}` };
  }
  return { score, grade: gradeForScore(score), reasons };
}
