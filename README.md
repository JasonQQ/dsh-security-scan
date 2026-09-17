# dsh-security-scan

Two-layer security for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness): a **pre-install audit** that reads a plugin's source before you install it, and a **runtime guard** that inspects every tool call before it runs and every result before it returns.

> **`dsh-security-scan` is the name of this repository, not an installable npm package name.** An unrelated package already occupies that name on npm. See [Install](#install) and [`docs/publishing.md`](docs/publishing.md).

## What it does

### Layer one — pre-install audit

`security_scan_audit` parses a plugin's source **without executing it** and produces a report: the file paths it reads and writes, the commands it spawns, the domains it contacts, its declared install-time hooks, and every rule that fired — each anchored to the file and line that justified it. Then it grades the result **A–D**.

A grade `D` is refused. A local source named by an install command is audited **at the moment the install command runs**, so the refusal is about the actual bytes on disk rather than a name someone hoped matched.

```console
$ /security audit ./some-plugin
# Pre-install audit: some-plugin@1.0.0

**Trust grade: D** (score 0/100 — refused: critical risk signals)

> **Install refused.** This source met the configured refusal floor.

## What this plugin can reach

- **File paths read:** `.ssh`, `~/.ssh/id_rsa`, `.aws`, `~/.aws/credentials`
- **File paths written:** (none)
- **Commands spawned:** `node:child_process`, `curl -s http://169.254.169.254/…`
- **Domains contacted:** `169.254.169.254`, `webhook.site`
- **Environment variables read:** `process.env (every variable)`

## Findings

### critical (7)

- **CRITICAL** `cred.read-ssh-private-key` — Reads an SSH private key or authorized_keys
  This line reads an SSH key file. A plugin that can read a private key can
  authenticate as the user everywhere that key is trusted, and the file has no
  legitimate use in a build.
  - `scripts/setup.js:6` — `const key = fs.readFileSync(path.join(os.homedir(), '.ssh', 'id_rsa'), 'utf8');`
  _Remediation:_ Remove the read; if a plugin needs SSH access it should ask the
  user for a dedicated key path or delegate to the ssh agent.
  …
```

### Layer two — runtime guard

Hooked on `tools/pre-execute` and `tools/post-execute`.

**Before execution** the guard inspects the call and returns one of three actions: `block`, `ask` (escalate to the approval seam), or `warn` (record and continue). It covers destructive parameters, credential reads, SSRF destinations, sandbox escapes, persistence writes and exfiltration shapes.

The policy is graded rather than uniform: `rm -rf /`, disk writes, cloud metadata endpoints, `file:`/`gopher:` URLs, loopback infrastructure ports, encoded PowerShell and pipes into a shell are **blocked**; credential-file reads, private and internal addresses, a force-push and a bare `DROP DATABASE` are **escalated**, because they are frequently legitimate but must not happen unattended.

Matching runs over canonicalized *views* of the call, not the raw string:

| Written as | Still matched |
| --- | --- |
| `rm${IFS}-rf${IFS}/` | ✅ `$IFS` normalized |
| `r\m -rf /` | ✅ escapes decoded |
| `"rm" "-rf" "/"` | ✅ quotes removed |
| `echo cm0gLXJmIC8= \| base64 -d \| sh` | ✅ base64 unwrapped |
| `# rm -rf / is dangerous` | ✅ comments stripped first (not a command) |

**After execution** the guard inspects the result for leaked secrets and internal network detail. The default is **redact and continue** — blocking information the user asked for is hostile, and the model will often simply re-request it. A private key block is the exception and is withheld whole, since partial redaction leaves live key bytes in place.

### Tamper-evident log

Every decision is appended to an HMAC hash chain: `hash = HMAC-SHA256(key, canonical(entry))` with `entry.prev` set to the previous entry's hash. A MACed sidecar records the expected entry count and head hash, which is what makes *truncation* detectable — a bare chain cannot see it, because every prefix of a valid chain is itself valid.

`/security verify` reports the **first** sequence number where the log stopped being trustworthy, distinguishing an edited entry, a deleted or reordered entry, a corrupt line, a truncated log and a rewritten anchor.

```
$ /security verify
Audit chain verified: 412 entries, head 9f3c1a7e…

$ /security verify          # after someone edits the file
Audit chain verification FAILED
  entries: 412
  first untrustworthy sequence: 137
  reason: content of seq 137 does not match its recorded hash — the entry was edited
```

## Inventory

Verified by `npm run inventory`; the marketplace treats these as claims about the source and checks them.

| | Rules | Categories |
| --- | ---: | --- |
| Static audit — line rules | 60 | credential-access, network-callback, obfuscation, install-script, supply-chain, harness-abuse, persistence, privilege, exfiltration, prompt-injection, destructive |
| Static audit — correlation rules | 17 | package-level: credential read **plus** outbound sink, obfuscation **plus** callback, install hook **plus** network |
| Runtime guard — input rules | 61 | destructive, exfiltration, persistence, privilege, ssrf, credential-access, harness-abuse, sandbox-escape, secret-leak |
| Runtime guard — output rules | 20 | secret-leak, ssrf, harness-abuse |
| **Total** | **158** | |

Guard actions: **34 block**, **23 ask**, **4 warn**.

Surface: **4 tools** (`security_scan_audit`, `security_scan_status`, `security_scan_log`, `security_scan_verify`) and **1 command** (`/security audit|status|log|verify|rules`).

## Install

The npm name `dsh-security-scan` was verified free, so it is the intended publish target. Until it is published, install from the repository URL:

```sh
dsh plugin add https://github.com/OWNER/dsh-security-scan
```

`package.json` ships with an `OWNER` placeholder — replace it with the hosting account before publishing. [`docs/publishing.md`](docs/publishing.md) covers that step, the npm publish, and the rest of the marketplace submission checklist.

The name was changed from `dsh-security-gate` before release for a concrete reason: an **unrelated** plugin already occupies that name on npm, plus a third occupies `dsh-security-guard`. Publishing or installing under either of those would have handed you someone else's plugin, which is a poor look for a security tool in particular.

## Configuration

Every key is optional; the defaults are the enforcing ones. Unknown keys are **refused**, with the accepted values in the message — a typo in `guard.mode` that silently left the guard at its default would be the worst possible failure here.

```yaml
- insert:
    - id: security-scan
      name: dsh-security-scan
      config:
        guard:
          mode: enforce            # enforce | monitor | off
          rules:                   # per-rule overrides; '*'-suffixed keys match by prefix
            net.excessive-distinct-hosts: warn
            'persist.*': off
          allowedHosts: []         # exempt destinations, e.g. ['internal.example.com']
          allowedPaths: []         # exempt path prefixes
          requireAuditForInstall: false
        output:
          mode: enforce            # enforce | monitor | off
          rules:
            'leak.internal-ip': off
        install:
          blockAtOrBelow: D        # D | C | B | A — a grade at or below this is refused
          fetch: false             # allow auditing an https .tgz by downloading it
          autoAudit: []            # paths audited when the plugin loads
        log:
          dir: ~/.dsh/security-scan
          maxBytes: 4194304
          ttlMs: 86400000          # how long an audit record stays usable
```

**Start in `monitor` mode.** It records every decision without refusing anything, so you can read `/security status` and see which rules your own workflow trips before any call is blocked. A guard that blocks on its first day gets turned off on its first day.

Two environment variables matter:

- `DSH_SECURITY_SCAN_KEY` — 64 hex characters, used as the audit-log HMAC key instead of the on-disk `audit.key`. Moving the key out of the log directory raises the bar on tampering.
- Nothing else. The plugin reads no other environment variable.

## Zero runtime dependencies

The compiled output imports **only `node:` builtins** — verified on every CI run, and by `npm run inventory`:

```console
$ npm run inventory
Built output imports
  37 distinct module specifiers
  0 non-builtin: none
```

`dependencies` is empty and `peerDependencies` is **absent entirely** — including for official `@deepseek-ai/*` packages, which are normally declared as peers. The harness surface this plugin consumes is declared structurally in [`src/dsh.ts`](src/dsh.ts) instead of imported.

The package declares no install-time lifecycle scripts either, and CI fails the build if any of that changes.

For a plugin whose job is to shrink supply-chain surface, shipping a dependency tree would defeat the claim — and it would make the plugin itself the risk it exists to measure. [`docs/design.md`](docs/design.md) is honest about what that costs.

## Limits

Read [`SECURITY.md`](SECURITY.md) before relying on this. The short version:

- **A high grade is not a clean bill of health.** It means no rule fired over the bytes that were read. A partial scan or a binary payload is marked as such in the report.
- **A registry install is audited by name, not by content.** The scanner cannot see what npm or git will serve. Audits expire for that reason, and the refusal text says so rather than implying a guarantee it cannot make.
- **The chain proves tampering, not integrity.** Anyone holding both the log and the key can rebuild a consistent chain. The guarantee is that silent modification is impossible.
- **`monitor` protects nothing.** It records. That is its purpose.

## Development

```sh
npm ci --ignore-scripts
npm run typecheck
npm run build
npm test              # 143 unit + integration tests, then the adversarial smoke check
npm run smoke         # guard rules only: benign calls must stay clean, dangerous ones must not
npm run inventory     # the numbers quoted above, read from the code
```

`npm run smoke` is the adversarial pass and is deliberately separate from the unit tests: it runs the whole runtime catalog over calls that must be caught **and** calls that must not be, and fails on any false positive — a guard that cries wolf is a guard that gets disabled.

## License

MIT
