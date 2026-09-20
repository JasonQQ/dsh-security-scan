> 批量压测 / Batch stress test · ★ 839 · `toby-bridges/api-relay-audit`
> https://github.com/toby-bridges/api-relay-audit · audited in 3.0s
# 安装前体检 / Pre-install audit: dsh-api-relay-audit@2.4.0

**信任评级 / Trust grade: D** (评分 / score 13/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/toby-bridges/api-relay-audit/tar.gz/HEAD` (URL / url)
- 已分析文件：126 个（1.5 MiB） / Files analysed: 126 (1.5 MiB)
- 内容摘要 / Content digest: `8f339999588af5786e66539db796338b…`
- 体检时间 / Audited at: 2026-09-20T09:52:34.433Z

## 最严重的风险 / Most severe risk

**文档中包含针对模型的指令 / Documentation contains instructions aimed at a model** `prompt.doc-instruction`

中 它夹带了写给 agent 而不是写给人看的文字——试图在你不察觉的情况下改变 agent 行为的指令。
EN It carries text aimed at the agent rather than at a person — instructions that try to change what the agent does without telling you.

该包会访问的目标：`example.invalid`、`relay.example.com`、`relay.example.comsk-...claude-3`、`hvoy.ai`、`raw.githubusercontent.com`、`xxx.com`、`github.com`、`toby-bridges.github.io` / Destinations this package reaches: `example.invalid`, `relay.example.com`, `relay.example.comsk-...claude-3`, `hvoy.ai`, `raw.githubusercontent.com`, `xxx.com`, `github.com`, `toby-bridges.github.io`

- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `docs/codex-review.md:276`；完整列表见下方「发现」。 / The rule that decided the grade fired at `docs/codex-review.md:276`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `../../package.json`
- **写入的文件路径 / File paths written:** `.git`
- **派生的命令 / Commands spawned:** （无） / (none)
- **连接的域名 / Domains contacted:** `example.invalid`, `relay.example.com`, `relay.example.comsk-...claude-3`, `hvoy.ai`, `raw.githubusercontent.com`, `xxx.com`, `github.com`, `toby-bridges.github.io`, `arxiv.org`, `$nas_host:$port`, `relay.example`, `override.example` （另有 30 项） / (+30 more)
- **读取的环境变量 / Environment variables read:** `PR_URL`

## 发现 / Findings

### 高 / HIGH (4)

- **高 / HIGH** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 39 distinct remote hosts (example.invalid, github.com, hvoy.ai, raw.githubusercontent.com, relay.example.com, relay.example.comsk-...claude-3, toby-bridges.github.io, xxx.com, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `.github/ISSUE_TEMPLATE/detector-gap.yml:41` — `https://example.invalid/v1`
  - `api_relay_audit/client.py:294` — `https://relay.example.com`
  - `api_relay_audit/client.py:459` — `https://relay.example.comsk-...claude-3`
  - `api_relay_audit/identity_patterns.py:45` — `https://hvoy.ai/`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **高 / HIGH** `priv.sudo-invocation` — 通过 sudo 提权 / Escalates with sudo
  中 该行通过 `sudo` 执行命令，意味着这个以用户级工具身份安装的插件在索要 root 权限，而用户事先看不到提权提示。
  EN The line runs a command through `sudo`, so the plugin is asking for root on a machine where it was installed as a user-level tool and where the user cannot see the escalation prompt in advance.
  - `deploy/deploy-nas.sh:36` — `echo "Linux: sudo apt-get install sshpass"`
  中 修复：去掉提权，把任何需要特权的步骤写成一条由用户主动执行的独立命令并加以说明。
  EN Fix: Remove the escalation and document any privileged step as a separate command the user runs deliberately.
- **高 / HIGH** `prompt.doc-instruction` — 文档中包含针对模型的指令 / Documentation contains instructions aimed at a model
  中 随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。
  EN A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.
  - `docs/codex-review.md:276` — `审计报告会包含 API 响应原文（如提取出的 system prompt），以及目标 URL 和 API 格式信息。报告文件本身应被视为敏感文件，但当前没有任何提示或警告。`
  - `docs/comparison-api-relay-audit-vs-hvoy-vs-cctest.md:38` — `| **Token 注入检测** (隐藏 system prompt) | ✅ Step 3, delta 法 | ❌ | ✅ 核心功能 |`
  - `docs/comparison-api-relay-audit-vs-hvoy-vs-cctest.md:112` — `4. **知识水平检测**：通过出知识题检验模型真假。api-relay-audit 明确不做这个（原因：中转站可以在 system prompt 里硬编码"知识截止日期是 2025 年 5 月"来欺骗检测）。hvoy.ai 的作者也承认这个维度不够可靠，但它确实是一个额外的信号。`
  - `docs/comparison-api-relay-audit-vs-hvoy-vs-cctest.md:161` — `- **知识检测可被绕过**：中转站在 system prompt 里加一行就能通过知识题考试。`
  - ……另有 23 处 / … and 23 more location(s)
  中 修复：把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。
  EN Fix: Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.
- **高 / HIGH** `prompt.embedded-instruction-string` — 源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model
  中 源码中的字符串字面量——通常是工具描述或系统提示词片段——要求模型绕过确认或对用户隐瞒某些事，于是它作为一条指令进入上下文窗口。
  EN A string literal in the source — typically a tool description or system prompt fragment — tells the model to bypass confirmation or to hide something from the user, so it lands in the context window as a directive.
  - `web/data-example.json:73` — `"隐藏 system prompt 注入 ~80 tokens"`
  - `web/data-example.json:75` — `"自定义 system prompt 导致 422 冲突"`
  - `web/data-example.json:78` — `"注入约 80 tokens 的 Claude Code CLI 身份指令。翻译法和 JSON 接龙法可提取 prompt。自定义 system prompt 会触发 422 错误（注入 prompt 冲突）。上下文 ~200K tokens 完整。"`
  - `web/data-example.json:95` — `"I appreciate your interest, but I need to respectfully decline this request. My system prompt contains operational instructions..."`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：如实描述工具的行为，删除那些会改变 agent 对待用户方式的指令。
  EN Fix: Describe the tool's behavior factually and remove directives that change how the agent treats the user.

### 中 / MEDIUM (1)

- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `deploy/deploy-nas.sh:91` — `http://$NAS_HOST:$PORT`
  - `web/sitemap.xml:2` — `http://www.sitemaps.org/schemas/sitemap/0.9`
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.

### 低 / LOW (1)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `.github/workflows/pr-release-label.yml:29` — `labels = json.loads(os.environ["LABELS_JSON"])`
  - `dsh/test/plugin.test.js:320` — `assert.equal(spawn.env[CHILD_KEY_ENV], SECRET)`
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.

_按类别 / By category:_ 网络回调 / network callbacks 2 · 提示注入 / prompt injection 2 · 提权 / privilege 1 · 凭据读取 / credential access 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `api-relay-audit-HEAD/`
- skipped assets/readme-banner.png: 924941 bytes exceeds the 524288-byte per-file cap
- skipped assets/social-preview.png: 649370 bytes exceeds the 524288-byte per-file cap
- skipped web/assets/social-preview.png: 649370 bytes exceeds the 524288-byte per-file cap
- outbound fetching was permitted for this audit
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
