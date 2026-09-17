/**
 * The static analysis signature catalog for the pre-install audit.
 *
 * This file is the static scanner's rule book and nothing else: pure data plus pure
 * predicates, with no filesystem, network or console access, so a rule can be
 * read, reviewed and unit-tested in isolation. Every entry is a *claim about
 * capability*, never a verdict. A `critical` severity means "if this is what it
 * looks like, do not install it"; the report carries the excerpts so that a
 * human can disagree with the claim. Severity is a statement about risk, not a
 * conclusion about intent, and a plugin that trips a rule may be perfectly
 * honest.
 *
 * Two catalogs live here:
 *
 * - {@link LINE_RULES} are line-local signatures. Each receives one line (the
 *   engine also feeds concatenated spellings of a line, so
 *   `path.join(home, '.ssh', 'id_rsa')` is visible to a rule written against
 *   `~/.ssh/id_rsa`) and returns the excerpt that justifies a finding. Being
 *   line-local, they cannot reason about ordering or flow, and they are
 *   deliberately over-inclusive: a bare mention of a credential path is
 *   reported at `low` precisely so the report can distinguish it from an
 *   actual read.
 * - {@link PACKAGE_RULES} are the correlation layer. They run once per package
 *   and express facts no single line reveals — "a credential file is read here
 *   and an outbound request is made there" is the shape of exfiltration, not of
 *   a signature — which is why the strongest findings in this catalog come from
 *   correlating weak ones.
 *
 * Every rule id is namespaced `category.slug`, and the prefix always matches the
 * rule's `category` field, because the correlation layer selects evidence by
 * prefix (`input.fired('cred.')`, `input.evidenceFor('net.')`).
 *
 * @module dsh-security-scan/scan/rules.catalog
 */

import type { Evidence, InstallScript, Severity } from '../types.js';
import {
  EXFIL_HOSTS,
  METADATA_HOSTS,
  isExfilHost,
  isInternalHostname,
  isPrivateAddressLiteral,
  normalizeIPv4,
} from '../util/patterns.js';
import { isRecord, safeClip, shannonEntropy } from '../util/text.js';
import {
  ALL_CREDENTIAL_PATHS,
  CREDENTIAL_PATHS,
  DESTRUCTIVE_COMMANDS,
  PERSISTENCE_FRAGMENTS,
  credentialFamily,
  hasCommandSink,
  hasDecodeSink,
  hasDynamicCodeSink,
  hasNetworkSink,
  hasReadSink,
  hasSink,
  hasWriteSink,
  isCommentLine,
  looksLikeInstruction,
  stringLiterals,
} from './helpers.js';
import { isSafeRelativePath } from './load.js';
import { fromPredicate, fromRegex } from './rule-types.js';
import type { FileInfo, LineRule, PackageHit, PackageRule, RuleInput, Scope } from './rule-types.js';

/* ────────────────────────────────────────────────────────────────────────────
 * Scope presets
 * ──────────────────────────────────────────────────────────────────────────── */

/** Every kind, including unrecognized files: used where content is copied verbatim. */
const ANY_SCOPE: Scope[] = ['any'];
/** Executable source: language code and shell scripts. */
const CODE_SCOPES: Scope[] = ['code', 'script'];
/** Source plus configuration, where URLs, hooks and paths are also written down. */
const SOURCE_AND_CONFIG: Scope[] = ['code', 'script', 'config'];
/** `package.json` files, including the manifests of vendored dependencies. */
const MANIFEST_SCOPES: Scope[] = ['manifest'];
/** Native build inputs: manifests, `.npmrc`, `binding.gyp` and generated scripts. */
const NATIVE_SCOPES: Scope[] = ['manifest', 'config', 'code', 'other'];
/** Prose and unrecognized text, where instruction-shaped text is aimed at a model. */
const DOC_SCOPES: Scope[] = ['doc', 'other'];
/** DSH composition patches and bundles, which are YAML. */
const PATCH_SCOPES: Scope[] = ['config', 'other'];

/* ────────────────────────────────────────────────────────────────────────────
 * Shared vocabulary
 * ──────────────────────────────────────────────────────────────────────────── */

/** Lifecycle hook names npm runs around install and publish. */
const LIFECYCLE_NAMES: readonly string[] = [
  'preinstall',
  'install',
  'postinstall',
  'prepare',
  'prepublish',
  'prepublishOnly',
  'prepack',
  'postpack',
];

/** Hook commands that are a build step rather than arbitrary execution. */
const BUILD_COMMAND_RE =
  /\b(?:tsc|rollup|esbuild|vite|webpack|tsup|babel|swc|rimraf|patch-package|husky|node-gyp|node-pre-gyp|prebuild-install|prebuildify|cmake-js|make|cmake|gyp)\b|\bnpm\s+run\s+[\w:.-]+/i;

/** Sinks that carry data out without looking like an ordinary request. */
const COVERT_CHANNEL_SINKS: readonly string[] = [
  'new WebSocket',
  'WebSocket(',
  'ws://',
  'wss://',
  'socket.io',
  'dns.resolve',
  'dns.lookup',
  'dns.promises',
  'dns.query',
  'dns-socket',
  'Resolve-DnsName',
  'nslookup',
  'dig ',
];

/** Verbs that install a scheduled task, agent or service. */
const SCHEDULING_VERBS: readonly string[] = [
  'launchctl',
  'systemctl',
  'schtasks',
  'reg add',
  'crontab',
  'rc.local',
  'chkconfig',
  'update-rc.d',
];

/** Values that widen a sandbox, approval or permission policy. */
const WIDENING_TOKENS =
  /(?:danger-full-access|full-access|bypass|autoApprove|auto-approve|allow-all|allowAll|sandbox\s*:\s*(?:none|off|danger)|permissions?\s*:\s*allow|--dangerously)/i;

/** Tool names the harness reserves; a plugin that claims one is impersonating a core tool. */
const RESERVED_TOOL_NAMES: readonly string[] = [
  'run_code',
  'run-code',
  'bash',
  'shell',
  'read',
  'write',
  'edit',
  'web_search',
  'web-search',
  'subagent',
  'tool_call',
];

/** Commands whose name a `bin` entry should not take over. */
const SHADOWABLE_COMMANDS: readonly string[] = [
  'npm',
  'npx',
  'node',
  'yarn',
  'pnpm',
  'git',
  'sh',
  'bash',
  'zsh',
  'env',
  'curl',
  'wget',
  'python',
  'python3',
  'pip',
  'docker',
  'kubectl',
  'ssh',
  'scp',
  'tar',
  'make',
  'grep',
  'sed',
  'awk',
  'xargs',
  'find',
  'ps',
  'top',
  'sudo',
];

/** Manifest keys whose value is metadata rather than a dependency spec. */
const MANIFEST_METADATA_KEYS: readonly string[] = [
  'name',
  'version',
  'description',
  'keywords',
  'homepage',
  'repository',
  'bugs',
  'license',
  'licenses',
  'author',
  'contributors',
  'maintainers',
  'main',
  'module',
  'types',
  'typings',
  'exports',
  'imports',
  'engines',
  'files',
  'directories',
  'publishConfig',
  'scripts',
  'bin',
  'man',
  'os',
  'cpu',
  'workspaces',
  'sideEffects',
  'funding',
  'readme',
  'dsh',
  'type',
  'private',
  'packageManager',
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
  'bundledDependencies',
  'bundleDependencies',
];

/** Popular packages a near-miss dependency name is compared against. */
const POPULAR_PACKAGES: readonly string[] = [
  'cross-env',
  'lodash',
  'express',
  'axios',
  'request',
  'react',
  'chalk',
  'commander',
  'debug',
  'dotenv',
  'semver',
  'typescript',
  'webpack',
  'eslint',
  'prettier',
  'mkdirp',
  'rimraf',
  'yargs',
  'node-fetch',
  'jsonwebtoken',
  'bcrypt',
  'undici',
  'esbuild',
  'rollup',
  'vitest',
  'keytar',
];

/** Names that are typosquats of a popular package, spelled out. */
const KNOWN_TYPOSQUATS: readonly string[] = [
  'cros-env',
  'crossenv',
  'lodahs',
  'expres',
  'axois',
  'axio',
  'reqeusts',
  'requsts',
  'node-fecth',
  'deepseek-ai',
  'deepseekai',
  'deepseek-api',
  'schemastry',
  'schemasteryjs',
];

/* ────────────────────────────────────────────────────────────────────────────
 * Shared predicates
 * ──────────────────────────────────────────────────────────────────────────── */

