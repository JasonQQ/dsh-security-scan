/**
 * Locale plumbing for everything a human reads.
 *
 * The plugin's own documentation is bilingual, and its reports should be too: an
 * operator deciding whether to install a plugin is the audience, and for a
 * Chinese-speaking operator an English-only finding list is a wall rather than a
 * report. So the default is `bilingual` — both languages, on the same line for
 * short fields and as labelled lines for long ones — with `en` and `zh` available
 * for anyone who wants a single language.
 *
 * Two deliberate boundaries:
 *
 * - **Machine-readable output stays English.** The JSON report, the audit-log
 *   payloads and the rule ids are canonical English. Localizing them would make
 *   the log's vocabulary depend on a config value, and a log whose field names
 *   change with a setting is a log nobody can grep.
 * - **Model-facing text stays English.** Tool *descriptions* and the system-prompt
 *   section are instructions to a model, and the harness's own prompts are
 *   English; mixing languages there costs tokens without helping the reader.
 *   Tool *results* are a report to a human, so those are localized.
 *
 * @module dsh-security-scan/i18n
 */

import type { Severity } from './types.js';

/** How much language a report carries. */
export type Locale = 'en' | 'zh' | 'bilingual';

/** One concrete language. */
export type Lang = 'en' | 'zh';

/** Accepted `report.locale` values, for config validation and error messages. */
export const LOCALES: readonly Locale[] = ['bilingual', 'en', 'zh'];

/** Bilingual output puts Chinese first, because that is the reader who asked. */
export const BILINGUAL_ORDER: readonly Lang[] = ['zh', 'en'];

/**
 * The languages a locale emits, in display order.
 *
 * @param locale - the configured locale.
 * @returns one language, or both in display order.
 */
export function langsOf(locale: Locale): readonly Lang[] {
  return locale === 'bilingual' ? BILINGUAL_ORDER : [locale];
}

/**
 * One localized string.
 *
 * Short fields join with ` / `; that keeps headings, labels and list items on one
 * line, which is what makes a bilingual report scannable rather than twice as
 * long. Long prose should go through {@link block} instead.
 *
 * @param locale - the configured locale.
 * @param en - the English text.
 * @param zh - the Chinese text.
 * @returns the text for this locale.
 */
export function t(locale: Locale, en: string, zh: string): string {
  if (locale === 'zh') return zh;
  if (locale === 'en') return en;
  return `${zh} / ${en}`;
}

/**
 * A long localized field, as labelled lines.
 *
 * Two sentences of detail joined with ` / ` produce an unreadable line, so a
 * bilingual report puts them on separate labelled lines and a single-language
 * report emits one plain line.
 *
 * @param locale - the configured locale.
 * @param en - the English text.
 * @param zh - the Chinese text.
 * @param indent - prefix for each line, e.g. two spaces inside a list item.
 * @returns the text, possibly containing a newline.
 */
export function block(locale: Locale, en: string, zh: string, indent = '  '): string {
  if (locale === 'zh') return `${indent}${zh}`;
  if (locale === 'en') return `${indent}${en}`;
  return `${indent}中 ${zh}\n${indent}EN ${en}`;
}

/** Chinese text for one rule. */
export interface RuleTextZh {
  title: string;
  detail: string;
  remediation: string;
}

/**
 * Chinese text for a rule, or `undefined` when it has not been translated.
 *
 * A missing translation is not an error: the report falls back to the English
 * original, so a rule added between translation passes still renders. It is
 * reported rather than hidden — see `translationCoverage`.
 *
 * @param table - the translation table for one catalog.
 * @param id - the rule id.
 * @returns the Chinese text, when present.
 */
export function zhFor(table: Readonly<Record<string, RuleTextZh>>, id: string): RuleTextZh | undefined {
  return Object.hasOwn(table, id) ? table[id] : undefined;
}

/** How much of a catalog has Chinese text, for the status tool. */
export interface TranslationCoverage {
  translated: number;
  total: number;
  /** Rule ids with no Chinese text yet. */
  missing: string[];
}

/**
 * Measure translation coverage of one catalog.
 *
 * @param table - the translation table.
 * @param ids - every rule id in the catalog.
 * @returns the counts and the ids still missing.
 */
export function translationCoverage(
  table: Readonly<Record<string, RuleTextZh>>,
  ids: readonly string[],
): TranslationCoverage {
  const missing = ids.filter((id) => !Object.hasOwn(table, id));
  return { translated: ids.length - missing.length, total: ids.length, missing };
}

/** Severity names. */
export const SEVERITY_TEXT: Readonly<Record<Severity, { en: string; zh: string }>> = {
  critical: { en: 'CRITICAL', zh: '严重' },
  high: { en: 'HIGH', zh: '高' },
  medium: { en: 'MEDIUM', zh: '中' },
  low: { en: 'LOW', zh: '低' },
  info: { en: 'INFO', zh: '提示' },
};

/** Category names, for grouping a report by what a finding is about. */
export const CATEGORY_TEXT: Readonly<Record<string, { en: string; zh: string }>> = {
  'install-script': { en: 'install scripts', zh: '安装脚本' },
  'credential-access': { en: 'credential access', zh: '凭据读取' },
  obfuscation: { en: 'obfuscation', zh: '混淆' },
  'network-callback': { en: 'network callbacks', zh: '网络回调' },
  privilege: { en: 'privilege', zh: '提权' },
  exfiltration: { en: 'exfiltration', zh: '数据外传' },
  persistence: { en: 'persistence', zh: '持久化' },
  'supply-chain': { en: 'supply chain', zh: '供应链' },
  'harness-abuse': { en: 'harness abuse', zh: '滥用宿主环境' },
  'prompt-injection': { en: 'prompt injection', zh: '提示注入' },
  destructive: { en: 'destructive', zh: '破坏性' },
  ssrf: { en: 'SSRF', zh: 'SSRF' },
  'secret-leak': { en: 'secret leak', zh: '密钥泄露' },
  'sandbox-escape': { en: 'sandbox escape', zh: '沙箱逃逸' },
};

/** Guard action names. */
export const ACTION_TEXT: Readonly<Record<string, { en: string; zh: string }>> = {
  block: { en: 'block', zh: '拒绝' },
  ask: { en: 'ask', zh: '升级审批' },
  warn: { en: 'warn', zh: '仅记录' },
  off: { en: 'off', zh: '关闭' },
};

/**
 * Severity name for a locale.
 *
 * @param locale - the configured locale.
 * @param severity - the severity.
 * @returns the localized name.
 */
export function severityName(locale: Locale, severity: Severity): string {
  const text = SEVERITY_TEXT[severity];
  return t(locale, text.en, text.zh);
}

/**
 * Category name for a locale.
 *
 * @param locale - the configured locale.
 * @param category - the category, or any unknown string.
 * @returns the localized name, falling back to the raw value.
 */
export function categoryName(locale: Locale, category: string): string {
  const text = CATEGORY_TEXT[category];
  return text === undefined ? category : t(locale, text.en, text.zh);
}

/**
 * Guard action name for a locale.
 *
 * @param locale - the configured locale.
 * @param action - the action.
 * @returns the localized name, falling back to the raw value.
 */
export function actionName(locale: Locale, action: string): string {
  const text = ACTION_TEXT[action];
  return text === undefined ? action : t(locale, text.en, text.zh);
}
