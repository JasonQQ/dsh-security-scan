/**
 * The rule contract shared by every static rule.
 *
 * Two kinds of rule exist because two kinds of fact exist. Some facts live on a
 * single line (`eval(` appears here), and some only exist across a whole package
 * (this package reads `~/.ssh/id_rsa` *and* posts to a hardcoded host). Line
 * rules are cheap and numerous; package rules are few and carry the correlation
 * that a signature list cannot express.
 *
 * @module dsh-security-scan/scan/rule-types
 */

import type {
  Capabilities,
  Category,
  Evidence,
  InstallScript,
  ScannedManifest,
  Severity,
} from '../types.js';

/** How a file is treated by the scanner. */
export type FileKind = 'code' | 'script' | 'manifest' | 'doc' | 'config' | 'other';

/** A staged file, split for line-anchored matching. */
export interface FileInfo {
  /** Path relative to the scanned root. */
  path: string;
  /** Full decoded text. */
  text: string;
  /** Text split on newlines; index 0 is line 1. */
  lines: string[];
  kind: FileKind;
  bytes: number;
  /**
   * True when the file is machine-generated output rather than authored source.
   *
   * Recognized by shape — a handful of enormous lines, or a sourcemap trailer.
   * It matters because a minifier inlines string literals from every dependency,
   * mangles identifiers and removes the surrounding structure a reviewer would
   * use to judge intent, so a literal inside a bundle is much weaker evidence
   * than the same literal in hand-written code. Rules whose evidence is a
   * literal cap themselves here via `generatedFileSeverity`.
   */
  generated?: boolean;
  /**
   * Which kind of evidence this file is, for capping how much a finding in it counts.
   *
   * A finding's severity is a claim about what installing the package does. A
   * destructive command in a test fixture, a credential path in a changelog, and a
   * metadata address inside a linter rule that blocks it are all real matches that
   * describe something other than shipped behavior — see `fileRoleOf`. Optional
   * because a `FileInfo` built directly in a test need not classify itself; an
   * absent role is treated as `source`, which is the strict reading.
   */
  role?: 'source' | 'test' | 'doc' | 'generated' | 'config';
  /**
   * True for build-tool configuration (`*.config.ts`, `tsconfig.json`, …).
   *
   * These run in the maintainer's checkout, never on the machine that installs
   * the package, so they are excluded from the *correlation* layer: a build
   * config that serializes `process.env` into a define block is ordinary
   * tooling, and pairing it with a network sink somewhere else in the package
   * proved nothing except that the package has a build step.
   */
  devOnly?: boolean;
  /** Message when the file could not be decoded as UTF-8 text. */
  decodeError?: string;
}

/** Which file kinds a line rule applies to. */
export type Scope = FileKind | 'any';

/**
 * A rule evaluated once per line.
 *
 * `test` returns the excerpt(s) that justify a finding, or a falsy value when
 * the line is clean. Returning the excerpt rather than a boolean keeps every
 * finding anchored to the exact text that produced it, which is what makes the
 * report reviewable.
 */
export interface LineRule {
  /** Stable id, e.g. `cred.read-ssh-key`. */
  id: string;
  category: Category;
  severity: Severity;
  /** One-line statement of what matched. */
  title: string;
  detail: string;
  remediation: string;
  /** File kinds this rule is applied to. */
  scope: Scope[];
  /**
   * Whether this rule also inspects lines that carry no executable content.
   *
   * Defaults to `false`: comment text is a much weaker signal than code, and
   * treating it as equal produces findings like "reads an SSH private key" for a
   * JSDoc example — which is how a scanner ends up crying wolf at the plugins
   * that document the paths they deliberately refuse to read.
   *
   * Set it to `true` only when the comment itself is the evidence. Two families
   * do: obfuscation (a base64 blob parked in a comment is still a payload) and
   * prompt-injection (hidden instructions live in prose and comments by
   * definition).
   */
  inspectComments?: boolean;
  /**
   * The worst severity this rule may report when its evidence sits in a
   * machine-generated file (see {@link FileInfo.generated}).
   *
   * Set it on rules whose evidence is a bare string literal or a minification
   * artifact. A minifier inlines literals from every dependency, so "this bundle
   * contains `~/.ssh/id_rsa`" says very little, while "this bundle calls
   * `child_process.exec`" still says a lot. Capping keeps such a finding visible
   * without letting it drive the grade — which matters because DSH plugins
   * normally ship a bundled `lib/`, so without this nearly every bundled plugin
   * would grade `D` and the grade would stop meaning anything.
   */
  generatedFileSeverity?: Severity;
  /** Inspect one line; return the offending excerpt(s) when it violates the rule. */
  test: (line: string, file: FileInfo) => string | string[] | undefined | null | false;
  /** Maximum findings this rule emits per file; defaults to {@link DEFAULT_PER_FILE_CAP}. */
  perFileCap?: number;
}

/** Default per-file cap for line rules. */
export const DEFAULT_PER_FILE_CAP = 5;

/** One package-level violation. */
export interface PackageHit {
  /** Anchors for the claim; at least one is required. */
  evidence: Evidence[];
  /** Overrides the rule's `detail` when the specifics matter. */
  detail?: string;
  /** Overrides the rule's severity when the specifics escalate it. */
  severity?: Severity;
}

/** Everything a package rule may inspect. */
export interface RuleInput {
  manifest?: ScannedManifest;
  installScripts: InstallScript[];
  capabilities: Capabilities;
  files: FileInfo[];
  /** Findings already produced by line rules, for correlation. */
  lineFindings: readonly { id: string; severity: Severity; evidence: Evidence[] }[];
  /** Convenience: whether any line rule in a category fired. */
  fired: (ruleIdOrPrefix: string) => boolean;
  /** Convenience: every finding a rule id (or id prefix) produced. */
  evidenceFor: (ruleIdOrPrefix: string) => Evidence[];
}

/**
 * A rule evaluated once per package.
 *
 * `evaluate` returns zero or more hits; the engine turns each into a finding.
 */
export interface PackageRule {
  /** Stable id, e.g. `exfil.read-then-post`. */
  id: string;
  category: Category;
  severity: Severity;
  title: string;
  detail: string;
  remediation: string;
  evaluate: (input: RuleInput) => PackageHit[] | undefined;
}

/** Any rule, used where the engine treats both kinds alike. */
export type Rule = LineRule | PackageRule;

/** Whether a rule is a line rule. */
export function isLineRule(rule: Rule): rule is LineRule {
  return typeof (rule as LineRule).test === 'function';
}

/**
 * Build a line test from a regular expression.
 *
 * The pattern is cloned per call site with the `g` flag forced, so a rule author
 * cannot accidentally ship a stateful shared regex — the classic bug where a
 * `lastIndex` left over from a failed match makes the next match disappear.
 *
 * @param pattern - the expression to match; flags other than `g` are preserved.
 * @returns a line test returning each match as an excerpt.
 */
export function fromRegex(pattern: RegExp): LineRule['test'] {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  return (line: string) => {
    const re = new RegExp(pattern.source, flags);
    const matches: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = re.exec(line)) !== null) {
      matches.push(match[0]);
      if (match[0].length === 0) re.lastIndex += 1;
      if (matches.length >= 8) break;
    }
    return matches.length === 0 ? undefined : matches;
  };
}

/**
 * Build a line test from a predicate.
 *
 * @param predicate - receives the line and returns an excerpt, or a falsy value.
 * @returns the line test.
 */
export function fromPredicate(
  predicate: (line: string, file: FileInfo) => string | string[] | undefined | null | false,
): LineRule['test'] {
  return predicate;
}
