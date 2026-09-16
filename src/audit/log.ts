/**
 * The on-disk, tamper-evident audit log.
 *
 * Layout inside the data directory:
 *
 * - `audit.log.jsonl`   — the active segment, one sealed JSON entry per line.
 * - `audit.head.json`   — MACed anchor: expected entry count, head hash, and the
 *                         predecessor head this segment chains onto.
 * - `audit.history.json`— anchors of rotated-away segments, in order.
 * - `audit.key`         — 32 raw bytes of HMAC key as hex, mode 0600.
 *
 * Appends are synchronous on purpose. A guard decision must be durable before
 * the tool call it describes proceeds: if the write were deferred, a blocked
 * call could escape the log entirely, which is precisely the case an audit log
 * exists to cover. The cost is one small `write` per intercepted call, and only
 * for calls that produce a record.
 *
 * @module dsh-security-gate/audit/log
 */

import { randomBytes } from 'node:crypto';
import {
  appendFileSync,
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

import type { AuditEntry, AuditKind, ChainVerification, JsonValue } from '../types.js';
import { canonicalJson } from '../util/json.js';
import { clip, parseJsonLoose, redact } from '../util/text.js';
import { type ChainAnchor, buildAnchor, sealEntry, verifyChain } from './chain.js';

/** Default data directory, relative to the user's DSH home. */
export const DEFAULT_LOG_SUBDIR = 'security-gate';

/** Environment variable that supplies the audit key as hex. */
export const KEY_ENV = 'DSH_SECURITY_GATE_KEY';

/** Default rotation threshold for the active segment, in bytes. */
export const DEFAULT_MAX_BYTES = 4 * 1024 * 1024;

/** Something the log needs to describe one record. */
export interface AppendInput {
  kind: AuditKind;
  event: string;
  summary: string;
  data?: JsonValue;
}

/** A read request over the log. */
export interface ReadOptions {
  /** Most recent N entries; defaults to 20. */
  limit?: number;
  /** Restrict to one kind. */
  kind?: AuditKind;
  /** Restrict to one event name. */
  event?: string;
}

/** Where a key came from, for the status report. */
export type KeySource = 'env' | 'file' | 'generated';

/** A snapshot of the log's health. */
export interface LogStatus {
  dir: string;
  entries: number;
  head: string;
  bytes: number;
  keySource: KeySource;
  rotatedSegments: number;
  corruptLines: number;
}

/** Raw read result, keeping the count of unparseable lines visible. */
interface RawRead {
  entries: AuditEntry[];
  corruptLines: number[];
}

/** Structural check that a parsed line is an entry. */
function isAuditEntry(value: unknown): value is AuditEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry['seq'] === 'number' &&
    typeof entry['ts'] === 'string' &&
    typeof entry['event'] === 'string' &&
    typeof entry['prev'] === 'string' &&
    typeof entry['hash'] === 'string'
  );
}

/**
 * The audit log.
 *
 * Construct with {@link AuditLog.open}; the constructor is intentionally not
 * exported so key material is always resolved through one code path.
 */
export class AuditLog {
  readonly dir: string;
  readonly keyPath: string;
  private readonly key: Buffer;
  private readonly keySource: KeySource;
  private readonly maxBytes: number;
  private readonly now: () => Date;
  private seq: number;
  private head: string;
  private previousHead: string;

  private constructor(options: ResolvedOptions, key: Buffer, keySource: KeySource, raw: RawRead) {
    this.dir = options.dir;
    this.keyPath = options.keyPath;
    this.key = key;
    this.keySource = keySource;
    this.maxBytes = options.maxBytes;
    this.now = options.now;
    this.previousHead = options.previousHead;
    const last = raw.entries[raw.entries.length - 1];
    this.seq = last === undefined ? 0 : last.seq + 1;
    this.head = last === undefined ? this.previousHead : last.hash;
  }

  /**
   * Open (creating if needed) the log rooted at `dir`.
   *
   * A directory that cannot be created is not fatal. The gate's protection is
   * worth more than its ledger, and a security plugin that refuses to load
   * because a home directory is read-only leaves the session with no guard at
   * all — the worst of both outcomes. The session then runs with an in-memory
   * key and no durable log, and `append` reports the write failure so the status
   * tool can surface it.
   *
   * @param options - resolved options; only `dir` is required.
   * @returns the opened log.
   */
  static open(options: AuditLogOptions): AuditLog {
    const resolved = resolveOptions(options);
    try {
      mkdirSync(resolved.dir, { recursive: true, mode: 0o700 });
    } catch {
      // Proven by the `append` path below: `lastWriteError` carries the reason.
    }
    const raw = readSegment(resolved.logPath);
    const anchor = readAnchor(resolved.anchorPath);
    const { key, source } = resolveKey(resolved.dir, resolved.keyPath, resolved.env);
    // The segment's own anchor is authoritative for what it chains onto: an
    // externally supplied predecessor would silently re-root the chain.
    const previousHead = anchor?.previousHead ?? '';
    return new AuditLog({ ...resolved, previousHead }, key, source, raw);
  }

