/**
 * The single risk that decided the grade.
 *
 * A `D` grade is a verdict, and a verdict is not an explanation. The finding list
 * answers "what did you see?", but the reader's first question is "what is the
 * one thing that matters?" — and a list of fifteen rows, seven of them critical,
 * is exactly the shape that makes a reader close the report.
 *
 * So a `D` report leads with one paragraph: the worst finding, its consequence in
 * plain language, and the facts that make it worse (it runs at install time, the
 * code that does it is obfuscated, it arranges to keep running). Every sentence is
 * composed from facts already in the `ScanResult` — nothing is inferred, nothing
 * is generated — which is what keeps it honest and testable.
 *
 * A `D` grade always means at least one `critical` finding, because scoring pins
 * the grade to `D` on any critical. So this section is exactly "the worst critical
 * finding, explained", and it does not appear for a `C`.
 *
 * @module dsh-security-scan/scan/risk
 */

import type { Category, Finding, ScanResult } from '../types.js';
import { type Locale, t, zhFor } from '../i18n.js';
import { SCAN_RULE_TEXT_ZH } from './rules.zh.js';

/**
 * How bad this category's worst outcome is, higher being worse.
 *
 * Used only to order findings that already share the worst severity, so it never
 * outranks severity itself. The order encodes one judgement worth stating: data
 * leaving the machine is worse than anything that stays on it, because it cannot
 * be undone locally, and the means to leave (credentials) is next.
 */
const CATEGORY_IMPACT: Readonly<Record<Category, number>> = {
  exfiltration: 100,
  'credential-access': 92,
  'secret-leak': 90,
  'install-script': 86,
  destructive: 82,
  'prompt-injection': 74,
  'sandbox-escape': 72,
  'network-callback': 70,
  'harness-abuse': 66,
  persistence: 60,
  obfuscation: 56,
  privilege: 52,
  ssrf: 46,
  'supply-chain': 40,
};

/** The consequence of a category's worst case, in plain language. */
const CONSEQUENCE: Readonly<Record<string, { en: string; zh: string }>> = {
  exfiltration: {
    en: 'Data leaves this machine. Something in this package takes content that lives here and sends it to a destination outside it.',
    zh: '数据会离开这台机器。该包中有代码把本机上的内容发往外部地址。',
  },
  'credential-access': {
    en: 'It reads credentials from this machine — a private key, a token, or a cloud credential file. Those are enough to act as you somewhere else, and they cannot be un-leaked once they leave.',
    zh: '它会读取本机上的凭据——私钥、令牌或云凭据文件。这些足以在别处以你的身份行事，而一旦泄露就无法收回。',
  },
  'secret-leak': {
    en: 'It handles a live secret, and a live secret in the wrong place is a working credential for whoever reads it next.',
    zh: '它接触了仍然有效的密钥。密钥一旦落到别处，对读到它的人来说就是一枚可用的凭据。',
  },
  'install-script': {
    en: 'It runs a command as part of installing. Installing is the step where you are least likely to be watching what executes.',
    zh: '它会在安装过程中执行命令。而安装恰恰是你最不会盯着代码看的那一步。',
  },
  destructive: {
    en: 'It runs an operation that cannot be undone on this machine.',
    zh: '它会执行在本机上无法撤销的操作。',
  },
  'prompt-injection': {
    en: 'It carries text aimed at the agent rather than at a person — instructions that try to change what the agent does without telling you.',
    zh: '它夹带了写给 agent 而不是写给人看的文字——试图在你不察觉的情况下改变 agent 行为的指令。',
  },
  'sandbox-escape': {
    en: 'It tries to widen its own permissions, which removes the boundary you are relying on to contain it.',
    zh: '它会试图扩大自己的权限，从而移除你赖以约束它的那道边界。',
  },
  'network-callback': {
    en: 'It opens an outbound connection, so it can receive instructions or send data at a moment you do not choose.',
    zh: '它会建立出站连接，因此可以在你无法选择的时机接收指令或送出数据。',
  },
  'harness-abuse': {
    en: 'It changes the harness itself — the settings, the session state or another plugin — so what you reviewed is not what keeps running.',
    zh: '它会改动 harness 自身——设置、会话状态或别的插件——于是你审过的东西并不是之后继续运行的东西。',
  },
  persistence: {
    en: 'It arranges to run again later, after this session is gone.',
    zh: '它会安排自己在之后继续运行——等这个会话已经结束以后。',
  },
  obfuscation: {
    en: 'It hides how it is written, so reading it tells a reviewer little about what it actually executes.',
    zh: '它把自己的写法藏了起来，所以读源码基本看不出它真正执行的是什么。',
  },
  privilege: {
    en: 'It runs with more privilege than the task needs, so a mistake in it is larger than it should be.',
    zh: '它以超出任务所需的权限运行，因此它一旦出错，后果也更大。',
  },
  ssrf: {
    en: 'It can reach a destination the caller never intended — an internal service or an instance-metadata endpoint.',
    zh: '它可以访问调用方从未打算让它访问的目标——内部服务或实例元数据端点。',
  },
  'supply-chain': {
    en: 'It depends on code that is not pinned to a reviewed revision, so what installs tomorrow may differ from what was reviewed.',
    zh: '它依赖的代码没有钉在已复核的版本上，因此明天装到的东西可能和复核过的不一样。',
  },
};

