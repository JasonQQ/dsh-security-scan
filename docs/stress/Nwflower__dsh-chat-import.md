> 批量压测 / Batch stress test · ★ 189 · `Nwflower/dsh-chat-import`
> https://github.com/Nwflower/dsh-chat-import · audited in 2.4s
# 安装前体检 / Pre-install audit: dsh-chat-import@0.18.4

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/Nwflower/dsh-chat-import/tar.gz/HEAD` (URL / url)
- 已分析文件：242 个（2.8 MiB） / Files analysed: 242 (2.8 MiB)
- 内容摘要 / Content digest: `a071ef0e9556bd0268a82134e5005066…`
- 体检时间 / Audited at: 2026-09-20T09:53:47.380Z

## 最严重的风险 / Most severe risk

**源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model** `prompt.embedded-instruction-string`

中 它夹带了写给 agent 而不是写给人看的文字——试图在你不察觉的情况下改变 agent 行为的指令。
EN It carries text aimed at the agent rather than at a person — instructions that try to change what the agent does without telling you.

该包会访问的目标：`127.0.0.1`、`www.w3.org`、`github.com`、`x`、`zcs-a` / Destinations this package reaches: `127.0.0.1`, `www.w3.org`, `github.com`, `x`, `zcs-a`

- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 它还安排了之后继续运行，所以仅仅卸载这个包并不够。
  EN It also arranges to run again later, so removing the package is not enough on its own.
- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `lib/client.js:297`；完整列表见下方「发现」。 / The rule that decided the grade fired at `lib/client.js:297`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

发布期钩子（维护者打包或发布时运行，安装时不会执行）： / Publish-time hooks (run when the maintainer packs or publishes, not on install):

- `prepack`: `npm run build`
- `prepublishOnly`: `npm test && git diff --quiet && git diff --cached --quiet && npm pack --dry-run`

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `package.json`, `package-lock.json`, `.test.mjs`, `node:fs/promises`, `imports.json`, `SKILL.md`, `reviewer/SKILL.md`, `pi-prompt-refactor/SKILL.md`, `search/SKILL.md`, `shared/SKILL.md`, `shared-opencode/SKILL.md`, `project-api/SKILL.md` （另有 15 项） / (+15 more)
- **写入的文件路径 / File paths written:** `node:fs/promises`, `\n`, `reviewer.md`, `agents/reviewer.md`, `refactor.md`, `prompts/refactor.md`, `search.md`, `skill/search.md`, `native.md`, `agents/native.md`, `shared.md`, `agents/shared.md` （另有 44 项） / (+44 more)
- **派生的命令 / Commands spawned:** `node:child_process`, `--check`, `utf8`, `git ls-files "*.md"`, `\n`, `git`, `ignore`, `pipe`, `-e`, `process.stdout.write("ready\\n"); setTimeout(() => {}, 5000)`, `ready\\n`
- **连接的域名 / Domains contacted:** `127.0.0.1`, `www.w3.org`, `github.com`, `x`, `zcs-a`
- **读取的环境变量 / Environment variables read:** `DSH_HOME`, `process.env (every variable)`, `DSH_IMPORT_CONTEXT_BRIDGE`, `CLINE_DATA_DIR`, `CLINE_DIR`, `CLINE_SESSION_DATA_DIR`, `CLINE_LEGACY_GLOBAL_STORAGE_DIR`, `CLINE_VSCODE_GLOBAL_STORAGE_DIR`, `APPDATA`, `XDG_CONFIG_HOME`, `LOCALAPPDATA`, `CONTINUE_GLOBAL_DIR` （另有 5 项） / (+5 more)

## 发现 / Findings

### 高 / HIGH (5)

- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `.github/workflows/ci.yml:98` — `DEEPSEEK_BASE_URL: http://127.0.0.1:8790`
  - `.github/workflows/ci.yml:104` — `curl -sf http://127.0.0.1:8790/models >/dev/null 2>&1 && break`
  - `.github/workflows/ci.yml:107` — `curl -sf http://127.0.0.1:8790/models >/dev/null 2>&1 || { echo "mock LLM failed to start:"; cat "${RUNNER_TEMP}/mock-llm.log"; exit 1; }`
  - `lib/client.js:403` — `reasonix: { svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"245 70 235 245\" width=\"100%\" height=\"100%\"><g fill=\"#0153e5\" transform=\"translate(…`
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **高 / HIGH** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `lib/tools.mjs:808` — `'Read-only health check for chat-import (registry readable, imported sessions exist, ' +`
  - `lib/tools.mjs:1518` — `'Guided un-import (read-only): drop an imported session from the imports registry and ' +`
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.
- **高 / HIGH** `persist.global-self-install` — 全局安装依赖包 / Installs a package globally
  中 该命令把包安装到全局前缀，于是用户的 PATH 上多出一个可执行文件，而且当前项目删除后它仍然留在那里。
  EN The command installs a package into the global prefix, which puts a new executable on the user's PATH and keeps it there after the current project is deleted.
  - `.github/workflows/ci.yml:70` — `npm i -g`
  - `.github/workflows/ci.yml:71` — `npm i -g`
  中 修复：改为本地安装，并通过项目自身的脚本调用该工具；全局安装应由用户自己决定，而不是由插件代劳。
  EN Fix: Install locally and invoke the tool through the project's own scripts; global installs belong to the user's decision, not to a plugin.