  /**
   * Append one record.
   *
   * The summary and payload are redacted before sealing, so a secret that
   * reaches a guard rule can never be persisted by the log that recorded it.
   *
   * @param input - what happened.
   * @returns the sealed entry.
   */
  append(input: AppendInput): AuditEntry {
    this.maybeRotate();
    const body = {
      seq: this.seq,
      ts: this.now().toISOString(),
      kind: input.kind,
      event: input.event,
      summary: clip(redact(input.summary)),
      data: redactDeep(input.data ?? null),
      prev: this.head,
      alg: 'hmac-sha256' as const,
    };
    const entry = sealEntry(this.key, body);
    try {
      appendFileSync(this.logPath, `${canonicalJson(entry)}\n`, { encoding: 'utf8', mode: 0o600 });
    } catch (error) {
      // A log that cannot be written must not take the session down, but the
      // failure has to be visible: callers surface `lastWriteError`.
      this.lastWriteError = error instanceof Error ? error.message : String(error);
      return entry;
    }
    this.seq += 1;
    this.head = entry.hash;
    this.writeAnchor();
    return entry;
  }

  /** Set when the most recent append failed; `undefined` after a success. */
  lastWriteError: string | undefined;

  /**
   * Read entries, newest last.
   *
   * @param options - filter and limit.
   * @returns the matching entries in file order.
   */
  read(options: ReadOptions = {}): AuditEntry[] {
    const { entries } = readSegment(this.logPath);
    const kind = options.kind;
    const event = options.event;
    const filtered = entries.filter(
      (entry) => (kind === undefined || entry.kind === kind) && (event === undefined || entry.event === event),
    );
    const limit = options.limit ?? 20;
    return limit <= 0 ? [] : filtered.slice(Math.max(0, filtered.length - limit));
  }

  /**
   * Verify the chain, its anchor, and the absence of corrupt lines.
   *
   * @returns the verification outcome.
   */
  verify(): ChainVerification {
    const raw = readSegment(this.logPath);
    const anchor = readAnchor(this.anchorPath);
    if (raw.corruptLines.length > 0) {
      return {
        ok: false,
        entries: raw.entries.length,
        brokenAt: raw.entries.length,
        reason: `${raw.corruptLines.length} line(s) of the log are not valid JSON (lines ${raw.corruptLines.slice(0, 5).join(', ')}) — the file was edited or truncated mid-write`,
        head: this.head,
      };
    }
    const result = verifyChain(this.key, raw.entries, anchor, anchor?.previousHead ?? '');
    if (!result.ok) return result;
    // A missing anchor is itself a finding: every prefix of a valid chain is
    // valid, so without the anchor truncation is indistinguishable from a
    // short log.
    if (anchor === undefined && raw.entries.length > 0) {
      return {
        ok: false,
        entries: raw.entries.length,
        reason: 'the chain is internally consistent but the anchor sidecar audit.head.json is missing, so truncation cannot be ruled out',
        head: result.head,
      };
    }
    return result;
  }

  /** Snapshot the log's health for the status tool. */
  status(): LogStatus {
    const raw = readSegment(this.logPath);
    let bytes = 0;
    try {
      bytes = statSync(this.logPath).size;
    } catch {
      bytes = 0;
    }
    let rotated = 0;
    try {
      const parsed = parseJsonLoose(readFileSync(this.historyPath, 'utf8'));
      rotated = Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      rotated = 0;
    }
    return {
      dir: this.dir,
      entries: raw.entries.length,
      head: this.head,
      bytes,
      keySource: this.keySource,
      rotatedSegments: rotated,
      corruptLines: raw.corruptLines.length,
    };
  }

  /** Absolute path of the active segment. */
  get logPath(): string {
    return join(this.dir, 'audit.log.jsonl');
  }

  /** Absolute path of the anchor sidecar. */
  get anchorPath(): string {
    return join(this.dir, 'audit.head.json');
  }

  /** Absolute path of the rotated-segment history. */
  get historyPath(): string {
    return join(this.dir, 'audit.history.json');
  }

  /** Persist the anchor after every successful append. */
  private writeAnchor(): void {
    const anchor = buildAnchor(this.key, this.head, this.seq, this.previousHead);
    try {
      writeFileSync(this.anchorPath, `${canonicalJson(anchor)}\n`, { encoding: 'utf8', mode: 0o600 });
    } catch {
      // The chain remains verifiable without the anchor; only truncation
      // detection is lost, and `verify()` reports exactly that.
    }
  }

