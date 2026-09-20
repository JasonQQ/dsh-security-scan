# Security

This document describes what `dsh-security-scan` does, what it deliberately does
not do, and what it cannot prove. Read the **Limits** section before relying on
the plugin for anything that matters.

## Reporting a vulnerability

Open a GitHub issue on this repository. If the issue is itself exploitable —
a bypass in the guard, a way to forge the audit chain, a rule that leaks the
secret it detected — say so in the title and the maintainer will treat it
privately until a fix ships.

Reports of the form "this rule has a false positive" or "this attack is not
covered" are welcome as ordinary issues. Include the exact command or plugin
source that reproduces it.

## What the plugin does

### Layer one — pre-install audit

`security_scan_audit` parses a plugin's source **without executing it** and
reports:

- the file paths it reads and writes, the commands it spawns, and the domains it
  contacts, each with the file and line that justified the claim;
- declared install-time lifecycle scripts (`preinstall`, `install`,
  `postinstall`, and the rest);
- findings from the static rule catalog, grouped by severity;
- a trust grade A–D and a numeric score.

A grade at or below `install.blockAtOrBelow` (default `D`) is refused. A local
source named by an install command is audited **at the moment the install command
runs**, so the refusal is about the actual bytes on disk.

**A refusal is overridable, and the override is recorded.** `install.allow` takes
package names or `sha256:` content digests; a match permits the install and is
written to the audit log as an `install-allowed-override` event carrying the grade
it overrode. This exists because `blockAtOrBelow` is a floor and `D` is already
the worst grade, so without it a `D` verdict could never be accepted — and a gate
that cannot be argued with is one that gets uninstalled instead of reviewed. The
digest form is the stronger of the two: it permits one artifact rather than one
name.

**Comments are not read as behaviour.** A line rule skips lines that carry no
executable content unless it opts in with `inspectComments`, which only the
obfuscation and prompt-injection families do. So a credential path in a JSDoc
example or a shell comment is not a finding, while a base64 blob or a bidi
override character inside a comment still is. Prose files are never treated as
commented: a Markdown `#` is a heading, and an instruction in a `SKILL.md` is the
most important thing the scanner can find.

This has a visible consequence the scanner does not hide: **it grades its own
source `D`**, because a security plugin necessarily ships the patterns it hunts
for — `'rm -rf /'`, the metadata IPs, `webhook.site` and the attack strings in its
own test fixtures are all string literals in its source. That is the tool being
consistent rather than broken, and `install.allow` is how a deliberate install is
accepted. The specific class is reported as `destructive.shipped-command` and the
`net.*` literal rules, so a reader can see it is the signature table rather than
mistaking it for real capability.

The audit reads the source into memory and **writes nothing to disk** — no
unpacking, no temp tree. Tarballs are parsed in memory with a bounded reader that
drops entries escaping the archive root rather than normalizing them.

### Layer two — runtime guard

Hooked on `tools/pre-execute` and `tools/post-execute`:

- **Input**: destructive parameters (`rm -rf /`, block-device writes, force-push
  to `main`, `DROP DATABASE`), credential reads (SSH keys, `.aws/credentials`,
  `~/.dsh/credentials.yaml`, browser stores, shell history), SSRF destinations
  (cloud metadata, private ranges, internal suffixes, `file:`/`gopher:`, DNS
  rebinding hosts), sandbox escapes, persistence writes, and exfiltration shapes.
- **Obfuscation resistance**: matching runs over canonicalized *views* of the
  call — backslash-unescaped, unquoted, separator-normalized, base64- and
  hex-decoded — so `rm${IFS}-rf${IFS}/`, `r\m -rf /` and
  `echo cm0gLXJmIC8= | base64 -d | sh` are the same input to a rule.
- **Output**: leaked provider keys, key material, JWTs, embedded URL credentials,
  private and internal addresses. The default is **redact and continue**, because
  blocking information the user asked for is hostile and the model will often
  re-request it. A private key block is the exception: it is withheld whole,
  since partial redaction would leave live key bytes in place.

### Tamper-evident log

