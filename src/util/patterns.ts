/**
 * Shared pattern vocabulary: secret shapes, network classification, and the
 * address forms an attacker uses to smuggle a private destination past a naive
 * string check.
 *
 * Both layers depend on this file. The scanner uses it to decide that a plugin
 * *can* reach the network or a credential; the runtime guard uses it to decide
 * that a specific tool call *is* doing so right now. Keeping one table means a
 * pattern added for the pre-install audit is automatically enforced at runtime.
 *
 * @module dsh-security-scan/util/patterns
 */

import type { Severity } from '../types.js';

/** One secret shape, usable both to detect and to redact. */
export interface SecretPattern {
  /** Stable id, e.g. `secret.aws-access-key`. */
  id: string;
  /** Human label used in reports. */
  label: string;
  /** Matching expression. Every pattern carries the `g` flag. */
  re: RegExp;
  /** Text substituted for a match by the redactor. */
  replacement: string;
  severity: Severity;
}

/**
 * Secret shapes, most specific first.
 *
 * Order matters for redaction: the first pattern to match wins, so
 * `sk-ant-…` must be listed before the generic `sk-…` form, otherwise the
 * Anthropic key is labelled as a generic one (harmless) and, worse, a generic
 * pattern could redact only a prefix and leave the tail in the log.
 */
