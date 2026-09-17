/**
 * Rendering a scan result for a human or a model.
 *
 * Two shapes, one source of truth. The Markdown form is what the model sees and
 * what a person reads in a terminal; the JSON form is what another tool
 * consumes. Both are produced from the same `ScanResult`, so the two can never
 * disagree about the grade.
 *
 * The capability inventory is placed before the findings on purpose. "This
 * plugin reads these eleven paths and calls these three hosts" is answerable
 * without judgement, and it is what lets a reader disagree with the scanner's
 * grade rather than merely receive it.
 *
 * @module dsh-security-scan/scan/report
 */

import type { Capability, Finding, ScanResult, Severity } from '../types.js';

/** Cap on rows printed per capability kind and per finding. */
export const REPORT_ROW_CAP = 12;

/** One-line summary of a grade, used in headers and tool results. */
export const GRADE_SUMMARY: Readonly<Record<ScanResult['grade'], string>> = {
  A: 'no meaningful risk signals',
  B: 'minor signals, review recommended',
  C: 'notable risk signals, install only with intent',
  D: 'refused: critical risk signals',
};

/** Render a byte count for humans. */
function bytes(count: number): string {
  if (count < 1024) return `${count} B`;
  if (count < 1024 * 1024) return `${(count / 1024).toFixed(1)} KiB`;
  return `${(count / (1024 * 1024)).toFixed(1)} MiB`;
}

/** 'a, b, c' with an overflow marker rather than a truncated silent list. */
function listWithOverflow(values: readonly string[], cap = REPORT_ROW_CAP): string {
  if (values.length === 0) return '(none)';
  if (values.length <= cap) return values.join(', ');
  return `${values.slice(0, cap).join(', ')} (+${values.length - cap} more)`;
}

/** Group capabilities by value, keeping the first evidence for each. */
function uniqueCapabilities(items: readonly Capability[]): Capability[] {
  const seen = new Set<string>();
  const out: Capability[] = [];
  for (const item of items) {
    if (seen.has(item.value)) continue;
    seen.add(item.value);
    out.push(item);
  }
  return out;
}

/** Severity section order, worst first. */
const SEVERITIES: readonly Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

/** Render one finding as a Markdown block. */
function renderFinding(finding: Finding): string {
  const lines: string[] = [];
  lines.push(`- **${finding.severity.toUpperCase()}** \`${finding.id}\` — ${finding.title}`);
  lines.push(`  ${finding.detail}`);
  const shown = finding.evidence.slice(0, 4);
  for (const item of shown) {
    lines.push(`  - \`${item.file}${item.line > 0 ? `:${item.line}` : ''}\` — \`${item.snippet}\``);
  }
  if (finding.evidence.length > shown.length) {
    lines.push(`  - … and ${finding.evidence.length - shown.length} more location(s)`);
  }
  lines.push(`  _Remediation:_ ${finding.remediation}`);
  return lines.join('\n');
}

/**
 * Render a scan result as Markdown.
 *
 * @param result - the scan result.
 * @returns the report text.
 */
