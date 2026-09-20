> 批量压测 / Batch stress test · ★ 180 · `wssfk12138/dsh-damage-pulse`
> https://github.com/wssfk12138/dsh-damage-pulse · audited in 10.1s
# 安装前体检 / Pre-install audit: dsh-damage-pulse@4.0.11

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/wssfk12138/dsh-damage-pulse/tar.gz/HEAD` (URL / url)
- 已分析文件：232 个（14.9 MiB） / Files analysed: 232 (14.9 MiB)
- 内容摘要 / Content digest: `8f0a455d485f0f2bdeb379f48aaf87ea…`
- 体检时间 / Audited at: 2026-09-20T09:53:56.012Z

## 最严重的风险 / Most severe risk

**同一个包内既有环境变量收集又有对外请求 / Environment harvest and an outbound request in the same package** `exfil.environment-harvest-then-callback`

中 数据会离开这台机器。该包中有代码把本机上的内容发往外部地址。
EN Data leaves this machine. Something in this package takes content that lives here and sends it to a destination outside it.

该包会访问的目标：`www.w3.org`、`github.com`、`en.wikiversity.org`、`www.opensource.org`、`www.d-project.com`、`www.denso-wave.com`、`client.js`、`ilinkai.weixin.qq.com` / Destinations this package reaches: `www.w3.org`, `github.com`, `en.wikiversity.org`, `www.opensource.org`, `www.d-project.com`, `www.denso-wave.com`, `client.js`, `ilinkai.weixin.qq.com`

- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `tsdown.config.ts:36`；完整列表见下方「发现」。 / The rule that decided the grade fired at `tsdown.config.ts:36`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `node:fs/promises`, `usage.jsonl`, `idle.png`, `whale-girl/idle.png`, `context_tokens.json`, `../package.json`, `../cordis.patch.yml`, `../lib/index.js`, `../lib/client.js`, `../packages/util/token-monitor-contract/src/index.ts`, `.png`, `../plugins/dsh-token-monitor/src/migration.ts` （另有 5 项） / (+5 more)
- **写入的文件路径 / File paths written:** `node:fs/promises`, `pending_qrcode.json`, `usage.jsonl`, `\n`, `credentials.json`, `context_tokens.json`
- **派生的命令 / Commands spawned:** `node:child_process`, `ignore`, `pipe`, `']node:child_process[`, `--input-type=module`, `-e`
- **连接的域名 / Domains contacted:** `www.w3.org`, `github.com`, `en.wikiversity.org`, `www.opensource.org`, `www.d-project.com`, `www.denso-wave.com`, `client.js`, `ilinkai.weixin.qq.com`, `api.deepseek.com`, `localhost`, `localhostsince`, `api.github.com` （另有 11 项） / (+11 more)
- **读取的环境变量 / Environment variables read:** `process.env (every variable)`, `WECHAT_NOTIFY_CLAWBOT_INDEX`, `NODE_ENV`

## 发现 / Findings

### 严重 / CRITICAL (1)

- **严重 / CRITICAL** `exfil.environment-harvest-then-callback` — 同一个包内既有环境变量收集又有对外请求 / Environment harvest and an outbound request in the same package
  中 该包读取或整体导出进程环境变量，同时又建立对外连接。CI 运行器和宿主会话都会把 API Key 导出到环境变量中，因此这一组合会把仍有效的凭据送出本机。
  EN The package reads or dumps process environment values and also opens outbound connections. CI runners and harness sessions export API keys into the environment, so this combination sends working credentials off the machine.
  - `tsdown.config.ts:36` — `JSON.stringify(process.env`
  - `tsdown.config.ts:37` — `JSON.stringify(process.env`
  - `lib/client.js:3515` — `fetch("/api/token-monitor/usage-summary?range=" + summaryRange, {`
  - `lib/client.js:4797` — `let batch = await request(cursor.seq, signal);`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：删除环境变量的整体导出，只逐个读取插件确实需要、且有文档说明的变量。
  EN Fix: Remove the environment dump, and read only individually documented variables that the plugin actually needs.

### 高 / HIGH (4)

