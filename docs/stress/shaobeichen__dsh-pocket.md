> 批量压测 / Batch stress test · ★ 1236 · `shaobeichen/dsh-pocket`
> https://github.com/shaobeichen/dsh-pocket · audited in 1.0s
# 安装前体检 / Pre-install audit: dsh-pocket@2.10.6

**信任评级 / Trust grade: D** (评分 / score 3/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

- 来源 / Source: `https://codeload.github.com/shaobeichen/dsh-pocket/tar.gz/HEAD` (URL / url)
- 已分析文件：63 个（1.4 MiB） / Files analysed: 63 (1.4 MiB)
- 内容摘要 / Content digest: `54c4d32b9b7fa3d2b15f982ed498a4db…`
- 体检时间 / Audited at: 2026-09-20T09:52:13.032Z

## 最严重的风险 / Most severe risk

**文档中包含针对模型的指令 / Documentation contains instructions aimed at a model** `prompt.doc-instruction`

中 它夹带了写给 agent 而不是写给人看的文字——试图在你不察觉的情况下改变 agent 行为的指令。
EN It carries text aimed at the agent rather than at a person — instructions that try to change what the agent does without telling you.

该包会访问的目标：`${lan`、`127.0.0.1`、`registry.npmjs.org`、`github.com`、`127.0.0.1:3081（代理端口）。地址固定，重启不再变化。`、`127.0.0.1:${dshport`、`dsh.invalid`、`x` / Destinations this package reaches: `${lan`, `127.0.0.1`, `registry.npmjs.org`, `github.com`, `127.0.0.1:3081（代理端口）。地址固定，重启不再变化。`, `127.0.0.1:${dshport`, `dsh.invalid`, `x`

- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.

决定该评级的规则命中于 `README.en.md:116`；完整列表见下方「发现」。 / The rule that decided the grade fired at `README.en.md:116`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `node:fs/promises`, `.dsh`, `settings.yaml`, `~/.dsh/settings.yaml`, `/proc/version`, `../lib/index.js`, `../client/mobile/fileGuard.ts`, `../client/mobile/mobile-apply.tsx`, `../client/mobile/mobile.css.ts`, `../client/client.js`, `POCKET_ENDPOINTS.fileRead`, `../client/index.jsx` （另有 2 项） / (+2 more)
- **写入的文件路径 / File paths written:** `node:fs/promises`, `@@HOMEBREW_PREFIX@@/lib/ld.so\x00fake-binary`, `restarted.json`, `dsh-pocket/restarted.json`
- **派生的命令 / Commands spawned:** `node:child_process`, `dsh`, `plugin`, `--profile`, `update`, `dsh-pocket`, `--latest`, `-w`, `const { spawn } = require('node:child_process')`, `      const child = spawn(file, args, { cwd, detached: true, stdio: ["ignore", out, err], env: process.env })`, `tar`, `-xzf` （另有 39 项） / (+39 more)
- **连接的域名 / Domains contacted:** `${lan`, `127.0.0.1`, `registry.npmjs.org`, `github.com`, `127.0.0.1:3081（代理端口）。地址固定，重启不再变化。`, `127.0.0.1:${dshport`, `dsh.invalid`, `x`, `xtoken`, `${authority`, `…trycloudflare.com`, `${cfg.hostname` （另有 44 项） / (+44 more)
- **读取的环境变量 / Environment variables read:** `process.env (every variable)`, `DSH_POCKET_CLIENT_ID`, `NODE_ENV`, `DSH_HOME`, `DSH_POCKET_CLOUDFLARED`, `WSL_DISTRO_NAME`, `WSL_INTEROP`, `WSLENV`

## 发现 / Findings

### 高 / HIGH (3)

- **高 / HIGH** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 52 distinct remote hosts (${lan, 127.0.0.1:${dshport, 127.0.0.1:3081（代理端口）。地址固定，重启不再变化。, dsh.invalid, github.com, registry.npmjs.org, x, xtoken, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `bin/dsh-pocket.mjs:165` — `http://${lan`
  - `client/client.js:2169` — `https://registry.npmjs.org/dsh-pocket/latest`
  - `client/client.js:2452` — `https://github.com/shaobeichen/dsh-pocket`
  - `client/mobile/LICENSE.dsh-web-mobile:2` — `https://github.com/mexiaosqwq/dsh-web-mobile`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `client/client.js:1966` — `"namedHow": "\u5728 Cloudflare Zero Trust \u2192 Networks \u2192 Tunnels \u521B\u5EFA\u96A7\u9053\u5E76\u590D\u5236 Token\uFF1B\u628A\u57DF\u540D\u7684 Service …`
  - `client/client.js:2064` — `"namedHow": "Create a tunnel in Cloudflare Zero Trust \u2192 Networks \u2192 Tunnels and copy the token; point the hostname's Service at http://127.0.0.1:3081 (…`
  - `client/pocket-locales.js:88` — `'namedHow': '在 Cloudflare Zero Trust → Networks → Tunnels 创建隧道并复制 Token；把域名的 Service 指向 http://127.0.0.1:3081（代理端口）。地址固定，重启不再变化。',`
  - `client/pocket-locales.js:188` — `'namedHow': 'Create a tunnel in Cloudflare Zero Trust → Networks → Tunnels and copy the token; point the hostname\'s Service at http://127.0.0.1:3081 (the proxy…`
  - ……另有 34 处 / … and 34 more location(s)
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **高 / HIGH** `prompt.doc-instruction` — 文档中包含针对模型的指令 / Documentation contains instructions aimed at a model
  中 随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。
  EN A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.
  - `README.en.md:116` — `- **Read and accept the security disclaimer before enabling public access** (the dialog shows on every enable; the server enforces it, so it can't be bypassed):…`
  - `README.en.md:121` — `- **Public detection is fail-closed** (issue #66): everything except loopback and private LAN addresses is treated as **public and PIN-gated** — including any s…`
  中 修复：把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。
  EN Fix: Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.

### 中 / MEDIUM (5)

- **中 / MEDIUM** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `client/client.js:1862` — `name: "shell.overlay",`
  - `client/mobile/mobile-apply.tsx:374` — `name: 'shell.overlay',`
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.
- **中 / MEDIUM** `install.native-downloader` — 安装流程会编译或下载原生产物 / Install path builds or downloads a native artifact
  中 依赖包在安装期间编译原生代码或拉取预编译二进制文件，于是最终在本机被执行的不是被审查过的源码。
  EN The package compiles native code or fetches a prebuilt binary during install, so bytes that are not the reviewed source end up executed on this machine.
  - `package-lock.json:3006` — `"node-gyp",`
  - `package-lock.json:3085` — `"node-gyp": "^11.5.0",`
  - `package-lock.json:3247` — `"@npmcli/node-gyp": "^4.0.0",`
  - `package-lock.json:3422` — `"node_modules/npm/node_modules/@npmcli/node-gyp": {`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：优先使用纯实现；若必须使用预编译产物，则内置该产物并记录其摘要，而不是在安装时下载。
  EN Fix: Prefer a pure implementation, or vendor the prebuilt artifact with a recorded digest instead of downloading it at install time.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `bin/dsh-pocket.mjs:165` — `http://${lan`
  - `client/client.js:1966` — `http://127.0.0.1:3081\uFF08\u4EE3\u7406\u7AEF\u53E3\uFF09\u3002\u5730\u5740\u56FA\u5B9A\uFF0C\u91CD\u542F\u4E0D\u518D\u53D8\u5316\u3002`
  - `client/client.js:2064` — `http://127.0.0.1:3081`
  - `client/pocket-locales.js:88` — `http://127.0.0.1:3081（代理端口）。地址固定，重启不再变化。`
  - ……另有 39 处 / … and 39 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `obf.long-minified-line` — 整行是压缩或机器生成的数据块 / Line is a single minified or machine-generated blob
  中 该行超过 500 个字符且几乎没有空白，正是打包载荷、压缩字符串表或机器生成单行代码的样子。这样的一行用肉眼什么也审不出来。
  EN The line is over 500 characters with almost no whitespace, which is what a bundled payload, a packed string table or a machine-generated one-liner looks like. Nothing on such a line is reviewable by eye.
  - `client/client.js:1918` — `"resetBody": "\u5C06\u6E05\u7A7A\u5E76\u6062\u590D\u9ED8\u8BA4\uFF1A\n\u2460 \u5F00\u5173\uFF1A\u5C40\u57DF\u7F51\u8BBF\u95EE=\u5F00\u3001\u8BBF\u95EE\u5BC6\u78…`
  - `client/client.js:1972` — `"disclaimerBody": "\u5F00\u542F\u516C\u7F51 = \u628A\u672C\u673A DSH\uFF08\u80FD\u6267\u884C\u4EE3\u7801\uFF09\u66B4\u9732\u5230\u4E92\u8054\u7F51\u3002\u4EFB\u…`
  - `lib/proxy.mjs:31` — `!function(){try{if(self.AbortSignal&&!self.AbortSignal.any){self.AbortSignal.any=function(signals){var controller=new AbortController();var list=Array.from(sign…`
  - `lib/proxy.mjs:52` — `export const TRANSPORT_API_CLIENT_SHIM = `<script data-dsh-pocket-transport-shim="1">!function(){try{var K='__DSH_TRANSPORT__',cur=globalThis[K];function patch(…`
  中 修复：发布未压缩的源码，或在 README 中说明该文件由哪个构建产出、可读源码在哪里。
  EN Fix: Ship unminified source, or state in the README which build produced the file and where the readable source lives.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 3 shipped file(s) are 64 KiB or larger and were not read as text, the largest being docs/banner.jpg at 134 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `docs/banner.jpg` — `137533 bytes not decoded as text`
  - `client/client.js:2169` — `const meta = await (await fetch("https://registry.npmjs.org/dsh-pocket/latest", { cache: "no-store" })).json();`
  - `client/index.jsx:119` — `const meta = await (await fetch('https://registry.npmjs.org/dsh-pocket/latest', { cache: 'no-store' })).json();`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (4)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `lib/proxy.mjs:189` — `function parseCookies(header) {`
  - `lib/proxy.mjs:419` — `const cookies = parseCookies(req.headers.cookie);`
  - `lib/proxy.mjs:444` — `if (parseCookies(req.headers.cookie)[TOKEN_COOKIE]) return; // 已有 cookie 就不重复种`
  - `lib/web-rpc.js:435` — `const result = await runUpdate.perform(payload?.profile ?? 'web');`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `net.covert-channel` — 通过 websocket 或 DNS 查询回连 / Beacons over a websocket or DNS lookup
  中 该行打开了 websocket，或通过 `dns.*` 或 DNS 工具解析某个域名。两者都能在不像是 HTTP 请求的情况下传递数据，而 DNS 尤其通常被所有防火墙和代理放行。
  EN The line opens a websocket or resolves a literal domain through `dns.*` or a DNS tool. Both carry data without looking like an HTTP request, and DNS in particular is normally permitted through every firewall and proxy.
  - `test/local/lan-public-access.test.js:129` — `const r = await wsResult(`ws://${lanIp}:${proxy.port}/`);`
  - `test/proxy.test.js:155` — `const ws = new WebSocket(`ws://127.0.0.1:${proxy.port}/api/events.host`);`
  - `test/proxy.test.js:233` — `const ws = new WebSocket(`ws://127.0.0.1:${proxy.port}/api/events.host`, [], {`
  - `test/proxy.test.js:259` — `const ws = new WebSocket(`ws://127.0.0.1:${proxy.port}/api/events.host`, [], { headers: { Origin: 'http://x' } });`
  中 修复：改用发往文档中说明的端点的普通 HTTPS 请求，让流量可以被检查和记录。
  EN Fix: Use ordinary HTTPS requests to a documented endpoint so that the traffic can be inspected and logged.
- **低 / LOW** `net.token-or-blob-in-url` — 把凭据或编码数据块放进 URL / Puts a credential or encoded blob in a URL
  中 令牌形状的查询参数、内嵌的 `user:password` 授权部分，或超长高熵的查询值，都意味着密钥或载荷数据在 URL 中传输，最终会留在访问日志、代理和浏览器历史里。
  EN A token-shaped query parameter, an embedded `user:password` authority, or a long high-entropy query value means secret material or payload data travels in a URL, where it lands in access logs, proxies and browser history.
  - `test/cli-auth.test.js:90` — `'http://192.168.1.20:3081/?token=12345678'`
  - `test/cli-auth.test.js:90` — `?token=12345678`
  - `test/cli-auth.test.js:93` — `'https://foo.trycloudflare.com/?token=12345678'`
  - `test/cli-auth.test.js:96` — `'http://1.2.3.4:3081/?token=a+b%26c%3Dd'`
  - ……另有 13 处 / … and 13 more location(s)
  中 修复：凭据放在 Authorization 头里发送，载荷用 POST 放在请求体中，不要编码进查询字符串。
  EN Fix: Send credentials in an Authorization header, and POST payloads in the body rather than encoding them into the query string.
- **低 / LOW** `obf.dynamic-code-eval` — 执行运行时拼装出来的代码 / Evaluates code built at runtime
  中 该行执行的是一个并非源码字面量的表达式，真正运行的代码在插件运行时才被拼装出来，无法在 tarball 中审查。
  EN The line evaluates an expression that is not a source literal, so the executed code is assembled while the plugin runs and cannot be reviewed in the tarball.
  - `test/service.test.js:351` — `vm.compileFunction(code, [], { filename: 'restart-helper.js' });`
  中 修复：用静态函数或数据表替代动态求值；任何审计都无法为运行时才存在的代码背书。
  EN Fix: Replace the dynamic evaluation with a static function or a data table; there is no audit that can vouch for code that does not exist until runtime.

_按类别 / By category:_ 网络回调 / network callbacks 5 · 混淆 / obfuscation 2 · 提示注入 / prompt injection 1 · 滥用宿主环境 / harness abuse 1 · 安装脚本 / install scripts 1 · 供应链 / supply chain 1 · 凭据读取 / credential access 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `dsh-pocket-HEAD/`
- not scanned (binary): docs/banner.jpg, docs/dark-theme-bug.png, docs/dark-theme-fixed.png, docs/entry.jpg, docs/interface.jpg and 2 more
- outbound fetching was permitted for this audit
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
