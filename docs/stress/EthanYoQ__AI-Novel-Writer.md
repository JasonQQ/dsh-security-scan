> 批量压测 / Batch stress test · ★ 1012 · `EthanYoQ/AI-Novel-Writer#plugins/dsh-ai-novel-writer`
> https://github.com/EthanYoQ/AI-Novel-Writer/tree/master/plugins/dsh-ai-novel-writer · audited in 15.2s
# 安装前体检 / Pre-install audit: @ethanyoq/dsh-ai-novel-writer@0.1.0

**信任评级 / Trust grade: D** (评分 / score 17/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

- 来源 / Source: `https://codeload.github.com/EthanYoQ/AI-Novel-Writer/tar.gz/HEAD` (URL / url)
- 已分析文件：106 个（1.8 MiB） / Files analysed: 106 (1.8 MiB)
- 内容摘要 / Content digest: `c8d652e2c5d0d7f5173a7a41fcfe53d0…`
- 体检时间 / Audited at: 2026-09-20T09:52:43.270Z

## 最严重的风险 / Most severe risk

**源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model** `prompt.embedded-instruction-string`

中 它夹带了写给 agent 而不是写给人看的文字——试图在你不察觉的情况下改变 agent 行为的指令。
EN It carries text aimed at the agent rather than at a person — instructions that try to change what the agent does without telling you.

该包会访问的目标：`github.com`、`127.0.0.1:${port`、`127.0.0.1`、`127.0.0.1:1...first` / Destinations this package reaches: `github.com`, `127.0.0.1:${port`, `127.0.0.1`, `127.0.0.1:1...first`

- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.

决定该评级的规则命中于 `scripts/qualify-release.mjs:199`；完整列表见下方「发现」。 / The rule that decided the grade fired at `scripts/qualify-release.mjs:199`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `node:fs/promises`, `package.json`, `cordis.patch.yml`, `client.js`, `lib/client.js`, `project.json`, `.ai-novel/project.json`, `0001.md`, `chapters/0001.md`, `story.json`, `blueprints/story.json`, `characters.json` （另有 11 项） / (+11 more)
- **写入的文件路径 / File paths written:** `node:fs/promises`, `\n`, `@deepseek-ai/dsh-atomic-write`, `novel.db`, `.ai-novel/novel.db`, `blueprints/chapters`, `characters.json`, `story.json`, `blueprints/story.json`, `0002.json`, `blueprints/chapters/0002.json`, `0002.md` （另有 15 项） / (+15 more)
- **派生的命令 / Commands spawned:** `node:child_process`, `taskkill.exe`, `/pid`, `/t`, `/f`, `const {spawn}=require('node:child_process')`, `const child=spawn(process.execPath,['-e',${JSON.stringify(grandchildSource)}],{stdio:'ignore'})`, `--input-type=module`, `--eval`, `--check-static`, `http://127.0.0.1:1`, `first` （另有 9 项） / (+9 more)
- **连接的域名 / Domains contacted:** `github.com`, `127.0.0.1:${port`, `127.0.0.1`, `127.0.0.1:1...first`
- **读取的环境变量 / Environment variables read:** `DSH_HARNESS_ROOT`, `DSH_NOVEL_QUALIFICATION_LOG`, `PATH`, `DSH_NOVEL_PRESET_ROOT`, `DSH_SNAPSHOT`, `DSH_NOVEL_APPROVAL_POLICY`, `DSH_NOVEL_SCENARIO`, `DSH_NOVEL_FORCE_READ_ERROR`, `DSH_NOVEL_AUTHORING_STAGE`, `DSH_NOVEL_AUTHORING_PROMPT_BASE64`, `DSH_WORKBENCH_SCREENSHOT_DIR`, `AI_NOVEL_LOCK_DATABASE` （另有 1 项） / (+1 more)

## 发现 / Findings

### 高 / HIGH (3)

- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `scripts/qualify-release.mjs:662` — `const url = `http://127.0.0.1:${port}``
  - `tests/qualification-browser.script.spec.ts:162` — `const result = await execFileAsync(process.execPath, [browserJourney, 'http://127.0.0.1:1', '.', '.', '.', 'first'], {`
  - `tests/qualification-browser.script.spec.ts:162` — `http://127.0.0.1:1...first`
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **高 / HIGH** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `scripts/verify-built.mjs:68` — `const builtModule = await import(pathToFileURL(join(root, manifest.main)).href)`
  - `scripts/verify-built.mjs:74` — `const v2AgentModule = await import(pathToFileURL(join(root, 'lib', 'agent-v2.js')).href)`
  - `tests/fixtures/workbench-browser-v1/driver.mjs:33` — `const workspaceModule = await import(pathToFileURL(join(packageRoot, 'tests', 'test-workspace.ts')).href)`
  - `tests/fixtures/workbench-browser-v1/driver.mjs:44` — `const appBootModule = await import(pathToFileURL(cliRequire.resolve('@deepseek-ai/dsh-app-boot')).href)`
  - ……另有 9 处 / … and 9 more location(s)
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.
- **高 / HIGH** `prompt.embedded-instruction-string` — 源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model
  中 源码中的字符串字面量——通常是工具描述或系统提示词片段——要求模型绕过确认或对用户隐瞒某些事，于是它作为一条指令进入上下文窗口。
  EN A string literal in the source — typically a tool description or system prompt fragment — tells the model to bypass confirmation or to hide something from the user, so it lands in the context window as a directive.
  - `scripts/qualify-release.mjs:199` — `'Model request must include the complete system prompt'`
  - `tests/fixtures/complete-chapter/snapshot-backend.mjs:274` — `'V2 authoring qualification did not receive the required proposal protocol in its first model system prompt'`
  中 修复：如实描述工具的行为，删除那些会改变 agent 对待用户方式的指令。
  EN Fix: Describe the tool's behavior factually and remove directives that change how the agent treats the user.

### 中 / MEDIUM (3)

- **中 / MEDIUM** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `src/client/index.ts:768` — `name: 'shell.overlay',`
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `scripts/qualify-release.mjs:662` — `http://127.0.0.1:${port`
  - `tests/qualification-browser.script.spec.ts:162` — `http://127.0.0.1:1`
  - `tests/qualification-browser.script.spec.ts:162` — `http://127.0.0.1:1...first`
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `obf.long-minified-line` — 整行是压缩或机器生成的数据块 / Line is a single minified or machine-generated blob
  中 该行超过 500 个字符且几乎没有空白，正是打包载荷、压缩字符串表或机器生成单行代码的样子。这样的一行用肉眼什么也审不出来。
  EN The line is over 500 characters with almost no whitespace, which is what a bundled payload, a packed string table or a machine-generated one-liner looks like. Nothing on such a line is reviewable by eye.
  - `src/agent.ts:73` — `'人物阶段可复制的单一 Proposal JSON：{"changes":[{"changeSetId":"characters-example","aggregate":{"kind":"characters"},"baseAggregateRevision":0,"baseGlobalRevision":0,"ne…`
  - `src/client/setup-style.ts:33` — `.aiNovelAssetList{display:grid;gap:8px}.aiNovelAssetList button,.aiNovelCharacterList button{display:grid;gap:3px;width:100%;border:1px solid var(--dsw-alias-bo…`
  - `src/client/setup-style.ts:34` — `.aiNovelAssetHeading{display:grid;gap:12px}.aiNovelAssetHeading h3,.aiNovelAssetHeading p{margin:0}.aiNovelAssetHeading p{margin-top:3px;font-size:12px;color:va…`
  - `src/client/workbench-store.ts:387` — `return `请根据用户要求生成当前 Harness 小说项目的完整项目设置。\n\n用户要求：\n${resolvedGenerationBrief(brief)}\n\n当前工作台中的项目设置草稿仅作为用户意图参考，尚未写入磁盘：\n${JSON.stringify(draft, null, 2)}\n\n硬性执…`
  中 修复：发布未压缩的源码，或在 README 中说明该文件由哪个构建产出、可读源码在哪里。
  EN Fix: Ship unminified source, or state in the README which build produced the file and where the readable source lives.

### 低 / LOW (1)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `scripts/qualify-release.mjs:309` — `const profile = objectOf(dsh.profile, 'Profile bundle manifest')`
  - `scripts/qualify-release.mjs:321` — `const profile = objectOf(objectOf(manifest.dsh, 'Profile dsh manifest').profile, 'Profile bundle manifest')`
  - `scripts/qualify-release.mjs:376` — `env: options.env,`
  - `scripts/qualify-release.mjs:748` — `...env,`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.

_按类别 / By category:_ 网络回调 / network callbacks 2 · 混淆 / obfuscation 2 · 提示注入 / prompt injection 1 · 滥用宿主环境 / harness abuse 1 · 凭据读取 / credential access 1

## 扫描说明 / Scan notes

- scoped to the subdirectory `plugins/dsh-ai-novel-writer/`
- stripped the archive's single top-level directory `AI-Novel-Writer-HEAD/`
- outbound fetching was permitted for this audit
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
