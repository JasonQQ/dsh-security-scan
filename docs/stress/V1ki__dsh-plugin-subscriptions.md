> 批量压测 / Batch stress test · ★ 373 · `V1ki/dsh-plugin-subscriptions`
> https://github.com/V1ki/dsh-plugin-subscriptions · audited in 3.1s
# 安装前体检 / Pre-install audit: dsh-plugin-subscriptions@0.9.2

**信任评级 / Trust grade: D** (评分 / score 3/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/V1ki/dsh-plugin-subscriptions/tar.gz/HEAD` (URL / url)
- 已分析文件：124 个（2.9 MiB） / Files analysed: 124 (2.9 MiB)
- 内容摘要 / Content digest: `7914f9dfbaf27037ee332b1cc82c9286…`
- 体检时间 / Audited at: 2026-09-20T09:53:09.337Z

## 最严重的风险 / Most severe risk

**源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model** `prompt.embedded-instruction-string`

中 它夹带了写给 agent 而不是写给人看的文字——试图在你不察觉的情况下改变 agent 行为的指令。
EN It carries text aimed at the agent rather than at a person — instructions that try to change what the agent does without telling you.

该包会访问的目标：`github.com`、`api.githubcopilot.com`、`localhost`、`${spec.listen.host`、`api.openai.com`、`api.x.ai`、`accounts.google.com`、`oauth2.googleapis.com` / Destinations this package reaches: `github.com`, `api.githubcopilot.com`, `localhost`, `${spec.listen.host`, `api.openai.com`, `api.x.ai`, `accounts.google.com`, `oauth2.googleapis.com`

- 中 它发生在安装时：`prepare` 脚本会执行它，你不需要自己运行任何东西。
  EN It happens at install time: the `prepare` script runs it, so you do not have to run anything yourself.
- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `src/auth/rpc.ts:446`；完整列表见下方「发现」。 / The rule that decided the grade fired at `src/auth/rpc.ts:446`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

- `prepare` (`package.json`): `tsdown -c tsdown.prepare.config.ts`

发布期钩子（维护者打包或发布时运行，安装时不会执行）： / Publish-time hooks (run when the maintainer packs or publishes, not on install):

- `prepublishOnly`: `pnpm build && pnpm test`

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `node:fs/promises`, `node_modules/.pnpm`
- **写入的文件路径 / File paths written:** `node:fs/promises`, `.credentials.json`, `clip.mp4`, `auth.json`, `plugins/subscriptions/auth.json`
- **派生的命令 / Commands spawned:** `node:child_process`, `/usr/bin/security`, `find-generic-password`, `-s`, `-w`, `add-generic-password`, `-a`, `-U`
- **连接的域名 / Domains contacted:** `github.com`, `api.githubcopilot.com`, `localhost`, `${spec.listen.host`, `api.openai.com`, `api.x.ai`, `accounts.google.com`, `oauth2.googleapis.com`, `www.googleapis.com`, `daily-cloudcode-pa.googleapis.com`, `cloudcode-pa.googleapis.com`, `claude.ai` （另有 18 项） / (+18 more)
- **读取的环境变量 / Environment variables read:** `PROBE_BUDGET`, `PROBE_SESSION`, `PROBE_LIVE_MODELS`, `PROBE_EFFORT`, `PROBE_PHASE1_ONLY`, `CLAUDE_CONFIG_DIR`, `ANTIGRAVITY_CLIENT_ID`, `ANTIGRAVITY_CLIENT_SECRET`, `PLAYWRIGHT_PATH`, `NODE_ENV`, `PATH`, `DSH_HOME`

## 发现 / Findings

### 高 / HIGH (3)

- **高 / HIGH** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `scripts/verify-codex-session-cache.mjs:8` — `const { attributionHeaders } = await import(require.resolve('@deepseek-ai/dsh-llm'));`
  - `test/account-manager-browser.mjs:9` — `const { build } = await import(pathToFileURL(`${packagePath('rolldown')}/dist/index.mjs`))`
  - `test/account-manager-browser.mjs:10` — `const { chromium } = await import(pathToFileURL(`${process.env.PLAYWRIGHT_PATH}/index.mjs`))`
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.
- **高 / HIGH** `prompt.doc-instruction` — 文档中包含针对模型的指令 / Documentation contains instructions aimed at a model
  中 随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。
  EN A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.
  - `docs/issue68-verification.md:11` — `bypassed, including connection probes. Its explicit override uses its own`
  - `docs/issue68-verification.md:12` — ``ProxyAgent`. A MockAgent regression verifies the disabled/bypassed routes and`
  - `docs/issue68-verification.md:24` — `English/Chinese status, bypass, probe and save messages. "No plugin proxy"`
  - `README.md:84` — `In **Settings → Subscriptions → provider → Edit model list**, use **Refresh** to bypass the five-minute catalog cache and refresh the conversation model picker …`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。
  EN Fix: Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.
- **高 / HIGH** `prompt.embedded-instruction-string` — 源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model
  中 源码中的字符串字面量——通常是工具描述或系统提示词片段——要求模型绕过确认或对用户隐瞒某些事，于是它作为一条指令进入上下文窗口。
  EN A string literal in the source — typically a tool description or system prompt fragment — tells the model to bypass confirmation or to hide something from the user, so it lands in the context window as a directive.
  - `src/auth/rpc.ts:446` — `'payload.bypass must be an array of strings when present'`
  - `src/client/locales.ts:132` — `'Bypass hosts'`
  - `src/client/locales.ts:147` — `'On DSH v0.1.3-alpha.1, prefer the host HTTP_PROXY / HTTPS_PROXY / ALL_PROXY / NO_PROXY settings and leave this plugin proxy disabled. This optional override is…`
  - `src/client/SubscriptionsSection.tsx:1021` — `'proxyBypassPlaceholder'`
  - ……另有 7 处 / … and 7 more location(s)
  中 修复：如实描述工具的行为，删除那些会改变 agent 对待用户方式的指令。
  EN Fix: Describe the tool's behavior factually and remove directives that change how the agent treats the user.

### 中 / MEDIUM (5)

- **中 / MEDIUM** `cred.many-secret-env-vars` — 读取多个不同名称的密钥类环境变量 / Reads several differently-named secret environment variables
  中 这里的一行、或整个包里的若干行，读取了名称看起来像凭据的环境变量。只读一个文档中声明的 key 是插件本该有的认证方式；枚举多个不同名称的密钥，则是在收集凭据而不是在使用凭据。
  EN One line here, or several across the package, read environment variables whose names look like credentials. Reading a single documented key is how a plugin is meant to authenticate; enumerating many differently-named ones is how credentials are gathered rather than used.
  - `src/providers/antigravity.ts:96` — `process.env.ANTIGRAVITY_CLIENT_SECRET`
  - `test/antigravity.spec.ts:634` — `process.env.ANTIGRAVITY_CLIENT_SECRET`
  - `test/antigravity.spec.ts:637` — `process.env.ANTIGRAVITY_CLIENT_SECRET`
  - `test/antigravity.spec.ts:645` — `process.env.ANTIGRAVITY_CLIENT_SECRET`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：只保留插件确实需要且有文档说明的变量，删掉与任何功能无关的密钥读取。
  EN Fix: Keep to the variables this plugin documents and needs, and delete reads of keys it has no feature for.
- **中 / MEDIUM** `install.hook-runs-shell-code` — 安装期钩子执行的不只是构建 / Lifecycle hook runs more than a build
  中 该钩子命令不属于常见的编译与拷贝步骤，安装这个包时会以用户权限运行任意代码，而这一切发生在任何人来得及检查之前。
  EN This hook command is not one of the usual compile-and-copy steps, so installing the package runs arbitrary code with the user's privileges before anything can be inspected.
  - `package.json:56` — `"prepare": "tsdown -c tsdown.prepare.config.ts",`
  - `package.json:57` — `"prepublishOnly": "pnpm build && pnpm test"`
  中 修复：把钩子收敛为 `tsc` 或 `npm run build` 之类的构建命令，或把这项工作移到一个由用户主动执行的显式脚本里。
  EN Fix: Reduce the hook to a build command such as `tsc` or `npm run build`, or move the work into an explicit script the user chooses to run.
- **中 / MEDIUM** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 28 distinct remote hosts (${spec.listen.host, accounts.google.com, api.githubcopilot.com, api.openai.com, api.x.ai, github.com, oauth2.googleapis.com, www.googleapis.com, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `package.json:8` — `git+https://github.com/V1ki/dsh-plugin-subscriptions.git`
  - `scripts/manual/real-copilot-replay-probe.mjs:98` — `https://api.githubcopilot.com/`
  - `src/auth/oauth-flow.ts:252` — `http://${spec.listen.host`
  - `src/auth/store.ts:156` — `https://api.openai.com/auth`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `src/auth/oauth-flow.ts:252` — `http://${spec.listen.host`
  - `test/fake-connection.ts:46` — `http://127.0.0.1${path`
  - `test/proxy-host.spec.ts:22` — `http://127.0.0.1:1`
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 9 shipped file(s) are 64 KiB or larger and were not read as text, the largest being docs/images/subscriptions.png at 276 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `docs/images/subscriptions.png` — `282854 bytes not decoded as text`
  - `package.json:91` — `"undici": "^7.0.0"`
  - `pnpm-lock.yaml:11` — `undici:`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (4)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `src/index.ts:761` — `session.keychainBound === true ? refreshClaudeSynced(session, refreshClaude) : refreshClaude(session),`
  - `src/index.ts:1170` — `if (session.keychainBound !== true) continue`
  - `src/providers/antigravity.ts:103` — `return { clientId: environmentId, ...environmentSecret ? { clientSecret: environmentSecret } : {} }`
  - `src/providers/claude.ts:234` — `...profile,`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `test/antigravity.spec.ts:79` — `name: 'bash',`
  - `test/antigravity.spec.ts:187` — `{ type: 'tool-call', id: ToolCallId('call-1'), name: 'bash', arguments: '{"cmd":"ls"}' },`
  - `test/antigravity.spec.ts:218` — `{ functionCall: { id: 'call-7', name: 'bash', args: { cmd: 'pwd' } }, thoughtSignature: 'sig-2' },`
  - `test/chat-completions.spec.ts:70` — `tool_calls: [{ id: 'call-1', type: 'function', function: { name: 'bash', arguments: '{"cmd":"ls"}' } }],`
  - ……另有 19 处 / … and 19 more location(s)
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.
- **低 / LOW** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `test/fake-connection.ts:46` — `const request = new Request(`http://127.0.0.1${path}`, {`
  - `test/proxy-host.spec.ts:22` — `await proxySetConfig({ enabled: bypass, url: 'http://127.0.0.1:1', bypass: ['subscriptions.example'] })`
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **低 / LOW** `supply.build-script-excluded-from-package` — 安装钩子运行的脚本被发布文件集排除在外 / Install hook runs a script the published file set excludes
  中 清单声明的安装钩子所引用的脚本没有被 `files` 白名单包含，或被 `.npmignore` 匹配排除。这样一来，从仓库安装时运行的文件与被审计和测试过的并不是同一个，甚至根本不存在。
  EN The prepare hook runs tsdown.prepare.config.ts, but the files allowlist (lib, cordis.patch.yml) does not cover tsdown.prepare.config.ts. The published tarball therefore behaves differently from this source tree.
  - `package.json:56` — `"prepare": "tsdown -c tsdown.prepare.config.ts",`
  中 修复：把被引用的脚本加入 `files`，或把钩子移到会被发布的文件里。
  EN Fix: Add the referenced script to `files`, or move the hook into a file that is published.

_按类别 / By category:_ 网络回调 / network callbacks 3 · 提示注入 / prompt injection 2 · 凭据读取 / credential access 2 · 供应链 / supply chain 2 · 混淆 / obfuscation 1 · 安装脚本 / install scripts 1 · 滥用宿主环境 / harness abuse 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `dsh-plugin-subscriptions-HEAD/`
- skipped docs/images/video-generate-inline.png: 607953 bytes exceeds the 524288-byte per-file cap
- not scanned (binary): docs/images/image-generate-inline.png, docs/images/image-generate-providers.png, docs/images/model-effort.png, docs/images/model-picker.png, docs/images/model-settings.png and 4 more
- outbound fetching was permitted for this audit
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