export const SECRET_PATTERNS: readonly SecretPattern[] = [
  {
    id: 'secret.private-key',
    label: 'private key block',
    // A real PEM body is lines of 64 base64 characters. Requiring one unbroken
    // run of at least 64 from the base64 alphabet is what separates key material
    // from a document that merely *names* the header: a security plugin's own rule
    // text names it, and a lazy `[\s\S]*?` bridged two such mentions into one
    // "key" that then withheld whole tool results.
    re: /-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----[\s\S]{0,120}?[A-Za-z0-9+/]{64,}[\s\S]{0,20000}?-----END (?:[A-Z0-9 ]+ )?PRIVATE KEY-----/g,
    replacement: '-----BEGIN PRIVATE KEY-----«redacted»-----END PRIVATE KEY-----',
    severity: 'critical',
  },
  {
    id: 'secret.ssh-private-key',
    label: 'OpenSSH private key',
    // Same body requirement, and note the trailing `|$`: without a base64 run in
    // front of it, that alternative matched a bare mention of the header all the
    // way to the end of the text, reporting documentation as a private key.
    re: /-----BEGIN OPENSSH PRIVATE KEY-----[\s\S]{0,120}?[A-Za-z0-9+/]{64,}[\s\S]{0,20000}?(?:-----END OPENSSH PRIVATE KEY-----|$)/g,
    replacement: '-----BEGIN OPENSSH PRIVATE KEY-----«redacted»',
    severity: 'critical',
  },
  {
    id: 'secret.anthropic-key',
    label: 'Anthropic API key',
    re: /\bsk-ant-[A-Za-z0-9_-]{16,}/g,
    replacement: '«redacted:anthropic-key»',
    severity: 'critical',
  },
  {
    id: 'secret.deepseek-key',
    label: 'DeepSeek API key',
    re: /\bsk-(?!ant-|live_|test_)[A-Za-z0-9]{24,}/g,
    replacement: '«redacted:api-key»',
    severity: 'critical',
  },
  {
    id: 'secret.github-token',
    label: 'GitHub token',
    re: /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{20,})/g,
    replacement: '«redacted:github-token»',
    severity: 'critical',
  },
  {
    id: 'secret.aws-access-key',
    label: 'AWS access key id',
    re: /\b(?:AKIA|ASIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ABIA|ACCA)[0-9A-Z]{16}\b/g,
    replacement: '«redacted:aws-access-key»',
    severity: 'critical',
  },
  {
    id: 'secret.google-api-key',
    label: 'Google API key',
    re: /\bAIza[0-9A-Za-z_-]{35}\b/g,
    replacement: '«redacted:google-api-key»',
    severity: 'critical',
  },
  {
    id: 'secret.slack-token',
    label: 'Slack token',
    re: /\bxox[abprs]-[0-9A-Za-z-]{10,}/g,
    replacement: '«redacted:slack-token»',
    severity: 'critical',
  },
  {
    id: 'secret.slack-webhook',
    label: 'Slack incoming webhook',
    re: /https:\/\/hooks\.slack\.com\/(?:services|workflows)\/[A-Za-z0-9/_-]{12,}/g,
    replacement: '«redacted:slack-webhook»',
    severity: 'high',
  },
  {
    id: 'secret.stripe-key',
    label: 'Stripe secret key',
    re: /\b(?:sk|rk)_live_[0-9a-zA-Z]{16,}/g,
    replacement: '«redacted:stripe-key»',
    severity: 'critical',
  },
  {
    id: 'secret.gitlab-token',
    label: 'GitLab token',
    re: /\bglpat-[A-Za-z0-9_-]{18,}/g,
    replacement: '«redacted:gitlab-token»',
    severity: 'critical',
  },
  {
    id: 'secret.npm-token',
    label: 'npm token',
    re: /\bnpm_[A-Za-z0-9]{34,}/g,
    replacement: '«redacted:npm-token»',
    severity: 'critical',
  },
  {
    id: 'secret.huggingface-token',
    label: 'Hugging Face token',
    re: /\bhf_[A-Za-z0-9]{30,}/g,
    replacement: '«redacted:hf-token»',
    severity: 'high',
  },
  {
    id: 'secret.sendgrid-key',
    label: 'SendGrid key',
    re: /\bSG\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{40,}/g,
    replacement: '«redacted:sendgrid-key»',
    severity: 'high',
  },
  {
    id: 'secret.twilio-key',
    label: 'Twilio key',
    re: /\bSK[0-9a-fA-F]{32}\b/g,
    replacement: '«redacted:twilio-key»',
    severity: 'medium',
  },
  {
    id: 'secret.jwt',
    label: 'JSON Web Token',
    re: /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,
    replacement: '«redacted:jwt»',
    severity: 'high',
  },
  {
    id: 'secret.azure-account-key',
    label: 'Azure storage account key',
    re: /AccountKey=[A-Za-z0-9+/=]{40,}/g,
    replacement: 'AccountKey=«redacted»',
    severity: 'critical',
  },
  {
    id: 'secret.bearer-header',
    label: 'bearer credential',
    re: /\bBearer\s+[A-Za-z0-9._~+/-]{20,}={0,2}/g,
    replacement: 'Bearer «redacted»',
    severity: 'high',
  },
  {
    id: 'secret.url-credentials',
    label: 'credentials embedded in a URL',
    re: /\bhttps?:\/\/[^\s/:@]+:[^\s/@]{4,}@/g,
    replacement: 'https://«redacted»@',
    severity: 'high',
  },
  {
    id: 'secret.assigned-value',
    label: 'assigned secret value',
    re: /\b(?:api[_-]?key|apikey|secret[_-]?key|client[_-]?secret|access[_-]?token|auth[_-]?token|private[_-]?key|passwd|password|passphrase)\b\s*[:=]\s*["']([^"'\s]{16,})["']/gi,
    replacement: '«redacted:assigned-secret»',
    severity: 'high',
  },
] as const;

/** Look one secret pattern up by id. */
export function secretPattern(id: string): SecretPattern | undefined {
  return SECRET_PATTERNS.find((pattern) => pattern.id === id);
}

/** Cloud instance-metadata endpoints — the classic SSRF destination. */
export const METADATA_HOSTS: readonly string[] = [
  '169.254.169.254', // AWS / Azure / OpenStack IMDS
  '169.254.170.2', // AWS ECS task credentials
  '169.254.169.253', // AWS VPC DNS
  '100.100.100.200', // Alibaba Cloud
  'fd00:ec2::254', // AWS IMDS over IPv6
  'metadata.google.internal',
  'metadata.goog',
  'metadata.azure.com',
  'metadata.azure.net',
  'metadata.packet.net',
  'metadata.platformequinix.com',
  'instance-data',
];

