# Changelog

## 0.1.0

Initial release.

**Layer one — pre-install audit**

- `security_gate_audit` statically analyses a plugin source (local directory, local `.tgz`/`.tar.gz`, or an `https:` tarball when `install.fetch` is enabled) and grades it A–D.
- Sources are staged **in memory**; nothing is unpacked to disk. The bounded ustar reader drops archive entries that escape the root rather than normalizing them, and directory staging does not follow symlinks.
- Capability inventory: file paths read and written, commands spawned, domains contacted, environment variables read, declared lifecycle hooks. `path.join(os.homedir(), '.ssh', 'id_rsa')` is reported as `~/.ssh/id_rsa`, not as its fragments.
- 60 line rules and 17 correlation rules across 11 categories. The correlation rules are the point: "reads a credential **and** opens an outbound connection" is a package-level fact no single line contains.
- Line rules are tested against several spellings of each line, including concatenation-joined, so a rule written against `~/.ssh/id_rsa` matches code that builds it from three literals.
- Scoring: per-severity weights with diminishing returns for repetition, an escalation for findings spread across independent categories, and any `critical` finding pins the grade to `D` regardless of the arithmetic.
- A local source named by an install command is audited inline by the install gate, so the refusal is about the bytes that exist rather than a name.

**Layer two — runtime guard**

- 61 input rules hooked on `tools/pre-execute`, 20 output rules hooked on `tools/post-execute`.
- Graded policy: 34 rules block, 23 escalate to the approval seam, 4 record only. Destructive and unrecoverable actions block; frequently-legitimate actions escalate.
- Obfuscation resistance through canonicalized views: `$IFS` normalization, backslash-escape decoding, quote removal, base64 and hex unwrapping (including short payloads fed to an explicit decoder), and comment stripping before any view is derived.
- SSRF detection reasons from literals only — no DNS, no network. Obfuscated IPv4 (`2130706433`, `0x7f000001`, `0177.0.0.1`) and IPv6 literals are resolved before classification.
- Output auditing redacts in place and continues by default; a private key block, the gate's own HMAC key, and unredactable key material are withheld whole. Each text block is audited independently, so a replacement that changes length cannot misalign the result.
- Non-text content (images, file references) survives redaction untouched.

**Tamper-evident log**

- HMAC-SHA256 hash chain with a MACed anchor sidecar recording the expected entry count, head hash, and predecessor head. Detects an edited entry, a deleted or reordered entry, a corrupt line, a truncated log, and a rewritten anchor, and reports the first untrustworthy sequence number.
- Canonical JSON serialization (sorted keys, no insignificant whitespace) so hashing is byte-stable across runs.
- Summaries and payloads are redacted before sealing. The log can never persist the secret that a rule just detected.
- Segment rotation keeps the chain verifiable across files.
- Key from `DSH_SECURITY_GATE_KEY` or a `0600` key file; an unwritable location degrades to an in-memory session key with the failure reported rather than preventing the plugin from loading.

**Surface**

- 4 tools: `security_gate_audit`, `security_gate_status`, `security_gate_log`, `security_gate_verify`.
- `/security audit|status|log|verify|rules`.
- Configuration is validated in code with unknown keys refused and the accepted values in the message. No schema dependency.

**Zero runtime dependencies**

- The compiled output imports only `node:` builtins. `dependencies` is empty; `peerDependencies` is absent entirely, including for official `@deepseek-ai/*` packages. CI fails the build if either changes, and if an install-time lifecycle script appears.
- The harness surface is declared structurally in `src/dsh.ts`.

**Testing**

- 143 unit and integration tests. Guard and scanner behavior is asserted by decision rather than by rule id, so a rule rename does not break the suite and a new rule covering an existing case still has to keep the decision.
- Every tampering shape the log claims to detect is tested by editing the file the way an attacker would.
- `npm run smoke` runs the whole runtime catalog over 23 benign calls (which must stay clean) and 42 dangerous calls (which must be caught at or above the expected level), failing on any false positive.
- Malicious fixtures are generated at run time rather than committed.
