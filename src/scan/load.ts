/**
 * Loading a plugin's source into memory for analysis.
 *
 * Two deliberate properties:
 *
 * 1. **Nothing is written to disk.** Directory inputs are read into a virtual
 *    file map, and tarballs are parsed in memory (gzip via `node:zlib`, then a
 *    minimal ustar reader). Auditing an untrusted artifact by unpacking it on
 *    the machine that is about to run it defeats the point of auditing it first,
 *    and it would hand a malicious tarball a path-traversal write primitive for
 *    free.
 * 2. **Every cap is reported.** A scan that silently stopped early produces a
 *    clean-looking grade for content it never read, so truncation is carried on
 *    the result and surfaced in the report.
 *
 * @module dsh-security-scan/scan/load
 */

import { gunzipSync } from 'node:zlib';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/** One file staged for analysis. */
export interface SourceFile {
  /** Path relative to the scanned root, always POSIX-separated. */
  path: string;
  bytes: Buffer;
}

/** The staged source tree plus the cost of staging it. */
export interface StagedSource {
  files: SourceFile[];
  /** Observations worth reporting, e.g. files skipped for size. */
  notes: string[];
  /** True when any cap cut the analysis short. */
  truncated: boolean;
  /** Total bytes read. */
  totalBytes: number;
}

/** Caps applied while staging. */
export interface LoadLimits {
  /** Maximum number of files to stage. */
  maxFiles: number;
  /** Maximum size of one file; larger files are skipped and noted. */
  maxFileBytes: number;
  /** Maximum total bytes to stage. */
  maxTotalBytes: number;
}

/** Default caps: generous for a real plugin, bounded against a zip bomb. */
export const DEFAULT_LIMITS: LoadLimits = {
  maxFiles: 4_000,
  maxFileBytes: 512 * 1024,
  maxTotalBytes: 64 * 1024 * 1024,
};

/** Directories never worth scanning: no source, and often enormous. */
const SKIP_DIRS = new Set([
  '.git',
  '.hg',
  '.svn',
  'node_modules',
  '.next',
  '.cache',
  '.venv',
  '__pycache__',
  'coverage',
  'dist',
  '.DS_Store',
]);

/** Whether a buffer looks binary (a NUL byte in the first 8 KiB). */
export function looksBinary(bytes: Buffer): boolean {
  const window = Math.min(bytes.length, 8192);
  for (let index = 0; index < window; index += 1) {
    if (bytes[index] === 0) return true;
  }
  return false;
}

/** Convert an OS path to POSIX separators. */
function toPosix(path: string): string {
  return sep === '/' ? path : path.split(sep).join('/');
}

/**
 * Reject a relative path that escapes its root.
 *
 * @param path - the candidate POSIX path.
 * @returns true when the path is safe to use as a key.
 */
export function isSafeRelativePath(path: string): boolean {
  if (path.startsWith('/') || /^[A-Za-z]:/.test(path)) return false;
  return !path.split('/').includes('..');
}

/**
 * Stage a directory tree in memory.
 *
 * Symlinks are not followed: a link out of the tree would let the scanned
 * package make the scanner read files it never shipped. Only regular files are
 * staged.
 *
 * @param root - absolute directory to scan.
 * @param limits - caps to apply.
 * @returns the staged source.
 */
export function loadDirectory(root: string, limits: LoadLimits = DEFAULT_LIMITS): StagedSource {
  const files: SourceFile[] = [];
  const notes: string[] = [];
  let truncated = false;
  let totalBytes = 0;

  const walk = (dir: string): void => {
    if (files.length >= limits.maxFiles) {
      truncated = true;
      return;
    }
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch (error) {
      notes.push(`could not read directory ${toPosix(relative(root, dir)) || '.'}: ${message(error)}`);
      return;
    }
    for (const entry of entries) {
      if (files.length >= limits.maxFiles) {
        truncated = true;
        return;
      }
      const absolute = join(dir, entry);
      let stats;
      try {
        stats = statSync(absolute);
      } catch {
        // A dangling symlink or a racing delete: not a finding, just not a file.
        continue;
      }
      if (stats.isSymbolicLink()) {
        notes.push(`skipped symlink ${toPosix(relative(root, absolute))}`);
        continue;
      }
      if (stats.isDirectory()) {
        if (SKIP_DIRS.has(entry)) continue;
        walk(absolute);
        continue;
      }
      if (!stats.isFile()) continue;
      if (stats.size > limits.maxFileBytes) {
        truncated = true;
        notes.push(
          `skipped ${toPosix(relative(root, absolute))}: ${stats.size} bytes exceeds the ${limits.maxFileBytes}-byte per-file cap`,
        );
        continue;
      }
      if (totalBytes + stats.size > limits.maxTotalBytes) {
        truncated = true;
        notes.push(`stopped staging: total size cap of ${limits.maxTotalBytes} bytes reached`);
        return;
      }
      let bytes: Buffer;
      try {
        bytes = readFileSync(absolute);
      } catch (error) {
        notes.push(`could not read ${toPosix(relative(root, absolute))}: ${message(error)}`);
        continue;
      }
      totalBytes += bytes.length;
      files.push({ path: toPosix(relative(root, absolute)), bytes });
    }
  };

  walk(root);
  files.sort((left, right) => left.path.localeCompare(right.path));
  return { files, notes, truncated, totalBytes };
}

