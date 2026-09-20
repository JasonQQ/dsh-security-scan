> 批量压测 / Batch stress test · ★ 1408 · `xmanrui/dsh-im`
> https://github.com/xmanrui/dsh-im · audited in 9.7s
# 安装前体检 / Pre-install audit: dsh-im-desktop-panel@0.1.0

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/xmanrui/dsh-im/tar.gz/HEAD` (URL / url)
- 已分析文件：667 个（10.0 MiB） / Files analysed: 667 (10.0 MiB)
- 内容摘要 / Content digest: `17b51b1539e896010eaf367f0ba02956…`
- 体检时间 / Audited at: 2026-09-20T09:52:12.026Z

## 最严重的风险 / Most severe risk

**同一个包内既有环境变量收集又有对外请求 / Environment harvest and an outbound request in the same package** `exfil.environment-harvest-then-callback`

中 数据会离开这台机器。该包中有代码把本机上的内容发往外部地址。
EN Data leaves this machine. Something in this package takes content that lives here and sends it to a destination outside it.

该包会访问的目标：`github.com`、`avatars.githubusercontent.com`、`registry.npmjs.org`、`opencollective.com`、`registry.npmmirror.com`、`ko-fi.com`、`tidelift.com`、`www.patreon.com` / Destinations this package reaches: `github.com`, `avatars.githubusercontent.com`, `registry.npmjs.org`, `opencollective.com`, `registry.npmmirror.com`, `ko-fi.com`, `tidelift.com`, `www.patreon.com`

- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 它还安排了之后继续运行，所以仅仅卸载这个包并不够。
  EN It also arranges to run again later, so removing the package is not enough on its own.
- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `scripts/verify-interface-language.mjs:87`；完整列表见下方「发现」。 / The rule that decided the grade fired at `scripts/verify-interface-language.mjs:87`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `node:fs/promises`, `package.json`, `/tmp/agent-mail-pending.json`, `lib/client.js`, `lib/index.js`, `cordis.patch.yml`, `package-lock.json`, `plugin-src/host/index.mjs`, `plugin-src/client/index.js`, `plugin-src/client/context-enhancement.js`, `plugin-src/client/delivery-settings.js`, `plugin-src/client/channels/email/index.js` （另有 17 项） / (+17 more)
- **写入的文件路径 / File paths written:** `node:fs/promises`, `/tmp/agent-mail-result.json`, `cordis.yml`, `package.json`, `cordis.patch.yml`, `browser.log`, `result.html`, `../bad`, `file-only.txt`, `state.json`, `config.json`, `legacy.json` （另有 28 项） / (+28 more)
- **派生的命令 / Commands spawned:** `node:child_process`, `dsh`, `web`, `--no-open`, `--host`, `127.0.0.1`, `--port`, `auth`, `login`, `/usr/bin/security`, `/usr/bin/osascript`, `-e` （另有 4 项） / (+4 more)
- **连接的域名 / Domains contacted:** `github.com`, `avatars.githubusercontent.com`, `registry.npmjs.org`, `opencollective.com`, `registry.npmmirror.com`, `ko-fi.com`, `tidelift.com`, `www.patreon.com`, `feross.org`, `buymeacoffee.com`, `www.w3.org`, `office.example.com` （另有 119 项） / (+119 more)
- **读取的环境变量 / Environment variables read:** `DSH_HOME`, `DSH_IM_CLIENT_ID`, `NODE_ENV`, `process.env (every variable)`, `DSH_IM_LANGUAGE`, `DSH_IM_TELEGRAM_TOKEN`, `CHROME_PATH`, `DINGTALK_REGISTRATION_BASE_URL`, `DINGTALK_REGISTRATION_SOURCE`, `FEISHU_APP_SECRET`, `FEISHU_SECRET_SERVICE`, `FEISHU_APP_ID` （另有 14 项） / (+14 more)

## 发现 / Findings

### 严重 / CRITICAL (1)

- **严重 / CRITICAL** `exfil.environment-harvest-then-callback` — 同一个包内既有环境变量收集又有对外请求 / Environment harvest and an outbound request in the same package
  中 该包读取或整体导出进程环境变量，同时又建立对外连接。CI 运行器和宿主会话都会把 API Key 导出到环境变量中，因此这一组合会把仍有效的凭据送出本机。
  EN The package reads or dumps process environment values and also opens outbound connections. CI runners and harness sessions export API keys into the environment, so this combination sends working credentials off the machine.
  - `scripts/verify-interface-language.mjs:87` — `Object.entries(process.env`
  - `scripts/verify-lan-management.mjs:49` — `Object.entries(process.env`
  - `package-lock.json:21` — `"undici": "7.29.0"`
  - `package-lock.json:1129` — `"axios": "^1.16.0",`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：删除环境变量的整体导出，只逐个读取插件确实需要、且有文档说明的变量。
  EN Fix: Remove the environment dump, and read only individually documented variables that the plugin actually needs.

### 高 / HIGH (7)

- **高 / HIGH** `cred.env-harvest` — 读取或整体导出进程环境变量 / Reads or dumps the process environment
  中 该行把整个环境当成一个值取走——序列化、遍历或打印它，而不是只取自己需要的那一个变量。CI 运行器和宿主都会把 API Key 导出到环境变量里，因此整体导出就是一次凭据收集。
  EN The line takes the whole environment as a value — serializing it, iterating it, or printing it — rather than the one variable it needs. CI runners and the harness export API keys into the environment, so a dump is a credential harvest.
  - `scripts/verify-interface-language.mjs:87` — `Object.entries(process.env`
  - `scripts/verify-lan-management.mjs:49` — `Object.entries(process.env`
  - `test/channels/feishu/config.test.mjs:18` — `Object.assign(process.env`
  中 修复：只逐个读取插件文档中声明过的变量，绝不序列化整个环境对象，也不要把它写进日志或请求。
  EN Fix: Read only the variables the plugin documents, one at a time, and never serialize the environment object or forward it into a log or request.
- **高 / HIGH** `net.covert-channel` — 通过 websocket 或 DNS 查询回连 / Beacons over a websocket or DNS lookup
  中 该行打开了 websocket，或通过 `dns.*` 或 DNS 工具解析某个域名。两者都能在不像是 HTTP 请求的情况下传递数据，而 DNS 尤其通常被所有防火墙和代理放行。
  EN The line opens a websocket or resolves a literal domain through `dns.*` or a DNS tool. Both carry data without looking like an HTTP request, and DNS in particular is normally permitted through every firewall and proxy.
  - `src/channels/shared/harness-mux.mjs:63` — `const socket = createWebSocket(url.toString());`
  - `test/channels/dingtalk/harness-client.test.mjs:549` — `assert.equal(socketUrl, 'ws://127.0.0.1:3080/api/events.mux');`
  - `test/channels/dingtalk/harness-client.test.mjs:649` — `'wss://harness.example/api/events.mux',`
  - `test/channels/dingtalk/harness-client.test.mjs:650` — `'wss://harness.example/api/events.mux',`
  - ……另有 12 处 / … and 12 more location(s)
  中 修复：改用发往文档中说明的端点的普通 HTTPS 请求，让流量可以被检查和记录。
  EN Fix: Use ordinary HTTPS requests to a documented endpoint so that the traffic can be inspected and logged.
- **高 / HIGH** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 122 distinct remote hosts (avatars.githubusercontent.com, github.com, ko-fi.com, opencollective.com, registry.npmjs.org, registry.npmmirror.com, tidelift.com, www.patreon.com, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `.all-contributorsrc:5` — `https://github.com`
  - `.all-contributorsrc:20` — `https://avatars.githubusercontent.com/u/21093036`
  - `package-lock.json:47` — `https://registry.npmjs.org/@borewit/text-codec/-/text-codec-0.2.2.tgz`
  - `package-lock.json:53` — `https://github.com/sponsors/Borewit`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `scripts/verify-thinking-traces.mjs:24` — `const HARNESS_BASE_URL = 'http://127.0.0.1:9377';`
  - `src/channels/feishu/config.mjs:58` — `harnessBaseUrl: new URL(process.env.HARNESS_BASE_URL ?? 'http://127.0.0.1:3080'),`
  - `test/channels/dingtalk/harness-client.test.mjs:70` — `baseUrl: 'http://127.0.0.1:3080',`
  - `test/channels/dingtalk/harness-client.test.mjs:117` — `baseUrl: 'http://127.0.0.1:3080',`
  - ……另有 68 处 / … and 68 more location(s)
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **高 / HIGH** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `scripts/verify-package.mjs:255` — `await import(pathToFileURL(resolve(root, 'lib/index.js')).href);`
  - `scripts/verify-session-title-prefix.mjs:16` — `const load = (name) => import(pathToFileURL(fromHarness.resolve(name)).href);`
  - `test/channels/email/email.test.mjs:621` — `const { assertTransport, TRANSPORT_METHODS } = await import(`
  - `test/channels/email/email.test.mjs:804` — `const { normalizeSnapshot } = await import(`
  - ……另有 10 处 / … and 10 more location(s)
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.
- **高 / HIGH** `prompt.doc-instruction` — 文档中包含针对模型的指令 / Documentation contains instructions aimed at a model
  中 随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。
  EN A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.
  - `docs/context-enhancement.md:15` — `Either way these blocks are content the current model reads, not changes to Harness code, system prompts, permissions, Agent Preset, model, tools or Workspace. …`
  中 修复：把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。
  EN Fix: Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.
- **高 / HIGH** `prompt.embedded-instruction-string` — 源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model
  中 源码中的字符串字面量——通常是工具描述或系统提示词片段——要求模型绕过确认或对用户隐瞒某些事，于是它作为一条指令进入上下文窗口。
  EN A string literal in the source — typically a tool description or system prompt fragment — tells the model to bypass confirmation or to hide something from the user, so it lands in the context window as a directive.
  - `src/channels/shared/i18n-en/weixin.mjs:29` — `'WeChat was authorized, but the local Harness request was challenged for proxy authentication. Please bypass the proxy for loopback addresses and check the NO_P…`
  - `src/channels/weixin/connection-error.en.mjs:33` — `"The proxy requires authentication for the local Harness request. Bypass the proxy for loopback addresses and check NO_PROXY."`
  - `test/channels/feishu/bridge.test.mjs:3316` — `'the second answer bypasses the first answer reaction-finalization window'`
  - `test/channels/shared/text-harness-bridge.test.mjs:352` — ``${name} owner bypasses a failed policy read``
  - ……另有 7 处 / … and 7 more location(s)
  中 修复：如实描述工具的行为，删除那些会改变 agent 对待用户方式的指令。
  EN Fix: Describe the tool's behavior factually and remove directives that change how the agent treats the user.

### 中 / MEDIUM (6)

- **中 / MEDIUM** `cred.many-secret-env-vars` — 读取多个不同名称的密钥类环境变量 / Reads several differently-named secret environment variables
  中 这里的一行、或整个包里的若干行，读取了名称看起来像凭据的环境变量。只读一个文档中声明的 key 是插件本该有的认证方式；枚举多个不同名称的密钥，则是在收集凭据而不是在使用凭据。
  EN One line here, or several across the package, read environment variables whose names look like credentials. Reading a single documented key is how a plugin is meant to authenticate; enumerating many differently-named ones is how credentials are gathered rather than used.
  - `scripts/verify-interface-language.mjs:58` — `process.env.DSH_IM_TELEGRAM_TOKEN`
  - `src/channels/feishu/config.mjs:12` — `process.env.FEISHU_APP_SECRET`
  - `src/channels/feishu/config.mjs:14` — `process.env.FEISHU_SECRET_SERVICE`
  中 修复：只保留插件确实需要且有文档说明的变量，删掉与任何功能无关的密钥读取。
  EN Fix: Keep to the variables this plugin documents and needs, and delete reads of keys it has no feature for.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `plugin-src/client/channels/wecom-app/index.js:192` — `http://服务器IP:端口`
  - `plugin-src/client/i18n.js:993` — `http://服务器IP:端口`
  - `plugin-src/management-rpc.mjs:15` — `http://${authority`
  - `scripts/verify-lan-management.mjs:186` — `http://${hostname`
  - ……另有 82 处 / … and 82 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `obf.long-minified-line` — 整行是压缩或机器生成的数据块 / Line is a single minified or machine-generated blob
  中 该行超过 500 个字符且几乎没有空白，正是打包载荷、压缩字符串表或机器生成单行代码的样子。这样的一行用肉眼什么也审不出来。
  EN The line is over 500 characters with almost no whitespace, which is what a bundled payload, a packed string table or a machine-generated one-liner looks like. Nothing on such a line is reviewable by eye.
  - `plugin-src/client/channel-logos.js:44` — `d: 'M37.05 22.783c-6.758-5.216-14.378-12.128-22.73-19.538-.655-.585-1.242-.354-1.536.42-1.88 4.973-.058 9.386 2.889 11.932s7.368 4.912 10.058 6.155c.105.049.013…`
  - `plugin-src/client/channel-logos.js:144` — `d: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.074-.297-.149-1.255-.462-2.39-1…`
  - `plugin-src/client/channels/dingtalk/index.js:52` — `d: 'M37.05 22.783c-6.758-5.216-14.378-12.128-22.73-19.538-.655-.585-1.242-.354-1.536.42-1.88 4.973-.058 9.386 2.889 11.932s7.368 4.912 10.058 6.155c.105.049.013…`
  - `plugin-src/client/global-settings.js:49` — `d: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-…`
  - ……另有 3 处 / … and 3 more location(s)
  中 修复：发布未压缩的源码，或在 README 中说明该文件由哪个构建产出、可读源码在哪里。
  EN Fix: Ship unminified source, or state in the README which build produced the file and where the readable source lives.
- **中 / MEDIUM** `persist.shell-rc-append` — 追加写入 shell 启动文件 / Appends to a shell startup file
  中 该行写入了 `.bashrc`、`.zshrc`、`.profile` 或 fish 配置，因此改动会在之后每个交互式 shell 中生效，而且删掉包目录也不会消失。
  EN The line writes into `.bashrc`, `.zshrc`, `.profile` or a fish config, so the change takes effect in every future interactive shell and survives removing the package directory.
  - `plugin-src/host/update-runtime.mjs:294` — `.map((filename) => readOptional(join(runtime.profileDir, filename))));`
  - `test/update-runtime.test.mjs:255` — `await writeFile(join(f.profileDir, 'pnpm-lock.yaml'), "lockfileVersion: '9.0'\n# changed\n");`
  - `test/update-runtime.test.mjs:267` — `await writeFile(join(f.profileDir, 'pnpm-lock.yaml'), "lockfileVersion: '9.0'\n# external change after confirmation\n");`
  中 修复：不要修改 shell 启动文件；如果需要 shell 集成，就把那行内容打印出来，由用户自行决定是否添加。
  EN Fix: Do not modify shell startup files; if a shell integration is required, print the line for the user to add deliberately.
- **中 / MEDIUM** `prompt.concealed-instruction` — 把文本藏在注释或不可见字符中 / Hides text in a comment or invisible characters
  中 该行把内容藏在 HTML 注释里，或藏在零宽字符与双向控制字符之后，这些内容在 diff 或渲染后的文档中什么都看不见，却仍会作为文本被读取。
  EN The line conceals content either in an HTML comment or behind zero-width and bidirectional control characters, which render as nothing in a diff or a rendered document while still being read as text.
  - `README.en.md:352` — `ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section`
  - `README.en.md:353` — `prettier-ignore-start`
  - `README.en.md:414` — `prettier-ignore-end`
  - `README.md:355` — `ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section`
  - ……另有 6 处 / … and 6 more location(s)
  中 修复：删除被隐藏的文本和不可见字符；审查者看不到的东西就不该出现在发布的包里。
  EN Fix: Delete the concealed text and the invisible characters; anything a reviewer cannot see does not belong in a shipped package.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 9 shipped file(s) are 64 KiB or larger and were not read as text, the largest being docs/images/Context_enhancement_en.png at 259 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `docs/images/Context_enhancement_en.png` — `265394 bytes not decoded as text`
  - `package-lock.json:21` — `"undici": "7.29.0"`
  - `package-lock.json:1129` — `"axios": "^1.16.0",`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (7)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `bin/dsh-im.mjs:53` — `const bundles = new Set(manifest.dsh?.profile?.bundles ?? []);`
  - `plugin-src/client/update-panel.js:91` — `const profile = snapshot?.profileName;`
  - `plugin-src/client/update-panel.js:450` — `desktop: snapshot?.environmentKind === 'desktop',`
  - `plugin-src/host/update-runtime.mjs:171` — `const env = options.env ?? process.env;`
  - ……另有 30 处 / … and 30 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `destructive.recursive-delete-system-path` — 递归删除指向用户主目录或系统目录 / Recursive delete aimed at a home or system directory
  中 递归删除的目标是用户主目录或系统路径，一旦变量写错、展开为空或缺少判空保护，被销毁的就是用户数据而不是包自己的构建产物。
  EN A recursive delete targets a home directory or a system path, so a wrong variable, an empty expansion or a missing guard destroys user data instead of the package's own build output.
  - `test/update-rpc.test.mjs:15` — `['update.install', { checkId: 'id', requestId: '; rm -rf /' }],`
  中 修复：只删除包在自己目录下创建的路径，并在解析出的路径不位于该目录内时拒绝执行。
  EN Fix: Delete only paths the package created under its own directory, and refuse to run when the resolved path is not inside it.
- **低 / LOW** `destructive.shipped-command` — 内置破坏性文件系统命令 / Ships a destructive filesystem command
  中 抹掉用户主目录、根文件系统或分区的命令出现在可执行内容里，而不是文档描述中。即便有条件判断保护，这种原语也绝不该被塞进插件里。
  EN A command that erases a home directory, a root filesystem or a partition appears in executable content rather than in prose. Even guarded by a condition, it is a primitive that should never travel inside a plugin.
  - `test/update-rpc.test.mjs:15` — `['update.install', { checkId: 'id', requestId: '; rm -rf /' }],`
  中 修复：删除该命令。插件如果必须清理，应把删除限定在它自己创建的目录，并以包根目录为基准解析这个路径。
  EN Fix: Delete the command. If a plugin must clean up, restrict deletion to a directory it created and resolve that path from the package root.
- **低 / LOW** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `test/channels/dingtalk/dingtalk-bridge.test.mjs:2264` — `toolName: 'bash',`
  - `test/channels/dingtalk/harness-client.test.mjs:511` — `toolName: 'bash',`
  - `test/channels/dingtalk/harness-client.test.mjs:809` — `name: 'bash',`
  - `test/channels/dingtalk/harness-client.test.mjs:868` — `toolName: 'bash',`
  - ……另有 45 处 / … and 45 more location(s)
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.
- **低 / LOW** `net.token-or-blob-in-url` — 把凭据或编码数据块放进 URL / Puts a credential or encoded blob in a URL
  中 令牌形状的查询参数、内嵌的 `user:password` 授权部分，或超长高熵的查询值，都意味着密钥或载荷数据在 URL 中传输，最终会留在访问日志、代理和浏览器历史里。
  EN A token-shaped query parameter, an embedded `user:password` authority, or a long high-entropy query value means secret material or payload data travels in a URL, where it lands in access logs, proxies and browser history.
  - `test/channels/dingtalk/connection-error.test.mjs:15` — `'request for client-id-private failed via https://«redacted»@proxy.example because clientSecret=secret-private'`
  - `test/channels/dingtalk/connection-error.test.mjs:25` — `'https://«redacted»@proxy.example'`
  - `test/channels/dingtalk/dingtalk-api.test.mjs:98` — `'https://oapi.dingtalk.com/robot/sendBySession?session=opaque'`
  - `test/channels/dingtalk/dingtalk-api.test.mjs:714` — `'http://download.example.test:80/private/image?signature=opaque%2Bvalue'`
  - ……另有 8 处 / … and 8 more location(s)
  中 修复：凭据放在 Authorization 头里发送，载荷用 POST 放在请求体中，不要编码进查询字符串。
  EN Fix: Send credentials in an Authorization header, and POST payloads in the body rather than encoding them into the query string.
- **低 / LOW** `obf.decoded-payload-literal` — 携带解码、转义或高熵字面量 / Carries a decoded, escaped or high-entropy literal
  中 一个很长的字面量会在运行时被解码（base64、`atob`、`unescape`、`decodeURIComponent`），或者写满了密集的十六进制、Unicode 转义，或者呈现出编码数据块那种近乎均匀的字符分布。
  EN A long literal is decoded at runtime (base64, `atob`, `unescape`, `decodeURIComponent`), written with dense hex or unicode escapes, or has the near-uniform character distribution of an encoded blob.
  - `test/channels/dingtalk/dingtalk-bridge.test.mjs:285` — `const fileBytes = Buffer.from('quoted attachment verification: ALDER-7429');`
  - `test/channels/shared/context-enhancement-bridges.test.mjs:23` — `const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');`
  - `test/image-input.test.mjs:17` — `const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');`
  中 修复：把该值保存为可读源码，或保存为格式有文档说明的数据，让审查者能看清实际运行的到底是什么。
  EN Fix: Store the value as readable source or as data with a documented format, so a reviewer can see what is actually being run.
- **低 / LOW** `supply.foreign-registry` — 仓库或 scope 覆盖指向 npmjs 之外 / Registry or scope override points away from npmjs
  中 某个 registry 或 `_authToken` 条目指向的服务器并非 npmjs。随包发布的 `.npmrc` 或 `publishConfig` 配置把解析重定向后，所有依赖拉取都会来自用户并未选择的主机。
  EN A registry or `_authToken` entry names a server that is not npmjs. A shipped `.npmrc` or `publishConfig` block that redirects resolution makes every dependency fetch come from a host the user did not choose.
  - `test/update-rpc.test.mjs:12` — `['unknown', {}], ['update.check', { registry: 'https://evil.test/' }],`
  中 修复：删除该覆盖；选择仓库本就是用户自己的配置，不该由被安装的包决定。
  EN Fix: Remove the override; registry selection belongs to the user's own configuration, not to the package being installed.

_按类别 / By category:_ 网络回调 / network callbacks 5 · 凭据读取 / credential access 3 · 混淆 / obfuscation 3 · 提示注入 / prompt injection 3 · 供应链 / supply chain 2 · 破坏性 / destructive 2 · 数据外传 / exfiltration 1 · 持久化 / persistence 1 · 滥用宿主环境 / harness abuse 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `dsh-im-HEAD/`
- skipped assets/logo-dsh-im-chinese-readme-3x2.png: 1648893 bytes exceeds the 524288-byte per-file cap
- skipped assets/logo-dsh-im-connecting-readme-3x2.png: 1299081 bytes exceeds the 524288-byte per-file cap
- skipped assets/logo-dsh-im-connecting-square-v4.png: 916014 bytes exceeds the 524288-byte per-file cap
- skipped assets/logo.png: 568736 bytes exceeds the 524288-byte per-file cap
- skipped assets/logo_cn.png: 1866878 bytes exceeds the 524288-byte per-file cap
- skipped docs/images/imbot.png: 669410 bytes exceeds the 524288-byte per-file cap
- skipped docs/images/imbot_en.png: 647585 bytes exceeds the 524288-byte per-file cap
- skipped lib/client.js: 1058164 bytes exceeds the 524288-byte per-file cap
- skipped lib/index.js: 8604848 bytes exceeds the 524288-byte per-file cap
- not scanned (binary): assets/logo-icon.png, assets/logo-plugin-phone.png, assets/screenshot-menu-card.png, docs/images/access_mode_en.png, docs/images/access_mode.png and 6 more
- outbound fetching was permitted for this audit
- ……另有 2 项 / … and 2 more

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
