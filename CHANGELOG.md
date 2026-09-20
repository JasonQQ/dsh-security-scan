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
- 61 line rules and 18 correlation rules across 11 categories. The correlation rules are the point: "reads a credential **and** opens an outbound connection" is a package-level fact no single line contains.
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

**What a D grade reports**

- A `D` report now leads with a **Most severe risk** section: the one finding that decided the grade, its consequence in plain language, and the aggravating facts the result actually supports (runs at install time, obfuscated, persists, reaches the instance-metadata endpoint, partial scan). The choice is deterministic — severity, then category impact, then anchor count, then rule id — so the same scan names the same risk twice.
- Every sentence is composed from facts already in the `ScanResult`; nothing is inferred or generated. The summary carries a one-line version, and a `C` deliberately gets no section.

**Language**

- Reports are bilingual by default: Chinese first, English second, with short fields joined on one line and longer prose on a labelled line per language. `report.locale` selects `bilingual` (default), `en` or `zh`.
- The JSON report and the audit log stay English regardless — their field names are the log's vocabulary — as do the tool descriptions and the system-prompt section, which are instructions to a model.
- Rule text is translated per rule id in `rules.zh.ts` for each catalog. An untranslated rule falls back to English rather than being omitted, and `/security status` reports the coverage so a gap is visible.

**Translations and output-audit calibration**

- All 158 rules now carry Chinese `title` / `detail` / `remediation`, keyed by rule id in `rules.zh.ts` for each catalog. Technical tokens — commands, paths, addresses, environment variable names, API names — are deliberately left untranslated so a reader can copy them into a shell.
- The output audit was recalibrated against the shapes that made it fire on the plugin's own source, three of them at `block` severity, which withheld whole tool results:
  - A private key now requires a real body. A lazy `[\s\S]*?` bridged two *documentation* mentions of the PEM header into one "key", and the OpenSSH pattern's trailing `|$` matched a bare mention to the end of the text. A key body is lines of 64 base64 characters; requiring one run of 64 is what separates the description from the thing.
  - Loopback, the unspecified address, the published metadata endpoints and the RFC5737 documentation ranges are no longer redacted. They are identical on every machine, so redacting them protects nothing — the input side already owns "something is talking to the metadata service".
  - A hostname must end where the match ends and must not sit in path position. `ssrf.internal-hostname` was having its middle redacted (a rule id mangled into `«internal-host»-hostname`), and `/etc/rc.local` was read as a host.
  - The audit-key rule no longer matches its own replacement placeholder: the value must be 64 hex characters, which is what `resolveKey` accepts anyway.
- Residual, documented rather than patched: reading the plugin's own pattern tables still looks like leaking topology, because the tables contain the hostnames and suffixes the rule hunts. That is the signature-table property, and self-exempting it would be the hole.

**Guard corrections**

- `priv.remote-pipe-to-shell` no longer reads a pipe as execution when the interpreter takes its program inline. `curl … | python3 -c '…'` feeds the response to a program that came from the command line — which is how anyone reads a JSON API from a shell — and it was refused at `block` severity for it. An eval flag (`-c`, `-e`, `-r`, `--eval`) is now the difference between running what the server returns and parsing it.
- A host allowlist no longer silences rules whose signal is not the host. Suppressing by category meant that listing `localhost` also stopped `ssrf.loopback-service-port` from firing, so `http://127.0.0.1:2375/containers/json` — the unauthenticated Docker daemon — became allowed. `ssrf.loopback-service-port`, `ssrf.dangerous-scheme`, `ssrf.cloud-metadata` and `ssrf.known-drop-host` are now exempt from the exemption.

**Surface**

- 4 tools: `security_scan_audit`, `security_scan_status`, `security_scan_log`, `security_scan_verify`.
- `/security audit|status|log|verify|rules`.
- Configuration is validated in code with unknown keys refused and the accepted values in the message. No schema dependency.

**Zero runtime dependencies**

- The compiled output imports only `node:` builtins. `dependencies` is empty; `peerDependencies` is absent entirely, including for official `@deepseek-ai/*` packages. CI fails the build if either changes, and if an install-time lifecycle script appears.
- The harness surface is declared structurally in `src/dsh.ts`.

**Testing**

- 241 unit and integration tests. Guard and scanner behavior is asserted by decision rather than by rule id, so a rule rename does not break the suite and a new rule covering an existing case still has to keep the decision.
- Every tampering shape the log claims to detect is tested by editing the file the way an attacker would.
- `npm run smoke` runs the whole runtime catalog over 23 benign calls (which must stay clean) and 42 dangerous calls (which must be caught at or above the expected level), failing on any false positive.
- Malicious fixtures are generated at run time rather than committed.
- `docs/stress/` holds a batch run over the marketplace's **top 100 plugins by stars** (`scripts/stress-top-plugins.mjs`), and `docs/stress/CALIBRATION.md` records what it found. The run is the reason most of the calibration entries below exist: nine rules were judged against a hundred unrelated real repositories instead of against fixtures, and every defect listed was found by reading a report rather than by reasoning about a pattern.
- `scripts/stress-analyze.mjs` aggregates a stress run by rule and prints the evidence lines behind each hit, which is how a false positive is told apart from a real one.
- `scripts/calibration-check.mjs` reduces each defect to the smallest reproducing package and additionally asserts the shapes that **must still fire** (a real encoded exfiltration, real obfuscation, secret enumeration, a destructive command in shipped source), so tightening a rule cannot be mistaken for fixing it.

