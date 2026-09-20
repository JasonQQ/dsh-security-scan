/**
 * The pre-install audit engine.
 *
 * Pipeline: resolve the source → stage it in memory → extract facts → run line
 * rules → run package rules → score → assemble a report.
 *
 * Line rules run first specifically so package rules can correlate them: the
 * "reads a credential and posts it somewhere" rule is expressed as *the
 * credential rule fired and the network rule fired,* which is far more robust
 * than a second regex trying to match both on one line.
 *
 * @module dsh-security-scan/scan/engine
 */

import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

import type { Evidence, Finding, Grade, ScanResult, ScanSource, Severity, Category } from '../types.js';
import { SEVERITY_ORDER } from '../types.js';
import { safeClip } from '../util/text.js';
import { type Extraction, extract, lineViews } from './extract.js';
import { commentMask } from './comments.js';
import { DEFAULT_LIMITS, type LoadLimits, type StagedSource, loadDirectory, loadTarball } from './load.js';
import { type InstalledResolution, dshHome, resolveInstalledPackage } from './installed.js';
import { LINE_RULES, PACKAGE_RULES } from './rules.catalog.js';
import { type FileInfo, type LineRule, type PackageHit, type RuleInput, DEFAULT_PER_FILE_CAP, isLineRule } from './rule-types.js';
import { atOrBelow, scoreFindings } from './score.js';

/** Options for one audit. */
export interface AuditOptions {
  /** Staging caps. */
  limits?: LoadLimits;
  /**
   * Whether an `https:` tarball URL may be downloaded.
   *
   * Off by default. A security plugin that silently makes outbound requests
   * would be asking to be trusted on exactly the behavior it is auditing, so
   * fetching is explicit and reported in the scan's notes.
   */
  allowFetch?: boolean;
  /** Maximum bytes accepted from a download; defaults to 64 MiB. */
  maxFetchBytes?: number;
  /** Clock override, for tests. */
  now?: () => Date;
  /** Injection seam for tests; defaults to the global `fetch`. */
  fetchImpl?: typeof fetch;
  /**
   * The worst grade still allowed to install. A result at or below this grade
   * comes back with `blocked: true`. Defaults to `D`, i.e. only D is refused.
   */
  blockAtOrBelow?: Grade;
  /**
   * Restrict the audit to one subdirectory, stripped of its prefix.
   *
   * Marketplace entries for monorepos name the plugin as `<repo>#<subdir>`, and
   * the archive is the whole repository — so without this the audit covers a
   * large unrelated project and reports its findings against the plugin. Scoping
   * makes the grade mean what the reader thinks it means.
   */
  subpath?: string;
  /** Environment to resolve `DSH_HOME` from when looking up an installed name. */
  env?: NodeJS.ProcessEnv;
  /** Working directory used as a final `node_modules` search root. */
  cwd?: string;
}

/** A resolved-and-staged input. */
interface ResolvedSource {
  source: ScanSource;
  staged: StagedSource;
  /** Set when the source was resolved from an installed package name. */
  resolution?: InstalledResolution;
}

/** Compute a stable digest over a staged tree. */
function digestOf(staged: StagedSource): string {
  const hash = createHash('sha256');
  for (const file of [...staged.files].sort((left, right) => left.path.localeCompare(right.path))) {
    hash.update(file.path, 'utf8');
    hash.update('\0', 'utf8');
    hash.update(createHash('sha256').update(file.bytes).digest('hex'), 'utf8');
    hash.update('\n', 'utf8');
  }
  return hash.digest('hex');
}

/** Whether a path names a tarball the loader understands. */
function isArchivePath(path: string): boolean {
  return /\.(?:tgz|tar\.gz|tar)$/i.test(path);
}

/** The milder of two severities. */
function worstOf(left: Severity, right: Severity): Severity {
  return SEVERITY_ORDER.indexOf(left) >= SEVERITY_ORDER.indexOf(right) ? left : right;
}

/** Severity ceiling for findings in a file whose role is not shipped behavior. */
const ROLE_SEVERITY_CAP: Severity = 'low';

