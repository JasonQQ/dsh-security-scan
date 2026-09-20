> 批量压测 / Batch stress test · ★ 297 · `ZSeven-W/dsh-ios`
> https://github.com/ZSeven-W/dsh-ios · audited in 9.2s
# 安装前体检 / Pre-install audit: demo-video

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/ZSeven-W/dsh-ios/tar.gz/HEAD` (URL / url)
- 已分析文件：134 个（3.1 MiB） / Files analysed: 134 (3.1 MiB)
- 内容摘要 / Content digest: `21889d501b6d3451f8312917e49a2e32…`
- 体检时间 / Audited at: 2026-09-20T09:53:30.892Z

## 最严重的风险 / Most severe risk

**混淆代码叠加对外网络访问 / Obfuscated code and outbound network access** `obf.obfuscation-with-network-callback`

中 它把自己的写法藏了起来，所以读源码基本看不出它真正执行的是什么。
EN It hides how it is written, so reading it tells a reviewer little about what it actually executes.

该包会访问的目标：`registry.npmjs.org`、`hyperframes.heygen.com`、`raw.githubusercontent.com`、`cdn.jsdelivr.net`、`github.com`、`x`、`127.0.0.1`、`localhost` / Destinations this package reaches: `registry.npmjs.org`, `hyperframes.heygen.com`, `raw.githubusercontent.com`, `cdn.jsdelivr.net`, `github.com`, `x`, `127.0.0.1`, `localhost`

- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 它还安排了之后继续运行，所以仅仅卸载这个包并不够。
  EN It also arranges to run again later, so removing the package is not enough on its own.
- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `scripts/dev-uitree-smoke.mjs:146`；完整列表见下方「发现」。 / The rule that decided the grade fired at `scripts/dev-uitree-smoke.mjs:146`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `node:fs/promises`, `package.json`, `client.js`, `lib/client.js`, `sim-panel-size.ts`, `src/client/sim-panel-size.ts`, `sim-toolbar.tsx`, `src/client/sim-toolbar.tsx`, `sim-panel.tsx`, `src/client/sim-panel.tsx`, `sim-real-session.ts`, `src/client/sim-real-session.ts` （另有 30 项） / (+30 more)
- **写入的文件路径 / File paths written:** `node:fs/promises`, `Sources/DemoPreviewPkg`, `Package.swift`, `DemoView.swift`, `Sources/DemoPreviewPkg/DemoView.swift`, `SmokeApp.swift`, `zh-Hans.lproj`, `InfoPlist.strings`, `zh-Hans.lproj/InfoPlist.strings`, `App.swift`, `MinimalApp/App.swift`, `project.pbxproj` （另有 15 项） / (+15 more)
- **派生的命令 / Commands spawned:** `node:child_process`, `pkill`, `-f`, `serve-sim`, `ignore`, `ps`, `-o`, `stat=`, `-p`, `pgrep`, `lldb|leaks|sample`, `utf8` （另有 69 项） / (+69 more)
- **连接的域名 / Domains contacted:** `registry.npmjs.org`, `hyperframes.heygen.com`, `raw.githubusercontent.com`, `cdn.jsdelivr.net`, `github.com`, `x`, `127.0.0.1`, `localhost`, `127.0.0.1:${statusport`, `evil.example`, `127.0.0.1:${realport`, `127.0.0.1:${port` （另有 20 项） / (+20 more)
- **读取的环境变量 / Environment variables read:** `DSH_IOS_SMOKE_SKIP_SIM`, `DSH_REAL_DEVICE_UDID`, `DSH_IOS_SMOKE_DEVICE`, `DSH_IOS_QA_LIB_DIR`, `DSH_REAL_DEVICE_NAME`, `DSH_REAL_DEVICE_OS`, `DSH_IOS_SMOKE_REAL_DEVICE`, `PATH`, `CI`, `DSH_WDA_RELEASE_CHILD`, `DSH_WDA_DEVICE_UDID`, `DSH_WDA_HARDWARE_UDID` （另有 13 项） / (+13 more)

## 发现 / Findings

### 严重 / CRITICAL (1)

- **严重 / CRITICAL** `obf.obfuscation-with-network-callback` — 混淆代码叠加对外网络访问 / Obfuscated code and outbound network access
  中 该包既隐藏了自己的写法，又建立对外连接。在插件里，混淆除了让载荷读不懂之外没有任何用处；再加上回调，就是分阶段植入物的标准形态。
  EN The package hides how it is written and also makes outbound connections. Obfuscation has no purpose in a plugin except to keep the payload unreadable, and paired with a callback it is the standard shape of a staged implant.
  - `scripts/dev-uitree-smoke.mjs:146` — `mdРусский`
  - `pnpm-lock.yaml:893` — `undici-types@8.3.0:`
  - `pnpm-lock.yaml:1247` — `undici-types: 8.3.0`
  - `pnpm-lock.yaml:1552` — `undici-types@8.3.0: {}`
  中 修复：不要安装这个包。如果确实需要它，必须先要求对方提供可读源码，才能在任何地方使用。
  EN Fix: Do not install this package. If it is genuinely needed, require readable source before it is used anywhere.

### 高 / HIGH (9)

- **高 / HIGH** `net.covert-channel` — 通过 websocket 或 DNS 查询回连 / Beacons over a websocket or DNS lookup
  中 该行打开了 websocket，或通过 `dns.*` 或 DNS 工具解析某个域名。两者都能在不像是 HTTP 请求的情况下传递数据，而 DNS 尤其通常被所有防火墙和代理放行。
  EN The line opens a websocket or resolves a literal domain through `dns.*` or a DNS tool. Both carry data without looking like an HTTP request, and DNS in particular is normally permitted through every firewall and proxy.
  - `scripts/dev-card-smoke.mjs:816` — `client.resolveWsUrl('/ws?token=t', { protocol: 'https:', host: 'localhost' }) === 'wss://localhost/ws?token=t',`
  - `scripts/dev-card-smoke.mjs:1451` — `absoluteWsUrl === `ws://127.0.0.1:${port}${grant.wsUrl}`,`
  - `scripts/dev-qa-driver-smoke.mjs:92` — `return { url: 'http://127.0.0.1:3181', streamUrl: 'http://127.0.0.1:3181/stream.mjpeg', wsUrl: 'ws://127.0.0.1:3181/ws', port: 3181, device: simDevice.udid }`
  - `scripts/dev-qa-sim-recovery-smoke.mjs:14` — `sim: { async ensureRunning() { return { url: 'http://127.0.0.1:3181', streamUrl: 'http://127.0.0.1:3181/stream.mjpeg', wsUrl: 'ws://127.0.0.1:3181/ws', port: 31…`
  - ……另有 3 处 / … and 3 more location(s)
  中 修复：改用发往文档中说明的端点的普通 HTTPS 请求，让流量可以被检查和记录。
  EN Fix: Use ordinary HTTPS requests to a documented endpoint so that the traffic can be inspected and logged.
- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `scripts/dev-card-smoke.mjs:265` — `const url = new URL('http://127.0.0.1/api/event-log')`
  - `scripts/dev-card-smoke.mjs:835` — `const req = http.request({ host: '127.0.0.1', port, path, method, headers }, res => {`
  - `scripts/dev-card-smoke.mjs:852` — `const statusOrigin = `http://127.0.0.1:${statusPort}``
  - `scripts/dev-card-smoke.mjs:1072` — `const realOrigin = `http://127.0.0.1:${realPort}``
  - ……另有 41 处 / … and 41 more location(s)
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **高 / HIGH** `net.token-or-blob-in-url` — 把凭据或编码数据块放进 URL / Puts a credential or encoded blob in a URL
  中 令牌形状的查询参数、内嵌的 `user:password` 授权部分，或超长高熵的查询值，都意味着密钥或载荷数据在 URL 中传输，最终会留在访问日志、代理和浏览器历史里。
  EN A token-shaped query parameter, an embedded `user:password` authority, or a long high-entropy query value means secret material or payload data travels in a URL, where it lands in access logs, proxies and browser history.
  - `scripts/dev-panel-smoke.mjs:4702` — `'/_dsh/dsh-ios/ws?token=switched.token'`
  - `scripts/dev-panel-smoke.mjs:4757` — `'/_dsh/dsh-ios/ws?token=switched.token'`
  - `src/stream-routes.ts:1494` — ``${WS_ROUTE_PATH}?token=${encodeURIComponent(signed.token)}``
  - `src/stream-routes.ts:1652` — ``${WS_ROUTE_PATH}?token=${encodeURIComponent(signed.token)}``
  中 修复：凭据放在 Authorization 头里发送，载荷用 POST 放在请求体中，不要编码进查询字符串。
  EN Fix: Send credentials in an Authorization header, and POST payloads in the body rather than encoding them into the query string.
- **高 / HIGH** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `scripts/dev-card-smoke.mjs:60` — `const { SimHostController } = await import(join(root, 'lib', 'sim-host.js'))`
  - `scripts/dev-card-smoke.mjs:61` — `const { listDevices, bootDevice, shutdownDevice, bootedDevices } = await import(join(root, 'lib', 'simctl.js'))`
  - `scripts/dev-card-smoke.mjs:73` — `} = await import(join(root, 'lib', 'stream-routes.js'))`
  - `scripts/dev-card-smoke.mjs:1054` — `const { WdaController } = await import(join(root, 'lib', 'wda-host.js'))`
  - ……另有 64 处 / … and 64 more location(s)
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.
- **高 / HIGH** `obf.obfuscation-with-command-execution` — 混淆代码叠加进程执行 / Obfuscated code and process execution
  中 该包隐藏了自己的字符串或标识符，同时又启动进程。这样一来，读源码也无法告诉审查者实际跑的到底是哪条命令。
  EN The package hides its strings or identifiers and also spawns processes. Reading the source then tells the reviewer nothing about which command is actually run.
  - `scripts/dev-uitree-smoke.mjs:146` — `mdРусский`
  - `scripts/dev-card-smoke.mjs:48` — `import { execFileSync } from 'node:child_process'`
  - `scripts/dev-card-smoke.mjs:1608` — `execFileSync('pkill', ['-f', 'serve-sim'], { stdio: 'ignore', timeout: 10_000 })`
  - `scripts/dev-debug-smoke.mjs:38` — `import { execFileSync } from 'node:child_process'`
  中 修复：要求提供可读源码：把编码值换成字面量，把动态计算的模块路径换成静态 import。
  EN Fix: Require readable source: replace the encoded values with literals and the computed module paths with static imports.
- **高 / HIGH** `persist.global-self-install` — 全局安装依赖包 / Installs a package globally
  中 该命令把包安装到全局前缀，于是用户的 PATH 上多出一个可执行文件，而且当前项目删除后它仍然留在那里。
  EN The command installs a package into the global prefix, which puts a new executable on the user's PATH and keeps it there after the current project is deleted.
  - `.github/workflows/release.yml:42` — `npm install -g`
  中 修复：改为本地安装，并通过项目自身的脚本调用该工具；全局安装应由用户自己决定，而不是由插件代劳。
  EN Fix: Install locally and invoke the tool through the project's own scripts; global installs belong to the user's decision, not to a plugin.
- **高 / HIGH** `persist.scheduled-task-write` — 安装计划任务、agent 或系统服务 / Installs a scheduled task, agent or service
  中 该行注册了稍后会自动运行的东西——cron 条目、launch agent、systemd unit、Windows 计划任务或注册表 Run 键——因此插件在把它装进来的那次安装结束之后仍在持续执行。
  EN The line registers something that runs later — a cron entry, launch agent, systemd unit, Windows scheduled task or registry Run key — so the plugin keeps executing after the install that brought it in.
  - `src/qa-driver.ts:590` — `execFile('xcrun', ['simctl', 'spawn', udid, 'launchctl', 'list'], {`
  中 修复：删除这一定时注册，或交给用户一条有文档说明、可以自行运行和审查的命令。
  EN Fix: Remove the scheduling, or hand the user a documented command they can run and review themselves.
- **高 / HIGH** `priv.sudo-invocation` — 通过 sudo 提权 / Escalates with sudo
  中 该行通过 `sudo` 执行命令，意味着这个以用户级工具身份安装的插件在索要 root 权限，而用户事先看不到提权提示。
  EN The line runs a command through `sudo`, so the plugin is asking for root on a machine where it was installed as a user-level tool and where the user cannot see the escalation prompt in advance.
  - `src/tool-debug.ts:95` — `const DEVELOPER_MODE_HINT = 'macOS Developer Mode is required for full task inspection — run `sudo DevToolsSecurity -enable` once, then retry'`
  中 修复：去掉提权，把任何需要特权的步骤写成一条由用户主动执行的独立命令并加以说明。
  EN Fix: Remove the escalation and document any privileged step as a separate command the user runs deliberately.
- **高 / HIGH** `prompt.embedded-instruction-string` — 源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model
  中 源码中的字符串字面量——通常是工具描述或系统提示词片段——要求模型绕过确认或对用户隐瞒某些事，于是它作为一条指令进入上下文窗口。
  EN A string literal in the source — typically a tool description or system prompt fragment — tells the model to bypass confirmation or to hide something from the user, so it lands in the context window as a directive.
  - `src/tool-uitree.ts:557` — `' (allow_offscreen=true bypasses only the off-screen check — disabled stays refused)'`
  中 修复：如实描述工具的行为，删除那些会改变 agent 对待用户方式的指令。
  EN Fix: Describe the tool's behavior factually and remove directives that change how the agent treats the user.

### 中 / MEDIUM (4)

- **中 / MEDIUM** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 28 distinct remote hosts (127.0.0.1:${statusport, cdn.jsdelivr.net, evil.example, github.com, hyperframes.heygen.com, raw.githubusercontent.com, registry.npmjs.org, x, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `.github/workflows/release.yml:37` — `https://registry.npmjs.org`
  - `demo-video/hyperframes.json:2` — `https://hyperframes.heygen.com/schema/hyperframes.json`
  - `demo-video/hyperframes.json:3` — `https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry`
  - `demo-video/index.html:6` — `https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `scripts/dev-card-smoke.mjs:165` — `http://x`
  - `scripts/dev-card-smoke.mjs:197` — `http://x`
  - `scripts/dev-card-smoke.mjs:265` — `http://127.0.0.1/api/event-log`
  - `scripts/dev-card-smoke.mjs:852` — `http://127.0.0.1:${statusPort`
  - ……另有 44 处 / … and 44 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `obf.long-minified-line` — 整行是压缩或机器生成的数据块 / Line is a single minified or machine-generated blob
  中 该行超过 500 个字符且几乎没有空白，正是打包载荷、压缩字符串表或机器生成单行代码的样子。这样的一行用肉眼什么也审不出来。
  EN The line is over 500 characters with almost no whitespace, which is what a bundled payload, a packed string table or a machine-generated one-liner looks like. Nothing on such a line is reviewable by eye.
  - `src/build-run.ts:266` — `const BUILD_NOISE = /^(Write auxiliary files|WriteAuxiliaryFile|Touch|CodeSign|RegisterExecutionPolicyException|RegisterWithLaunchServices|ProcessInfoPlistFile|…`
  中 修复：发布未压缩的源码，或在 README 中说明该文件由哪个构建产出、可读源码在哪里。
  EN Fix: Ship unminified source, or state in the README which build produced the file and where the readable source lives.
- **中 / MEDIUM** `obf.obfuscated-identifier` — 使用混淆的标识符或混用字符集的名称 / Uses obfuscated identifiers or mixed-script names
  中 该行出现了压缩器风格的 `_0x…` 名称，或混用拉丁字母与西里尔、希腊形近字母的标识符。两者都会让试图扫读熟悉名称的人看漏，后者更是经典的仿冒手法。
  EN The line contains minifier-style `_0x…` names or an identifier that mixes Latin letters with Cyrillic or Greek lookalikes. Both defeat a reader scanning for a familiar name and the second is a classic impersonation trick.
  - `scripts/dev-uitree-smoke.mjs:146` — `mdРусский`
  中 修复：发布标识符名称有意义的源码，绝不在同一个标识符里混用不同字符集。
  EN Fix: Ship source with meaningful identifier names, and never mix script systems inside one identifier.

### 低 / LOW (1)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `assets/qa-wda-simulator/safety-patches.json:10` — `"oldText": "- (NSString *)bindingIPAddress\n{\n // Existence of USE_IP in the environment allows specifying which interface to bind to\n if (NSProcessInfo.proce…`
  - `scripts/dev-routes-smoke.mjs:601` — `body: JSON.stringify({ kind: 'sim-screenshot', path: '/etc/hosts' }),`
  - `scripts/dev-routes-smoke.mjs:604` — `const outsideToken = signToken(key, { v: 1, kind: 'sim-screenshot', path: '/etc/hosts', exp: Date.now() + 60_000 })`
  - `scripts/dev-wda-simulator-input-smoke.mjs:69` — `if (NSProcessInfo.processInfo.environment[@"USE_IP"] &&`
  - ……另有 14 处 / … and 14 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.

_按类别 / By category:_ 混淆 / obfuscation 5 · 网络回调 / network callbacks 5 · 持久化 / persistence 2 · 提权 / privilege 1 · 提示注入 / prompt injection 1 · 凭据读取 / credential access 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `dsh-ios-HEAD/`
- skipped demo-video/assets/dsh-ios-logo-outro.png: 735496 bytes exceeds the 524288-byte per-file cap
- skipped demo-video/assets/dsh-ios-logo.png: 735496 bytes exceeds the 524288-byte per-file cap
- skipped demo-video/assets/phone-edited.mp4: 5714219 bytes exceeds the 524288-byte per-file cap
- skipped demo-video/assets/simulator-edited.mp4: 5602421 bytes exceeds the 524288-byte per-file cap
- skipped docs/images/dsh-ios-logo.png: 735496 bytes exceeds the 524288-byte per-file cap
- skipped docs/images/dsh-ios-overview.png: 558701 bytes exceeds the 524288-byte per-file cap
- skipped docs/videos/dsh-ios-demo.mp4: 14482705 bytes exceeds the 524288-byte per-file cap
- outbound fetching was permitted for this audit
- grade forced to D by a critical finding: obf.obfuscation-with-network-callback — Obfuscated code and outbound network access
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
