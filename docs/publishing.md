# Publishing checklist

Everything below is required before this repository can be submitted to
[awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin).
Each item is either something only the repository owner can do, or something the
marketplace's CI checks.

## 1. Required: replace the `OWNER` placeholder

`package.json` currently points at `https://github.com/OWNER/dsh-security-gate`.
Replace `OWNER` in the `repository`, `homepage` and `bugs` fields with the GitHub
account that will host the repository.

```sh
# from the repository root
sed -i '' 's|github.com/OWNER/|github.com/<your-handle>/|g' package.json
```

The marketplace entry in `marketplace/dsh-security-gate.yml` uses the same
placeholder and must match the real repository URL **exactly** — the CI job
fetches `package.json` from that URL and fails if `url` and `name` disagree with
the repository it points at.

## 2. Required: the npm name is taken

`dsh-security-gate` is **already published on npm by a different author**
(`ihuajiu/dsh-code-security`), and so is `dsh-plugin-gate`
(`863683348/dsh-plugin-gate`). Publishing this package under the same unscoped
name is impossible, and `dsh plugin add dsh-security-gate` would install the
*other* author's plugin — which is the last thing a security plugin should do.

Two supported options:

**Option A — publish under a scope (recommended).** Keep the repository name and
publish the package under your own scope:

```sh
npm pkg set name='@<your-scope>/dsh-security-gate'
```

Then update `marketplace/dsh-security-gate.yml`'s `tarball:` field if you attach
one, and add the scoped install command to both READMEs.

**Option B — do not publish to npm.** The marketplace only requires a repository
with a `dsh.bundle` manifest; the `tarball` field is optional. Users install from
the git URL:

```sh
dsh plugin add https://github.com/<your-handle>/dsh-security-gate
```

Attaching a prebuilt tarball to a GitHub Release is the better experience if you
choose this path, since it skips the `allowBuilds` approval step. If you do,
follow the marketplace rule about `latest/download/`: keep the asset name
**free of the version number**, or pin the release tag, otherwise the URL works
on submission day and 404s on your next release.

## 3. Required: repository topic

Add the `dsh-plugin` topic to the repository. The marketplace CI checks for it.

## 4. Required: repository age

The repository must be at least **1 day old** at the time of the pull request.
This is checked automatically and cannot be worked around. If you are just under
the bar, finish the work and resubmit — nothing is held against a resubmission.

## 5. Required: verify the description is accurate

The marketplace treats the entry's description as a claim about the code and
checks it against the source. Run the repository's own checks first:

```sh
npm ci --ignore-scripts
npm run typecheck
npm run build
node --test test/
```

Then confirm the numbers quoted in `README.md`, `README.zh.md` and
`marketplace/dsh-security-gate.yml` against reality:

```sh
node --test test/ 2>&1 | tail -20
node -e "import('./lib/guard/rules.catalog.js').then(m => console.log('guard', m.GUARD_RULES.length, 'output', m.OUTPUT_RULES.length))"
node -e "import('./lib/scan/rules.catalog.js').then(m => console.log('line', m.LINE_RULES.length, 'package', m.PACKAGE_RULES.length))"
```

If a count in the docs differs from what these print, fix the docs. Overstating
is the one thing that gets an otherwise-good plugin sent back.

## 6. The submission itself

Open one pull request adding one file, `data/plugins/<owner>__<repo>.yml`, copied
from `marketplace/dsh-security-gate.yml`. Do not edit either README in the
marketplace repository — they are generated from `data/plugins/*.yml`.

The `description.en` line contains a `: ` only if you introduce one; if you do,
quote the whole value or the YAML parser reads it as a nested key.

## 7. Optional: screenshots

Screenshots are declared in **this** repository, in a `screenshots.json` next to
`package.json`, listing 1–8 relative image paths. Absolute URLs must be https on
GitHub hosting. Nothing is required here; storefronts fall back to extracting
images from the README.
