/**
 * Batch stress test: audit the highest-starred plugins in the DSH marketplace.
 *
 * This exists because a rule catalog tuned against one plugin is a rule catalog
 * tuned against one plugin. Pointing the scanner at a hundred real, unrelated
 * repositories is what turns "the tests pass" into evidence, and it is how every
 * calibration bug in this project was actually found — the false positives that
 * mattered were the ones a real project happened to contain.
 *
 * ## Where the list comes from
 *
 * The marketplace publishes a baked dataset at `plugins.json` with 4000+ entries,
 * each carrying `stars`, `owner`, `url` and `category`, refreshed daily. Using it
 * is the difference between one HTTP request and a hundred: GitHub's REST API
 * allows 60 unauthenticated requests per hour, so ranking by stars through the API
 * would need a credential and would still be slower. Nothing here touches an API
 * key.
 *
 * ## How each source is fetched
 *
 * The repository archive comes from `codeload.github.com/<owner>/<repo>/tar.gz/HEAD`
 * and is handed to the scanner's own URL path, so this exercises the same code a
 * user would (`install.fetch: true`). A timeout and a retry are supplied through
 * the scanner's fetch seam rather than by changing the scanner: a hundred-job run
 * that can hang on one slow download is a run nobody finishes.
 *
 * Monorepo entries point at a subdirectory (`url` contains `/tree/`). The archive
 * is the whole repository, so such an entry is scanned as a monorepo and marked as
 * one — the subpackage boundary is not something a tarball records.
 *
 * ## What it writes
 *
 * `docs/stress/` by default: `README.md` with the aggregate picture and one
 * Markdown report per plugin. Reports are generated, not authored; re-run the
 * script rather than editing them.
 *
 * Usage:
 *   node scripts/stress-top-plugins.mjs                  # top 100 into docs/stress
 *   node scripts/stress-top-plugins.mjs --top 25
 *   node scripts/stress-top-plugins.mjs --source ./plugins.json
 *   node scripts/stress-top-plugins.mjs --concurrency 5 --out /tmp/stress
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const { auditSource } = await import('../lib/scan/engine.js');
const { renderReport, renderSummary } = await import('../lib/scan/report.js');
const { topRiskOf } = await import('../lib/scan/risk.js');
const { categoryName, severityName } = await import('../lib/i18n.js');

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_SOURCE = 'https://awesome-dsh-plugin.com/plugins.json';

/** Parsed command line. */
function parseArgs(argv) {
  const out = { top: 100, concurrency: 3, source: DEFAULT_SOURCE, out: join(REPO_ROOT, 'docs', 'stress'), timeoutMs: 90_000, maxBytes: 200 * 1024 * 1024 };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (flag === '--top') out.top = Number.parseInt(value ?? '', 10);
    else if (flag === '--concurrency') out.concurrency = Number.parseInt(value ?? '', 10);
    else if (flag === '--source') out.source = value ?? DEFAULT_SOURCE;
    else if (flag === '--out') out.out = resolve(value ?? out.out);
    else if (flag === '--timeout') out.timeoutMs = Number.parseInt(value ?? '', 10);
    else if (flag === '--max-bytes') out.maxBytes = Number.parseInt(value ?? '', 10);
    else if (flag === '--help' || flag === '-h') {
      console.log('usage: stress-top-plugins.mjs [--top N] [--concurrency N] [--source PATH|URL] [--out DIR] [--timeout MS] [--max-bytes N]');
      process.exit(0);
    } else continue;
    index += 1;
  }
  if (!Number.isInteger(out.top) || out.top < 1) out.top = 100;
  if (!Number.isInteger(out.concurrency) || out.concurrency < 1) out.concurrency = 3;
  return out;
}

/**
 * How the dataset is named in the published index.
 *
 * A run may read a local copy so a retry does not refetch 4 MB, but a committed
 * report that says `Dataset: /tmp/plugins.json` tells a reader nothing about
 * where the list came from or how to get a fresher one. The canonical origin is
 * what belongs in the report; reading a local copy is noted beside it rather
 * than in place of it.
 *
 * @param source - the `--source` value actually read.
 * @returns the label for the report.
 */
function sourceLabel(source) {
  return /^https?:/i.test(source)
    ? source
    // No backticks inside: the caller wraps this in a code span already, and
    // nested backticks end the span early and render the line as literal text.
    : `${DEFAULT_SOURCE} (本地副本 / local copy: ${source})`;
}

