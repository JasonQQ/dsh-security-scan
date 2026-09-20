> 批量压测 / Batch stress test · ★ 372 · `dream-num/dsh-univer-office`
> https://github.com/dream-num/dsh-univer-office · audited in 4.5s
# 安装前体检 / Pre-install audit: dsh-univer-office@0.3.2

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/dream-num/dsh-univer-office/tar.gz/HEAD` (URL / url)
- 已分析文件：393 个（3.3 MiB） / Files analysed: 393 (3.3 MiB)
- 内容摘要 / Content digest: `9a83a95dce6968a3b5128d63039f0e2e…`
- 体检时间 / Audited at: 2026-09-20T09:53:13.799Z

## 最严重的风险 / Most severe risk

**同一个包内既有环境变量收集又有对外请求 / Environment harvest and an outbound request in the same package** `exfil.environment-harvest-then-callback`

中 数据会离开这台机器。该包中有代码把本机上的内容发往外部地址。
EN Data leaves this machine. Something in this package takes content that lives here and sends it to a destination outside it.

该包会访问的目标：`registry.npmjs.org`、`insider-npm-registry.univer.work`、`www.apache.org`、`opencollective.com`、`github.com`、`example.com`、`univer.ai`、`gateway.example` / Destinations this package reaches: `registry.npmjs.org`, `insider-npm-registry.univer.work`, `www.apache.org`, `opencollective.com`, `github.com`, `example.com`, `univer.ai`, `gateway.example`

- 中 它发生在安装时：`prepare` 脚本会执行它，你不需要自己运行任何东西。
  EN It happens at install time: the `prepare` script runs it, so you do not have to run anything yourself.
- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `scripts/verify-public-runtime-dependencies.mjs:17`；完整列表见下方「发现」。 / The rule that decided the grade fired at `scripts/verify-public-runtime-dependencies.mjs:17`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

- `prepare` (`package.json`): `pnpm run build && simple-git-hooks`

发布期钩子（维护者打包或发布时运行，安装时不会执行）： / Publish-time hooks (run when the maintainer packs or publishes, not on install):

- `prepublishOnly`: `pnpm run build && pnpm run test`

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `node:fs/promises`, `../package.json`, `../tsconfig.json`, `native/comparison-pane.ts`, `comparison-types.ts`, `package.json`, `index.html`, `build-info.json`, `lib/client.js`, `../lib/index.js`, `require("@univerjs-pro/exchange-node")`, `@univerjs-pro/exchange-node` （另有 2 项） / (+2 more)
- **写入的文件路径 / File paths written:** `\n`, `node:fs/promises`
- **派生的命令 / Commands spawned:** `node:child_process`, `git`, `rev-parse`, `HEAD`, `ignore`, `pipe`, `capture`
- **连接的域名 / Domains contacted:** `registry.npmjs.org`, `insider-npm-registry.univer.work`, `www.apache.org`, `opencollective.com`, `github.com`, `example.com`, `univer.ai`, `gateway.example`, `127.0.0.1:${server.port`, `localhost`, `${req.headers.host`, `127.0.0.1:${string(port` （另有 8 项） / (+8 more)
- **读取的环境变量 / Environment variables read:** `process.env (every variable)`, `UNIVER_COLLAB_GATEWAY_PORT`, `UNIVER_VIEW_ASSETS_ROOT`, `UNIVER_ALLOWED_ROOT`, `PORT`, `ALLOWED_ROOT`, `IDLE_TTL_MS`, `UNIVER_DSH_GATEWAY_DEBUG`, `NODE_PATH`, `UNIVER_LICENSE`, `UNIVER_PLUGIN_ROOT`

## 发现 / Findings

### 严重 / CRITICAL (2)

- **严重 / CRITICAL** `exfil.environment-harvest-then-callback` — 同一个包内既有环境变量收集又有对外请求 / Environment harvest and an outbound request in the same package
  中 该包读取或整体导出进程环境变量，同时又建立对外连接。CI 运行器和宿主会话都会把 API Key 导出到环境变量中，因此这一组合会把仍有效的凭据送出本机。
  EN The package reads or dumps process environment values and also opens outbound connections. CI runners and harness sessions export API keys into the environment, so this combination sends working credentials off the machine.
  - `scripts/verify-public-runtime-dependencies.mjs:17` — `Object.entries(process.env`
  - `pnpm-lock.yaml:4568` — `undici-types@7.18.2:`
  - `pnpm-lock.yaml:4571` — `undici-types@8.3.0:`
  - `pnpm-lock.yaml:4574` — `undici@8.10.1:`
  中 修复：删除环境变量的整体导出，只逐个读取插件确实需要、且有文档说明的变量。
  EN Fix: Remove the environment dump, and read only individually documented variables that the plugin actually needs.
- **严重 / CRITICAL** `net.exfil-service-host` — 连接已知的数据外传或隧道服务 / Contacts a known exfiltration or tunnelling service
  中 该行出现了请求捕获、粘贴板或隧道服务的主机名，这些服务存在的意义就是接收来自别处的数据。它们被用于投放和命令控制回调，而不是实现插件自身的功能。
  EN The line names a request-capture, paste or tunnel host that exists to receive data from somewhere else. These services are used for drop-off and for command-and-control callbacks, not for shipping a plugin's own features.
  - `src/viewer-app/ui/app.tsx:886` — `toast(t().toast.mergedElsewhere)`
  - `src/viewer-app/ui/app.tsx:1450` — `toast(t().toast.merged)`
  - `src/viewer-app/ui/app.tsx:1459` — `toast(t().toast.mergeFailed(String(error)))`
  中 修复：删除该端点。如果它只是开发时的占位符，就删掉它，不要让它在已发布的包里仍然可达。
  EN Fix: Remove the endpoint. If it is a placeholder from development, delete it rather than leave it reachable in the published package.

### 高 / HIGH (6)

- **高 / HIGH** `cred.env-harvest` — 读取或整体导出进程环境变量 / Reads or dumps the process environment
  中 该行把整个环境当成一个值取走——序列化、遍历或打印它，而不是只取自己需要的那一个变量。CI 运行器和宿主都会把 API Key 导出到环境变量里，因此整体导出就是一次凭据收集。
  EN The line takes the whole environment as a value — serializing it, iterating it, or printing it — rather than the one variable it needs. CI runners and the harness export API keys into the environment, so a dump is a credential harvest.
  - `scripts/verify-public-runtime-dependencies.mjs:17` — `Object.entries(process.env`
  中 修复：只逐个读取插件文档中声明过的变量，绝不序列化整个环境对象，也不要把它写进日志或请求。
  EN Fix: Read only the variables the plugin documents, one at a time, and never serialize the environment object or forward it into a log or request.
- **高 / HIGH** `net.covert-channel` — 通过 websocket 或 DNS 查询回连 / Beacons over a websocket or DNS lookup
  中 该行打开了 websocket，或通过 `dns.*` 或 DNS 工具解析某个域名。两者都能在不像是 HTTP 请求的情况下传递数据，而 DNS 尤其通常被所有防火墙和代理放行。
  EN The line opens a websocket or resolves a literal domain through `dns.*` or a DNS tool. Both carry data without looking like an HTTP request, and DNS in particular is normally permitted through every firewall and proxy.
  - `src/gateway-app/main.ts:17` — `const wsOrigin = `ws://127.0.0.1:${server.port}``
  中 修复：改用发往文档中说明的端点的普通 HTTPS 请求，让流量可以被检查和记录。
  EN Fix: Use ordinary HTTPS requests to a documented endpoint so that the traffic can be inspected and logged.
- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `src/gateway-app/gateway-entry.ts:19` — `process.stdout.write(`[dsh-univer-gateway] listening on http://127.0.0.1:${server.port}\n`)`
  - `src/gateway-app/main.ts:16` — `const origin = `http://127.0.0.1:${server.port}``
  - `src/gateway-app/main.ts:17` — `const wsOrigin = `ws://127.0.0.1:${server.port}``
  - `src/host/processes/gateway/gateway-process.ts:29` — `const origin = `http://127.0.0.1:${String(port)}``
  - ……另有 13 处 / … and 13 more location(s)
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **高 / HIGH** `obf.decoded-payload-literal` — 携带解码、转义或高熵字面量 / Carries a decoded, escaped or high-entropy literal
  中 一个很长的字面量会在运行时被解码（base64、`atob`、`unescape`、`decodeURIComponent`），或者写满了密集的十六进制、Unicode 转义，或者呈现出编码数据块那种近乎均匀的字符分布。
  EN A long literal is decoded at runtime (base64, `atob`, `unescape`, `decodeURIComponent`), written with dense hex or unicode escapes, or has the near-uniform character distribution of an encoded blob.
  - `src/viewer-support/render-preset/license.ts:4` — `'2088168239728517120-1-eyJpIjoiMjA4ODE2ODIzOTcyODUxNzEyMCIsInYiOiIxIiwicCI6ImtPN3hWUG5mZVFYSlY2ZjRiSk03MFk5NHdOZTZkR3VRTDNxdklqRFpZblU9IiwiZG0iOlsibG9jYWxob3N0I…`
  - `src/workers/unit-content/license.ts:6` — `'2088168239728517120-1-eyJpIjoiMjA4ODE2ODIzOTcyODUxNzEyMCIsInYiOiIxIiwicCI6ImtPN3hWUG5mZVFYSlY2ZjRiSk03MFk5NHdOZTZkR3VRTDNxdklqRFpZblU9IiwiZG0iOlsibG9jYWxob3N0I…`
  中 修复：把该值保存为可读源码，或保存为格式有文档说明的数据，让审查者能看清实际运行的到底是什么。
  EN Fix: Store the value as readable source or as data with a documented format, so a reviewer can see what is actually being run.
- **高 / HIGH** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `src/host/provider/gateway-univer-service.ts:300` — `const imported = await this.unitContent.import(request.source, signal)`
  - `src/host/provider/unit-content-operations.ts:137` — `import(`
  - `test/integration-smoke.mjs:83` — `const univerPlugin = await import(entry)`
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.
- **高 / HIGH** `prompt.doc-instruction` — 文档中包含针对模型的指令 / Documentation contains instructions aimed at a model
  中 随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。
  EN A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.
  - `AGENTS.md:83` — `- Do not bypass type safety with broad assertions or unexplained `any`.`
  中 修复：把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。
  EN Fix: Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.

### 中 / MEDIUM (6)

- **中 / MEDIUM** `install.hook-runs-shell-code` — 安装期钩子执行的不只是构建 / Lifecycle hook runs more than a build
  中 该钩子命令不属于常见的编译与拷贝步骤，安装这个包时会以用户权限运行任意代码，而这一切发生在任何人来得及检查之前。
  EN This hook command is not one of the usual compile-and-copy steps, so installing the package runs arbitrary code with the user's privileges before anything can be inspected.
  - `package.json:66` — `"prepare": "pnpm run build && simple-git-hooks",`
  - `package.json:89` — `"prepublishOnly": "pnpm run build && pnpm run test"`
  中 修复：把钩子收敛为 `tsc` 或 `npm run build` 之类的构建命令，或把这项工作移到一个由用户主动执行的显式脚本里。
  EN Fix: Reduce the hook to a build command such as `tsc` or `npm run build`, or move the work into an explicit script the user chooses to run.
- **中 / MEDIUM** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 18 distinct remote hosts (example.com, gateway.example, github.com, insider-npm-registry.univer.work, opencollective.com, registry.npmjs.org, univer.ai, www.apache.org, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `.github/workflows/release.yml:46` — `https://registry.npmjs.org`
  - `.npmrc:1` — `https://insider-npm-registry.univer.work/`
  - `LICENSE:4` — `http://www.apache.org/licenses/`
  - `package.json:38` — `https://opencollective.com/univer`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `src/gateway-app/contract/gateway-descriptor.ts:187` — `http://gateway.example/uf/file`
  - `src/gateway-app/gateway-entry.ts:19` — `http://127.0.0.1:${server.port`
  - `src/gateway-app/main.ts:16` — `http://127.0.0.1:${server.port`
  - `src/gateway-app/transport/http.ts:822` — `http://${req.headers.host`
  - ……另有 14 处 / … and 14 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `obf.long-minified-line` — 整行是压缩或机器生成的数据块 / Line is a single minified or machine-generated blob
  中 该行超过 500 个字符且几乎没有空白，正是打包载荷、压缩字符串表或机器生成单行代码的样子。这样的一行用肉眼什么也审不出来。
  EN The line is over 500 characters with almost no whitespace, which is what a bundled payload, a packed string table or a machine-generated one-liner looks like. Nothing on such a line is reviewable by eye.
  - `scripts/generate-viewer-content-locales.mjs:141` — `return `import basesHistoryUI from "@univerjs-pro/bases-history-ui/locale/${locale}";\nimport boardsHistoryUI from "@univerjs-pro/boards-history-ui/locale/${loc…`
  - `src/client/styles/worktree.ts:4` — `.uvf_win{--uvf-accent:#5b6cff;--uvf-positive:#20a66a;pointer-events:auto;position:fixed;isolation:isolate;display:flex;flex-direction:column;min-width:1px;min-h…`
  - `src/client/styles/worktree.ts:17` — `.uvf_pulse,.uvf_dot{position:relative;width:7px;height:7px;border-radius:50%;background:var(--uvf-positive);flex:none}.uvf_pulse::after{content:"";position:abso…`
  - `src/viewer-support/render-preset/license.ts:4` — `'2088168239728517120-1-eyJpIjoiMjA4ODE2ODIzOTcyODUxNzEyMCIsInYiOiIxIiwicCI6ImtPN3hWUG5mZVFYSlY2ZjRiSk03MFk5NHdOZTZkR3VRTDNxdklqRFpZblU9IiwiZG0iOlsibG9jYWxob3N0I…`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：发布未压缩的源码，或在 README 中说明该文件由哪个构建产出、可读源码在哪里。
  EN Fix: Ship unminified source, or state in the README which build produced the file and where the readable source lives.
- **中 / MEDIUM** `supply.foreign-registry` — 仓库或 scope 覆盖指向 npmjs 之外 / Registry or scope override points away from npmjs
  中 某个 registry 或 `_authToken` 条目指向的服务器并非 npmjs。随包发布的 `.npmrc` 或 `publishConfig` 配置把解析重定向后，所有依赖拉取都会来自用户并未选择的主机。
  EN A registry or `_authToken` entry names a server that is not npmjs. A shipped `.npmrc` or `publishConfig` block that redirects resolution makes every dependency fetch come from a host the user did not choose.
  - `.npmrc:1` — `@univer-cli:registry=https://insider-npm-registry.univer.work/`
  - `.npmrc:2` — `@univerjs:registry=https://insider-npm-registry.univer.work/`
  - `.npmrc:3` — `@univerjs-pro:registry=https://insider-npm-registry.univer.work/`
  中 修复：删除该覆盖；选择仓库本就是用户自己的配置，不该由被安装的包决定。
  EN Fix: Remove the override; registry selection belongs to the user's own configuration, not to the package being installed.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 2 shipped file(s) are 64 KiB or larger and were not read as text, the largest being docs/assets/readme/spreadsheet-request.png at 417 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `docs/assets/readme/spreadsheet-request.png` — `427313 bytes not decoded as text`
  - `pnpm-lock.yaml:4568` — `undici-types@7.18.2:`
  - `pnpm-lock.yaml:4571` — `undici-types@8.3.0:`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (1)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `scripts/verify-public-runtime-dependencies.mjs:107` — `userConfig: join(temporaryRoot, 'empty-user.npmrc'),`
  - `scripts/verify-public-runtime-dependencies.mjs:108` — `globalConfig: join(temporaryRoot, 'empty-global.npmrc')`
  - `src/host/telemetry/product-telemetry.ts:104` — `const env = input.env ?? process.env`
  - `src/host/telemetry/product-telemetry.ts:118` — `const env = input.env ?? process.env`
  - ……另有 5 处 / … and 5 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.

_按类别 / By category:_ 网络回调 / network callbacks 5 · 混淆 / obfuscation 3 · 凭据读取 / credential access 2 · 供应链 / supply chain 2 · 数据外传 / exfiltration 1 · 提示注入 / prompt injection 1 · 安装脚本 / install scripts 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `dsh-univer-office-HEAD/`
- skipped docs/assets/readme/chart-and-formatting.png: 642647 bytes exceeds the 524288-byte per-file cap
- skipped docs/assets/readme/live-worktree.png: 601173 bytes exceeds the 524288-byte per-file cap
- skipped docs/assets/readme/presentation-live.png: 761592 bytes exceeds the 524288-byte per-file cap
- skipped docs/assets/readme/presentation-request.png: 602390 bytes exceeds the 524288-byte per-file cap
- skipped docs/assets/readme/presentation-review.png: 681101 bytes exceeds the 524288-byte per-file cap
- skipped docs/assets/readme/review-result.png: 601955 bytes exceeds the 524288-byte per-file cap
- skipped docs/assets/readme/univer-deepseek-banner.png: 1000878 bytes exceeds the 524288-byte per-file cap
- not scanned (binary, contents unreadable as text): docs/assets/readme/nike-presentation-demo.png, docs/assets/readme/spreadsheet-request.png
- outbound fetching was permitted for this audit
- grade forced to D by a critical finding: exfil.environment-harvest-then-callback — Environment harvest and an outbound request in the same package
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
