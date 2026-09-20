/**
 * The output audit, calibrated against the shapes that made it cry wolf.
 *
 * Pointing the plugin at its own tree is what exposed these: a security rule
 * *names* the things it hunts, so the plugin's own source and pattern tables read
 * as leaks. Three of the four defects here were `block`-severity, which means they
 * withheld whole tool results — the failure mode that makes a guard get switched
 * off rather than argued with.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { OUTPUT_RULES } from '../lib/guard/rules.catalog.js';

/** Run every output rule that applies to `read` over a text. */
function audit(text) {
  const ctx = { tool: 'read', text, isError: false };
  const hits = [];
  for (const rule of OUTPUT_RULES) {
    if (!(rule.tools.includes('*') || rule.tools.includes('read'))) continue;
    let result;
    try {
      result = rule.test(ctx);
    } catch {
      continue;
    }
    if (result && result.length > 0) hits.push({ id: rule.id, action: rule.action, hits: result });
  }
  return hits;
}

/** Just the rule ids that fired. */
function ids(text) {
  return audit(text).map((entry) => entry.id);
}

const PEM_BODY = 'MIIEowIBAAKCAQEA'.repeat(4); // 64 base64 characters, one PEM line
const OPENSSH_HEADER = '-----BEGIN OPENSSH PRIVATE KEY-----';

// ---------------------------------------------------------------------------
// Private keys: a header is not a key
// ---------------------------------------------------------------------------

test('a real private key block is still withheld', () => {
  for (const block of [
    `-----BEGIN OPENSSH PRIVATE KEY-----\n${PEM_BODY}\n-----END OPENSSH PRIVATE KEY-----`,
    `-----BEGIN RSA PRIVATE KEY-----\n${PEM_BODY}\n-----END RSA PRIVATE KEY-----`,
  ]) {
    const found = audit(block);
    assert.ok(
      found.some((entry) => entry.id.startsWith('leak.') && entry.action === 'block'),
      `a real key must be withheld: ${ids(block).join(', ') || 'nothing fired'}`,
    );
  }
});

test('naming the header is not a private key', () => {
  // The lazy `[\s\S]*?` bridged two documentation mentions of the header into one
  // "key", and the OpenSSH pattern's trailing `|$` matched a bare mention all the
  // way to the end of the text. Both withheld the whole result.
  const mentions = [
    `The rule fires on a ${OPENSSH_HEADER}\` block in a result.`,
    `${OPENSSH_HEADER}\n\nSee the remediation below for what to do about it.`,
    'A PEM block starts with -----BEGIN RSA PRIVATE KEY----- and ends with the matching END line.',
  ];
  for (const text of mentions) {
    const fired = ids(text).filter((id) => id.includes('private-key'));
    assert.deepEqual(fired, [], `documentation was read as a key: ${fired.join(', ')}`);
  }
});

test('the pattern that describes a key is not a key', () => {
  // The plugin's own catalog contains the regex source for a PEM block. Requiring
  // a 64-character base64 run is what separates the description from the thing.
  const source = String.raw`re: /-----BEGIN (?:\w+ )?PRIVATE KEY-----[\s\S]*?-----END (?:\w+ )?PRIVATE KEY-----/g`;
  assert.deepEqual(ids(source).filter((id) => id.includes('private-key')), []);
});

// ---------------------------------------------------------------------------
// Internal topology: published addresses are not topology
// ---------------------------------------------------------------------------

test('addresses that are the same on every machine are not redacted', () => {
  // These are in every manual and in every config file. Redacting them protects
  // nothing and fills the transcript with markers.
  for (const address of ['127.0.0.1', '[::1]', '::1', '0.0.0.0', '169.254.169.254', '255.255.255.255']) {
    const fired = ids(`The service listens on ${address} by default.`);
    assert.deepEqual(fired.filter((id) => id === 'leak.internal-topology'), [], `${address} must not be redacted`);
  }
});

test('addresses that are only true of your network still are', () => {
  for (const address of ['10.0.0.5', '172.16.4.2', '192.168.1.10', '100.64.0.7', 'fd00:1234::1']) {
    const fired = ids(`upstream is ${address}`);
    assert.ok(fired.includes('leak.internal-topology'), `expected ${address} to be redacted`);
  }
});

test('a dotted identifier is not a hostname', () => {
  // `ssrf.internal-hostname` is a rule id. The suffix check saw `.internal` and
  // redacted the middle of it, mangling the identifier a reader was searching for.
  for (const text of ['see `ssrf.internal-hostname` for the rule', 'leak.private-key and cred.read-ssh-key']) {
    assert.deepEqual(ids(text).filter((id) => id === 'leak.internal-topology'), [], `identifier treated as a host: ${text}`);
  }
});

test('a file name that ends in an internal suffix is not a hostname', () => {
  for (const text of ['cat /etc/rc.local', 'bash scripts/deploy.local']) {
    assert.deepEqual(
      ids(text).filter((id) => id === 'leak.internal-topology'),
      [],
      `a path was treated as a host: ${text}`,
    );
  }
});

test('real internal hostnames are still redacted', () => {
  for (const host of ['printer.local', 'db.svc.cluster.local', 'vault.corp', 'wiki.internal']) {
    const fired = ids(`connect to ${host} on 5432`);
    assert.ok(fired.includes('leak.internal-topology'), `expected ${host} to be redacted`);
  }
});

// ---------------------------------------------------------------------------
// The audit key: the name is public, the value is not
// ---------------------------------------------------------------------------

test('the audit key name alone is not a leak', () => {
  // The name is documented in the README, and the rule's own replacement text
  // contains it; matching the bare name made the rule fire on its own source.
  const fired = ids('Set DSH_SECURITY_SCAN_KEY in the environment of the harness process.');
  assert.deepEqual(fired.filter((id) => id === 'leak.audit-key'), []);
});

test('the audit key value is still withheld', () => {
  const secret = 'a1b2c3d4'.repeat(8); // 64 hex characters
  const found = audit(`export DSH_SECURITY_SCAN_KEY=${secret}`);
  const key = found.find((entry) => entry.id === 'leak.audit-key');
  assert.ok(key !== undefined, `expected the key value to be caught: ${ids(`export DSH_SECURITY_SCAN_KEY=${secret}`).join(', ')}`);
  assert.equal(key.action, 'block');
});
