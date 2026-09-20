> 批量压测 / Batch stress test · ★ 326 · `vlln/whale-girl`
> https://github.com/vlln/whale-girl · audited in 4.1s
# 安装前体检 / Pre-install audit: whale-girl-desktop@0.1.0

**信任评级 / Trust grade: D** (评分 / score 25/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

- 来源 / Source: `https://codeload.github.com/vlln/whale-girl/tar.gz/HEAD` (URL / url)
- 已分析文件：230 个（4.4 MiB） / Files analysed: 230 (4.4 MiB)
- 内容摘要 / Content digest: `e84999a1fdbc6d660a073eb8e95a79cf…`
- 体检时间 / Audited at: 2026-09-20T09:53:18.286Z

## 最严重的风险 / Most severe risk

**向裸 IP 地址发送请求 / Sends a request to a bare IP address** `net.raw-ip-destination`

中 它会建立出站连接，因此可以在你无法选择的时机接收指令或送出数据。
EN It opens an outbound connection, so it can receive instructions or send data at a moment you do not choose.

该包会访问的目标：`127.0.0.1`、`github.com`、`json-schema.org`、`*.mydomain.dev`、`urlpattern.spec.whatwg.org`、`mydomain.dev`、`schema.tauri.app`、`127.0.0.1:${port` / Destinations this package reaches: `127.0.0.1`, `github.com`, `json-schema.org`, `*.mydomain.dev`, `urlpattern.spec.whatwg.org`, `mydomain.dev`, `schema.tauri.app`, `127.0.0.1:${port`

决定该评级的规则命中于 `desktop/lib/src/config.mjs:12`；完整列表见下方「发现」。 / The rule that decided the grade fired at `desktop/lib/src/config.mjs:12`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

发布期钩子（维护者打包或发布时运行，安装时不会执行）： / Publish-time hooks (run when the maintainer packs or publishes, not on install):

- `prepublishOnly`: `npm test`

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `client.js`, `lib/client.js`, `config.mjs`, `lib/src/config.mjs`, `index.mjs`, `lib/client/index.mjs`, `run.mjs`, `.test.mjs`, `\n`, `routes.mjs`, `lib/src/routes.mjs`, `a.png` （另有 1 项） / (+1 more)
- **写入的文件路径 / File paths written:** `lib/client`, `index.mjs`, `lib/client/index.mjs`, `client.js`, `lib/client.js`, `eat.png`, `lib/assets/eat.png`, `idle.png`, `lib/assets/idle.png`, `walk.png`, `lib/assets/walk.png`, `run.mjs` （另有 4 项） / (+4 more)
- **派生的命令 / Commands spawned:** `node:child_process`, `inherit`, `utf8`, `--headless=new`, `--disable-gpu`, `--no-sandbox`, `--remote-debugging-port=${DEBUG_PORT}`, `--window-size=1280,800`, `ignore`
- **连接的域名 / Domains contacted:** `127.0.0.1`, `github.com`, `json-schema.org`, `*.mydomain.dev`, `urlpattern.spec.whatwg.org`, `mydomain.dev`, `schema.tauri.app`, `127.0.0.1:${port`, `dsh.internal`, `https:`, `example.com`, `127.0.0.1:${debug_port` （另有 3 项） / (+3 more)
- **读取的环境变量 / Environment variables read:** `process.env (every variable)`, `WG_LIVE`, `DSH_HOME`, `DSH_CHECKOUT`, `CHROME_BIN`

## 发现 / Findings

### 高 / HIGH (2)

- **高 / HIGH** `net.covert-channel` — 通过 websocket 或 DNS 查询回连 / Beacons over a websocket or DNS lookup
  中 该行打开了 websocket，或通过 `dns.*` 或 DNS 工具解析某个域名。两者都能在不像是 HTTP 请求的情况下传递数据，而 DNS 尤其通常被所有防火墙和代理放行。
  EN The line opens a websocket or resolves a literal domain through `dns.*` or a DNS tool. Both carry data without looking like an HTTP request, and DNS in particular is normally permitted through every firewall and proxy.
  - `scripts/verify-client-behavior.mjs:30` — `if (page) { ws = new WebSocket(page.webSocketDebuggerUrl); break }`
  - `scripts/verify-client-smoke.mjs:63` — `if (page) { ws = new WebSocket(page.webSocketDebuggerUrl); break }`
  中 修复：改用发往文档中说明的端点的普通 HTTPS 请求，让流量可以被检查和记录。
  EN Fix: Use ordinary HTTPS requests to a documented endpoint so that the traffic can be inspected and logged.
- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `desktop/lib/src/config.mjs:12` — `baseURL: 'http://127.0.0.1:3080',`
  - `desktop/test/contract.test.mjs:191` — `const sse = createSSEClient(`http://127.0.0.1:${port}/events`)`
  - `desktop/test/contract.test.mjs:293` — `assert.equal(c.baseURL, 'http://127.0.0.1:3080')`
  - `scripts/verify-client-behavior.mjs:28` — `const tabs = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`)).json()`
  - ……另有 4 处 / … and 4 more location(s)
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.

### 中 / MEDIUM (5)

- **中 / MEDIUM** `install.dependency-manifest-hook` — 随包携带的清单声明了安装钩子 / Bundled manifest declares install hooks
  中 非包根目录的清单声明了生命周期钩子。从这棵目录树安装的内置或嵌套依赖会运行自己的安装脚本，却不会像已发布依赖那样经过仓库审查。
  EN A manifest other than the package root declares lifecycle hooks. A vendored or nested dependency installed from this tree runs its own install scripts without the registry review that a published dependency would have had.
  - `desktop/package.json:26` — `"prepublishOnly": "npm test"`
  中 修复：通过锁文件从仓库安装嵌套依赖，并删除自带钩子的内置清单。
  EN Fix: Install nested dependencies from the registry with a lockfile, and delete vendored manifests that carry their own hooks.
- **中 / MEDIUM** `install.hook-runs-shell-code` — 安装期钩子执行的不只是构建 / Lifecycle hook runs more than a build
  中 该钩子命令不属于常见的编译与拷贝步骤，安装这个包时会以用户权限运行任意代码，而这一切发生在任何人来得及检查之前。
  EN This hook command is not one of the usual compile-and-copy steps, so installing the package runs arbitrary code with the user's privileges before anything can be inspected.
  - `desktop/package.json:26` — `"prepublishOnly": "npm test"`
  中 修复：把钩子收敛为 `tsc` 或 `npm run build` 之类的构建命令，或把这项工作移到一个由用户主动执行的显式脚本里。
  EN Fix: Reduce the hook to a build command such as `tsc` or `npm run build`, or move the work into an explicit script the user chooses to run.
- **中 / MEDIUM** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 13 distinct remote hosts (*.mydomain.dev, 127.0.0.1:${port, github.com, https:, json-schema.org, mydomain.dev, schema.tauri.app, urlpattern.spec.whatwg.org, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `desktop/package.json:33` — `https://github.com/vlln/whale-girl.git`
  - `desktop/src-tauri/Cargo.lock:8` — `registry+https://github.com/rust-lang/crates.io-index`
  - `desktop/src-tauri/gen/schemas/desktop-schema.json:2` — `http://json-schema.org/draft-07/schema#`
  - `desktop/src-tauri/gen/schemas/desktop-schema.json:57` — `https://*.mydomain.dev`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `desktop/lib/src/config.mjs:12` — `http://127.0.0.1:3080`
  - `desktop/test/contract.test.mjs:191` — `http://127.0.0.1:${port`
  - `desktop/test/contract.test.mjs:293` — `http://127.0.0.1:3080`
  - `scripts/gates/verify-md-links.mjs:11` — `http://https://mailto:data:tel:`
  - ……另有 6 处 / … and 6 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 22 shipped file(s) are 64 KiB or larger and were not read as text, the largest being lib/assets/characters/whale-girl/working.png at 224 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `lib/assets/characters/whale-girl/working.png` — `229457 bytes not decoded as text`
  - `desktop/lib/client/events.mjs:53` — `const res = await fetch(url, {`
  - `desktop/lib/client/http.mjs:16` — `async function request(method, path, body, { signal } = {}) {`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (2)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `tests/assets.test.mjs:14` — `assert.equal(sanitizeAssetPath(ASSETS_PATH + '/a/../../etc/passwd'), null)`
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `tests/sessions.test.mjs:19` — `assert.deepEqual(parseSessionEvent(ev('tool/call', { turn: 1, step: 1, callId: 'c', name: 'bash', arguments: '{}' })),`
  - `tests/sessions.test.mjs:20` — `{ kind: 'activity', value: 'tool:bash' })`
  - `tests/sessions.test.mjs:21` — `assert.deepEqual(parseSessionEvent(ev('tool/call', { turn: 1, step: 1, callId: 'c', name: 'read', arguments: '{}' })),`
  - `tests/sessions.test.mjs:22` — `{ kind: 'activity', value: 'tool:read' })`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.

_按类别 / By category:_ 网络回调 / network callbacks 4 · 安装脚本 / install scripts 2 · 供应链 / supply chain 1 · 凭据读取 / credential access 1 · 滥用宿主环境 / harness abuse 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `whale-girl-HEAD/`
- not scanned (binary): desktop/src-tauri/icons/icon.png, docs/preview/celebrate.gif, docs/preview/disappointed.gif, docs/preview/drag.gif, docs/preview/eat.gif and 27 more
- outbound fetching was permitted for this audit
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