export function renderReport(result: ScanResult): string {
  const lines: string[] = [];
  const name = result.manifest?.name ?? result.source.value;
  const version = result.manifest?.version;

  lines.push(`# Pre-install audit: ${name}${version !== undefined ? `@${version}` : ''}`);
  lines.push('');
  lines.push(`**Trust grade: ${result.grade}** (score ${result.score}/100 — ${GRADE_SUMMARY[result.grade]})`);
  if (result.blocked) {
    lines.push('');
    lines.push('> **Install refused.** This source met the configured refusal floor. Fix the critical findings, or change `install.blockAtOrBelow` if you have read them and accept the risk.');
  }
  if (result.truncated) {
    lines.push('');
    lines.push('> **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.');
  }
  lines.push('');
  lines.push(`- Source: \`${result.source.value}\` (${result.source.kind})`);
  lines.push(`- Files analysed: ${result.files.length} (${bytes(result.files.reduce((total, file) => total + file.bytes, 0))})`);
  lines.push(`- Content digest: \`${result.digest.slice(0, 32)}…\``);
  lines.push(`- Audited at: ${result.scannedAt}`);
  lines.push('');

  const reads = uniqueCapabilities(result.capabilities.fileReads);
  const writes = uniqueCapabilities(result.capabilities.fileWrites);
  const commands = uniqueCapabilities(result.capabilities.commands);
  const domains = uniqueCapabilities(result.capabilities.domains);
  const envVars = uniqueCapabilities(result.capabilities.envVars);

  if (result.installScripts.length > 0) {
    lines.push('## Install-time scripts');
    lines.push('');
    for (const script of result.installScripts.slice(0, REPORT_ROW_CAP)) {
      lines.push(`- \`${script.hook}\` (\`${script.file}\`): \`${script.command}\``);
    }
    if (result.installScripts.length > REPORT_ROW_CAP) {
      lines.push(`- … and ${result.installScripts.length - REPORT_ROW_CAP} more`);
    }
    lines.push('');
  } else {
    lines.push('## Install-time scripts');
    lines.push('');
    lines.push('None declared. Nothing in this package runs automatically at install time.');
    lines.push('');
  }

  lines.push('## What this plugin can reach');
  lines.push('');
  lines.push(`- **File paths read:** ${listWithOverflow(reads.map((item) => `\`${item.value}\``))}`);
  lines.push(`- **File paths written:** ${listWithOverflow(writes.map((item) => `\`${item.value}\``))}`);
  lines.push(`- **Commands spawned:** ${listWithOverflow(commands.map((item) => `\`${item.value}\``))}`);
  lines.push(`- **Domains contacted:** ${listWithOverflow(domains.map((item) => `\`${item.value}\``))}`);
  lines.push(`- **Environment variables read:** ${listWithOverflow(envVars.map((item) => `\`${item.value}\``))}`);
  lines.push('');

  lines.push('## Findings');
  lines.push('');
  if (result.findings.length === 0) {
    lines.push('No rule fired. This is evidence of absence only within what was read — a partial scan or a binary payload can still hide behavior.');
    lines.push('');
  } else {
    for (const severity of SEVERITIES) {
      const group = result.findings.filter((finding) => finding.severity === severity);
      if (group.length === 0) continue;
      lines.push(`### ${severity} (${group.length})`);
      lines.push('');
      for (const finding of group) {
        lines.push(renderFinding(finding));
      }
      lines.push('');
    }
  }

  if (result.notes.length > 0) {
    lines.push('## Scan notes');
    lines.push('');
    for (const note of result.notes.slice(0, REPORT_ROW_CAP)) lines.push(`- ${note}`);
    if (result.notes.length > REPORT_ROW_CAP) lines.push(`- … and ${result.notes.length - REPORT_ROW_CAP} more`);
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.');
  return lines.join('\n');
}

/**
 * A compact one-screen summary, for tool results and log lines.
 *
 * @param result - the scan result.
 * @returns the summary text.
 */
export function renderSummary(result: ScanResult): string {
  const name = result.manifest?.name ?? result.source.value;
  const counts = SEVERITIES.map((severity) => {
    const count = result.findings.filter((finding) => finding.severity === severity).length;
    return count === 0 ? undefined : `${count} ${severity}`;
  }).filter((value): value is string => value !== undefined);
  const lines = [
    `${name}: grade ${result.grade} (score ${result.score}/100)${result.blocked ? ' — INSTALL REFUSED' : ''}`,
    `files ${result.files.length}, findings ${result.findings.length}${counts.length > 0 ? ` (${counts.join(', ')})` : ''}`,
    `digest ${result.digest.slice(0, 16)}…`,
  ];
  const worst = result.findings.filter((finding) => finding.severity === 'critical' || finding.severity === 'high').slice(0, 5);
  for (const finding of worst) {
    lines.push(`  ${finding.severity}: ${finding.id} — ${finding.title}`);
  }
  if (result.truncated) lines.push('  (partial scan: a cap stopped the analysis early)');
  return lines.join('\n');
}

/**
 * Render a scan result as a JSON string.
 *
 * @param result - the scan result.
 * @returns pretty-printed JSON.
 */
export function renderJson(result: ScanResult): string {
  return `${JSON.stringify(result, null, 2)}\n`;
}
