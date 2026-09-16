/**
 * Utilities: canonical JSON, redaction, obfuscated-address resolution, and the
 * canonicalization that the guard's rules depend on.
 *
 * These are the pieces every other layer stands on, so they are tested directly
 * rather than only through the layers that use them.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { canonicalJson } from '../lib/util/json.js';
import {
  isExfilHost,
  isInternalHostname,
  isPrivateAddressLiteral,
  isPrivateIPv4,
  isPrivateIPv6,
  normalizeIPv4,
} from '../lib/util/patterns.js';
import { normalizePath, parseUrlParts, shellText, shellViews } from '../lib/util/normalize.js';
import { clip, redact, shannonEntropy } from '../lib/util/text.js';

test('canonicalJson sorts keys and omits whitespace', () => {
  assert.equal(canonicalJson({ b: 1, a: 2 }), '{"a":2,"b":1}');
  assert.equal(canonicalJson({ a: { d: 1, c: [3, 2] } }), '{"a":{"c":[3,2],"d":1}}');
  assert.equal(canonicalJson({ a: undefined, b: 1 }), '{"b":1}');
});

test('canonicalJson is stable regardless of insertion order', () => {
  const left = canonicalJson({ z: 1, a: { y: 2, b: 3 } });
  const right = canonicalJson({ a: { b: 3, y: 2 }, z: 1 });
  assert.equal(left, right);
});

test('canonicalJson refuses values JSON cannot represent', () => {
  assert.throws(() => canonicalJson({ a: Number.NaN }), /non-finite/);
  assert.throws(() => canonicalJson({ a: Number.POSITIVE_INFINITY }), /non-finite/);
});

test('redact removes secret material by shape', () => {
  const cases = [
    ['key sk-ant-api03-AbCdEfGhIjKlMnOpQrStUvWx here', 'sk-ant-api03-AbCdEfGhIjKlMnOpQrStUvWx'],
    ['token ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij', 'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij'],
    ['aws AKIAIOSFODNN7EXAMPLE next', 'AKIAIOSFODNN7EXAMPLE'],
    // A real Google key is `AIza` plus exactly 35 characters.
    ['google AIzaSyA1234567890abcdefghijklmnopqrstuv', 'AIzaSyA1234567890abcdefghijklmnopqrstuv'],
  ];
  for (const [input, secret] of cases) {
    const out = redact(input);
    assert.ok(!out.includes(secret), `expected ${secret} to be redacted, got ${out}`);
    assert.ok(out.includes('redacted'), `expected a redaction marker in ${out}`);
  }
});

test('redact keeps a private key block from being re-emitted', () => {
  const body = 'MIIEowIBAAKCAQEA'.repeat(4);
  const pem = `-----BEGIN RSA PRIVATE KEY-----\n${body}\n-----END RSA PRIVATE KEY-----`;
  const out = redact(pem);
  assert.ok(!out.includes(body), 'key body must not survive redaction');
  assert.ok(out.includes('BEGIN PRIVATE KEY'), 'the marker should say what was removed');
});

test('clip collapses whitespace and bounds length', () => {
  assert.equal(clip('a\n\n  b\tc'), 'a b c');
  assert.equal(clip('abcdef', 3), 'abc…');
});

test('shannonEntropy separates repetitive text from random text', () => {
  assert.ok(shannonEntropy('aaaaaaaaaaaaaaaa') < 1);
  assert.ok(shannonEntropy('aB3$xY9!qW2#eR5%') > 3);
});

test('normalizeIPv4 resolves every obfuscated spelling of loopback', () => {
  for (const spelling of ['127.0.0.1', '127.1', '2130706433', '0x7f000001', '0x7f.0.0.1', '0177.0.0.1']) {
    assert.equal(normalizeIPv4(spelling), '127.0.0.1', `spelling ${spelling}`);
  }
});

test('normalizeIPv4 rejects non-addresses', () => {
  assert.equal(normalizeIPv4('999.1.1.1'), undefined);
  assert.equal(normalizeIPv4('hello'), undefined);
  assert.equal(normalizeIPv4('1.2.3.4.5'), undefined);
});

test('private address classification covers the special-use ranges', () => {
  for (const address of ['10.0.0.1', '172.16.5.4', '172.31.255.255', '192.168.1.1', '169.254.169.254', '127.0.0.1', '100.64.0.1', '0.0.0.0', '198.18.0.1', '224.0.0.1']) {
    assert.equal(isPrivateIPv4(address), true, address);
  }
  for (const address of ['8.8.8.8', '1.1.1.1', '172.32.0.1', '192.169.0.1', '11.0.0.1']) {
    assert.equal(isPrivateIPv4(address), false, address);
  }
});

test('IPv6 classification covers loopback, ULA and link-local', () => {
  assert.equal(isPrivateIPv6('::1'), true);
  assert.equal(isPrivateIPv6('fd00:ec2::254'), true);
  assert.equal(isPrivateIPv6('fe80::1'), true);
  assert.equal(isPrivateIPv6('::ffff:127.0.0.1'), true);
  assert.equal(isPrivateIPv6('2606:4700:4700::1111'), false);
});

test('address literals are classified through their obfuscated spelling', () => {
  assert.equal(isPrivateAddressLiteral('[::1]'), true);
  assert.equal(isPrivateAddressLiteral('2130706433'), true);
  assert.equal(isPrivateAddressLiteral('8.8.8.8'), false);
});

test('internal hostnames and exfiltration hosts are recognized', () => {
  assert.equal(isInternalHostname('metadata.google.internal'), true);
  assert.equal(isInternalHostname('db.svc.cluster.local'), true);
  assert.equal(isInternalHostname('localhost'), true);
  assert.equal(isInternalHostname('example.com'), false);
  assert.equal(isExfilHost('abc123.webhook.site'), true);
  assert.equal(isExfilHost('webhook.site'), true);
  assert.equal(isExfilHost('notwebhook.site.evil.com'), false);
});

test('normalizePath collapses dot segments', () => {
  assert.equal(normalizePath('/etc/./shadow'), '/etc/shadow');
  assert.equal(normalizePath('/home/u/../u/.ssh/id_rsa'), '/home/u/.ssh/id_rsa');
});

test('shellViews defeats the standard obfuscation tricks', () => {
  const spellings = [
    'rm -rf /',
    'rm${IFS}-rf${IFS}/',
    '"rm" "-rf" "/"',
    "rm '-rf' '/'",
    'r\\m -rf /',
    'rm\u00a0-rf\u00a0/',
  ];
  for (const spelling of spellings) {
    const text = shellText(spelling);
    assert.ok(text.includes('rm -rf /') || text.includes('rm -rf / '.trim()), `view set for ${JSON.stringify(spelling)} was ${JSON.stringify(text)}`);
  }
});

test('shellViews unwraps a base64 payload', () => {
  const payload = 'rm -rf /important';
  const encoded = Buffer.from(payload, 'utf8').toString('base64');
  const command = `echo ${encoded} | base64 -d | sh`;
  assert.ok(shellText(command).includes(payload), 'the decoded payload must appear in the view set');
});

test('shellViews unwraps hex escapes and hex-encoded payloads', () => {
  assert.ok(shellText('\\x72\\x6d -rf /').includes('rm -rf /'));
  const hex = Buffer.from('curl 169.254.169.254', 'utf8').toString('hex');
  assert.ok(shellText(`echo ${hex} | xxd -r -p | sh`).includes('curl 169.254.169.254'));
});

test('shellViews always keeps the raw text as the first view', () => {
  const views = shellViews('rm -rf /');
  assert.equal(views[0].label, 'raw');
  assert.equal(views[0].text, 'rm -rf /');
});

test('parseUrlParts de-obfuscates the host', () => {
  assert.equal(parseUrlParts('http://2130706433/admin')?.normalizedHost, '127.0.0.1');
  assert.equal(parseUrlParts('http://0x7f.0.0.1:8080/x')?.normalizedHost, '127.0.0.1');
  assert.equal(parseUrlParts('https://user:pw@example.com:8443/p')?.hasUserinfo, true);
  assert.equal(parseUrlParts('https://[::1]:9200/')?.normalizedHost, '::1');
  assert.equal(parseUrlParts('not a url'), undefined);
});

test('parseUrlParts reads the port only when it is numeric', () => {
  assert.equal(parseUrlParts('http://example.com:80/')?.port, 80);
  assert.equal(parseUrlParts('http://example.com/path')?.port, undefined);
});