Every decision is appended to `audit.log.jsonl` as
`hash = HMAC-SHA256(key, canonical(entry))` with `entry.prev` set to the
previous entry's `hash`. A MACed sidecar (`audit.head.json`) records the expected
entry count and head hash.

`security_scan_verify` reports the **first** sequence number where the log
stopped being trustworthy, distinguishing an edited entry, a broken link
(deletion or reordering), a corrupt line, a truncated log, and a rewritten
anchor.

## Supply-chain posture of this plugin itself

- **No runtime dependencies.** The compiled output imports only `node:` builtins.
  `dependencies` is empty; `peerDependencies` is absent entirely, including for
  official `@deepseek-ai/*` packages. The harness surface this plugin consumes is
  declared structurally in `src/dsh.ts` instead of imported.
- **No install-time scripts.** The package declares no lifecycle hooks.
- **No network access.** The plugin never makes an outbound request unless you set
  `install.fetch: true` *and* pass an `https:` URL to an audit. Even then, plain
  HTTP is refused and the download is size-capped.
- **The log never writes a secret, even the one it just caught.** Findings store
  the *shape* of what matched, capability values are redacted on extraction, and
  every summary and payload is passed through the redactor before sealing.

## What the gate does not cover

Stated here because it was learned the direct way, not reasoned about in advance.

**Your own input is not audited.** The output audit runs on `tools/post-execute`,
so it sees tool *results*. Text a person types into the conversation does not pass
through it — a credential pasted into a chat is not redacted, not flagged, and is
written to the session log under `~/.dsh/sessions/`. The gate protects what the
model reads and what the model produces; it cannot protect what you hand over. If
you need to give a secret to a process, put it in that process's environment or in
the OS keychain, not in a message.

**Authoring these rules fights the rules.** Verifying a guard rule means writing
commands whose text contains the attack it detects, and the guard cannot tell a
test fixture from the real thing. Four commands written while tuning the catalog
were refused, three of them while verifying the fix for the previous refusal. The
regression tests in `test/` therefore assemble their sensitive literals from
pieces, and `guard.mode: monitor` is the supported way to work on the rules
themselves.

**A live guard and its own test suite cannot share one shell.** Same cause. In
monitor mode the audit log still records every detection, which is what makes an
end-to-end check possible there: run the command, then read what the guard thought.

## Limits

These are stated plainly because a security tool that oversells itself is worse
than one with a narrow, honest scope.

1. **A high grade is not a clean bill of health.** It means no rule in the
   catalog fired over the bytes that were read. Behavior assembled at runtime,
   logic behind a remote configuration fetch, and anything inside a binary
   payload are invisible to static analysis.
2. **A registry install is audited by name, not by content.** When you audit
   `foo@1.2.3` and later run `dsh plugin add foo`, the scanner binds the grade to
   the *name* it audited. It cannot see the bytes npm or git will serve. The
   refusal and escalation text says this explicitly. Audits expire
   (`log.ttlMs`, default 24h) so a stale grade cannot outlive its artifact.
3. **The chain proves tampering, not integrity.** Anyone who can write both the
   log and `audit.key` can rebuild a consistent chain. The guarantee is that
   silent modification is impossible: any edit leaves a verifiable mark. Move the
   key off the log directory, or supply it via `DSH_SECURITY_SCAN_KEY`, to raise
   the bar.
4. **`monitor` mode does not protect anything.** It records. That is its purpose
   — a way to learn which rules your own workflow trips before refusing calls.
5. **Rule overrides and allowlists are bypasses you choose.** `guard.rules`,
   `guard.allowedHosts` and `guard.allowedPaths` widen what is permitted. Every
   use of them appears in the audit log, but the plugin will not second-guess you.
6. **The guard covers tool calls, not the process.** Code already running in the
   harness can bypass the tool pipeline entirely. This is a guardrail against
   prompt-driven mistakes and hostile tool arguments, not a sandbox.
7. **The scanner and the guard are regex- and heuristic-driven.** They are
   designed to be read and audited by a human. They will both miss things and
   flag things that are fine. Treat a finding as a question, not a verdict.
