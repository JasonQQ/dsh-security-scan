/**
 * Configuration: parsing, defaults, and validation.
 *
 * The gate validates its own config rather than declaring a schema object,
 * because the harness's schema library is one of the dependencies a zero-dep
 * plugin does not take. The trade is a little more code here for one concrete
 * gain: every rejection names the offending key *and* the accepted values, which
 * is what a person editing YAML at midnight actually needs.
 *
 * Unknown keys are refused rather than ignored. A typo in `guard.mode` that
 * silently leaves the guard in its default state is exactly the failure a
 * security plugin must not have.
 *
 * @module dsh-security-gate/config
 */

import { homedir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';

import type { Grade, GuardAction } from './types.js';
import type { GuardMode } from './guard/inspect.js';
import { isRecord } from './util/text.js';

/** Output-audit mode. */
export type OutputMode = 'enforce' | 'monitor' | 'off';

/** Per-output-rule override. */
export type OutputRuleSetting = 'warn' | 'block' | 'off';

/** The resolved configuration. */
export interface GateConfig {
  guard: {
    mode: GuardMode;
    /** Per-rule overrides; keys ending in `*` match by prefix. */
    rules: Record<string, GuardAction | 'off'>;
    allowedHosts: string[];
    allowedPaths: string[];
    /** Whether the gate refuses an install that was never audited. */
    requireAuditForInstall: boolean;
  };
  output: {
    mode: OutputMode;
    /** Per-rule overrides; keys ending in `*` match by prefix. */
    rules: Record<string, OutputRuleSetting>;
  };
  install: {
    /** A grade at or below this value is refused. */
    blockAtOrBelow: Grade;
    /** Whether an `https:` tarball URL may be downloaded for auditing. */
    fetch: boolean;
    /** Paths audited automatically when the plugin loads. */
    autoAudit: string[];
  };
  log: {
    dir: string;
    maxBytes: number;
    /** How long an audit record stays usable, in milliseconds. */
    ttlMs: number;
  };
}

/** The configuration applied when no `config` row is present. */
export const DEFAULT_CONFIG: GateConfig = {
  guard: {
    mode: 'enforce',
    rules: {},
    allowedHosts: [],
    allowedPaths: [],
    requireAuditForInstall: false,
  },
  output: {
    mode: 'enforce',
    rules: {},
  },
  install: {
    blockAtOrBelow: 'D',
    fetch: false,
    autoAudit: [],
  },
  log: {
    dir: join(homedir(), '.dsh', 'security-gate'),
    maxBytes: 4 * 1024 * 1024,
    ttlMs: 24 * 60 * 60 * 1000,
  },
};

/** Accepted values for each enum, for error messages. */
const ACCEPTED = {
  guardMode: ['enforce', 'monitor', 'off'],
  outputMode: ['enforce', 'monitor', 'off'],
  action: ['block', 'ask', 'warn', 'off'],
  outputSetting: ['warn', 'block', 'off'],
  grade: ['A', 'B', 'C', 'D'],
} as const;

/** Raised when configuration cannot be honoured. */
export class ConfigError extends Error {
  constructor(message: string) {
    super(`dsh-security-gate: ${message}`);
    this.name = 'ConfigError';
  }
}

/** Format an accepted-values list for an error message. */
function accepted(values: readonly string[]): string {
  return values.map((value) => `"${value}"`).join(', ');
}

/** Reject unknown keys in a config object. */
function rejectUnknown(record: Record<string, unknown>, known: readonly string[], path: string): void {
  for (const key of Object.keys(record)) {
    if (!known.includes(key)) {
      throw new ConfigError(`unknown key "${path}${key}"; accepted keys are ${known.map((name) => `"${path}${name}"`).join(', ')}`);
    }
  }
}

/** Read a string enum field. */
function readEnum<T extends string>(
  value: unknown,
  values: readonly T[],
  path: string,
  fallback: T,
): T {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !values.includes(value as T)) {
    throw new ConfigError(`${path} must be one of ${accepted(values)}, got ${JSON.stringify(value)}`);
  }
  return value as T;
}

/** Read a string array, tolerating a single string. */
function readStringList(value: unknown, path: string): string[] {
  if (value === undefined) return [];
  const list = typeof value === 'string' ? [value] : value;
  if (!Array.isArray(list)) throw new ConfigError(`${path} must be a list of strings`);
  const out: string[] = [];
  for (const item of list) {
    if (typeof item !== 'string') throw new ConfigError(`${path} must contain only strings, got ${JSON.stringify(item)}`);
    if (item.trim().length > 0) out.push(item.trim());
  }
  return out;
}

/** Read a positive integer field. */
function readPositiveInt(value: unknown, path: string, fallback: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new ConfigError(`${path} must be a positive whole number, got ${JSON.stringify(value)}`);
  }
  return value;
}

/** Read a boolean field. */
function readBoolean(value: unknown, path: string, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') throw new ConfigError(`${path} must be true or false, got ${JSON.stringify(value)}`);
  return value;
}

/** Read a rule-override map. */
function readOverrides<T extends string>(
  value: unknown,
  values: readonly T[],
  path: string,
): Record<string, T> {
  if (value === undefined) return {};
  if (!isRecord(value)) throw new ConfigError(`${path} must be a map from rule id to one of ${accepted(values)}`);
  const out: Record<string, T> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item !== 'string' || !values.includes(item as T)) {
      throw new ConfigError(`${path}.${key} must be one of ${accepted(values)}, got ${JSON.stringify(item)}`);
    }
    if (key.trim().length === 0) throw new ConfigError(`${path} contains an empty rule id`);
    out[key.trim()] = item as T;
  }
  return out;
}

