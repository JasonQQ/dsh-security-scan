> 批量压测 / Batch stress test · ★ 698 · `Lum1104/dsh-browser#packages/browser/bridge-browser`
> https://github.com/Lum1104/dsh-browser/tree/main/packages/browser/bridge-browser · audited in 3.0s
# 安装前体检 / Pre-install audit: @yuxianglin/dsh-bridge-browser@0.0.5

**信任评级 / Trust grade: D** (评分 / score 15/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

- 来源 / Source: `https://codeload.github.com/Lum1104/dsh-browser/tar.gz/HEAD` (URL / url)
- 已分析文件：56 个（654.1 KiB） / Files analysed: 56 (654.1 KiB)
- 内容摘要 / Content digest: `f724e1e4a169e35c6eee1033726fcb0b…`
- 体检时间 / Audited at: 2026-09-20T09:52:37.228Z

## 最严重的风险 / Most severe risk

**文档中包含针对模型的指令 / Documentation contains instructions aimed at a model** `prompt.doc-instruction`

中 它夹带了写给 agent 而不是写给人看的文字——试图在你不察觉的情况下改变 agent 行为的指令。
EN It carries text aimed at the agent rather than at a person — instructions that try to change what the agent does without telling you.

该包会访问的目标：`istanbul.js.org`、`127.0.0.1:${ctx.httpserver.port`、`dsh.internal`、`127.0.0.1:${ctx.webserver.port`、`127.0.0.1`、`example.com`、`test-extension-id`、`127.0.0.1:${port` / Destinations this package reaches: `istanbul.js.org`, `127.0.0.1:${ctx.httpserver.port`, `dsh.internal`, `127.0.0.1:${ctx.webserver.port`, `127.0.0.1`, `example.com`, `test-extension-id`, `127.0.0.1:${port`

- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.

决定该评级的规则命中于 `README.md:34`；完整列表见下方「发现」。 / The rule that decided the grade fired at `README.md:34`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `node:fs/promises`, `src/client.js`, `lib/client.js`, `workspace/follow`, `manifest.json`, `session.lock`, `session.jsonl.zstd`, `session.v3.jsonl.zstd`
- **写入的文件路径 / File paths written:** `node:fs/promises`, `src/client.js`, `lib/client.js`, `session.jsonl.zstd`, `session.lock`, `session.v3.jsonl.zstd`
- **派生的命令 / Commands spawned:** `node:child_process`, `--input-type=module`, `-e`
- **连接的域名 / Domains contacted:** `istanbul.js.org`, `127.0.0.1:${ctx.httpserver.port`, `dsh.internal`, `127.0.0.1:${ctx.webserver.port`, `127.0.0.1`, `example.com`, `test-extension-id`, `127.0.0.1:${port`, `127.0.0.1:${string(port`, `${extensionid`, `relay.example`, `per-install-uuid` （另有 5 项） / (+5 more)
- **读取的环境变量 / Environment variables read:** `DSH_EXT_TOKEN`, `DSH_BROWSER_SESSION_WORKSPACE`, `PLAYWRIGHT_CHROMIUM_PATH`, `HOME`

## 发现 / Findings

### 高 / HIGH (4)

- **高 / HIGH** `net.covert-channel` — 通过 websocket 或 DNS 查询回连 / Beacons over a websocket or DNS lookup
  中 该行打开了 websocket，或通过 `dns.*` 或 DNS 工具解析某个域名。两者都能在不像是 HTTP 请求的情况下传递数据，而 DNS 尤其通常被所有防火墙和代理放行。
  EN The line opens a websocket or resolves a literal domain through `dns.*` or a DNS tool. Both carry data without looking like an HTTP request, and DNS in particular is normally permitted through every firewall and proxy.
  - `src/bridge-url.ts:50` — `if (typeof body.wsUrl === 'string' && (body.wsUrl.startsWith('ws://') || body.wsUrl.startsWith('wss://'))) {`
  - `src/client.js:54` — `&& (body.wsUrl.startsWith('ws://') || body.wsUrl.startsWith('wss://'))) {`
  - `src/index.ts:243` — `res.end(JSON.stringify({ wsUrl: `ws://127.0.0.1:${ctx.webServer.port}${BRIDGE_PATH}` }))`
  - `tests/bridge-url.spec.ts:27` — `})).toBe('wss://example.com/ext/bridge')`
  - ……另有 5 处 / … and 5 more location(s)
  中 修复：改用发往文档中说明的端点的普通 HTTPS 请求，让流量可以被检查和记录。
  EN Fix: Use ordinary HTTPS requests to a documented endpoint so that the traffic can be inspected and logged.
- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `src/index.ts:243` — `res.end(JSON.stringify({ wsUrl: `ws://127.0.0.1:${ctx.webServer.port}${BRIDGE_PATH}` }))`
  - `tests/bridge-url.spec.ts:11` — `})).toBe('ws://127.0.0.1:63566/ext/bridge')`
  - `tests/bridge-url.spec.ts:18` — `})).toBe('ws://127.0.0.1:43189/ext/bridge')`
  - `tests/bridge-url.spec.ts:34` — `JSON.stringify({ wsUrl: 'ws://127.0.0.1:43189/ext/bridge' }),`
  - ……另有 9 处 / … and 9 more location(s)
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **高 / HIGH** `prompt.doc-instruction` — 文档中包含针对模型的指令 / Documentation contains instructions aimed at a model
  中 随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。
  EN A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.
  - `README.md:34` — `$s="$env:TEMP\dsh-install.ps1"; irm https://raw.githubusercontent.com/Lum1104/dsh-browser/refs/heads/main/scripts/install.ps1 -OutFile $s; powershell -NoProfile…`
  - `README.zh.md:34` — `$s="$env:TEMP\dsh-install.ps1"; irm https://raw.githubusercontent.com/Lum1104/dsh-browser/refs/heads/main/scripts/install.ps1 -OutFile $s; powershell -NoProfile…`
  中 修复：把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。
  EN Fix: Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.
- **高 / HIGH** `prompt.embedded-instruction-string` — 源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model
  中 源码中的字符串字面量——通常是工具描述或系统提示词片段——要求模型绕过确认或对用户隐瞒某些事，于是它作为一条指令进入上下文窗口。
  EN A string literal in the source — typically a tool description or system prompt fragment — tells the model to bypass confirmation or to hide something from the user, so it lands in the context window as a directive.
  - `src/index.ts:267` — `'bridge-browser: system prompt section'`
  中 修复：如实描述工具的行为，删除那些会改变 agent 对待用户方式的指令。
  EN Fix: Describe the tool's behavior factually and remove directives that change how the agent treats the user.

### 中 / MEDIUM (1)

- **中 / MEDIUM** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 15 distinct remote hosts (${extensionid, 127.0.0.1:${ctx.httpserver.port, 127.0.0.1:${ctx.webserver.port, 127.0.0.1:${port, 127.0.0.1:${string(port, example.com, istanbul.js.org, test-extension-id, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `coverage/index.html:208` — `https://istanbul.js.org/`
  - `coverage/index.ts.html:615` — `ws://127.0.0.1:${ctx.httpServer.port`
  - `src/index.ts:243` — `ws://127.0.0.1:${ctx.webServer.port`
  - `tests/bridge-url.spec.ts:27` — `wss://example.com/ext/bridge`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.

### 低 / LOW (3)

- **低 / LOW** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `tests/bridge-url.spec.ts:42` — `http://127.0.0.1:9999`
  - `tests/bridge-url.spec.ts:45` — `http://127.0.0.1:9999/ext/bridge-config`
  - `tests/bridge-url.spec.ts:59` — `http://127.0.0.1:63566`
  - `tests/composition.spec.ts:299` — `http://127.0.0.1:${port`
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **低 / LOW** `obf.decoded-payload-literal` — 携带解码、转义或高熵字面量 / Carries a decoded, escaped or high-entropy literal
  中 一个很长的字面量会在运行时被解码（base64、`atob`、`unescape`、`decodeURIComponent`），或者写满了密集的十六进制、Unicode 转义，或者呈现出编码数据块那种近乎均匀的字符分布。
  EN A long literal is decoded at runtime (base64, `atob`, `unescape`, `decodeURIComponent`), written with dense hex or unicode escapes, or has the near-uniform character distribution of an encoded blob.
  - `coverage/prettify.js:2` — `window.PR_SHOULD_USE_CONTINUATION=true;(function(){var h=["break,continue,do,else,for,if,return,while"];var u=[h,"auto,case,char,const,default,double,enum,exter…`
  中 修复：把该值保存为可读源码，或保存为格式有文档说明的数据，让审查者能看清实际运行的到底是什么。
  EN Fix: Store the value as readable source or as data with a documented format, so a reviewer can see what is actually being run.
- **低 / LOW** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `tests/composition.spec.ts:166` — `async import(specifier: string) {`
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.

### 提示 / INFO (1)

- **提示 / INFO** `obf.long-minified-line` — 整行是压缩或机器生成的数据块 / Line is a single minified or machine-generated blob
  中 该行超过 500 个字符且几乎没有空白，正是打包载荷、压缩字符串表或机器生成单行代码的样子。这样的一行用肉眼什么也审不出来。
  EN The line is over 500 characters with almost no whitespace, which is what a bundled payload, a packed string table or a machine-generated one-liner looks like. Nothing on such a line is reviewable by eye.
  - `coverage/prettify.js:2` — `window.PR_SHOULD_USE_CONTINUATION=true;(function(){var h=["break,continue,do,else,for,if,return,while"];var u=[h,"auto,case,char,const,default,double,enum,exter…`
  - `coverage/prettify.js:2` — `break,continue,do,else,for,if,return,whileauto,case,char,const,default,double,enum,extern,float,goto,int,long,register,short,signed,sizeof,static,struct,switch,…`
  - `coverage/prettify.js:2` — `break,continue,do,else,for,if,return,while/auto,case,char,const,default,double,enum,extern,float,goto,int,long,register,short,signed,sizeof,static,struct,switch…`
  中 修复：发布未压缩的源码，或在 README 中说明该文件由哪个构建产出、可读源码在哪里。
  EN Fix: Ship unminified source, or state in the README which build produced the file and where the readable source lives.

_按类别 / By category:_ 网络回调 / network callbacks 4 · 混淆 / obfuscation 3 · 提示注入 / prompt injection 2

## 扫描说明 / Scan notes

- scoped to the subdirectory `packages/browser/bridge-browser/`
- stripped the archive's single top-level directory `dsh-browser-HEAD/`
- not scanned (binary, contents unreadable as text): coverage/favicon.png, coverage/sort-arrow-sprite.png
- outbound fetching was permitted for this audit
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
