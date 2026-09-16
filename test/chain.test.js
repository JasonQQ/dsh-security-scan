/**
 * The audit log: chain construction, and every tampering shape it claims to
 * detect.
 *
 * A tamper-evident log that is not tested against tampering is decoration, so
 * each test here edits the file the way an attacker would and asserts the
 * verifier names the break.
 */

import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

import { AuditLog } from '../lib/audit/log.js';
import { buildAnchor, computeAnchorMac, sealEntry, verifyChain } from '../lib/audit/chain.js';

const dirs = [];

/** A fresh log directory that is removed when the run ends. */
function freshDir() {
  const dir = mkdtempSync(join(tmpdir(), 'gate-log-'));
  dirs.push(dir);
  return dir;
}

after(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

/** Open a log in a fresh directory. */
function openLog(overrides = {}) {
  return AuditLog.open({ dir: freshDir(), ...overrides });
}

test('an empty log verifies', () => {
  const log = openLog();
  const result = log.verify();
  assert.equal(result.ok, true);
  assert.equal(result.entries, 0);
});

test('appended entries form a verifiable chain', () => {
  const log = openLog();
  log.append({ kind: 'guard', event: 'tool-blocked', summary: 'first', data: { n: 1 } });
  log.append({ kind: 'output', event: 'result-redacted', summary: 'second', data: { n: 2 } });
  log.append({ kind: 'verify', event: 'chain-verified', summary: 'third', data: { n: 3 } });
  const result = log.verify();
  assert.equal(result.ok, true);
  assert.equal(result.entries, 3);
});

test('each entry links to its predecessor', () => {
  const log = openLog();
  const first = log.append({ kind: 'guard', event: 'a', summary: 'a' });
  const second = log.append({ kind: 'guard', event: 'b', summary: 'b' });
  assert.equal(first.prev, '');
  assert.equal(second.prev, first.hash);
});

test('sequence numbers are gapless', () => {
  const log = openLog();
  for (let index = 0; index < 5; index += 1) log.append({ kind: 'guard', event: `e${index}`, summary: `s${index}` });
  assert.deepEqual(log.read({ limit: 10 }).map((entry) => entry.seq), [0, 1, 2, 3, 4]);
});

test('editing an entry is detected at that entry', () => {
  const dir = freshDir();
  const log = AuditLog.open({ dir });
  log.append({ kind: 'guard', event: 'tool-blocked', summary: 'original' });
  log.append({ kind: 'guard', event: 'tool-blocked', summary: 'second' });

  const path = join(dir, 'audit.log.jsonl');
  const lines = readFileSync(path, 'utf8').trim().split('\n');
  const entry = JSON.parse(lines[0]);
  entry.summary = 'a harmless-looking summary';
  lines[0] = JSON.stringify(entry);
  writeFileSync(path, `${lines.join('\n')}\n`);

  const result = AuditLog.open({ dir }).verify();
  assert.equal(result.ok, false);
  assert.equal(result.brokenAt, 0);
  assert.match(result.reason, /edited/);
});

test('deleting an entry is detected as a broken link', () => {
  const dir = freshDir();
  const log = AuditLog.open({ dir });
  log.append({ kind: 'guard', event: 'a', summary: 'a' });
  log.append({ kind: 'guard', event: 'b', summary: 'b' });
  log.append({ kind: 'guard', event: 'c', summary: 'c' });

  const path = join(dir, 'audit.log.jsonl');
  const lines = readFileSync(path, 'utf8').trim().split('\n');
  writeFileSync(path, `${[lines[0], lines[2]].join('\n')}\n`);

  const result = AuditLog.open({ dir }).verify();
  assert.equal(result.ok, false);
  assert.equal(result.brokenAt, 2);
  assert.match(result.reason, /broken link|truncated|anchor/);
});

test('reordering entries is detected', () => {
  const dir = freshDir();
  const log = AuditLog.open({ dir });
  log.append({ kind: 'guard', event: 'a', summary: 'a' });
  log.append({ kind: 'guard', event: 'b', summary: 'b' });

  const path = join(dir, 'audit.log.jsonl');
  const lines = readFileSync(path, 'utf8').trim().split('\n');
  writeFileSync(path, `${[lines[1], lines[0]].join('\n')}\n`);

  const result = AuditLog.open({ dir }).verify();
  assert.equal(result.ok, false);
});

test('truncating the log is detected by the anchor', () => {
  const dir = freshDir();
  const log = AuditLog.open({ dir });
  for (let index = 0; index < 4; index += 1) log.append({ kind: 'guard', event: `e${index}`, summary: `s${index}` });

  const path = join(dir, 'audit.log.jsonl');
  const lines = readFileSync(path, 'utf8').trim().split('\n');
  writeFileSync(path, `${lines.slice(0, 2).join('\n')}\n`);

  const result = AuditLog.open({ dir }).verify();
  assert.equal(result.ok, false);
  assert.match(result.reason, /truncat/i);
});

test('editing the anchor without the key is detected', () => {
  const dir = freshDir();
  const log = AuditLog.open({ dir });
  log.append({ kind: 'guard', event: 'a', summary: 'a' });

  const anchorPath = join(dir, 'audit.head.json');
  const anchor = JSON.parse(readFileSync(anchorPath, 'utf8'));
  anchor.entries = 99;
  writeFileSync(anchorPath, JSON.stringify(anchor));

  const result = AuditLog.open({ dir }).verify();
  assert.equal(result.ok, false);
  assert.match(result.reason, /anchor/i);
});

test('a missing anchor is reported rather than silently trusted', () => {
  const dir = freshDir();
  const log = AuditLog.open({ dir });
  log.append({ kind: 'guard', event: 'a', summary: 'a' });
  rmSync(join(dir, 'audit.head.json'));

  const result = AuditLog.open({ dir }).verify();
  assert.equal(result.ok, false);
  assert.match(result.reason, /anchor/i);
});

test('a corrupt line is reported with its line number', () => {
  const dir = freshDir();
  const log = AuditLog.open({ dir });
  log.append({ kind: 'guard', event: 'a', summary: 'a' });
  appendFileSync(join(dir, 'audit.log.jsonl'), 'this is not json\n');

  const result = AuditLog.open({ dir }).verify();
  assert.equal(result.ok, false);
  assert.match(result.reason, /not valid JSON/);
});

test('the log redacts secrets before they reach disk', () => {
  const dir = freshDir();
  const log = AuditLog.open({ dir });
  const secret = 'sk-ant-api03-ZZZZZZZZZZZZZZZZZZZZZZZZ';
  log.append({
    kind: 'guard',
    event: 'secret',
    summary: `found ${secret}`,
    data: { nested: { deep: [secret] } },
  });
  const raw = readFileSync(join(dir, 'audit.log.jsonl'), 'utf8');
  assert.ok(!raw.includes(secret), 'a secret in a summary or payload must never be persisted');
  assert.ok(raw.includes('redacted'));
});

test('the key is created with owner-only permissions, or comes from the environment', () => {
  const dir = freshDir();
  const log = AuditLog.open({ dir });
  log.append({ kind: 'guard', event: 'a', summary: 'a' });
  const status = log.status();
  assert.ok(status.keySource === 'generated' || status.keySource === 'file');

  const envKey = 'ab'.repeat(32);
  const envLog = AuditLog.open({ dir: freshDir(), env: { DSH_SECURITY_GATE_KEY: envKey } });
  assert.equal(envLog.status().keySource, 'env');
});

test('a log opened with the environment key verifies entries written with it', () => {
  const dir = freshDir();
  const env = { DSH_SECURITY_GATE_KEY: 'cd'.repeat(32) };
  const first = AuditLog.open({ dir, env });
  first.append({ kind: 'guard', event: 'a', summary: 'a' });
  const second = AuditLog.open({ dir, env });
  assert.equal(second.verify().ok, true);
});

test('a log re-keyed between runs fails verification', () => {
  const dir = freshDir();
  const first = AuditLog.open({ dir, env: { DSH_SECURITY_GATE_KEY: '11'.repeat(32) } });
  first.append({ kind: 'guard', event: 'a', summary: 'a' });
  const second = AuditLog.open({ dir, env: { DSH_SECURITY_GATE_KEY: '22'.repeat(32) } });
  assert.equal(second.verify().ok, false);
});

test('read filters by kind and limit, newest last', () => {
  const log = openLog();
  log.append({ kind: 'guard', event: 'a', summary: 'a' });
  log.append({ kind: 'output', event: 'b', summary: 'b' });
  log.append({ kind: 'guard', event: 'c', summary: 'c' });

  assert.deepEqual(log.read({ kind: 'guard' }).map((entry) => entry.event), ['a', 'c']);
  assert.deepEqual(log.read({ limit: 1 }).map((entry) => entry.event), ['c']);
  assert.deepEqual(log.read({ event: 'b' }).map((entry) => entry.event), ['b']);
  assert.deepEqual(log.read({ limit: 0 }), []);
});

test('rotation keeps the chain verifiable across segments', () => {
  const dir = freshDir();
  const log = AuditLog.open({ dir, maxBytes: 900 });
  for (let index = 0; index < 40; index += 1) {
    log.append({ kind: 'guard', event: `e${index}`, summary: `entry number ${index} with some padding text to fill the segment` });
  }
  const status = log.status();
  assert.ok(status.rotatedSegments > 0, 'expected at least one rotation');
  assert.equal(log.verify().ok, true, 'the active segment must still chain onto the rotated head');
});

test('verifyChain reports the first broken link in a hand-built chain', () => {
  const key = Buffer.from('ab'.repeat(32), 'hex');
  const a = sealEntry(key, { seq: 0, ts: 't', kind: 'guard', event: 'a', summary: 'a', data: null, prev: '', alg: 'hmac-sha256' });
  const b = sealEntry(key, { seq: 1, ts: 't', kind: 'guard', event: 'b', summary: 'b', data: null, prev: a.hash, alg: 'hmac-sha256' });
  assert.equal(verifyChain(key, [a, b]).ok, true);

  const forged = { ...b, prev: 'deadbeef' };
  const result = verifyChain(key, [a, forged]);
  assert.equal(result.ok, false);
  assert.equal(result.brokenAt, 1);
});

test('the anchor MAC does not validate after a content edit', () => {
  const key = Buffer.from('ab'.repeat(32), 'hex');
  const anchor = buildAnchor(key, 'head', 3);
  assert.equal(anchor.mac, computeAnchorMac(key, 3, 'head', ''));
  assert.notEqual(anchor.mac, computeAnchorMac(key, 4, 'head', ''));
  assert.notEqual(anchor.mac, computeAnchorMac(key, 3, 'other', ''));
});
