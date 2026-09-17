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
import { LINE_RULES, PACKAGE_RULES } from './rules.catalog.js';
import { type PackageHit, type RuleInput, DEFAULT_PER_FILE_CAP, isLineRule } from './rule-types.js';
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
}

/** A resolved-and-staged input. */
interface ResolvedSource {
  source: ScanSource;
  staged: StagedSource;
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
    const buffer = Buffer.from(await response.arrayBuffer());
    const cap = options.maxFetchBytes ?? DEFAULT_LIMITS.maxTotalBytes;
    if (buffer.length > cap) {
      throw new Error(`downloaded artifact is ${buffer.length} bytes, above the ${cap}-byte cap`);
    }
    const staged = loadTarball(buffer, limits);
    return { source: { kind: 'url', value: source }, staged };
  }

  const absolute = isAbsolute(source) ? source : resolve(process.cwd(), source);
  let stats;
  try {
    stats = statSync(absolute);
  } catch {
    throw new Error(`no such file or directory: ${absolute}`);
  }
  if (stats.isDirectory()) {
    return { source: { kind: 'directory', value: source, stagedPath: absolute }, staged: loadDirectory(absolute, limits) };
  }
  if (!stats.isFile()) {
    throw new Error(`${absolute} is neither a directory nor a regular file`);
  }
  if (!isArchivePath(absolute)) {
    throw new Error(`${absolute} is not a directory or a .tgz/.tar.gz/.tar archive`);
  }
  const staged = loadTarball(readFileSync(absolute), limits);
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
          severity: rule.severity,
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
    installScripts: extraction.installScripts,
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
        severity: hit.severity ?? rule.severity,
        title: rule.title,
        detail: hit.detail ?? rule.detail,
        remediation: rule.remediation,
        evidence: hit.evidence,
      });
    }
  }
  return findings;
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
  const { source: descriptor, staged } = await resolveSource(source, options);
  const extraction = extract(staged);
  const lineFindings = runLineRules(extraction);
  const packageFindings = runPackageRules(buildRuleInput(extraction, lineFindings));
  const findings = orderFindings(collapseDuplicates([...lineFindings, ...packageFindings]));
  const scored = scoreFindings(findings);
  const notes = [...extraction.notes];
  if (options.allowFetch === true) notes.push('outbound fetching was permitted for this audit');
  if (scored.forcedBy !== undefined) notes.push(`grade forced to D by a critical finding: ${scored.forcedBy}`);
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