  /** Rotate the active segment once it exceeds the byte budget. */
  private maybeRotate(): void {
    let size = 0;
    try {
      size = statSync(this.logPath).size;
    } catch {
      return;
    }
    if (size < this.maxBytes) return;
    const stamp = this.now().toISOString().replace(/[:.]/g, '-');
    const target = join(this.dir, `audit.log.${stamp}.jsonl`);
    try {
      renameSync(this.logPath, target);
      const record = { file: target.split('/').pop(), ...buildAnchor(this.key, this.head, this.seq, this.previousHead) };
      let history: unknown[] = [];
      try {
        const parsed = parseJsonLoose(readFileSync(this.historyPath, 'utf8'));
        if (Array.isArray(parsed)) history = parsed;
      } catch {
        history = [];
      }
      history.push(record);
      writeFileSync(this.historyPath, `${canonicalJson(history)}\n`, { encoding: 'utf8', mode: 0o600 });
    } catch {
      // Rotation is best-effort; a failed rename just means the segment keeps
      // growing, which is a size problem rather than an integrity one.
      return;
    }
    this.previousHead = this.head;
    this.seq = 0;
    this.writeAnchor();
  }
}

/** Resolved options with every default applied. */
interface ResolvedOptions {
  dir: string;
  keyPath: string;
  logPath: string;
  anchorPath: string;
  historyPath: string;
  maxBytes: number;
  now: () => Date;
  env: NodeJS.ProcessEnv;
  previousHead: string;
}

/** Caller-supplied options. */
export interface AuditLogOptions {
  /** Data directory. */
  dir: string;
  /** Key file path; defaults to `<dir>/audit.key`. */
  keyPath?: string;
  /** Rotation threshold in bytes; defaults to 4 MiB. */
  maxBytes?: number;
  /** Clock override, for tests. */
  now?: () => Date;
  /** Environment to read the key from; defaults to `process.env`. */
  env?: NodeJS.ProcessEnv;
}

/** Apply defaults and derive the file paths. */
function resolveOptions(options: AuditLogOptions): ResolvedOptions {
  const dir = options.dir;
  return {
    dir,
    keyPath: options.keyPath ?? join(dir, 'audit.key'),
    logPath: join(dir, 'audit.log.jsonl'),
    anchorPath: join(dir, 'audit.head.json'),
    historyPath: join(dir, 'audit.history.json'),
    maxBytes: options.maxBytes ?? DEFAULT_MAX_BYTES,
    now: options.now ?? (() => new Date()),
    env: options.env ?? process.env,
    previousHead: '',
  };
}

/** Read and parse one JSONL segment. */
function readSegment(path: string): RawRead {
  if (!existsSync(path)) return { entries: [], corruptLines: [] };
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return { entries: [], corruptLines: [] };
  }
  const entries: AuditEntry[] = [];
  const corruptLines: number[] = [];
  const lines = text.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const line = (lines[index] as string).trim();
    if (line.length === 0) continue;
    const parsed = parseJsonLoose(line);
    if (isAuditEntry(parsed)) entries.push(parsed);
    else corruptLines.push(index + 1);
  }
  return { entries, corruptLines };
}

/** Read the anchor sidecar, tolerating its absence. */
function readAnchor(path: string): ChainAnchor | undefined {
  if (!existsSync(path)) return undefined;
  try {
    const parsed = parseJsonLoose(readFileSync(path, 'utf8'));
    if (typeof parsed !== 'object' || parsed === null) return undefined;
    const record = parsed as Record<string, unknown>;
    if (
      typeof record['entries'] !== 'number' ||
      typeof record['head'] !== 'string' ||
      typeof record['mac'] !== 'string' ||
      typeof record['previousHead'] !== 'string'
    ) {
      return undefined;
    }
    return {
      entries: record['entries'],
      head: record['head'],
      previousHead: record['previousHead'],
      mac: record['mac'],
    };
  } catch {
    return undefined;
  }
}

/** Resolve the HMAC key from the environment or the key file, creating it once. */
function resolveKey(
  dir: string,
  keyPath: string,
  env: NodeJS.ProcessEnv,
): { key: Buffer; source: KeySource } {
  const fromEnv = env[KEY_ENV];
  if (typeof fromEnv === 'string' && /^[0-9a-fA-F]{64}$/.test(fromEnv.trim())) {
    return { key: Buffer.from(fromEnv.trim(), 'hex'), source: 'env' };
  }
  if (existsSync(keyPath)) {
    try {
      const hex = readFileSync(keyPath, 'utf8').trim();
      if (/^[0-9a-fA-F]{64}$/.test(hex)) return { key: Buffer.from(hex, 'hex'), source: 'file' };
    } catch {
      // Fall through and regenerate: an unreadable key file cannot verify
      // anything anyway, and the caller is told the source is `generated`.
    }
  }
  const key = randomBytes(32);
  try {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    writeFileSync(keyPath, `${key.toString('hex')}\n`, { encoding: 'utf8', mode: 0o600 });
    chmodSync(keyPath, 0o600);
  } catch {
    // An unwritable key path still yields a usable in-memory session key; the
    // log is then unverifiable across restarts, which `status()` reports.
  }
  return { key, source: 'generated' };
}

/** Redact every string inside a JSON payload, recursively. */
function redactDeep(value: JsonValue): JsonValue {
  if (typeof value === 'string') return redact(value);
  if (Array.isArray(value)) return value.map(redactDeep);
  if (value !== null && typeof value === 'object') {
    const out: Record<string, JsonValue> = {};
    for (const [key, item] of Object.entries(value)) out[key] = redactDeep(item);
    return out;
  }
  return value;
}
