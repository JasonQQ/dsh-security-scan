/**
 * Canonicalization for attacker-controlled text.
 *
 * A guard that matches `rm -rf /` against the raw command string is bypassed by
 * `rm${IFS}-rf${IFS}/`, by `r\m -rf /`, by a quoted `"rm" "-rf" "/"`, and by
 * `echo cm0gLXJmIC8= | base64 -d | sh`. This module turns one input string into
 * a small set of *views* — decoded, unquoted, separator-normalized, and
 * base64-unwrapped — so a single rule can match any of those spellings without
 * every rule author re-deriving them.
 *
 * Views are additive: the raw text is always view zero, so a rule that wants
 * literal matching can still ask for it.
 *
 * @module dsh-security-gate/util/normalize
 */

import { normalizeIPv4 } from './patterns.js';

/** Upper bound on the text one call will canonicalize. */
export const NORMALIZE_LIMIT = 1_000_000;

/** One spelled-out rendering of an input string. */
export interface View {
  /** How this view was produced, for evidence reporting. */
  label: 'raw' | 'decoded' | 'shell' | 'base64';
  text: string;
}

/** Decode backslash escapes: `\x41`, `\u0041`, `\101`, `\n`, `\\`. */
function decodeEscapes(text: string): string {
  return text
    .replace(/\\x([0-9A-Fa-f]{2})/g, (_match, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/\\u([0-9A-Fa-f]{4})/g, (_match, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/\\([0-7]{1,3})/g, (_match, oct: string) => String.fromCharCode(Number.parseInt(oct, 8)))
    .replace(/\\n/g, ' ')
    .replace(/\\t/g, ' ')
    .replace(/\\r/g, ' ')
    .replace(/\\(.)/g, '$1');
}

/** Remove shell quoting so `"rm" '-rf' /` reads as `rm -rf /`. */
function unquote(text: string): string {
  return text
    .replace(/\$'([^']*)'/g, '$1')
    .replace(/'([^']*)'/g, '$1')
    .replace(/"([^"]*)"/g, '$1')
    .replace(/`([^`]*)`/g, '$1');
}

/** Normalize the shell's many whitespace stand-ins to a single space. */
function normalizeSeparators(text: string): string {
  return text
    .replace(/\$\{IFS\}/gi, ' ')
    .replace(/\$IFS/gi, ' ')
    .replace(/\$\{?IFS:0:1\}?/gi, ' ')
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/\s*([;|&<>])\s*/g, ' $1 ')
    .replace(/\n/g, ' ; ')
    .trim();
}

/** Collapse `.` and `..` path segments so `/etc/./shadow` reads as `/etc/shadow`. */
export function normalizePath(path: string): string {
  const parts = path.split('/');
  const out: string[] = [];
  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      if (out.length > 0 && out[out.length - 1] !== '..') out.pop();
      else out.push('..');
      continue;
    }
    out.push(part);
  }
  return `/${out.join('/')}`;
}

/** Whether a decoded blob looks like text rather than binary noise. */
function looksLikeText(text: string): boolean {
  if (text.length === 0) return false;
  let printable = 0;
  for (const char of text) {
    const code = char.codePointAt(0) as number;
    if (code === 9 || code === 10 || code === 13 || (code >= 32 && code < 127)) printable += 1;
  }
  return printable / text.length > 0.9;
}

/** Candidate base64 runs, longest first so nested payloads surface. */
function base64Runs(text: string): string[] {
  const runs = text.match(/[A-Za-z0-9+/]{16,}={0,2}/g);
  if (runs === null) return [];
  return [...new Set(runs)].sort((left, right) => right.length - left.length).slice(0, 8);
}

/**
 * Short base64 runs that sit next to an explicit decoder.
 *
 * The blanket {@link base64Runs} threshold is 16 characters so that ordinary
 * identifiers are not decoded into noise. That threshold also hides the most
 * common obfuscated one-liner there is: `rm -rf /` encodes to the 11-character
 * `cm0gLXJmIC8=`. So a pipeline that names a decoder is treated as a strong
 * enough signal on its own, and the run feeding it is decoded regardless of
 * length.
 *
 * @param text - the source text.
 * @returns the runs feeding an explicit `base64 -d` / `openssl ... -d`.
 */
function pipelineBase64Runs(text: string): string[] {
  const out: string[] = [];
  // `echo <b64> | base64 -d`, `printf %s <b64> | base64 --decode | sh`
  for (const match of text.matchAll(/([A-Za-z0-9+/]{8,}={0,2})\s*\|\s*(?:base64|openssl\s+(?:enc|base64))\s*-(?:-decode|d|D)\b/gi)) {
    out.push(match[1] as string);
  }
  // `base64 -d <<< '<b64>'`
  for (const match of text.matchAll(/(?:base64|openssl\s+(?:enc|base64))\s*-(?:-decode|d|D)\b[^A-Za-z0-9+/]{0,12}([A-Za-z0-9+/]{8,}={0,2})/gi)) {
    out.push(match[1] as string);
  }
  return [...new Set(out)].slice(0, 8);
}

/** Decode one base64 run when the result is printable text. */
function decodeRun(run: string): string | undefined {
  const padded = run.length % 4 === 0 ? run : run.slice(0, run.length - (run.length % 4));
  if (padded.length < 8) return undefined;
  try {
    const asText = Buffer.from(padded, 'base64').toString('utf8');
    return looksLikeText(asText) ? asText : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Decode base64 runs that decode to printable text.
 *
 * Only printable decodes are kept: a random binary blob decoding to noise is
 * not evidence of anything and would only add noise to the views. Runs adjacent
 * to an explicit decoder are accepted at any length; longer standalone runs are
 * decoded because 16+ characters of base64 is already unlikely to be prose.
 *
 * @param text - the source text.
 * @returns decoded fragments, at most sixteen.
 */
export function decodeBase64Fragments(text: string): string[] {
  const decoded: string[] = [];
  for (const run of [...pipelineBase64Runs(text), ...base64Runs(text)]) {
    const asText = decodeRun(run);
    if (asText !== undefined) decoded.push(asText);
  }
  return [...new Set(decoded)].slice(0, 16);
}

/** Hex runs that decode to printable text — the other common payload encoding. */
function decodeHexFragments(text: string): string[] {
  const runs = text.match(/(?:[0-9A-Fa-f]{2}){12,}/g);
  if (runs === null) return [];
  const decoded: string[] = [];
  for (const run of [...new Set(runs)].slice(0, 4)) {
    const asText = Buffer.from(run, 'hex').toString('utf8');
    if (looksLikeText(asText) && /[\s/;|&$]/.test(asText)) decoded.push(asText);
  }
  return decoded;
}

/**
 * Build the view set for one input string.
 *
 * View 0 is always the raw text. The remaining views are derived and
 * de-duplicated, so a caller can iterate cheaply without repeating work.
 *
 * @param input - the raw command or text to canonicalize.
 * @returns the distinct views, raw first.
 */
export function shellViews(input: string): View[] {
  const raw = input.length > NORMALIZE_LIMIT ? input.slice(0, NORMALIZE_LIMIT) : input;
  const views: View[] = [{ label: 'raw', text: raw }];
  const seen = new Set<string>([raw]);

  const push = (label: View['label'], text: string): void => {
    if (text.length === 0 || seen.has(text)) return;
    seen.add(text);
    views.push({ label, text });
  };

  const decoded = decodeEscapes(raw);
  push('decoded', decoded);

  const shell = normalizeSeparators(unquote(decoded));
  push('shell', shell);

  // A second pass catches payloads that only become readable after unquoting.
  const shellAgain = normalizeSeparators(unquote(normalizeSeparators(unquote(raw))));
  push('shell', shellAgain);

  for (const fragment of [...decodeBase64Fragments(raw), ...decodeHexFragments(raw)]) {
    push('base64', fragment);
    push('base64', normalizeSeparators(unquote(decodeEscapes(fragment))));
  }

  return views;
}

/**
 * All views joined by `\n`, for rules that want one string to scan.
 *
 * @param input - the raw command or text.
 * @returns the concatenated views.
 */
export function shellText(input: string): string {
  return shellViews(input)
    .map((view) => view.text)
    .join('\n');
}

/** The decomposed parts of a URL, with the host already de-obfuscated. */
export interface UrlParts {
  raw: string;
  scheme: string;
  /** Host as written, lowercased, brackets stripped. */
  host: string;
  /** Host after resolving decimal/octal/hex IPv4 spellings. */
  normalizedHost: string;
  port?: number;
  path: string;
  hasUserinfo: boolean;
}

/**
 * Parse a URL without throwing, and normalize obfuscated hosts.
 *
 * `new URL()` rejects some spellings an attacker uses (`http://127.1/`,
 * `http://0x7f000001/`), so a fallback parser handles the authority by hand and
 * {@link normalizeIPv4} resolves it.
 *
 * An **empty host is allowed**, because `file:///etc/passwd` and `gopher://`
 * are exactly the shapes a destination rule needs to see. Returning `undefined`
 * for them (as a naive parser does) makes the most obviously dangerous schemes
 * the ones that silently escape inspection. Callers that reason about a host
 * must treat `''` as "no host", which every classifier here already does.
 *
 * @param raw - the candidate URL string.
 * @returns the parsed parts, or `undefined` when the text is not a URL at all.
 */
