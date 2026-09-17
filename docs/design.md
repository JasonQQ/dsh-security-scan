# Design

Why the plugin is shaped the way it is, and what each choice costs.

## The two layers are one idea

A plugin marketplace has a structural problem: the thing you install is code that
will run with your permissions, and the only signal you have before installing it
is a description someone else wrote. Auditing *before* install and guarding
*after* install are usually built as separate tools by separate people, which is
why they usually disagree — the auditor's idea of "dangerous" has nothing to do
with the guard's.

Here they share one vocabulary. `src/types.ts` defines severity, category and
finding; `src/util/patterns.ts` defines the secret shapes, the private address
ranges and the exfiltration hosts. The scanner asks "does this package *touch* a
credential path and *reach* the network?"; the guard asks "is this call *doing*
that right now?" Both read the same tables, so adding a secret shape in one place
teaches both layers about it.

## The scanner does not execute anything, and writes nothing

`src/scan/load.ts` reads a directory into memory, or parses a tarball in memory
with a bounded ustar reader. It never unpacks to disk.

This is not an optimisation. Auditing an untrusted artifact by unpacking it onto
the machine that is about to run it hands a malicious archive a path-traversal
write primitive before any check has run — the exact bug class the audit is
supposed to catch. It also means the scanner has no cleanup obligation and cannot
leave attacker-controlled files behind.

The reader drops entries that escape the archive root rather than sanitizing
them. An archive containing `../../etc/passwd` is itself the finding, and
normalizing the path would hide it.

Symlinks are skipped for the same reason: a link out of the tree would let the
scanned package make the scanner read files it never shipped.

## Rules are edges; the correlation layer is the point

A signature list can tell you a package contains `readFileSync` and that it
contains `fetch`. It cannot tell you the difference between a build tool that
reads a config file and posts telemetry, and a stealer that reads
`~/.ssh/id_rsa` and posts it to a webhook. Those two have the same signature
count.

So the catalog has two shapes (`src/scan/rule-types.ts`):

- **`LineRule`** — cheap, numerous, anchored to one line, returning the exact
  excerpt that justified a finding. The excerpt is what makes a report
  reviewable: a reader can disagree with a grade only if they can see what
  produced it.
- **`PackageRule`** — few, and evaluated once with visibility into what the line
  rules found. `exfil.read-then-post` is expressed as *the credential rule fired*
  and *the network rule fired*, which is a statement about the package that no
  single regex can make.

Package rules run second for exactly this reason. The pipeline is
extract → line rules → package rules → score.

## One line is not one spelling

```js
fs.readFileSync(path.join(os.homedir(), '.ssh', 'id_rsa'))
```

No token here is `~/.ssh/id_rsa`. A rule written against the literal path misses
it. So `lineViews()` presents each line to the rules in more than one form,
including a concatenation-joined one, and a finding is deduplicated across
spellings — the same violation written two ways is one violation.

The same reasoning drives `util/normalize.ts` on the runtime side. A guard
matching `rm -rf /` against the raw command string is bypassed by
`rm${IFS}-rf${IFS}/`, by `r\m -rf /`, by `"rm" "-rf" "/"`, and by
`echo cm0gLXJmIC8= | base64 -d | sh`. Rather than make every rule author think
about that, one module produces *views* — raw, escape-decoded, unquoted,
separator-normalized, base64- and hex-decoded — and rules match against the set.
The raw text is always view zero, so literal matching is still available.

## Redact on output, refuse on input

The two sides of the runtime guard are deliberately asymmetric.

On the **input** side the guard decides about an *action*. Refusing is cheap and
reversible: the model gets a reason and a fix, and tries something narrower.

On the **output** side the guard decides about *information*. If a user asks to
read a config file and the result is withheld, the honest outcome is that the
model asks again, or reads it another way, and the user is annoyed. Blocking
information is a worse trade than removing the specific thing that must not
travel. So the default is **redact and continue**: the secret never reaches the
transcript or the model, and the call still succeeds.

A private key block is the exception. Partial redaction of a PEM block leaves
live key bytes behind, so the whole result is withheld — the one case where
withholding is the only safe option.

Each text block is audited on its own rather than auditing the joined body and
slicing the redacted result back apart. Redaction changes lengths by design, so
slicing would misalign the moment a replacement happened.

## `monitor` exists because enforcement on day one fails

A guard that blocks on its first day gets turned off on its first day. A
deployment can run `guard.mode: monitor`, let every decision be recorded without
being refused, read `security_scan_log`, and learn which rules its own workflow
trips — then enforce with overrides already in hand.

