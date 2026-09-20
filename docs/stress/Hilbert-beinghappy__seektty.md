> 批量压测 / Batch stress test · ★ 198 · `Hilbert-beinghappy/seektty`
> https://github.com/Hilbert-beinghappy/seektty · audited in 6.9s
# 安装前体检 / Pre-install audit: seektty@1.2.5

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/Hilbert-beinghappy/seektty/tar.gz/HEAD` (URL / url)
- 已分析文件：890 个（6.8 MiB） / Files analysed: 890 (6.8 MiB)
- 内容摘要 / Content digest: `e3315285005328d9b38de044b9e16f21…`
- 体检时间 / Audited at: 2026-09-20T09:53:43.940Z

## 最严重的风险 / Most severe risk

**凭据读取、解码步骤与对外请求同时出现 / Credential read, decoding step and outbound request together** `exfil.credential-read-decode-callback`

中 数据会离开这台机器。该包中有代码把本机上的内容发往外部地址。
EN Data leaves this machine. Something in this package takes content that lives here and sends it to a destination outside it.

该包会访问的目标：`registry.npmjs.org`、`github.com`、`img.shields.io`、`127.0.0.1:${port`、`127.0.0.1:${server.address(`、`raw.githubusercontent.com`、`example.com`、`example` / Destinations this package reaches: `registry.npmjs.org`, `github.com`, `img.shields.io`, `127.0.0.1:${port`, `127.0.0.1:${server.address(`, `raw.githubusercontent.com`, `example.com`, `example`

- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 它还安排了之后继续运行，所以仅仅卸载这个包并不够。
  EN It also arranges to run again later, so removing the package is not enough on its own.
- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `scripts/native-management-acceptance.mjs:173`；完整列表见下方「发现」。 / The rule that decided the grade fired at `scripts/native-management-acceptance.mjs:173`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `package.json`, `settings.yaml`, `../package.json`, `native-tool-output.txt`, `resumed.md`, `faults.zip`, `interaction.patch.yml`, `native-image-limits.json`, `\n`, `profiles/package.json`, `.credentials.yaml`, `profiles/management-new/node_modules/seektty/cordis.patch.yml` （另有 59 项） / (+59 more)
- **写入的文件路径 / File paths written:** `report.json`, `\n`, `install.log`, `requests.jsonl`, `tool-results.jsonl`, `settings.yaml`, `approval-fixture.mjs`, `approval-fixture.patch.yml`, `tiny.png`, `native-events.jsonl`, `.jsonl`, `not-image.txt` （另有 46 项） / (+46 more)
- **派生的命令 / Commands spawned:** `cross-spawn`, `node:child_process`, `7.0.6`, `@types/cross-spawn`, `6.0.6`, `@types/cross-spawn@6.0.6`, `--profile`, `tui`, `xterm-256color`, `python3`, `--resume`, `.artifacts/native-probe/native-tail-probe.js` （另有 32 项） / (+32 more)
- **连接的域名 / Domains contacted:** `registry.npmjs.org`, `github.com`, `img.shields.io`, `127.0.0.1:${port`, `127.0.0.1:${server.address(`, `raw.githubusercontent.com`, `example.com`, `example`, `api.example.com`, `example.test`, `user:se`, `host` （另有 20 项） / (+20 more)
- **读取的环境变量 / Environment variables read:** `DSH_TOOLS_MODE`, `process.env (every variable)`, `DSH_HOME`, `CLARIFY_SPEC`, `SEEKTTY_TEST_TMUX`, `SEEKTTY_NODE_PTY`, `SEEKTTY_QA_UNICODE_ADDON`, `SEEKTTY_MOUSE_PTY`, `SEEKTTY_MOUSE_PTY_CYCLES`, `DSH_BIN`, `SEEKTTY_SPEC`, `ComSpec` （另有 31 项） / (+31 more)

## 发现 / Findings

### 严重 / CRITICAL (4)

- **严重 / CRITICAL** `cred.read-dsh-credentials` — 读取 DSH 凭据或会话存储 / Reads DSH credentials or session storage
  中 该行读取了 `~/.dsh`，其中存放着宿主的 API 凭据、profile、已保存的会话和插件状态。读取宿主自己的密钥库，等于把用户的模型凭据和对话历史交给插件。
  EN This line reads `~/.dsh`, which holds the harness API credentials, profiles, stored sessions and plugin state. Reading the harness's own secret store hands the plugin the user's model credentials and conversation history.
  - `scripts/native-management-acceptance.mjs:173` — `const credentials = () => load(readFileSync(join(home, '.credentials.yaml'), 'utf8'))`
  中 修复：删除这次读取。插件应通过 DSH 的配置接口获得配置，绝不打开凭据文件。
  EN Fix: Remove the read. A plugin should receive configuration through the DSH config surface, never by opening the credentials file.
- **严重 / CRITICAL** `exfil.credential-read-decode-callback` — 凭据读取、解码步骤与对外请求同时出现 / Credential read, decoding step and outbound request together
  中 编码外传的三个要素全部齐备：读取了凭据，有解码或编码动作，并且有请求离开本机。编码这一步的作用，正是让随便看一眼流量的人看不出其中的密钥。
  EN All three ingredients of an encoded exfiltration are present: a credential is read, something is decoded or encoded, and a request leaves the machine. The encoding step is what hides the secret from a casual look at the traffic.
  - `scripts/native-management-acceptance.mjs:173` — `const credentials = () => load(readFileSync(join(home, '.credentials.yaml'), 'utf8'))`
  - `lib/plugin-marketplace-ChUthu4I.js:167` — `const type = String.fromCharCode(header[156] ?? 0);`
  - `scripts/native-dsh-acceptance.mjs:284` — `const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC', 'base64')`
  - `lib/in-process.js:109` — `get fetch() {`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：删除凭据读取或对外调用。绝不要发布既接触密钥、又在向外发送途中编码载荷的包。
  EN Fix: Remove the credential read or the outbound call. Never ship a package that both touches secrets and encodes a payload on its way out.
- **严重 / CRITICAL** `exfil.credential-read-then-callback` — 同一个包内既有凭据文件读取又有对外请求 / Credential file read and an outbound request in the same package
  中 既读取凭据文件又发起对外请求的包，已经凑齐了窃取凭据的两半。单独看每一半都能找到理由，合在一起就只能解释为数据被送出本机。
  EN A package that reads a credential file and also makes outbound requests has the two halves of credential theft. Individually each half can be justified; together they only make sense as data leaving the machine.
  - `scripts/native-management-acceptance.mjs:173` — `const credentials = () => load(readFileSync(join(home, '.credentials.yaml'), 'utf8'))`
  - `lib/in-process.js:109` — `get fetch() {`
  - `lib/in-process.js:132` — `return route === void 0 ? new Response("Not found", { status: 404 }) : route.fetch(request);`
  - `lib/locale-Bf-LPk7P.js:1032` — `replace: (events, requests, tools) => `${events} event node(s) · ${requests} request(s) · ${tools} running tool(s)``
  中 修复：删除凭据读取。如果对外调用才是真正的功能，那么包内任何地方都不应在它之前读取密钥文件。
  EN Fix: Remove the credential read. If the outbound call is the real feature, it must not be preceded by a read of a secret file anywhere in the package.
- **严重 / CRITICAL** `net.exfil-service-host` — 连接已知的数据外传或隧道服务 / Contacts a known exfiltration or tunnelling service
  中 该行出现了请求捕获、粘贴板或隧道服务的主机名，这些服务存在的意义就是接收来自别处的数据。它们被用于投放和命令控制回调，而不是实现插件自身的功能。
  EN The line names a request-capture, paste or tunnel host that exists to receive data from somewhere else. These services are used for drop-off and for command-and-control callbacks, not for shipping a plugin's own features.
  - `src/client/status-priority.ts:112` — `: { toast: { message: translateUiText(this.toast.message), tone: this.toast.tone } }),`
  - `src/client/surface.ts:928` — `: { notice: noticeText(noticeView.toast.message, noticeView.toast.tone) }),`
  - `tests/startup-notice-collision.test.ts:19` — `...(view.toast === undefined ? {} : { notice: view.toast.message }),`
  - `tests/status-priority.test.ts:15` — `...(view.toast === undefined ? {} : { notice: view.toast.message }),`
  中 修复：删除该端点。如果它只是开发时的占位符，就删掉它，不要让它在已发布的包里仍然可达。
  EN Fix: Remove the endpoint. If it is a placeholder from development, delete it rather than leave it reachable in the published package.

### 高 / HIGH (10)

- **高 / HIGH** `cred.credential-read-with-command-execution` — 同一个包内既有凭据文件读取又有 shell 执行 / Credential file read and shell execution in the same package
  中 这个包里某处读取了凭据文件，另一处又启动了进程。仅这一组合就足以把密钥管道给命令、通过 CLI 把它外传，或用窃取到的材料改写本机配置。
  EN A credential file is read somewhere in this package and a process is spawned somewhere else. That pairing is enough to pipe a secret into a command, exfiltrate it through a CLI, or rewrite the machine's configuration from stolen material.
  - `scripts/native-management-acceptance.mjs:173` — `const credentials = () => load(readFileSync(join(home, '.credentials.yaml'), 'utf8'))`
  - `lib/bin.js:9` — `import crossSpawn from "cross-spawn";`
  - `lib/bin.js:254` — `spawnSync: (command, args, options) => crossSpawn.sync(command, [...args], options),`
  - `lib/bin.js:306` — `const result = internals.spawnSync(command, [...args], DSH_SPAWN_OPTIONS);`
  中 修复：删除凭据读取，并把进程启动限制在完全不会接触到密钥值的命令上。
  EN Fix: Remove the credential access, and keep process spawning limited to commands that never see secret values.
- **高 / HIGH** `exfil.clipboard-read-then-callback` — 同一个包内既有剪贴板读取又有对外请求 / Clipboard read and an outbound request in the same package
  中 该包读取系统剪贴板，同时发起对外请求。剪贴板里有刚刚复制过的密码和令牌，而这个包里没有任何东西能解释这两种行为为何同时存在。
  EN The package reads the system clipboard and also makes outbound requests. Clipboards hold passwords and tokens that were copied moments earlier, and nothing in this package explains why the two behaviors coexist.
  - `src/client/clipboard-image.ts:83` — `wl-paste`
  - `src/client/clipboard-image.ts:84` — `xclip`
  - `lib/in-process.js:109` — `get fetch() {`
  - `lib/in-process.js:132` — `return route === void 0 ? new Response("Not found", { status: 404 }) : route.fetch(request);`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：删除剪贴板读取，或让目标地址默认不可达，并向用户说明。
  EN Fix: Remove the clipboard read, or make the destination unreachable by default and documented for the user.
- **高 / HIGH** `net.covert-channel` — 通过 websocket 或 DNS 查询回连 / Beacons over a websocket or DNS lookup
  中 该行打开了 websocket，或通过 `dns.*` 或 DNS 工具解析某个域名。两者都能在不像是 HTTP 请求的情况下传递数据，而 DNS 尤其通常被所有防火墙和代理放行。
  EN The line opens a websocket or resolves a literal domain through `dns.*` or a DNS tool. Both carry data without looking like an HTTP request, and DNS in particular is normally permitted through every firewall and proxy.
  - `vendor/client-connection/client/web-api-client.js:12` — `return this.readWebSocket(MUX_EVENTS_PATH, signal, muxFrameSchema, onOpen);`
  - `vendor/client-connection/client/web-api-client.js:15` — `return this.readWebSocket(HOST_EVENTS_PATH, signal, hostFrameSchema, onOpen);`
  - `vendor/client-connection/index.js:139` — `const downlinks = new WebSocketDownlinks(apiCtx.apiProxy);`
  中 修复：改用发往文档中说明的端点的普通 HTTPS 请求，让流量可以被检查和记录。
  EN Fix: Use ordinary HTTPS requests to a documented endpoint so that the traffic can be inspected and logged.
- **高 / HIGH** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 30 distinct remote hosts (127.0.0.1:${port, 127.0.0.1:${server.address(, example, example.com, github.com, img.shields.io, raw.githubusercontent.com, registry.npmjs.org, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `lib/bin.js:11` — `https://registry.npmjs.org/-/package/@deepseek-ai/dsh/dist-tags`
  - `package.json:17` — `git+https://github.com/Hilbert-beinghappy/seektty.git`
  - `package.json:23` — `https://registry.npmjs.org/`
  - `scripts/bump-readme.mjs:13` — `https://img.shields.io/badge/DeepSeek%20Harness-${badgeFrom`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `scripts/native-dsh-acceptance.mjs:205` — `report.modelEndpoint = `http://127.0.0.1:${port}/v1``
  - `scripts/native-dsh-acceptance.mjs:206` — `writeFileSync(join(home, 'settings.yaml'), `llm-deepseek:\n apiKeyEnv: SEEKTTY_NATIVE_FIXTURE_KEY\n baseURL: http://127.0.0.1:${port}/v1\n retryPolicy:\n mode: …`
  - `scripts/native-dsh-acceptance.mjs:206` — `settings.yamlllm-deepseek:\n apiKeyEnv: SEEKTTY_NATIVE_FIXTURE_KEY\n baseURL: http://127.0.0.1:${port}/v1\n retryPolicy:\n mode: normal\n maxRetries: 0\n`
  - `scripts/native-dsh-fault-acceptance.mjs:194` — `report.modelEndpoint = `http://127.0.0.1:${server.address().port}/v1``
  - ……另有 7 处 / … and 7 more location(s)
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **高 / HIGH** `obf.decoded-payload-literal` — 携带解码、转义或高熵字面量 / Carries a decoded, escaped or high-entropy literal
  中 一个很长的字面量会在运行时被解码（base64、`atob`、`unescape`、`decodeURIComponent`），或者写满了密集的十六进制、Unicode 转义，或者呈现出编码数据块那种近乎均匀的字符分布。
  EN A long literal is decoded at runtime (base64, `atob`, `unescape`, `decodeURIComponent`), written with dense hex or unicode escapes, or has the near-uniform character distribution of an encoded blob.
  - `scripts/native-dsh-acceptance.mjs:284` — `const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC', 'base64')`
  - `scripts/native-interaction-qa.mjs:18` — `const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC', 'base64')`
  - `src/client/clipboard.ts:269` — `if (/\u0000|\u001B|[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/u.test(decoded)) {`
  - `tests/sanitizer-parity.test.ts:8` — `const fragments = ['text', '中👩‍💻é', '\t\n', '\r\b', '\u001b[31m', '\u001b[38:2::1:2:3m', '\u001b[2J', '\u001b]8;;https://example.test\u0007', '\u001b]52;c;pa…`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：把该值保存为可读源码，或保存为格式有文档说明的数据，让审查者能看清实际运行的到底是什么。
  EN Fix: Store the value as readable source or as data with a documented format, so a reviewer can see what is actually being run.
- **高 / HIGH** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `scripts/foreground-pty-acceptance.mjs:45` — `const { spawn } = await import(process.env.SEEKTTY_NODE_PTY?.trim() || 'node-pty')`
  - `tests/clarify-doctor-acceptance.test.ts:101` — `const installed = await import(pathToFileURL(installedEntry).href)`
  - `tests/tui-performance-probe.test.ts:28` — `writeFileSync(scriptPath, `const { TuiPerformanceProbe } = await import(${JSON.stringify(pathToFileURL(modulePath).href)})`
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.
- **高 / HIGH** `prompt.doc-instruction` — 文档中包含针对模型的指令 / Documentation contains instructions aimed at a model
  中 随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。
  EN A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.
  - `docs/context-aware-menus-acceptance.md:42` — `- dangerous actions close the menu before opening the existing confirmation page and cannot bypass its keyboard confirmation;`
  - `docs/pnpm11-layout-acceptance.md:14` — `SeekTTY adds `--config.enable-global-virtual-store=false` to package-tree mutations that it owns. It does not change global pnpm configuration, set `NODE_PATH`,…`
  - `docs/release-v1.2.5.md:54` — `- SeekTTY does not change global pnpm configuration, set `NODE_PATH`, copy Host packages, install a second Host graph, or bypass native `dsh plugin` reconciliat…`
  - `README.md:103` — `- Launcher provisioning, compatible updates, and TUI plugin mutations disable pnpm 11 Global Virtual Store per command. Known `store/v11/links` loader failures …`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。
  EN Fix: Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.
- **高 / HIGH** `prompt.embedded-instruction-string` — 源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model
  中 源码中的字符串字面量——通常是工具描述或系统提示词片段——要求模型绕过确认或对用户隐瞒某些事，于是它作为一条指令进入上下文窗口。
  EN A string literal in the source — typically a tool description or system prompt fragment — tells the model to bypass confirmation or to hide something from the user, so it lands in the context window as a directive.
  - `tests/native-tail-terminal.test.ts:89` — `'uses the real patched TUI component/overlay pipeline and bypasses retained row diff only for the candidate'`
  - `tests/settings-describe.test.ts:59` — `'reloads when the Host revision fingerprint changes or bypass is requested'`
  - `vendor/ui-conversation/client/locales.js:216` — `'System prompt'`
  - `vendor/ui-trajectory/client/layout.js:634` — `'Initial System Prompt'`
  - ……另有 5 处 / … and 5 more location(s)
  中 修复：如实描述工具的行为，删除那些会改变 agent 对待用户方式的指令。
  EN Fix: Describe the tool's behavior factually and remove directives that change how the agent treats the user.
- **高 / HIGH** `supply.typosquat-name` — 依赖名与热门包高度形近 / Dependency name is a near-miss of a popular package
  中 该依赖名是已知的仿冒包，或与某个热门包只差一个字母或一处字符顺序，安装它极可能拉进作者从未打算依赖的包。
  EN The dependency name is a known impostor, or differs from a popular package by a single typo or transposition, so installing it most likely pulls a package the author never intended to depend on.
  - `package.json:44` — `"deepseek": "./lib/bin.js"`
  中 修复：对照你本意要安装的包核对其拼写，并把该条目改成真正的包名。
  EN Fix: Check the spelling against the package you meant to install and replace the entry with the real name.

### 中 / MEDIUM (7)

- **中 / MEDIUM** `exfil.clipboard-read` — 读取系统剪贴板 / Reads the system clipboard
  中 该行通过 `pbpaste`、`xclip`、`wl-paste`、`Get-Clipboard` 或 `clipboardy` 读取剪贴板。剪贴板里经常放着刚刚复制过的密码、令牌和私密文本。
  EN The line reads the clipboard through `pbpaste`, `xclip`, `wl-paste`, `Get-Clipboard` or `clipboardy`. Clipboards routinely hold passwords, tokens and private text that were copied moments earlier.
  - `src/client/clipboard-image.ts:83` — `wl-paste`
  - `src/client/clipboard-image.ts:84` — `xclip`
  - `src/client/clipboard.ts:15` — `xclip`
  - `src/client/clipboard.ts:85` — `xclip`
  - ……另有 14 处 / … and 14 more location(s)
  中 修复：通过插件配置向用户索取该值，而不是读取剪贴板上恰好存在的内容。
  EN Fix: Ask the user for the value through the plugin config instead of reading whatever happens to be on the clipboard.
- **中 / MEDIUM** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `scripts/native-dsh-acceptance.mjs:98` — `if (userText.includes('write tool fixture')) tool = { name: 'write', arguments: { file_path: 'native-tool-output.txt', content: 'NATIVE_TOOL_FILE_CONTENT\n' } }`
  - `scripts/native-dsh-acceptance.mjs:101` — `if (userText.includes('subagent tool fixture')) tool = { name: 'subagent', arguments: { description: 'Fixture child reply', prompt: 'Return LOCAL_CHILD_FIXTURE …`
  - `scripts/native-dsh-fault-acceptance.mjs:98` — `emit({ tool_calls: [{ index: 0, id: `fault-call-${n}`, type: 'function', function: { name: 'read', arguments: scenario === 'toolerror' ? JSON.stringify({ file_p…`
  - `tests/actions-interaction.test.ts:296` — `toolName: 'shell',`
  - ……另有 25 处 / … and 25 more location(s)
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `scripts/native-dsh-acceptance.mjs:205` — `http://127.0.0.1:${port`
  - `scripts/native-dsh-acceptance.mjs:206` — `http://127.0.0.1:${port`
  - `scripts/native-dsh-fault-acceptance.mjs:194` — `http://127.0.0.1:${server.address(`
  - `scripts/native-interaction-qa.mjs:128` — `http://127.0.0.1:${server.address(`
  - ……另有 5 处 / … and 5 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `obf.long-minified-line` — 整行是压缩或机器生成的数据块 / Line is a single minified or machine-generated blob
  中 该行超过 500 个字符且几乎没有空白，正是打包载荷、压缩字符串表或机器生成单行代码的样子。这样的一行用肉眼什么也审不出来。
  EN The line is over 500 characters with almost no whitespace, which is what a bundled payload, a packed string table or a machine-generated one-liner looks like. Nothing on such a line is reviewable by eye.
  - `scripts/native-state-qa.mjs:325` — `const source = `import assert from 'node:assert/strict';\nimport {join} from 'node:path';\nimport {readFileSync,writeFileSync,mkdirSync} from 'node:fs';\nimport…`
  - `vendor/api-remotes/client/index.d.ts:22` — `export type { ClientResponse, ConfigurableProviderView, ConnectionHandle, ConnectionSinks, ContentBlock, CredentialView, DirectoryListing, DiscoveredModelView, …`
  - `vendor/api-remotes/client/index.d.ts:25` — `export type { ApprovalRequestId, CordisHalfState, CordisDynamicPackageId, CordisDynamicPluginId, CordisDynamicPluginRunId, CordisDynamicRunMode, CordisInspectMe…`
  - `vendor/client-connection/client/api.d.ts:1` — `export type { ApiProxy, SessionsApi, SessionSearchItem, SessionSummary, PromptContentPart, HostApi, EventsApi, MuxFrame, HostFrame, ApprovalResponsePayload, Que…`
  - ……另有 7 处 / … and 7 more location(s)
  中 修复：发布未压缩的源码，或在 README 中说明该文件由哪个构建产出、可读源码在哪里。
  EN Fix: Ship unminified source, or state in the README which build produced the file and where the readable source lives.
- **中 / MEDIUM** `persist.shell-rc-append` — 追加写入 shell 启动文件 / Appends to a shell startup file
  中 该行写入了 `.bashrc`、`.zshrc`、`.profile` 或 fish 配置，因此改动会在之后每个交互式 shell 中生效，而且删掉包目录也不会消失。
  EN The line writes into `.bashrc`, `.zshrc`, `.profile` or a fish config, so the change takes effect in every future interactive shell and survives removing the package directory.
  - `lib/startup-D5J5NScn.js:596` — `return [...names].map((name$1) => this.profileSummary(name$1)).sort((left, right) => left.name.localeCompare(right.name));`
  - `lib/startup-D5J5NScn.js:831` — `if (typeof row.profile !== "string" || typeof row.cwd !== "string" || !Array.isArray(row.attachmentPaths) || !row.attachmentPaths.every((path) => typeof path ==…`
  - `src/client/actions.ts:629` — `if (!profiles.some(candidate => candidate.name === target.profile)) throw new Error(ui('该 Profile 已不可用，请重新打开菜单', 'This Profile is no longer available; reopen th…`
  - `src/host/profile-plugin-manager.ts:535` — `.map(name => this.profileSummary(name))`
  中 修复：不要修改 shell 启动文件；如果需要 shell 集成，就把那行内容打印出来，由用户自行决定是否添加。
  EN Fix: Do not modify shell startup files; if a shell integration is required, print the line for the user to add deliberately.
- **中 / MEDIUM** `prompt.concealed-instruction` — 把文本藏在注释或不可见字符中 / Hides text in a comment or invisible characters
  中 该行把内容藏在 HTML 注释里，或藏在零宽字符与双向控制字符之后，这些内容在 diff 或渲染后的文档中什么都看不见，却仍会作为文本被读取。
  EN The line conceals content either in an HTML comment or behind zero-width and bidirectional control characters, which render as nothing in a diff or a rendered document while still being read as text.
  - `scripts/native-dsh-fault-acceptance.mjs:279` — `['unicode', 'QA[unicode] 中文 👩🏽‍💻 café e\u0301 αβ العربية 🇨🇳'],`
  - `scripts/native-dsh-fault-acceptance.mjs:279` — `unicodeQA[unicode] 中文 👩🏽‍💻 café e\u0301 αβ العربية 🇨🇳`
  - `tests/canvas-line-cache.test.ts:15` — `const lines = ['', 'abc', '中文👩‍💻é', '\u001b[31mred\u001b[0m', '\u001b]8;;https://example.test\u0007link\u001b]8;;\u0007']`
  - `tests/canvas-line-cache.test.ts:15` — `abc中文👩‍💻é\u001b[31mred\u001b[0m\u001b]8;;https://example.test\u0007link\u001b]8;;\u0007`
  - ……另有 15 处 / … and 15 more location(s)
  中 修复：删除被隐藏的文本和不可见字符；审查者看不到的东西就不该出现在发布的包里。
  EN Fix: Delete the concealed text and the invisible characters; anything a reviewer cannot see does not belong in a shipped package.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 4 shipped file(s) are 64 KiB or larger and were not read as text, the largest being assets/seektty-code-dark.png at 152 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `assets/seektty-code-dark.png` — `155968 bytes not decoded as text`
  - `lib/in-process.js:109` — `get fetch() {`
  - `lib/in-process.js:132` — `return route === void 0 ? new Response("Not found", { status: 404 }) : route.fetch(request);`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (5)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `lib/bin.js:247` — `...environment`
  - `lib/locale-Bf-LPk7P.js:503` — `["顺序直接对应 dsh.profile.bundles；不会增删 Bundle", "Order maps directly to dsh.profile.bundles; no Bundle is added or removed"],`
  - `lib/locale-Bf-LPk7P.js:503` — `顺序直接对应 dsh.profile.bundles；不会增删 BundleOrder maps directly to dsh.profile.bundles; no Bundle is added or removed`
  - `lib/locale-Bf-LPk7P.js:1299` — `...env.LANGUAGE?.split(":") ?? [],`
  - ……另有 69 处 / … and 69 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `net.token-or-blob-in-url` — 把凭据或编码数据块放进 URL / Puts a credential or encoded blob in a URL
  中 令牌形状的查询参数、内嵌的 `user:password` 授权部分，或超长高熵的查询值，都意味着密钥或载荷数据在 URL 中传输，最终会留在访问日志、代理和浏览器历史里。
  EN A token-shaped query parameter, an embedded `user:password` authority, or a long high-entropy query value means secret material or payload data travels in a URL, where it lands in access logs, proxies and browser history.
  - `tests/catalog-sources.test.ts:28` — `'https://«redacted»@example.com/catalog.json'`
  - `tests/pnpm-compat.test.ts:94` — `'https://«redacted»@example.com/seektty.tgz?token=top-secret&channel=stable'`
  - `tests/provider-config.test.ts:183` — `'https://«redacted»@example.invalid/v1'`
  中 修复：凭据放在 Authorization 头里发送，载荷用 POST 放在请求体中，不要编码进查询字符串。
  EN Fix: Send credentials in an Authorization header, and POST payloads in the body rather than encoding them into the query string.
- **低 / LOW** `persist.global-self-install` — 全局安装依赖包 / Installs a package globally
  中 该命令把包安装到全局前缀，于是用户的 PATH 上多出一个可执行文件，而且当前项目删除后它仍然留在那里。
  EN The command installs a package into the global prefix, which puts a new executable on the user's PATH and keeps it there after the current project is deleted.
  - `tests/bump-dsh.test.ts:15` — `pnpm add --global`
  - `tests/package-contract.test.ts:217` — `pnpm add --global --config.enable-global`
  - `tests/pnpm-compat.test.ts:61` — `pnpm add --global`
  中 修复：改为本地安装，并通过项目自身的脚本调用该工具；全局安装应由用户自己决定，而不是由插件代劳。
  EN Fix: Install locally and invoke the tool through the project's own scripts; global installs belong to the user's decision, not to a plugin.
- **低 / LOW** `priv.package-manager-config-write` — 改写包管理器或全局 git 配置 / Rewrites a package manager or global git configuration
  中 该行执行了 `npm config set` 或 `git config --global`，这会改变用户之后每条命令的配置——包括依赖从哪个仓库拉取，以及 git 调用哪个程序作为钩子。
  EN The line runs `npm config set` or `git config --global`, which changes settings for every future command the user runs — including which registry packages come from and which program git calls for hooks.
  - `tests/pnpm-compat.test.ts:90` — `expect(en).not.toContain('pnpm config set')`
  中 修复：用环境变量或命令行参数为单条命令传配置，而不是写入用户的持久化配置。
  EN Fix: Pass configuration per command with environment variables or flags instead of writing the user's persistent config.
- **低 / LOW** `supply.packaging-constraints` — 清单内置依赖或限定平台 / Manifest bundles dependencies or pins platforms
  中 `bundledDependencies` 会把依赖的私有副本打进 tarball，使这部分代码绕过仓库的完整性元数据；而 `os`/`cpu` 数组则直接限制了包能安装在哪些机器上。
  EN `bundledDependencies` ships a private copy of dependencies inside the tarball, which bypasses the registry's integrity metadata for that code, and `os`/`cpu` arrays restrict which machines the package installs on at all.
  - `package.json:29` — `"os": [`
  中 修复：通过仓库配合锁文件发布依赖，并把平台限制写在 README 里，而不是写进 `os`/`cpu` 字段。
  EN Fix: Ship dependencies through the registry with a lockfile, and document platform limits in the README rather than in `os`/`cpu` fields.

_按类别 / By category:_ 网络回调 / network callbacks 6 · 数据外传 / exfiltration 4 · 凭据读取 / credential access 3 · 混淆 / obfuscation 3 · 提示注入 / prompt injection 3 · 供应链 / supply chain 3 · 持久化 / persistence 2 · 滥用宿主环境 / harness abuse 1 · 提权 / privilege 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `seektty-HEAD/`
- skipped assets/seektty-logo.png: 592250 bytes exceeds the 524288-byte per-file cap
- skipped lib/index.js: 1444497 bytes exceeds the 524288-byte per-file cap
- skipped lib/transcript-CT56UlgZ.js: 584648 bytes exceeds the 524288-byte per-file cap
- not scanned (binary): assets/seektty-code-dark.png, assets/seektty-code-light.png, assets/seektty-onboarding-dark.png, assets/seektty-onboarding-light.png, assets/seektty-tui-dark.png and 1 more
- outbound fetching was permitted for this audit
- grade forced to D by a critical finding: cred.read-dsh-credentials — Reads DSH credentials or session storage
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
