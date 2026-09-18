# Publishing checklist

Everything below is required before this repository can be submitted to
[awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin).
Each item is either something only the repository owner can do, or something the
marketplace's CI checks.

## 1. Done: the repository identity

`package.json` and the marketplace entry both point at
`https://github.com/JasonQQ/dsh-security-scan`, and the entry's `name` is
`JasonQQ/dsh-security-scan`. Nothing here needs editing before submitting — the
step is recorded because the CI job fetches `package.json` from that exact URL
and fails if the entry's `url` disagrees with it, so if the repository ever moves,
these three places move with it:

- `package.json` — `repository`, `homepage`, `bugs`
- `marketplace/JasonQQ__dsh-security-scan.yml` — `url`, `name`
- `cordis.patch.yml` — the inserted row's `name` (the package name, not the repo)

## 2. Required: publish to npm under a name that was actually free

The plugin was originally called `dsh-security-gate`. That name was **already
published on npm by an unrelated author** (`ihuajiu/dsh-code-security`), and a
third plugin occupied `dsh-security-guard`. Publishing under either would have
failed, and installing under either would have handed users someone else's
plugin — a particularly poor outcome for a security tool. Hence the rename to
`dsh-security-scan`.

That name was verified free on npm **and** free in the marketplace entry list at
the time of the rename:

```sh
# 404 means the name is available
curl -s -o /dev/null -w '%{http_code}\n' https://registry.npmjs.org/dsh-security-scan

# no entry ending in `__dsh-security-scan.yml` means no listing collision
curl -s https://api.github.com/repos/awesome-dsh-plugin/awesome-dsh-plugin/contents/data/plugins \
  | grep -c 'dsh-security-scan' || true
```

**Re-run both before publishing.** npm names are first-come and a free name today
is not a free name next month. If `dsh-security-scan` is taken by the time you
publish, pick another and change it in three places — `package.json`'s `name`,
`cordis.patch.yml`'s `name`, and the install line in both READMEs — plus the URL
and name fields of `marketplace/JasonQQ__dsh-security-scan.yml`.

To publish:

```sh
npm ci --ignore-scripts
npm run prepublishOnly     # clean, build, then typecheck + tests + smoke
npm publish                # publishConfig.access is already "public"
```

Publishing to npm is worth doing rather than installing from git: prebuilt
installs skip the `allowBuilds` build-approval step, and it gives the marketplace
entry a stable package name to point at.

**If you would rather not publish**, the marketplace only requires a repository
with a `dsh.bundle` manifest — the `tarball` field is optional, and users install
from the git URL:

```sh
dsh plugin add https://github.com/<your-handle>/dsh-security-scan
```

Attaching a prebuilt tarball to a GitHub Release is the better experience on that
path, since it also skips `allowBuilds`. If you do, follow the marketplace rule
about `latest/download/`: keep the asset name **free of the version number**, or
pin the release tag, otherwise the URL works on submission day and 404s on your
next release.

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
`marketplace/JasonQQ__dsh-security-scan.yml` against reality:

```sh
node --test test/ 2>&1 | tail -20
node -e "import('./lib/guard/rules.catalog.js').then(m => console.log('guard', m.GUARD_RULES.length, 'output', m.OUTPUT_RULES.length))"
node -e "import('./lib/scan/rules.catalog.js').then(m => console.log('line', m.LINE_RULES.length, 'package', m.PACKAGE_RULES.length))"
```

If a count in the docs differs from what these print, fix the docs. Overstating
is the one thing that gets an otherwise-good plugin sent back.

## 6. The submission itself

Open one pull request adding one file, `data/plugins/<owner>__<repo>.yml`, copied
from `marketplace/JasonQQ__dsh-security-scan.yml`. Do not edit either README in the
marketplace repository — they are generated from `data/plugins/*.yml`.

The `description.en` line contains a `: ` only if you introduce one; if you do,
quote the whole value or the YAML parser reads it as a nested key.

## 7. Optional: screenshots

Screenshots are declared in **this** repository, in a `screenshots.json` next to
`package.json`, listing 1–8 relative image paths. Absolute URLs must be https on
GitHub hosting. Nothing is required here; storefronts fall back to extracting
images from the README.