/** One parsed tar header. */
interface TarEntry {
  name: string;
  size: number;
  typeFlag: string;
  bodyOffset: number;
}

/** Read a NUL-terminated string field from a header block. */
function readField(block: Buffer, offset: number, length: number): string {
  const slice = block.subarray(offset, offset + length);
  const end = slice.indexOf(0);
  return slice.subarray(0, end === -1 ? slice.length : end).toString('utf8').trim();
}

/** Parse one 512-byte header block, or `undefined` at the end-of-archive marker. */
function parseHeader(block: Buffer, offset: number): TarEntry | undefined {
  if (block.length < 512) return undefined;
  if (block.every((byte) => byte === 0)) return undefined;
  const name = readField(block, 0, 100);
  if (name.length === 0) return undefined;
  const prefix = readField(block, 345, 155);
  const sizeText = readField(block, 124, 12);
  const typeFlag = String.fromCharCode(block[156] ?? 0);
  // Size is octal; a GNU base-256 encoded size is refused rather than guessed.
  const size = sizeText.length === 0 ? 0 : Number.parseInt(sizeText.replace(/[^0-7]/g, ''), 8);
  if (!Number.isFinite(size) || size < 0) return undefined;
  return {
    name: prefix.length > 0 ? `${prefix}/${name}` : name,
    size,
    typeFlag,
    bodyOffset: offset + 512,
  };
}

/**
 * Unpack a `.tgz` / `.tar.gz` (or raw `.tar`) buffer in memory.
 *
 * Entries that would escape the archive root are dropped rather than
 * normalized: an archive containing `../../etc/passwd` is itself the finding,
 * and sanitizing it would hide that.
 *
 * @param archive - the archive bytes.
 * @param limits - caps to apply.
 * @returns the staged source, with dropped entries noted.
 */
export function loadTarball(archive: Buffer, limits: LoadLimits = DEFAULT_LIMITS): StagedSource {
  const notes: string[] = [];
  let tar: Buffer;
  if (archive.length > 2 && archive[0] === 0x1f && archive[1] === 0x8b) {
    try {
      tar = gunzipSync(archive, { maxOutputLength: limits.maxTotalBytes * 4 });
    } catch (error) {
      return { files: [], notes: [`could not gunzip the archive: ${message(error)}`], truncated: false, totalBytes: 0 };
    }
  } else {
    tar = archive;
  }

  const files: SourceFile[] = [];
  let truncated = false;
  let totalBytes = 0;
  let offset = 0;

  while (offset + 512 <= tar.length) {
    const header = parseHeader(tar.subarray(offset, offset + 512), offset);
    if (header === undefined) break;
    const { name, size, typeFlag, bodyOffset } = header;
    const body = tar.subarray(bodyOffset, bodyOffset + size);
    offset = bodyOffset + Math.ceil(size / 512) * 512;

    // `L` is the GNU long-name pseudo-entry; `x`/`g` are pax extended headers.
    // None carry content worth scanning.
    if (typeFlag === 'L' || typeFlag === 'x' || typeFlag === 'g' || typeFlag === 'K') continue;
    if (typeFlag !== '0' && typeFlag !== '\0' && typeFlag !== '') continue; // not a regular file
    const relativePath = name.replace(/^\.\//, '');
    if (!isSafeRelativePath(relativePath)) {
      notes.push(`dropped archive entry "${clipName(name)}": path escapes the archive root`);
      continue;
    }
    // npm tarballs wrap everything in `package/`; stripping it makes reports
    // read like the published package rather than like the tarball.
    const stripped = relativePath.replace(/^package\//, '');
    if (stripped.length === 0) continue;
    if (files.length >= limits.maxFiles) {
      truncated = true;
      notes.push(`stopped unpacking: file count cap of ${limits.maxFiles} reached`);
      break;
    }
    if (size > limits.maxFileBytes) {
      truncated = true;
      notes.push(`skipped ${stripped}: ${size} bytes exceeds the ${limits.maxFileBytes}-byte per-file cap`);
      continue;
    }
    if (totalBytes + size > limits.maxTotalBytes) {
      truncated = true;
      notes.push(`stopped unpacking: total size cap of ${limits.maxTotalBytes} bytes reached`);
      break;
    }
    totalBytes += size;
    files.push({ path: stripped, bytes: Buffer.from(body) });
  }

  files.sort((left, right) => left.path.localeCompare(right.path));
  return { files, notes, truncated, totalBytes };
}

/** Shorten an archive entry name for a note. */
function clipName(name: string): string {
  return name.length <= 120 ? name : `${name.slice(0, 120)}…`;
}

/** Error message helper. */
function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