/** Fetch text with a timeout, from a path or a URL. */
async function readSource(source, timeoutMs) {
  if (!/^https?:/i.test(source)) {
    const { readFileSync } = await import('node:fs');
    return readFileSync(source, 'utf8');
  }
  const response = await fetch(source, { signal: AbortSignal.timeout(timeoutMs), redirect: 'follow' });
  if (!response.ok) throw new Error(`could not fetch ${source}: HTTP ${response.status}`);
  return response.text();
}

/** Owner, repository and monorepo-ness for one entry. */
function repoOf(url) {
  const match = /^https:\/\/github\.com\/([^/]+)\/([^/#?]+)/.exec(url ?? '');
  if (match === null) return undefined;
  return {
    owner: match[1],
    repo: (match[2] ?? '').replace(/\.git$/, ''),
    monorepo: String(url).includes('/tree/'),
  };
}

/**
 * The plugin's directory inside its repository, when the entry is a monorepo.
 *
 * The listing records it as `<repo>#<subdir>` and in the URL as
 * `/tree/<branch>/<subdir>`. Without scoping, a 67k-star repository is audited as
 * if the plugin were the whole thing: the same entry measured D with 24 findings
 * over 484 files unscoped, and C with 3 findings over 21 files once scoped to the
 * directory the listing actually points at.
 */
function subpathOf(entry) {
  const fromUrl = /\/tree\/[^/]+\/(.+)$/.exec(String(entry.url ?? ''));
  if (fromUrl !== null) return fromUrl[1];
  const hash = String(entry.name ?? '').indexOf('#');
  return hash === -1 ? undefined : String(entry.name).slice(hash + 1);
}

/** A filesystem-safe report name for an entry. */
function reportName(entry, repo) {
  const base = `${repo.owner}__${repo.repo}`.replace(/[^A-Za-z0-9._-]/g, '-');
  return `${base}.md`;
}

/** Rank entries by stars, then downloads, then name. */
function rank(plugins, top) {
  return [...plugins]
    .filter((entry) => typeof entry.stars === 'number' && repoOf(entry.url) !== undefined)
    .sort((left, right) =>
      (right.stars ?? 0) - (left.stars ?? 0) ||
      (right.downloads ?? 0) - (left.downloads ?? 0) ||
      String(left.name).localeCompare(String(right.name)))
    .slice(0, top);
}

/** Audit one entry, retrying once; never throws. */
async function auditEntry(entry, options, index, total) {
  const repo = repoOf(entry.url);
  const archive = `https://codeload.github.com/${repo.owner}/${repo.repo}/tar.gz/HEAD`;
  const started = Date.now();
  const subpath = subpathOf(entry);
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const result = await auditSource(archive, {
        allowFetch: true,
        maxFetchBytes: options.maxBytes,
        ...(subpath !== undefined ? { subpath } : {}),
        // A timeout through the scanner's own fetch seam, so the URL path a user
        // would take is the path this exercises.
        fetchImpl: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(options.timeoutMs) }),
        now: () => new Date(),
      });
      const seconds = ((Date.now() - started) / 1000).toFixed(1);
      console.log(
        `  [${String(index).padStart(3)}/${total}] ${String(entry.stars).padStart(5)}★  ${String(result.grade).padEnd(2)} ` +
        `${String(result.score).padStart(3)}/100  ${String(result.findings.length).padStart(3)} findings  ${seconds}s  ${entry.name}`,
      );
      return { entry, repo, archive, result, seconds, subpath };
    } catch (error) {
      lastError = error;
      // A missing subdirectory is deterministic; retrying only doubles the wait.
      if (attempt === 1 && !String(error?.message ?? '').startsWith('no files under')) {
        await new Promise((resume) => setTimeout(resume, 1500));
      }
    }
  }
  console.log(`  [${String(index).padStart(3)}/${total}] ${String(entry.stars).padStart(5)}★  --  SKIPPED  ${entry.name}: ${lastError?.message ?? lastError}`);
  return { entry, repo, archive, subpath, error: String(lastError?.message ?? lastError) };
}

/** Run `worker` over `items` with bounded concurrency, preserving order. */
async function pool(items, concurrency, worker) {
  const results = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index + 1);
    }
  });
  await Promise.all(runners);
  return results;
}

