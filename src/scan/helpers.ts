/**
 * Reusable predicates for rule authors.
 *
 * These exist so a rule reads as a statement about behavior (`reads a home
 * credential file`) rather than as a copy of a regular expression, and so the
 * sink tables have exactly one definition. When a new runtime is supported,
 * adding it here upgrades every rule that consults the table.
 *
 * @module dsh-security-scan/scan/helpers
 */

import type { FileInfo } from './rule-types.js';

/** Sensitive path fragments. Grouped so rules can cite the family they matched. */
export const CREDENTIAL_PATHS = {
  ssh: ['.ssh/id_rsa', '.ssh/id_ed25519', '.ssh/id_ecdsa', '.ssh/id_dsa', '.ssh/authorized_keys', '.ssh/config', '.ssh/known_hosts'],
  cloud: ['.aws/credentials', '.aws/config', '.config/gcloud', '.azure/accessTokens.json', '.kube/config', '.docker/config.json', '.netrc', '.pgpass'],
  registry: ['.npmrc', '.yarnrc', '.pypirc', '.gem/credentials', '.cargo/credentials', '.composer/auth.json'],
  /**
   * DSH's own secret-bearing files.
   *
   * `.dsh/profiles` and `.dsh/storages` are deliberately **absent**. They are
   * state directories — profiles hold plugin installs, storages hold domain data
   * — not credential stores, and listing them made every command that touched an
   * installed plugin look like credential access. Reading an installed plugin is
   * routine: it is what `/security audit <name>` does. Writes to either directory
   * are still caught, by the guard's harness-state rules, which own the state
   * question independently of this table.
   */
  dsh: ['.dsh/credentials.yaml', '.dsh/settings.yaml', '.dsh/sessions', 'credentials.yaml'],
  dotenv: ['.env', '.env.local', '.env.production', '.env.development', '.envrc'],
  browser: [
    'Login Data',
    'Cookies',
    'cookies.sqlite',
    'Local Storage',
    'key4.db',
    'logins.json',
    'Library/Application Support/Google/Chrome',
    'Library/Application Support/Firefox',
  ],
  system: ['/etc/passwd', '/etc/shadow', '/etc/sudoers', '/etc/hosts', 'Library/Keychains', '.keychain', 'login.keychain-db', '.git-credentials', 'id_rsa', 'id_ed25519'],
  shell: ['.bash_history', '.zsh_history', '.bashrc', '.zshrc', '.profile', '.bash_profile'],
} as const;

/** Every sensitive fragment, flattened, for a single containment test. */
export const ALL_CREDENTIAL_PATHS: readonly string[] = Object.values(CREDENTIAL_PATHS).flat();

/** The family a matched credential path belongs to, or `undefined`. */
export function credentialFamily(path: string): keyof typeof CREDENTIAL_PATHS | undefined {
  for (const [family, fragments] of Object.entries(CREDENTIAL_PATHS)) {
    if (fragments.some((fragment) => path.includes(fragment))) return family as keyof typeof CREDENTIAL_PATHS;
  }
  return undefined;
}

/** Sinks that read from the filesystem. */
export const FS_READ_SINKS: readonly string[] = [
  'readFile',
  'readFileSync',
  'createReadStream',
  'readdir',
  'readdirSync',
  'readlink',
  'statSync',
  'lstatSync',
  'openSync',
  'open(',
  'existsSync',
  'accessSync',
  'copyFileSync',
  'cpSync',
];

/** Sinks that write to, move, or delete filesystem entries. */
export const FS_WRITE_SINKS: readonly string[] = [
  'writeFile',
  'writeFileSync',
  'appendFile',
  'appendFileSync',
  'createWriteStream',
  'mkdirSync',
  'mkdir(',
  'rmSync',
  'rmdirSync',
  'unlinkSync',
  'unlink(',
  'renameSync',
  'truncateSync',
  'chmodSync',
  'chownSync',
  'symlinkSync',
  'copyFileSync',
  'cpSync',
  'utimesSync',
];

/** Sinks that spawn a process. */
export const COMMAND_SINKS: readonly string[] = [
  'child_process',
  'execSync',
  'execFileSync',
  'execFile',
  'spawnSync',
  'spawn(',
  'execa',
  'shelljs',
  'cross-spawn',
  'node:child_process',
  'Deno.Command',
  'Bun.spawn',
];

/** Sinks that open an outbound connection. */
export const NETWORK_SINKS: readonly string[] = [
  'fetch(',
  'https.request',
  'http.request',
  'https.get',
  'http.get',
  'axios',
  'got(',
  'node-fetch',
  'undici',
  'superagent',
  'request(',
  'net.connect',
  'net.createConnection',
  'tls.connect',
  'WebSocket',
  'new WebSocket',
  'EventSource',
  'dgram.createSocket',
  'dns.resolve',
  'dns.lookup',
  'dns.promises',
  'XMLHttpRequest',
  'sendBeacon',
];

/** Dynamic-code sinks that defeat static review. */
export const DYNAMIC_CODE_SINKS: readonly string[] = [
  'eval(',
  'new Function',
  'Function(',
  'vm.runInNewContext',
  'vm.runInThisContext',
  'vm.runInContext',
  'vm.compileFunction',
  'setTimeout("',
  'setInterval("',
  'setImmediate("',
  'vm2',
  'quickjs',
  'isolated-vm',
];

/** Encoded-payload sinks. */
export const DECODE_SINKS: readonly string[] = [
  "Buffer.from(",
  'atob(',
  'btoa(',
  'fromCharCode',
  'toString("base64")',
  "toString('base64')",
  'base64 -d',
  'base64 --decode',
  'fromhex',
  'unhexlify',
  'String.fromCharCode',
];

