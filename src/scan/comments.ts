/**
 * Which lines of a file carry no executable content.
 *
 * A comment is not code, so a credential path in one is a much weaker signal
 * than a credential path in a statement — and the difference matters, because
 * security-adjacent plugins document the very paths they refuse to read. This
 * module answers "is this line a comment?" for a whole file at once rather than
 * one line at a time, because the interesting cases span lines: a block comment
 * body has no marker of its own, so a per-line check cannot see it.
 *
 * The polarity is deliberate: rules **skip** comments unless they opt in with
 * `inspectComments`. Two families do opt in, and both would be broken by the
 * opposite default — obfuscation (a base64 blob parked in a comment is still a
 * payload) and prompt-injection (the whole point is instructions hidden in prose
 * and comments).
 *
 * @module dsh-security-gate/scan/comments
 */

import type { FileInfo } from './rule-types.js';

/** Comment markers by file kind. */
const MARKERS: Readonly<Record<string, readonly string[]>> = {
  script: ['#'],
  config: ['#', ';'],
};

/**
 * Index of the first comment marker that starts a comment, or `-1`.
 *
 * Quote-aware, so `echo "#1"` and `url = "https://x/#frag"` are not read as
 * comments. A marker only starts a comment at the start of the line or after
 * whitespace, which keeps `#{` interpolation and `a#b` identifiers intact.
 *
 * @param line - the source line.
 * @param markers - the single-character markers to look for.
 * @returns the index of the marker, or `-1`.
 */
function commentStart(line: string, markers: readonly string[]): number {
  let quote: '"' | "'" | null = null;
  let escaped = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index] as string;
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\' && quote !== "'") {
      escaped = true;
      continue;
    }
    if (quote !== null) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (!markers.includes(char)) continue;
    const previous = index === 0 ? '' : (line[index - 1] as string);
    if (index === 0 || /\s/.test(previous)) return index;
  }
  return -1;
}

/**
 * Compute the comment mask for one file.
 *
 * @param file - the decoded file.
 * @returns one boolean per line: `true` when the line carries no executable content.
 */
export function commentMask(file: FileInfo): boolean[] {
  const lines = file.lines;
  const mask = new Array<boolean>(lines.length).fill(false);

  // Prose files have no comment syntax: a Markdown line is content, and a rule
  // that hunts hidden instructions must see all of it.
  if (file.kind === 'doc' || file.kind === 'other') {
    for (let index = 0; index < lines.length; index += 1) {
      mask[index] = (lines[index] ?? '').trim().length === 0;
    }
    return mask;
  }

  if (file.kind === 'code') {
    let inBlock = false;
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? '';
      const trimmed = line.trim();
      if (inBlock) {
        mask[index] = true;
        if (line.includes('*/')) inBlock = false;
        continue;
      }
      if (trimmed.length === 0) {
        mask[index] = true;
        continue;
      }
      // A line whose first token is a line comment carries no code. A line with
      // code before `//` is *not* masked: the code is real.
      if (trimmed.startsWith('//')) {
        mask[index] = true;
        continue;
      }
      if (trimmed.startsWith('/*')) {
        if (!trimmed.includes('*/')) inBlock = true;
        // `/* comment */ code` is not a whole-line comment.
        const close = trimmed.indexOf('*/');
        mask[index] = close === -1 || trimmed.slice(close + 2).trim().length === 0;
        continue;
      }
      // A JSDoc continuation line arriving without its opening line — a file
      // split mid-comment, or a fragment. Treat it as documentation.
      if (trimmed.startsWith('*')) mask[index] = true;
    }
    return mask;
  }

  // Script and config files share a marker model; only the marker set differs.
  const markers = MARKERS[file.kind] ?? ['#'];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      mask[index] = true;
      continue;
    }
    if (/^REM\s/i.test(trimmed)) {
      mask[index] = true;
      continue;
    }
    const start = commentStart(line, markers);
    // Only a line whose marker begins the line is a pure comment; `set -e # note`
    // is a real statement.
    mask[index] = start !== -1 && line.slice(0, start).trim().length === 0;
  }
  return mask;
}