/** Aggregate counts of graded results. */
function aggregate(done) {
  const graded = done.filter((item) => item.result !== undefined);
  const grades = { A: 0, B: 0, C: 0, D: 0 };
  const rules = new Map();
  const categories = new Map();
  for (const item of graded) {
    grades[item.result.grade] += 1;
    for (const finding of item.result.findings) {
      rules.set(finding.id, (rules.get(finding.id) ?? 0) + 1);
      categories.set(finding.category, (categories.get(finding.category) ?? 0) + 1);
    }
  }
  const scores = graded.map((item) => item.result.score);
  return {
    graded: graded.length,
    skipped: done.length - graded.length,
    grades,
    rules: [...rules.entries()].sort((left, right) => right[1] - left[1]),
    categories: [...categories.entries()].sort((left, right) => right[1] - left[1]),
    meanScore: scores.length === 0 ? 0 : Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length),
    truncated: graded.filter((item) => item.result.truncated).length,
    totalFindings: graded.reduce((sum, item) => sum + item.result.findings.length, 0),
  };
}

/** Render the aggregate index. */
function renderIndex(done, stats, options, dataset) {
  const lines = [];
  const when = new Date().toISOString().slice(0, 10);
  lines.push('# 批量压测 / Batch stress test — top plugins by stars');
  lines.push('');
  lines.push(
    `对 DSH 插件市场中 **按 stars 排名前 ${done.length}** 的插件做全量安装前体检，每个插件取 GitHub 的 \`tar.gz/HEAD\` 源码包。` +
    ` / Full pre-install audit of the **top ${done.length} plugins by stars** in the DSH marketplace, each fetched as a GitHub \`tar.gz/HEAD\` source archive.`,
  );
  lines.push('');
  lines.push(`- 数据集 / Dataset: \`${sourceLabel(options.source)}\`${dataset?.updated !== undefined ? ` (updated ${dataset.updated})` : ''}`);
  lines.push(`- 运行时间 / Run at: ${when}`);
  lines.push(`- 体检成功 / Audited: **${stats.graded}**${stats.skipped > 0 ? ` · 跳过 / skipped: ${stats.skipped}` : ''}`);
  lines.push(`- 平均分 / Mean score: **${stats.meanScore}/100**`);
  lines.push('');
  lines.push('> 结论、标定过程与仍然存在的问题见 [`CALIBRATION.md`](./CALIBRATION.md)（手写，不被本脚本覆盖）。 /');
  lines.push('> What this run found, what was fixed, and what is still wrong: [`CALIBRATION.md`](./CALIBRATION.md) — authored, never overwritten by this script.');
  lines.push('');
  lines.push('## 评级分布 / Grade distribution');
  lines.push('');
  lines.push('| 评级 Grade | 数量 Count | 占比 Share |');
  lines.push('| --- | ---: | ---: |');
  for (const grade of ['A', 'B', 'C', 'D']) {
    const count = stats.grades[grade];
    const share = stats.graded === 0 ? 0 : Math.round((count / stats.graded) * 100);
    lines.push(`| ${grade} | ${count} | ${share}% |`);
  }
  lines.push('');
  const pct = (count) => (stats.graded === 0 ? '0%' : `${Math.round((count / stats.graded) * 100)}%`);
  lines.push(
    `其中 **D 级（拒绝安装）${stats.grades.D} 个（${pct(stats.grades.D)}）**` +
    `${stats.truncated > 0 ? `，另有 ${stats.truncated} 个因大小/文件数上限只完成部分扫描` : ''}。` +
    ` / **${stats.grades.D} refused (${pct(stats.grades.D)})**${stats.truncated > 0 ? `, ${stats.truncated} partially scanned` : ''}.`,
  );
  lines.push('');
  lines.push('## 结果 / Results');
  lines.push('');
  lines.push('| # | 插件 Plugin | ★ | 评级 | 分数 | 发现 | 最严重的风险 / Most severe risk | 报告 |');
  lines.push('| ---: | --- | ---: | :---: | ---: | ---: | --- | --- |');
  done.forEach((item, index) => {
    const rank = index + 1;
    const link = `[${item.entry.name}](${encodeURI(item.entry.url)})`;
    if (item.result === undefined) {
      lines.push(`| ${rank} | ${link} | ${item.entry.stars} | — | — | — | *无法获取 / unavailable: ${item.error}* | — |`);
      return;
    }
    const risk = topRiskOf(item.result);
    const riskText = risk === undefined ? '—' : `${risk.title} \`${risk.finding.id}\``;
    lines.push(
      `| ${rank} | ${link} | ${item.entry.stars} | **${item.result.grade}** | ${item.result.score} | ${item.result.findings.length} | ${riskText} | [\`${item.file}\`](./${item.file}) |`,
    );
  });
  lines.push('');
  lines.push('## 最常触发的规则 / Most frequently fired rules');
  lines.push('');
  lines.push('| 规则 Rule | 命中次数 Hits | 类别 Category |');
  lines.push('| --- | ---: | --- |');
  for (const [id, count] of stats.rules.slice(0, 25)) {
    const category = id.split('.')[0] ?? '';
    lines.push(`| \`${id}\` | ${count} | ${categoryName('bilingual', category)} |`);
  }
  lines.push('');
  lines.push('## 类别分布 / Findings by category');
  lines.push('');
  lines.push('| 类别 Category | 命中次数 Hits |');
  lines.push('| --- | ---: |');
  for (const [category, count] of stats.categories.slice(0, 20)) {
    lines.push(`| ${categoryName('bilingual', category)} | ${count} |`);
  }
  lines.push('');
  lines.push('## 方法 / Method');
  lines.push('');
  lines.push('- 名单来自市场数据集 `plugins.json`（每日刷新），**只用一次 HTTP 请求**拿到 stars——GitHub 未认证 API 每小时只有 60 次，按仓库逐个查星数会超限，也不会更快。');
  lines.push('- 源码包取 `codeload.github.com/<owner>/<repo>/tar.gz/HEAD`，走扫描器自身的 URL 路径（等同 `install.fetch: true`），带超时与一次重试。');
  lines.push('- 单体仓库条目（列表里写作 `<repo>#<subdir>`）**只扫描该子目录**并剥掉前缀。不这样做会把整个仓库当成插件来判：同一条目未限定范围时是 484 个文件 → D(24 条)，限定到列表真正指向的目录后是 21 个文件 → C(3 条)。');
  lines.push('- 体检不执行任何代码，也不写入磁盘。');
  lines.push('');
  lines.push('### 这份报告能说明什么 / What this does and does not show');
  lines.push('');
  lines.push('说明：这套规则在真实、互不相关的代码上是可跑通的，且能给出可读的分级与证据。');
  lines.push('不说明：D 级等于恶意。规则命中是**需要人看一眼的问题**，不是判决；这里的 D 级里既有真实的凭据外传形态，也有插件自带的签名表、打包产物和构建脚本。');
  lines.push('');
  lines.push('> A `D` here is not an accusation. It means a rule fired that a human should read — the catalog is calibrated to be read, not to be believed.');
  lines.push('');
  return lines.join('\n');
}