/** The single worst risk in a result, with the facts that make it worse. */
export interface TopRisk {
  /** The finding that decided the grade. */
  finding: Finding;
  /** Localized title of that rule. */
  title: string;
  /** English title as authored, so a reader can grep the log for it. */
  titleEn: string;
  /** Plain-language consequence, per language. */
  consequence: { en: string; zh: string };
  /** Aggravating facts, in a fixed order, per language. */
  aggravations: readonly { en: string; zh: string }[];
  /** Outbound destinations the package reaches, when it reaches any. */
  destinations: readonly string[];
}

/** Severity ordering, worst first. */
const SEVERITY_RANK: readonly string[] = ['critical', 'high', 'medium', 'low', 'info'];

/**
 * Pick the finding that decided the grade.
 *
 * Severity first, then category impact, then the number of independent evidence
 * anchors, then the rule id so the choice is stable across runs and platforms. A
 * report that names a different "worst risk" on each run is a report nobody can
 * quote.
 *
 * @param result - the scan result.
 * @returns the worst finding, or `undefined` when nothing fired.
 */
export function pickTopRisk(result: ScanResult): Finding | undefined {
  if (result.findings.length === 0) return undefined;
  const worstSeverity = SEVERITY_RANK.find((severity) =>
    result.findings.some((finding) => finding.severity === severity),
  );
  const candidates = result.findings.filter((finding) => finding.severity === worstSeverity);
  const ranked = [...candidates].sort((left, right) => {
    const impact = (CATEGORY_IMPACT[right.category] ?? 0) - (CATEGORY_IMPACT[left.category] ?? 0);
    if (impact !== 0) return impact;
    const anchors = right.evidence.length - left.evidence.length;
    if (anchors !== 0) return anchors;
    return left.id.localeCompare(right.id);
  });
  return ranked[0];
}

/**
 * Compose the top risk, with the context that makes it concrete.
 *
 * @param result - the scan result.
 * @returns the risk, or `undefined` when nothing fired.
 */
export function topRiskOf(result: ScanResult): TopRisk | undefined {
  const finding = pickTopRisk(result);
  if (finding === undefined) return undefined;

  const translated = zhFor(SCAN_RULE_TEXT_ZH, finding.id);
  const consequence = CONSEQUENCE[finding.category] ?? {
    en: finding.detail,
    zh: translated?.detail ?? finding.detail,
  };

  const aggravations: { en: string; zh: string }[] = [];

  // Order is deliberate: what happens without you doing anything comes first,
  // because that is the part a reader cannot control.
  const installTime = result.installScripts.find((script) => script.installTime);
  if (installTime !== undefined) {
    aggravations.push({
      en: `It happens at install time: the \`${installTime.hook}\` script runs it, so you do not have to run anything yourself.`,
      zh: `它发生在安装时：\`${installTime.hook}\` 脚本会执行它，你不需要自己运行任何东西。`,
    });
  }
  const obfuscated = result.findings.some((candidate) => candidate.category === 'obfuscation');
  if (obfuscated) {
    aggravations.push({
      en: 'Part of it is obfuscated, so the source does not show what actually executes.',
      zh: '其中一部分经过混淆，源码看不出真正执行的是什么。',
    });
  }
  const persists = result.findings.some((candidate) => candidate.category === 'persistence');
  if (persists) {
    aggravations.push({
      en: 'It also arranges to run again later, so removing the package is not enough on its own.',
      zh: '它还安排了之后继续运行，所以仅仅卸载这个包并不够。',
    });
  }
  const reachesMetadata = result.capabilities.domains.some((item) => item.value.startsWith('169.254.'));
  if (reachesMetadata) {
    aggravations.push({
      en: 'It contacts the cloud instance-metadata endpoint, which on a hosted machine hands out role credentials.',
      zh: '它会访问云实例元数据端点——在云主机上，那个端点会直接交出角色凭据。',
    });
  }
  if (result.truncated) {
    aggravations.push({
      en: 'The scan was partial, so there may be more that was never read.',
      zh: '本次扫描不完整，因此可能还有内容根本没被读到。',
    });
  }

  return {
    finding,
    // `title` is the Chinese title when one exists and the English original
    // otherwise, so `t(locale, titleEn, title)` renders correctly in every locale
    // — including when the rule has not been translated yet, in which case both
    // sides are the same English string rather than a blank.
    title: translated?.title ?? finding.title,
    titleEn: finding.title,
    consequence,
    aggravations,
    destinations: [...new Set(result.capabilities.domains.map((item) => item.value))].slice(0, 8),
  };
}

