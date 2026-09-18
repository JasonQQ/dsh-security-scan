/**
 * Chinese text for the static-analysis rules.
 *
 * Keys are rule ids exactly as they appear in `rules.catalog.ts`. A missing key
 * is not an error — `renderReport` falls back to the English original, so a rule
 * added between translation passes still renders — but it does mean that finding
 * appears in English only, which `translationCoverage` reports and the status
 * tool surfaces rather than hiding.
 *
 * Technical tokens are deliberately **not** translated: command names, paths,
 * hostnames, addresses, environment variable names, API names and file names stay
 * as they are, so a reader can copy them into a terminal or a search. A
 * translation that paraphrased them would be worse than no translation.
 *
 * @module dsh-security-scan/scan/rules.zh
 */

import type { RuleTextZh } from '../i18n.js';

/**
 * Chinese title, explanation and remediation, by rule id.
 *
 * Empty until the translation pass lands; `zhFor` and `translationCoverage` treat
 * an absent key as "not translated yet" rather than as a failure.
 */
export const SCAN_RULE_TEXT_ZH: Readonly<Record<string, RuleTextZh>> = {};
