/**
 * Rendering a scan result for a human or a model.
 *
 * Two shapes, one source of truth. The Markdown form is what a person reads and
 * what the model sees; the JSON form is what another tool consumes. Both come
 * from the same `ScanResult`, so the two can never disagree about the grade.
 *
 * **Language.** The Markdown report is localized by `report.locale`, defaulting
 * to bilingual. Short fields join with ` / ` and long prose gets a labelled line
 * per language, because two sentences of explanation joined by a slash is a wall
 * rather than a paragraph. The JSON form stays English: its field names are the
 * audit log's vocabulary, and a log whose keys depend on a config value is a log
 * nobody can grep.
 *
 * Rule text comes from `rules.zh.ts` keyed by rule id, and falls back to the
 * English original when a rule has not been translated yet — a rule added between
 * translation passes still renders.
 *
 * The capability inventory is placed before the findings on purpose. "This plugin
 * reads these eleven paths and calls these three hosts" is answerable without
 * judgement, and it is what lets a reader disagree with the scanner's grade
 * rather than merely receive it.
 *
 * @module dsh-security-scan/scan/report
 */

import type { Capability, Finding, ScanResult, Severity } from '../types.js';
import { type Locale, categoryName, severityName, t, zhFor } from '../i18n.js';
import { SCAN_RULE_TEXT_ZH } from './rules.zh.js';

/** Cap on rows printed per capability kind and per finding. */
export const REPORT_ROW_CAP = 12;

/** The default locale, matching `DEFAULT_CONFIG.report.locale`. */
export const DEFAULT_LOCALE: Locale = 'bilingual';

/** One-line summary of a grade, used in headers and tool results. */
export const GRADE_SUMMARY: Readonly<Record<ScanResult['grade'], { en: string; zh: string }>> = {
  A: { en: 'no meaningful risk signals', zh: '没有值得注意的风险信号' },
  B: { en: 'minor signals, review recommended', zh: '有轻微信号，建议复核' },
  C: { en: 'notable risk signals, install only with intent', zh: '有值得注意的风险信号，确认后再安装' },
  D: { en: 'refused: critical risk signals', zh: '拒绝：存在严重风险信号' },
};

/** Source kinds. */
const SOURCE_KIND: Readonly<Record<string, { en: string; zh: string }>> = {
  directory: { en: 'directory', zh: '目录' },
  tarball: { en: 'tarball', zh: '压缩包' },
  url: { en: 'url', zh: 'URL' },
  installed: { en: 'installed package', zh: '已安装的包' },
};

/** Render a byte count for humans. */
function bytes(count: number): string {
  if (count < 1024) return `${count} B`;
  if (count < 1024 * 1024) return `${(count / 1024).toFixed(1)} KiB`;
  return `${(count / (1024 * 1024)).toFixed(1)} MiB`;
}

/** 'a, b, c' with an overflow marker rather than a truncated silent list. */
function listWithOverflow(locale: Locale, values: readonly string[], cap = REPORT_ROW_CAP): string {
  if (values.length === 0) return t(locale, '(none)', '（无）');
  if (values.length <= cap) return values.join(', ');
  const more = values.length - cap;
  return `${values.slice(0, cap).join(', ')} ${t(locale, `(+${more} more)`, `（另有 ${more} 项）`)}`;
}

/**
 * A long localized field as labelled lines.
 *
 * @param locale - the configured locale.
 * @param en - the English text.
 * @param zh - the Chinese text.
 * @param indent - prefix for each line.
 * @returns the field, possibly spanning two lines.
 */
