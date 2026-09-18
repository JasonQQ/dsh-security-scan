/**
 * Chinese text for the runtime-guard rules.
 *
 * Keys are rule ids exactly as they appear in `rules.catalog.ts`, covering both
 * the input rules and the output rules. A missing key is not an error — the
 * rendering falls back to the English original — but it does mean that detection
 * is reported in English only, which `translationCoverage` reports and the status
 * tool surfaces rather than hiding.
 *
 * Technical tokens are deliberately **not** translated: command names, paths,
 * hostnames, addresses, environment variable names, API names and tool names stay
 * as they are. A developer whose call was just refused needs to be able to copy
 * the quoted match into a shell or a search, and paraphrasing it would defeat the
 * fix advice entirely.
 *
 * @module dsh-security-scan/guard/rules.zh
 */

import type { RuleTextZh } from '../i18n.js';

/**
 * Chinese title, explanation and remediation, by rule id.
 *
 * Empty until the translation pass lands; `zhFor` and `translationCoverage` treat
 * an absent key as "not translated yet" rather than as a failure.
 */
export const GUARD_RULE_TEXT_ZH: Readonly<Record<string, RuleTextZh>> = {};