/** Hostnames that resolve inside a private network by convention. */
export const INTERNAL_HOST_SUFFIXES: readonly string[] = [
  '.internal',
  '.local',
  '.localhost',
  '.lan',
  '.corp',
  '.intranet',
  '.home.arpa',
  '.cluster.local',
  '.svc.cluster.local',
  '.in-addr.arpa',
  '.ip6.arpa',
];

/** URL schemes that never legitimately appear in a model-issued fetch. */
export const DANGEROUS_SCHEMES: readonly string[] = [
  'file',
  'gopher',
  'dict',
  'ftp',
  'tftp',
  'ldap',
  'netdoc',
  'jar',
  'data',
  'blob',
  'expect',
];

/** Registration endpoints commonly used to receive exfiltrated data. */
export const EXFIL_HOSTS: readonly string[] = [
  'webhook.site',
  'requestbin.net',
  'requestbin.com',
  'pipedream.net',
  'pipedream.com',
  'ngrok.io',
  'ngrok-free.app',
  'ngrok.app',
  'burpcollaborator.net',
  'oastify.com',
  'oast.fun',
  'oast.live',
  'oast.me',
  'interact.sh',
  'interactsh.com',
  'canarytokens.com',
  'canarytokens.org',
  'transfer.sh',
  'termbin.com',
  'ix.io',
  '0x0.st',
  'pastebin.com',
  'paste.ee',
  'dpaste.com',
  'hastebin.com',
  'tunshell.com',
  'serveo.net',
  'localhost.run',
  'beeceptor.com',
  'hookbin.com',
  'requestcatcher.com',
  'dnslog.cn',
  'ceye.io',
];

/** Dotted-quad IPv4 literal. */
export const IPV4_RE = /\b(?:\d{1,3}\.){3}\d{1,3}\b/;

/** IPv6 literal in a URL authority, e.g. `[::1]`. */
export const IPV6_BRACKET_RE = /\[[0-9A-Fa-f:.]{2,45}\]/;

/**
 * Expand an obfuscated IPv4 spelling into dotted-quad form.
 *
 * Attackers reach `127.0.0.1` as `2130706433`, `0177.0.0.1`, `0x7f000001` and
 * `127.1`, and a filter that only matches dotted quads misses all of them.
 *
 * @param text - a candidate token, already stripped of any scheme or path.
 * @returns the dotted-quad form, or `undefined` when the token is not an IPv4 address.
 */
export function normalizeIPv4(text: string): string | undefined {
  const value = text.trim();
  if (value.length === 0) return undefined;

  // A pure decimal integer covers the single-number form.
  if (/^\d{1,10}$/.test(value)) {
    const asNumber = Number(value);
    if (!Number.isSafeInteger(asNumber) || asNumber < 0 || asNumber > 0xffffffff) return undefined;
    return [
      (asNumber >>> 24) & 0xff,
      (asNumber >>> 16) & 0xff,
      (asNumber >>> 8) & 0xff,
      asNumber & 0xff,
    ].join('.');
  }

  // A single hexadecimal integer, with or without the `0x` prefix.
  if (/^(?:0x[0-9a-f]{1,8}|[0-9a-f]{8})$/i.test(value)) {
    const asNumber = Number.parseInt(value.replace(/^0x/i, ''), 16);
    return [
      (asNumber >>> 24) & 0xff,
      (asNumber >>> 16) & 0xff,
      (asNumber >>> 8) & 0xff,
      asNumber & 0xff,
    ].join('.');
  }

  const parts = value.split('.');
  if (parts.length < 2 || parts.length > 4) return undefined;
  const octets: number[] = [];
  for (const part of parts) {
    if (part.length === 0) return undefined;
    let octet: number;
    if (/^0x[0-9a-f]+$/i.test(part)) octet = Number.parseInt(part.slice(2), 16);
    else if (/^0[0-7]+$/.test(part)) octet = Number.parseInt(part.slice(1), 8);
    else if (/^\d+$/.test(part)) octet = Number.parseInt(part, 10);
    else return undefined;
    if (!Number.isInteger(octet) || octet < 0 || octet > 0xffffffff) return undefined;
    octets.push(octet);
  }
  // `a.b` and `a.b.c` are shorthand: the last part absorbs the remaining bytes.
  const last = octets.pop() as number;
  const remaining = 4 - octets.length;
  if (last >= 256 ** remaining) return undefined;
  for (let index = 0; index < remaining; index += 1) {
    octets.push((last >>> (8 * (remaining - 1 - index))) & 0xff);
  }
  if (octets.some((octet) => octet > 255)) return undefined;
  return octets.join('.');
}