/**
 * Render the top risk as a Markdown section.
 *
 * @param result - the scan result.
 * @param locale - how much language to emit.
 * @returns the section, or `undefined` when the grade is not `D`.
 */
export function renderTopRisk(result: ScanResult, locale: Locale): string | undefined {
  // `D` always means at least one critical finding, so this is exactly the case
  // where a reader needs one paragraph rather than a list.
  if (result.grade !== 'D') return undefined;
  const risk = topRiskOf(result);
  if (risk === undefined) return undefined;

  const lines: string[] = [];
  lines.push(`## ${t(locale, 'Most severe risk', '最严重的风险')}`);
  lines.push('');
  // Only join the two when they differ. An untranslated rule has the same string
  // on both sides, and printing it twice is exactly the duplication this report
  // is built to avoid.
  const heading = risk.title === risk.titleEn ? risk.titleEn : t(locale, risk.titleEn, risk.title);
  lines.push(`**${heading}** \`${risk.finding.id}\``);
  lines.push('');
  if (locale === 'en') {
    lines.push(risk.consequence.en);
  } else if (locale === 'zh') {
    lines.push(risk.consequence.zh);
  } else {
    lines.push(`中 ${risk.consequence.zh}`);
    lines.push(`EN ${risk.consequence.en}`);
  }

  if (risk.destinations.length > 0) {
    lines.push('');
    lines.push(
      t(
        locale,
        `Destinations this package reaches: ${risk.destinations.map((host) => `\`${host}\``).join(', ')}`,
        `该包会访问的目标：${risk.destinations.map((host) => `\`${host}\``).join('、')}`,
      ),
    );
  }

  if (risk.aggravations.length > 0) {
    lines.push('');
    for (const item of risk.aggravations) {
      if (locale === 'en') lines.push(`- ${item.en}`);
      else if (locale === 'zh') lines.push(`- ${item.zh}`);
      else lines.push(`- 中 ${item.zh}`);
      if (locale === 'bilingual') lines.push(`  EN ${item.en}`);
    }
  }

  const anchor = risk.finding.evidence[0];
  if (anchor !== undefined) {
    lines.push('');
    lines.push(
      t(
        locale,
        `The rule that decided the grade fired at \`${anchor.file}:${anchor.line}\`; the full list is under Findings below.`,
        `决定该评级的规则命中于 \`${anchor.file}:${anchor.line}\`；完整列表见下方「发现」。`,
      ),
    );
  }
  lines.push('');
  return lines.join('\n');
}

/**
 * One line naming the top risk, for a summary or a refusal message.
 *
 * @param result - the scan result.
 * @param locale - how much language to emit.
 * @returns the line, or `undefined` when nothing fired.
 */
export function renderTopRiskLine(result: ScanResult, locale: Locale): string | undefined {
  const risk = topRiskOf(result);
  if (risk === undefined) return undefined;
  const heading = risk.title === risk.titleEn ? risk.titleEn : t(locale, risk.titleEn, risk.title);
  return `${t(locale, 'Most severe risk', '最严重的风险')}: ${heading} \`${risk.finding.id}\``;
}