## HMAC chain, and what it actually proves

`hash = HMAC-SHA256(key, canonical(entry))`, with `entry.prev` set to the
previous entry's hash. Editing any field invalidates that entry and everything
after it; deleting or reordering breaks the `prev` linkage.

A bare chain cannot see *truncation* — every prefix of a valid chain is a valid
chain. So a sidecar anchor records the expected entry count, head hash, and the
predecessor head, all under their own MAC. `verifyChain` checks the anchor's MAC,
its claimed count, each link, each recomputed hash, and the final head, and
reports the **first** sequence number that failed, distinguishing an edited
entry, a broken link, a corrupt line, a truncated log, and a rewritten anchor.

Canonicalization (`util/json.ts`) hashes the entry's own bytes, so serialization
must be byte-identical across runs: keys sorted, no insignificant whitespace,
non-finite numbers refused rather than coerced. A log that hashed a
whitespace-dependent serialization would break on the first refactor.

The honest limit: this is tamper **evidence**, not tamper **proof**. An attacker
holding both the log and the key can rebuild a consistent chain. The guarantee is
that silent modification is impossible. `SECURITY.md` says so in the same words,
and suggests moving the key out of the log directory.

## Zero runtime dependencies, and what it costs

The compiled output imports only `node:` builtins. `dependencies` is empty and
`peerDependencies` is absent — including for official `@deepseek-ai/*` packages.
CI fails the build if either changes.

For a plugin whose entire job is to reduce supply-chain surface, shipping a
dependency tree would defeat the claim, and it would make the plugin itself the
risk it exists to measure.

The costs are real and were paid deliberately:

- **No `schemastery`.** The harness's config convention is a schema object
  exported as `Config`. Cordis applies it automatically only when it is present
  (`resolveConfig` returns the raw value otherwise), so `src/config.ts` validates
  in plain code. In exchange, every rejection names the offending key *and* the
  accepted values, and unknown keys are refused — a typo in `guard.mode` that
  silently left the guard at its default would be the worst possible failure mode
  here.
- **No `dsh-tools`.** `defineTool` is a convenience that converts a schema DSL
  and validates arguments. `src/tools.ts` builds the same object shape directly
  with JSON Schema and validates in `execute`.
- **No parser.** The scanner is lexical: regex and light tokenization, not an
  AST. A full parser is a large dependency with its own supply chain, and every
  consumer here treats a match as *evidence of capability* rather than a resolved
  value. The trade shows up as false positives on exotic code, which the grade
  bands and `SECURITY.md` acknowledge.
- **No tar library.** `src/scan/load.ts` implements the ustar subset npm
  publishes, plus gzip through `node:zlib`.

`src/dsh.ts` is where that cost is visible: the parts of the Cordis context and
the tool registry the plugin touches, written as minimal *structural* interfaces.
They are structural on purpose — the harness's real objects satisfy them by
shape, a harness revision that adds fields keeps working, and a revision that
removes one fails at compile time here rather than at runtime in a user's
session.

## Where the install check runs

Auditing a plugin only matters if the audit stands between the package and the
machine. `src/install.ts` recognizes the commands that install something —
`dsh plugin add`, `npm i`, `pnpm add`, `yarn add`, `bun add` — anchored on a real
installer invocation, with specs read from the following tokens. A substring
check would fire on `grep -rn "npm install" README.md`.

The interesting case is a **local source**. `dsh plugin add ./some-plugin` names
bytes the scanner can read right now, so it audits the real artifact inline and
refuses on the real grade. For a registry spec the scanner can only bind a grade to
the name that was audited earlier, which is weaker, and the refusal text says so
rather than implying a guarantee it cannot make.

## Testing philosophy

- The guard and the scanner are tested **by decision, not by rule id**. "A call
  containing `rm -rf /` is blocked" stays meaningful when a rule is renamed or
  split; "rules 41, 42 and 43 fired" does not.
- Every obfuscation the normalizer handles has a test that a rule still fires
  through it.
- Every tampering shape the log claims to detect is tested by editing the file
  the way an attacker would, and asserting the verifier names the break. A
  tamper-evident log that is not tested against tampering is decoration.
- False-positive tests are treated as first-class: `ls -la`, `npm run build`,
  `git status`, `grep -rn "TODO" src/` and `node --test test/` must produce zero
  detections.
- Malicious fixtures are generated at run time, not committed. A checked-in file
  that reads `~/.ssh/id_rsa` and posts it to a webhook is indistinguishable, to a
  reviewer or a scanner, from the thing this plugin exists to catch.
