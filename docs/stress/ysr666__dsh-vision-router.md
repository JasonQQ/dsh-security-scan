> 批量压测 / Batch stress test · ★ 1113 · `ysr666/dsh-vision-router`
> https://github.com/ysr666/dsh-vision-router · audited in 4.3s
# 安装前体检 / Pre-install audit: dsh-vision-router@2.2.0

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

- 来源 / Source: `https://codeload.github.com/ysr666/dsh-vision-router/tar.gz/HEAD` (URL / url)
- 已分析文件：456 个（6.0 MiB） / Files analysed: 456 (6.0 MiB)
- 内容摘要 / Content digest: `bdcb73e1e5fac475702c79dbb0f05a32…`
- 体检时间 / Audited at: 2026-09-20T09:52:20.335Z

## 最严重的风险 / Most severe risk

**源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model** `prompt.embedded-instruction-string`

中 它夹带了写给 agent 而不是写给人看的文字——试图在你不察觉的情况下改变 agent 行为的指令。
EN It carries text aimed at the agent rather than at a person — instructions that try to change what the agent does without telling you.

该包会访问的目标：`github.com`、`registry.npmjs.org`、`www.w3.org`、`localhost`、`127.0.0.1`、`opencode.ai`、`127.0.0.1:10808；兼容旧配置`、`。修改即时生效。` / Destinations this package reaches: `github.com`, `registry.npmjs.org`, `www.w3.org`, `localhost`, `127.0.0.1`, `opencode.ai`, `127.0.0.1:10808；兼容旧配置`, `。修改即时生效。`

- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 它还安排了之后继续运行，所以仅仅卸载这个包并不够。
  EN It also arranges to run again later, so removing the package is not enough on its own.

决定该评级的规则命中于 `lib/runtime-i18n.js:31`；完整列表见下方「发现」。 / The rule that decided the grade fired at `lib/runtime-i18n.js:31`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `.tgz`, `node:fs/promises`, `package.json`, `packages/llm/llm/src/index.ts`, `packages/api/session-controller/src/index.ts`, `packages/api/remotes/src/remote-events.ts`, `packages/client/connection/src/rpc.ts`, `/fake/chrome`, `../lib/adversarial-hardening.js`, `escape.png`, `../index.js`, `../lib/client.js` （另有 62 项） / (+62 more)
- **写入的文件路径 / File paths written:** `package.json`, `pnpm-workspace.yaml`, `node:fs/promises`, `manifest.json`, `\n`, `.agents`, `<html><body>Hello</body></html>`, `<html></html>`, `entry.js`, `cordis.patch.yml`, `session.jsonl`, `vision-router.1.log` （另有 39 项） / (+39 more)
- **派生的命令 / Commands spawned:** `node:child_process`, `pnpm`, `install`, `inherit`, `screencapture`, `-x`, `-m`, `import`, `-window`, `root`, `scrot`, `function` （另有 37 项） / (+37 more)
- **连接的域名 / Domains contacted:** `github.com`, `registry.npmjs.org`, `www.w3.org`, `localhost`, `127.0.0.1`, `opencode.ai`, `127.0.0.1:10808；兼容旧配置`, `。修改即时生效。`, `oai.endpoints.kepler.ai.cloud.ovh.net`, `，并兼容旧`, `。`, `open.bigmodel.cn` （另有 106 项） / (+106 more)
- **读取的环境变量 / Environment variables read:** `DSH_VERSION`, `RUNNER_TEMP`, `GITHUB_ENV`, `GITHUB_RUN_ID`, `EXPECT_BATCH_ATTACHMENTS`, `EXPECT_DIMENSION_CONFIG`, `EXPECT_SESSION_EVENT_READ`, `EXPECT_SESSION_LOG_READ`, `EXPECT_CURRENT`, `EXPECT_IMAGE_OFFLOAD`, `DSH_CHANNEL`, `process.env (every variable)` （另有 34 项） / (+34 more)

## 发现 / Findings

### 高 / HIGH (7)

