/**
 * Prints the plugin's real, current inventory: rule counts, categories, tool and
 * command surface, and the module dependency graph.
 *
 * This exists so the numbers quoted in `README.md`, `README.zh.md`, `SECURITY.md`
 * and the marketplace entry can be checked against the code rather than trusted.
 * The marketplace treats a description as a claim about the source and verifies
 * it, so an accurate inventory is a reviewability feature, not a nicety.
 *
 * Run after a build: `npm run build && node scripts/inventory.mjs`
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const { GUARD_RULES, OUTPUT_RULES } = await import('../lib/guard/rules.catalog.js');
const { LINE_RULES, PACKAGE_RULES } = await import('../lib/scan/rules.catalog.js');

/** Tally a list of rules by their category or id prefix. */
function tally(items, key) {
  const counts = new Map();
  for (const item of items) {
    const bucket = key(item);
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
}

/** Print a tally block. */
function block(title, entries) {
  console.log(`\n${title} (${entries.reduce((sum, [, count]) => sum + count, 0)})`);
  for (const [name, count] of entries) console.log(`  ${String(count).padStart(3)}  ${name}`);
}

/** Every module specifier imported by the built output. */
function collectSpecifiers(dir, into = new Set()) {
  for (const entry of readdirSync(dir)) {
    const absolute = join(dir, entry);
    if (statSync(absolute).isDirectory()) {
      collectSpecifiers(absolute, into);
      continue;
    }
    if (!absolute.endsWith('.js')) continue;
    const source = readFileSync(absolute, 'utf8');
    for (const match of source.matchAll(/^[ \t]*(?:import|export)\b[^;]*?\bfrom\s*['"]([^'"]+)['"]/gm)) into.add(match[1]);
    for (const match of source.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)) into.add(match[1]);
  }
  return into;
}

console.log('dsh-security-scan — inventory');
console.log('='.repeat(60));

block('Static audit: line rules', tally(LINE_RULES, (rule) => rule.category));
block('Static audit: package (correlation) rules', tally(PACKAGE_RULES, (rule) => rule.category));
block('Runtime guard: input rules', tally(GUARD_RULES, (rule) => rule.category));
block('Runtime guard: output rules', tally(OUTPUT_RULES, (rule) => rule.category));

const severities = ['critical', 'high', 'medium', 'low', 'info'];
const allFindings = [...LINE_RULES, ...PACKAGE_RULES];
console.log('\nStatic audit severity spread');
for (const severity of severities) {
  const count = allFindings.filter((rule) => rule.severity === severity).length;
  if (count > 0) console.log(`  ${String(count).padStart(3)}  ${severity}`);
}
console.log('\nRuntime guard action spread (input rules)');
for (const action of ['block', 'ask', 'warn']) {
  const count = GUARD_RULES.filter((rule) => rule.action === action).length;
  console.log(`  ${String(count).padStart(3)}  ${action}`);
}
console.log(`\nTotals`);
console.log(`  ${LINE_RULES.length + PACKAGE_RULES.length}  static rules`);
console.log(`  ${GUARD_RULES.length + OUTPUT_RULES.length}  runtime rules`);
console.log(`  ${LINE_RULES.length + PACKAGE_RULES.length + GUARD_RULES.length + OUTPUT_RULES.length}  rules in total`);
console.log(`  ${GUARD_RULES.filter((rule) => rule.tools.includes('*')).length + OUTPUT_RULES.filter((rule) => rule.tools.includes('*')).length}  runtime rules that apply to every tool`);

const specifiers = collectSpecifiers('lib');
const external = [...specifiers].filter((specifier) => !specifier.startsWith('node:') && !specifier.startsWith('.'));
console.log('\nBuilt output imports');
console.log(`  ${specifiers.size} distinct module specifiers`);
console.log(`  ${external.length} non-builtin: ${external.length === 0 ? 'none' : external.join(', ')}`);