/**
 * Whether a dotted-quad address is not globally routable.
 *
 * Covers RFC1918, loopback, link-local (including metadata), CGNAT, benchmark,
 * documentation, multicast, reserved and broadcast space. A private address is
 * not automatically malicious — it is a *destination class*, and the guard
 * decides based on which tool is reaching it.
 *
 * @param address - a dotted-quad IPv4 address.
 * @returns true when the address is special-use rather than public.
 */
export function isPrivateIPv4(address: string): boolean {
  const parts = address.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts as [number, number, number, number];
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 192 && b === 0) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a === 198 && b === 51) return true;
  if (a === 203 && b === 0) return true;
  if (a >= 224) return true;
  return false;
}

/**
 * Whether an IPv6 literal is loopback, unique-local or link-local.
 *
 * @param address - an IPv6 address without surrounding brackets.
 * @returns true when the address is not globally routable.
 */
export function isPrivateIPv6(address: string): boolean {
  const value = address.toLowerCase().split('%')[0] as string;
  if (value === '::' || value === '::1') return true;
  // IPv4-mapped and IPv4-compatible forms delegate to the v4 classifier.
  const mapped = /^::(?:ffff:)?(\d{1,3}(?:\.\d{1,3}){3})$/.exec(value);
  if (mapped) return isPrivateIPv4(mapped[1] as string);
  if (/^f[cd][0-9a-f]{2}:/.test(value)) return true; // fc00::/7 unique-local
  if (/^fe[89ab][0-9a-f]:/.test(value)) return true; // fe80::/10 link-local
  if (value.startsWith('ff')) return true; // multicast
  return false;
}

/**
 * Classify any literal address string.
 *
 * @param literal - an IPv4 dotted quad, obfuscated IPv4 form, or bare IPv6 literal.
 * @returns true when the literal denotes a non-public address.
 */
export function isPrivateAddressLiteral(literal: string): boolean {
  const bare = literal.replace(/^\[|\]$/g, '');
  if (bare.includes(':')) return isPrivateIPv6(bare);
  const normalized = normalizeIPv4(bare);
  if (normalized === undefined) return false;
  return isPrivateIPv4(normalized);
}

/**
 * Whether a hostname denotes an internal destination by naming convention.
 *
 * @param hostname - the host part of a URL, lowercased by the caller or not.
 * @returns true for `.internal`, `.local`, `.corp` and similar suffixes, or a
 *   cloud metadata hostname.
 */
export function isInternalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (host.length === 0) return false;
  if (METADATA_HOSTS.includes(host)) return true;
  if (host === 'localhost') return true;
  return INTERNAL_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

/**
 * Whether a hostname belongs to a known exfiltration or tunnelling service.
 *
 * @param hostname - the host part of a URL.
 * @returns true when the host is a known data-drop service.
 */
export function isExfilHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return EXFIL_HOSTS.some((known) => host === known || host.endsWith(`.${known}`));
}

/** Matches `<scheme>://<authority>` anywhere in a text. */
export const URL_AUTHORITY_RE = /\b([a-z][a-z0-9+.-]{1,15}):\/\/([^\s/?#"'`<>)\]}]+)/gi;

/** A hostname that looks like a domain, used for bare-string extraction. */
export const HOSTNAME_RE = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,24})\b/gi;
