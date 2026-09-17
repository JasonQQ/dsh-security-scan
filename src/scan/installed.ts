/**
 * Resolving an installed plugin by name.
 *
 * "Can I install this?" and "what did I actually install?" are different
 * questions, and only the first one is about a path or a tarball. Once a plugin
 * is in a profile, the thing worth auditing is the copy sitting in
 * `node_modules` — which may be a symlink to a live checkout, a pinned tarball
 * from a GitHub release, or a registry install nobody has read.
 *
 * Resolution is a search over the DSH home rather than Node's own resolver, and
 * deliberately so: this plugin is loaded through a symlink, so Node resolves its
 * `import.meta.url` to the *real* checkout and then looks for siblings next to
 * that checkout — which is nowhere near the profile that installed it. Searching
 * the profile layout directly is what actually finds the neighbours.
 *
 * @module dsh-security-gate/scan/installed
 */

import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Where an installed package was found. */
export interface InstalledResolution {
  /** Absolute, symlink-resolved path to the package root. */
  path: string;
  /** The `node_modules` directory it was found under. */
  root: string;
  /** The profile that owns that directory, when it is a profile-scoped one. */
  profile?: string;
  /**
   * True when the installed entry is a symlink and `path` is elsewhere.
   *
   * Worth reporting: a linked plugin is live source that can change under you,
   * not the frozen artifact a tarball would be.
   */
  linked: boolean;
  /** Other `node_modules` roots that also hold this package. */
  alsoFound: string[];
}

/** The shape a package name must match to be searched for. */
const PACKAGE_NAME_RE = /^(?:@[a-z0-9](?:[a-z0-9-._~]*[a-z0-9])?\/)?[a-z0-9](?:[a-z0-9-._~]*[a-z0-9])?$/i;

/**
 * Reduce a spec to a bare package name, or reject it.
 *
 * Strict on purpose: the name is joined onto a search root and then read, so
 * anything that could climb out of that root — `..`, an absolute path, a
 * backslash, a NUL — must not survive this function. Rejecting is free here,
 * because a path is handled by the caller before it ever reaches the resolver.
 *
 * @param spec - the user-supplied spec.
 * @returns the package name, or `undefined` when it is not one.
 */
export function packageNameOf(spec: string): string | undefined {
  const trimmed = spec.trim().replace(/^npm:/i, '');
  if (trimmed.length === 0 || trimmed.includes('\0') || trimmed.includes('\\')) return undefined;
  if (trimmed.startsWith('.') || trimmed.startsWith('/') || trimmed.startsWith('~') || trimmed.includes('://')) {
    return undefined;
  }
  // Drop a trailing version or range: `foo@^2` and `@scope/foo@1.0.0` both name
  // the installed package `foo` / `@scope/foo`.
  const at = trimmed.lastIndexOf('@');
  const name = at > 0 ? trimmed.slice(0, at) : trimmed;
  if (!PACKAGE_NAME_RE.test(name)) return undefined;
  return name;
}

/** Directory names directly under `dir`, or none when it is unreadable. */
function subdirectories(dir: string): string[] {
  try {
    return readdirSync(dir).filter((entry) => {
      try {
        return statSync(join(dir, entry)).isDirectory();
      } catch {
        return false;
      }
    });
  } catch {
    return [];
  }
}

/** The DSH home, honouring the harness's own environment variable. */
export function dshHome(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env['DSH_HOME'];
  return typeof configured === 'string' && configured.trim().length > 0
    ? resolve(configured.trim())
    : join(homedir(), '.dsh');
}

/**
 * This plugin's own package name, read from the manifest above the built module.
 *
 * Used to order the search: the profile that holds this plugin is the one that is
 * almost certainly running, so it should be checked first. Returns `undefined`
 * when the manifest cannot be read, in which case ordering falls back to
 * alphabetical and nothing else changes.
 */
let ownNameCache: string | undefined | null = null;
export function ownPackageName(): string | undefined {
  if (ownNameCache !== null) return ownNameCache;
  ownNameCache = undefined;
  try {
    let dir = dirname(fileURLToPath(import.meta.url));
    for (let depth = 0; depth < 5; depth += 1) {
      const manifest = join(dir, 'package.json');
      if (existsSync(manifest)) {
        const parsed = JSON.parse(readFileSync(manifest, 'utf8')) as { name?: unknown };
        if (typeof parsed.name === 'string') {
          ownNameCache = parsed.name;
          break;
        }
      }
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  } catch {
    // Falls through to `undefined`: ordering degrades, resolution does not.
  }
  return ownNameCache;
}

/** One place a package might be installed. */
interface SearchRoot {
  root: string;
  profile?: string;
}

/**
 * The `node_modules` directories to search, most likely first.
 *
 * @param env - environment to read `DSH_HOME` from.
 * @param cwd - working directory whose `node_modules` is searched last.
 * @returns the search roots in order.
 */
export function installedSearchRoots(env: NodeJS.ProcessEnv = process.env, cwd = process.cwd()): SearchRoot[] {
  const home = dshHome(env);
  const profilesDir = join(home, 'profiles');
  const own = ownPackageName();
  const profiles = subdirectories(profilesDir).sort();

  // The profile holding this plugin is the one running; check it first.
  const running = own === undefined
    ? []
    : profiles.filter((profile) => existsSync(join(profilesDir, profile, 'node_modules', own, 'package.json')));
  const rest = profiles.filter((profile) => !running.includes(profile));

  const roots: SearchRoot[] = [];
  for (const profile of [...running, ...rest]) roots.push({ root: join(profilesDir, profile, 'node_modules'), profile });
  // The shared store profiles hoist into.
  roots.push({ root: join(profilesDir, 'node_modules') });
  // A project checkout, for auditing what a workspace depends on.
  roots.push({ root: join(cwd, 'node_modules') });
  // The plain home layout, for a harness that is not profile-based.
  roots.push({ root: join(home, 'node_modules') });
  return roots;
}

/**
 * Find an installed package by name.
 *
 * @param spec - a package spec such as `dsh-btw-plugin`, `@scope/name`, or `name@1.2.3`.
 * @param options - environment and working directory overrides, for tests.
 * @returns where it was found, or `undefined` when it is not installed.
 */
export function resolveInstalledPackage(
  spec: string,
  options: { env?: NodeJS.ProcessEnv; cwd?: string } = {},
): InstalledResolution | undefined {
  const name = packageNameOf(spec);
  if (name === undefined) return undefined;

  const roots = installedSearchRoots(options.env ?? process.env, options.cwd ?? process.cwd());
  const hits: { entry: string; root: SearchRoot; linked: boolean; path: string }[] = [];

  for (const searchRoot of roots) {
    const entry = join(searchRoot.root, name);
    const manifest = join(entry, 'package.json');
    if (!existsSync(manifest)) continue;
    let real = entry;
    let linked = false;
    try {
      real = realpathSync(entry);
      linked = real !== entry;
    } catch {
      // A dangling symlink: the entry exists but the target does not. Not a hit.
      continue;
    }
    if (!existsSync(join(real, 'package.json'))) continue;
    hits.push({ entry, root: searchRoot, linked, path: real });
  }

  const first = hits[0];
  if (first === undefined) return undefined;
  return {
    path: first.path,
    root: first.root.root,
    ...(first.root.profile !== undefined ? { profile: first.root.profile } : {}),
    linked: first.linked,
    alsoFound: hits.slice(1).map((hit) => hit.entry),
  };
}
