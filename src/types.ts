/**
 * Domain types shared by both layers of the plugin.
 *
 * Everything here is plain data: the scanner, the runtime guard, the audit log
 * and the model-facing tools all speak this vocabulary, which is what lets the
 * same finding shape appear in a pre-install report and in a runtime log line.
 *
 * @module dsh-security-scan/types
 */

/** Ordered severity. `critical` always forces a failing grade and a block. */
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/** Severity ordering, worst first — used for sorting and for threshold checks. */
export const SEVERITY_ORDER: readonly Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

/** Numeric weight of each severity in the trust-score deduction table. */
export const SEVERITY_WEIGHT: Readonly<Record<Severity, number>> = {
  critical: 100,
  high: 18,
  medium: 7,
  low: 2,
  info: 0,
};

/** Trust grade. `A` is best; `D` is refused. */
export type Grade = 'A' | 'B' | 'C' | 'D';

/** What a finding is about. Shared by static findings and runtime detections. */
export type Category =
  | 'install-script'
  | 'credential-access'
  | 'obfuscation'
  | 'network-callback'
  | 'privilege'
  | 'exfiltration'
  | 'persistence'
  | 'supply-chain'
  | 'harness-abuse'
  | 'prompt-injection'
  | 'destructive'
  | 'ssrf'
  | 'secret-leak'
  | 'sandbox-escape';

/** A file/line anchor for one piece of evidence. */
export interface Location {
  /** Path relative to the scanned root, or a synthetic label such as `<tool-call>`. */
  file: string;
  /** 1-based line number, or `0` when the evidence is not line-anchored. */
  line: number;
}

/** One anchored excerpt. Snippets are always already redacted and truncated. */
export interface Evidence extends Location {
  snippet: string;
}

/** One rule violation, from either layer. */
export interface Finding {
  /** Stable rule id, e.g. `cred.read-ssh-key`. */
  id: string;
  category: Category;
  severity: Severity;
  /** One-line description of what was seen. */
  title: string;
  /** Why it matters, in one or two sentences. */
  detail: string;
  /** What the author should change. */
  remediation: string;
  evidence: Evidence[];
}

/** Kind of capability extracted from source. */
export type CapabilityKind =
  | 'file-read'
  | 'file-write'
  | 'command'
  | 'domain'
  | 'env'
  | 'network-sink';

/** One extracted capability with its provenance. */
export interface Capability {
  /** The extracted value: a path, a command, a hostname, an env var name. */
  value: string;
  evidence: Evidence;
}

/**
 * What a scanned plugin can do, as extracted from its source without running
 * it. This is the human-facing "here is what this plugin touches" inventory.
 */
export interface Capabilities {
  fileReads: Capability[];
  fileWrites: Capability[];
  commands: Capability[];
  domains: Capability[];
  envVars: Capability[];
  networkSinks: Capability[];
}

/** One npm lifecycle script found in a manifest. */
export interface InstallScript {
  /** `preinstall`, `install`, `postinstall`, `prepare`, … */
  hook: string;
  command: string;
  /** Path of the manifest that declared it, relative to the scanned root. */
  file: string;
  /** True when this hook belongs to a dependency rather than the scanned package. */
  fromDependency: boolean;
}

/** The subset of `package.json` the audit reasons about. */
export interface ScannedManifest {
  name?: string;
  version?: string;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  optionalDependencies: Record<string, string>;
  /** Declared DSH manifest, when present. */
  dsh?: unknown;
  /** Whether the manifest declares a `bin` entry. */
  hasBin: boolean;
}

/** One source file that was read by the scanner. */
export interface ScannedFile {
  /** Path relative to the scanned root. */
  path: string;
  bytes: number;
  /** True when the file is code the scanner inspects line by line. */
  code: boolean;
}

/** Where a scan's input came from. */
export interface ScanSource {
  /** `directory` | `tarball` | `url`. */
  kind: 'directory' | 'tarball' | 'url';
  /** The path or URL as given. */
  value: string;
  /** Resolved absolute path of the staged copy, when the input was materialized. */
  stagedPath?: string;
}

/** The full result of one pre-install audit. */
export interface ScanResult {
  source: ScanSource;
  /** Absolute path of the directory that was analysed. */
  root: string;
  manifest?: ScannedManifest;
  files: ScannedFile[];
  installScripts: InstallScript[];
  capabilities: Capabilities;
  findings: Finding[];
  /** Trust grade derived from the findings. */
  grade: Grade;
  /** Trust score, 100 (clean) down to 0. */
  score: number;
  /** True when the grade is at or below the configured install floor. */
  blocked: boolean;
  /** SHA-256 over the sorted file digests — the identity of this exact source tree. */
  digest: string;
  scannedAt: string;
  /** True when a file/byte cap cut the scan short; the grade is then provisional. */
  truncated: boolean;
  /** Non-finding observations, e.g. "skipped 3 binary files". */
  notes: string[];
}

/** What the guard does when a rule matches. */
export type GuardAction = 'block' | 'ask' | 'warn';

/** A runtime detection, produced by inspecting a tool call or its result. */
export interface Detection {
  /** Rule id that fired. */
  id: string;
  category: Category;
  severity: Severity;
  /** The action the rule asks for, before configuration overrides. */
  action: GuardAction;
  title: string;
  detail: string;
  /** The canonicalized text that matched, already truncated. */
  matched: string;
  remediation: string;
}

/** Result of inspecting one side of a tool call. */
export interface DetectionReport {
  detections: Detection[];
  /** The strongest action among `detections`, or `undefined` when clean. */
  action?: GuardAction;
}

/** JSON value, as accepted by an audit-log record's `data` field. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/** Kinds of audit-log record. */
export type AuditKind =
  | 'guard'
  | 'output'
  | 'install-audit'
  | 'verify'
  | 'lifecycle';

/** One line of the tamper-evident audit log. */
export interface AuditEntry {
  /** Monotonic, gapless sequence number starting at 0. */
  seq: number;
  /** ISO-8601 timestamp. */
  ts: string;
  kind: AuditKind;
  /** Machine-readable event name, e.g. `tool-blocked`. */
  event: string;
  /** Truncated one-line human summary. Never contains secret material. */
  summary: string;
  /** Structured payload. Never contains secret material. */
  data: JsonValue;
  /** Hash of the previous entry as lowercase hex; empty string for the genesis entry. */
  prev: string;
  /** Chain algorithm id, recorded so old logs stay verifiable. */
  alg: 'hmac-sha256';
  /** HMAC of this entry (excluding `hash`) as lowercase hex. */
  hash: string;
}

/** Outcome of verifying an audit log's chain. */
export interface ChainVerification {
  ok: boolean;
  entries: number;
  /** Sequence number of the first broken entry, when `ok` is false. */
  brokenAt?: number;
  /** Why verification failed. */
  reason?: string;
  /** Head hash after verification — matches the recorded head when nothing was lost. */
  head: string;
}