/** Command fragments that are destructive regardless of context. */
export const DESTRUCTIVE_COMMANDS: readonly string[] = [
  'rm -rf /',
  'rm -fr /',
  'rm -rf ~',
  'rm -rf /*',
  'rm -rf $HOME',
  'rm -rf --no-preserve-root',
  ':(){:|:&};:',
  'mkfs',
  'dd if=/dev/zero',
  'dd if=/dev/urandom of=/dev/',
  '> /dev/sda',
  'chmod -R 777 /',
  'chown -R',
  'shred -',
  'wipefs',
  'format c:',
];

/** Fragments that establish persistence. */
export const PERSISTENCE_FRAGMENTS: readonly string[] = [
  'crontab',
  '/etc/cron',
  'LaunchAgents',
  'LaunchDaemons',
  'systemd/system',
  '~/.bashrc',
  '~/.zshrc',
  '~/.profile',
  '.bash_profile',
  '.git/hooks',
  'rc.local',
  'authorized_keys',
  'schtasks',
  'reg add',
  'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
];

/** Whether a line carries any of the given sink markers. */
export function hasSink(line: string, sinks: readonly string[]): boolean {
  return sinks.some((sink) => line.includes(sink));
}

/** Whether a line opens an outbound connection. */
export function hasNetworkSink(line: string): boolean {
  return hasSink(line, NETWORK_SINKS);
}

/** Whether a line spawns a process. */
export function hasCommandSink(line: string): boolean {
  return hasSink(line, COMMAND_SINKS);
}

/** Whether a line reads the filesystem. */
export function hasReadSink(line: string): boolean {
  return hasSink(line, FS_READ_SINKS);
}

/** Whether a line writes the filesystem. */
export function hasWriteSink(line: string): boolean {
  return hasSink(line, FS_WRITE_SINKS);
}

/** Whether a line evaluates code built at runtime. */
export function hasDynamicCodeSink(line: string): boolean {
  return hasSink(line, DYNAMIC_CODE_SINKS);
}

/** Whether a line decodes an encoded payload. */
export function hasDecodeSink(line: string): boolean {
  return hasSink(line, DECODE_SINKS);
}

/**
 * Whether a line is a pure comment or blank.
 *
 * Used by rules that would otherwise report every URL in a license header.
 * Rules that *want* comments (documentation aimed at a model) simply ignore it.
 *
 * @param line - the raw line.
 * @param file - the file it came from, for language-appropriate markers.
 * @returns true when the line carries no executable content.
 */
export function isCommentLine(line: string, file: FileInfo): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0) return true;
  if (file.kind === 'code') {
    // `#` is deliberately absent here: JavaScript and TypeScript use it for
    // private class members, so `#count = 0` is a statement, not a comment.
    return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
  }
  if (file.kind === 'script' || file.kind === 'config') {
    if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return true;
    if (file.kind === 'config' && trimmed.startsWith(';')) return true;
    if (file.kind === 'script' && trimmed.startsWith('REM ')) return true;
  }
  return false;
}

/** One string literal found on a line. */
export interface StringLiteral {
  /** The literal's value, with quotes removed and escapes left as written. */
  value: string;
  /** The exact source text including quotes. */
  raw: string;
  /** Index of the literal within the line. */
  index: number;
}

/**
 * Extract string and template literal values from one line.
 *
 * Intentionally simple: this is a lexical scan for quoted runs, not a parser.
 * That is sufficient because every consumer treats the result as *evidence of
 * capability* rather than as a resolved value, and because a full parser is a
 * dependency this plugin does not take.
 *
 * @param line - the source line.
 * @returns the literals in source order, at most 32.
 */
export function stringLiterals(line: string): StringLiteral[] {
  const out: StringLiteral[] = [];
  const re = /(['"`])((?:\\.|(?!\1)[^\\\n])*)\1/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(line)) !== null) {
    out.push({ value: match[2] as string, raw: match[0], index: match.index });
    if (out.length >= 32) break;
  }
  return out;
}

/** Literals that look like a filesystem path rather than prose. */
export function looksLikePath(value: string): boolean {
  if (value.length === 0 || value.length > 512) return false;
  if (/[\s]/.test(value) && !/^[~./]/.test(value)) return false;
  if (value.startsWith('~') || value.startsWith('/') || value.startsWith('./') || value.startsWith('../')) return true;
  if (/^(?:[A-Za-z]:\\|\\)/.test(value)) return true;
  if (value.includes('/') && !value.includes('://')) return true;
  if (/^\.env/.test(value)) return true;
  return false;
}

/** Whether a literal is prompt text aimed at a model rather than data. */
export function looksLikeInstruction(value: string): boolean {
  const lowered = value.toLowerCase();
  return [
    'ignore previous',
    'ignore all previous',
    'disregard the above',
    'do not tell the user',
    "don't tell the user",
    'without asking the user',
    'without telling',
    'you are now',
    'system prompt',
    'as an ai assistant you must',
    'bypass',
    'override your instructions',
  ].some((marker) => lowered.includes(marker));
}

/**
 * Count how many distinct characters appear in a string.
 *
 * A cheap obfuscation signal: minified or machine-generated payloads use a
 * smaller alphabet per unit length than prose does.
 *
 * @param text - the string to measure.
 * @returns the number of distinct characters.
 */
export function distinctChars(text: string): number {
  return new Set(text).size;
}
