/**
 * Deterministic JSON serialization.
 *
 * The audit log hashes its own bytes, so serialization must be byte-identical
 * across runs, processes and platforms for the same value: keys are sorted, no
 * insignificant whitespace is emitted, and non-finite numbers are rejected
 * rather than silently coerced.
 *
 * @module dsh-security-gate/util/json
 */

import type { JsonValue } from '../types.js';

/** One canonical JSON fragment. Not exported: callers use {@link canonicalJson}. */
function write(value: unknown, out: string[]): void {
  if (value === null) {
    out.push('null');
    return;
  }
  switch (typeof value) {
    case 'boolean':
      out.push(value ? 'true' : 'false');
      return;
    case 'number': {
      if (!Number.isFinite(value)) {
        throw new TypeError(`canonicalJson: non-finite number ${String(value)} is not representable`);
      }
      // `JSON.stringify` gives the shortest round-tripping form for a double,
      // which keeps `1` and `1.0` byte-identical.
      out.push(JSON.stringify(value));
      return;
    }
    case 'string':
      out.push(JSON.stringify(value));
      return;
    case 'undefined':
      // Object properties holding `undefined` are dropped by the caller; a bare
      // `undefined` reaching here would be a programming error.
      throw new TypeError('canonicalJson: undefined is not a JSON value');
    default:
      break;
  }
  if (Array.isArray(value)) {
    out.push('[');
    for (let index = 0; index < value.length; index += 1) {
      if (index > 0) out.push(',');
      const item: unknown = value[index];
      // `undefined` inside an array has no JSON representation; `JSON.stringify`
      // turns it into `null`, and matching that keeps arrays total.
      write(item === undefined ? null : item, out);
    }
    out.push(']');
    return;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).filter((key) => record[key] !== undefined).sort();
    out.push('{');
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index] as string;
      if (index > 0) out.push(',');
      out.push(JSON.stringify(key), ':');
      write(record[key], out);
    }
    out.push('}');
    return;
  }
  throw new TypeError(`canonicalJson: unsupported value of type ${typeof value}`);
}

/**
 * Serialize a JSON value with sorted keys and no insignificant whitespace.
 *
 * @param value - the value to serialize.
 * @returns the canonical JSON text.
 * @throws TypeError when the value contains something JSON cannot represent.
 */
export function canonicalJson(value: JsonValue | unknown): string {
  const out: string[] = [];
  write(value, out);
  return out.join('');
}
