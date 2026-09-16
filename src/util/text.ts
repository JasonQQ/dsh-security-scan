/**
 * Text helpers: truncation, Shannon entropy, and the single redactor that every
 * other module routes secret-bearing text through.
 *
 * The redactor is deliberately shared rather than reimplemented per module: a
 * security plugin that leaks the secret it just found into its own audit log
 * has made the problem worse, so there is exactly one place that decides what
 * "redacted" looks like and exactly one place to audit it.
 *
 * @module dsh-security-gate/util/text
 */

import { SECRET_PATTERNS } from './patterns.js';

/** Maximum length of a stored snippet or `matched` excerpt. */
export const SNIPPET_LIMIT = 240;

/** Marker written in place of a redacted secret. */
export const REDACTION_MARK = '«redacted»';

/**
 * Collapse a multi-line excerpt to one line and cut it to `limit` characters.
 *
 * @param text - the raw excerpt.
 * @param limit - maximum characters to keep; defaults to {@link SNIPPET_LIMIT}.
 * @returns the flattened, truncated excerpt with an ellipsis marker when cut.
 */
export function clip(text: string, limit: number = SNIPPET_LIMIT): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= limit) return flat;
  return `${flat.slice(0, limit)}…`;
}

/**
 * Replace every secret-shaped substring with a redaction marker.
 *
 * Applied to snippets, matched text, tool results, log summaries and log
 * payloads. It is intentionally conservative: it redacts by shape, so a
 * false positive costs a little readability while a false negative would
 * persist a live credential to disk.
 *
 * @param text - the text to sanitize.
 * @returns the sanitized text.
 */
export function redact(text: string): string {
  let out = text;
  for (const pattern of SECRET_PATTERNS) {
    // Each pattern carries the `g` flag; `replace` resets `lastIndex` itself,
    // but a shared regex is still stateful, so clone before mutating.
    out = out.replace(new RegExp(pattern.re.source, pattern.re.flags), pattern.replacement);
  }
  return out;
}

/**
 * Redact, then collapse and truncate — the only way this codebase stores an
 * excerpt.
 *
 * @param text - the raw excerpt.
 * @param limit - maximum characters to keep after redaction.
 * @returns a safe, single-line excerpt.
 */
export function safeClip(text: string, limit: number = SNIPPET_LIMIT): string {
  return clip(redact(text), limit);
}

/**
 * Shannon entropy in bits per character.
 *
 * Used to flag high-entropy blobs near secret-suggesting names. Entropy alone
 * never fails a scan: base64, hashes and minified code are all high-entropy and
 * all benign, so the rules that use this always require a second signal.
 *
 * @param text - the string to measure.
 * @returns bits per character, `0` for strings shorter than 2 characters.
 */
export function shannonEntropy(text: string): number {
  if (text.length < 2) return 0;
  const counts = new Map<string, number>();
  for (const char of text) counts.set(char, (counts.get(char) ?? 0) + 1);
  let bits = 0;
  for (const count of counts.values()) {
    const p = count / text.length;
    bits -= p * Math.log2(p);
  }
  return bits;
}

/**
 * UTF-8 byte length, used for byte budgets without allocating a Buffer.
 *
 * @param text - the string to measure.
 * @returns the number of UTF-8 bytes.
 */
export function byteLength(text: string): number {
  let bytes = 0;
  for (const char of text) {
    const code = char.codePointAt(0) as number;
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code < 0x10000) bytes += 3;
    else bytes += 4;
  }
  return bytes;
}

/**
 * Parse a JSON document, returning `undefined` instead of throwing.
 *
 * @param text - the JSON text.
 * @returns the parsed value, or `undefined` when the text is not valid JSON.
 */
export function parseJsonLoose(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * Whether a value is a plain, non-array object.
 *
 * @param value - the value to test.
 * @returns true when the value is a record.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
