> 批量压测 / Batch stress test · ★ 579 · `superdesigndev/superdesign-skill`
> https://github.com/superdesigndev/superdesign-skill · audited in 1.5s
# 安装前体检 / Pre-install audit: superdesign-dsh@0.6.0

**信任评级 / Trust grade: B** (评分 / score 82/100 — 有轻微信号，建议复核 / minor signals, review recommended)

- 来源 / Source: `https://codeload.github.com/superdesigndev/superdesign-skill/tar.gz/HEAD` (URL / url)
- 已分析文件：31 个（218.3 KiB） / Files analysed: 31 (218.3 KiB)
- 内容摘要 / Content digest: `abf2afa7324dbc03346f994151119098…`
- 体检时间 / Audited at: 2026-09-20T09:52:43.646Z

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `node:fs/promises`
- **写入的文件路径 / File paths written:** （无） / (none)
- **派生的命令 / Commands spawned:** （无） / (none)
- **连接的域名 / Domains contacted:** `json.schemastore.org`, `superdesign.dev`, `github.com`, `www.w3.org`
- **读取的环境变量 / Environment variables read:** （无） / (none)

## 发现 / Findings

### 高 / HIGH (1)

- **高 / HIGH** `prompt.doc-instruction` — 文档中包含针对模型的指令 / Documentation contains instructions aimed at a model
  中 随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。
  EN A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.
  - `skills/superdesign/references/design-with-your-model.md:27` — `5. If import returns `invalid_html`, correct every reported issue exactly and retry once; never weaken or bypass the contract. Act on every returned `warnings[]…`
  中 修复：把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。
  EN Fix: Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `superdesign-skill-HEAD/`
- not scanned (binary, contents unreadable as text): assets/superdesign-icon.png
- outbound fetching was permitted for this audit

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
