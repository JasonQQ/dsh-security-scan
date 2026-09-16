/**
 * Normalizing one tool call into the shape input rules expect.
 *
 * A tool call arrives as an opaque JSON argument object whose shape depends on
 * the tool. Rather than teach every rule about every tool's schema, this module
 * flattens the call once: the text payload, the canonical views of it, the URLs
 * it mentions, the path-like arguments, and the specific fields (`command`,
 * `path`) that tools conventionally use.
 *
 * Paths are extracted from *every* string in the arguments, not just a `path`
 * key, because a credential read can hide in a `grep` pattern, a `glob` brace
 * expansion, a redirect target inside a command, or a `--output` flag.
 *
 * @module dsh-security-gate/guard/target
 */

import type { JsonValue } from '../types.js';
import { extractUrls, parseUrlParts, shellViews, stripShellComments } from '../util/normalize.js';
import { isRecord } from '../util/text.js';
import type { ToolCallContext } from './rule-types.js';

/** Cap on the payload size fed to canonicalization. */
export const PAYLOAD_CAP = 200_000;

/** Field names that carry a shell command. */
const COMMAND_FIELDS = ['command', 'cmd', 'script', 'code', 'program', 'input'] as const;

/** Field names that carry a primary path. */
const PATH_FIELDS = ['path', 'file_path', 'filepath', 'filename', 'file', 'pattern', 'glob', 'target'] as const;

/** Whether a string plausibly names a filesystem location. */
function pathLike(value: string): boolean {
  if (value.length === 0 || value.length > 4096) return false;
  if (value.startsWith('~')) return true;
  if (/^[A-Za-z]:[\\/]/.test(value)) return true;
  if (/^(?:\.{1,2}\/|\/)/.test(value)) return true;
  if (value.includes('/') && !value.includes('://')) return true;
  if (/[*?[\]{}]/.test(value) && value.includes('/')) return true;
  return false;
}

/** Collect every string in a JSON value, capped. */
function collectStrings(value: JsonValue, out: string[], depth = 0): void {
  if (out.length >= 400 || depth > 12) return;
  if (typeof value === 'string') {
    out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out, depth + 1);
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const item of Object.values(value)) collectStrings(item, out, depth + 1);
  }
}

/** Read the first string-valued field among `names`. */
function firstField(args: JsonValue, names: readonly string[]): string | undefined {
  if (!isRecord(args)) return undefined;
  for (const name of names) {
    const value = args[name];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return undefined;
}

/** Read the first string-valued field among `names`, with the key it came from. */
function firstFieldEntry(args: JsonValue, names: readonly string[]): [string, string] | undefined {
  if (!isRecord(args)) return undefined;
  for (const name of names) {
    const value = args[name];
    if (typeof value === 'string' && value.length > 0) return [name, value];
  }
  return undefined;
}

/**
 * Build the canonical context for one tool call.
 *
 * Shell comments are removed from the command **before** any view is derived, in
 * both the structured serialization and the bare string. A comment does not
 * execute, so matching rule patterns against one turns the most ordinary
 * commands into findings — `# rm -rf / is dangerous`, `git commit -m "revert the
 * rm -rf / change"` — and a guard that blocks those is a guard that gets
 * disabled. The trade is accepted deliberately: a payload hidden in a comment
 * only matters if something later executes that comment, and at that point the
 * guard sees the executing command.
 *
 * @param tool - the tool name.
 * @param args - the raw arguments.
 * @returns the context input rules receive.
 */
export function buildToolCallContext(tool: string, args: JsonValue): ToolCallContext {
  const strings: string[] = [];
  collectStrings(args, strings);

  const commandEntry = firstFieldEntry(args, COMMAND_FIELDS);
  const command = commandEntry === undefined ? undefined : stripShellComments(commandEntry[1]);
  const primaryPath = firstField(args, PATH_FIELDS);

  // The canonicalized payload includes both the structured serialization (so a
  // rule can match a JSON-embedded command) and each string on its own (so a
  // rule's regex is not confused by JSON escaping).
  const parts: string[] = [];
  try {
    const serialized = commandEntry !== undefined && isRecord(args)
      ? { ...args, [commandEntry[0]]: command }
      : args;
    parts.push(JSON.stringify(serialized));
  } catch {
    // A cyclic or non-serializable value: the individual strings still cover it.
  }
  parts.push(...strings.map((value) => (commandEntry !== undefined && value === commandEntry[1] ? command ?? value : value)));
  const joined = parts.join('\n').slice(0, PAYLOAD_CAP);

  const views = shellViews(joined).map((view) => view.text);
  const text = views.join('\n');

  const urls = new Set<string>(extractUrls(joined, 64));
  const paths = new Set<string>();
  for (const value of strings) {
    if (pathLike(value)) paths.add(value);
    // A URL is a destination, not a filesystem path; it is collected separately
    // so a `read`-shaped rule cannot be tricked into treating one as a file.
    if (/^https?:\/\//i.test(value.trim())) urls.add(value.trim());
  }
  if (primaryPath !== undefined) paths.add(primaryPath);

  return {
    tool,
    views,
    text,
    args,
    ...(primaryPath !== undefined ? { path: primaryPath } : {}),
    ...(command !== undefined ? { command } : {}),
    urls: [...urls],
    paths: [...paths],
  };
}
/** Parsed URL projections for a call, memoized per context. */
export interface ParsedUrls {
  /** Every URL in the call, parsed. */
  parts: NonNullable<ReturnType<typeof parseUrlParts>>[];
  /** Hosts, de-obfuscated. */
  hosts: string[];
}

/**
 * Parse every URL in a call once.
 *
 * Rules that reason about destinations should use this rather than re-parsing:
 * the obfuscated-IPv4 resolution in {@link parseUrlParts} is easy to forget and
 * is exactly what a bypass would rely on.
 *
 * `hosts` omits the empty host that `file:///etc/passwd` and `gopher://`
 * produce. `parts` keeps those URLs, so a scheme-based rule still sees them —
 * which is the point of parsing them at all — while a host-based rule is not
 * handed an empty string it might match on.
 *
 * @param ctx - the call context.
 * @returns the parsed URLs and their hosts.
 */
export function parseContextUrls(ctx: ToolCallContext): ParsedUrls {
  const parts: ParsedUrls['parts'] = [];
  const hosts = new Set<string>();
  for (const url of ctx.urls) {
    const parsed = parseUrlParts(url);
    if (parsed === undefined) continue;
    parts.push(parsed);
    if (parsed.normalizedHost.length > 0) hosts.add(parsed.normalizedHost);
  }
  // A command can name a bare host without a scheme (`curl 169.254.169.254`).
  if (ctx.command !== undefined) {
    for (const match of ctx.command.matchAll(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g)) hosts.add(match[0]);
    for (const match of ctx.command.matchAll(/\b[a-z0-9-]+(?:\.[a-z0-9-]+)+\b/gi)) hosts.add(match[0].toLowerCase());
  }
  return { parts, hosts: [...hosts] };
}