/** Entry point. */
async function main() {
  const options = parseArgs(process.argv.slice(2));
  console.log(`source      : ${options.source}`);
  const raw = await readSource(options.source, options.timeoutMs);
  const dataset = JSON.parse(raw);
  const plugins = Array.isArray(dataset) ? dataset : (dataset.plugins ?? []);
  const entries = rank(plugins, options.top);
  console.log(`plugins     : ${plugins.length} in dataset, auditing top ${entries.length} by stars`);
  console.log(`output      : ${options.out}`);
  console.log('');

  const done = await pool(entries, options.concurrency, (entry, index) => auditEntry(entry, options, index, entries.length));

  mkdirSync(options.out, { recursive: true });
  for (const item of done) {
    if (item.result === undefined) continue;
    item.file = reportName(item.entry, item.repo);
    const header = [
      `> 批量压测 / Batch stress test · ★ ${item.entry.stars} · \`${item.repo.owner}/${item.repo.repo}${item.subpath !== undefined ? `#${item.subpath}` : ''}\``,
      `> ${item.entry.url} · audited in ${item.seconds}s`,
      '',
    ].join('\n');
    writeFileSync(join(options.out, item.file), `${header}${renderReport(item.result)}\n`, 'utf8');
  }

  const stats = aggregate(done);
  writeFileSync(join(options.out, 'README.md'), renderIndex(done, stats, options, dataset), 'utf8');

  console.log('');
  console.log('=== 汇总 / Summary ===');
  console.log(`  audited ${stats.graded}/${done.length}  mean score ${stats.meanScore}/100  findings ${stats.totalFindings}`);
  console.log(`  grades  A ${stats.grades.A}  B ${stats.grades.B}  C ${stats.grades.C}  D ${stats.grades.D}`);
  if (stats.skipped > 0) console.log(`  skipped ${stats.skipped}`);
  console.log('  top rules:');
  for (const [id, count] of stats.rules.slice(0, 8)) console.log(`    ${String(count).padStart(4)}× ${id}`);
  console.log('');
  console.log(`index   : ${join(options.out, 'README.md')}`);
  const worst = done.filter((item) => item.result?.grade === 'D').slice(0, 3);
  for (const item of worst) {
    console.log(`  D sample: ${renderSummary(item.result, 'bilingual').split('\n')[0]}`);
  }
}

await main();
