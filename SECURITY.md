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
