# Changelog

## 0.1.0

Initial release. Named `dsh-security-scan` rather than the `dsh-security-gate` it
was developed under: the `dsh-security-gate` and `dsh-security-guard` names were
both already published on npm by unrelated authors, so shipping under either
would have installed someone else's plugin. `dsh-security-scan` was verified free
on npm and unlisted in the marketplace at the time of the rename.

**Layer one — pre-install audit**

- `security_scan_audit` statically analyses a plugin source (local directory, local `.tgz`/`.tar.gz`, or an `https:` tarball when `install.fetch` is enabled) and grades it A–D.
- Sources are staged **in memory**; nothing is unpacked to disk. The bounded ustar reader drops archive entries that escape the root rather than normalizing them, and directory staging does not follow symlinks.
- Capability inventory: file paths read and written, commands spawned, domains contacted, environment variables read, declared lifecycle hooks. `path.join(os.homedir(), '.ssh', 'id_rsa')` is reported as `~/.ssh/id_rsa`, not as its fragments.
- 60 line rules and 17 correlation rules across 11 categories. The correlation rules are the point: "reads a credential **and** opens an outbound connection" is a package-level fact no single line contains.
- Line rules are tested against several spellings of each line, including concatenation-joined, so a rule written against `~/.ssh/id_rsa` matches code that builds it from three literals.
- Scoring: per-severity weights with diminishing returns for repetition, an escalation for findings spread across independent categories, and any `critical` finding pins the grade to `D` regardless of the arithmetic.
- A local source named by an install command is audited inline by the install check, so the refusal is about the bytes that exist rather than a name.
- Comment scoping is per rule: a line rule skips lines with no executable content unless it sets `inspectComments`, which only the obfuscation and prompt-injection families do. Comment bodies are found by a stateful per-file mask, so a JSDoc block or a block comment without leading asterisks is recognised as a whole, and `#` is a private-member sigil in JavaScript rather than a comment marker. Prose files are never treated as commented — a Markdown `#` is a heading, and an instruction in a `SKILL.md` is exactly what the scanner should find.
- `install.allow` makes a refusal overridable by package name or `sha256:` content digest. A match permits the install and is recorded as an `install-allowed-override` event carrying the overridden grade. Without it, `blockAtOrBelow` being a floor and `D` being the worst grade meant a `D` verdict could never be accepted, which also blocked re-installing this plugin by local path.

**Layer two — runtime guard**

- 61 input rules hooked on `tools/pre-execute`, 20 output rules hooked on `tools/post-execute`.
- Graded policy: 34 rules block, 23 escalate to the approval seam, 4 record only. Destructive and unrecoverable actions block; frequently-legitimate actions escalate.
- Obfuscation resistance through canonicalized views: `$IFS` normalization, backslash-escape decoding, quote removal, base64 and hex unwrapping (including short payloads fed to an explicit decoder), and comment stripping before any view is derived.
- SSRF detection reasons from literals only — no DNS, no network. Obfuscated IPv4 (`2130706433`, `0x7f000001`, `0177.0.0.1`) and IPv6 literals are resolved before classification.
- Output auditing redacts in place and continues by default; a private key block, the plugin's own HMAC key, and unredactable key material are withheld whole. Each text block is audited independently, so a replacement that changes length cannot misalign the result.
- Non-text content (images, file references) survives redaction untouched.

**Tamper-evident log**

- HMAC-SHA256 hash chain with a MACed anchor sidecar recording the expected entry count, head hash, and predecessor head. Detects an edited entry, a deleted or reordered entry, a corrupt line, a truncated log, and a rewritten anchor, and reports the first untrustworthy sequence number.
- Canonical JSON serialization (sorted keys, no insignificant whitespace) so hashing is byte-stable across runs.
- Summaries and payloads are redacted before sealing. The log can never persist the secret that a rule just detected.
- Segment rotation keeps the chain verifiable across files.
- Key from `DSH_SECURITY_SCAN_KEY` or a `0600` key file; an unwritable location degrades to an in-memory session key with the failure reported rather than preventing the plugin from loading.

**Language**

- Reports are bilingual by default: Chinese first, English second, with short fields joined on one line and longer prose on a labelled line per language. `report.locale` selects `bilingual` (default), `en` or `zh`.
- The JSON report and the audit log stay English regardless — their field names are the log's vocabulary — as do the tool descriptions and the system-prompt section, which are instructions to a model.
- Rule text is translated per rule id in `rules.zh.ts` for each catalog. An untranslated rule falls back to English rather than being omitted, and `/security status` reports the coverage so a gap is visible.

**Surface**

- 4 tools: `security_scan_audit`, `security_scan_status`, `security_scan_log`, `security_scan_verify`.
- `/security audit|status|log|verify|rules`.
- Configuration is validated in code with unknown keys refused and the accepted values in the message. No schema dependency.

**Zero runtime dependencies**

- The compiled output imports only `node:` builtins. `dependencies` is empty; `peerDependencies` is absent entirely, including for official `@deepseek-ai/*` packages. CI fails the build if either changes, and if an install-time lifecycle script appears.
- The harness surface is declared structurally in `src/dsh.ts`.

**Testing**

- 164 unit and integration tests. Guard and scanner behavior is asserted by decision rather than by rule id, so a rule rename does not break the suite and a new rule covering an existing case still has to keep the decision.
- Every tampering shape the log claims to detect is tested by editing the file the way an attacker would.
- `npm run smoke` runs the whole runtime catalog over 23 benign calls (which must stay clean) and 42 dangerous calls (which must be caught at or above the expected level), failing on any false positive.
- Malicious fixtures are generated at run time rather than committed.