- **高 / HIGH** `prompt.doc-instruction` — 文档中包含针对模型的指令 / Documentation contains instructions aimed at a model
  中 随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。
  EN A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.
  - `docs/USAGE.md:227` — `- **Import system prompt (default on)** — keep the source session's system/developer prompt as a "context injection"; turn it off to keep only the environment-c…`
  - `README.md:106` — `| Import | Sidebar panel "Import" tab | Import conversations from other agents, preserving reasoning, tool call results, and system prompts (optional) |`
  中 修复：把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。
  EN Fix: Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.
- **高 / HIGH** `prompt.embedded-instruction-string` — 源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model
  中 源码中的字符串字面量——通常是工具描述或系统提示词片段——要求模型绕过确认或对用户隐瞒某些事，于是它作为一条指令进入上下文窗口。
  EN A string literal in the source — typically a tool description or system prompt fragment — tells the model to bypass confirmation or to hide something from the user, so it lands in the context window as a directive.
  - `lib/client.js:297` — `"Import system prompt"`
  - `lib/convert/core.mjs:74` — `'\n\n--- Original system prompt (for reference only) ---\n'`
  - `test/convert.test.mjs:842` — `'System prompt chat'`
  - `test/secrets-reporting.test.mjs:103` — `'","type":"permission","permissionMode":"bypassPermissions","toolName":"Bash"}'`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：如实描述工具的行为，删除那些会改变 agent 对待用户方式的指令。
  EN Fix: Describe the tool's behavior factually and remove directives that change how the agent treats the user.

### 中 / MEDIUM (4)