- **高 / HIGH** `cred.env-harvest` — 读取或整体导出进程环境变量 / Reads or dumps the process environment
  中 该行把整个环境当成一个值取走——序列化、遍历或打印它，而不是只取自己需要的那一个变量。CI 运行器和宿主都会把 API Key 导出到环境变量里，因此整体导出就是一次凭据收集。
  EN The line takes the whole environment as a value — serializing it, iterating it, or printing it — rather than the one variable it needs. CI runners and the harness export API keys into the environment, so a dump is a credential harvest.
  - `tsdown.config.ts:36` — `JSON.stringify(process.env`
  - `tsdown.config.ts:37` — `JSON.stringify(process.env`
  中 修复：只逐个读取插件文档中声明过的变量，绝不序列化整个环境对象，也不要把它写进日志或请求。
  EN Fix: Read only the variables the plugin documents, one at a time, and never serialize the environment object or forward it into a log or request.
- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `lib/index.js:3667` — `const cors = origin === "http://127.0.0.1:18765" || origin === "http://localhost:18765" ? {`
  - `packages/client/ui-token-monitor/src/client/TokenMonitorSettingsPanel.tsx:750` — `<a className="token-monitor-settings__update-icon" href="https://github.com/wssfk12138/dsh-damage-pulse" target="_blank" rel="noreferrer" role="button" aria-lab…`
  - `plugins/dsh-token-monitor/src/index.ts:246` — `const cors = origin === 'http://127.0.0.1:18765' || origin === 'http://localhost:18765'`
  - `plugins/dsh-token-monitor/tests/notification-route.spec.ts:37` — `return `http://127.0.0.1:${String((server.address() as AddressInfo).port)}${TOKEN_MONITOR_NOTIFICATION_EVENTS_PATH}``
  - ……另有 3 处 / … and 3 more location(s)
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **高 / HIGH** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `lib/index.js:243` — `require(sessionId) {`
  - `lib/index.js:384` — `const session = this.sessions.require(sessionId);`
  - `lib/index.js:485` — `this.importModule = options.importModule ?? ((url) => import(url));`
  - `plugins/wechat-notify/src/connection.ts:170` — `require(sessionId: string): LoginSession {`
  - ……另有 4 处 / … and 4 more location(s)
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.
- **高 / HIGH** `supply.url-dependency` — 依赖解析到 URL、git 引用或文件路径 / Dependency resolves to a URL, git ref or file path
  中 依赖不是从仓库解析，而是来自 URL、git 引用、本地路径或 patch，因此其内容不受仓库锁文件和任何完整性元数据约束，可以在版本号不变的情况下被替换。
  EN A dependency is resolved from a URL, a git reference, a local path or a patch instead of the registry, so its contents are not covered by the registry lockfile or by any integrity metadata and can change without a version bump.
  - `packages/client/ui-token-monitor/package.json:45` — `"@deepseek-ai/dsh-client-connection": "workspace:^",`
  - `packages/client/ui-token-monitor/package.json:46` — `"@deepseek-ai/dsh-client-ui-conversation": "workspace:^",`
  - `packages/client/ui-token-monitor/package.json:47` — `"@deepseek-ai/dsh-client-ui-layout": "workspace:^",`
  - `packages/client/ui-token-monitor/package.json:48` — `"@deepseek-ai/dsh-client-ui-slots": "workspace:^",`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：改为依赖仓库中已发布的版本，并用锁文件固定；如果确实必须用 fork，就把它发布到自己名下的 scope。
  EN Fix: Depend on a published version from the registry, pinned by a lockfile; if a fork is unavoidable, publish it under your own scope.

### 中 / MEDIUM (4)

