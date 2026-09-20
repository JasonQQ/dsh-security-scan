/**
 * The runtime guard rule catalog.
 *
 * This module is pure data plus pure predicates: no I/O, no clock, no network.
 * It is the single place where "what the guard considers dangerous" is written
 * down, and it exists in two halves that run at different moments of a tool
 * call:
 *
 * - {@link GUARD_RULES} are **input rules**. They run *before* a tool executes,
 *   over canonicalized views of the call (raw / escape-decoded /
 *   shell-normalized / base64-decoded), and answer "should this happen?".
 * - {@link OUTPUT_RULES} are **output rules**. They run *after* a tool returns,
 *   over the result text, and answer "should this come back?". A `warn` output
 *   rule redacts the matched substring in place and lets the result through; a
 *   `block` output rule withholds the whole result.
 *
 * Both catalogs are keyed by a stable, namespaced rule id whose prefix matches
 * the rule's category (`destructive.rm-root`, `cred.read-credential-file`,
 * `ssrf.cloud-metadata`, …). **That id appears verbatim in the audit log**:
 * every detection written to `audit.log.jsonl` carries the id of the rule that
 * fired, so ids are part of the plugin's public, greppable vocabulary. Renaming
 * one rewrites history in the eyes of anyone reading an old log — add a new
 * rule instead, and leave the old id in place.
 *
 * Two matching conventions hold everywhere in this file:
 *
 * 1. Regexes are built once at module scope and never carry `lastIndex` state
 *    between calls. Global expressions are cloned with {@link globalRe} before
 *    use; non-global expressions are stateless by definition. This is the
 *    difference between a rule that works and one that silently stops matching
 *    on the second call.
 * 2. Input hits quote *canonical text* and are clipped with `safeClip`, which
 *    also redacts secret shapes — a guard that stores the credential it caught
 *    in its own log has made the problem worse. Output hits are the opposite:
 *    `matched` must be the exact substring the redactor will substitute, so
 *    output hits are never clipped, even when they are long.
 *
 * @module dsh-security-scan/guard/rules.catalog
 */

import type { Severity } from '../types.js';
import type { SecretPattern } from '../util/patterns.js';
import type { UrlParts } from '../util/normalize.js';
import type { GuardHit, GuardRule, OutputHit, OutputRule, ToolCallContext } from './rule-types.js';

import {
  DANGEROUS_SCHEMES,
  EXFIL_HOSTS,
  HOSTNAME_RE,
  INTERNAL_HOST_SUFFIXES,
  METADATA_HOSTS,
  SECRET_PATTERNS,
  isExfilHost,
  isInternalHostname,
  isPrivateAddressLiteral,
  normalizeIPv4,
} from '../util/patterns.js';
import { extractUrls, normalizePath, parseUrlParts } from '../util/normalize.js';
import { safeClip, shannonEntropy } from '../util/text.js';
import {
  ALL_CREDENTIAL_PATHS,
  DESTRUCTIVE_COMMANDS,
  PERSISTENCE_FRAGMENTS,
  credentialFamily,
} from '../scan/helpers.js';

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

/** Excerpt budget for an input hit. `matched` is quoted in a finding, so it stays short. */
const MATCH_LIMIT = 160;

/** Loopback ports whose services are infrastructure, not a local dev server. */
const LOOPBACK_SERVICE_PORTS: readonly number[] = [22, 2375, 2376, 3306, 5432, 6379, 9200, 11211, 27017];

/** Hosts a legitimate `scp`/`rsync` in a coding session talks to. */
const ALLOWED_REMOTE_HOSTS: readonly string[] = [
  'github.com',
  'ssh.github.com',
  'gitlab.com',
  'bitbucket.org',
  'localhost',
  '127.0.0.1',
];

/** Verb fragments that mean "this command talks to the network". */
const NETWORK_VERBS: readonly string[] = [
  'curl',
  'wget',
  'nc ',
  'ncat',
  'netcat',
  'scp ',
  'rsync',
  'socat',
  'ssh ',
  'dig ',
  'nslookup',
  'host ',
  'telnet',
  'fetch(',
  'http.request',
  'https.request',
  'requests.post',
  'requests.get',
  'axios',
  'urllib',
  'socket.connect',
];

/**
 * Mutating commands whose argument is the thing being mutated.
 *
 * Used with {@link hasWriteIntentNear}, which requires the command to be aimed
 * *at* the path rather than merely present nearby.
 */
const WRITE_COMMANDS: readonly string[] = [
  'rm',
  'rmdir',
  'mv',
  'cp',
  'chmod',
  'chown',
  'truncate',
  'touch',
  'tee',
  'shred',
  'ln',
  'sed',
  'unlink',
  'trash',
];

/** Mutating APIs whose argument is the target path. */
const WRITE_APIS: readonly string[] = [
  'writeFileSync',
  'writeFile',
  'appendFileSync',
  'appendFile',
  'createWriteStream',
  'unlinkSync',
  'unlink',
  'rmSync',
  'rmdirSync',
  'truncateSync',
  'chmodSync',
  'chownSync',
  'renameSync',
  'copyFileSync',
  'mkdirSync',
  'openSync',
  'utimesSync',
];

/**
 * Commands that read or ship a file's contents.
 *
 * Used with {@link hasReadIntentNear} so that naming a credential path is only a
 * finding when something actually reads it or sends it somewhere.
 */
const READ_COMMANDS: readonly string[] = [
  'cat',
  'bat',
  'less',
  'more',
  'head',
  'tail',
  'tac',
  'nl',
  'xxd',
  'od',
  'strings',
  'base64',
  'grep',
  'rg',
  'egrep',
  'awk',
  'cut',
  'sort',
  'uniq',
  'cp',
  'scp',
  'rsync',
  'tar',
  'zip',
  'gzip',
  'curl',
  'wget',
  'nc',
  'ncat',
  'socat',
  'openssl',
  'python',
  'python3',
  'node',
  'get-content',
  'gc',
  'type',
];

/** Reading APIs whose argument is the file. */
const READ_APIS: readonly string[] = [
  'readFileSync',
  'readFile',
  'createReadStream',
  'readdirSync',
  'readdir',
  'statSync',
  'openSync',
  'readSync',
  'copyFileSync',
  'cpSync',
];

/** Shell-rc files an append would persist code into. */
const SHELL_RC_FRAGMENTS: readonly string[] = [
  '.bashrc',
  '.zshrc',
  '.bash_profile',
  '.profile',
  '.zprofile',
  '.bash_login',
  'config.fish',
  '~/.profile',
];

/** Well-known package names a slopsquat or typosquat publishes under. */
const SHADOW_PRONE_PACKAGES: readonly string[] = [
  'react',
  'lodash',
  'express',
  'axios',
  'typescript',
  'chalk',
  'debug',
  'dotenv',
  'esbuild',
  'vite',
  'webpack',
  'eslint',
  'prettier',
  'node-fetch',
  'tslib',
  'zod',
  'commander',
  'request',
];

/** Destructive fragments that already have a dedicated rule, so the table fallback stays quiet. */
const COVERED_DESTRUCTIVE_FRAGMENTS: readonly string[] = [
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
];

/** Environment variables whose value is a live credential. */
const AWS_CREDENTIAL_VARS =
  '\\$\\{?(?:AWS_SECRET_ACCESS_KEY|AWS_SESSION_TOKEN|AWS_ACCESS_KEY_ID|AWS_SECURITY_TOKEN|GITHUB_TOKEN|GH_TOKEN|GITLAB_TOKEN|NPM_TOKEN|OPENAI_API_KEY|ANTHROPIC_API_KEY|DEEPSEEK_API_KEY|SLACK_TOKEN|DATABASE_URL|[A-Z_]*SECRET[A-Z_]*|[A-Z_]*TOKEN[A-Z_]*|[A-Z_]*API_KEY[A-Z_]*|[A-Z_]*PASSWORD[A-Z_]*)\\}?';

/** Obfuscated IPv4 in text form, e.g. `2130706433`, `0x7f000001`, `0177.0.0.1`. */
const RE_OBFUSCATED_IPV4 = /(?<![\w.])(?:0x[0-9a-f]{1,8}|[0-9a-f]{8}|0[0-7]{2,}|[0-9]{7,10})(?:\.[0-9a-f]{1,8}){0,3}(?![\w.])/i;

// ---------------------------------------------------------------------------
// Module-scope patterns
// ---------------------------------------------------------------------------

/** `rm -rf /`, `/*`, `~`, `$HOME` — the canonical mass-deletion spellings. */
/**
 * `rm -rf /`, `/*`, `~`, `~/`, `~/*`, `$HOME`, `$HOME/*` — the mass-deletion
 * spellings.
 *
 * The home-directory alternatives require the `~` or `$HOME` to be the *whole*
 * target, or to be followed by `/*`. Accepting a bare `/` lookahead made
 * `rm ~/.dsh/credentials.yaml` match `rm ~`: deleting one named file under the
 * home directory is an ordinary action, not a deletion of the home directory,
 * and reporting it as the latter blocks work for no gain.
 */
const RE_RM_ROOT =
  /\brm\b(?:\s+-[^\s]+)*\s+(?:\/(?=\s|$|\/|;|&|\|)|\/\*|~(?=\/?(?:[\s; &|*]|$))|\$HOME(?=\/?(?:[\s; &|*]|$))|\$\{HOME\}(?=\/?(?:[\s; &|*]|$)))/;

/** `rm -rf *`, `rm -rf .`, `rm -rf ..`, `rm -rf $UNSET` — a target the shell resolves. */
const RE_RM_BROAD =
  /\brm\b(?:\s+-[^\s]+)*\s+(?:\*|\.\/\*|\.\/|\.\.|\$[A-Za-z_][A-Za-z0-9_]*|\$\{[A-Za-z_][A-Za-z0-9_]*\})(?=\s|$|;|&|\|)/;

/**
 * Recursive delete whose target is a top-level system directory.
 *
 * This case is covered by neither {@link RE_RM_ROOT} (the target is not the
 * filesystem root) nor {@link RE_RM_BROAD} (the target is neither a glob nor a
 * variable), yet `rm -rf /etc` removes the configuration the machine boots with
 * and is no more recoverable than `rm -rf /`.
 *
 * The lookahead deliberately forbids a further path segment: `rm -rf /etc` and
 * `rm -rf /var/*` are caught, while `rm -rf /var/folders/xyz` — the macOS
 * per-user temporary directory, which a session may legitimately clear — is not.
 */
const RE_RM_SYSTEM_DIR =
  /\brm\b(?:\s+-[^\s]+)*\s+(?:\/(?:etc|usr|var|bin|sbin|lib|lib64|boot|opt|System|Library)\/?\*?(?=\s|$|;|&|\|)|[A-Za-z]:[\\/]+Windows(?=\s|$|;|&|\|))/i;

/**
 * PowerShell invoked with an encoded command.
 *
 * `-EncodedCommand` / `-enc` carries a base64 UTF-16LE payload, which is how a
 * one-liner hides what it actually runs. `-e` alone is not matched: it is
 * ambiguous with `-ExecutionPolicy`, and a rule that fired on ordinary
 * `powershell -ExecutionPolicy Bypass` calls would be turned off within a day.
 * The `FromBase64String` form is covered because it is the same trick spelled
 * out in full.
 */
const RE_POWERSHELL_ENCODED =
  /\b(?:powershell(?:\.exe)?|pwsh(?:\.exe)?)\b[^;|&\n]{0,120}?(?:\s-(?:enc|encodedcommand)\b|\[(?:System\.)?Convert\]::FromBase64String)/i;

/** `dd of=/dev/sda`, `> /dev/disk2`, `tee /dev/nvme0n1`. */
const RE_DISK_WRITE =
  /(?:\bof=\s*\/dev\/(?:sd|hd|vd|xvd|nvme|disk|rdisk|mmcblk)|\bdd\b[^;|&\n]{0,80}?\/dev\/(?:sd|hd|vd|xvd|nvme|disk|rdisk)|\b(?:>>?|tee\s+(?:-a\s+)?)\s*\/dev\/(?:sd|hd|vd|xvd|nvme|disk|rdisk)|\btruncate\b[^;|&\n]{0,60}?\/dev\/(?:sd|hd|disk|rdisk))/;

/** `mkfs.ext4`, `newfs_hfs`, `wipefs`, `blkdiscard`, `shred` of a system path. */
const RE_DISK_ERASE =
  /\b(?:mkfs(?:\.[a-z0-9]+)?|mke2fs|newfs(?:_[a-z0-9]+)?|wipefs|blkdiscard)\b|\bshred\b[^;|&\n]{0,80}?(?:\/dev\/\S+|\/(?:etc|usr|var|bin|sbin|boot|System|Library|Users|home)\S*)/;

