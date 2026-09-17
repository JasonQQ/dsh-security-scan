/**
 * The HMAC hash chain behind the audit log.
 *
 * Every entry commits to the entry before it: `hash = HMAC(key, canonical(entry))`
 * where `entry.prev` is the previous entry's hash. Editing any field of any entry
 * therefore invalidates that entry and every entry after it, and deleting or
 * reordering an entry breaks the `prev` linkage. A separately MACed anchor
 * records the expected entry count and head hash, which extends detection to
 * *truncation* — the case a bare chain cannot see, because a prefix of a valid
 * chain is itself a valid chain.
 *
 * This is tamper *evidence*, not tamper *proof*. An attacker holding both the
 * log and the key can rebuild the whole chain. The design goal is that silent
 * modification is impossible: any edit leaves a verifiable mark, and the verifier
 * names the first broken sequence number.
 *
 * @module dsh-security-scan/audit/chain
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

import type { AuditEntry, ChainVerification } from '../types.js';
import { canonicalJson } from '../util/json.js';

/** Algorithm id recorded on each entry. */
export const CHAIN_ALG = 'hmac-sha256' as const;

/** An entry before its hash is computed. */
export type AuditEntryBody = Omit<AuditEntry, 'hash'>;

/** The MACed sidecar that makes truncation detectable. */
export interface ChainAnchor {
  /** Number of entries the log is expected to contain. */
  entries: number;
  /** Expected head hash (the last entry's `hash`), or `''` for an empty log. */
  head: string;
  /** Head hash of the segment before this one, `''` for the first segment ever written. */
  previousHead: string;
  /** MAC over `{ entries, head, previousHead }`, keyed with the audit key. */
  mac: string;
}

/** Constant-time comparison of two hex digests. */
function hexEquals(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  return timingSafeEqual(a, b);
}

/**
 * Compute an entry's chain hash.
 *
 * @param key - the HMAC key.
 * @param body - the entry without its `hash` field.
 * @returns the lowercase hex digest.
 */
export function computeEntryHash(key: Buffer, body: AuditEntryBody): string {
  return createHmac('sha256', key).update(canonicalJson(body), 'utf8').digest('hex');
}

/**
 * Seal an entry body with its chain hash.
 *
 * @param key - the HMAC key.
 * @param body - the entry without its `hash` field.
 * @returns the complete entry.
 */
export function sealEntry(key: Buffer, body: AuditEntryBody): AuditEntry {
  return { ...body, hash: computeEntryHash(key, body) };
}

/**
 * Compute the anchor MAC over its own claimed contents.
 *
 * @param key - the HMAC key.
 * @param entries - claimed entry count.
 * @param head - claimed head hash.
 * @param previousHead - claimed predecessor head.
 * @returns the lowercase hex MAC.
 */
export function computeAnchorMac(key: Buffer, entries: number, head: string, previousHead: string): string {
  return createHmac('sha256', key)
    .update(canonicalJson({ entries, head, previousHead }), 'utf8')
    .digest('hex');
}

/**
 * Build the anchor that matches a sealed entry list.
 *
 * @param key - the HMAC key.
 * @param head - the head hash of the list.
 * @param entries - the number of entries in the list.
 * @param previousHead - head hash of the preceding segment; `''` for a fresh chain.
 * @returns the MACed anchor.
 */
export function buildAnchor(
  key: Buffer,
  head: string,
  entries: number,
  previousHead = '',
): ChainAnchor {
  return { entries, head, previousHead, mac: computeAnchorMac(key, entries, head, previousHead) };
}

/**
 * Verify a chain, and optionally its anchor.
 *
 * Checks, in order: the anchor's own MAC; the anchor's claimed entry count;
 * each entry's `prev` linkage; each entry's recomputed hash; and finally the
 * head hash. The first failure is reported with the sequence number where the
 * log stopped being trustworthy.
 *
 * @param key - the HMAC key.
 * @param entries - the entries in file order.
 * @param anchor - the sidecar anchor, when one exists.
 * @param previousHead - the head hash the first entry must link back to; `''`
 *   only when the log genuinely starts at sequence 0.
 * @returns the verification outcome.
 */
export function verifyChain(
  key: Buffer,
  entries: readonly AuditEntry[],
  anchor?: ChainAnchor,
  previousHead = '',
): ChainVerification {
  if (anchor !== undefined) {
    const expectedMac = computeAnchorMac(key, anchor.entries, anchor.head, anchor.previousHead);
    if (!hexEquals(expectedMac, anchor.mac)) {
      return {
        ok: false,
        entries: entries.length,
        reason: 'anchor MAC does not match its own contents — the anchor file was edited without the key',
        head: entries.length > 0 ? (entries[entries.length - 1] as AuditEntry).hash : '',
      };
    }
    if (anchor.entries !== entries.length) {
      return {
        ok: false,
        entries: entries.length,
        brokenAt: Math.min(anchor.entries, entries.length),
        reason:
          anchor.entries > entries.length
            ? `log is truncated: the anchor records ${anchor.entries} entries but only ${entries.length} are present`
            : `log has ${entries.length} entries but the anchor records only ${anchor.entries} — entries were appended without updating the anchor`,
        head: entries.length > 0 ? (entries[entries.length - 1] as AuditEntry).hash : '',
      };
    }
  }

  let prev = previousHead;
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index] as AuditEntry;
    if (index === 0 && entries.length > 0 && previousHead === '' && entry.prev !== '') {
      return {
        ok: false,
        entries: entries.length,
        brokenAt: entry.seq,
        reason: `first entry (seq ${entry.seq}) links back to ${entry.prev || '(empty)'}, but the log is expected to start a fresh chain`,
        head: entry.hash,
      };
    }
    if (entry.prev !== prev) {
      return {
        ok: false,
        entries: entries.length,
        brokenAt: entry.seq,
        reason: `broken link at seq ${entry.seq}: entry claims predecessor ${entry.prev || '(empty)'} but the previous entry hashes to ${prev || '(empty)'} — an entry was deleted, reordered, or edited`,
        head: entry.hash,
      };
    }
    const { hash, ...body } = entry;
    const recomputed = computeEntryHash(key, body);
    if (!hexEquals(recomputed, hash)) {
      return {
        ok: false,
        entries: entries.length,
        brokenAt: entry.seq,
        reason: `content of seq ${entry.seq} does not match its recorded hash — the entry was edited`,
        head: hash,
      };
    }
    prev = hash;
  }

  if (anchor !== undefined && anchor.head !== prev) {
    return {
      ok: false,
      entries: entries.length,
      brokenAt: entries.length,
      reason: `head hash is ${prev || '(empty)'} but the anchor records ${anchor.head || '(empty)'}`,
      head: prev,
    };
  }

  return { ok: true, entries: entries.length, head: prev };
}