- **中 / MEDIUM** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `lib/client.js:6965` — `name: "shell.overlay",`
  - `lib/client.js:6978` — `name: "shell.overlay",`
  - `packages/client/ui-token-monitor/src/client/index.ts:98` — `name: 'shell.overlay',`
  - `packages/client/ui-token-monitor/src/client/index.ts:126` — `name: 'shell.overlay',`
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.
- **中 / MEDIUM** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 21 distinct remote hosts (client.js, en.wikiversity.org, github.com, ilinkai.weixin.qq.com, www.d-project.com, www.denso-wave.com, www.opensource.org, www.w3.org, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `lib/client.js:3108` — `http://www.w3.org/2000/svg`
  - `lib/client.js:4120` — `https://github.com/wssfk12138/dsh-damage-pulse`
  - `lib/client.js.map:1` — `https://github.com/soldair/node-qrcode/issues/157`
  - `lib/client.js.map:1` — `https://en.wikiversity.org/wiki/Reed%E2%80%93Solomon_codes_for_coders#Introduction_to_mathematical_fields`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `lib/index.js:1796` — `http://localhostsince`
  - `lib/index.js:2024` — `http://localhostsince`
  - `lib/index.js:3269` — `http://${host`
  - `lib/index.js:3632` — `http://localhostsessionId`
  - ……另有 11 处 / … and 11 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 61 shipped file(s) are 64 KiB or larger and were not read as text, the largest being docs/assets/readme/dsh-damage-pulse-wechat-live.jpg at 456 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `docs/assets/readme/dsh-damage-pulse-wechat-live.jpg` — `467256 bytes not decoded as text`
  - `lib/client.js:3515` — `fetch("/api/token-monitor/usage-summary?range=" + summaryRange, {`
  - `lib/client.js:4797` — `let batch = await request(cursor.seq, signal);`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (2)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `lib/index.js:724` — `env: invocation.env,`
  - `plugins/dsh-token-monitor/tests/update.spec.ts:185` — `expect(installed[0]?.profile).toBe('web')`
  - `plugins/wechat-notify/src/sender.ts:42` — `env: invocation.env,`
  - `plugins/wechat-notify/tests/sender.spec.ts:83` — `run: async (invocation) => { environment = invocation.env },`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `obf.dynamic-code-eval` — 执行运行时拼装出来的代码 / Evaluates code built at runtime
  中 该行执行的是一个并非源码字面量的表达式，真正运行的代码在插件运行时才被拼装出来，无法在 tarball 中审查。
  EN The line evaluates an expression that is not a source literal, so the executed code is assembled while the plugin runs and cannot be reviewed in the tarball.
  - `packages/client/ui-token-monitor/tests/session-cost-real-registry.client.spec.tsx:38` — `new Function(readFileSync(PLUGIN_BUNDLE_PATH, 'utf8'))()`
  - `packages/client/ui-token-monitor/tests/session-cost-real-registry.client.spec.tsx:39` — `new Function(readFileSync(RUNTIME_BUNDLE_PATH, 'utf8'))()`
  中 修复：用静态函数或数据表替代动态求值；任何审计都无法为运行时才存在的代码背书。
  EN Fix: Replace the dynamic evaluation with a static function or a data table; there is no audit that can vouch for code that does not exist until runtime.

_按类别 / By category:_ 网络回调 / network callbacks 3 · 凭据读取 / credential access 2 · 混淆 / obfuscation 2 · 供应链 / supply chain 2 · 数据外传 / exfiltration 1 · 滥用宿主环境 / harness abuse 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `dsh-damage-pulse-HEAD/`
- skipped assets/dsh-token-monitor/whale-girl/critical-combo-pain-v2.png: 1070640 bytes exceeds the 524288-byte per-file cap
- skipped assets/dsh-token-monitor/whale-girl/death-stranded-v6-trim.png: 902514 bytes exceeds the 524288-byte per-file cap
- skipped assets/fastai-icon.png: 1368495 bytes exceeds the 524288-byte per-file cap
- skipped assets/fastai-register.svg: 1826051 bytes exceeds the 524288-byte per-file cap
- skipped assets/fastai-sponsor.svg: 1826066 bytes exceeds the 524288-byte per-file cap
- skipped assets/fastaitoken-account-usage.png: 1754445 bytes exceeds the 524288-byte per-file cap
- skipped assets/fastaitoken-request-history.png: 530013 bytes exceeds the 524288-byte per-file cap
- skipped docs/assets/dsh-damage-pulse-continuous-charges.gif: 4411066 bytes exceeds the 524288-byte per-file cap
- skipped docs/assets/dsh-damage-pulse-peak-valley-whale-poster.png: 1633940 bytes exceeds the 524288-byte per-file cap
- skipped docs/assets/dsh-damage-pulse-social-preview.png: 1063184 bytes exceeds the 524288-byte per-file cap
- skipped docs/assets/dsh-token-monitor-dual-showcase-r2-compact.gif: 2628861 bytes exceeds the 524288-byte per-file cap
- ……另有 5 项 / … and 5 more

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