/** Expand `~` and resolve a configured directory. */
function resolveDir(value: unknown, fallback: string): string {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ConfigError(`log.dir must be a non-empty path, got ${JSON.stringify(value)}`);
  }
  const expanded = value.startsWith('~') ? join(homedir(), value.slice(1).replace(/^[/\\]/, '')) : value;
  return isAbsolute(expanded) ? expanded : resolve(process.cwd(), expanded);
}

/**
 * Validate and normalize raw configuration.
 *
 * @param raw - the `config` value handed to the plugin by the loader.
 * @returns the resolved configuration.
 * @throws ConfigError when a value cannot be honoured.
 */
export function normalizeConfig(raw: unknown): GateConfig {
  if (raw === undefined || raw === null) return DEFAULT_CONFIG;
  if (!isRecord(raw)) throw new ConfigError('config must be a mapping');

  rejectUnknown(raw, ['guard', 'output', 'install', 'log'], '');

  const guardRaw = raw['guard'];
  if (guardRaw !== undefined && !isRecord(guardRaw)) throw new ConfigError('guard must be a mapping');
  const guard = (guardRaw ?? {}) as Record<string, unknown>;
  rejectUnknown(guard, ['mode', 'rules', 'allowedHosts', 'allowedPaths', 'requireAuditForInstall'], 'guard.');

  const outputRaw = raw['output'];
  if (outputRaw !== undefined && !isRecord(outputRaw)) throw new ConfigError('output must be a mapping');
  const output = (outputRaw ?? {}) as Record<string, unknown>;
  rejectUnknown(output, ['mode', 'rules'], 'output.');

  const installRaw = raw['install'];
  if (installRaw !== undefined && !isRecord(installRaw)) throw new ConfigError('install must be a mapping');
  const install = (installRaw ?? {}) as Record<string, unknown>;
  rejectUnknown(install, ['blockAtOrBelow', 'fetch', 'autoAudit'], 'install.');

  const logRaw = raw['log'];
  if (logRaw !== undefined && !isRecord(logRaw)) throw new ConfigError('log must be a mapping');
  const log = (logRaw ?? {}) as Record<string, unknown>;
  rejectUnknown(log, ['dir', 'maxBytes', 'ttlMs'], 'log.');

  return {
    guard: {
      mode: readEnum(guard['mode'], ACCEPTED.guardMode, 'guard.mode', DEFAULT_CONFIG.guard.mode),
      rules: readOverrides(guard['rules'], ACCEPTED.action, 'guard.rules'),
      allowedHosts: readStringList(guard['allowedHosts'], 'guard.allowedHosts'),
      allowedPaths: readStringList(guard['allowedPaths'], 'guard.allowedPaths'),
      requireAuditForInstall: readBoolean(
        guard['requireAuditForInstall'],
        'guard.requireAuditForInstall',
        DEFAULT_CONFIG.guard.requireAuditForInstall,
      ),
    },
    output: {
      mode: readEnum(output['mode'], ACCEPTED.outputMode, 'output.mode', DEFAULT_CONFIG.output.mode),
      rules: readOverrides(output['rules'], ACCEPTED.outputSetting, 'output.rules'),
    },
    install: {
      blockAtOrBelow: readEnum(install['blockAtOrBelow'], ACCEPTED.grade, 'install.blockAtOrBelow', DEFAULT_CONFIG.install.blockAtOrBelow),
      fetch: readBoolean(install['fetch'], 'install.fetch', DEFAULT_CONFIG.install.fetch),
      autoAudit: readStringList(install['autoAudit'], 'install.autoAudit'),
    },
    log: {
      dir: resolveDir(log['dir'], DEFAULT_CONFIG.log.dir),
      maxBytes: readPositiveInt(log['maxBytes'], 'log.maxBytes', DEFAULT_CONFIG.log.maxBytes),
      ttlMs: readPositiveInt(log['ttlMs'], 'log.ttlMs', DEFAULT_CONFIG.log.ttlMs),
    },
  };
}

/**
 * Look an override up by exact id, then by longest matching `prefix*` key.
 *
 * Prefix keys let an operator silence a whole family — `net.*` — without
 * enumerating rule ids that may be added in a later release.
 *
 * @param overrides - the override map.
 * @param id - the concrete rule id.
 * @returns the override, when one applies.
 */
export function lookupOverride<T>(overrides: Readonly<Record<string, T>>, id: string): T | undefined {
  const exact = overrides[id];
  if (exact !== undefined) return exact;
  let bestKey: string | undefined;
  let best: T | undefined;
  for (const [key, value] of Object.entries(overrides)) {
    if (!key.endsWith('*')) continue;
    const prefix = key.slice(0, -1);
    if (!id.startsWith(prefix)) continue;
    if (bestKey === undefined || key.length > bestKey.length) {
      bestKey = key;
      best = value;
    }
  }
  return best;
}

/** The set of enabled output-rule ids, or `undefined` when all are enabled. */
export function enabledOutputRules(config: GateConfig, known: readonly string[]): Set<string> | undefined {
  if (Object.keys(config.output.rules).length === 0) return undefined;
  const enabled = new Set<string>();
  for (const id of known) {
    const override = lookupOverride(config.output.rules, id);
    if (override !== 'off') enabled.add(id);
  }
  return enabled;
}

/** The output rule's effective action, after overrides. */
export function outputRuleAction(config: GateConfig, id: string, fallback: 'block' | 'warn'): 'block' | 'warn' | 'off' {
  const override = lookupOverride(config.output.rules, id);
  if (override === 'off') return 'off';
  if (config.output.mode === 'monitor') return 'warn';
  return override ?? fallback;
}