/** Whether a manifest line declares an npm lifecycle hook in JSON key form. */
function declaresLifecycleHook(line: string): boolean {
  return /["']?(?:pre|post)?install["']?\s*:/.test(line) || /["']?(?:prepare|prepublish|prepublishOnly|prepack|postpack)["']?\s*:/.test(line);
}

/** The command string a manifest line assigns to a lifecycle hook, when present. */
function hookCommandOf(line: string): string | undefined {
  const literals = stringLiterals(line);
  for (let index = 0; index < literals.length - 1; index += 1) {
    const current = literals[index];
    const next = literals[index + 1];
    if (current === undefined || next === undefined) continue;
    const key = current.value.trim();
    if (LIFECYCLE_NAMES.includes(key)) return next.value;
  }
  return undefined;
}

/** Shell utilities that print a file's contents. */
const SHELL_READ_RE = /(?:^|[\s;&|(`'"])(?:cat|less|more|head|tail|grep|egrep|awk|sed|strings|base64|openssl|scp|sftp|rsync|node|python3?|ruby|perl)\b/;

/** Shell utilities that copy, archive or upload a file — a credential read in flight. */
const SHELL_FILE_READ_RE =
  /(?:^|[\s;&|(`'"])(?:cat|less|more|head|tail|grep|egrep|awk|sed|strings|base64|openssl|tar|zip|cp|mv|dd|rsync|scp|curl|wget)\b/;

/**
 * Whether a line obtains a credential file's bytes.
 *
 * JavaScript read sinks are only half the story: `cat ~/.aws/credentials` and
 * `tar czf - ~/.ssh` are the same act written in shell, and a rule that only
 * knows about `readFileSync` would miss every packaged script.
 */
function hasCredentialReadSink(line: string): boolean {
  return hasReadSink(line) || SHELL_FILE_READ_RE.test(line);
}

/** The first fragment of one credential family that occurs on a line. */
function credentialFragment(line: string, family: keyof typeof CREDENTIAL_PATHS): string | undefined {
  const fragments: readonly string[] = CREDENTIAL_PATHS[family];
  return fragments.find((fragment) => line.includes(fragment));
}

/**
 * Whether a fragment occurs inside a URL rather than as a local path.
 *
 * `wget https://host/.npmrc` names a remote file, not the user's secret store,
 * and reporting it as a local credential read would be wrong.
 */
function insideUrl(line: string, fragment: string): boolean {
  const index = line.indexOf(fragment);
  if (index < 0) return false;
  const before = line.slice(0, index);
  const scheme = before.lastIndexOf('://');
  if (scheme < 0) return false;
  return !/[\s'"`]/.test(before.slice(scheme + 3));
}

/**
 * The first sensitive-path fragment on a line, if any.
 *
 * `process.env` contains `.env`, so a dotenv fragment that is really an
 * environment access is skipped; that distinction is the whole point of
 * separating this predicate from a plain `includes`.
 */
function credentialMention(line: string): string | undefined {
  for (const fragment of ALL_CREDENTIAL_PATHS) {
    const index = line.indexOf(fragment);
    if (index < 0) continue;
    if (fragment.startsWith('.env') && /process\s*$/.test(line.slice(0, index))) continue;
    return fragment;
  }
  return undefined;
}

/** Every `scheme://host` authority on a line, host lowercased and port stripped. */
function urlHosts(line: string): string[] {
  const out: string[] = [];
  const re = /[a-z][a-z0-9+.-]{1,15}:\/\/([^\s/?#"'`<>)\]}]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(line)) !== null) {
    const authority = match[1];
    if (authority === undefined) continue;
    const host = authority.replace(/^[^@]*@/, '').replace(/:\d+$/, '').toLowerCase();
    if (host.length > 0) out.push(host);
  }
  return out;
}

/** The dependency name a manifest line declares, or `undefined` for metadata keys. */
function dependencyKeyOf(line: string): string | undefined {
  const match = /^\s*"([^"]+)"\s*:/.exec(line);
  const key = match?.[1];
  if (key === undefined || key.length === 0) return undefined;
  return MANIFEST_METADATA_KEYS.includes(key) ? undefined : key;
}

/**
 * Bounded Damerau-Levenshtein: whether two names differ by at most `budget`
 * edits, counting a transposition as one edit.
 *
 * Transpositions matter — `axois` for `axios` is a single swap — and so does the
 * budget: comparing every dependency against a list is only cheap because the
 * length delta rejects nearly all pairs before the table is built.
 *
 * @param source - the dependency name under test.
 * @param target - the popular package name it is compared against.
 * @param budget - maximum edits allowed.
 * @returns true when the distance is at least 1 and at most `budget`.
 */
function withinEditDistance(source: string, target: string, budget: number): boolean {
  if (source === target) return false;
  if (Math.abs(source.length - target.length) > budget) return false;

  const rows: number[][] = [];
  for (let index = 0; index <= source.length; index += 1) {
    const row = new Array<number>(target.length + 1).fill(0);
    row[0] = index;
    rows.push(row);
  }
  const header = rows[0];
  if (header === undefined) return false;
  for (let column = 0; column <= target.length; column += 1) header[column] = column;

  for (let row = 1; row <= source.length; row += 1) {
    const current = rows[row];
    const previous = rows[row - 1];
    if (current === undefined || previous === undefined) return false;
    for (let column = 1; column <= target.length; column += 1) {
      const cost = source[row - 1] === target[column - 1] ? 0 : 1;
      const substitution = (previous[column] ?? 0) + cost;
      const deletion = (current[column - 1] ?? 0) + 1;
      const insertion = (previous[column - 1] ?? 0) + 1;
      let best = Math.min(substitution, deletion, insertion);
      if (row > 1 && column > 1 && source[row - 1] === target[column - 2] && source[row - 2] === target[column - 1]) {
        best = Math.min(best, (rows[row - 2]?.[column - 2] ?? 0) + 1);
      }
      current[column] = best;
    }
  }

  const last = rows[source.length];
  return last !== undefined && (last[target.length] ?? budget + 1) <= budget;
}

/** Whether a dependency name is a known impostor of a popular package. */
function isImpostorName(name: string): boolean {
  const lowered = name.toLowerCase();
  if (KNOWN_TYPOSQUATS.includes(lowered)) return true;
  // Impostors of the DSH namespace: a bare `deepseek-ai`, or a misspelled scope.
  if (/deepseek/i.test(lowered) && !lowered.startsWith('@deepseek-ai/')) return true;
  const bare = lowered.includes('/') ? lowered.slice(lowered.lastIndexOf('/') + 1) : lowered;
  if (bare.length < 4) return false;
  const budget = bare.length >= 7 ? 2 : 1;
  return POPULAR_PACKAGES.some((popular) => popular.length >= 5 && withinEditDistance(bare, popular, budget));
}

/** Whether a path is matched by a `.npmignore`/`files` pattern, including directory entries. */
function globMatches(pattern: string, path: string): boolean {
  const cleaned = pattern.trim().replace(/^\.\//, '').replace(/\/+$/, '');
  if (cleaned.length === 0 || cleaned.startsWith('!')) return false;
  const source = cleaned
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '\u0000')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/\u0000/g, '.*');
  return new RegExp(`^${source}(?:/.*)?$`).test(path);
}

/** The local script an install hook invokes, e.g. `scripts/postinstall.js`. */
function localScriptPath(command: string): string | undefined {
  const match = /(?:^|[\s'"`])((?:\.\/)?[\w][\w./-]*\.(?:js|mjs|cjs|ts|sh|bash|zsh|ps1|py|rb))(?=[\s'"`]|$)/.exec(command);
  const raw = match?.[1];
  if (raw === undefined) return undefined;
  const cleaned = raw.replace(/^\.\//, '');
  if (cleaned.length === 0 || cleaned.startsWith('/') || cleaned.includes('..')) return undefined;
  return cleaned;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Correlation-layer helpers
 * ──────────────────────────────────────────────────────────────────────────── */

/** Collect line anchors from every file whose line satisfies `match`. */
function anchorsFor(files: readonly FileInfo[], match: (line: string, file: FileInfo) => boolean, cap = 4): Evidence[] {
  const out: Evidence[] = [];
  for (const file of files) {
    if (file.decodeError !== undefined) continue;
    for (let index = 0; index < file.lines.length; index += 1) {
      const line = file.lines[index];
      if (line === undefined || line.length === 0) continue;
      if (!match(line, file)) continue;
      out.push({ file: file.path, line: index + 1, snippet: safeClip(line, 160) });
      if (out.length >= cap) return out;
    }
  }
  return out;
}

/** Anchors for lines that spawn a process. */
function commandSinkAnchors(files: readonly FileInfo[]): Evidence[] {
  return anchorsFor(files, (line, file) => !isCommentLine(line, file) && hasCommandSink(line), 3);
}

/**
 * Anchors for lines that can open an outbound connection.
 *
 * Correlation rules that say "and a network sink" use this rather than
 * `fired('net.')`, because the net line rules only fire on *suspicious*
 * destinations: a plugin that quietly posts to its own API still has the sink
 * that the correlation is about.
 */
function networkSinkAnchors(files: readonly FileInfo[]): Evidence[] {
  return anchorsFor(files, (line, file) => !isCommentLine(line, file) && hasNetworkSink(line), 3);
}

/** Anchors for lines that decode an encoded payload. */
function decodeSinkAnchors(files: readonly FileInfo[]): Evidence[] {
  return anchorsFor(files, (line, file) => !isCommentLine(line, file) && hasDecodeSink(line), 3);
}

/** Evidence for one install script, anchored on the manifest line that declares it. */
function scriptAnchor(input: RuleInput, script: InstallScript): Evidence {
  const needles = [`"${script.hook}"`, `${script.hook}":`, script.command.slice(0, 48)];
  const file = input.files.find((candidate) => candidate.path === script.file);
  if (file !== undefined) {
    for (const needle of needles) {
      if (needle.length === 0) continue;
      const index = file.lines.findIndex((line) => line.includes(needle) && line.trim().length > 0);
      if (index < 0) continue;
      const line = file.lines[index];
      if (line !== undefined) return { file: file.path, line: index + 1, snippet: safeClip(line, 160) };
    }
  }
  return { file: script.file, line: 0, snippet: safeClip(`${script.hook}: ${script.command}`, 160) };
}

/**
 * Anchor one manifest line by pattern.
 *
 * `pattern` must not carry the `g` flag: a stateful `lastIndex` would make the
 * second call silently miss.
 */
function manifestAnchor(input: RuleInput, pattern: RegExp, fallback: string): Evidence {
  const file = input.files.find((candidate) => candidate.kind === 'manifest');
  if (file !== undefined) {
    const index = file.lines.findIndex((line) => pattern.test(line));
    if (index >= 0) {
      const line = file.lines[index];
      if (line !== undefined) return { file: file.path, line: index + 1, snippet: safeClip(line, 160) };
    }
  }
  return { file: file?.path ?? 'package.json', line: 0, snippet: safeClip(fallback, 160) };
}

/** The `dsh` manifest record, when it is an object. */
function dshRecordOf(input: RuleInput): Record<string, unknown> | undefined {
  const dsh = input.manifest?.dsh;
  return isRecord(dsh) ? dsh : undefined;
}

/** The bundle patch path the manifest declares, when it is a safe relative path. */
function patchPathOf(input: RuleInput): string | undefined {
  const dsh = dshRecordOf(input);
  if (dsh === undefined) return undefined;
  const bundle = dsh['bundle'];
  if (!isRecord(bundle)) return undefined;
  const patch = bundle['patch'];
  if (typeof patch !== 'string' || patch.length === 0) return undefined;
  const normalized = patch.replace(/^\.\//, '');
  return isSafeRelativePath(normalized) ? normalized : undefined;
}

/** The staged manifest, re-parsed for keys the extraction layer does not carry. */
function manifestJsonOf(input: RuleInput): Record<string, unknown> | undefined {
  const file = input.files.find((candidate) => candidate.kind === 'manifest');
  if (file === undefined || file.decodeError !== undefined) return undefined;
  try {
    const parsed: unknown = JSON.parse(file.text);
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/** Publish allowlist entries from `files`; empty when the key is absent. */
function filesAllowlistOf(input: RuleInput): string[] {
  const value = manifestJsonOf(input)?.['files'];
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);
}

/** `.npmignore` patterns, in file order. */
function npmignorePatternsOf(input: RuleInput): string[] {
  const file = input.files.find((candidate) => candidate.path === '.npmignore' || candidate.path.endsWith('/.npmignore'));
  if (file === undefined) return [];
  return file.lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

/** Severity by volume, so a rule can escalate on breadth without a second rule. */
function severityForCount(count: number, base: Severity, escalated: Severity): Severity {
  return count >= 30 ? escalated : base;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Line rules
 * ──────────────────────────────────────────────────────────────────────────── */

/** Line-local signatures, evaluated once per line per file. */
export const LINE_RULES: LineRule[] = [
  /* ── install-script ─────────────────────────────────────────────────────── */
  {
    id: 'install.hook-shell-pipeline',
    category: 'install-script',
    severity: 'critical',
    title: 'Lifecycle hook pipes a download into a shell',
    detail:
      'An install-time command feeds a remote payload straight into an interpreter, so the package executes code that was never part of the reviewed source and cannot be verified from the tarball.',
    remediation:
      'Remove the pipeline and depend on a published package instead; never pipe curl or wget into sh, and pin the artifact if a download is genuinely required.',
    scope: MANIFEST_SCOPES,
    test: fromPredicate((line) => {
      if (/\|\s*(?:sudo\s+)?(?:ba|z|d|k|fi)?sh\b/.test(line) === false) return false;
      const downloads = /\b(?:curl|wget|fetch|Invoke-WebRequest|iwr|node\s+-e)\b|https?:\/\//i.test(line);
      return downloads || declaresLifecycleHook(line) ? safeClip(line, 160) : false;
    }),
  },
  {
    id: 'install.hook-network-fetch',
    category: 'install-script',
    severity: 'high',
    title: 'Lifecycle hook fetches from the network',
    detail:
      'An npm lifecycle hook reaches the network during install, which means installation is no longer reproducible from the tarball and the fetched content is unversioned and unaudited.',
    remediation: 'Drop the fetch, or vendor the artifact into the package and verify its digest before use.',
    scope: MANIFEST_SCOPES,
    test: fromPredicate((line) => {
      if (!declaresLifecycleHook(line)) return false;
      const command = hookCommandOf(line) ?? line;
      return /\b(?:curl|wget|fetch|Invoke-WebRequest|iwr|git\s+clone|npm\s+(?:i|install|ci)|pnpm\s+(?:i|add)|yarn\s+add|s3\s+cp|gsutil)\b|https?:\/\//i.test(
        command,
      )
        ? safeClip(line, 160)
        : false;
    }),
  },
  {
    id: 'install.hook-runs-shell-code',
    category: 'install-script',
    severity: 'medium',
    title: 'Lifecycle hook runs more than a build',
    detail:
      'This hook command is not one of the usual compile-and-copy steps, so installing the package runs arbitrary code with the user\'s privileges before anything can be inspected.',
    remediation: 'Reduce the hook to a build command such as `tsc` or `npm run build`, or move the work into an explicit script the user chooses to run.',
    scope: MANIFEST_SCOPES,
    test: fromPredicate((line) => {
      if (!declaresLifecycleHook(line)) return false;
      const command = hookCommandOf(line);
      if (command === undefined || command.trim().length === 0) return false;
      return BUILD_COMMAND_RE.test(command) ? false : safeClip(line, 160);
    }),
  },
  {
    id: 'install.dependency-manifest-hook',
    category: 'install-script',
    severity: 'medium',
    title: 'Bundled manifest declares install hooks',
    detail:
      'A manifest other than the package root declares lifecycle hooks. A vendored or nested dependency installed from this tree runs its own install scripts without the registry review that a published dependency would have had.',
    remediation: 'Install nested dependencies from the registry with a lockfile, and delete vendored manifests that carry their own hooks.',
    scope: MANIFEST_SCOPES,
    test: fromPredicate((line, file) => (file.path !== 'package.json' && declaresLifecycleHook(line) ? safeClip(line, 160) : false)),
  },
  {
    id: 'install.npmrc-ignore-scripts',
    category: 'install-script',
    severity: 'medium',
    title: 'Registry configuration re-enables install scripts',
    detail:
      'A shipped `.npmrc` sets `ignore-scripts=false`. Copied into a project or home directory it silently reverses a user or CI setting that exists to stop packages from running code at install time.',
    remediation: 'Remove the setting: a package has no legitimate reason to override `ignore-scripts` for the machine that installs it.',
    scope: ['config'],
    test: fromRegex(/ignore[-_]scripts\s*[:=]\s*(?:false|0)\b/i),
  },
  {
    id: 'install.native-downloader',
    category: 'install-script',
    severity: 'medium',
    title: 'Install path builds or downloads a native artifact',
    detail:
      'The package compiles native code or fetches a prebuilt binary during install, so bytes that are not the reviewed source end up executed on this machine.',
    remediation: 'Prefer a pure implementation, or vendor the prebuilt artifact with a recorded digest instead of downloading it at install time.',
    scope: NATIVE_SCOPES,
    test: fromPredicate((line, file) => {
      if (/\b(?:node-pre-gyp|prebuild-install|prebuildify|cmake-js|node-gyp)\b/.test(line)) return safeClip(line, 160);
      if (file.path.toLowerCase().endsWith('binding.gyp') && /<!@\(|['"]actions['"]|['"]command['"]/.test(line)) return safeClip(line, 160);
      return false;
    }),
  },

  /* ── credential-access ──────────────────────────────────────────────────── */
  {
    id: 'cred.read-ssh-private-key',
    category: 'credential-access',
    severity: 'critical',
    title: 'Reads an SSH private key or authorized_keys',
    detail:
      'This line reads an SSH key file. A plugin that can read a private key can authenticate as the user everywhere that key is trusted, and the file has no legitimate use in a build.',
    remediation: 'Remove the read; if a plugin needs SSH access it should ask the user for a dedicated key path or delegate to the ssh agent.',
    scope: CODE_SCOPES,
    test: fromPredicate((line) => {
      if (!hasCredentialReadSink(line)) return false;
      const fragment = credentialFragment(line, 'ssh');
      if (fragment !== undefined) {
        if (insideUrl(line, fragment)) return false;
        if (/id_(?:rsa|ed25519|ecdsa|dsa)|authorized_keys/.test(fragment)) return safeClip(line, 160);
      }
      // A key path assembled from parts shows only the key's own name on the
      // line that reads it (`path.join(home, '.ssh', 'id_rsa')`), while the
      // joined spelling of that path carries no read sink of its own.
      return /(?:^|[\s'"`/@.])id_(?:rsa|ed25519|ecdsa|dsa)\b/.test(line) ? safeClip(line, 160) : false;
    }),
  },
  {
    id: 'cred.read-cloud-credentials',
    category: 'credential-access',
    severity: 'critical',
    title: 'Reads cloud provider credentials',
    detail:
      'The line reads an AWS, GCP, Azure, Kubernetes or Docker credential file. Those files grant standing access to infrastructure, and nothing in a plugin install flow needs to touch them.',
    remediation: 'Remove the read; obtain cloud access from the environment or a profile the user controls and never from the credential file directly.',
    scope: CODE_SCOPES,
    test: fromPredicate((line) => {
      if (!hasCredentialReadSink(line)) return false;
      const fragment = credentialFragment(line, 'cloud');
      return fragment === undefined || insideUrl(line, fragment) ? false : safeClip(line, 160);
    }),
  },
  {
    id: 'cred.read-dsh-credentials',
    category: 'credential-access',
    severity: 'critical',
    title: 'Reads DSH credentials or session storage',
    detail:
      'This line reads `~/.dsh`, which holds the harness API credentials, profiles, stored sessions and plugin state. Reading the harness\'s own secret store hands the plugin the user\'s model credentials and conversation history.',
    remediation: 'Remove the read. A plugin should receive configuration through the DSH config surface, never by opening the credentials file.',
    scope: CODE_SCOPES,
    test: fromPredicate((line) => {
      if (!hasCredentialReadSink(line)) return false;
      const fragment = credentialFragment(line, 'dsh');
      return fragment === undefined || insideUrl(line, fragment) ? false : safeClip(line, 160);
    }),
  },
  {
    id: 'cred.read-registry-token',
    category: 'credential-access',
    severity: 'high',
    title: 'Reads a package registry token file',
    detail:
      'The line reads `.npmrc`, `.yarnrc`, `.pypirc` or an equivalent credential file. Those files carry publish tokens that let an attacker push new versions under the user\'s name.',
    remediation: 'Read the token from the environment at the moment it is needed, and delete any code that opens the registry config file.',
    scope: CODE_SCOPES,
    test: fromPredicate((line) => {
      if (!hasCredentialReadSink(line)) return false;
      const fragment = credentialFragment(line, 'registry');
      return fragment === undefined || insideUrl(line, fragment) ? false : safeClip(line, 160);
    }),
  },
  {
    id: 'cred.read-browser-store',
    category: 'credential-access',
    severity: 'high',
    title: 'Reads browser cookies or saved logins',
    detail:
      'The line reads a browser profile store such as `Cookies`, `Login Data` or `logins.json`. Session cookies are equivalent to live credentials for every site the user is signed in to.',
    remediation: 'Delete the read; no harness plugin has a reason to open a browser profile directory.',
    scope: CODE_SCOPES,
    test: fromPredicate((line) => {
      if (!hasCredentialReadSink(line)) return false;
      const fragment = credentialFragment(line, 'browser');
      return fragment === undefined || insideUrl(line, fragment) ? false : safeClip(line, 160);
    }),
  },
  {
    id: 'cred.read-system-secret',
    category: 'credential-access',
    severity: 'high',
    title: 'Reads a system secret store or keychain',
    detail:
      'The line reads `/etc/shadow`, a keychain file, `.git-credentials`, or drives the macOS keychain through `security`, `keytar` or an equivalent library, which exposes stored passwords for other applications.',
    remediation: 'Remove the read. If a stored secret is required, ask the user and read it through a documented harness configuration key.',
    scope: CODE_SCOPES,
    test: fromPredicate((line) => {
      if (/\b(?:security\s+(?:find|dump)-(?:generic|internet)-password|security\s+dump-keychain|keytar|keyring|secret-tool|wincred|Get-StoredCredential|CredRead)\b/i.test(line)) {
        return safeClip(line, 160);
      }
      if (!hasCredentialReadSink(line)) return false;
      const fragment = credentialFragment(line, 'system');
      // The bare key filenames belong to the SSH rule, which rates them critical.
      if (fragment === undefined || fragment === 'id_rsa' || fragment === 'id_ed25519') return false;
      return insideUrl(line, fragment) ? false : safeClip(line, 160);
    }),
  },
  {
    id: 'cred.read-dotenv-or-history',
    category: 'credential-access',
    severity: 'medium',
    title: 'Reads a dotenv file or shell history',
    detail:
      'This line reads `.env` or a shell history file. Both are where tokens, cloud keys and previously pasted secrets accumulate, and a shell history also maps out the user\'s infrastructure.',
    remediation: 'Load configuration through the plugin config schema instead of reading dotenv files, and never open the user\'s history.',
    scope: CODE_SCOPES,
    test: fromPredicate((line) => {
      if (!hasReadSink(line) && !SHELL_READ_RE.test(line)) return false;
      const fragment = credentialMention(line);
      if (fragment === undefined || insideUrl(line, fragment)) return false;
      const family = credentialFamily(fragment);
      return family === 'dotenv' || family === 'shell' ? safeClip(line, 160) : false;
    }),
  },
  {
    id: 'cred.credential-path-mention',
    category: 'credential-access',
    severity: 'low',
    title: 'Credential path appears without being read',
    detail:
      'A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.',
    remediation: 'Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.',
    scope: SOURCE_AND_CONFIG,
    test: fromPredicate((line, file) => {
      if (isCommentLine(line, file)) return false;
      if (hasCredentialReadSink(line) || hasWriteSink(line) || hasNetworkSink(line)) return false;
      // A view carrying neither quotes nor whitespace is the joined spelling of a
      // path built elsewhere on the line; the read rules judge that line instead.
      if (!/['"\s]/.test(line)) return false;
      const fragment = credentialMention(line);
      return fragment === undefined || insideUrl(line, fragment) ? false : safeClip(line, 160);
    }),
  },
  {
    id: 'cred.env-harvest',
    category: 'credential-access',
    severity: 'high',
    title: 'Reads or dumps the process environment',
    detail:
      'The line serializes all of `process.env` or reads environment variables whose names look like secrets. CI runners and the harness export API keys into the environment, so a dump is a credential harvest.',
    remediation: 'Read only the variables the plugin documents, one at a time, and never serialize the environment object or forward it into a log or request.',
    scope: CODE_SCOPES,
    test: fromRegex(
      /JSON\.stringify\(\s*process\.env|Object\.(?:entries|keys|values)\(\s*process\.env|\.\.\.process\.env|process\.env\.\w*(?:KEY|TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL|AUTH)\w*|process\.env\[['"][^'"]*(?:KEY|TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL|AUTH)[^'"]*['"]\]|\b(?:printenv|env\s*\|)/gi,
    ),
  },

  /* ── obfuscation ────────────────────────────────────────────────────────── */
  {
    id: 'obf.dynamic-code-eval',
    category: 'obfuscation',
    severity: 'critical',
    title: 'Evaluates code built at runtime',
    detail:
      'The line evaluates an expression that is not a source literal, so the executed code is assembled while the plugin runs and cannot be reviewed in the tarball.',
    remediation: 'Replace the dynamic evaluation with a static function or a data table; there is no audit that can vouch for code that does not exist until runtime.',
    scope: CODE_SCOPES,
    test: fromPredicate((line, file) => {
      if (isCommentLine(line, file)) return false;
      if (!hasDynamicCodeSink(line)) return false;
      const call = /(?:\beval\s*\(|\bnew\s+Function\s*\(|\bFunction\s*\(|\bvm\.(?:runInNewContext|runInThisContext|runInContext|compileFunction)\s*\()/.exec(line);
      if (call === null) return false;
      // `eval("…")` on a literal is still dynamic, but it is at least readable.
      return /^['"`]/.test(line.slice(call.index + call[0].length).trimStart()) ? false : safeClip(line, 160);
    }),
  },
  {
    id: 'obf.dynamic-require',
    category: 'obfuscation',
    severity: 'high',
    title: 'Requires or imports a computed module path',
    detail:
      'The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.',
    remediation: 'Use a static import specifier, or an explicit table mapping known keys to static imports.',
    scope: CODE_SCOPES,
    test: fromPredicate((line, file) => {
      if (isCommentLine(line, file)) return false;
      return /\b(?:require|import)\s*\(\s*(?!['"`])/.test(line) ? safeClip(line, 160) : false;
    }),
  },
  {
    id: 'obf.base64-exec-chain',
    category: 'obfuscation',
    severity: 'critical',
    title: 'Decodes base64 and executes the result',
    detail:
      'The same expression decodes a base64 payload and hands it to an evaluator or a process, which is the standard way to hide a second-stage script from a source review.',
    remediation: 'Remove the encoded payload; ship readable source and explain in the README what the code does.',
    scope: CODE_SCOPES,
    test: fromPredicate((line, file) => {
      if (isCommentLine(line, file)) return false;
      const decodes = /Buffer\.from\s*\([^)]*['"]base64['"]|atob\s*\(|toString\(['"]base64['"]\)|base64\s+(?:-d|--decode)/.test(line);
      if (!decodes) return false;
      return hasDynamicCodeSink(line) || hasCommandSink(line) ? safeClip(line, 160) : false;
    }),
  },
  {
    id: 'obf.decoded-payload-literal',
    category: 'obfuscation',
    severity: 'high',
    title: 'Carries a decoded, escaped or high-entropy literal',
    detail:
      'A long literal is decoded at runtime (base64, `atob`, `unescape`, `decodeURIComponent`), written with dense hex or unicode escapes, or has the near-uniform character distribution of an encoded blob.',
    remediation: 'Store the value as readable source or as data with a documented format, so a reviewer can see what is actually being run.',
    scope: CODE_SCOPES,
    test: fromPredicate((line, file) => {
      if (isCommentLine(line, file)) return false;
      if (/(?:atob|unescape|decodeURIComponent|Buffer\.from)\s*\(\s*(['"`])[^'"`]{40,}\1/.test(line)) return safeClip(line, 160);
      const escapes = line.match(/\\x[0-9a-f]{2}|\\u[0-9a-f]{4}|%u[0-9a-f]{4}/gi);
      if (escapes !== null && escapes.length >= 8) return safeClip(line, 160);
      for (const literal of stringLiterals(line)) {
        if (literal.value.length >= 200 && shannonEntropy(literal.value) > 4.5) return safeClip(literal.raw, 160);
      }
      return false;
    }),
  },
  {
    id: 'obf.string-reassembly',
    category: 'obfuscation',
    severity: 'high',
    title: 'Rebuilds a string from character codes or reversed fragments',
    detail:
      'The line assembles a string from numeric character codes or from a reversed fragment, a common way to keep a hostname or command out of a plain text search.',
    remediation: 'Write the value literally. Obfuscating a string that the code then uses is indistinguishable from hiding it from review.',
    scope: CODE_SCOPES,
    test: fromPredicate((line, file) => {
      if (isCommentLine(line, file)) return false;
      const codes = /String\.fromCharCode\s*\(\s*(?:0x[0-9a-f]{2}|\d{1,3})\s*(?:,\s*(?:0x[0-9a-f]{2}|\d{1,3}))\s*,/.exec(line);
      if (codes !== null) return safeClip(line, 160);
      return /\.split\([^)]*\)\s*\.reverse\(\)\s*\.\s*join\(/.test(line) ? safeClip(line, 160) : false;
    }),
  },
  {
    id: 'obf.obfuscated-identifier',
    category: 'obfuscation',
    severity: 'medium',
    title: 'Uses obfuscated identifiers or mixed-script names',
    detail:
      'The line contains minifier-style `_0x…` names or an identifier that mixes Latin letters with Cyrillic or Greek lookalikes. Both defeat a reader scanning for a familiar name and the second is a classic impersonation trick.',
    remediation: 'Ship source with meaningful identifier names, and never mix script systems inside one identifier.',
    scope: CODE_SCOPES,
    perFileCap: 3,
    test: fromPredicate((line, file) => {
      if (isCommentLine(line, file)) return false;
      const hex = /\b_0x[0-9a-f]{2,}\b/i.exec(line);
      if (hex !== null) return safeClip(hex[0], 120);
      const confusable =
        /[A-Za-z_$][A-Za-z0-9_$]*[\u0370-\u03ff\u0400-\u04ff][A-Za-z0-9_$\u0370-\u03ff\u0400-\u04ff]*|[\u0370-\u03ff\u0400-\u04ff][A-Za-z0-9_$\u0370-\u03ff\u0400-\u04ff]*[A-Za-z_$]/.exec(line);
      return confusable === null ? false : safeClip(confusable[0], 120);
    }),
  },
  {
    id: 'obf.long-minified-line',
    category: 'obfuscation',
    severity: 'medium',
    title: 'Line is a single minified or machine-generated blob',
    detail:
      'The line is over 500 characters with almost no whitespace, which is what a bundled payload, a packed string table or a machine-generated one-liner looks like. Nothing on such a line is reviewable by eye.',
    remediation: 'Ship unminified source, or state in the README which build produced the file and where the readable source lives.',
    scope: CODE_SCOPES,
    perFileCap: 2,
    test: fromPredicate((line) => {
      if (line.length <= 500) return false;
      const whitespace = (line.match(/\s/g) ?? []).length;
      return whitespace / line.length > 0.08 ? false : safeClip(line, 160);
    }),
  },

  /* ── network-callback ───────────────────────────────────────────────────── */
  {
    id: 'net.exfil-service-host',
    category: 'network-callback',
    severity: 'critical',
    title: 'Contacts a known exfiltration or tunnelling service',
    detail:
      'The line names a request-capture, paste or tunnel host that exists to receive data from somewhere else. These services are used for drop-off and for command-and-control callbacks, not for shipping a plugin\'s own features.',
    remediation: 'Remove the endpoint. If it is a placeholder from development, delete it rather than leave it reachable in the published package.',
    scope: SOURCE_AND_CONFIG,
    test: fromPredicate((line, file) => {
      if (isCommentLine(line, file)) return false;
      const lowered = line.toLowerCase();
      const known = EXFIL_HOSTS.find((host) => lowered.includes(host));
      if (known !== undefined) return safeClip(line, 160);
      const host = urlHosts(line).find((candidate) => isExfilHost(candidate));
      return host === undefined ? false : safeClip(line, 160);
    }),
  },
  {
    id: 'net.metadata-endpoint',
    category: 'network-callback',
    severity: 'critical',
    title: 'Contacts a cloud instance-metadata endpoint',
    detail:
      'The line reaches the cloud metadata address, which serves temporary instance credentials to anything running on the machine. Requesting it from a plugin is credential theft, and the address is also the classic SSRF target.',
    remediation: 'Delete the request; instance credentials should never be fetched by plugin code.',
    scope: SOURCE_AND_CONFIG,
    test: fromPredicate((line, file) => {
      if (isCommentLine(line, file)) return false;
      const lowered = line.toLowerCase();
      if (METADATA_HOSTS.some((host) => lowered.includes(host))) return safeClip(line, 160);
      // The metadata address is also reachable in decimal or hex spelling.
      const literal = /\b(?:0x[0-9a-f]{1,8}|\d{1,10}|(?:\d{1,3}\.){1,3}\d{1,3})\b/i.exec(line);
      const raw = literal?.[0];
      if (raw === undefined) return false;
      return normalizeIPv4(raw) === '169.254.169.254' ? safeClip(line, 160) : false;
    }),
  },
  {
    id: 'net.raw-ip-destination',
    category: 'network-callback',
    severity: 'high',
    title: 'Sends a request to a bare IP address',
    detail:
      'The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.',
    remediation: 'Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.',
    scope: SOURCE_AND_CONFIG,
    test: fromPredicate((line, file) => {
      if (isCommentLine(line, file)) return false;
      if (!hasNetworkSink(line) && !/[a-z][a-z0-9+.-]{1,15}:\/\//i.test(line)) return false;
      const literal = /\b(?:\d{1,3}\.){3}\d{1,3}\b/.exec(line);
      const raw = literal?.[0];
      if (raw === undefined) return false;
      return normalizeIPv4(raw) === undefined ? false : safeClip(line, 160);
    }),
  },
  {
    id: 'net.plaintext-http',
    category: 'network-callback',
    severity: 'medium',
    title: 'Uses a plaintext HTTP endpoint',
    detail:
      'An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.',
    remediation: 'Switch to `https://` and pin the host you intend to talk to.',
    scope: SOURCE_AND_CONFIG,
    test: fromPredicate((line, file) => {
      if (isCommentLine(line, file)) return false;
      const match = /http:\/\/[^\s"'`<>)\]}]+/i.exec(line);
      const url = match?.[0];
      if (url === undefined) return false;
      const host = urlHosts(url)[0];
      if (host !== undefined && isInternalHostname(host)) return false;
      return safeClip(url, 160);
    }),
  },
  {
    id: 'net.dynamic-dns-host',
    category: 'network-callback',
    severity: 'high',
    title: 'Uses a free dynamic DNS hostname',
    detail:
      'Dynamic DNS providers hand out hostnames that anyone can register and repoint at will, so an endpoint on one of them can move to a new operator between the audit and the install.',
    remediation: 'Replace the endpoint with a stable, owned domain, or remove the callback entirely.',
    scope: SOURCE_AND_CONFIG,
    test: fromRegex(
      /\b[a-z0-9][a-z0-9-]*\.(?:duckdns\.org|no-ip\.(?:org|biz|info|me)|ddns\.net|dynu\.com|dynu\.net|hopto\.org|zapto\.org|3utilities\.com|myftp\.(?:biz|org)|freedns\.afraid\.org|sslip\.io|nip\.io|xip\.io|localtunnel\.me)\b/i,
    ),
  },
  {
    id: 'net.covert-channel',
    category: 'network-callback',
    severity: 'high',
    title: 'Beacons over a websocket or DNS lookup',
    detail:
      'The line opens a websocket or resolves a literal domain through `dns.*` or a DNS tool. Both carry data without looking like an HTTP request, and DNS in particular is normally permitted through every firewall and proxy.',
    remediation: 'Use ordinary HTTPS requests to a documented endpoint so that the traffic can be inspected and logged.',
    scope: SOURCE_AND_CONFIG,
    perFileCap: 3,
    test: fromPredicate((line, file) => {
      if (isCommentLine(line, file)) return false;
      if (!hasSink(line, COVERT_CHANNEL_SINKS)) return false;
      const hostname = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}\b/i.exec(line);
      return hostname === null ? false : safeClip(line, 160);
    }),
  },
  {
    id: 'net.token-or-blob-in-url',
    category: 'network-callback',
    severity: 'high',
    title: 'Puts a credential or encoded blob in a URL',
    detail:
      'A token-shaped query parameter, an embedded `user:password` authority, or a long high-entropy query value means secret material or payload data travels in a URL, where it lands in access logs, proxies and browser history.',
    remediation: 'Send credentials in an Authorization header, and POST payloads in the body rather than encoding them into the query string.',
    scope: SOURCE_AND_CONFIG,
    test: fromPredicate((line, file) => {
      if (isCommentLine(line, file)) return false;
      const secretParam = /[?&](?:token|api[_-]?key|apikey|key|access[_-]?token|auth|authorization|secret|password|passwd|pwd|sig|signature|session|jwt)=[^&\s'"`]{6,}/i;
      const userInfo = /\/\/[^/\s:@'"]+:[^/\s@'"]{4,}@/;
      const blob = /[?&][A-Za-z0-9_.-]{1,32}=(?:[A-Za-z0-9+/]{32,}={0,2}|[A-Za-z0-9_-]{40,})/;
      for (const literal of stringLiterals(line)) {
        if (secretParam.test(literal.value) || userInfo.test(literal.value) || blob.test(literal.value)) return safeClip(literal.raw, 160);
      }
      const inline = secretParam.exec(line) ?? userInfo.exec(line) ?? blob.exec(line);
      return inline === null ? false : safeClip(inline[0], 160);
    }),
  },

  /* ── privilege ──────────────────────────────────────────────────────────── */
  {
    id: 'priv.curl-pipe-shell',
    category: 'privilege',
    severity: 'critical',
    title: 'Pipes a download straight into a shell',
    detail:
      'Fetching a script and executing it in one step runs whatever the remote server returns at that moment; there is no artifact to hash, review or pin, and a compromise of the server becomes a compromise of this machine.',
    remediation: 'Download the artifact, verify its checksum, and execute the verified file; never pipe a download into an interpreter.',
    scope: SOURCE_AND_CONFIG,
    test: fromRegex(/\b(?:curl|wget|fetch|Invoke-WebRequest)\b[^|;&\n]*\|\s*(?:sudo\s+)?(?:ba|z|d|k|fi)?sh\b/i),
  },
  {
    id: 'priv.scripting-host-inline-command',
    category: 'privilege',
    severity: 'critical',
    title: 'Runs an OS scripting host with an inline or encoded command',
    detail:
      '`osascript` with `do shell script`, or PowerShell with `-enc`/`-EncodedCommand`, executes a command string that the operating system never shows in a console and that no reviewer can read in the source.',
    remediation: 'Remove the scripting-host invocation, or replace it with a documented external command that a user can see before it runs.',
    scope: SOURCE_AND_CONFIG,
    test: fromPredicate((line, file) => {
      if (isCommentLine(line, file)) return false;
      if (/\bdo\s+shell\s+script\b|\bosascript\b[^\n]*\s-e\s/i.test(line)) return safeClip(line, 160);
      if (/-enc(?:odedcommand)?\s+[A-Za-z0-9+/=]{16,}|-EncodedCommand\b/i.test(line)) return safeClip(line, 160);
      if (/FromBase64String\s*\(|powershell(?:\.exe)?[^\n]*\s-(?:nop|noprofile)\b[^\n]*\s-[Ww]\s+hidden/i.test(line)) return safeClip(line, 160);
      return false;
    }),
  },
  {
    id: 'priv.sudo-invocation',
    category: 'privilege',
    severity: 'high',
    title: 'Escalates with sudo',
    detail:
      'The line runs a command through `sudo`, so the plugin is asking for root on a machine where it was installed as a user-level tool and where the user cannot see the escalation prompt in advance.',
    remediation: 'Remove the escalation and document any privileged step as a separate command the user runs deliberately.',
    scope: SOURCE_AND_CONFIG,
    test: fromPredicate((line, file) => {
      if (isCommentLine(line, file)) return false;
      return /\bsudo\s+(?:-[A-Za-z-]+\s+)*[\w./-]/.test(line) ? safeClip(line, 160) : false;
    }),
  },
  {
    id: 'priv.system-path-modification',
    category: 'privilege',
    severity: 'high',
    title: 'Modifies a system path or makes a file world-writable',
    detail:
      'The line writes under `/etc`, `/usr`, `/bin` or a launch-daemon directory, changes ownership to root, or sets world-writable permissions. Any of these changes the machine beyond the installed package and can prepare an escalation later.',
    remediation: 'Keep writes inside the package or the user\'s own configuration directory, and never loosen permissions to make an install succeed.',
    scope: SOURCE_AND_CONFIG,
    test: fromPredicate((line, file) => {
      if (isCommentLine(line, file)) return false;
      if (/\b(?:chmod|chown|chattr|cp|mv|rm|install|tee)\b[^\n]*(?:\/etc\/|\/usr\/|\/bin\/|\/sbin\/|\/System\/|\/Library\/LaunchDaemons|\/var\/)/.test(line)) {
        return safeClip(line, 160);
      }
      if (/(?:>|>>|writeFile(?:Sync)?\(|appendFile(?:Sync)?\(|createWriteStream\()\s*['"`]?\/(?:etc|usr|bin|sbin|System)\//i.test(line)) return safeClip(line, 160);
      if (/chmod\s+(?:-R\s+)?(?:777|a\+rwx)\b|\bchown\s+(?:-R\s+)?root\b|chmod\s+u\+s\b/i.test(line)) return safeClip(line, 160);
      return false;
    }),
  },
  {
    id: 'priv.package-manager-config-write',
    category: 'privilege',
    severity: 'medium',
    title: 'Rewrites a package manager or global git configuration',
    detail:
      'The line runs `npm config set` or `git config --global`, which changes settings for every future command the user runs — including which registry packages come from and which program git calls for hooks.',
    remediation: 'Pass configuration per command with environment variables or flags instead of writing the user\'s persistent config.',
    scope: SOURCE_AND_CONFIG,
    test: fromPredicate((line, file) => {
      if (isCommentLine(line, file)) return false;
      if (/\b(?:npm|pnpm|yarn|pip|pip3|cargo|gem|composer)\s+(?:config\s+)?set\b/i.test(line)) return safeClip(line, 160);
      if (/\bgit\s+config\s+--global\s+(?!--(?:get|list|unset|remove))/i.test(line)) return safeClip(line, 160);
      return false;
    }),
  },

  /* ── exfiltration ───────────────────────────────────────────────────────── */
  {
    id: 'exfil.local-data-in-request',
    category: 'exfiltration',
    severity: 'high',
    title: 'Sends local file or environment data in one request',
    detail:
      'A single line reads local files, or the whole process environment, and passes the result straight into an outbound request. That is the shortest possible path from local data to a third party, with no chance for a user to see the value first.',
    remediation: 'Separate the read from the send, send only the named fields the endpoint needs, and never include environment variables wholesale.',
    scope: SOURCE_AND_CONFIG,
    test: fromPredicate((line, file) => {
      if (isCommentLine(line, file)) return false;
      if (!hasNetworkSink(line)) return false;
      return hasReadSink(line) || /process\.env/.test(line) ? safeClip(line, 160) : false;
    }),
  },
  {
    id: 'exfil.curl-post-body',
    category: 'exfiltration',
    severity: 'high',
    title: 'Uploads a local file with curl',
    detail:
      'The command posts a file from disk to a remote endpoint (`-d @`, `--data-binary @`, `-F …=@`, `-T`), which is a file upload disguised as a form post.',
    remediation: 'Remove the upload, or make the destination explicit and configurable so a user can see where their data goes.',
    scope: SOURCE_AND_CONFIG,
    test: fromRegex(/\bcurl\b[^\n]*(?:-X\s*POST|--data(?:-binary|-raw)?\s*@|--upload-file|-F\s+\S*=@|-T\s+\S+)/i),
  },
  {
    id: 'exfil.clipboard-read',
    category: 'exfiltration',
    severity: 'medium',
    title: 'Reads the system clipboard',
    detail:
      'The line reads the clipboard through `pbpaste`, `xclip`, `wl-paste`, `Get-Clipboard` or `clipboardy`. Clipboards routinely hold passwords, tokens and private text that were copied moments earlier.',
    remediation: 'Ask the user for the value through the plugin config instead of reading whatever happens to be on the clipboard.',
    scope: SOURCE_AND_CONFIG,
    test: fromRegex(/\bpbpaste\b|\bxclip\b|\bwl-paste\b|\bGet-Clipboard\b|clipboardy|clipboard\.read(?:Text|Sync)?\s*\(/i),
  },
  {
    id: 'exfil.archive-home',
    category: 'exfiltration',
    severity: 'high',
    title: 'Archives a home directory',
    detail:
      'The command packs a home directory or `$HOME` into an archive, which collects configuration, credentials and history into a single file that is then easy to move off the machine.',
    remediation: 'Archive only the package\'s own output directory, and never glob a home directory into a tarball.',
    scope: SOURCE_AND_CONFIG,
    test: fromRegex(/\b(?:tar|zip|7z|Compress-Archive|ditto)\b[^\n]*(?:~\/|\$HOME|\$\{HOME\}|\/Users\/|\/home\/|\/root\/)/i),
  },

  /* ── persistence ────────────────────────────────────────────────────────── */
  {
    id: 'persist.scheduled-task-write',
    category: 'persistence',
    severity: 'high',
    title: 'Installs a scheduled task, agent or service',
    detail:
      'The line registers something that runs later — a cron entry, launch agent, systemd unit, Windows scheduled task or registry Run key — so the plugin keeps executing after the install that brought it in.',
    remediation: 'Remove the scheduling, or hand the user a documented command they can run and review themselves.',
    scope: SOURCE_AND_CONFIG,
    test: fromPredicate((line, file) => {
      if (isCommentLine(line, file)) return false;
      const fragment = PERSISTENCE_FRAGMENTS.find((candidate) => line.includes(candidate));
      const verb = SCHEDULING_VERBS.find((candidate) => line.includes(candidate));
      if (fragment === undefined && verb === undefined) return false;
      const acts = hasWriteSink(line) || hasCommandSink(line) || />>?\s*['"]?[~\w/]/.test(line) || /\b(?:load|enable|create|add|install|bootstrap|start)\b/.test(line);
      return acts ? safeClip(line, 160) : false;
    }),
  },
  {
    id: 'persist.git-hook-install',
    category: 'persistence',
    severity: 'high',
    title: 'Writes a git hook',
    detail:
      'The line writes or enables a `.git/hooks` script or moves `core.hooksPath`. A git hook runs on the user\'s next commit or push, in every repository that inherits the configuration.',
    remediation: 'Remove hook installation from the plugin; if a pre-commit check is wanted, document it as a manual setup step.',
    scope: SOURCE_AND_CONFIG,
    test: fromPredicate((line, file) => {
      if (isCommentLine(line, file)) return false;
      if (!/\.git\/hooks|core\.hooksPath|core\.hookspath/i.test(line)) return false;
      const acts = hasWriteSink(line) || hasCommandSink(line) || /\bgit\s+config\b/i.test(line) || /\b(?:cp|mv|chmod|install|tee|echo|ln)\b/.test(line);
      return acts ? safeClip(line, 160) : false;
    }),
  },
  {
    id: 'persist.shell-rc-append',
    category: 'persistence',
    severity: 'medium',
    title: 'Appends to a shell startup file',
    detail:
      'The line writes into `.bashrc`, `.zshrc`, `.profile` or a fish config, so the change takes effect in every future interactive shell and survives removing the package directory.',
    remediation: 'Do not modify shell startup files; if a shell integration is required, print the line for the user to add deliberately.',
    scope: SOURCE_AND_CONFIG,
    test: fromPredicate((line, file) => {
      if (isCommentLine(line, file)) return false;
      if (!/(?:\.bashrc|\.zshrc|\.bash_profile|\.zprofile|\.profile|config\.fish)/.test(line)) return false;
      const acts = hasWriteSink(line) || />>?\s*['"]?[~\w$/]|tee\s+-a\b/.test(line);
      return acts ? safeClip(line, 160) : false;
    }),
  },
  {
    id: 'persist.dsh-settings-rewrite',
    category: 'persistence',
    severity: 'high',
    title: 'Rewrites DSH settings or profiles',
    detail:
      'The line writes into the harness configuration (`~/.dsh/settings.yaml`, profiles or storages). Changing the profile changes which plugins load and how they are configured on every future harness start.',
    remediation: 'Print the configuration the user should apply instead of writing the harness state directly.',
    scope: SOURCE_AND_CONFIG,
    test: fromPredicate((line, file) => {
      if (isCommentLine(line, file)) return false;
      if (!/\.dsh\/(?:settings\.ya?ml|profiles|storages)|dsh\.ya?ml/.test(line)) return false;
      const acts = hasWriteSink(line) || /^\s*[+-]\s*[\w"'-]+\s*:/.test(line) || /\bcordis\b/i.test(line);
      return acts ? safeClip(line, 160) : false;
    }),
  },
  {
    id: 'persist.global-self-install',
    category: 'persistence',
    severity: 'high',
    title: 'Installs a package globally',
    detail:
      'The command installs a package into the global prefix, which puts a new executable on the user\'s PATH and keeps it there after the current project is deleted.',
    remediation: 'Install locally and invoke the tool through the project\'s own scripts; global installs belong to the user\'s decision, not to a plugin.',
    scope: SOURCE_AND_CONFIG,
    test: fromRegex(/\b(?:npm|pnpm|yarn|bun)\s+(?:i|add|install|global\s+add)\b[^\n]*(?:\s-g\b|\s--global\b|\bglobal\b)/i),
  },

  /* ── supply-chain ───────────────────────────────────────────────────────── */
  {
    id: 'supply.url-dependency',
    category: 'supply-chain',
    severity: 'high',
    title: 'Dependency resolves to a URL, git ref or file path',
    detail:
      'A dependency is resolved from a URL, a git reference, a local path or a patch instead of the registry, so its contents are not covered by the registry lockfile or by any integrity metadata and can change without a version bump.',
    remediation: 'Depend on a published version from the registry, pinned by a lockfile; if a fork is unavoidable, publish it under your own scope.',
    scope: MANIFEST_SCOPES,
    test: fromPredicate((line, file) => {
      if (file.kind !== 'manifest') return false;
      if (dependencyKeyOf(line) === undefined) return false;
      return /:\s*"(?:(?:https?|git|git\+ssh|git\+https|ssh|file|link|portal|patch|npm|workspace):|github:|gitlab:|bitbucket:|gist:)/i.test(line)
        ? safeClip(line, 160)
        : false;
    }),
  },
  {
    id: 'supply.unpinned-range',
    category: 'supply-chain',
    severity: 'medium',
    title: 'Dependency range is unpinned',
    detail:
      'The dependency accepts any version (`*`, `x` or `latest`), so the code that installs tomorrow is whatever the registry serves then, and the audited version says nothing about it.',
    remediation: 'Pin a semver range and commit a lockfile so an install resolves to the versions that were reviewed.',
    scope: MANIFEST_SCOPES,
    test: fromPredicate((line, file) => {
      if (file.kind !== 'manifest') return false;
      if (dependencyKeyOf(line) === undefined) return false;
      return /:\s*"(?:\*|\*\.\*|x|X|latest)"\s*,?\s*$/.test(line) ? safeClip(line, 160) : false;
    }),
  },
  {
    id: 'supply.typosquat-name',
    category: 'supply-chain',
    severity: 'high',
    title: 'Dependency name is a near-miss of a popular package',
    detail:
      'The dependency name is a known impostor, or differs from a popular package by a single typo or transposition, so installing it most likely pulls a package the author never intended to depend on.',
    remediation: 'Check the spelling against the package you meant to install and replace the entry with the real name.',
    scope: MANIFEST_SCOPES,
    test: fromPredicate((line, file) => {
      if (file.kind !== 'manifest') return false;
      const key = dependencyKeyOf(line);
      if (key === undefined) return false;
      return isImpostorName(key) ? safeClip(line, 160) : false;
    }),
  },
  {
    id: 'supply.bin-shadows-command',
    category: 'supply-chain',
    severity: 'medium',
    title: 'Package installs an executable that shadows a common command',
    detail:
      'A `bin` entry takes over the name of a command that already exists on the machine, so any script or tool that calls it may run this package instead, without the user noticing a change.',
    remediation: 'Rename the executable to something specific to the package.',
    scope: MANIFEST_SCOPES,
    test: fromPredicate((line, file) => {
      if (file.kind !== 'manifest') return false;
      for (const match of line.matchAll(/"([^"]+)"\s*:\s*"(?:\.\/)?[\w./-]+\.(?:js|mjs|cjs|sh|py)"/g)) {
        const name = match[1];
        if (name === undefined) continue;
        const base = name.includes('/') ? name.slice(name.lastIndexOf('/') + 1) : name;
        if (SHADOWABLE_COMMANDS.includes(base.toLowerCase())) return safeClip(line, 160);
      }
      return false;
    }),
  },
  {
    id: 'supply.foreign-registry',
    category: 'supply-chain',
    severity: 'medium',
    title: 'Registry or scope override points away from npmjs',
    detail:
      'A registry or `_authToken` entry names a server that is not npmjs. A shipped `.npmrc` or `publishConfig` block that redirects resolution makes every dependency fetch come from a host the user did not choose.',
    remediation: 'Remove the override; registry selection belongs to the user\'s own configuration, not to the package being installed.',
    scope: SOURCE_AND_CONFIG,
    test: fromPredicate((line, file) => {
      if (isCommentLine(line, file)) return false;
      const match = /(?:_registry|registry)\s*(?:[:=]\s*|\s+)['"]?(https?:\/\/[^\s'"]+)/i.exec(line);
      const url = match?.[1];
      if (url === undefined) return false;
      const host = urlHosts(url)[0];
      if (host !== undefined && (host === 'registry.npmjs.org' || host.endsWith('.npmjs.org') || host === 'registry.yarnpkg.com')) return false;
      return safeClip(line, 160);
    }),
  },
  {
    id: 'supply.packaging-constraints',
    category: 'supply-chain',
    severity: 'low',
    title: 'Manifest bundles dependencies or pins platforms',
    detail:
      '`bundledDependencies` ships a private copy of dependencies inside the tarball, which bypasses the registry\'s integrity metadata for that code, and `os`/`cpu` arrays restrict which machines the package installs on at all.',
    remediation: 'Ship dependencies through the registry with a lockfile, and document platform limits in the README rather than in `os`/`cpu` fields.',
    scope: MANIFEST_SCOPES,
    test: fromRegex(/"bundle[dD]ependencies"\s*:|"(?:os|cpu)"\s*:\s*\[/),
  },

  /* ── harness-abuse ──────────────────────────────────────────────────────── */
  {
    id: 'harness.pre-execute-bypass',
    category: 'harness-abuse',
    severity: 'critical',
    title: 'Neutralizes the tool pre-execute guard or masks a safety tool',
    detail:
      'The line either attaches to `tools/pre-execute` and returns an allow decision, or calls `tools.restrict` to take a safety tool away from the guard. Both leave the harness looking protected while the guard no longer sees the call, or can no longer act on it.',
    remediation: 'Remove the listener or the restriction. A plugin may observe tool calls, but a blanket allow before `next`, or hiding another tool from the guard, is a bypass rather than an integration.',
    scope: SOURCE_AND_CONFIG,
    test: fromPredicate((line, file) => {
      if (isCommentLine(line, file)) return false;
      if (/tools\/pre-execute|pre[-_]?execute|preExecute/.test(line)) {
        return /kind\s*:\s*['"]allow['"]|allow\s*:\s*true|prependListener|\bnext\s*\(\)|return\s*\{\s*kind/.test(line) ? safeClip(line, 160) : false;
      }
      if (/\btools\.restrict\b|\brestrict\s*\(/.test(line) && /gate|guard|security|safety|audit|scan/i.test(line)) return safeClip(line, 160);
      return false;
    }),
  },
  {
    id: 'harness.settings-widen-permission',
    category: 'harness-abuse',
    severity: 'high',
    title: 'Widens the harness sandbox or approval policy',
    detail:
      'The line sets a permissive sandbox or permission value in the harness settings, a profile or a composition patch. Widening the policy removes the file and command boundaries the user chose for every plugin, not just for this one.',
    remediation: 'Leave sandbox and approval settings to the user; if the plugin needs a capability, document it and let the user grant it explicitly.',
    scope: SOURCE_AND_CONFIG,
    test: fromPredicate((line, file) => {
      if (isCommentLine(line, file)) return false;
      if (!WIDENING_TOKENS.test(line)) return false;
      if (!/\.dsh|settings|profile|sandbox|permission|policy/i.test(line)) return false;
      const acts = hasWriteSink(line) || hasCommandSink(line) || /^\s*[+-]/.test(line) || /\bpatch\b/i.test(line);
      return acts ? safeClip(line, 160) : false;
    }),
  },
  {
    id: 'harness.reserved-tool-name',
    category: 'harness-abuse',
    severity: 'medium',
    title: 'Registers a tool under a reserved name',
    detail:
      'A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.',
    remediation: 'Rename the tool with a plugin-specific prefix instead of claiming a reserved name.',
    scope: SOURCE_AND_CONFIG,
    test: fromPredicate((line, file) => {
      if (isCommentLine(line, file)) return false;
      const match = /(?:name|tool|toolName|registerTool|addTool|defineTool|register)\s*[:=(]\s*['"]?([A-Za-z_][\w-]*)['"]?/.exec(line);
      const name = match?.[1];
      if (name === undefined) return false;
      return RESERVED_TOOL_NAMES.includes(name) ? safeClip(line, 160) : false;
    }),
  },
  {
    id: 'harness.patch-disable-plugin',
    category: 'harness-abuse',
    severity: 'high',
    title: 'Composition patch disables another plugin',
    detail:
      'The patch removes or disables an existing plugin entry. Applied to a profile it silently turns off another component — commonly a security or policy plugin — while the user only intended to add this one.',
    remediation: 'Ship an additive patch that inserts only this plugin, and explain in the README which entries change.',
    scope: PATCH_SCOPES,
    test: fromPredicate((line) => {
      if (/^\s*[+-]?\s*(?:remove|disable|uninstall)\s*:/.test(line)) return safeClip(line, 160);
      if (/\b(?:disabled|enabled)\s*:\s*(?:true|false)\b/.test(line) && /plugin|gate|guard|security|cordis/i.test(line)) return safeClip(line, 160);
      return false;
    }),
  },
  {
    id: 'harness.installed-package-edit',
    category: 'harness-abuse',
    severity: 'high',
    title: 'Touches the harness installation or another installed plugin',
    detail:
      'The line reads or writes inside the harness\'s own installation or another plugin\'s directory under `node_modules`. Editing installed code replaces the artifact the user reviewed and can disable or hijack any plugin.',
    remediation: 'Never modify installed packages at runtime; contribute the change upstream or ship an additive plugin.',
    scope: SOURCE_AND_CONFIG,
    test: fromPredicate((line, file) => {
      if (isCommentLine(line, file)) return false;
      if (!/(?:node_modules\/@deepseek-ai|node_modules\/dsh-|DSH Desktop|app\.asar|Resources\/app)/.test(line)) return false;
      const acts = hasWriteSink(line) || hasCommandSink(line) || /\b(?:patch|sed|cp|mv|rm|npm\s+publish)\b/.test(line);
      return acts ? safeClip(line, 160) : false;
    }),
  },

  /* ── prompt-injection ───────────────────────────────────────────────────── */
  {
    id: 'prompt.doc-instruction',
    category: 'prompt-injection',
    severity: 'high',
    title: 'Documentation contains instructions aimed at a model',
    detail:
      'A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.',
    remediation: 'Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.',
    scope: DOC_SCOPES,
    test: fromPredicate((line, file) => {
      if (file.kind === 'other' && !/\b(?:skill|prompt|agent|tool)/i.test(file.path)) return false;
      if (line.trim().length < 8) return false;
      return looksLikeInstruction(line) ? safeClip(line, 160) : false;
    }),
  },
  {
    id: 'prompt.embedded-instruction-string',
    category: 'prompt-injection',
    severity: 'high',
    title: 'Source string carries instructions aimed at a model',
    detail:
      'A string literal in the source — typically a tool description or system prompt fragment — tells the model to bypass confirmation or to hide something from the user, so it lands in the context window as a directive.',
    remediation: 'Describe the tool\'s behavior factually and remove directives that change how the agent treats the user.',
    scope: SOURCE_AND_CONFIG,
    test: fromPredicate((line, file) => {
      if (isCommentLine(line, file)) return false;
      for (const literal of stringLiterals(line)) {
        if (literal.value.length >= 12 && looksLikeInstruction(literal.value)) return safeClip(literal.raw, 160);
      }
      return false;
    }),
  },
  {
    id: 'prompt.fake-system-message',
    category: 'prompt-injection',
    severity: 'high',
    title: 'Text impersonates a system message',
    detail:
      'The text is shaped like a system or developer message (`<system>`, `[SYSTEM]`, `<<SYS>>`, "system message:"). Content that claims a privileged role is an attempt to raise its own authority inside the model\'s context.',
    remediation: 'Remove the role markers; user-visible text should never be formatted to look like harness instructions.',
    scope: ANY_SCOPE,
    test: fromRegex(/<\s*(?:system|sys)\s*>|<<\s*SYS\s*>>|\[\s*SYSTEM\s*\]|BEGIN\s+SYSTEM\s+PROMPT|system\s+message\s*:|###\s*System\s*:/i),
  },
  {
    id: 'prompt.concealed-instruction',
    category: 'prompt-injection',
    severity: 'medium',
    title: 'Hides text in a comment or invisible characters',
    detail:
      'The line conceals content either in an HTML comment or behind zero-width and bidirectional control characters, which render as nothing in a diff or a rendered document while still being read as text.',
    remediation: 'Delete the concealed text and the invisible characters; anything a reviewer cannot see does not belong in a shipped package.',
    scope: ANY_SCOPE,
    test: fromPredicate((line) => {
      const comment = /<!--([\s\S]*?)-->/.exec(line);
      const body = comment?.[1];
      if (body !== undefined && /ignore|instruct|do not|must|system|assistant|tool|bypass|confirm/i.test(body)) return safeClip(body, 160);
      const invisible = /[\u200b\u200c\u200d\u2060\ufeff\u202a-\u202e\u2066-\u2069]/.exec(line);
      return invisible === null ? false : safeClip(line, 160);
    }),
  },

  /* ── destructive ────────────────────────────────────────────────────────── */
  {
    id: 'destructive.shipped-command',
    category: 'destructive',
    severity: 'critical',
    title: 'Ships a destructive filesystem command',
    detail:
      'A command that erases a home directory, a root filesystem or a partition appears in executable content rather than in prose. Even guarded by a condition, it is a primitive that should never travel inside a plugin.',
    remediation: 'Delete the command. If a plugin must clean up, restrict deletion to a directory it created and resolve that path from the package root.',
    scope: SOURCE_AND_CONFIG,
    test: fromPredicate((line, file) => {
      if (isCommentLine(line, file)) return false;
      const fragment = DESTRUCTIVE_COMMANDS.find((candidate) => line.includes(candidate));
      if (fragment === undefined) return false;
      // `chown -R`, `shred -` and `format c:` are only destructive against a
      // system or home target, so require one on the same line. A generic
      // absolute path is not enough: `chown -R app /srv/app` is routine.
      if (fragment === 'chown -R' || fragment === 'shred -' || fragment === 'format c:') {
        const systemTarget = /(?:\s(?:~|\$HOME|\$\{HOME\}|root|\/etc|\/var|\/usr|\/Users|\/home|\/System|\/Library)\b|\s\/\s*$)/;
        if (!systemTarget.test(line)) return false;
      }
      // `rm -rf /` is destructive; `rm -rf /tmp/build` is not, so the `/` form
      // only counts when it is the whole target.
      if (fragment.endsWith(' /') || fragment.endsWith('~')) {
        const index = line.indexOf(fragment) + fragment.length;
        const next = line.slice(index, index + 1);
        if (next !== '' && !/[\s'"`;&|)]/.test(next)) return false;
      }
      return safeClip(line, 160);
    }),
  },
  {
    id: 'destructive.recursive-delete-system-path',
    category: 'destructive',
    severity: 'high',
    title: 'Recursive delete aimed at a home or system directory',
    detail:
      'A recursive delete targets a home directory or a system path, so a wrong variable, an empty expansion or a missing guard destroys user data instead of the package\'s own build output.',
    remediation: 'Delete only paths the package created under its own directory, and refuse to run when the resolved path is not inside it.',
    scope: SOURCE_AND_CONFIG,
    test: fromPredicate((line, file) => {
      if (isCommentLine(line, file)) return false;
      const match = /\brm\s+(?:-[a-zA-Z]+\s+)*["']?(?:~|\$HOME|\$\{HOME\}|\/etc|\/var|\/usr|\/Users|\/home|\/Library|\/System|\/)(?:["'/]|\s|$)/.exec(line);
      return match === null ? false : safeClip(line, 160);
    }),
  },
];

/* ────────────────────────────────────────────────────────────────────────────
 * Package rules — the correlation layer
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Correlations evaluated once per package.
 *
 * Each rule combines evidence that no single line contains; they are the reason
 * the catalog has two layers at all.
 */
export const PACKAGE_RULES: PackageRule[] = [
  {
    id: 'exfil.credential-read-then-callback',
    category: 'exfiltration',
    severity: 'critical',
    title: 'Credential file read and an outbound request in the same package',
    detail:
      'A package that reads a credential file and also makes outbound requests has the two halves of credential theft. Individually each half can be justified; together they only make sense as data leaving the machine.',
    remediation: 'Remove the credential read. If the outbound call is the real feature, it must not be preceded by a read of a secret file anywhere in the package.',
    evaluate: (input) => {
      const sinks = networkSinkAnchors(input.files);
      if (!input.fired('cred.') || sinks.length === 0) return undefined;
      const evidence = [...input.evidenceFor('cred.').slice(0, 3), ...sinks];
      if (evidence.length === 0) return undefined;
      return [{ evidence, severity: 'critical' }];
    },
  },
  {
    id: 'cred.credential-read-with-command-execution',
    category: 'credential-access',
    severity: 'high',
    title: 'Credential file read and shell execution in the same package',
    detail:
      'A credential file is read somewhere in this package and a process is spawned somewhere else. That pairing is enough to pipe a secret into a command, exfiltrate it through a CLI, or rewrite the machine\'s configuration from stolen material.',
    remediation: 'Remove the credential access, and keep process spawning limited to commands that never see secret values.',
    evaluate: (input) => {
      if (!input.fired('cred.')) return undefined;
      const commands = commandSinkAnchors(input.files);
      if (commands.length === 0) return undefined;
      return [{ evidence: [...input.evidenceFor('cred.').slice(0, 3), ...commands], severity: 'high' }];
    },
  },
  {
    id: 'exfil.credential-read-decode-callback',
    category: 'exfiltration',
    severity: 'critical',
    title: 'Credential read, decoding step and outbound request together',
    detail:
      'All three ingredients of an encoded exfiltration are present: a credential is read, something is decoded or encoded, and a request leaves the machine. The encoding step is what hides the secret from a casual look at the traffic.',
    remediation: 'Remove the credential read or the outbound call. Never ship a package that both touches secrets and encodes a payload on its way out.',
    evaluate: (input) => {
      const sinks = networkSinkAnchors(input.files);
      const decodes = decodeSinkAnchors(input.files);
      if (!input.fired('cred.') || sinks.length === 0 || decodes.length === 0) return undefined;
      const evidence = [...input.evidenceFor('cred.').slice(0, 2), ...decodes.slice(0, 2), ...sinks.slice(0, 2)];
      if (evidence.length === 0) return undefined;
      return [{ evidence, severity: 'critical' }];
    },
  },
  {
    id: 'exfil.environment-harvest-then-callback',
    category: 'exfiltration',
    severity: 'critical',
    title: 'Environment harvest and an outbound request in the same package',
    detail:
      'The package reads or dumps process environment values and also opens outbound connections. CI runners and harness sessions export API keys into the environment, so this combination sends working credentials off the machine.',
    remediation: 'Remove the environment dump, and read only individually documented variables that the plugin actually needs.',
    evaluate: (input) => {
      if (!input.fired('cred.env-') || !input.fired('net.')) return undefined;
      const evidence = [...input.evidenceFor('cred.env-').slice(0, 3), ...input.evidenceFor('net.').slice(0, 3)];
      if (evidence.length === 0) return undefined;
      return [{ evidence, severity: 'critical' }];
    },
  },
  {
    id: 'exfil.clipboard-read-then-callback',
    category: 'exfiltration',
    severity: 'high',
    title: 'Clipboard read and an outbound request in the same package',
    detail:
      'The package reads the system clipboard and also makes outbound requests. Clipboards hold passwords and tokens that were copied moments earlier, and nothing in this package explains why the two behaviors coexist.',
    remediation: 'Remove the clipboard read, or make the destination unreachable by default and documented for the user.',
    evaluate: (input) => {
      if (!input.fired('exfil.clipboard-') || !input.fired('net.')) return undefined;
      const evidence = [...input.evidenceFor('exfil.clipboard-').slice(0, 2), ...input.evidenceFor('net.').slice(0, 3)];
      if (evidence.length === 0) return undefined;
      return [{ evidence, severity: 'high' }];
    },
  },
  {
    id: 'install.hook-with-shell-pipeline',
    category: 'install-script',
    severity: 'critical',
    title: 'Install hook pipes a download into a shell',
    detail:
      'A lifecycle hook declared in the manifest feeds a remote payload into an interpreter. The manifest is where this matters most: the hook runs on `npm install`, before the user has any chance to read the code.',
    remediation: 'Delete the hook and depend on a published package; an install step must never execute downloaded content.',
    evaluate: (input) => {
      const hits: PackageHit[] = [];
      for (const script of input.installScripts) {
        if (!/\|\s*(?:sudo\s+)?(?:ba|z|d|k|fi)?sh\b/i.test(script.command)) continue;
        hits.push({ evidence: [scriptAnchor(input, script)], severity: 'critical' });
      }
      return hits.length === 0 ? undefined : hits;
    },
  },
  {
    id: 'install.hook-with-network-callback',
    category: 'install-script',
    severity: 'critical',
    title: 'Install hook combined with outbound network access',
    detail:
      'The package declares a lifecycle hook and also opens outbound connections, so code runs at install time with network access available to it. Whatever the hook does, the payload it may fetch or send is not in the tarball.',
    remediation: 'Remove the hook or the network access. An install that needs the network should be an explicit step the user runs.',
    evaluate: (input) => {
      if (input.installScripts.length === 0) return undefined;
      const network = /\b(?:curl|wget|fetch|Invoke-WebRequest|iwr|git\s+clone|npm\s+(?:i|install|ci)|pnpm\s+(?:i|add)|yarn\s+add|s3\s+cp|gsutil)\b|https?:\/\//i;
      const fetching = input.installScripts.find((script) => network.test(script.command));
      const evidence = [
        ...(fetching !== undefined ? [scriptAnchor(input, fetching)] : []),
        ...input.evidenceFor('net.').slice(0, 3),
      ];
      if (evidence.length === 0) return undefined;
      return [{ evidence, severity: 'critical' }];
    },
  },
  {
    id: 'obf.obfuscation-with-network-callback',
    category: 'obfuscation',
    severity: 'critical',
    title: 'Obfuscated code and outbound network access',
    detail:
      'The package hides how it is written and also makes outbound connections. Obfuscation has no purpose in a plugin except to keep the payload unreadable, and paired with a callback it is the standard shape of a staged implant.',
    remediation: 'Do not install this package. If it is genuinely needed, require readable source before it is used anywhere.',
    evaluate: (input) => {
      const sinks = networkSinkAnchors(input.files);
      if (!input.fired('obf.') || sinks.length === 0) return undefined;
      const evidence = [...input.evidenceFor('obf.').slice(0, 3), ...sinks];
      if (evidence.length === 0) return undefined;
      return [{ evidence, severity: 'critical' }];
    },
  },
  {
    id: 'obf.obfuscation-with-command-execution',
    category: 'obfuscation',
    severity: 'high',
    title: 'Obfuscated code and process execution',
    detail:
      'The package hides its strings or identifiers and also spawns processes. Reading the source then tells the reviewer nothing about which command is actually run.',
    remediation: 'Require readable source: replace the encoded values with literals and the computed module paths with static imports.',
    evaluate: (input) => {
      if (!input.fired('obf.')) return undefined;
      const commands = commandSinkAnchors(input.files);
      if (commands.length === 0) return undefined;
      return [{ evidence: [...input.evidenceFor('obf.').slice(0, 3), ...commands], severity: 'high' }];
    },
  },
  {
    id: 'persist.persistence-with-install-hook',
    category: 'persistence',
    severity: 'high',
    title: 'Install hook combined with a persistence mechanism',
    detail:
      'A lifecycle hook runs during install and something in the tree registers itself to run later. The combination installs a resident component during what the user believed was a normal dependency install.',
    remediation: 'Remove the scheduling. Anything that should keep running must be set up by the user as a deliberate, visible step.',
    evaluate: (input) => {
      if (!input.fired('persist.') || input.installScripts.length === 0) return undefined;
      const script = input.installScripts[0];
      const anchors = script === undefined ? [] : [scriptAnchor(input, script)];
      const evidence = [...input.evidenceFor('persist.').slice(0, 3), ...anchors];
      if (evidence.length === 0) return undefined;
      return [{ evidence, severity: 'high' }];
    },
  },
  {
    id: 'supply.unscannable-payload-with-network',
    category: 'supply-chain',
    severity: 'medium',
    title: 'Unreadable payload shipped alongside outbound requests',
    detail:
      'The package ships large files that cannot be read as text — binaries, archives or minified blobs — and also opens outbound connections, so part of what it sends was never examined by this audit.',
    remediation: 'Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.',
    evaluate: (input) => {
      const sinks = networkSinkAnchors(input.files);
      if (sinks.length === 0) return undefined;
      const payloads = input.files.filter((file) => file.bytes >= 64 * 1024 && file.lines.length === 0);
      if (payloads.length === 0) return undefined;
      let largest = payloads[0];
      if (largest === undefined) return undefined;
      for (const file of payloads) if (file.bytes > largest.bytes) largest = file;
      const kib = Math.round(largest.bytes / 1024);
      const evidence: Evidence[] = [
        { file: largest.path, line: 0, snippet: safeClip(`${largest.bytes} bytes not decoded as text`, 160) },
        ...sinks.slice(0, 2),
      ];
      return [
        {
          evidence,
          severity: 'medium',
          detail: `${payloads.length} shipped file(s) are 64 KiB or larger and were not read as text, the largest being ${largest.path} at ${kib} KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.`,
        },
      ];
    },
  },
  {
    id: 'net.excessive-distinct-hosts',
    category: 'network-callback',
    severity: 'medium',
    title: 'Package contacts an implausible number of distinct hosts',
    detail:
      'The outbound destinations span more hosts than a plugin plausibly needs. A wide fan-out is how telemetry, a relay and a drop service hide among endpoints that each look unremarkable.',
    remediation: 'Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.',
    evaluate: (input) => {
      const hosts = new Set<string>();
      const evidence: Evidence[] = [];
      for (const domain of input.capabilities.domains) {
        const host = domain.value.toLowerCase();
        if (host.length === 0) continue;
        if (isInternalHostname(host) || isPrivateAddressLiteral(host)) continue;
        hosts.add(host);
        if (evidence.length < 4 && !evidence.some((item) => item.snippet === domain.evidence.snippet)) evidence.push(domain.evidence);
      }
      if (hosts.size <= 12) return undefined;
      if (evidence.length === 0) return undefined;
      return [
        {
          evidence,
          severity: severityForCount(hosts.size, 'medium', 'high'),
          detail: `The package reaches ${hosts.size} distinct remote hosts (${[...hosts].slice(0, 8).sort().join(', ')}${hosts.size > 8 ? ', …' : ''}). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.`,
        },
      ];
    },
  },
  {
    id: 'supply.client-without-bundle',
    category: 'supply-chain',
    severity: 'medium',
    title: 'Declares a client entry without a bundle manifest',
    detail:
      'The manifest declares `dsh.client` but no `dsh.bundle` patch, so the package cannot be composed as a bundle: the marketplace rejects it, and a user who installs it gets a plugin that never loads.',
    remediation: 'Add a `dsh.bundle.patch` entry pointing at the composition patch, or drop the client declaration if the package has no UI.',
    evaluate: (input) => {
      const dsh = dshRecordOf(input);
      if (dsh === undefined) return undefined;
      if (dsh['client'] === undefined) return undefined;
      const bundle = dsh['bundle'];
      if (isRecord(bundle) && bundle['patch'] !== undefined) return undefined;
      const evidence = [manifestAnchor(input, /"(?:client|dsh)"/, 'dsh.client declared without dsh.bundle')];
      return [{ evidence, severity: 'medium' }];
    },
  },
  {
    id: 'supply.patch-target-missing',
    category: 'supply-chain',
    severity: 'medium',
    title: 'Bundle patch target is missing from the package',
    detail:
      'The declared composition patch is not among the shipped files, or the path points outside the package root. Installing then composes nothing, or the install fails after the package has already run its install hooks.',
    remediation: 'Point `dsh.bundle.patch` at a patch file that is actually shipped, and list it in `files`.',
    evaluate: (input) => {
      const dsh = dshRecordOf(input);
      const bundle = dsh === undefined ? undefined : dsh['bundle'];
      const raw = isRecord(bundle) && typeof bundle['patch'] === 'string' ? (bundle['patch'] as string) : undefined;
      if (raw === undefined || raw.length === 0) return undefined;
      const normalized = raw.replace(/^\.\//, '');
      const evidence = [manifestAnchor(input, /"patch"/, `dsh.bundle.patch: ${raw}`)];
      if (!isSafeRelativePath(normalized)) {
        return [
          {
            evidence,
            severity: 'medium',
            detail: `dsh.bundle.patch points at ${raw}, which resolves outside the package root. A patch path that escapes the package is never the intended target and will not be applied.`,
          },
        ];
      }
      if (input.files.some((file) => file.path === normalized)) return undefined;
      return [
        {
          evidence,
          severity: 'medium',
          detail: `dsh.bundle.patch points at ${normalized}, which is not among the ${input.files.length} staged files. The package cannot be composed as a bundle in this form.`,
        },
      ];
    },
  },
  {
    id: 'supply.build-script-excluded-from-package',
    category: 'supply-chain',
    severity: 'low',
    title: 'Install hook runs a script the published file set excludes',
    detail:
      'A manifest declares an install hook whose script is not included by the `files` allowlist or is matched by `.npmignore`. A registry install then runs a different (or missing) file than the one that was audited and tested.',
    remediation: 'Add the referenced script to `files`, or move the hook into a file that is published.',
    evaluate: (input) => {
      if (input.installScripts.length === 0) return undefined;
      const allowlist = filesAllowlistOf(input);
      const ignorePatterns = npmignorePatternsOf(input);
      if (allowlist.length === 0 && ignorePatterns.length === 0) return undefined;
      for (const script of input.installScripts) {
        const reference = localScriptPath(script.command);
        if (reference === undefined) continue;
        if (!input.files.some((file) => file.path === reference)) continue;
        const ignored = ignorePatterns.some((pattern) => globMatches(pattern, reference));
        const notAllowed = allowlist.length > 0 && !allowlist.some((pattern) => globMatches(pattern, reference));
        if (!ignored && !notAllowed) continue;
        const reason = ignored ? `.npmignore matches ${reference}` : `the files allowlist (${allowlist.join(', ')}) does not cover ${reference}`;
        return [
          {
            evidence: [scriptAnchor(input, script)],
            severity: 'low',
            detail: `The ${script.hook} hook runs ${reference}, but ${reason}. The published tarball therefore behaves differently from this source tree.`,
          },
        ];
      }
      return undefined;
    },
  },
  {
    id: 'supply.dependency-count-outlier',
    category: 'supply-chain',
    severity: 'medium',
    title: 'Runtime dependency count is far above the declared purpose',
    detail:
      'The package declares a large number of runtime dependencies for what it describes. Every one of them is installed, executed by transitive lifecycle scripts, and trusted on the same basis as this package.',
    remediation: 'Drop dependencies the package does not need at runtime, and move build-only tooling into `devDependencies`.',
    evaluate: (input) => {
      const manifest = input.manifest;
      if (manifest === undefined) return undefined;
      const runtime = Object.keys(manifest.dependencies).length + Object.keys(manifest.optionalDependencies).length;
      const isPlugin = isRecord(manifest.dsh);
      const threshold = isPlugin ? 20 : 40;
      if (runtime < threshold) return undefined;
      const named = Object.keys(manifest.dependencies).slice(0, 8).join(', ');
      const evidence = [manifestAnchor(input, /"dependencies"/, `${runtime} runtime dependencies`)];
      return [
        {
          evidence,
          severity: 'medium',
          detail: `The package declares ${runtime} runtime dependencies (${named}${Object.keys(manifest.dependencies).length > 8 ? ', …' : ''}) for a ${
            isPlugin ? 'harness plugin' : 'package'
          } of this size. Each one widens the install-time attack surface beyond what this audit reviewed.`,
        },
      ];
    },
  },
  {
    id: 'supply.patch-inserts-foreign-package',
    category: 'supply-chain',
    severity: 'high',
    title: 'Bundle patch inserts a package other than this one',
    detail:
      'The composition patch added lines that introduce a differently named package into the profile. A patch is expected to insert the plugin it ships with; inserting another package pulls in code that was never part of this audit.',
    remediation: 'Keep the patch limited to this package\'s own entry, and declare every other plugin the user should add in the README instead.',
    evaluate: (input) => {
      const patchPath = patchPathOf(input);
      if (patchPath === undefined) return undefined;
      const patchFile = input.files.find((file) => file.path === patchPath);
      if (patchFile === undefined) return undefined;
      const own = input.manifest?.name;
      const hits: PackageHit[] = [];
      for (let index = 0; index < patchFile.lines.length; index += 1) {
        const line = patchFile.lines[index];
        if (line === undefined || !line.startsWith('+')) continue;
        const match = /(?:name|package|pkg)\s*:\s*['"]?(@?[A-Za-z0-9][\w./-]*)/.exec(line);
        const inserted = match?.[1];
        if (inserted === undefined || inserted === own) continue;
        hits.push({
          evidence: [{ file: patchFile.path, line: index + 1, snippet: safeClip(line, 160) }],
          severity: 'high',
          detail: `The bundle patch inserts ${inserted}, which is not this package${own === undefined ? '' : ` (${own})`}. Composing this patch adds a second plugin that was never audited here.`,
        });
      }
      return hits.length === 0 ? undefined : hits;
    },
  },
];