function dual(locale: Locale, en: string, zh: string, indent = '  '): string {
  if (locale === 'en') return `${indent}${en}`;
  if (locale === 'zh') return `${indent}${zh}`;
  return `${indent}中 ${zh}\n${indent}EN ${en}`;
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

/** The localized text of one finding, falling back to English. */
function localizedFinding(finding: Finding): { title: string; detail: string; remediation: string; zh: boolean } {
  const zh = zhFor(SCAN_RULE_TEXT_ZH, finding.id);
  return zh === undefined
    ? { title: finding.title, detail: finding.detail, remediation: finding.remediation, zh: false }
    : { title: zh.title, detail: zh.detail, remediation: zh.remediation, zh: true };
}

/** Render one finding as a Markdown block. */
function renderFinding(finding: Finding, locale: Locale): string {
  const text = localizedFinding(finding);
  const lines: string[] = [];
  const severity = severityName(locale, finding.severity);
  const title = text.zh ? t(locale, finding.title, text.title) : finding.title;
  lines.push(`- **${severity}** \`${finding.id}\` — ${title}`);
  lines.push(
    text.zh
      ? dual(locale, finding.detail, text.detail)
      : `  ${finding.detail}`,
  );
  const shown = finding.evidence.slice(0, 4);
  for (const item of shown) {
    lines.push(`  - \`${item.file}${item.line > 0 ? `:${item.line}` : ''}\` — \`${item.snippet}\``);
  }
  if (finding.evidence.length > shown.length) {
    const more = finding.evidence.length - shown.length;
    lines.push(`  - ${t(locale, `… and ${more} more location(s)`, `……另有 ${more} 处`)}`);
  }
  if (text.zh) {
    lines.push(dual(locale, `Fix: ${finding.remediation}`, `修复：${text.remediation}`));
  } else {
    lines.push(`  _Remediation:_ ${finding.remediation}`);
  }
  return lines.join('\n');
}

/**
 * Render a scan result as Markdown.
 *
 * @param result - the scan result.
 * @param locale - how much language to emit; defaults to bilingual.
 * @returns the report text.
 */
export function renderReport(result: ScanResult, locale: Locale = DEFAULT_LOCALE): string {
  const lines: string[] = [];
  const name = result.manifest?.name ?? result.source.value;
  const version = result.manifest?.version;
  const label = `${name}${version !== undefined ? `@${version}` : ''}`;

  // The label is bilingual; the value appears once. Repeating a package name and
  // a score in both languages doubles the line without adding information, which
  // is the difference between a bilingual report and a twice-as-long one.
  lines.push(`# ${t(locale, 'Pre-install audit', '安装前体检')}: ${label}`);
  lines.push('');
  const grade = GRADE_SUMMARY[result.grade];
  lines.push(
    `**${t(locale, 'Trust grade', '信任评级')}: ${result.grade}** (${t(locale, 'score', '评分')} ${result.score}/100 — ${t(locale, grade.en, grade.zh)})`,
  );
  if (result.blocked) {
    lines.push('');
    lines.push(
      `> ${t(
        locale,
        '**Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.',
        '**拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。',
      )}`,
    );
  }
  if (result.truncated) {
    lines.push('');
    lines.push(
      `> ${t(
        locale,
        '**Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.',
        '**部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。',
      )}`,
    );
  }
  lines.push('');
  const kind = SOURCE_KIND[result.source.kind];
  lines.push(`- ${t(locale, 'Source', '来源')}: \`${result.source.value}\` (${kind === undefined ? result.source.kind : t(locale, kind.en, kind.zh)})`);
  if (result.source.profile !== undefined) {
    lines.push(`- ${t(locale, 'Profile', 'Profile')}: \`${result.source.profile}\``);
  }
  const totalBytes = result.files.reduce((total, file) => total + file.bytes, 0);
  lines.push(`- ${t(locale, `Files analysed: ${result.files.length} (${bytes(totalBytes)})`, `已分析文件：${result.files.length} 个（${bytes(totalBytes)}）`)}`);
  lines.push(`- ${t(locale, 'Content digest', '内容摘要')}: \`${result.digest.slice(0, 32)}…\``);
  lines.push(`- ${t(locale, 'Audited at', '体检时间')}: ${result.scannedAt}`);
  lines.push('');

  const reads = uniqueCapabilities(result.capabilities.fileReads);
  const writes = uniqueCapabilities(result.capabilities.fileWrites);
  const commands = uniqueCapabilities(result.capabilities.commands);
  const domains = uniqueCapabilities(result.capabilities.domains);
  const envVars = uniqueCapabilities(result.capabilities.envVars);

  const installTime = result.installScripts.filter((script) => script.installTime);
  const publishTime = result.installScripts.filter((script) => !script.installTime);

  lines.push(`## ${t(locale, 'Install-time scripts', '安装期脚本')}`);
  lines.push('');
  if (installTime.length === 0) {
    lines.push(t(locale, 'None declared. Nothing in this package runs automatically on the machine that installs it.', '未声明。该包不会在安装它的机器上自动执行任何东西。'));
  } else {
    for (const script of installTime.slice(0, REPORT_ROW_CAP)) {
      lines.push(`- \`${script.hook}\` (\`${script.file}\`): \`${script.command}\``);
    }
    if (installTime.length > REPORT_ROW_CAP) {
      const more = installTime.length - REPORT_ROW_CAP;
      lines.push(`- ${t(locale, `… and ${more} more`, `……另有 ${more} 项`)}`);
    }
  }
  lines.push('');
  if (publishTime.length > 0) {
    // Listed separately because it is a different risk: these run in the
    // maintainer's checkout when packing or publishing, never on a user's machine.
    lines.push(t(locale, 'Publish-time hooks (run when the maintainer packs or publishes, not on install):', '发布期钩子（维护者打包或发布时运行，安装时不会执行）：'));
    lines.push('');
    for (const script of publishTime.slice(0, REPORT_ROW_CAP)) {
      lines.push(`- \`${script.hook}\`: \`${script.command}\``);
    }
    lines.push('');
  }

  lines.push(`## ${t(locale, 'What this plugin can reach', '该插件能触及什么')}`);
  lines.push('');
  const rows: [string, string, Capability[]][] = [
    ['File paths read', '读取的文件路径', reads],
    ['File paths written', '写入的文件路径', writes],
    ['Commands spawned', '派生的命令', commands],
    ['Domains contacted', '连接的域名', domains],
    ['Environment variables read', '读取的环境变量', envVars],
  ];
  for (const [en, zh, items] of rows) {
    lines.push(`- **${t(locale, en, zh)}:** ${listWithOverflow(locale, items.map((item) => `\`${item.value}\``))}`);
  }
  lines.push('');

  lines.push(`## ${t(locale, 'Findings', '发现')}`);
  lines.push('');
  if (result.findings.length === 0) {
    lines.push(
      t(
        locale,
        'No rule fired. This is evidence of absence only within what was read — a partial scan or a binary payload can still hide behavior.',
        '没有任何规则命中。这只说明「在已读取的内容里没有发现」，部分扫描或二进制载荷仍可能藏有行为。',
      ),
    );
    lines.push('');
  } else {
    for (const severity of SEVERITIES) {
      const group = result.findings.filter((finding) => finding.severity === severity);
      if (group.length === 0) continue;
      lines.push(`### ${severityName(locale, severity)} (${group.length})`);
      lines.push('');
      for (const finding of group) {
        lines.push(renderFinding(finding, locale));
      }
      lines.push('');
    }
    const byCategory = new Map<string, number>();
    for (const finding of result.findings) byCategory.set(finding.category, (byCategory.get(finding.category) ?? 0) + 1);
    if (byCategory.size > 1) {
      const summary = [...byCategory.entries()]
        .sort((left, right) => right[1] - left[1])
        .map(([category, count]) => `${categoryName(locale, category)} ${count}`)
        .join(' · ');
      lines.push(`_${t(locale, 'By category', '按类别')}:_ ${summary}`);
      lines.push('');
    }
  }

  if (result.notes.length > 0) {
    lines.push(`## ${t(locale, 'Scan notes', '扫描说明')}`);
    lines.push('');
    for (const note of result.notes.slice(0, REPORT_ROW_CAP)) lines.push(`- ${note}`);
    if (result.notes.length > REPORT_ROW_CAP) {
      const more = result.notes.length - REPORT_ROW_CAP;
      lines.push(`- ${t(locale, `… and ${more} more`, `……另有 ${more} 项`)}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push(
    t(
      locale,
      'A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.',
      '高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。',
    ),
  );
  return lines.join('\n');
}

/**
 * A compact one-screen summary, for tool results and log lines.
 *
 * @param result - the scan result.
 * @param locale - how much language to emit; defaults to bilingual.
 * @returns the summary text.
 */
export function renderSummary(result: ScanResult, locale: Locale = DEFAULT_LOCALE): string {
  const name = result.manifest?.name ?? result.source.value;
  const counts = SEVERITIES.map((severity) => {
    const count = result.findings.filter((finding) => finding.severity === severity).length;
    return count === 0 ? undefined : `${count} ${severityName(locale, severity)}`;
  }).filter((value): value is string => value !== undefined);
  const grade = GRADE_SUMMARY[result.grade];
  // Labels are bilingual, values appear once — the same rule the full report
  // follows, so the two read consistently.
  const lines = [
    `${name}: ${t(locale, 'grade', '评级')} ${result.grade} (${t(locale, 'score', '评分')} ${result.score}/100)${result.blocked ? ` — ${t(locale, 'INSTALL REFUSED', '拒绝安装')}` : ''}`,
    `${t(locale, 'files', '文件')} ${result.files.length}, ${t(locale, 'findings', '发现')} ${result.findings.length}${counts.length > 0 ? ` (${counts.join(', ')})` : ''}`,
    `${t(locale, 'digest', '摘要')} ${result.digest.slice(0, 16)}…`,
    t(locale, grade.en, grade.zh),
  ];
  const worst = result.findings
    .filter((finding) => finding.severity === 'critical' || finding.severity === 'high')
    .slice(0, 5);
  for (const finding of worst) {
    const text = localizedFinding(finding);
    lines.push(`  ${severityName(locale, finding.severity)}: ${finding.id} — ${text.zh ? t(locale, finding.title, text.title) : finding.title}`);
  }
  if (result.truncated) {
    lines.push(`  ${t(locale, '(partial scan: a cap stopped the analysis early)', '（部分扫描：有上限使分析提前结束）')}`);
  }
  return lines.join('\n');
}

/**
 * Render a scan result as a JSON string.
 *
 * Always English: these field names are the audit log's vocabulary, and a log
 * whose keys change with a config value cannot be grepped.
 *
 * @param result - the scan result.
 * @returns pretty-printed JSON.
 */
export function renderJson(result: ScanResult): string {
  return `${JSON.stringify(result, null, 2)}\n`;
}
