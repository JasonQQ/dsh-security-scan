> 批量压测 / Batch stress test · ★ 1444 · `bowenliang123/dsh-context`
> https://github.com/bowenliang123/dsh-context · audited in 1.6s
# 安装前体检 / Pre-install audit: dsh-context@0.54.0

**信任评级 / Trust grade: D** (评分 / score 19/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/bowenliang123/dsh-context/tar.gz/HEAD` (URL / url)
- 已分析文件：271 个（3.2 MiB） / Files analysed: 271 (3.2 MiB)
- 内容摘要 / Content digest: `6e006ed7b0ceefe05ca8e4a244b752e0…`
- 体检时间 / Audited at: 2026-09-20T09:52:03.663Z

## 最严重的风险 / Most severe risk

**源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model** `prompt.embedded-instruction-string`

中 它夹带了写给 agent 而不是写给人看的文字——试图在你不察觉的情况下改变 agent 行为的指令。
EN It carries text aimed at the agent rather than at a person — instructions that try to change what the agent does without telling you.

该包会访问的目标：`registry.npmjs.org`、`github.com`、`www.apache.org`、`www.npmjs.com`、`platform.deepseek.com`、`www.w3.org`、`registry.npmmirror.com`、`api.deepseek.com` / Destinations this package reaches: `registry.npmjs.org`, `github.com`, `www.apache.org`, `www.npmjs.com`, `platform.deepseek.com`, `www.w3.org`, `registry.npmmirror.com`, `api.deepseek.com`

- 中 它发生在安装时：`prepare` 脚本会执行它，你不需要自己运行任何东西。
  EN It happens at install time: the `prepare` script runs it, so you do not have to run anything yourself.
- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `src/client/i18n.ts:299`；完整列表见下方「发现」。 / The rule that decided the grade fired at `src/client/i18n.ts:299`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

- `prepare` (`package.json`): `husky && tsdown`

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `data:image/png;base64,${fs.readFileSync(hiResPath).toString('base64')}`, `/`, `surface.ts`, `\n`, `/repo/a.ts`, `client.js`, `lib/client.js`, `.git`, `index.js`, `lib/index.js`, `node_modules/`, `node:fs/promises` （另有 1 项） / (+1 more)
- **写入的文件路径 / File paths written:** `/`, `surface.ts`, `session-facade.ts`, `zod-stub.ts`, `package.json`, `lib/index.js`, `empty/profiles`
- **派生的命令 / Commands spawned:** `node:child_process`, `git`, `-C`, `show`, `${tag}:${path}`, `utf8`, `grep`, `-l`, `--`, `npm`, `install`, `--no-audit` （另有 2 项） / (+2 more)
- **连接的域名 / Domains contacted:** `registry.npmjs.org`, `github.com`, `www.apache.org`, `www.npmjs.com`, `platform.deepseek.com`, `www.w3.org`, `registry.npmmirror.com`, `api.deepseek.com`, `file`, `git.example.com`, `models.dev`, `${join(repo` （另有 4 项） / (+4 more)
- **读取的环境变量 / Environment variables read:** `DSH_REPO`, `HOME`, `NODE_ENV`, `process.env (every variable)`

## 发现 / Findings

### 高 / HIGH (3)

- **高 / HIGH** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `scripts/diff-fold.ts:65` — `const { contextBreakdownProjectionDefinition } = await import(pathToFileURL(join(dir, 'breakdown-projection.ts')).href)`
  - `scripts/diff-fold.ts:66` — `const { isSurfaceEvent, deriveEventMessage } = await import(pathToFileURL(join(dir, 'surface.ts')).href)`
  - `src/client/globals.d.ts:8` — `declare function require(id: string): unknown`
  - `tests/compat/staging.ts:123` — `const plugin = await import(${JSON.stringify(pluginUrl)})`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.
- **高 / HIGH** `prompt.doc-instruction` — 文档中包含针对模型的指令 / Documentation contains instructions aimed at a model
  中 随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。
  EN A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.
  - `docs/compatibility.md:35` — `| System prompt | `request/header.header.system` | same as V0 | `system/message` surface node |`
  - `README.md:91` — `A six-color stacked bar against the model's full window (hatching = free headroom): system prompt, tool schemas, user messages, injected context, assistant repl…`
  - `README.md:110` — `Pick **Live (next request)** or any retained step, and browse what that request was assembled from: seven collapsible categories expand into one row per element…`
  中 修复：把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。
  EN Fix: Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.
- **高 / HIGH** `prompt.embedded-instruction-string` — 源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model
  中 源码中的字符串字面量——通常是工具描述或系统提示词片段——要求模型绕过确认或对用户隐瞒某些事，于是它作为一条指令进入上下文窗口。
  EN A string literal in the source — typically a tool description or system prompt fragment — tells the model to bypass confirmation or to hide something from the user, so it lands in the context window as a directive.
  - `src/client/i18n.ts:299` — `'System Prompt'`
  - `src/client/i18n.ts:480` — `'One band per item in the order the model reads the context — system prompt, tool schemas, then messages chronologically; hover for details, click to open its r…`
  - `src/client/i18n.ts:482` — `'The header content (System Prompt / Tool Schemas) of this step is outside retention'`
  - `src/client/i18n.ts:484` — `'This request header carried no system prompt'`
  - ……另有 21 处 / … and 21 more location(s)
  中 修复：如实描述工具的行为，删除那些会改变 agent 对待用户方式的指令。
  EN Fix: Describe the tool's behavior factually and remove directives that change how the agent treats the user.

### 中 / MEDIUM (3)

- **中 / MEDIUM** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `src/client/index.ts:148` — `{ name: 'shell.overlay', id: 'context-overview', order: 10, locale: NS },`
  - `tests/client/callSummary.spec.ts:72` — `assert.equal(callSummaryOf(conv({ call: { name: 'bash', argsRaw: '{oops' } })), null)`
  - `tests/client/callSummary.spec.ts:76` — `assert.equal(callSummaryOf(conv({ call: { name: 'edit', argsRaw: '{"file_path":"a.ts"}' } })), 'a.ts')`
  - `tests/client/callSummary.spec.ts:120` — `{ kind: 'tool-call', name: 'bash' },`
  - ……另有 96 处 / … and 96 more location(s)
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.
- **中 / MEDIUM** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 16 distinct remote hosts (api.deepseek.com, github.com, platform.deepseek.com, registry.npmjs.org, registry.npmmirror.com, www.apache.org, www.npmjs.com, www.w3.org, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `.github/workflows/release.yml:32` — `https://registry.npmjs.org`
  - `.github/workflows/release.yml:55` — `https://github.com/deepseek-ai/deepseek-harness.git`
  - `LICENSE:3` — `http://www.apache.org/licenses/`
  - `package.json:8` — `git+https://github.com/bowenliang123/dsh-context.git`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 5 shipped file(s) are 64 KiB or larger and were not read as text, the largest being docs/social-preview.png at 215 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `docs/social-preview.png` — `220547 bytes not decoded as text`
  - `pnpm-lock.yaml:2088` — `undici-types@8.3.0:`
  - `pnpm-lock.yaml:2091` — `undici@8.10.0:`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (3)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `src/client/fileActivity.ts:175` — `if (name === '.env' || name.startsWith('.env.')) return { glyph: '⚙️', tip: 'files.glyph.config' }`
  - `tests/client/components/fileCard.spec.ts:434` — `entry('/etc/hosts', { reads: 1, ops: [fileOp(4, 'read', 'read')] }),`
  - `tests/client/components/fileCard.spec.ts:465` — `const hosts = rowOf(m.container, '/etc/hosts')`
  - `tests/client/components/fileCard.spec.ts:496` — `await click(baseOf(rowOf(m.container, '/etc/hosts')))`
  - ……另有 8 处 / … and 8 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `tests/host/backfill.spec.ts:39` — `http://dsh.test${BACKFILL_ROUTE`
  - `tests/host/detail.spec.ts:70` — `http://dsh.test${DETAIL_ROUTE`
  - `tests/host/detail.spec.ts:81` — `http://dsh.test${DETAIL_ROUTE`
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **低 / LOW** `obf.dynamic-code-eval` — 执行运行时拼装出来的代码 / Evaluates code built at runtime
  中 该行执行的是一个并非源码字面量的表达式，真正运行的代码在插件运行时才被拼装出来，无法在 tarball 中审查。
  EN The line evaluates an expression that is not a source literal, so the executed code is assembled while the plugin runs and cannot be reviewed in the tarball.
  - `tests/compat/bundle.spec.ts:69` — `new Function(readFileSync(join(staging.REPO, 'lib', 'client.js'), 'utf8'))()`
  中 修复：用静态函数或数据表替代动态求值；任何审计都无法为运行时才存在的代码背书。
  EN Fix: Replace the dynamic evaluation with a static function or a data table; there is no audit that can vouch for code that does not exist until runtime.

_按类别 / By category:_ 混淆 / obfuscation 2 · 提示注入 / prompt injection 2 · 网络回调 / network callbacks 2 · 滥用宿主环境 / harness abuse 1 · 供应链 / supply chain 1 · 凭据读取 / credential access 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `dsh-context-HEAD/`
- skipped docs/context-dashboard.png: 578566 bytes exceeds the 524288-byte per-file cap
- not scanned (binary): docs/agent-network.png, docs/context-browser-images.png, docs/context-browser-tool-result.png, docs/context-browser-tools.png, docs/context-command-entry.png and 13 more
- outbound fetching was permitted for this audit
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