export function parseUrlParts(raw: string): UrlParts | undefined {
  const trimmed = raw.trim().replace(/[),.;'"]+$/, '');
  const schemeMatch = /^([a-z][a-z0-9+.-]{1,15}):\/\//i.exec(trimmed);
  if (schemeMatch === null) return undefined;
  const scheme = (schemeMatch[1] as string).toLowerCase();
  const rest = trimmed.slice(schemeMatch[0].length);

  const pathIndex = rest.search(/[/?#]/);
  const authority = pathIndex === -1 ? rest : rest.slice(0, pathIndex);
  const path = pathIndex === -1 ? '' : rest.slice(pathIndex);

  const atIndex = authority.lastIndexOf('@');
  const hasUserinfo = atIndex !== -1;
  const hostPort = hasUserinfo ? authority.slice(atIndex + 1) : authority;

  let host: string;
  let port: number | undefined;
  if (hostPort.startsWith('[')) {
    const close = hostPort.indexOf(']');
    if (close === -1) return undefined;
    host = hostPort.slice(1, close).toLowerCase();
    const portText = hostPort.slice(close + 1).replace(/^:/, '');
    if (portText.length > 0 && /^\d+$/.test(portText)) port = Number(portText);
  } else {
    const colon = hostPort.lastIndexOf(':');
    const portText = colon === -1 ? '' : hostPort.slice(colon + 1);
    if (colon !== -1 && /^\d+$/.test(portText)) {
      host = hostPort.slice(0, colon).toLowerCase();
      port = Number(portText);
    } else {
      host = hostPort.toLowerCase();
    }
  }
  // `scheme://` with neither an authority nor a path carries no destination to
  // reason about.
  if (host.length === 0 && path.length === 0) return undefined;

  return {
    raw: trimmed,
    scheme,
    host,
    normalizedHost: host.length === 0 ? '' : normalizeIPv4(host) ?? host,
    ...(port !== undefined ? { port } : {}),
    path,
    hasUserinfo,
  };
}

/**
 * Extracted URLs from a text, up to `limit`.
 *
 * Square brackets are **allowed** in the character class. Excluding them (the
 * obvious choice, since `]` usually ends a Markdown link) truncates every IPv6
 * literal — `http://[::1]:2375/` becomes `http://[::1`, which fails to parse and
 * is then silently dropped. That would make loopback over IPv6 the one
 * destination class the guard cannot see.
 *
 * @param text - the text to scan.
 * @param limit - maximum URLs returned.
 * @returns the distinct URLs in first-seen order.
 */
export function extractUrls(text: string, limit = 64): string[] {
  const matches = text.match(/[a-z][a-z0-9+.-]{1,15}:\/\/[^\s"'`<>)\\}]+/gi) ?? [];
  const cleaned = matches.map((url) => url.replace(/[[\]]+$/, '').replace(/[.,;:]+$/, ''));
  return [...new Set(cleaned)].filter((url) => url.length > 0).slice(0, limit);
}

/**
 * Remove shell comments, respecting quoting.
 *
 * A comment does not execute, so matching rule patterns against one produces
 * false positives on the most ordinary commands there are: `# rm -rf / is
 * dangerous`, `git commit -m "revert the rm -rf / change"`, a README snippet
 * passed to `grep`. A guard that blocks those teaches its user to turn it off.
 *
 * `#` is only a comment introducer at the start of the input or after
 * whitespace, `;`, `&`, `|` or `(` — which keeps parameter expansions like
 * `${#arr}` and fragments like `https://host/#section` intact, as long as the
 * fragment is inside quotes (it is, in every spelling that reaches a shell).
 *
 * @param text - the command text.
 * @returns the text with comments removed, preserving line breaks.
 */
export function stripShellComments(text: string): string {
  if (!text.includes('#')) return text;
  let out = '';
  let quote: '"' | "'" | null = null;
  let escaped = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] as string;
    if (escaped) {
      out += char;
      escaped = false;
      continue;
    }
    if (char === '\\' && quote !== "'") {
      out += char;
      escaped = true;
      continue;
    }
    if (quote !== null) {
      out += char;
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      out += char;
      continue;
    }
    const previous = index === 0 ? '' : (text[index - 1] as string);
    if (char === '#' && (index === 0 || /[\s;&|(]/.test(previous))) {
      while (index < text.length && text[index] !== '\n') index += 1;
      if (index < text.length) out += '\n';
      continue;
    }
    out += char;
  }
  // A quote left open means the input was truncated mid-string; the text is
  // still returned, because dropping it would hide whatever it contained.
  return out;
}