/**
 * Categories whose findings in a document are the point rather than an artifact.
 *
 * Prompt-injection rules exist to read instructions aimed at a model, and a
 * `SKILL.md` is the canonical place those live — so capping them because the file
 * is a document would disable the detection entirely. Every other category is
 * making a claim about what the package does when it runs, which a document does
 * not do.
 */
const ROLE_CAP_EXEMPT_PREFIXES: readonly string[] = ['prompt.'];

/**
 * The severity a finding carries once its file is taken into account.
 *
 * Two independent ceilings apply. A rule may cap itself inside generated output
 * (`generatedFileSeverity`), because a minifier inlines string literals from
 * every dependency and mangles the structure a reviewer would use to judge
 * intent. Separately, a finding in test material or prose is reported but capped:
 * it describes something other than the code that installs and runs, so it is
 * evidence to read rather than a reason to refuse the package.
 *
 * The caps do not hide anything. The finding is still listed, with its file and
 * line, and the score still moves — the ceiling only stops such a finding from
 * pinning a grade at `D` on its own.
 *
 * @param rule - the rule that produced the finding.
 * @param file - the file the evidence was found in.
 * @returns the severity to record.
 */
function severityFor(rule: LineRule, file: FileInfo): Severity {
  let severity = rule.severity;
  if (file.generated === true && rule.generatedFileSeverity !== undefined) {
    severity = worstOf(severity, rule.generatedFileSeverity);
  }
  const role = file.role ?? 'source';
  if (role !== 'test' && role !== 'doc') return severity;
  if (ROLE_CAP_EXEMPT_PREFIXES.some((prefix) => rule.id.startsWith(prefix))) return severity;
  return worstOf(severity, ROLE_SEVERITY_CAP);
}