- **中 / MEDIUM** `install.hook-runs-shell-code` — 安装期钩子执行的不只是构建 / Lifecycle hook runs more than a build
  中 该钩子命令不属于常见的编译与拷贝步骤，安装这个包时会以用户权限运行任意代码，而这一切发生在任何人来得及检查之前。
  EN This hook command is not one of the usual compile-and-copy steps, so installing the package runs arbitrary code with the user's privileges before anything can be inspected.
  - `package.json:114` — `"prepublishOnly": "npm test && git diff --quiet && git diff --cached --quiet && npm pack --dry-run"`
  中 修复：把钩子收敛为 `tsc` 或 `npm run build` 之类的构建命令，或把这项工作移到一个由用户主动执行的显式脚本里。
  EN Fix: Reduce the hook to a build command such as `tsc` or `npm run build`, or move the work into an explicit script the user chooses to run.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `.github/workflows/ci.yml:98` — `http://127.0.0.1:8790`
  - `.github/workflows/ci.yml:104` — `http://127.0.0.1:8790/models`
  - `.github/workflows/ci.yml:107` — `http://127.0.0.1:8790/models`
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `obf.long-minified-line` — 整行是压缩或机器生成的数据块 / Line is a single minified or machine-generated blob
  中 该行超过 500 个字符且几乎没有空白，正是打包载荷、压缩字符串表或机器生成单行代码的样子。这样的一行用肉眼什么也审不出来。
  EN The line is over 500 characters with almost no whitespace, which is what a bundled payload, a packed string table or a machine-generated one-liner looks like. Nothing on such a line is reviewable by eye.
  - `lib/client.js:400` — `chatgpt: { svg: logoCard('<g fill="#000000"><path d="M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 …`
  - `lib/client.js:403` — `reasonix: { svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"245 70 235 245\" width=\"100%\" height=\"100%\"><g fill=\"#0153e5\" transform=\"translate(…`
  中 修复：发布未压缩的源码，或在 README 中说明该文件由哪个构建产出、可读源码在哪里。
  EN Fix: Ship unminified source, or state in the README which build produced the file and where the readable source lives.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 1 shipped file(s) are 64 KiB or larger and were not read as text, the largest being assets/dci-promo.png at 163 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `assets/dci-promo.png` — `166619 bytes not decoded as text`
  - `lib/client.js:864` — `fetch("/api-import/prefs", {`
  - `lib/client.js:882` — `fetch("/api-import/prefs", {`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (3)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `lib/mcp.mjs:68` — `env: cfg.env && typeof cfg.env === 'object' ? cfg.env : {},`
  - `lib/mcp.mjs:100` — `current.env[k.trim()] = unquote(rest.join('='))`
  - `lib/mcp.mjs:159` — `if (Object.keys(row.env || {}).length > 0) {`
  - `lib/mcp.mjs:161` — `for (const [k, v] of Object.entries(row.env)) {`
  - ……另有 6 处 / … and 6 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `test/convert.test.mjs:1977` — `toolCalls: [{ id: 'c1', name: 'read', arguments: '{}' }],`
  - `test/convert.test.mjs:2020` — `{ prompt: 'q1', steps: [{ content: [{ type: 'text', text: 'a1' }], toolCalls: [{ id: 'c1', name: 'read', arguments: '{}' }], toolResults: [{ toolCallId: 'c1', c…`
  - `test/convert.test.mjs:2021` — `{ prompt: 'q2', steps: [{ content: [{ type: 'text', text: 'a2' }], toolCalls: [{ id: 'c2', name: 'read', arguments: '{}' }, { id: 'c3', name: 'grep', arguments:…`
  - `test/dsh.test.mjs:44` — `{ type: 'tool/call', seq: 2, time: 1700000000000, data: { callId: 'c1', name: 'read', arguments: '{}' } },`
  - ……另有 18 处 / … and 18 more location(s)
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.
- **低 / LOW** `obf.decoded-payload-literal` — 携带解码、转义或高熵字面量 / Carries a decoded, escaped or high-entropy literal
  中 一个很长的字面量会在运行时被解码（base64、`atob`、`unescape`、`decodeURIComponent`），或者写满了密集的十六进制、Unicode 转义，或者呈现出编码数据块那种近乎均匀的字符分布。
  EN A long literal is decoded at runtime (base64, `atob`, `unescape`, `decodeURIComponent`), written with dense hex or unicode escapes, or has the near-uniform character distribution of an encoded blob.
  - `test/convert.test.mjs:570` — `'{"timestamp":"2026-05-18T13:21:30.751Z","type":"session_meta","payload":{"id":"019e3b3f-636d-7cb3-aaab-0255eb45ad4f","timestamp":"2026-05-18T13:21:10.510Z","cw…`
  - `test/openclaw.test.mjs:88` — `'{"type":"message","message":{"role":"assistant","content":[{"type":"text","text":"我来搜索"},{"type":"thinking","thinking":"先查本地"},{"type":"tool_use","id":"toolu_0…`
  中 修复：把该值保存为可读源码，或保存为格式有文档说明的数据，让审查者能看清实际运行的到底是什么。
  EN Fix: Store the value as readable source or as data with a documented format, so a reviewer can see what is actually being run.

_按类别 / By category:_ 混淆 / obfuscation 3 · 网络回调 / network callbacks 2 · 提示注入 / prompt injection 2 · 持久化 / persistence 1 · 安装脚本 / install scripts 1 · 供应链 / supply chain 1 · 凭据读取 / credential access 1 · 滥用宿主环境 / harness abuse 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `dsh-chat-import-HEAD/`
- skipped package-lock.json: 574930 bytes exceeds the 524288-byte per-file cap
- not scanned (binary, contents unreadable as text): assets/dci-promo.png, test/fixtures/session.jsonl.zstd
- outbound fetching was permitted for this audit
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