**Calibration from the batch run**

Measured over the same 91 packages, same list, before and after: **D 80 → 67**, mean score 10 → 26, findings 1,384 → 1,019. The four correlations that carried most of the refusals:

- Correlations no longer accept a *mention* as a credential read. `exfil.credential-read-then-callback` fired on 70 of 90 packages because `cred.credential-path-mention` — which fires on any line naming a secret path, including a UI label like `密钥读取优先级：.credentials.yaml` — satisfied the credential half. It now requires one of the six secret-store read rules at `high` or above; reading a `.env` file is excluded, since loading one's own configuration is what ordinary plugins do.
- Correlations no longer cite evidence that does not support them. The credential anchors were collected with the `cred.` prefix, so the mention line was printed as the read that justified the finding; the anchors now come from the read rules themselves.
- Obfuscation correlations require actual concealment (`OBFUSCATION_PROOF_RULES`: hex-mangled identifiers, a base64 payload reaching an evaluator, strings reassembled from fragments) rather than dynamism. A computed `require(id)` is how a plugin host loads modules and `new Function(source)` is how a bundler evaluates a build, so `obf.obfuscation-with-network-callback` fell from 52 packages to 2.
- The obfuscation "payload" was usually the bundler's own loader. Generated-output detection now recognises bundler runtime signatures (`__toESM`, `__webpack_require__`, `System.register(`, `__modules[`) and scans the **whole file**: the bundle in question defined its module table on line 2138, past the 400-line window the check had used.

**File roles: what a finding is evidence *of***

- Files are classified as `source`, `generated`, `test`, `doc` or `config`, and a finding in test material or prose is reported but capped at `low`, so it cannot pin a grade at `D`. `rm -rf /` inside `packages/fatal-guard/tests/sanitize-command.test.js` is the input a test feeds a sanitizer to prove the sanitizer rejects it, and read as shipped behavior it refused 11 packages. The cap applies to package-level findings too, when every anchor they cite is development-only.
- `prompt-injection` rules are exempt: a `SKILL.md` is a document, and an instruction aimed at a model is exactly what those rules exist to find.
- The capability inventory — file paths, commands, domains — is built from code only. Documentation described a plugin's README link list as the domains it contacts, which put `keepachangelog.com` in a "domains contacted" list and made `net.excessive-distinct-hosts` fire on 47 of 91 packages.
- The two new rules are `cred.many-secret-env-vars` and `cred.environment-secret-enumeration`, which together replace an over-broad line regex: `...process.env` (forwarding the environment to a child process) and `process.env.EXAMPLE_API_KEY` (a plugin reading its own key) are no longer "credential harvest", while enumerating five or more differently-named secrets still is.

**Other false positives from the same run**

- A request to loopback cannot be evidence that a secret left the machine, so correlation anchors skip the destinations that cannot route off it (`127.0.0.0/8`, `::1`, `0.0.0.0`) while keeping private ranges, which really do reach another host.
- `Buffer.from(x)` without an encoding argument is a byte conversion, not a decode step. Counting it made every package that signs or serializes a payload look like an encoded exfiltration; `Buffer.from(x, 'base64')` still counts.
- `net.plaintext-http` no longer reports namespaces and reference links. `xmlns="http://www.w3.org/2000/svg"` and a license header's `http://opensource.org/licenses/MIT` are names written as URLs; nothing is requested from them and no `https` version would be an improvement. They were 73 hits across 90 packages.
- `net.metadata-endpoint` requires a request context instead of matching the address anywhere. Code that *blocks* `169.254.169.254`, and a semgrep rule whose `pattern-not-inside` excludes it, were both reported at `critical` for reaching it.
- `install.hook-with-network-callback` requires the hook's own command — or a local script it invokes — to reach the network. Accepting an anchor from anywhere in the package made it fire on every plugin whose `prepare` script runs the compiler and whose repository mentions an `http://` URL in a log message.
- `obf.dynamic-require` caps itself to `low` in generated output, where a computed require is the loader's mechanism rather than a concealed import.

**Archive staging**

- A subpath is now matched against the tree *after* its single wrapping directory is removed. GitHub and npm both wrap everything (`<repo>-HEAD/`, `package/`), and the wrapper was being stripped after staging while the subpath was checked during it — so a scoped audit of a monorepo staged **zero files** and reported `no files under "…"` for a directory that existed. The wrapper is now decided from the tar headers in a header-only pre-pass, before any decision depends on it, and archive entries that escape the root no longer get a vote in that decision.
- An archive larger than the fetch cap is rejected from its `content-length` before the body is pulled, so a 553 MB repository costs one request instead of a full download that then fails the cap.