/** Resolve a source string into staged bytes. */
async function resolveSource(source: string, options: AuditOptions): Promise<ResolvedSource> {
  const limits = options.limits ?? DEFAULT_LIMITS;

  if (/^https?:\/\//i.test(source)) {
    if (options.allowFetch !== true) {
      throw new Error(
        `refusing to download ${source}: network fetching is disabled. Pass allowFetch (pre-install audit config \`fetch\`) to enable it, or download the artifact yourself and audit the local path.`,
      );
    }
    if (!/^https:/i.test(source)) {
      throw new Error(`refusing to download ${source} over plain HTTP: an artifact fetched in the clear cannot be audited meaningfully`);
    }
    const fetchImpl = options.fetchImpl ?? fetch;
    const response = await fetchImpl(source, { redirect: 'follow' });
    if (!response.ok) {
      throw new Error(`could not download ${source}: HTTP ${response.status}`);
    }
    const cap = options.maxFetchBytes ?? DEFAULT_LIMITS.maxTotalBytes;
    // Reject on the declared length before pulling the body. Checking after means
    // a 553 MB repository is fully downloaded and then discarded — and in practice
    // it timed out first, so the entry was reported as a network failure rather
    // than as too large, which is a different and much less useful fact.
    const declared = Number(response.headers.get('content-length') ?? '');
    if (Number.isFinite(declared) && declared > cap) {
      throw new Error(`artifact is ${declared} bytes, above the ${cap}-byte cap (rejected from its content-length, without downloading it)`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > cap) {
      throw new Error(`downloaded artifact is ${buffer.length} bytes, above the ${cap}-byte cap`);
    }
    const staged = loadTarball(buffer, limits, options.subpath);
    return { source: { kind: 'url', value: source }, staged };
  }

  const absolute = isAbsolute(source) ? source : resolve(process.cwd(), source);
  let stats;
  try {
    stats = statSync(absolute);
  } catch {
    // Not a path on disk. Before giving up, treat the argument as an installed
    // plugin name: "audit what I already have" is the question a bare name asks,
    // and it is answered from the profile's own node_modules rather than from
    // anything fetched.
    const installed = resolveInstalledPackage(source, {
      ...(options.env !== undefined ? { env: options.env } : {}),
      ...(options.cwd !== undefined ? { cwd: options.cwd } : {}),
    });
    if (installed === undefined) {
      throw new Error(
        `no such file or directory: ${absolute}. If "${source}" is meant to be a plugin name, it is not installed in any profile under ${dshHome(options.env ?? process.env)} — install it first, or pass the directory or .tgz you want audited.`,
      );
    }
    return {
      source: {
        kind: 'installed',
        value: source,
        stagedPath: installed.path,
        ...(installed.profile !== undefined ? { profile: installed.profile } : {}),
        linked: installed.linked,
      },
      staged: loadDirectory(installed.path, limits, options.subpath),
      resolution: installed,
    };
  }
  if (stats.isDirectory()) {
    return { source: { kind: 'directory', value: source, stagedPath: absolute }, staged: loadDirectory(absolute, limits, options.subpath) };
  }
  if (!stats.isFile()) {
    throw new Error(`${absolute} is neither a directory nor a regular file`);
  }
  if (!isArchivePath(absolute)) {
    throw new Error(`${absolute} is not a directory or a .tgz/.tar.gz/.tar archive`);
  }
  const staged = loadTarball(readFileSync(absolute), limits, options.subpath);
  return { source: { kind: 'tarball', value: source, stagedPath: absolute }, staged };
}

/** Run line rules over every staged file. */
function runLineRules(extraction: Extraction): Finding[] {
  const findings: Finding[] = [];
  for (const rule of LINE_RULES) {
    // Comments are skipped unless the rule opts in, because for most families a
    // comment is documentation rather than behaviour — see `LineRule`.
    const inspectComments = rule.inspectComments === true;
    for (const file of extraction.files) {
      if (file.decodeError !== undefined) continue;
      if (!rule.scope.includes('any') && !rule.scope.includes(file.kind)) continue;
      const comments = commentMask(file);
      const cap = rule.perFileCap ?? DEFAULT_PER_FILE_CAP;
      let emitted = 0;
      for (let index = 0; index < file.lines.length && emitted < cap; index += 1) {
        if (!inspectComments && comments[index] === true) continue;
        const raw = file.lines[index] as string;
        if (raw.length === 0 || raw.length > 100_000) continue;
        // A rule is tested against every spelling of the line, but a hit is
        // recorded once: the same violation written two ways is one violation.
        const seen = new Set<string>();
        const evidence: Evidence[] = [];
        const views = viewsFor(raw);
        for (const view of views) {
          let result: ReturnType<typeof rule.test>;
          try {
            result = rule.test(view, file);
          } catch {
            // A rule that throws on exotic input must not abort the whole audit.
            continue;
          }
          if (result === undefined || result === null || result === false) continue;
          const matches = typeof result === 'string' ? [result] : result;
          for (const match of matches) {
            if (typeof match !== 'string' || match.length === 0) continue;
            const key = match.slice(0, 80);
            if (seen.has(key)) continue;
            seen.add(key);
            evidence.push({ file: file.path, line: index + 1, snippet: safeClip(match) });
          }
        }
        if (evidence.length === 0) continue;
        findings.push({
          id: rule.id,
          category: rule.category,
            severity: severityFor(rule, file),
          title: rule.title,
          detail: rule.detail,
          remediation: rule.remediation,
          evidence,
        });
        emitted += 1;
      }
    }
  }
  return findings;
}

/**
 * Memoized line spellings.
 *
 * The same literal line (`import ...`, `const x = 1`) recurs across files in a
 * dependency tree, and each distinct line costs a regex pass plus a literal
 * scan. The cache is bounded so a pathological input cannot grow it without
 * limit.
 */
const viewCache = new Map<string, string[]>();

/** Cached wrapper around {@link lineViews} for the hot loop. */
function viewsFor(line: string): string[] {
  const cached = viewCache.get(line);
  if (cached !== undefined) return cached;
  const views = lineViews(line);
  if (viewCache.size > 50_000) viewCache.clear();
  viewCache.set(line, views);
  return views;
}

/** Build the correlation index for package rules. */
function buildRuleInput(extraction: Extraction, lineFindings: Finding[]): RuleInput {
  const byId = new Map<string, Evidence[]>();
  for (const finding of lineFindings) {
    const bucket = byId.get(finding.id) ?? [];
    bucket.push(...finding.evidence);
    byId.set(finding.id, bucket);
  }
  const fired = (prefix: string): boolean => {
    for (const id of byId.keys()) {
      if (id === prefix || id.startsWith(`${prefix}`)) return true;
    }
    return false;
  };
  const evidenceFor = (prefix: string): Evidence[] => {
    const out: Evidence[] = [];
    for (const [id, evidence] of byId) {
      if (id === prefix || id.startsWith(prefix)) out.push(...evidence);
    }
    return out.slice(0, 8);
  };
  return {
    ...(extraction.manifest !== undefined ? { manifest: extraction.manifest } : {}),
    // Correlation rules are asking "does installing this run code that also
    // reaches the network?", so they see only the hooks that actually run on the
    // installing machine. `prepack` and friends run in the maintainer's checkout
    // and pairing them with a sink proves nothing. The full list still reaches
    // the report through `ScanResult.installScripts`.
    installScripts: extraction.installScripts.filter((script) => script.installTime),
    capabilities: extraction.capabilities,
    files: extraction.files,
    lineFindings: lineFindings.map((finding) => ({
      id: finding.id,
      severity: finding.severity,
      evidence: finding.evidence,
    })),
    fired,
    evidenceFor,
  };
}

/** Run package rules. */
function runPackageRules(input: RuleInput): Finding[] {
  const findings: Finding[] = [];
  const roleByPath = new Map<string, FileInfo['role']>(
    input.files.map((file) => [file.path, file.role ?? 'source']),
  );
  for (const rule of PACKAGE_RULES) {
    if (isLineRule(rule)) continue;
    let hits: PackageHit[] | undefined;
    try {
      hits = rule.evaluate(input);
    } catch {
      // A throwing package rule is a bug in that rule, not a verdict on the package.
      continue;
    }
    if (hits === undefined) continue;
    for (const hit of hits) {
      if (hit.evidence.length === 0) continue;
      findings.push({
        id: rule.id,
        category: rule.category,
        severity: packageSeverity(hit.severity ?? rule.severity, hit.evidence, roleByPath),
        title: rule.title,
        detail: hit.detail ?? rule.detail,
        remediation: rule.remediation,
        evidence: hit.evidence,
      });
    }
  }
  return findings;
}

/**
 * The severity a package-level finding carries once its evidence is considered.
 *
 * A package rule combines anchors from across the tree, and its severity is a
 * claim about the package as a whole. When every anchor it found sits in test
 * material or prose, that claim is really about those files: `rm -rf /` inside
 * `packages/fatal-guard/tests/sanitize-command.test.js` is the input a test feeds
 * a sanitizer to prove the sanitizer rejects it. The line-rule ceiling in
 * {@link severityFor} does not reach here, because a package rule produces one
 * finding with evidence from many files, so the same ceiling is applied to the
 * *set* of anchors.
 *
 * One anchor in real source is enough to keep the original severity: that is the
 * case the rule exists for.
 *
 * @param severity - the severity the rule asked for.
 * @param evidence - the anchors it produced.
 * @param roleByPath - resolved file roles.
 * @returns the severity to record.
 */
function packageSeverity(
  severity: Severity,
  evidence: readonly Evidence[],
  roleByPath: ReadonlyMap<string, FileInfo['role']>,
): Severity {
  const allDevelopment = evidence.every((item) => {
    const role = roleByPath.get(item.file) ?? 'source';
    return role === 'test' || role === 'doc';
  });
  return allDevelopment ? worstOf(severity, ROLE_SEVERITY_CAP) : severity;
}

/** Sort findings worst-first, then by id for stability. */
function orderFindings(findings: Finding[]): Finding[] {
  const rank = new Map<Severity, number>();
  SEVERITY_ORDER.forEach((severity, index) => rank.set(severity, index));
  const byCategory = (category: Category): string => category;
  return [...findings].sort((left, right) => {
    const severityDelta = (rank.get(left.severity) ?? 99) - (rank.get(right.severity) ?? 99);
    if (severityDelta !== 0) return severityDelta;
    const categoryDelta = byCategory(left.category).localeCompare(byCategory(right.category));
    if (categoryDelta !== 0) return categoryDelta;
    return left.id.localeCompare(right.id);
  });
}

/** Deduplicate findings that share an id but were reported per line spelling. */
function collapseDuplicates(findings: Finding[]): Finding[] {
  const byId = new Map<string, Finding>();
  for (const finding of findings) {
    const existing = byId.get(finding.id);
    if (existing === undefined) {
      byId.set(finding.id, { ...finding, evidence: [...finding.evidence] });
      continue;
    }
    const seen = new Set(existing.evidence.map((item) => `${item.file}:${item.line}:${item.snippet}`));
    for (const item of finding.evidence) {
      const key = `${item.file}:${item.line}:${item.snippet}`;
      if (seen.has(key)) continue;
      seen.add(key);
      existing.evidence.push(item);
    }
    // The worst severity a rule produced wins.
    const rank = new Map<Severity, number>();
    SEVERITY_ORDER.forEach((severity, index) => rank.set(severity, index));
    if ((rank.get(finding.severity) ?? 99) < (rank.get(existing.severity) ?? 99)) {
      existing.severity = finding.severity;
    }
  }
  return [...byId.values()];
}

/** The install floor: the worst grade still allowed to install. */
export interface InstallPolicy {
  /** A grade at or below this value is refused. Default `D`. */
  blockAtOrBelow: 'A' | 'B' | 'C' | 'D';
}

/**
 * Audit one source.
 *
 * @param source - a directory path, a `.tgz` path, or an `https:` tarball URL.
 * @param options - caps, fetch permission, and test seams.
 * @returns the scan result.
 */
export async function auditSource(source: string, options: AuditOptions = {}): Promise<ScanResult> {
  const { source: descriptor, staged, resolution } = await resolveSource(source, options);
  const scopeNote = options.subpath === undefined || options.subpath.trim().length === 0
    ? []
    : [`scoped to the subdirectory \`${options.subpath.replace(/^\/+|\/+$/g, '')}/\``];
  const extraction = extract(staged);
  const lineFindings = runLineRules(extraction);
  const packageFindings = runPackageRules(buildRuleInput(extraction, lineFindings));
  const findings = orderFindings(collapseDuplicates([...lineFindings, ...packageFindings]));
  const scored = scoreFindings(findings);
  const notes = [...scopeNote, ...extraction.notes];
  if (options.allowFetch === true) notes.push('outbound fetching was permitted for this audit');
  if (scored.forcedBy !== undefined) notes.push(`grade forced to D by a critical finding: ${scored.forcedBy}`);
  // Say plainly which copy was audited. An installed plugin can be a symlink to a
  // live checkout or a frozen tarball, and a grade means different things for
  // each: the linked one can change after you read this report.
  if (resolution !== undefined) {
    notes.push(
      `resolved the installed package "${descriptor.value}" to ${resolution.path}${resolution.profile !== undefined ? ` (profile: ${resolution.profile})` : ''}`,
    );
    if (resolution.linked) {
      notes.push('the installed entry is a symlink: this audits live source that can change, not a frozen artifact');
    }
    if (resolution.alsoFound.length > 0) {
      notes.push(`the same package is also installed at ${resolution.alsoFound.join(', ')}; this report covers only the copy above`);
    }
  }
  const ceiling = options.blockAtOrBelow ?? 'D';
  if (atOrBelow(scored.grade, ceiling)) {
    notes.push(`grade ${scored.grade} is at or below the install floor ${ceiling}: this source is refused`);
  }

  return {
    source: descriptor,
    root: descriptor.stagedPath ?? descriptor.value,
    ...(extraction.manifest !== undefined ? { manifest: extraction.manifest } : {}),
    files: extraction.files.map((file) => ({
      path: file.path,
      bytes: file.bytes,
      code: file.kind === 'code' || file.kind === 'script',
    })),
    installScripts: extraction.installScripts,
    capabilities: extraction.capabilities,
    findings,
    grade: scored.grade,
    score: scored.score,
    blocked: atOrBelow(scored.grade, ceiling),
    digest: digestOf(staged),
    scannedAt: (options.now ?? (() => new Date()))().toISOString(),
    truncated: staged.truncated,
    notes,
  };
}