/** Fork bomb, in the classic shell spelling and the Perl one-liner. */
const RE_FORK_BOMB = /:\(\s*\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:|\bperl\s+-e\b[^;|&\n]{0,40}\bfork\s+while\s+fork\b/;

/** `chmod -R 777 /`, `chmod 777 /*`, `chmod a+rwx /`. */
const RE_CHMOD_ROOT = /\bchmod\b(?:\s+-[^\s]+)*\s+(?:777|a\+rwx|ugo\+rwx)\s+(?:\/(?=\s|$|\*)|~\/(?=\s|$)|~(?=\s|$))/;

/** `chown -R root /`, `chown -R root:wheel /*`. */
const RE_CHOWN_ROOT = /\bchown\b(?:\s+-[^\s]+)*\s+(?:root(?::[A-Za-z0-9_-]+)?|0(?::0)?)\s+(?:\/(?=\s|$|\*)|~\/?(?=\s|$))/;

/** Redirects, copies and truncations that land on a critical `/etc` file. */
const RE_ETC_WRITE =
  /(?:(?:>>?|tee\s+(?:-a\s+)?)\s*\/etc\/(?:passwd|shadow|master\.passwd|sudoers|hosts|gshadow|group)|(?:>>?|tee\s+(?:-a\s+)?)\s*(?:\/private)?\/etc\/sudoers\.d\/\S+|\b(?:cp|mv|install|truncate|chmod|chown|rm|unlink)\b[^;|&\n]{0,60}?\/etc\/(?:passwd|shadow|master\.passwd|sudoers|hosts|gshadow)|\bsed\s+-i\b[^;|&\n]{0,60}?\/etc\/(?:passwd|shadow|sudoers|hosts))/;

/** A `git push` invocation; the kill decision is made in code, not in the regex. */
const RE_GIT_PUSH = /\bgit\s+push\b[^;|&\n]*/g;

/** Local history rewrite tools, which destroy the reflog's ability to recover work. */
const RE_GIT_HISTORY_REWRITE =
  /\bgit\s+(?:filter-branch|filter-repo)\b|\bgit\s+reset\s+--hard\b|\bgit\s+clean\b[^;|&\n]*\s-[A-Za-z]*f[A-Za-z]*\b/;

/** `DROP DATABASE`, `DROP SCHEMA`. */
const RE_SQL_DROP_DATABASE = /\bDROP\s+(?:DATABASE|SCHEMA)\b/i;

/** `DROP TABLE`, `TRUNCATE TABLE`. */
const RE_SQL_DROP_TABLE = /\b(?:DROP\s+TABLE|TRUNCATE\s+TABLE)\b/i;

/** `DELETE FROM t` without a `WHERE` in the same statement. */
const RE_SQL_DELETE = /\bDELETE\s+FROM\b/i;

/** Container, cluster and cloud teardown verbs. */
const RE_INFRA_TEARDOWN =
  /\b(?:docker|podman)\s+system\s+prune\b(?=[^;|&\n]*\s(?:-a|--all)(?:\s|$))(?=[^;|&\n]*\s(?:--volumes|-v)(?:\s|$))|\b(?:docker|podman)\s+(?:volume|network)\s+prune\b[^;|&\n]*\s(?:-f|--force)(?:\s|$)|\bkubectl\s+delete\s+(?:ns|namespace|pvc|pv|deployment|statefulset|service)s?\b|\bkubectl\s+delete\b[^;|&\n]*\s--all\b|\bterraform\s+(?:destroy|apply\s+-destroy)\b|\baws\s+s3\s+rb\b[^;|&\n]*\s--force\b|\baws\s+cloudformation\s+delete-stack\b|\bgcloud\s+(?:projects\s+delete|compute\s+instances\s+delete)\b/;

/** `npm publish`, with the shadowed name resolved in code. */
const RE_NPM_PUBLISH = /\bnpm\s+publish\b[^;|&\n]*/;

/** Shell-history erasure, which destroys the local record of what ran. */
const RE_HISTORY_CLEAR =
  /\bhistory\s+-c\b|\bunset\s+HISTFILE\b|\brm\b[^;|&\n]{0,40}(?:\.bash_history|\.zsh_history|\.python_history|\.node_repl_history)|\btruncate\b[^;|&\n]{0,40}_history\b|:\s*>\s*~?\/?\.(?:bash|zsh)_history/;

/** Signals every process the caller may signal, including init. */
const RE_KILL_EVERYTHING = /\bkill\s+(?:-9\s+|-\w+\s+)*-1\b|\bkill\s+-9\s+1\b|\bkillall\s+-9\s+-u\b|\bpkill\s+-9\s+\.$/;

/** Keychain, browser-store and credential-manager extraction commands. */
const RE_KEYCHAIN_EXTRACTION =
  /\bsecurity\s+(?:find-generic-password|find-internet-password|find-key|dump-keychain|export|unlock-keychain)\b|\bkeychain-dumper\b|\bchainbreaker\b|\bsecurity\s+export\b|\bsecurity\s+default-keychain\b/;

/** Process-memory credential scrapers. */
const RE_MEMORY_SCRAPE =
  /\b(?:mimikatz|lazagne|LaZagne|pypykatz|secretsdump|procdump)\b|\/proc\/(?:\d+|\*|self)\/(?:environ|cmdline|mem)\b|\bgcore\b[^;|&\n]*\d|\b(?:gdb|lldb)\b[^;|&\n]*\s-p\s*\d|\bstrings\b[^;|&\n]*\/proc\/\S+/;

/** `printenv`/`env`/`set` written to a file or piped into another process. */
const RE_ENVIRONMENT_DUMP =
  /(?:>>?|\|)\s*(?:env|printenv|export\s+-p|set)\b|\b(?:env|printenv)\b[^;|&\n]{0,20}(?:>>?|\|)|(?:>>?|\|)\s*\S*[^\s;|&]*(?:env|printenv)\s*$/;

/** Bare metadata host strings, matched without needing a scheme. */
const RE_METADATA_LITERAL = /(?<![\w.:-])(?:169\.254\.169\.254|169\.254\.170\.2|169\.254\.169\.253|100\.100\.100\.200|metadata\.google\.internal|metadata\.goog|fd00:ec2::254)(?![\w.-])/;

/** IMDS request paths, which only make sense against an instance-metadata service. */
const RE_IMDS_PATH =
  /\/(?:latest\/meta-data|meta-data\/iam\/security-credentials|computeMetadata\/v1|metadata\/instance|metadata\/identity\/oauth2\/token)|\bMetadata-Flavor\s*:\s*Google\b|[?&]recursive=true\b/;

/** A bare dotted-quad anywhere in a view. */
const RE_BARE_IPV4 = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;

/** DNS-suffix hosts that resolve to whatever the attacker's A record says. */
const RE_REBINDING_HOST = /(?<![\w-])(?:nip\.io|sslip\.io|xip\.io|rbndr\.us|1u\.ms|localtest\.me|traefik\.me)(?![\w.-])/i;

/**
 * A URL whose authority is a bracketed IPv6 literal.
 *
 * The shared extractor stops at `]`, so `http://[::1]:2375/` would otherwise be
 * truncated to `http://[::1` and dropped as unparseable. IPv6 spellings of
 * loopback and unique-local addresses are exactly what this catalog must see.
 */
const RE_BRACKET_URL = /\b[a-z][a-z0-9+.-]{1,15}:\/\/\[[0-9A-Fa-f:.]{2,45}\](?::\d{1,5})?/gi;

/**
 * A scheme that never belongs in a model-issued fetch, with or without `//`.
 *
 * The character after the colon has to actually start a URL. Accepting any
 * non-space character made this match an ordinary *log label*: a statement that
 * prints the word `file:` and then draws a comma read as a `file:` URL, and it
 * blocked a read-only diagnostic at `block` severity. `data:` and `blob:` are
 * matched separately because their payloads are MIME-typed rather than
 * slash-rooted.
 */
const RE_DANGEROUS_SCHEME_TEXT =
  /\b(?:file|gopher|dict|ldap|expect|tftp|jar|netdoc):\/|\b(?:data|blob):(?=[a-z-]+\/|;base64,|https?:)/i;

/** Privilege-raising commands and syscall-adjacent mechanisms. */
const RE_PRIV_ESCALATION =
  /\b(?:sudo|doas|pkexec|runas)\b|\bsu\s+-c\b|\bsu\s+-\s+root\b|\bchmod\b(?:\s+-[^\s]+)*\s+(?:u\+s|4[0-7]{3}|2[0-7]{3})\b|\bsetuid\s*\(|\bsetgid\s*\(|\bcapsh\b[^;|&\n]*--(?:inh|add)=|--ambient-caps/;

/** GUI and Windows paths to an administrative shell. */
const RE_ADMIN_PROMPT =
  /\bosascript\b[^;|&\n]*\bdo\s+shell\s+script\b[^;|&\n]*\bwith\s+administrator\s+privileges\b|\bpowershell\b[^;|&\n]*\s-(?:enc|encodedcommand|e)\s+\S|\bStart-Process\b[^;|&\n]*-Verb\s+RunAs\b|\bwmic\s+process\s+call\s+create\b/;

/** Fetch-then-execute, the standard first stage of a dropper. */
const RE_PIPE_TO_SHELL =
  /\b(?:curl|wget|fetch)\b[^;|&\n]*\|\s*(?:sudo\s+)?(?:sh|bash|zsh|ksh|dash|python3?|perl|ruby|node|php)\b|\bsh\s+<\s*\(\s*(?:curl|wget)\b|\bbash\s+<\s*\(\s*(?:curl|wget)\b|\biex\s*\(\s*irm\b|\bnpm\s+exec\b[^;|&\n]*\b(?:sh|bash)\b/;

/** Reverse shells: a socket wired to a shell. */
const RE_REVERSE_SHELL =
  /\b(?:nc|ncat|netcat)\b[^;|&\n]*\s-[A-Za-z]*e[A-Za-z]*\s|\bncat\b[^;|&\n]*--(?:exec|sh-exec)\b|>\s*&\s*\/dev\/tcp\/|\/dev\/tcp\/\d{1,5}\b|\bbash\s+-i\b[^;|&\n]*>&\s*\/dev\/|\bsocat\b[^;|&\n]*\bexec:|\bmkfifo\b[^;|&\n]{0,40}[;|&][^;|&\n]{0,60}\b(?:nc|ncat|sh|bash)\b|\bpython[0-9.]*\s+-c\b[^;|&\n]*(?:socket|connect)\b|\bperl\s+-e\b[^;|&\n]*(?:Socket|sockaddr_in)|\bphp\s+-r\b[^;|&\n]*(?:fsockopen|stream_socket_client)|\bruby\s+-rsocket\b/;

/** Network and port scanners. */
const RE_NETWORK_SCAN = /\b(?:nmap|masscan|zmap|nikto|gobuster|dirb|ffuf|hydra|medusa)\b|\b(?:nc|ncat)\b[^;|&\n]*\s-z\b/;

/** Direct edits to sudo policy. */
const RE_SUDOERS_EDIT =
  /\bvisudo\b|\bsed\s+-i\b[^;|&\n]{0,60}\/etc\/sudoers|(?:>>?|tee\s+(?:-a\s+)?)[^;|&\n]{0,60}\/etc\/sudoers|\/etc\/sudoers\.d\/\S|\bchmod\b[^;|&\n]{0,40}\/etc\/sudoers\b/;

/** `crontab` reading a schedule from stdin or a file. */
const RE_CRONTAB_STDIN =
  /\bcrontab\s+(?:-\s*(?:<<?|\||$|[;&])|(?!-)\S+)|(?:>>?|\|)\s*crontab\s+-|\bcrontab\s+-\s*<<?/;

/** Service enablement and job registration across launchd, systemd, Windows and cron. */
const RE_SERVICE_ENABLE =
  /\blaunchctl\s+(?:load|bootstrap|submit|enable|kickstart)\b|\bsystemctl\s+(?:--user\s+)?(?:enable|link|reenable|start\s+--now)\b|\bsc\s+create\b|\bschtasks\s+\/create\b|\breg\s+add\b[^;|&\n]*\\Run\b|\bat\s+now\b|\bat\s+-f\b/;

/** Git hook installation, which runs arbitrary code on the next git verb. */
const RE_GIT_HOOK =
  /(?<![\w.-])\.git\/hooks\/|\bcore\.hooksPath\b|\bhooksPath\b|\bgit\s+config\b[^;|&\n]*\bhooks?\b/;

/** Widening npm's script-execution policy. */
const RE_NPM_SCRIPTS_WIDEN =
  /\b(?:npm|pnpm|yarn|bun)\s+config\s+set\s+(?:ignore-scripts\s+false|unsafe-perm\s+true)\b|\b(?:npm|pnpm|yarn|bun)\s+(?:i|install|ci|add)\b[^;|&\n]*--(?:ignore-scripts=false|unsafe-perm)\b/;

/** `curl`/`wget` reading a local file and posting it. */
const RE_CURL_UPLOAD =
  /\bcurl\b[^;|&\n]*(?:--data-binary\s+@|--data\s+@|-d\s*@|--upload-file\b|-T\s+\S|-F\s+\S*=@|--form\s+\S*=@)|\bwget\b[^;|&\n]*--post-file\b[^;|&\n]*/;

/** `nc` reading a file, or a file piped into `nc`. */
const RE_NETCAT_FILE =
  /\b(?:nc|ncat|netcat)\b[^;|&\n]*\s<\s*(?!\/dev\/null)[^\s<;|&]+|\bcat\s+[^\s;|&]+\s*\|\s*(?:nc|ncat|netcat)\b|\b(?:nc|ncat|netcat)\b[^;|&\n]*<\s*\$?\(?\s*cat\b/;

/** Archiving a home directory or a whole tree, typically just before sending it. */
const RE_ARCHIVE_HOME =
  /\b(?:tar|zip|7z|gzip|bsdtar)\b[^;|&\n]*(?:~\/?(?=\s|$|-C)|\$HOME|\/Users\/|\/home\/|\/etc\b|\/var\/|\s-C\s+\/)/;

/** Screen-scrapers that encode a local file before sending it. */
const RE_ENCODER = /\b(?:base64|xxd|openssl\s+enc|gzip|bzip2|zstd)\b|\bto\s*base64\b|\.toString\(\s*['"]base64['"]\s*\)/;

/**
 * DNS lookups carrying an encoded label.
 *
 * The label class deliberately **excludes `/`**, which is what a base64 label
 * never contains and what every filesystem path is full of. Including it made
 * this rule match any path within 80 characters of the word `host` — a bare
 * `host` key, a variable called `hostname`, the phrase "internal-host" — so a
 * read-only diagnostic was blocked at `block` severity because it named a file.
 * Excluding `/` leaves real tunnelling labels (`aGVsbG8gd29ybGQ.evil.example`)
 * matching, since those are slash-free by construction.
 */
const RE_DNS_TUNNEL = /\b(?:dig|nslookup|host|drill|kdig)\b[^;|&\n]{0,80}?\b[A-Za-z0-9+=_-]{40,}\b/;

/** Live credential environment variables, referenced by name. */
const RE_SECRET_ENV_VAR = new RegExp(AWS_CREDENTIAL_VARS);

/** `scp`/`rsync` destinations; the allowlist decision is made in code. */
const RE_REMOTE_COPY = /\b(?:scp|rsync)\b[^;|&\n]*/g;

/** A `user@host:path` or `host:path` remote specification. */
const RE_REMOTE_SPEC = /(?:[A-Za-z0-9._-]+@)?([A-Za-z0-9._-]+):(?!\/\/)([^\s;|&]+)/g;

/** Sandbox and approval escape hatches. */
const RE_PERMISSION_ESCALATION =
  /(?<![\w-])danger-full-access(?![\w-])|\bsandbox_permissions\b|--dangerously-skip-permissions\b|--dangerously-bypass-approvals-and-sandbox\b|--no-sandbox\b|--yolo\b|["']?approval[_-]?policy["']?\s*[:=]\s*["']?(?:never|off|auto)["']?/;

/** Container isolation weakening. */
const RE_CONTAINER_PRIVILEGE =
  /\b(?:docker|podman|nerdctl)\b[^;|&\n]*(?:--privileged\b|--cap-add(?:=|\s+)SYS_ADMIN|--pid[=\s]+host|--net(?:work)?[=\s]+host|--ipc[=\s]+host|--userns[=\s]+host|--security-opt[=\s]+(?:seccomp|apparmor)[=:]unconfined|\/var\/run\/docker\.sock|--volume\s+\/?:|(?:\s|^)-v\s+\/:|(?:\s|^)-v\s+\/etc(?::|\s))/;

/** Namespace and tracer escapes. */
const RE_NAMESPACE_ESCAPE =
  /\bnsenter\b|\bchroot\b|\bunshare\b[^;|&\n]*(?:--user|-U|--map-root-user|--mount|-m\s)|(?<![\w-])ptrace(?![\w-])|\bLD_PRELOAD\s*=\s*\S|\bLD_AUDIT\s*=\s*\S|\bprctl\s*\(\s*PR_SET|process_vm_readv/;

/** Kernel, mount and device boundaries. */
const RE_KERNEL_MOUNT =
  /\bmount\b[^;|&\n]*(?:-o\s+bind|--bind|--rbind)[^;|&\n]*\s\/(?:\s|$)|--bind\s+\/[^\s]*\s+\/|\bpivot_root\b|\b(?:insmod|modprobe|rmmod|kldload)\b|\/proc\/sys\/kernel\/core_pattern|\/sys\/kernel\/\S*\s*=|>\s*\/proc\/sys\/\w|\bcp\b[^;|&\n]*core_pattern/;

/** Platform hardening controls an attacker switches off first. */
const RE_HARDENING_DISABLE =
  /\bapparmor_parser\b[^;|&\n]*-R|\baa-complain\b|\bsetenforce\s+0\b|\bcodesign\b[^;|&\n]*--remove-signature|\bspctl\b[^;|&\n]*--master-disable|\bcsrutil\s+disable\b|\bsudo\s+nvram\b[^;|&\n]*-d|--security-opt[=\s]+(?:seccomp|apparmor)[=:]unconfined|\bseccomp\b[^;|&\n]*(?:disable|unconfined)/;

/** DSH's own state directory. */
const RE_DSH_STATE =
  /(?<![\w.])\.dsh\/(?:settings\.ya?ml|credentials\.ya?ml|sessions|profiles|storages|storages2)/;

/** Another plugin's installed files, or the patch file that lists them. */
const RE_PLUGIN_FILES =
  /(?<![\w.])(?:cordis\.patch\.ya?ml|node_modules\/[^\s;|&"'`]+|\.dsh\/plugins\/[^\s;|&"'`]*|dsh-plugins?\/[^\s;|&"'`]*)/;

/** The plugin's own audit material. */
const RE_AUDIT_PATH =
  /(?<![\w.])(?:audit\.log\.jsonl|audit\.key|audit\.[a-z0-9.]+|security-scan\/audit[^\s;|&"'`]*|dsh-security-scan\/(?:audit|state|lib\/audit)[^\s;|&"'`]*)/;

/** The plugin's HMAC key. */
const RE_AUDIT_ENV = /(?<![\w-])DSH_SECURITY_SCAN_KEY(?![\w-])/;

/** Killing the harness that is running the call. */
const RE_KILL_DSH =
  /\b(?:pkill|killall)\b[^;|&\n]{0,40}\bdsh\b|\btaskkill\b[^;|&\n]{0,60}\bdsh\b|\bkill\s+-9\s+\$\(pgrep\b[^)]*\bdsh\b|\bkill\b[^;|&\n]{0,30}\$\(pgrep\s+-f\s+dsh/;

/** `npm i pkg`, `dsh plugin add pkg` — the audited-package decision is made in code. */
const RE_PACKAGE_INSTALL = /\b(?:npm|pnpm|yarn|bun|npx|pnpx|bunx|dsh)\s+(?:plugin\s+)?(?:i|install|ci|add|exec|dlx)\b([^\n;|&]*)/g;

/** A token that reads like an npm package spec rather than a flag or a path. */
const RE_PACKAGE_SPEC = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*(?:@[^\s]+)?$/i;

/** One `NAME=value` pair whose name marks the value as a credential. */
const RE_SECRET_ENV_LINE =
  /(?<![\w.])([A-Z][A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL|AUTH|COOKIE|SESSION|PRIVATE|CERT)[A-Z0-9_]*)[ \t]*=[ \t]*\S+/g;

/** An IPv4 literal in a tool result. */
const RE_OUTPUT_IPV4 = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;

/** An IPv6 ULA, link-local or loopback literal in a tool result. */
const RE_OUTPUT_IPV6 = /\b(?:f[cd][0-9a-f]{2}:|fe[89ab][0-9a-f]:)[0-9a-f:]{2,39}\b|\[::1\]|\b::1\b/gi;

/** A header line that carries an internal topology name. */
const RE_TOPOLOGY_HEADER = /^[ \t]*(X-Forwarded-For|X-Real-IP|X-Forwarded-Host|Forwarded|Host|Location)[ \t]*:[ \t]*(\S[^\r\n]*)$/gim;

/** A JSON Web Token. */
const RE_JWT = /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g;

/** A signed-URL or OAuth query parameter. */
const RE_SIGNED_QUERY = /[?&](X-Amz-Signature|X-Amz-Credential|X-Goog-Signature|Signature|sig|token|access_token|id_token|code|apikey|api_key|key)=([A-Za-z0-9%._~+/=-]{16,})/gi;

/** A cookie header or a `Cookie:` request line, reduced to one `name=value` pair. */
const RE_COOKIE_PAIR = /^[ \t]*(?:Set-Cookie|Cookie)[ \t]*:[ \t]*([A-Za-z0-9_.-]{1,40})=([^\s;,]{20,})/gim;

/**
 * A key-shaped name assigned a 64-hex value.
 *
 * The `scan` and `security[_-]scan` spellings are this plugin's own key name. The
 * older `gate` spelling is kept deliberately even though nothing here is called
 * that any more: several unrelated DSH security plugins use `…gate…` for exactly
 * this variable, and a leaked key is a leaked key regardless of whose plugin
 * named it.
 */
const RE_AUDIT_KEY_VALUE = /(?<![\w-])(?:audit[_-]?key|hmac[_-]?key|signing[_-]?key|gate[_-]?key|scan[_-]?key|security[_-]?(?:scan|gate)[_-]?key)["']?\s*[:=]\s*["']?([0-9a-f]{64})(?![\w-])/gi;

/** Any 64-hex-char value, checked for proximity to a key-shaped name in code. */
const RE_HEX64 = /(?<![\w])[0-9a-f]{64}(?![\w])/gi;

/** A quoted value assigned to a secret-shaped name, including identifier-embedded names. */
const RE_ASSIGNED_SECRET =
  /(?<![\w])(?:[\w.-]*[_-])?(?:api[_-]?key|apikey|secret[_-]?(?:access[_-]?)?key|access[_-]?key|client[_-]?secret|access[_-]?token|auth[_-]?token|refresh[_-]?token|private[_-]?key|passwd|password|passphrase)\b\s*[:=]\s*["']([^"'\s]{16,})["']/gi;

/** Credentials embedded in a URL authority. */
const RE_URL_CREDENTIALS = /\bhttps?:\/\/[^\s/:@]+:[^\s/@]{4,}@/g;

/** A bearer credential carried in a header or a curl argument. */
const RE_BEARER = /\bBearer\s+[A-Za-z0-9._~+/-]{20,}={0,2}/g;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Escape a literal string for embedding in a regular expression. */
function escapeRe(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Clone a pattern, forcing the `g` flag.
 *
 * A module-scope regex with `g` carries `lastIndex` between calls, and a stale
 * `lastIndex` makes the next `test`/`exec` silently miss. Every dynamic match in
 * this file goes through a fresh clone.
 */
function globalRe(source: RegExp): RegExp {
  const flags = source.flags.includes('g') ? source.flags : `${source.flags}g`;
  const local = new RegExp(source.source, flags);
  local.lastIndex = 0;
  return local;
}

/** First match of `re` in any canonical view, as a clipped excerpt. */
function viewMatch(views: readonly string[], re: RegExp): string | undefined {
  for (const view of views) {
    const local = globalRe(re);
    const match = local.exec(view);
    if (match !== null && match[0].length > 0) return safeClip(match[0], MATCH_LIMIT);
  }
  return undefined;
}

/** Whether `re` matches any canonical view. Used for stateless, non-global patterns. */
function viewHas(views: readonly string[], re: RegExp): boolean {
  return views.some((view) => re.test(view));
}

/** Whether a write-shaped token sits within `window` characters of `fragment`. */
/**
 * Whether the text *aims* a mutation at `fragment`.
 *
 * Direction is the whole point. The first version asked whether any write-ish
 * token appeared within ±80 characters, and `echo ` is such a token — so a
 * command that printed a heading shortly before naming a path was read as
 * writing to that path, and a read-only diagnostic was flagged as tampering with
 * harness state. Intent has to point at the target:
 *
 * - a redirection whose destination is the fragment (`> path`, `| tee path`)
 * - a mutating command whose argument is the fragment (`rm path`, `chmod path`)
 * - a mutating API called with the fragment
 *
 * @param view - one canonical view of the call.
 * @param fragment - the path fragment that already matched.
 * @returns true when a mutation targets it.
 */
function hasWriteIntentNear(view: string, fragment: string): boolean {
  const target = escapeRe(fragment);
  const commands = WRITE_COMMANDS.join('|');
  const apis = WRITE_APIS.join('|');
  return [
    // `> path`, `>> ~/path`, `| tee -a $HOME/path`. The prefix run is path-characters
    // only and stops at a shell separator, so a redirect cannot "reach" a fragment
    // that appears later in an unrelated command.
    new RegExp(`(?:>>?|\\|\\s*tee\\s+(?:-a\\s+)?)\\s*['"]?[^\\s;|&'"\`]{0,80}${target}`),
    // `rm path`, `sudo chmod 000 path`, `sed -i … path`
    new RegExp(`(?:^|[;&|(]\\s*)(?:sudo\\s+)?(?:${commands})\\b[^;|&\\n]{0,60}?['"]?${target}`),
    // `writeFileSync(path, …)`, `fs.appendFile(path, …)`
    new RegExp(`\\b(?:${apis})\\s*\\([^)]{0,80}?${target}`),
  ].some((re) => re.test(view));
}

/**
 * Whether the text *aims* a read or an upload at `fragment`.
 *
 * The mirror of {@link hasWriteIntentNear}, and the same lesson: naming a
 * credential path is worth a finding when something reads it or ships it, and is
 * noise when the path is merely mentioned — in a test fixture, a comment, or an
 * argument to something that never opens it.
 *
 * @param view - one canonical view of the call.
 * @param fragment - the credential-ish fragment that already matched.
 * @returns true when a read or egress targets it.
 */
function hasReadIntentNear(view: string, fragment: string): boolean {
  const target = escapeRe(fragment);
  const commands = READ_COMMANDS.join('|');
  const apis = READ_APIS.join('|');
  return [
    // `cat path`, `grep -n x path`, `curl -d @path`
    new RegExp(`(?:^|[;&|(]\\s*)(?:sudo\\s+)?(?:${commands})\\b[^;|&\\n]{0,60}?['"]?${target}`),
    // `readFileSync(path)`, `fs.createReadStream(path)`
    new RegExp(`\\b(?:${apis})\\s*\\([^)]{0,80}?${target}`),
    // `-d@path`, `--data-binary @path`, `-T path`
    new RegExp(`(?:@|--data-binary\\s+@?|-T\\s+|--upload-file\\s+)['"]?${target}`),
  ].some((re) => re.test(view));
}

/** Whether a fragment appears at all, case-insensitively. */
function viewHasFragment(views: readonly string[], fragment: string): boolean {
  const needle = fragment.toLowerCase();
  return views.some((view) => view.toLowerCase().includes(needle));
}

/** Whether the text looks like it talks to the network. */
function hasNetworkVerb(text: string): boolean {
  const lowered = text.toLowerCase();
  return NETWORK_VERBS.some((verb) => lowered.includes(verb));
}

/** The credential fragment a path matched, if any. */
function matchedCredentialFragment(candidate: string): string | undefined {
  const normalized = normalizePath(candidate);
  const haystacks = candidate === normalized ? [candidate] : [candidate, normalized];
  for (const haystack of haystacks) {
    for (const fragment of ALL_CREDENTIAL_PATHS) {
      if (hasFragment(haystack, fragment)) return fragment;
    }
  }
  return undefined;
}

/** Whether `haystack` contains `fragment` on a boundary, so `process.env` is not `.env`. */
function hasFragment(haystack: string, fragment: string): boolean {
  const re = new RegExp(`(?<![\\w.-])${escapeRe(fragment)}(?![\\w-])`);
  return re.test(haystack);
}

/** Directories that hold credential material, for `glob`/`grep` on a whole folder. */
const CREDENTIAL_DIRS: readonly string[] = [
  '.ssh',
  '.aws',
  '.gnupg',
  '.kube',
  '.dsh',
  '.config/gcloud',
  'Library/Keychains',
  'Library/Application Support/Google/Chrome',
  'Library/Application Support/Firefox',
];

/** The credential directory a path names, if any. */
function matchedCredentialDirectory(candidate: string): string | undefined {
  const normalized = normalizePath(candidate);
  for (const directory of CREDENTIAL_DIRS) {
    if (hasFragment(candidate, directory) || hasFragment(normalized, directory)) return directory;
  }
  return undefined;
}

/** Resolve a URL host to dotted-quad form when it is an obfuscated IPv4 spelling. */
function resolvedHost(parts: UrlParts): string {
  return normalizeIPv4(parts.host) ?? parts.normalizedHost;
}

/** Whether a host string is an address literal rather than a name. */
function isAddressLiteral(host: string): boolean {
  if (host.includes(':')) return true;
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host);
}

/** Human classification of a non-public address, used in rule details. */
/**
 * Addresses that are published in every manual and reveal nothing about a network.
 *
 * Loopback, the unspecified address and the cloud metadata endpoints are the same
 * on every machine, so redacting them protects nothing while filling the report
 * with noise — a tool result that reads a config file contains `127.0.0.1` and the
 * reader needs to see it. The RFC5737 documentation ranges are likewise nobody's
 * topology. What this rule is for is the address that is *only* true of your
 * network.
 *
 * @param literal - the address as it appeared.
 * @returns true when the address says nothing about this network.
 */
function isPublishedAddress(literal: string): boolean {
  // `[::1]` arrives bracketed from a URL authority, so compare the bare form.
  const bare = literal.replace(/^\[|\]$/g, '');
  if (METADATA_HOSTS.includes(bare)) return true;
  if (/^127\./.test(bare)) return true;
  if (/^(?:192\.0\.2|198\.51\.100|203\.0\.113)\./.test(bare)) return true;
  if (/^(?:0\.0\.0\.0|255\.255\.255\.255|::1?|)$/.test(bare)) return true;
  return false;
}

function privateAddressClass(address: string): string {
  const bare = address.replace(/^\[|\]$/g, '');
  if (bare === '::1' || bare === '::') return 'IPv6 loopback';
  if (/^f[cd]/i.test(bare)) return 'IPv6 unique-local';
  if (/^fe[89ab]/i.test(bare)) return 'IPv6 link-local';
  if (bare === '0.0.0.0') return 'unspecified address 0.0.0.0';
  if (bare.startsWith('127.')) return 'IPv4 loopback';
  if (bare.startsWith('169.254.')) return 'IPv4 link-local';
  if (bare.startsWith('10.') || bare.startsWith('192.168.')) return 'RFC1918 private address';
  if (/^172\.(?:1[6-9]|2\d|3[01])\./.test(bare)) return 'RFC1918 private address';
  if (/^100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(bare)) return 'CGNAT address (RFC6598)';
  return 'non-public address';
}

/** Every parsed URL in a call: the pre-extracted list plus anything else in the views. */
function urlPartsOf(ctx: ToolCallContext): UrlParts[] {
  const candidates: string[] = [...ctx.urls];
  for (const view of ctx.views) {
    for (const found of extractUrls(view)) candidates.push(found);
    const brackets = globalRe(RE_BRACKET_URL);
    let bracket: RegExpExecArray | null;
    while ((bracket = brackets.exec(view)) !== null) candidates.push(bracket[0]);
  }
  const parts: UrlParts[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const parsed = parseUrlParts(candidate);
    if (parsed === undefined) continue;
    if (seen.has(parsed.raw)) continue;
    seen.add(parsed.raw);
    parts.push(parsed);
    if (parts.length >= 32) break;
  }
  return parts;
}

/** Whether a host is the local machine. */
function isLoopbackHost(host: string): boolean {
  const bare = host.replace(/^\[|\]$/g, '').toLowerCase();
  if (bare === 'localhost' || bare.endsWith('.localhost')) return true;
  if (bare === '::1') return true;
  return bare.startsWith('127.');
}

/** Whether a URL carries userinfo that is shaped like a hostname, i.e. a disguise. */
function userinfoMimicsHost(raw: string): boolean {
  const authority = raw.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').split(/[/?#]/)[0] ?? '';
  const at = authority.lastIndexOf('@');
  if (at === -1) return false;
  return authority.slice(0, at).includes('.');
}

/** Whether the call is aimed at a network destination, used for the private-key nuance. */
function isNetworkDestination(ctx: ToolCallContext): boolean {
  if (ctx.tool === 'web_fetch' || ctx.tool === 'web_search') return true;
  if (ctx.urls.length > 0) return true;
  if (ctx.command !== undefined && hasNetworkVerb(ctx.command)) return true;
  return ctx.views.some((view) => hasNetworkVerb(view));
}

/** Package specs named by an install command in the call. */
function installTargets(view: string): string[] {
  const found: string[] = [];
  const re = globalRe(RE_PACKAGE_INSTALL);
  let match: RegExpExecArray | null;
  while ((match = re.exec(view)) !== null) {
    const tail = match[1] ?? '';
    for (const token of tail.split(/\s+/)) {
      if (token.length === 0 || token.startsWith('-')) continue;
      if (/^[.~/]/.test(token)) continue;
      if (!RE_PACKAGE_SPEC.test(token)) continue;
      found.push(token);
    }
    if (found.length > 0) break;
  }
  return found;
}

/** `git push` segments in a view, for the force-push decision. */
function gitPushSegments(view: string): string[] {
  const segments: string[] = [];
  const re = globalRe(RE_GIT_PUSH);
  let match: RegExpExecArray | null;
  while ((match = re.exec(view)) !== null) {
    segments.push(match[0]);
    if (segments.length >= 4) break;
  }
  return segments;
}

/** Whether a `git push` segment forces a protected branch. */
function forcesProtectedBranch(segment: string): boolean {
  const forced = /(?:^|\s)--force(?:\s|$)/.test(segment) || /(?:^|\s)-f(?:\s|$)/.test(segment);
  const mirror = /(?:^|\s)--mirror(?:\s|$)/.test(segment);
  const refspec = /\+\s*(?:refs\/heads\/)?(?:main|master)\b/.test(segment);
  const protectedBranch = /\b(?:main|master)\b/.test(segment);
  return (forced && protectedBranch) || mirror || refspec;
}

/** Non-allowlisted remote destinations named by an `scp`/`rsync` command. */
function remoteCopyHosts(view: string): string[] {
  const hosts: string[] = [];
  const copyRe = globalRe(RE_REMOTE_COPY);
  let copy: RegExpExecArray | null;
  while ((copy = copyRe.exec(view)) !== null) {
    const specRe = globalRe(RE_REMOTE_SPEC);
    let spec: RegExpExecArray | null;
    while ((spec = specRe.exec(copy[0])) !== null) {
      const host = spec[1];
      if (host === undefined || host.length === 0) continue;
      if (host.includes('.') || host === 'localhost') hosts.push(host);
    }
    if (hosts.length >= 4) break;
  }
  return hosts;
}

/** Every match of one output pattern, as redactable hits. */
function collectOutput(
  text: string,
  re: RegExp,
  replacement: string,
  label: string,
  cap: number,
  severity?: Severity,
): OutputHit[] {
  const hits: OutputHit[] = [];
  const local = globalRe(re);
  let match: RegExpExecArray | null;
  while ((match = local.exec(text)) !== null) {
    if (match[0].length === 0) {
      local.lastIndex += 1;
      continue;
    }
    hits.push(severity === undefined
      ? { matched: match[0], replacement, label }
      : { matched: match[0], replacement, label, severity });
    if (hits.length >= cap) break;
  }
  return hits;
}

/** Secret patterns by id, so an output rule can name the family it redacts. */
const SECRET_INDEX: ReadonlyMap<string, SecretPattern> = new Map(
  SECRET_PATTERNS.map((pattern) => [pattern.id, pattern]),
);

/**
 * Severity for a redacted credential.
 *
 * A pattern matched by shape is bounded: the exact substring is redacted, so the
 * worst case is one leaked value whose shape is known. `critical` is reserved for
 * key material and for the plugin's own HMAC key, where that bound does not hold.
 */
function redactionSeverity(severity: Severity): Severity {
  return severity === 'critical' ? 'high' : severity;
}

/** Build an output test that redacts one or more `SECRET_PATTERNS` entries. */
function secretTest(ids: readonly string[], severity?: Severity): OutputRule['test'] {
  const patterns = ids
    .map((id) => SECRET_INDEX.get(id))
    .filter((pattern): pattern is SecretPattern => pattern !== undefined);
  return (ctx) => {
    const hits: OutputHit[] = [];
    for (const pattern of patterns) {
      const effective = severity ?? redactionSeverity(pattern.severity);
      hits.push(...collectOutput(ctx.text, pattern.re, pattern.replacement, pattern.label, 8, effective));
      if (hits.length >= 16) break;
    }
    return hits.length === 0 ? undefined : hits;
  };
}

// ---------------------------------------------------------------------------
// GUARD_RULES — input side, evaluated before a tool runs
// ---------------------------------------------------------------------------

/** The input catalog. Order is documentation order, not evaluation order. */
export const GUARD_RULES: GuardRule[] = [
  // -------------------------------------------------------------------------
  // destructive — irreversible loss of data or history
  // -------------------------------------------------------------------------
  {
    id: 'destructive.rm-root',
    category: 'destructive',
    severity: 'critical',
    action: 'block',
    title: 'recursive delete aimed at the filesystem root or the home directory',
    detail:
      'The call deletes `-r`/`-f` at `/`, `/*`, `~`, `$HOME` or `${HOME}`. The shell may also have expanded an empty variable to `/` before the command ran, and `--no-preserve-root` removes the last guard, so this cannot be recovered.',
    remediation:
      'Name the directory you actually own (`rm -rf ./build` or an explicit absolute path) and never let a variable that may be unset carry the target.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      const matched = viewMatch(ctx.views, RE_RM_ROOT);
      return matched === undefined ? undefined : { matched };
    },
  },
  {
    id: 'destructive.rm-broad-target',
    category: 'destructive',
    severity: 'high',
    action: 'ask',
    title: 'recursive delete with a shell-expanded or globbed target',
    detail:
      'The target is `*`, `.`, `..`, or a variable such as `$DIR` that a typo or an unexported variable leaves empty — at which point the command becomes a delete of the working directory or of `/`.',
    remediation:
      'Quote and default the variable (`rm -rf -- "${DIR:?}"`) or list the paths literally, and run the command with `echo` first to see what the shell expands.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      for (const view of ctx.views) {
        const local = globalRe(RE_RM_BROAD);
        let match: RegExpExecArray | null;
        while ((match = local.exec(view)) !== null) {
          if (/\$HOME|\$\{HOME\}/.test(match[0])) continue; // destructive.rm-root owns this case.
          return { matched: safeClip(match[0], MATCH_LIMIT) };
        }
      }
      return undefined;
    },
  },
  {
    id: 'destructive.rm-system-directory',
    category: 'destructive',
    severity: 'critical',
    action: 'block',
    title: 'recursive delete of a top-level system directory',
    detail:
      'The call deletes `-r`/`-f` on `/etc`, `/usr`, `/var`, `/bin`, `/sbin`, `/lib`, `/boot`, `/opt`, `/System`, `/Library` or `C:\\Windows`. None of these can be restored by reinstalling the package that happened to be in the way, and on macOS `/usr` and `/System` are protected by SIP only until the call adds the flag that disables it.',
    remediation:
      'Delete the specific directory inside the system tree that you own (`rm -rf /usr/local/lib/myapp`), and run the command with `--dry-run` or `echo` first to confirm what the shell expands.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      const matched = viewMatch(ctx.views, RE_RM_SYSTEM_DIR);
      return matched === undefined ? undefined : { matched };
    },
  },
  {
    id: 'destructive.disk-overwrite',
    category: 'destructive',
    severity: 'critical',
    action: 'block',
    title: 'raw write to a block device',
    detail:
      'The call writes directly to `/dev/sd*`, `/dev/disk*`, `/dev/nvme*` or similar, either through `dd of=`, a redirect, `tee` or `truncate`. This destroys the filesystem and every partition on the device, including the one this session lives on.',
    remediation:
      'Write to a file inside the workspace and, if the image really must be flashed, do it from an interactive shell outside the session with the device checked twice.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      const matched = viewMatch(ctx.views, RE_DISK_WRITE);
      return matched === undefined ? undefined : { matched };
    },
  },
  {
    id: 'destructive.disk-erase',
    category: 'destructive',
    severity: 'critical',
    action: 'block',
    title: 'filesystem-creation or disk-wiping tool',
    detail:
      '`mkfs`, `newfs`, `wipefs`, `blkdiscard` and `shred` overwrite metadata or data beyond recovery. None of them has a safe use inside a coding session, and `shred` pointed at `/etc`, `/usr` or a home directory is destruction by design.',
    remediation:
      'Delete the files you mean to remove with `rm`, or unmount and re-image the device from a maintenance environment.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      const matched = viewMatch(ctx.views, RE_DISK_ERASE);
      return matched === undefined ? undefined : { matched };
    },
  },
  {
    id: 'destructive.fork-bomb',
    category: 'destructive',
    severity: 'critical',
    action: 'block',
    title: 'fork bomb',
    detail:
      'The recursive `:(){ :|:& };:` definition spawns processes until the process table is exhausted, which wedges the machine for every user and usually requires a hard reboot.',
    remediation:
      'Remove the definition. If you were testing resource limits, use `ulimit -u` in a container instead of the host shell.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      const matched = viewMatch(ctx.views, RE_FORK_BOMB);
      return matched === undefined ? undefined : { matched };
    },
  },
  {
    id: 'destructive.permission-root',
    category: 'destructive',
    severity: 'critical',
    action: 'block',
    title: 'world-writable permissions or root ownership applied to the whole filesystem',
    detail:
      '`chmod -R 777 /` and `chown -R root /` rewrite the mode or owner of every file on the volume, which breaks `sshd`, `sudo` and setuid binaries while making every credential file world-readable.',
    remediation:
      'Scope the change to the one directory that needs it, and use the narrowest mode that works (`chmod -R u+rwX ./dir`).',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      const chmod = viewMatch(ctx.views, RE_CHMOD_ROOT);
      if (chmod !== undefined) return { matched: chmod };
      const chown = viewMatch(ctx.views, RE_CHOWN_ROOT);
      return chown === undefined ? undefined : { matched: chown };
    },
  },
  {
    id: 'destructive.etc-critical-write',
    category: 'destructive',
    severity: 'critical',
    action: 'block',
    title: 'write to a critical file under /etc',
    detail:
      'The call redirects into, copies over or edits `/etc/passwd`, `/etc/shadow`, `/etc/sudoers` or `/etc/hosts`. A malformed entry locks every account out of the machine, and a malicious one grants root or reroutes every name lookup.',
    remediation:
      'Change account and name-resolution state with `vipw`, `visudo` or the platform tool that validates the file, and keep a backup you can restore without a login.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      const matched = viewMatch(ctx.views, RE_ETC_WRITE);
      return matched === undefined ? undefined : { matched };
    },
  },
  {
    id: 'destructive.git-force-push',
    category: 'destructive',
    severity: 'high',
    action: 'ask',
    title: 'force-push to main or master',
    detail:
      '`git push --force` (or `-f`, `--mirror`, `+main`/`+master`) rewrites the protected branch and drops commits that other people have already based work on. `--force-with-lease` is not affected by this rule.',
    remediation:
      'Push normally, or rebase locally and push with `--force-with-lease` to a branch that is not `main`/`master`.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      for (const view of ctx.views) {
        for (const segment of gitPushSegments(view)) {
          if (forcesProtectedBranch(segment)) return { matched: safeClip(segment, MATCH_LIMIT) };
        }
      }
      return undefined;
    },
  },
  {
    id: 'destructive.git-history-rewrite',
    category: 'destructive',
    severity: 'high',
    action: 'ask',
    title: 'command that discards or rewrites local history and working-tree state',
    detail:
      '`git filter-branch`, `git filter-repo`, `git reset --hard` and `git clean -fdx` throw away uncommitted work and unreachable commits. Recovering them afterwards needs the reflog and luck, and `-x` also deletes files that were never tracked.',
    remediation:
      'Commit or stash first (`git stash push -u`), and run `git clean -n` to list what would be removed before using `-f`.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      const matched = viewMatch(ctx.views, RE_GIT_HISTORY_REWRITE);
      return matched === undefined ? undefined : { matched };
    },
  },
  {
    id: 'destructive.sql-statement',
    category: 'destructive',
    severity: 'high',
    action: 'ask',
    title: 'destructive SQL statement',
    detail:
      '`DROP DATABASE`/`DROP SCHEMA` removes an entire database; `DROP TABLE` and `TRUNCATE TABLE` empty a table without a rollback path in most engines. Whether this is a scratch schema or production cannot be told from the statement.',
    remediation:
      'Confirm the target connection string and schema first; for production data use a migration file reviewed in version control instead of an ad-hoc statement.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      const dropped = viewMatch(ctx.views, RE_SQL_DROP_DATABASE);
      if (dropped !== undefined) {
        return {
          matched: dropped,
          detail: 'The statement drops a whole database or schema, which no transaction can undo.',
          severity: 'critical',
          action: 'block',
        };
      }
      const table = viewMatch(ctx.views, RE_SQL_DROP_TABLE);
      return table === undefined ? undefined : { matched: table };
    },
  },
  {
    id: 'destructive.sql-delete-without-where',
    category: 'destructive',
    severity: 'high',
    action: 'ask',
    title: 'DELETE FROM without a WHERE clause',
    detail:
      'The statement deletes every row of the table. A `WHERE` that was meant to be added but was forgotten looks exactly like this, and the data is gone before the result comes back.',
    remediation:
      'Add the `WHERE` predicate, run the equivalent `SELECT count(*)` first, and wrap the change in a transaction you can roll back.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      for (const view of ctx.views) {
        for (const statement of view.split(/[;\n]/)) {
          if (!RE_SQL_DELETE.test(statement)) continue;
          if (/\bWHERE\b/i.test(statement)) continue;
          return { matched: safeClip(statement.trim(), MATCH_LIMIT) };
        }
      }
      return undefined;
    },
  },
  {
    id: 'destructive.infra-teardown',
    category: 'destructive',
    severity: 'high',
    action: 'ask',
    title: 'container, cluster or cloud teardown',
    detail:
      'The command prunes container volumes, deletes Kubernetes namespaces or persistent volume claims, destroys Terraform state, or force-removes a bucket. Persistent volumes and buckets hold data that no `apply` brings back.',
    remediation:
      'List the affected resources first (`docker system df`, `kubectl get pvc -A`, `terraform plan -destroy`) and confirm the account and context before running the teardown.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      const matched = viewMatch(ctx.views, RE_INFRA_TEARDOWN);
      return matched === undefined ? undefined : { matched };
    },
  },
  {
    id: 'destructive.npm-publish-shadow',
    category: 'destructive',
    severity: 'high',
    action: 'ask',
    title: 'publishing a package whose name shadows a popular one',
    detail:
      'The call runs `npm publish` while referring to a widely used package name. Publishing a shadowing name is how typosquats and slopsquats reach other people\'s installs, and an accidental publish cannot be unpublished.',
    remediation:
      'Check the `name` field in `package.json` and publish with `--dry-run` first. If the name really is intentional, confirm the scope (`@your-org/name`) before publishing.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      for (const view of ctx.views) {
        const publish = RE_NPM_PUBLISH.exec(view);
        if (publish === null) continue;
        for (const name of SHADOW_PRONE_PACKAGES) {
          if (!hasFragment(view, name)) continue;
          return {
            matched: safeClip(publish[0], MATCH_LIMIT),
            detail: `The publish command also mentions \`${name}\`, a name that existing installs resolve from the public registry.`,
          };
        }
      }
      return undefined;
    },
  },
  {
    id: 'destructive.history-clear',
    category: 'destructive',
    severity: 'low',
    action: 'warn',
    title: 'shell history erased',
    detail:
      '`history -c`, `unset HISTFILE` or deleting the history file removes the local record of the commands this session ran, which is exactly the evidence needed to review an incident afterwards.',
    remediation:
      'Leave the history in place; if it contains a credential, rotate that credential instead of deleting the log line.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      const matched = viewMatch(ctx.views, RE_HISTORY_CLEAR);
      return matched === undefined ? undefined : { matched };
    },
  },
  {
    id: 'destructive.kill-everything',
    category: 'destructive',
    severity: 'high',
    action: 'block',
    title: 'signal sent to every process the user owns',
    detail:
      '`kill -9 -1` signals the whole process group, `kill -9 1` targets init, and the `killall`/`pkill` forms sweep by user or by pattern. That kills the harness, the editor and unsaved work in one call.',
    remediation:
      'Target the specific PID you want to stop (`pgrep -fl name` then `kill <pid>`), not a pattern that matches everything.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      const matched = viewMatch(ctx.views, RE_KILL_EVERYTHING);
      return matched === undefined ? undefined : { matched };
    },
  },
  {
    id: 'destructive.known-fragment',
    category: 'destructive',
    severity: 'medium',
    action: 'ask',
    title: 'known destructive command fragment',
    detail:
      'The call contains an entry from the shared `DESTRUCTIVE_COMMANDS` table that has no dedicated rule of its own. The table is used by the pre-install audit as well, so a fragment added there is enforced here without a change to this file.',
    remediation:
      'Read the command as written before letting it run, and prefer the narrowest form of the operation.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      for (const fragment of DESTRUCTIVE_COMMANDS) {
        if (COVERED_DESTRUCTIVE_FRAGMENTS.includes(fragment)) continue;
        if (!viewHasFragment(ctx.views, fragment)) continue;
        return { matched: safeClip(fragment, MATCH_LIMIT) };
      }
      return undefined;
    },
  },

  // -------------------------------------------------------------------------
  // credential-access — reading a secret that is not the caller's to read
  // -------------------------------------------------------------------------
  {
    id: 'cred.read-credential-file',
    category: 'credential-access',
    severity: 'high',
    action: 'ask',
    title: 'file tool aimed at a credential store',
    detail:
      'The path argument names a private key, a cloud credential file, a dotenv file, a registry token, a browser cookie store or the DSH credentials file. Reading it puts the secret into the transcript, where redaction can only remove the copy it knows about.',
    remediation:
      'Read a redacted example instead (`.env.example`, `*.pub`, a profile name), or ask the user to paste the single value the task needs.',
    tools: ['read', 'glob', 'grep', 'write', 'edit'],
    test: (ctx) => {
      const candidates: string[] = [];
      if (ctx.path !== undefined) candidates.push(ctx.path);
      candidates.push(...ctx.paths);
      for (const candidate of candidates) {
        const fragment = matchedCredentialFragment(candidate);
        if (fragment !== undefined) {
          const family = credentialFamily(candidate) ?? 'credential';
          return {
            matched: safeClip(candidate, MATCH_LIMIT),
            detail: `The path matches the \`${family}\` credential family (fragment \`${fragment}\`).`,
            severity: family === 'system' ? 'medium' : 'high',
          };
        }
        const directory = matchedCredentialDirectory(candidate);
        if (directory !== undefined) {
          return {
            matched: safeClip(candidate, MATCH_LIMIT),
            detail: `The path is the \`${directory}\` directory, which stores credential material for the \`${credentialFamily(candidate) ?? 'system'}\` family.`,
            severity: 'medium',
          };
        }
      }
      return undefined;
    },
  },
  {
    id: 'cred.shell-credential-reference',
    category: 'credential-access',
    severity: 'high',
    action: 'ask',
    title: 'shell command reading or shipping a credential store',
    detail:
      'The command reads, copies or uploads a private key, cloud credential file, browser store, shell history or system account database. The contents end up in the transcript, in a copy, or on the wire.',
    remediation:
      'Use the tool that owns the credential (`aws configure`, `gh auth login`, `ssh-keygen -y`) rather than moving the file, and never commit the value into the session.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      for (const view of ctx.views) {
        for (const fragment of ALL_CREDENTIAL_PATHS) {
          if (!hasFragment(view, fragment)) continue;
          // Naming a credential path is only a finding when something reads it or
          // sends it. A bare mention is a test fixture, a comment, or an argument
          // to a command that never opens it — and treating those as credential
          // access filled the report with noise.
          if (!hasReadIntentNear(view, fragment)) continue;
          const family = credentialFamily(fragment) ?? 'credential';
          return {
            matched: safeClip(view, MATCH_LIMIT),
            detail: `The command reads or ships the \`${family}\` credential family (fragment \`${fragment}\`).`,
            severity: family === 'system' || family === 'shell' ? 'medium' : 'high',
          };
        }
      }
      return undefined;
    },
  },
  {
    id: 'cred.keychain-extraction',
    category: 'credential-access',
    severity: 'high',
    action: 'ask',
    title: 'keychain password extraction',
    detail:
      '`security find-generic-password -w`, `security dump-keychain` and `security find-internet-password` print stored secrets in cleartext, and `keychain-dumper`/`chainbreaker` extract them from a keychain file. The output is a usable credential, not a fingerprint of one.',
    remediation:
      'Read the specific item the task needs with `security find-generic-password -s <service>` (no `-w`) to confirm it exists, or let the tool that owns the secret read it at use time.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      const matched = viewMatch(ctx.views, RE_KEYCHAIN_EXTRACTION);
      return matched === undefined ? undefined : { matched };
    },
  },
  {
    id: 'cred.memory-scrape',
    category: 'credential-access',
    severity: 'critical',
    action: 'block',
    title: 'process memory or environment scrape',
    detail:
      'The call reads `/proc/<pid>/environ`, dumps a process with `gcore`/`lldb`, or invokes a credential scraper such as `mimikatz` or `LaZagne`. These tools harvest every credential the process holds, which is a credential-theft primitive with no legitimate use in a build.',
    remediation:
      'Remove the scrape. If you are debugging environment propagation, print the single variable you need with `printenv NAME`.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      const matched = viewMatch(ctx.views, RE_MEMORY_SCRAPE);
      return matched === undefined ? undefined : { matched };
    },
  },
  {
    id: 'cred.environment-dump',
    category: 'credential-access',
    severity: 'high',
    action: 'ask',
    title: 'environment dumped to a file or a pipe',
    detail:
      '`printenv`, `env` or `set` is redirected into a file or piped onward. A session environment typically holds registry tokens, cloud credentials and DSH configuration, all of which then live in a plain file.',
    remediation:
      'Read one variable by name (`printenv AWS_PROFILE`) and let the rest stay in the environment where the process that needs it can read it.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      const matched = viewMatch(ctx.views, RE_ENVIRONMENT_DUMP);
      return matched === undefined ? undefined : { matched };
    },
  },

  // -------------------------------------------------------------------------
  // ssrf — a destination inside the network the guard is protecting
  // -------------------------------------------------------------------------
  {
    id: 'ssrf.cloud-metadata',
    category: 'ssrf',
    severity: 'critical',
    action: 'block',
    title: 'request to a cloud instance-metadata endpoint',
    detail:
      'The destination is an IMDS address (`169.254.169.254`, `169.254.170.2`, `100.100.100.200`, `fd00:ec2::254`) or a metadata hostname, or the call requests an IMDS path. On most instances that endpoint returns role credentials, and one request is enough to hand them over.',
    remediation:
      'Fetch the data from the provider API with an explicit credential instead, and if this is a curl test of your own metadata service, run it against a local mock.',
    tools: ['*'],
    test: (ctx) => {
      for (const parts of urlPartsOf(ctx)) {
        const host = resolvedHost(parts);
        if (METADATA_HOSTS.includes(host) || METADATA_HOSTS.includes(parts.host)) {
          return { matched: safeClip(parts.raw, MATCH_LIMIT), detail: `Destination resolves to metadata host \`${host}\`.` };
        }
        if (host.startsWith('169.254.169.') || host.startsWith('169.254.170.')) {
          return { matched: safeClip(parts.raw, MATCH_LIMIT), detail: `Destination resolves to the link-local metadata address \`${host}\`.` };
        }
      }
      const literal = viewMatch(ctx.views, RE_METADATA_LITERAL);
      if (literal !== undefined) return { matched: literal };
      const imdsPath = viewMatch(ctx.views, RE_IMDS_PATH);
      return imdsPath === undefined ? undefined : { matched: imdsPath };
    },
  },
  {
    id: 'ssrf.private-address',
    category: 'ssrf',
    severity: 'high',
    action: 'ask',
    title: 'request to a loopback, private or link-local address',
    detail:
      'The URL host resolves to an address that is not globally routable (RFC1918, CGNAT, loopback, link-local, IPv6 ULA). Obfuscated spellings such as `2130706433`, `0x7f000001` and `0177.0.0.1` are resolved before this check, so they land here too.',
    remediation:
      'If the target is an internal service, say so and use the documented service name with the credentials the task already has; if it is a local dev server, run the request from a shell the user controls.',
    tools: ['*'],
    test: (ctx) => {
      const hits: GuardHit[] = [];
      for (const parts of urlPartsOf(ctx)) {
        const host = resolvedHost(parts);
        if (!isAddressLiteral(host) || !isPrivateAddressLiteral(host)) continue;
        const obfuscated = parts.host !== parts.normalizedHost;
        hits.push({
          matched: safeClip(parts.raw, MATCH_LIMIT),
          detail: `Destination ${privateAddressClass(host)} (\`${host}\`).${obfuscated ? ` The host was written as \`${parts.host}\` and resolved with the decimal/octal/hex parser.` : ''}`,
        });
      }
      for (const view of ctx.views) {
        if (!hasNetworkVerb(view)) continue;
        const local = globalRe(RE_BARE_IPV4);
        let match: RegExpExecArray | null;
        while ((match = local.exec(view)) !== null) {
          const literal = match[0];
          if (!isPrivateAddressLiteral(literal)) continue;
          if (hits.some((hit) => hit.matched.includes(literal))) break;
          hits.push({ matched: safeClip(literal, MATCH_LIMIT), detail: `The command targets ${privateAddressClass(literal)} ${literal}` });
          break;
        }
        if (hits.length >= 4) break;
      }
      const obfuscated = viewMatch(ctx.views, RE_OBFUSCATED_IPV4);
      if (hits.length === 0 && obfuscated !== undefined) {
        return { matched: obfuscated, detail: 'The token is a non-dotted spelling of an IPv4 address.' };
      }
      return hits.length === 0 ? undefined : hits;
    },
  },
  {
    id: 'ssrf.loopback-service-port',
    category: 'ssrf',
    severity: 'critical',
    action: 'block',
    title: 'loopback connection to an infrastructure service port',
    detail:
      'The destination is localhost on a port that belongs to SSH, the Docker daemon, a database, Redis, Elasticsearch, memcached or MongoDB. The Docker socket port in particular is remote code execution: whoever can reach it can start a container with the host filesystem mounted.',
    remediation:
      'Talk to the service with its client and the credentials already configured (`docker`, `psql`, `redis-cli`) instead of opening a raw connection inside a tool call.',
    tools: ['*'],
    test: (ctx) => {
      for (const parts of urlPartsOf(ctx)) {
        const host = resolvedHost(parts);
        if (!isLoopbackHost(host)) continue;
        const port = parts.port;
        if (port === undefined || !LOOPBACK_SERVICE_PORTS.includes(port)) continue;
        return { matched: safeClip(parts.raw, MATCH_LIMIT), detail: `Destination is localhost on port ${port}, an infrastructure service rather than a dev server.` };
      }
      return undefined;
    },
  },
  {
    id: 'ssrf.dangerous-scheme',
    category: 'ssrf',
    severity: 'high',
    action: 'block',
    title: 'URL scheme that is never a model-issued fetch',
    detail:
      '`file:`, `gopher:`, `dict:`, `ldap:`, `tftp:`, `data:` and the other schemes in the guard\'s table read local files or speak binary protocols to internal services. A fetch tool that follows them turns a text request into a filesystem read.',
    remediation:
      'Read local files with the `read` tool, which goes through the workspace policy, and reach internal services with their own protocol client.',
    tools: ['*'],
    test: (ctx) => {
      for (const parts of urlPartsOf(ctx)) {
        if (!DANGEROUS_SCHEMES.includes(parts.scheme)) continue;
        return { matched: safeClip(parts.raw, MATCH_LIMIT), detail: `The URL uses the \`${parts.scheme}:\` scheme.` };
      }
      const matched = viewMatch(ctx.views, RE_DANGEROUS_SCHEME_TEXT);
      return matched === undefined ? undefined : { matched };
    },
  },
  {
    id: 'ssrf.internal-hostname',
    category: 'ssrf',
    severity: 'medium',
    action: 'ask',
    title: 'internal or attacker-resolvable hostname',
    detail:
      'The destination is a name that resolves inside a private network by convention (`.internal`, `.corp`, `.local`, `.svc.cluster.local`), the unspecified address `0.0.0.0`, a wildcard-DNS host such as `nip.io`/`sslip.io` that points anywhere the attacker chooses, or a URL whose userinfo is shaped like a hostname to hide the real destination.',
    remediation:
      'Use the externally resolvable name the task is actually about, and check the authority after the `@` in any URL that contains userinfo before trusting its apparent host.',
    tools: ['*'],
    test: (ctx) => {
      for (const parts of urlPartsOf(ctx)) {
        const host = parts.host;
        if (userinfoMimicsHost(parts.raw)) {
          return { matched: safeClip(parts.raw, MATCH_LIMIT), detail: `The userinfo before \`@\` mimics a hostname; the real destination is \`${host}\`.` };
        }
        if (RE_REBINDING_HOST.test(host)) {
          return { matched: safeClip(parts.raw, MATCH_LIMIT), detail: `\`${host}\` is a wildcard-DNS host whose address the requester controls.` };
        }
        if (resolvedHost(parts) === '0.0.0.0') {
          return { matched: safeClip(parts.raw, MATCH_LIMIT), detail: 'The unspecified address 0.0.0.0 resolves to the local host on most stacks.' };
        }
        if (!isInternalHostname(host)) continue;
        const suffix = INTERNAL_HOST_SUFFIXES.find((candidate) => host.endsWith(candidate));
        return {
          matched: safeClip(parts.raw, MATCH_LIMIT),
          detail: suffix === undefined ? `\`${host}\` is an internal name.` : `\`${host}\` ends in the internal suffix \`${suffix}\`.`,
        };
      }
      for (const view of ctx.views) {
        const local = globalRe(HOSTNAME_RE);
        let match: RegExpExecArray | null;
        while ((match = local.exec(view)) !== null) {
          if (!isInternalHostname(match[0])) continue;
          return { matched: safeClip(match[0], MATCH_LIMIT) };
        }
      }
      return undefined;
    },
  },
  {
    id: 'ssrf.known-drop-host',
    category: 'ssrf',
    severity: 'high',
    action: 'block',
    title: 'request to a known data-drop or tunnel service',
    detail:
      'The destination is one of the paste, webhook-capture or tunnelling hosts in `EXFIL_HOSTS` (webhook.site, ngrok, oastify, transfer.sh, pinggy-style tunnels). These exist to receive data from a machine and make it readable somewhere else, which is the shape of an exfiltration.',
    remediation:
      'Bring the data into the session with the `read` tool instead of routing it through a public receiver, and if a tunnel is genuinely needed, let the user start it outside the session.',
    tools: ['*'],
    test: (ctx) => {
      for (const parts of urlPartsOf(ctx)) {
        if (!isExfilHost(parts.host)) continue;
        const known = EXFIL_HOSTS.find((host) => parts.host === host || parts.host.endsWith(`.${host}`)) ?? parts.host;
        return { matched: safeClip(parts.raw, MATCH_LIMIT), detail: `\`${parts.host}\` is the known drop service \`${known}\`.` };
      }
      return undefined;
    },
  },

  // -------------------------------------------------------------------------
  // privilege — raising the privileges of the code that runs
  // -------------------------------------------------------------------------
  {
    id: 'priv.escalation-command',
    category: 'privilege',
    severity: 'high',
    action: 'ask',
    title: 'privilege escalation command',
    detail:
      '`sudo`, `doas`, `pkexec`, `runas`, `su -c` or a setuid mode change runs the rest of the command as another user. Whatever is on the other side of that command then runs with those privileges too, including anything the guard would otherwise have stopped.',
    remediation:
      'Run the command as the current user, or state the exact privileged command you need and ask the user to run it themselves.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      const matched = viewMatch(ctx.views, RE_PRIV_ESCALATION);
      return matched === undefined ? undefined : { matched };
    },
  },
  {
    id: 'priv.admin-prompt-script',
    category: 'privilege',
    severity: 'critical',
    action: 'block',
    title: 'scripted elevation to an administrative shell',
    detail:
      '`osascript … do shell script … with administrator privileges`, an encoded PowerShell command, or `Start-Process -Verb RunAs` asks the operating system for an administrator shell with no human reading the payload. An encoded command is unreadable by design.',
    remediation:
      'Run the action as the current user. If it genuinely needs an administrator, the user should run the visible command in their own terminal.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      const matched = viewMatch(ctx.views, RE_ADMIN_PROMPT);
      return matched === undefined ? undefined : { matched };
    },
  },
  {
    id: 'priv.powershell-encoded',
    category: 'privilege',
    severity: 'critical',
    action: 'block',
    title: 'PowerShell invoked with an encoded command',
    detail:
      '`-EncodedCommand` (and `-enc`) carries a base64 UTF-16LE payload, and `[Convert]::FromBase64String` is the same trick spelled out. The payload is unreadable at the point of decision, which is the entire reason it is encoded, and the payload can do anything the invoking user can.',
    remediation:
      'Decode the payload and run the visible command instead: `[Text.Encoding]::Unicode.GetString([Convert]::FromBase64String("…"))`. If the encoding comes from a vendor tool, ask for the readable form.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      const matched = viewMatch(ctx.views, RE_POWERSHELL_ENCODED);
      return matched === undefined ? undefined : { matched };
    },
  },
  {
    id: 'priv.remote-pipe-to-shell',
    category: 'privilege',
    severity: 'critical',
    action: 'block',
    title: 'remote content piped into a shell',
    detail:
      '`curl … | sh`, `wget -O- … | bash` and `sh <(curl …)` execute whatever the server returns. The content is unsigned, unreviewed and can differ between the moment it is read and the moment it runs.',
    remediation:
      'Download to a file first, read it, and then run it — or install the tool from the package registry, where the artifact digest is pinned.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      const matched = viewMatch(ctx.views, RE_PIPE_TO_SHELL);
      return matched === undefined ? undefined : { matched };
    },
  },
  {
    id: 'priv.reverse-shell',
    category: 'privilege',
    severity: 'critical',
    action: 'block',
    title: 'reverse shell',
    detail:
      'The command wires a socket to an interactive shell through `nc -e`, `ncat --exec`, `/dev/tcp`, `socat exec:`, a `mkfifo` back-pipe, or a language one-liner that opens a connection and spawns `/bin/sh`. It hands a remote party an interactive session on this machine.',
    remediation:
      'Remove the shell payload. If you are testing a service that is not reachable, use an SSH port-forward from the user\'s terminal instead.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      const matched = viewMatch(ctx.views, RE_REVERSE_SHELL);
      return matched === undefined ? undefined : { matched };
    },
  },
  {
    id: 'priv.network-scan',
    category: 'privilege',
    severity: 'medium',
    action: 'ask',
    title: 'network or port scan',
    detail:
      '`nmap`, `masscan`, `zmap` and the credential-brute-force tools sweep hosts that are not part of this task. Even a scan is activity against third-party systems and is logged on the receiving side.',
    remediation:
      'Scan only the address you were asked about, with a single host target and the ports you already know are relevant.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      const matched = viewMatch(ctx.views, RE_NETWORK_SCAN);
      return matched === undefined ? undefined : { matched };
    },
  },
  {
    id: 'priv.sudoers-edit',
    category: 'privilege',
    severity: 'critical',
    action: 'block',
    title: 'direct edit of the sudo policy',
    detail:
      'Writing to `/etc/sudoers` or `/etc/sudoers.d/` (through `visudo`, `sed -i`, a redirect or `tee`) changes who may become root. A syntax error there locks out administrative access; an added `NOPASSWD` rule removes the last prompt.',
    remediation:
      'Let the user make the change with `visudo` in an interactive shell so the file is validated, and review the exact rule being added.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      const matched = viewMatch(ctx.views, RE_SUDOERS_EDIT);
      return matched === undefined ? undefined : { matched };
    },
  },

  // -------------------------------------------------------------------------
  // persistence — surviving the session
  // -------------------------------------------------------------------------
  {
    id: 'persist.persistence-fragment-write',
    category: 'persistence',
    severity: 'critical',
    action: 'block',
    title: 'write to a persistence location',
    detail:
      'A write lands on a location the system executes later: a crontab directory, a launch agent or daemon, a systemd unit, `rc.local`, `authorized_keys`, or a Windows Run key. Code placed there runs again after the session ends, on every login or every boot.',
    remediation:
      'Keep the script in the repository and run it explicitly. If a scheduled job is genuinely required, have the user add it with the platform tool after reading the command it runs.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      for (const view of ctx.views) {
        for (const fragment of PERSISTENCE_FRAGMENTS) {
          if (SHELL_RC_FRAGMENTS.includes(fragment) || fragment === 'crontab' || fragment === '.git/hooks') continue;
          if (!hasWriteIntentNear(view, fragment)) continue;
          return { matched: safeClip(fragment, MATCH_LIMIT), detail: `The command writes to \`${fragment}\`, which the system executes automatically.` };
        }
      }
      return undefined;
    },
  },
  {
    id: 'persist.crontab-stdin',
    category: 'persistence',
    severity: 'critical',
    action: 'block',
    title: 'crontab installed from stdin or a file',
    detail:
      '`crontab -` with a heredoc or a pipe, or `crontab <file>`, replaces the user\'s schedule with content that nothing in the session reviewed. A replaced crontab is the cheapest way to keep running after the session ends.',
    remediation:
      'Print the schedule (`crontab -l`) and let the user install the new one after reading it, rather than piping it in.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      const matched = viewMatch(ctx.views, RE_CRONTAB_STDIN);
      return matched === undefined ? undefined : { matched };
    },
  },
  {
    id: 'persist.service-enable',
    category: 'persistence',
    severity: 'high',
    action: 'block',
    title: 'service or scheduled job enabled',
    detail:
      '`launchctl load`/`bootstrap`/`submit`, `systemctl enable`, `sc create`, `schtasks /create`, `reg add …\\Run` and `at now` register something to start on login, boot or a timer. The registration outlives the shell that created it.',
    remediation:
      'Run the program directly for the work at hand. If the user wants it enabled permanently, they should install the unit themselves and read it first.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      const matched = viewMatch(ctx.views, RE_SERVICE_ENABLE);
      return matched === undefined ? undefined : { matched };
    },
  },
  {
    id: 'persist.shell-rc-append',
    category: 'persistence',
    severity: 'high',
    action: 'ask',
    title: 'append to a shell startup file',
    detail:
      'A write lands on `.bashrc`, `.zshrc`, `.profile` or a similar startup file, so whatever is appended runs in every future interactive shell. The value is usually an `alias` or `export`, but the same write can inject a command.',
    remediation:
      'Put the change in a project-local script that the user sources explicitly, or show the exact line and let the user add it.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      for (const view of ctx.views) {
        for (const fragment of SHELL_RC_FRAGMENTS) {
          if (!hasWriteIntentNear(view, fragment)) continue;
          return { matched: safeClip(fragment, MATCH_LIMIT), detail: `The command writes to \`${fragment}\`, which runs in every future shell.` };
        }
      }
      return undefined;
    },
  },
  {
    id: 'persist.git-hook-install',
    category: 'persistence',
    severity: 'high',
    action: 'ask',
    title: 'git hook installed',
    detail:
      'Writing into `.git/hooks/` or repointing `core.hooksPath` makes git run the file on the next commit, checkout or push. `pre-commit` and `pre-push` hooks are not visible in a diff and are not shared with the remote by default.',
    remediation:
      'If the hook is part of the project, commit it under a tracked hooks directory the team reviews (for example with `core.hooksPath .githooks`), and show its contents.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      const matched = viewMatch(ctx.views, RE_GIT_HOOK);
      return matched === undefined ? undefined : { matched };
    },
  },
  {
    id: 'persist.npm-scripts-widen',
    category: 'persistence',
    severity: 'medium',
    action: 'ask',
    title: 'npm script execution policy widened',
    detail:
      'Setting `ignore-scripts false` or `unsafe-perm true` re-enables `preinstall`/`postinstall` execution for every package resolved afterwards. Those hooks run with the developer\'s privileges and are the standard delivery mechanism for a dependency attack.',
    remediation:
      'Keep `ignore-scripts=true` and run the one lifecycle step you actually need explicitly, after reading the script in `package.json`.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      const matched = viewMatch(ctx.views, RE_NPM_SCRIPTS_WIDEN);
      return matched === undefined ? undefined : { matched };
    },
  },
  {
    id: 'persist.dsh-policy-widen',
    category: 'persistence',
    severity: 'high',
    action: 'ask',
    title: 'DSH settings edited to widen permissions or approvals',
    detail:
      'The call touches DSH\'s `settings.yaml` together with a permission or approval key such as `sandbox_permissions`, `danger-full-access` or an auto-approval policy. That change removes the guardrails this plugin provides for every future session, not just this call.',
    remediation:
      'Leave the settings file alone and let the user decide the sandbox mode deliberately; if a single command needs more access, the approval prompt is the correct place to grant it.',
    tools: ['bash', 'run_code', 'write', 'edit'],
    test: (ctx) => {
      const mentionsSettings = viewHas(ctx.views, /settings\.ya?ml/) || (ctx.path !== undefined && /settings\.ya?ml/.test(ctx.path));
      if (!mentionsSettings) return undefined;
      const matched = viewMatch(ctx.views, RE_PERMISSION_ESCALATION);
      if (matched === undefined) return undefined;
      return { matched, detail: 'The same call names DSH settings and a permission or approval key.' };
    },
  },

  // -------------------------------------------------------------------------
  // exfiltration — data leaving the machine
  // -------------------------------------------------------------------------
  {
    id: 'exfil.curl-upload-file',
    category: 'exfiltration',
    severity: 'high',
    action: 'block',
    title: 'HTTP request uploading a local file',
    detail:
      '`curl --data-binary @file`, `-d @file`, `-T file` or `-F name=@file` sends the contents of a local file to a remote endpoint. Nothing in the call describes what is in that file or who receives it.',
    remediation:
      'Send the data to a destination the user named, with the field content written out in the command, and never upload a credential or configuration file.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      const matched = viewMatch(ctx.views, RE_CURL_UPLOAD);
      return matched === undefined ? undefined : { matched };
    },
  },
  {
    id: 'exfil.netcat-file',
    category: 'exfiltration',
    severity: 'high',
    action: 'block',
    title: 'file sent over a raw socket',
    detail:
      '`nc host port < file` or `cat file | nc host port` bypasses every protocol-level control and sends the file verbatim to whatever is listening on the other end.',
    remediation:
      'Use the service protocol the destination expects, so the transfer is authenticated and logged, and send only the specific data the task needs.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      const matched = viewMatch(ctx.views, RE_NETCAT_FILE);
      return matched === undefined ? undefined : { matched };
    },
  },
  {
    id: 'exfil.archive-and-send',
    category: 'exfiltration',
    severity: 'critical',
    action: 'block',
    title: 'home directory archived and prepared for transfer',
    detail:
      'An archive is built from a home directory, `/etc` or a whole tree, and the same command pipes it into a network tool. Compressing first defeats content inspection and makes the payload small enough to leave quickly.',
    remediation:
      'Archive only the project directory you were asked about, into a file that stays local, and never pipe an archive of a home directory to a remote endpoint.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      for (const view of ctx.views) {
        if (!RE_ARCHIVE_HOME.test(view)) continue;
        if (!hasNetworkVerb(view)) continue;
        return { matched: safeClip(view, MATCH_LIMIT) };
      }
      const matched = viewMatch(ctx.views, RE_ARCHIVE_HOME);
      return matched === undefined ? undefined : { matched };
    },
  },
  {
    id: 'exfil.credential-encode-and-post',
    category: 'exfiltration',
    severity: 'critical',
    action: 'block',
    title: 'credential file encoded and sent to the network',
    detail:
      'The same command reads a credential store, encodes it (base64, hex, gzip or an openssl cipher) and hands it to a network tool. Encoding exists here to survive a filter, which is the signature of a staged exfiltration.',
    remediation:
      'Stop and report the command. If a credential must move between machines, rotate it and provision the new value through the destination\'s own secret store.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      for (const view of ctx.views) {
        if (!hasNetworkVerb(view)) continue;
        if (!RE_ENCODER.test(view)) continue;
        for (const fragment of ALL_CREDENTIAL_PATHS) {
          if (!hasFragment(view, fragment)) continue;
          return {
            matched: safeClip(view, MATCH_LIMIT),
            detail: `The command encodes and transmits the \`${credentialFamily(fragment) ?? 'credential'}\` path \`${fragment}\`.`,
          };
        }
      }
      return undefined;
    },
  },
  {
    id: 'exfil.dns-tunnel',
    category: 'exfiltration',
    severity: 'high',
    action: 'block',
    title: 'DNS query carrying an encoded label',
    detail:
      'A `dig`, `nslookup` or `host` query carries a label long enough to be encoded data. DNS leaves through the resolver even when HTTP egress is blocked, so it is the usual fallback channel for exfiltration.',
    remediation:
      'Query the real name you need. If you are debugging a resolver, use a normal hostname and `+short`, without data in the label.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      const matched = viewMatch(ctx.views, RE_DNS_TUNNEL);
      return matched === undefined ? undefined : { matched };
    },
  },
  {
    id: 'exfil.env-var-upload',
    category: 'exfiltration',
    severity: 'critical',
    action: 'block',
    title: 'credential environment variable sent to the network',
    detail:
      'The command interpolates a credential variable (`$AWS_SECRET_ACCESS_KEY`, `$GITHUB_TOKEN`, `$*_SECRET`, `$*_API_KEY`, `$DATABASE_URL`, …) into a request or a socket. The value is a live credential and the destination is outside the machine.',
    remediation:
      'Never interpolate credential variables into a network command. Reference the profile or identity by name and let the client library resolve the secret itself.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      for (const view of ctx.views) {
        if (!hasNetworkVerb(view)) continue;
        const local = globalRe(RE_SECRET_ENV_VAR);
        const match = local.exec(view);
        if (match === null) continue;
        return { matched: safeClip(view, MATCH_LIMIT), detail: `The command interpolates \`${safeClip(match[0], 64)}\` into a network request.` };
      }
      return undefined;
    },
  },
  {
    id: 'exfil.remote-copy',
    category: 'exfiltration',
    severity: 'high',
    action: 'ask',
    title: 'scp or rsync to a host that is not on the allowlist',
    detail:
      'The command copies files to a remote host that is not a known code host. There is no reviewable diff, no commit and no server-side record of what was sent, so a copy to an unvetted host is an unrecoverable disclosure.',
    remediation:
      'Push through the repository remote, or confirm the destination host and the exact file list with the user before copying.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      for (const view of ctx.views) {
        for (const host of remoteCopyHosts(view)) {
          if (ALLOWED_REMOTE_HOSTS.includes(host.toLowerCase())) continue;
          return { matched: safeClip(view, MATCH_LIMIT), detail: `The copy destination is \`${host}\`, which is not a known code host.` };
        }
      }
      return undefined;
    },
  },

  // -------------------------------------------------------------------------
  // secret-leak — a live credential inside the call itself
  // -------------------------------------------------------------------------
  {
    id: 'secret-leak.live-credential',
    category: 'secret-leak',
    severity: 'high',
    action: 'warn',
    title: 'live credential in the tool arguments',
    detail:
      'The call carries a value shaped like a live credential from the shared `SECRET_PATTERNS` table. Pasting a key into a command is sometimes the intended configuration step, so this warns and logs rather than blocking — but the value is now in the transcript and in the audit record.',
    remediation:
      'Pass the credential by reference (`--profile`, an env var the process already has, a secrets file outside the repository) and rotate the value if it was a real key.',
    tools: ['*'],
    test: (ctx) => {
      const hits: GuardHit[] = [];
      for (const pattern of SECRET_PATTERNS) {
        if (pattern.id === 'secret.private-key' || pattern.id === 'secret.ssh-private-key') continue;
        for (const view of ctx.views) {
          const local = globalRe(pattern.re);
          const match = local.exec(view);
          if (match === null) continue;
          hits.push({
            matched: safeClip(match[0], MATCH_LIMIT),
            detail: `Matched the \`${pattern.label}\` pattern (\`${pattern.id}\`).`,
            severity: 'high',
            action: 'warn',
          });
          break;
        }
        if (hits.length >= 6) break;
      }
      return hits.length === 0 ? undefined : hits;
    },
  },
  {
    id: 'secret-leak.private-key-destination',
    category: 'secret-leak',
    severity: 'critical',
    action: 'warn',
    title: 'private key material in the tool arguments',
    detail:
      'The call contains a complete PEM or OpenSSH private key block. Writing key material to a local file is a legitimate provisioning step, so that case only warns; when the same call also names a network destination the key is being transmitted, and then it is blocked, because the key authenticates every host that trusts it.',
    remediation:
      'Never transmit a private key. Copy the file with `cp`, install it with the platform\'s key tool, or generate a new key on the destination and share only the public half.',
    tools: ['*'],
    test: (ctx) => {
      const keyIds = ['secret.private-key', 'secret.ssh-private-key'];
      const hits: GuardHit[] = [];
      for (const id of keyIds) {
        const pattern = SECRET_INDEX.get(id);
        if (pattern === undefined) continue;
        for (const view of ctx.views) {
          const local = globalRe(pattern.re);
          const match = local.exec(view);
          if (match === null) continue;
          const transmitting = isNetworkDestination(ctx);
          hits.push({
            matched: safeClip(match[0], MATCH_LIMIT),
            severity: 'critical',
            action: transmitting ? 'block' : 'warn',
            detail: transmitting
              ? `A \`${pattern.label}\` appears in a call that also names a network destination, so the key would leave the machine.`
              : `A \`${pattern.label}\` appears in the arguments of \`${ctx.tool}\`. Move the key with a file copy rather than through tool arguments.`,
          });
          break;
        }
        if (hits.length >= 2) break;
      }
      return hits.length === 0 ? undefined : hits;
    },
  },

  // -------------------------------------------------------------------------
  // sandbox-escape — leaving the isolation the harness set up
  // -------------------------------------------------------------------------
  {
    id: 'sandbox-escape.permission-escalation',
    category: 'sandbox-escape',
    severity: 'critical',
    action: 'block',
    title: 'sandbox or approval policy widened inside the call',
    detail:
      'The arguments carry `sandbox_permissions: "danger-full-access"`, `--dangerously-skip-permissions`, `--no-sandbox` or an approval policy that disables prompts. These settings are the user\'s decision, not something a tool call may grant itself, and they remove the check that is running right now.',
    remediation:
      'Drop the override and run the command under the current sandbox. If it genuinely cannot work inside the sandbox, say which operation fails and let the user change the mode.',
    tools: ['*'],
    test: (ctx) => {
      const matched = viewMatch(ctx.views, RE_PERMISSION_ESCALATION);
      return matched === undefined ? undefined : { matched };
    },
  },
  {
    id: 'sandbox-escape.container-privilege',
    category: 'sandbox-escape',
    severity: 'critical',
    action: 'block',
    title: 'container started with host privileges',
    detail:
      '`--privileged`, `--cap-add SYS_ADMIN`, `--pid=host`, `--net=host`, a mount of `/` or `/etc`, and a bind of `/var/run/docker.sock` all give the container the host. The Docker socket mount is equivalent to root on the machine.',
    remediation:
      'Use the default capability set, mount only the project directory, and avoid host namespaces. If the work needs a privileged container, it needs a VM the user controls.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      const matched = viewMatch(ctx.views, RE_CONTAINER_PRIVILEGE);
      return matched === undefined ? undefined : { matched };
    },
  },
  {
    id: 'sandbox-escape.namespace-escape',
    category: 'sandbox-escape',
    severity: 'critical',
    action: 'block',
    title: 'namespace, chroot or tracer escape',
    detail:
      '`nsenter`, `chroot`, `unshare --user --map-root-user` and raw `ptrace`/`process_vm_readv` step outside the namespace or the process boundary the sandbox put in place. `LD_PRELOAD` has the same effect from inside by substituting library calls.',
    remediation:
      'Stay inside the sandbox and describe the operation that needs host access so the user can run it deliberately.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      const matched = viewMatch(ctx.views, RE_NAMESPACE_ESCAPE);
      return matched === undefined ? undefined : { matched };
    },
  },
  {
    id: 'sandbox-escape.kernel-and-mount',
    category: 'sandbox-escape',
    severity: 'critical',
    action: 'block',
    title: 'kernel, mount or device boundary crossed',
    detail:
      'Binding `/` into a new location, `pivot_root`, loading a kernel module, or rewriting `/proc/sys/kernel/core_pattern` changes the host from inside the container: the last one is the classic container escape, because the core dump is then piped to a program of the attacker\'s choosing.',
    remediation:
      'Mount only the directory the task needs and never touch `/proc/sys`, kernel modules or `core_pattern` from inside a session.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      const matched = viewMatch(ctx.views, RE_KERNEL_MOUNT);
      return matched === undefined ? undefined : { matched };
    },
  },
  {
    id: 'sandbox-escape.hardening-disable',
    category: 'sandbox-escape',
    severity: 'critical',
    action: 'block',
    title: 'platform hardening control disabled',
    detail:
      'Unconfined seccomp or AppArmor profiles, `setenforce 0`, `spctl --master-disable`, `csrutil disable` and `codesign --remove-signature` turn off the controls that would otherwise stop the next step. Disabling them is preparation, not a task.',
    remediation:
      'Leave the security controls enabled. If a specific binary is blocked by policy, report the exact denial instead of disabling the policy.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      const matched = viewMatch(ctx.views, RE_HARDENING_DISABLE);
      return matched === undefined ? undefined : { matched };
    },
  },

  // -------------------------------------------------------------------------
  // harness-abuse — attacking the plugin's own runtime
  // -------------------------------------------------------------------------
  {
    id: 'harness.dsh-state-write',
    category: 'harness-abuse',
    severity: 'high',
    action: 'ask',
    title: 'write to DSH state or credentials',
    detail:
      'The call writes to DSH\'s own state: `settings.yaml`, `credentials.yaml`, the sessions directory, profiles or storages. Those files hold the session transcript, the model credentials and the policy this guard reads, so a write there changes the harness itself.',
    remediation:
      'Ask the user to make the change, or change the source of truth (a config file in the repository) instead of the live state directory.',
    tools: ['*'],
    test: (ctx) => {
      const writeTool = ctx.tool === 'write' || ctx.tool === 'edit';
      const candidates: string[] = [];
      if (ctx.path !== undefined) candidates.push(ctx.path);
      candidates.push(...ctx.paths);
      for (const candidate of candidates) {
        const matched = RE_DSH_STATE.exec(candidate);
        if (matched === null) continue;
        if (!writeTool && !ctx.views.some((view) => hasWriteIntentNear(view, matched[0]))) continue;
        return {
          matched: safeClip(candidate, MATCH_LIMIT),
          detail: `The path targets DSH state at \`${matched[0]}\`.`,
          severity: /credentials\.ya?ml/.test(candidate) ? 'critical' : 'high',
        };
      }
      for (const view of ctx.views) {
        const matched = RE_DSH_STATE.exec(view);
        if (matched === null) continue;
        if (!hasWriteIntentNear(view, matched[0])) continue;
        return { matched: safeClip(matched[0], MATCH_LIMIT), detail: `The command writes to DSH state at \`${matched[0]}\`.` };
      }
      return undefined;
    },
  },
  {
    id: 'harness.plugin-install',
    category: 'harness-abuse',
    severity: 'medium',
    action: 'warn',
    title: 'package installed without a pre-install audit',
    detail:
      'A package manager is adding a dependency or a DSH plugin. Install lifecycle scripts run with the developer\'s privileges, and this call has not been through the plugin\'s pre-install audit, so nothing has inspected the tarball yet. This rule records the install; whether it is refused or escalated to a prompt is owned by the install policy (`guard.requireAuditForInstall`), which can consult the audit registry and this rule cannot.',
    remediation:
      'Run the pre-install audit on the package first (`security_scan_audit`, or `/security audit <source>`), read the report, and only then let the install proceed. Set `guard.requireAuditForInstall: true` to make the plugin demand that automatically.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      for (const view of ctx.views) {
        for (const target of installTargets(view)) {
          return {
            matched: safeClip(view, MATCH_LIMIT),
            detail: `The call installs \`${target}\`, which the scanner has not audited. Run the pre-install audit first.`,
          };
        }
      }
      return undefined;
    },
  },
  {
    id: 'harness.plugin-patch-edit',
    category: 'harness-abuse',
    severity: 'high',
    action: 'ask',
    title: 'edit of the plugin patch file or another plugin\'s installed files',
    detail:
      'The call writes to `cordis.patch.yml` or into an installed plugin tree. Editing the patch file is how a plugin row is removed, and removing the row for a guard plugin disables the guard for every later session with no code change anywhere.',
    remediation:
      'Make plugin changes in the plugin\'s source repository and reinstall, so the diff is reviewable. Do not edit installed files or the patch file from a tool call.',
    tools: ['*'],
    test: (ctx) => {
      const writeTool = ctx.tool === 'write' || ctx.tool === 'edit';
      const candidates: string[] = [];
      if (ctx.path !== undefined) candidates.push(ctx.path);
      candidates.push(...ctx.paths);
      for (const candidate of candidates) {
        const matched = RE_PLUGIN_FILES.exec(candidate);
        if (matched === null) continue;
        if (!writeTool && !ctx.views.some((view) => hasWriteIntentNear(view, matched[0]))) continue;
        return { matched: safeClip(candidate, MATCH_LIMIT), detail: `The path targets the plugin file \`${matched[0]}\`.` };
      }
      for (const view of ctx.views) {
        const matched = RE_PLUGIN_FILES.exec(view);
        if (matched === null) continue;
        if (!hasWriteIntentNear(view, matched[0])) continue;
        return { matched: safeClip(view, MATCH_LIMIT), detail: `The command writes to the plugin file \`${matched[0]}\`.` };
      }
      return undefined;
    },
  },
  {
    id: 'harness.audit-tamper',
    category: 'harness-abuse',
    severity: 'critical',
    action: 'block',
    title: 'audit log or audit key tampered with',
    detail:
      'The call writes to or truncates the plugin\'s audit log, removes the audit key, or rewrites `DSH_SECURITY_SCAN_KEY`. The log is hash-chained, so deleting a line or replacing the key breaks verification for every entry after it — and a forged key lets an attacker sign new entries that verify.',
    remediation:
      'Treat the audit directory as append-only and read-only from the model side. Rotating the key is an operator action, taken outside the session with the log rotated and re-anchored first.',
    tools: ['*'],
    test: (ctx) => {
      const environment = viewMatch(ctx.views, RE_AUDIT_ENV);
      if (environment !== undefined && viewHas(ctx.views, /\b(?:export|unset|set|echo|printf|env|rm|truncate)\b/)) {
        return { matched: environment, detail: 'The call names the plugin\'s HMAC key together with a command that changes or prints it.' };
      }
      for (const view of ctx.views) {
        const matched = RE_AUDIT_PATH.exec(view);
        if (matched === null) continue;
        if (!hasWriteIntentNear(view, matched[0])) continue;
        return { matched: safeClip(view, MATCH_LIMIT), detail: `The command modifies \`${matched[0]}\`, part of the tamper-evident audit trail.` };
      }
      const candidates: string[] = [];
      if (ctx.path !== undefined) candidates.push(ctx.path);
      candidates.push(...ctx.paths);
      for (const candidate of candidates) {
        const matched = RE_AUDIT_PATH.exec(candidate);
        if (matched === null) continue;
        if (ctx.tool !== 'write' && ctx.tool !== 'edit') continue;
        return { matched: safeClip(candidate, MATCH_LIMIT), detail: `The write targets \`${matched[0]}\`, part of the tamper-evident audit trail.` };
      }
      return undefined;
    },
  },
  {
    id: 'harness.process-kill',
    category: 'harness-abuse',
    severity: 'critical',
    action: 'block',
    title: 'the harness process is being killed',
    detail:
      'A `pkill`/`killall`/`kill`/`taskkill` targeted at `dsh` or at the node process running this session stops the guard, the audit writer and the session itself, mid-call. Any partial state on disk is whatever happened to be flushed.',
    remediation:
      'Do not signal the harness. If the process is wedged, report it and let the user stop it from their own terminal.',
    tools: ['bash', 'run_code'],
    test: (ctx) => {
      const matched = viewMatch(ctx.views, RE_KILL_DSH);
      return matched === undefined ? undefined : { matched };
    },
  },
];