- **高 / HIGH** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 112 distinct remote hosts (127.0.0.1:10808；兼容旧配置, github.com, oai.endpoints.kepler.ai.cloud.ovh.net, opencode.ai, registry.npmjs.org, www.w3.org, 。修改即时生效。, ，并兼容旧, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `.github/FUNDING.yml:1` — `https://github.com/ysr666/dsh-vision-router/blob/main/SPONSOR.md`
  - `.github/workflows/release.yml:51` — `https://registry.npmjs.org/`
  - `assets/hero-zh.svg:1` — `http://www.w3.org/2000/svg`
  - `index.js:4983` — `https://github.com/ysr666/dsh-vision-router`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `index.js:306` — `baseURL: z.string().default('http://127.0.0.1:11434/v1'),`
  - `lib/client.js:162` — `proxyHint: '留空即沿用 DSH/Host 网络路径。仅需单独覆盖视觉请求时填写，如 http://127.0.0.1:10808 或 socks5://127.0.0.1:10808；兼容旧配置 socks5h://。修改即时生效。',`
  - `lib/client.js:438` — `proxyHint: 'Leave empty to follow the DSH/Host network path. Set only to override vision requests, e.g. http://127.0.0.1:10808 or socks5://127.0.0.1:10808; lega…`
  - `lib/client.js:720` — `baseURL: 'http://127.0.0.1:11434/v1',`
  - ……另有 87 处 / … and 87 more location(s)
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **高 / HIGH** `net.token-or-blob-in-url` — 把凭据或编码数据块放进 URL / Puts a credential or encoded blob in a URL
  中 令牌形状的查询参数、内嵌的 `user:password` 授权部分，或超长高熵的查询值，都意味着密钥或载荷数据在 URL 中传输，最终会留在访问日志、代理和浏览器历史里。
  EN A token-shaped query parameter, an embedded `user:password` authority, or a long high-entropy query value means secret material or payload data travels in a URL, where it lands in access logs, proxies and browser history.
  - `scripts/security-adversarial-fuzz.mjs:127` — ``Authorization: ${bearer} https://example.invalid/x?token=${apiKey} api_key=${apiKey}``
  - `tests/doctor-runtime.test.js:113` — `'https://«redacted»@127.0.0.1:3080/private?token=secret#frag'`
  - `tests/file-logger.test.js:28` — `'https://example.test/?api_key=super-secret-value&x=1'`
  - `tests/vision-adversarial-hardening-v2.test.js:231` — ``https://«redacted»@example.test/v1?token=${secret}&safe=ok sk-proj-${secret}``
  - ……另有 12 处 / … and 12 more location(s)
  中 修复：凭据放在 Authorization 头里发送，载荷用 POST 放在请求体中，不要编码进查询字符串。
  EN Fix: Send credentials in an Authorization header, and POST payloads in the body rather than encoding them into the query string.
- **高 / HIGH** `obf.decoded-payload-literal` — 携带解码、转义或高熵字面量 / Carries a decoded, escaped or high-entropy literal
  中 一个很长的字面量会在运行时被解码（base64、`atob`、`unescape`、`decodeURIComponent`），或者写满了密集的十六进制、Unicode 转义，或者呈现出编码数据块那种近乎均匀的字符分布。
  EN A long literal is decoded at runtime (base64, `atob`, `unescape`, `decodeURIComponent`), written with dense hex or unicode escapes, or has the near-uniform character distribution of an encoded blob.
  - `lib/legacy-session-repair.js:323` — `: Buffer.from(`${text.slice(0, newline + 1)}${repaired.text}`, 'utf8')`
  - `tests/runtime-e2e.test.js:584` — `const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')`
  中 修复：把该值保存为可读源码，或保存为格式有文档说明的数据，让审查者能看清实际运行的到底是什么。
  EN Fix: Store the value as readable source or as data with a documented format, so a reviewer can see what is actually being run.
- **高 / HIGH** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `index.js:4731` — `'Windows: per-monitor-DPI-aware PowerShell capture; macOS: screencapture; Linux: ImageMagick import (falls back to scrot; either command must be installed). ' +`
  - `lib/client-presentation-boundary-main.js:1247` — `return require(id);`
  - `lib/core-primitives.js:1278` — `import(workerData.potraceUrl).then((mod) => {`
  - `lib/core-primitives.js:1350` — `Promise.all([import(workerData.sharpUrl), import(workerData.potraceUrl)]).then(([sharpMod, potraceMod]) => {`
  - ……另有 35 处 / … and 35 more location(s)
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.
- **高 / HIGH** `prompt.doc-instruction` — 文档中包含针对模型的指令 / Documentation contains instructions aimed at a model
  中 随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。
  EN A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.
  - `.github/copilot-instructions.md:6` — `- authority or fail-open bypasses; unsafe fallback after validation failure;`
  - `CHANGELOG.md:75` — `- **Host-first proxy convergence**: an empty `proxy` is now explicitly frozen as “follow the DSH/Host network path”. Host-owned visual providers bypass the lega…`
  - `CHANGELOG.md:87` — `- **OpenCode Go session-affinity propagation root fix (#410)**: child Harness calls spawned by vision tools now preserve DSH's real `sessionId`; only OpenCode G…`
  - `CHANGELOG.md:87` — `s real `sessionId`; only OpenCode Go direct bridges that bypass Harness emit the dynamic `x-opencode-session` header, using DSHvision-chain...optionsvision-http`
  - ……另有 10 处 / … and 10 more location(s)
  中 修复：把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。
  EN Fix: Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.
- **高 / HIGH** `prompt.embedded-instruction-string` — 源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model
  中 源码中的字符串字面量——通常是工具描述或系统提示词片段——要求模型绕过确认或对用户隐瞒某些事，于是它作为一条指令进入上下文窗口。
  EN A string literal in the source — typically a tool description or system prompt fragment — tells the model to bypass confirmation or to hide something from the user, so it lands in the context window as a directive.
  - `lib/runtime-i18n.js:31` — `'[vision-router: stale system prompt removed]'`
  - `scripts/dsh-proxy-egress-contract.mjs:25` — `'http://dvr-bypass-probe.invalid/final'`
  - `scripts/dsh-proxy-egress-contract.mjs:88` — `'dvr-bypass-probe.invalid'`
  - `scripts/dsh-proxy-egress-contract.mjs:89` — `'http://dvr-bypass-probe.invalid/proof'`
  - ……另有 15 处 / … and 15 more location(s)
  中 修复：如实描述工具的行为，删除那些会改变 agent 对待用户方式的指令。
  EN Fix: Describe the tool's behavior factually and remove directives that change how the agent treats the user.

### 中 / MEDIUM (4)

- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `index.js:306` — `http://127.0.0.1:11434/v1`
  - `lib/client.js:162` — `http://127.0.0.1:10808`
  - `lib/client.js:438` — `http://127.0.0.1:10808`
  - `lib/client.js:720` — `http://127.0.0.1:11434/v1`
  - ……另有 93 处 / … and 93 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `obf.long-minified-line` — 整行是压缩或机器生成的数据块 / Line is a single minified or machine-generated blob
  中 该行超过 500 个字符且几乎没有空白，正是打包载荷、压缩字符串表或机器生成单行代码的样子。这样的一行用肉眼什么也审不出来。
  EN The line is over 500 characters with almost no whitespace, which is what a bundled payload, a packed string table or a machine-generated one-liner looks like. Nothing on such a line is reviewable by eye.
  - `lib/runtime-i18n.js:25` — `skillContent: '先使用已有的结构化预识别/图片记忆作为视觉基线，不要重复泛化识图。需要新增或验证证据时选择最小必要工具：vision_describe 定向语义复核；vision_ground/vision_detect 定位或盘点；vision_crop 局部放大；vision_pixel_diff 比…`
  - `lib/settings-ia-client-prelude.js:29` — `function jsonEqual(left,right){if(left===right)return true;if(left===null||right===null||typeof left!=='object'||typeof right!=='object')return false;if(Array.i…`
  - `lib/settings-ia-client-prelude.js:64` — `function wrapLocale(locale){if(!locale||(typeof locale!=='object'&&typeof locale!=='function'))return locale;return new Proxy(locale,{get:function(target,proper…`
  - `lib/settings-limit-client-prelude.js:89` — `function wrapSlots(slots,React){if(!slots||(typeof slots!=='object'&&typeof slots!=='function'))return slots;return new Proxy(slots,{get:function(target,propert…`
  - ……另有 5 处 / … and 5 more location(s)
  中 修复：发布未压缩的源码，或在 README 中说明该文件由哪个构建产出、可读源码在哪里。
  EN Fix: Ship unminified source, or state in the README which build produced the file and where the readable source lives.
- **中 / MEDIUM** `persist.shell-rc-append` — 追加写入 shell 启动文件 / Appends to a shell startup file
  中 该行写入了 `.bashrc`、`.zshrc`、`.profile` 或 fish 配置，因此改动会在之后每个交互式 shell 中生效，而且删掉包目录也不会消失。
  EN The line writes into `.bashrc`, `.zshrc`, `.profile` or a fish config, so the change takes effect in every future interactive shell and survives removing the package directory.
  - `lib/doctor-cli.js:199` — `applicableProfiles: profileReport.profiles.filter((item) => item.installation?.applicable).map((item) => item.name),`
  - `lib/doctor-cli.js:207` — `.filter((item) => item.installation?.applicable && item.profileDir)`
  - `lib/doctor-cli.js:208` — `.map((item) => item.profileDir)`
  - `lib/doctor-cli.js:262` — `const profileName = profileReport.profiles.find((profile) => entry.profileDir === profile.profileDir)?.name`
  - ……另有 11 处 / … and 11 more location(s)
  中 修复：不要修改 shell 启动文件；如果需要 shell 集成，就把那行内容打印出来，由用户自行决定是否添加。
  EN Fix: Do not modify shell startup files; if a shell integration is required, print the line for the user to add deliberately.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 5 shipped file(s) are 64 KiB or larger and were not read as text, the largest being assets/dsh-conversation-image-qa-result.png at 334 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `assets/dsh-conversation-image-qa-result.png` — `341548 bytes not decoded as text`
  - `index.js:820` — `fetchImpl: (...args) => globalThis.fetch(...args),`
  - `index.js:5051` — `const response = await fetch(`${baseURL.replace(/\/$/, '')}/models`, {`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (6)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `index.js:830` — `profile: selfUpdatePlan.profile,`
  - `index.js:1654` — `const profiles = config && typeof config.profiles === 'function' ? config.profiles() : undefined`
  - `lib/android-attachment-compat.js:23` — `const env = options.env ?? process.env`
  - `lib/client.js:3779` — `const profile = auto && typeof auto.profile === 'string' && auto.profile ? auto.profile : 'web'`
  - ……另有 68 处 / … and 68 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `tests/core.test.js:1543` — `assert.equal(captured.guards[0]({ name: 'bash', arguments: { command: 'npm test' } }), undefined)`
  - `tests/issue-276-policy-hardening.test.js:199` — `mode.ctx.tools.register({ name: 'bash', async execute() { return 'ok' } })`
  - `tests/issue-289-native-nonintervention.test.js:316` — `mode.ctx.tools.register({ name: 'bash', async execute() { return 'ok' } })`
  - `tests/issue-289-native-nonintervention.test.js:355` — `mode.ctx.tools.register({ name: 'bash', async execute() { return 'ok' } })`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.
- **低 / LOW** `net.covert-channel` — 通过 websocket 或 DNS 查询回连 / Beacons over a websocket or DNS lookup
  中 该行打开了 websocket，或通过 `dns.*` 或 DNS 工具解析某个域名。两者都能在不像是 HTTP 请求的情况下传递数据，而 DNS 尤其通常被所有防火墙和代理放行。
  EN The line opens a websocket or resolves a literal domain through `dns.*` or a DNS tool. Both carry data without looking like an HTTP request, and DNS in particular is normally permitted through every firewall and proxy.
  - `tests/capability-advisory.test.js:50` — `isOpenAIHttpBridgeTransport({ api: 'openai-completions', baseURL: 'wss://example.test/v1' }),`
  - `tests/vision-backend-runtime-policy.test.js:115` — `: { api: 'websocket', baseURL: 'wss://example.invalid' }`
  中 修复：改用发往文档中说明的端点的普通 HTTPS 请求，让流量可以被检查和记录。
  EN Fix: Use ordinary HTTPS requests to a documented endpoint so that the traffic can be inspected and logged.
- **低 / LOW** `obf.dynamic-code-eval` — 执行运行时拼装出来的代码 / Evaluates code built at runtime
  中 该行执行的是一个并非源码字面量的表达式，真正运行的代码在插件运行时才被拼装出来，无法在 tarball 中审查。
  EN The line evaluates an expression that is not a source literal, so the executed code is assembled while the plugin runs and cannot be reviewed in the tarball.
  - `tests/alpha1-browser-lifecycle-integration.test.js:165` — `vm.runInNewContext(prelude, context)`
  - `tests/alpha1-browser-lifecycle-integration.test.js:257` — `vm.runInNewContext(source, harness.context)`
  - `tests/alpha1-client-host-compat.test.js:56` — `for (const prelude of preludes) vm.runInNewContext(prelude, context)`
  - `tests/alpha1-settings-factory-lifecycle.test.js:63` — `vm.runInNewContext(SETTINGS_FACTORY_LIFECYCLE_PRELUDE, context)`
  - ……另有 34 处 / … and 34 more location(s)
  中 修复：用静态函数或数据表替代动态求值；任何审计都无法为运行时才存在的代码背书。
  EN Fix: Replace the dynamic evaluation with a static function or a data table; there is no audit that can vouch for code that does not exist until runtime.
- **低 / LOW** `persist.global-self-install` — 全局安装依赖包 / Installs a package globally
  中 该命令把包安装到全局前缀，于是用户的 PATH 上多出一个可执行文件，而且当前项目删除后它仍然留在那里。
  EN The command installs a package into the global prefix, which puts a new executable on the user's PATH and keeps it there after the current project is deleted.
  - `tests/bundle-defaults.test.js:172` — `npm install --global`
  中 修复：改为本地安装，并通过项目自身的脚本调用该工具；全局安装应由用户自己决定，而不是由插件代劳。
  EN Fix: Install locally and invoke the tool through the project's own scripts; global installs belong to the user's decision, not to a plugin.
- **低 / LOW** `supply.foreign-registry` — 仓库或 scope 覆盖指向 npmjs 之外 / Registry or scope override points away from npmjs
  中 某个 registry 或 `_authToken` 条目指向的服务器并非 npmjs。随包发布的 `.npmrc` 或 `publishConfig` 配置把解析重定向后，所有依赖拉取都会来自用户并未选择的主机。
  EN A registry or `_authToken` entry names a server that is not npmjs. A shipped `.npmrc` or `publishConfig` block that redirects resolution makes every dependency fetch come from a host the user did not choose.
  - `tests/update-check-signal-lifecycle.test.js:43` — `registry: 'https://slow-registry.example.test',`
  - `tests/update-check-signal-lifecycle.test.js:44` — `fallbackRegistry: 'https://slow-registry.example.test',`
  - `tests/update-check-signal-lifecycle.test.js:69` — `registry: 'https://slow-registry.example.test',`
  - `tests/update-check.test.js:29` — `assert.equal(registryBaseFromEnv({ npm_config_registry: 'https://registry.example.test/' }), 'https://registry.example.test')`
  - ……另有 4 处 / … and 4 more location(s)
  中 修复：删除该覆盖；选择仓库本就是用户自己的配置，不该由被安装的包决定。
  EN Fix: Remove the override; registry selection belongs to the user's own configuration, not to the package being installed.

_按类别 / By category:_ 网络回调 / network callbacks 5 · 混淆 / obfuscation 4 · 提示注入 / prompt injection 2 · 持久化 / persistence 2 · 供应链 / supply chain 2 · 凭据读取 / credential access 1 · 滥用宿主环境 / harness abuse 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `dsh-vision-router-HEAD/`
- not scanned (binary): assets/dsh-conversation-image-qa-result.png, assets/dsh-conversation-image-qa.png, assets/pixel-loop-zh.png, assets/pixel-loop.png, assets/sponsor/alipay.png and 3 more
- outbound fetching was permitted for this audit
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
