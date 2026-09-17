/**
 * The audit registry: what has been audited, and how it scored.
 *
 * The install guard needs to answer "has this package been audited, and did it
 * pass?" at the moment a tool call tries to install it. The registry is that
 * memory. It is in-process and deliberately short-lived, because an audit is
 * only evidence about the bytes that were audited:
 *
 * - Keyed by source *and* content digest, so re-auditing the same path after the
 *   author edits it produces a different record rather than silently reusing an
 *   old grade.
 * - Expiring, so a grade does not outlive the artifact it described. Auditing
 *   `foo@1.2.3` from the registry today says nothing about what `foo@latest`
 *   resolves to tomorrow.
 * - Honest about its own limit: for a registry install the scanner can only bind a
 *   grade to the *name* it audited, never to the bytes npm will serve. That
 *   limit is stated in `SECURITY.md` and repeated in the guard's refusal text
 *   rather than papered over with a false sense of verification.
 *
 * @module dsh-security-scan/scan/registry
 */

import { isAbsolute, resolve } from 'node:path';

import type { Finding, Grade, ScanResult, Severity } from '../types.js';
import { atOrBelow } from './score.js';

/** A stored audit. */
export interface AuditRecord {
  /** Normalized lookup key. */
  key: string;
  /** Package name from the manifest, when the source had one. */
  name?: string;
  /** Digest of the exact bytes audited. */
  digest: string;
  grade: Grade;
  score: number;
  /** Whether the grade met the refusal floor at audit time. */
  blocked: boolean;
  /** When the scan ran, as reported by the scanner (for display). */
  scannedAt: string;
  /**
   * The registry's own clock reading at insertion time.
   *
   * Kept separate from `scannedAt` because expiry must be measured against the
   * same clock that stamps records. Comparing a wall-clock ISO string against an
   * injectable `now()` makes the TTL untestable and, worse, silently wrong the
   * moment either clock is replaced.
   */
  recordedAt: number;
  /** Finding counts, for compact reports. */
  counts: Record<Severity, number>;
  /** The full result, retained so the report can be re-rendered. */
  result: ScanResult;
}

/** How a spec resolved against the registry. */
export type Verdict =
  | { kind: 'pass'; record: AuditRecord }
  | { kind: 'fail'; record: AuditRecord }
  | { kind: 'stale'; record: AuditRecord }
  | { kind: 'unknown' };

/** Registry options. */
export interface RegistryOptions {
  /** How long a record stays valid; defaults to 24 hours. */
  ttlMs?: number;
  /** Maximum records retained; defaults to 200. */
  capacity?: number;
  /** Clock override, for tests. */
  now?: () => number;
}

/** Default record lifetime. */
export const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

/** Default record capacity. */
export const DEFAULT_CAPACITY = 200;

/**
 * Reduce a package spec to its identity.
 *
 * `npm:foo@^2.0.0`, `foo@2.1.0` and `foo` all name the same artifact for the
 * purpose of "has this been audited?", so they share one key.
 *
 * @param spec - a package spec, path, or URL as written by a caller.
 * @returns the normalized key.
 */
export function normalizeSpec(spec: string): string {
  const trimmed = spec.trim().replace(/^npm:/, '').replace(/^['"]|['"]$/g, '');
  if (trimmed.length === 0) return '';
  if (/^(?:https?|git|git\+ssh|git\+https|file):/i.test(trimmed)) return trimmed.replace(/#.*$/, '');
  if (/^(?:\.{0,2}\/|\/|~\/)/.test(trimmed) || isAbsolute(trimmed)) {
    return resolve(trimmed.replace(/^~/, process.env['HOME'] ?? '~'));
  }
  // Strip a version or range: `@scope/name@1.2.3` and `name@^1` both reduce to
  // the bare name. The scope's own `@` is at index 0 and must be preserved.
  const at = trimmed.lastIndexOf('@');
  return (at > 0 ? trimmed.slice(0, at) : trimmed).toLowerCase();
}

/** Count findings by severity. */
function countBySeverity(findings: readonly Finding[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const finding of findings) counts[finding.severity] += 1;
  return counts;
}

/**
 * The in-process audit registry.
 */
export class AuditRegistry {
  private readonly records = new Map<string, AuditRecord>();
  private readonly ttlMs: number;
  private readonly capacity: number;
  private readonly now: () => number;

  /**
   * @param options - TTL, capacity, and clock.
   */
  constructor(options: RegistryOptions = {}) {
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.capacity = options.capacity ?? DEFAULT_CAPACITY;
    this.now = options.now ?? (() => Date.now());
  }

  /**
   * Store a scan result under its source key.
   *
   * @param result - a completed scan.
   * @returns the stored record.
   */
  record(result: ScanResult): AuditRecord {
    const key = normalizeSpec(result.source.stagedPath ?? result.source.value);
    const record: AuditRecord = {
      key,
      ...(result.manifest?.name !== undefined ? { name: result.manifest.name } : {}),
      digest: result.digest,
      grade: result.grade,
      score: result.score,
      blocked: result.blocked,
      scannedAt: result.scannedAt,
      recordedAt: this.now(),
      counts: countBySeverity(result.findings),
      result,
    };
    this.records.set(key, record);
    if (record.name !== undefined) this.records.set(normalizeSpec(record.name), record);
    this.evict();
    return record;
  }

  /**
   * Look a spec up.
   *
   * @param spec - a package spec or path.
   * @param floor - the worst grade still allowed to install.
   * @returns the verdict.
   */
  verdictFor(spec: string, floor: Grade = 'D'): Verdict {
    const record = this.records.get(normalizeSpec(spec));
    if (record === undefined) return { kind: 'unknown' };
    if (this.now() - record.recordedAt > this.ttlMs) return { kind: 'stale', record };
    return atOrBelow(record.grade, floor) ? { kind: 'fail', record } : { kind: 'pass', record };
  }

  /**
   * Find a record without applying the floor or TTL.
   *
   * @param spec - a package spec or path.
   * @returns the record, when one exists.
   */
  find(spec: string): AuditRecord | undefined {
    return this.records.get(normalizeSpec(spec));
  }

  /** Every distinct record, newest first. */
  list(): AuditRecord[] {
    const unique = new Map<string, AuditRecord>();
    for (const record of this.records.values()) unique.set(record.digest, record);
    return [...unique.values()].sort((left, right) => right.scannedAt.localeCompare(left.scannedAt));
  }

  /** Drop every record. */
  clear(): void {
    this.records.clear();
  }

  /** Drop the oldest records beyond capacity. */
  private evict(): void {
    const unique = this.list();
    if (unique.length <= this.capacity) return;
    for (const record of unique.slice(this.capacity)) {
      for (const [key, value] of this.records) {
        if (value.digest === record.digest) this.records.delete(key);
      }
    }
  }
}