// ---------------------------------------------------------------------------
// OUTPUT_RULES — output side, evaluated after a tool returns
// ---------------------------------------------------------------------------

/** The output catalog. `warn` redacts in place; `block` withholds the result. */
export const OUTPUT_RULES: OutputRule[] = [
  // -------------------------------------------------------------------------
  // Key material — the only shapes where redaction cannot be trusted
  // -------------------------------------------------------------------------
  {
    id: 'leak.private-key',
    category: 'secret-leak',
    severity: 'critical',
    action: 'block',
    title: 'private key block in a tool result',
    detail:
      'The result contains a complete PEM private key block. The guard withholds the result instead of redacting it, because a key whose body was partly substituted is still a key: the surrounding bytes stay in the transcript, and any copy of it compromises every host that trusts it.',
    remediation:
      'Read only the public half (`*.pub`, `ssh-keygen -y -f key`) or pass the key by reference so it never enters the model context, and rotate the key if this result was already stored.',
    tools: ['*'],
    test: secretTest(['secret.private-key'], 'critical'),
  },
  {
    id: 'leak.ssh-private-key',
    category: 'secret-leak',
    severity: 'critical',
    action: 'block',
    title: 'OpenSSH private key in a tool result',
    detail:
      'The result contains an `-----BEGIN OPENSSH PRIVATE KEY-----` block. It authorizes SSH access to every host that has the matching public key, so the whole result is withheld rather than redacted in place.',
    remediation:
      'Use the corresponding `.pub` file, or add the key to an agent with `ssh-add` outside the session. Rotate the key pair if the block was already read.',
    tools: ['*'],
    test: secretTest(['secret.ssh-private-key'], 'critical'),
  },

  // -------------------------------------------------------------------------
  // Credential families — one rule per family, so a finding names what leaked
  // -------------------------------------------------------------------------
  {
    id: 'leak.aws-access-key',
    category: 'secret-leak',
    severity: 'high',
    action: 'warn',
    title: 'AWS access key id in a tool result',
    detail:
      'The result contains an AWS access key id. The id alone does not sign requests, but paired with the secret key it does, and in this project it usually appears next to one.',
    remediation:
      'Remove the credential from the output path, use the named profile instead, and rotate the pair if it is live.',
    tools: ['*'],
    test: secretTest(['secret.aws-access-key']),
  },
  {
    id: 'leak.github-token',
    category: 'secret-leak',
    severity: 'high',
    action: 'warn',
    title: 'GitHub token in a tool result',
    detail:
      'The result contains a GitHub personal access token or app token. A token in a transcript is a token in every backup of that transcript, and its scopes are whatever they were when it was minted.',
    remediation:
      'Use `gh auth` with a stored credential, prefer short-lived installation tokens, and revoke the token if it was real.',
    tools: ['*'],
    test: secretTest(['secret.github-token']),
  },
  {
    id: 'leak.anthropic-key',
    category: 'secret-leak',
    severity: 'high',
    action: 'warn',
    title: 'Anthropic API key in a tool result',
    detail:
      'The result contains an `sk-ant-…` API key. It bills to the account that owns it and, without a spend cap, has no natural limit on how much it can be used.',
    remediation:
      'Keep the key in the environment the client reads, not in tool output, and rotate it if it was exposed.',
    tools: ['*'],
    test: secretTest(['secret.anthropic-key']),
  },
  {
    id: 'leak.deepseek-key',
    category: 'secret-leak',
    severity: 'high',
    action: 'warn',
    title: 'API key in a tool result',
    detail:
      'The result contains a token in the generic `sk-…` form used by DeepSeek and several compatible providers. It authenticates requests and bills to the owning account.',
    remediation:
      'Read the key from the environment at call time rather than printing it, and rotate it if the value reached a log.',
    tools: ['*'],
    test: secretTest(['secret.deepseek-key']),
  },
  {
    id: 'leak.google-api-key',
    category: 'secret-leak',
    severity: 'high',
    action: 'warn',
    title: 'Google API key in a tool result',
    detail:
      'The result contains an `AIza…` Google API key. Unless the key is restricted by referrer or IP, it can be used from anywhere for every API the project has enabled.',
    remediation:
      'Apply API and referrer restrictions to the key, and stop printing it — read it from the environment instead.',
    tools: ['*'],
    test: secretTest(['secret.google-api-key']),
  },
  {
    id: 'leak.slack-credential',
    category: 'secret-leak',
    severity: 'high',
    action: 'warn',
    title: 'Slack credential in a tool result',
    detail:
      'The result contains a Slack bot, user or app token, or an incoming-webhook URL. Either one lets whoever holds it post into the workspace, and a bot token usually reads history as well.',
    remediation:
      'Keep the token in the integration\'s own store, and rotate it from the Slack admin console if it was exposed.',
    tools: ['*'],
    test: secretTest(['secret.slack-token', 'secret.slack-webhook']),
  },
  {
    id: 'leak.stripe-key',
    category: 'secret-leak',
    severity: 'high',
    action: 'warn',
    title: 'Stripe live secret key in a tool result',
    detail:
      'The result contains a live-mode Stripe secret key. It moves real money and reads customer records, so exposure is a payment incident rather than a leak of test data.',
    remediation:
      'Revoke the key in the Stripe dashboard, use a restricted test-mode key for development, and never print the live key.',
    tools: ['*'],
    test: secretTest(['secret.stripe-key']),
  },
  {
    id: 'leak.gitlab-token',
    category: 'secret-leak',
    severity: 'high',
    action: 'warn',
    title: 'GitLab token in a tool result',
    detail:
      'The result contains a `glpat-…` personal access token. It carries the scopes of the user who created it, which is usually read and write access to their projects.',
    remediation:
      'Use a project or group access token with the narrowest scope, store it in CI variables, and revoke the leaked token.',
    tools: ['*'],
    test: secretTest(['secret.gitlab-token']),
  },
  {
    id: 'leak.npm-token',
    category: 'secret-leak',
    severity: 'high',
    action: 'warn',
    title: 'npm token in a tool result',
    detail:
      'The result contains an `npm_…` registry token. A publish-capable token lets its holder push a release under your package names, which is a supply-chain incident for everyone who installs them.',
    remediation:
      'Rotate the token on npmjs.com, use a granular token restricted to one package, and keep it out of tool output.',
    tools: ['*'],
    test: secretTest(['secret.npm-token']),
  },
  {
    id: 'leak.azure-account-key',
    category: 'secret-leak',
    severity: 'high',
    action: 'warn',
    title: 'Azure storage account key in a tool result',
    detail:
      'The result contains an `AccountKey=…` connection string. This key authorizes full access to the storage account, including deleting its containers.',
    remediation:
      'Switch the code to a managed identity or a short-lived SAS token, and rotate the account key if the string was exposed.',
    tools: ['*'],
    test: secretTest(['secret.azure-account-key']),
  },
  {
    id: 'leak.huggingface-token',
    category: 'secret-leak',
    severity: 'high',
    action: 'warn',
    title: 'Hugging Face token in a tool result',
    detail:
      'The result contains an `hf_…` access token. It reads private repositories and, with write scope, can publish models and datasets under the account.',
    remediation:
      'Use a read-only token for inference work and rotate the value if it reached a log.',
    tools: ['*'],
    test: secretTest(['secret.huggingface-token']),
  },
  {
    id: 'leak.sendgrid-key',
    category: 'secret-leak',
    severity: 'high',
    action: 'warn',
    title: 'SendGrid API key in a tool result',
    detail:
      'The result contains an `SG.…` API key. A mail-sending key can be used to send mail from your verified domains, which is a deliverability and reputational problem as well as a leak.',
    remediation:
      'Restrict the key to the sending permission it needs and rotate it after any exposure.',
    tools: ['*'],
    test: secretTest(['secret.sendgrid-key']),
  },
  {
    id: 'leak.twilio-key',
    category: 'secret-leak',
    severity: 'medium',
    action: 'warn',
    title: 'Twilio API key in a tool result',
    detail:
      'The result contains a 32-hex-digit `SK…` key in the shape Twilio uses for API keys. It authenticates account operations and accrues charges when used.',
    remediation:
      'Store the key in the platform\'s own environment variable and rotate it if it was printed.',
    tools: ['*'],
    test: secretTest(['secret.twilio-key']),
  },

  // -------------------------------------------------------------------------
  // Topology, generic credential shapes, environment dumps, session material,
  // and the plugin's own key
  // -------------------------------------------------------------------------
  {
    id: 'leak.internal-topology',
    category: 'ssrf',
    severity: 'medium',
    action: 'warn',
    title: 'internal network topology in a tool result',
    detail:
      'The result reveals where the internal network lives: RFC1918, CGNAT, link-local or unique-local addresses, a metadata address, an internal hostname suffix (`.internal`, `.corp`, `.svc.cluster.local`), or a forwarded-header line naming one. A config file the user asked for can legitimately contain these, so the value is redacted in place rather than withholding the result.',
    remediation:
      'Keep internal addresses out of shared output and replace them with the service name the callers use; if a specific address is needed for the task, repeat that single value explicitly.',
    tools: ['*'],
    test: (ctx) => {
      const hits: OutputHit[] = [];
      const seen = new Set<string>();
      const push = (hit: OutputHit): void => {
        if (seen.has(hit.matched)) return;
        seen.add(hit.matched);
        hits.push(hit);
      };

      const ipv4 = globalRe(RE_OUTPUT_IPV4);
      let match: RegExpExecArray | null;
      while ((match = ipv4.exec(ctx.text)) !== null) {
        if (!isPrivateAddressLiteral(match[0])) continue;
        if (isPublishedAddress(match[0])) continue;
        const metadata = METADATA_HOSTS.includes(match[0]);
        push({
          matched: match[0],
          replacement: metadata ? '«metadata-ip»' : '«internal-ip»',
          label: metadata ? 'metadata-address' : 'internal-address',
          detail: `${privateAddressClass(match[0])}.`,
        });
        if (hits.length >= 16) break;
      }

      const ipv6 = globalRe(RE_OUTPUT_IPV6);
      while ((match = ipv6.exec(ctx.text)) !== null) {
        if (!isPrivateAddressLiteral(match[0])) continue;
        if (isPublishedAddress(match[0])) continue;
        push({ matched: match[0], replacement: '«internal-ip»', label: 'internal-address' });
        if (hits.length >= 24) break;
      }

      const hostRe = globalRe(HOSTNAME_RE);
      while ((match = hostRe.exec(ctx.text)) !== null) {
        const host = match[0];
        if (!isInternalHostname(host)) continue;
        // A hostname ends at the match. Without this, a dotted identifier whose
        // last label happens to be an internal suffix is treated as an address —
        // `ssrf.internal-hostname` in a rule id is not a host, and redacting it
        // silently mangles the identifiers a reader is trying to search for.
        if (/[-\w.]/.test(ctx.text[match.index + host.length] ?? '')) continue;
        // Nor does a hostname start after a path separator: `/etc/rc.local` and
        // `scripts/deploy.local` are file names that end in an internal suffix.
        if (ctx.text[match.index - 1] === '/') continue;
        const suffix = INTERNAL_HOST_SUFFIXES.find((candidate) => host.toLowerCase().endsWith(candidate));
        push({
          matched: host,
          replacement: '«internal-host»',
          label: 'internal-hostname',
          ...(suffix !== undefined ? { detail: `Internal suffix \`${suffix}\`.` } : {}),
        });
        if (hits.length >= 32) break;
      }

      const headerRe = globalRe(RE_TOPOLOGY_HEADER);
      while ((match = headerRe.exec(ctx.text)) !== null) {
        const name = match[1] ?? 'Host';
        const value = (match[2] ?? '').trim();
        if (!isInternalHostname(value) && !isPrivateAddressLiteral(value.split(':')[0] ?? value)) continue;
        push({
          matched: match[0],
          replacement: `${name}: «internal-host»`,
          label: 'internal-header',
          detail: `The ${name} header exposes an internal name.`,
        });
        if (hits.length >= 40) break;
      }

      return hits.length === 0 ? undefined : hits;
    },
  },
  {
    id: 'leak.generic-credential',
    category: 'secret-leak',
    severity: 'high',
    action: 'warn',
    title: 'credential-shaped assignment in a tool result',
    detail:
      'The result contains an assignment whose name marks it as a secret (`password = "…"`, `api_key: \'…\'`), a credential embedded in a URL, or a bearer header. The assigned-value shape appears in plenty of configuration files that are safe to read, so it is redacted in place rather than withheld.',
    remediation:
      'Replace the literal with a reference to the secret store the service reads at start-up, and rotate the value if the result has been stored anywhere.',
    tools: ['*'],
    test: (ctx) => {
      const hits = [
        ...collectOutput(ctx.text, RE_ASSIGNED_SECRET, '«redacted:assigned-secret»', 'assigned-secret', 8, 'high'),
        ...collectOutput(ctx.text, RE_URL_CREDENTIALS, 'https://«redacted»@', 'url-credentials', 8, 'high'),
        ...collectOutput(ctx.text, RE_BEARER, 'Bearer «redacted»', 'bearer-credential', 8, 'high'),
      ];
      return hits.length === 0 ? undefined : hits;
    },
  },
  {
    id: 'leak.environment-dump',
    category: 'secret-leak',
    severity: 'medium',
    action: 'warn',
    title: 'bulk environment dump in a tool result',
    detail:
      'The result is an environment dump: six or more `NAME=value` lines whose names identify credentials. Individual dumps of one variable are not reported; this many at once means the whole process environment is in the transcript, including values the task never needed.',
    remediation:
      'Print the one variable the task requires (`printenv NAME`) instead of the whole environment, and rotate any credential that appeared in the dump.',
    tools: ['*'],
    test: (ctx) => {
      const pairs: { matched: string; replacement: string }[] = [];
      const re = globalRe(RE_SECRET_ENV_LINE);
      let match: RegExpExecArray | null;
      while ((match = re.exec(ctx.text)) !== null) {
        const name = match[1] ?? '';
        if (name.length === 0) continue;
        pairs.push({ matched: match[0], replacement: `${name}=«redacted»` });
        if (pairs.length >= 64) break;
      }
      if (pairs.length < 6) return undefined;
      return pairs.map((pair, index) => ({
        ...pair,
        label: 'environment-dump',
        ...(index === 0 ? { detail: `${pairs.length} credential-shaped environment assignments are present in this result.` } : {}),
      }));
    },
  },
  {
    id: 'leak.session-material',
    category: 'secret-leak',
    severity: 'high',
    action: 'warn',
    title: 'session or authorization material in a tool result',
    detail:
      'The result contains a JSON Web Token, a signed URL, an OAuth authorization code, or a long cookie value. Each of these is a bearer credential for as long as it lives, which is why they are redacted in place and the rest of the result is preserved.',
    remediation:
      'Keep tokens in the client that uses them, exchange authorization codes immediately, and avoid printing URLs that carry signatures — a signed URL keeps working after the log is written.',
    tools: ['*'],
    test: (ctx) => {
      const hits: OutputHit[] = [];
      hits.push(...collectOutput(ctx.text, RE_JWT, '«redacted:jwt»', 'json-web-token', 8, 'high'));

      const signed = globalRe(RE_SIGNED_QUERY);
      let match: RegExpExecArray | null;
      while ((match = signed.exec(ctx.text)) !== null) {
        const name = match[1] ?? 'token';
        hits.push({ matched: match[0], replacement: `${name}=«redacted»`, label: 'signed-url-parameter' });
        if (hits.length >= 16) break;
      }

      const cookie = globalRe(RE_COOKIE_PAIR);
      while ((match = cookie.exec(ctx.text)) !== null) {
        const name = match[1] ?? 'cookie';
        const value = match[2] ?? '';
        if (value.length < 24 || shannonEntropy(value) < 3) continue;
        hits.push({ matched: match[0], replacement: `${name}=«redacted:session-cookie»`, label: 'session-cookie' });
        if (hits.length >= 24) break;
      }

      return hits.length === 0 ? undefined : hits;
    },
  },
  {
    id: 'leak.audit-key',
    category: 'harness-abuse',
    severity: 'critical',
    action: 'block',
    title: 'the plugin\'s audit key in a tool result',
    detail:
      'The result contains `DSH_SECURITY_SCAN_KEY` or a 64-hex-char value presented as the audit key. That key is the HMAC used to chain the audit log: anyone holding it can append entries that verify, or rewrite an existing chain and re-sign it, which is exactly the tampering the chain exists to detect.',
    remediation:
      'Keep the key in the environment of the harness process only. If it appeared in a result, rotate it and re-anchor the log from the last entry whose hash you can still vouch for.',
    tools: ['*'],
    test: (ctx) => {
      const hits: OutputHit[] = [];
      const assigned = globalRe(RE_AUDIT_KEY_VALUE);
      let match: RegExpExecArray | null;
      while ((match = assigned.exec(ctx.text)) !== null) {
        hits.push({
          matched: match[0],
          replacement: 'audit-key=«redacted:audit-key»',
          label: 'audit-key',
          detail: 'A key-shaped name is assigned a 64-hex-character value.',
        });
        if (hits.length >= 4) break;
      }
      // The value must be key material, not any non-space run: `resolveKey` only
      // accepts 64 hex characters, and matching a bare `NAME=…` made this rule
      // fire on its own replacement placeholder — the string `NAME=«redacted»`
      // appears in this very file.
      const envLine = /(?<![\w-])DSH_SECURITY_SCAN_KEY\s*[=:]\s*[0-9a-fA-F]{64}(?![\w-])/.exec(ctx.text);
      if (envLine !== null) {
        hits.push({ matched: envLine[0], replacement: 'DSH_SECURITY_SCAN_KEY=«redacted:audit-key»', label: 'audit-key' });
      }
      const bare = globalRe(RE_HEX64);
      while ((match = bare.exec(ctx.text)) !== null) {
        const index = match.index;
        const around = ctx.text.slice(Math.max(0, index - 60), index + 60).toLowerCase();
        if (!/audit|hmac|security.?gate|security.?scan|scan[_-]?key/.test(around)) continue;
        hits.push({ matched: match[0], replacement: '«redacted:audit-key»', label: 'audit-key' });
        if (hits.length >= 8) break;
      }
      return hits.length === 0 ? undefined : hits;
    },
  },
];
