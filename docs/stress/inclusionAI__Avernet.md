> 批量压测 / Batch stress test · ★ 555 · `inclusionAI/Avernet#src/bcs/crates/plugins/deepseek-harness-channel-bcn`
> https://github.com/inclusionAI/Avernet/tree/dev/src/bcs/crates/plugins/deepseek-harness-channel-bcn · audited in 13.7s
# 安装前体检 / Pre-install audit: @avernet-plugin/deepseek-harness-channel-bcn@0.1.0

**信任评级 / Trust grade: C** (评分 / score 52/100 — 有值得注意的风险信号，确认后再安装 / notable risk signals, install only with intent)

- 来源 / Source: `https://codeload.github.com/inclusionAI/Avernet/tar.gz/HEAD` (URL / url)
- 已分析文件：30 个（168.2 KiB） / Files analysed: 30 (168.2 KiB)
- 内容摘要 / Content digest: `faa521f34ce2f198c7d1c350498a73a2…`
- 体检时间 / Audited at: 2026-09-20T09:52:56.950Z

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

发布期钩子（维护者打包或发布时运行，安装时不会执行）： / Publish-time hooks (run when the maintainer packs or publishes, not on install):

- `prepack`: `npm run build`

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `node:fs/promises`, `\n`
- **写入的文件路径 / File paths written:** `node:fs/promises`, `\\n`, `cordis.patch.yml`
- **派生的命令 / Commands spawned:** `node:child_process`, `--profile`, `--dump-config`, `bash`, `-n`, `utf8`, `/bin/bash`
- **连接的域名 / Domains contacted:** `www.apache.org`, `github.com`, `registry.npmjs.org`, `127.0.0.1`, `bcn.example.com`, `bcn.example.test`, `private.example.test`, `mixed.example.test`, `loopback-alias.example.test`, `example.com`, `127.0.0.1:${address.port`
- **读取的环境变量 / Environment variables read:** `DSH_HOME`, `CALL_LOG`, `BCN_ONBOARDING_TOKEN`, `PATH`

## 发现 / Findings

### 高 / HIGH (2)

- **高 / HIGH** `net.covert-channel` — 通过 websocket 或 DNS 查询回连 / Beacons over a websocket or DNS lookup
  中 该行打开了 websocket，或通过 `dns.*` 或 DNS 工具解析某个域名。两者都能在不像是 HTTP 请求的情况下传递数据，而 DNS 尤其通常被所有防火墙和代理放行。
  EN The line opens a websocket or resolves a literal domain through `dns.*` or a DNS tool. Both carry data without looking like an HTTP request, and DNS in particular is normally permitted through every firewall and proxy.
  - `src/ws-client.ts:263` — `const socket = new WebSocket(this.options.endpoint.webSocketUrl, {`
  - `test/endpoint.test.ts:10` — `assert.equal(http.webSocketUrl.toString(), 'ws://bcn.example.test/api/ws/bot');`
  - `test/endpoint.test.ts:11` — `assert.equal(https.webSocketUrl.toString(), 'wss://bcn.example.test/bcn/ws/bot');`
  - `test/endpoint.test.ts:40` — `assert.equal(endpoint.webSocketUrl.toString(), 'ws://127.0.0.1:8787/bcn/ws/bot');`
  中 修复：改用发往文档中说明的端点的普通 HTTPS 请求，让流量可以被检查和记录。
  EN Fix: Use ordinary HTTPS requests to a documented endpoint so that the traffic can be inspected and logged.
- **高 / HIGH** `persist.global-self-install` — 全局安装依赖包 / Installs a package globally
  中 该命令把包安装到全局前缀，于是用户的 PATH 上多出一个可执行文件，而且当前项目删除后它仍然留在那里。
  EN The command installs a package into the global prefix, which puts a new executable on the user's PATH and keeps it there after the current project is deleted.
  - `install-dsh.sh:74` — `npm install --global`
  - `test/configure.test.ts:151` — `npm install --global`
  中 修复：改为本地安装，并通过项目自身的脚本调用该工具；全局安装应由用户自己决定，而不是由插件代劳。
  EN Fix: Install locally and invoke the tool through the project's own scripts; global installs belong to the user's decision, not to a plugin.

### 低 / LOW (6)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `src/configure.ts:64` — `const profile = options.profile.trim();`
  - `src/configure.ts:244` — `process.stdout.write(`Configured BCN channel for DSH profile ${result.profile}.\n`);`
  - `src/ws-client.ts:448` — `const envRecord = payload.env === undefined ? undefined : asRecord(payload.env);`
  - `src/ws-client.ts:449` — `if (payload.env !== undefined && !envRecord) throw new Error('BCN bot.connect returned an invalid env map');`
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `cred.many-secret-env-vars` — 读取多个不同名称的密钥类环境变量 / Reads several differently-named secret environment variables
  中 这里的一行、或整个包里的若干行，读取了名称看起来像凭据的环境变量。只读一个文档中声明的 key 是插件本该有的认证方式；枚举多个不同名称的密钥，则是在收集凭据而不是在使用凭据。
  EN One line here, or several across the package, read environment variables whose names look like credentials. Reading a single documented key is how a plugin is meant to authenticate; enumerating many differently-named ones is how credentials are gathered rather than used.
  - `test/configure.test.ts:90` — `process.env.BCN_ONBOARDING_TOKEN`
  中 修复：只保留插件确实需要且有文档说明的变量，删掉与任何功能无关的密钥读取。
  EN Fix: Keep to the variables this plugin documents and needs, and delete reads of keys it has no feature for.
- **低 / LOW** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `test/bridge.test.ts:518` — `data: { turn: 1, step: 1, callId: 'shared-call-id', name: 'shell', arguments: '{unfinished' },`
  - `test/ws-client.test.ts:131` — `data: { phase: 'start', toolCallId: 'call-1', name: 'read', args: {} },`
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.
- **低 / LOW** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `test/configure.test.ts:24` — `http://127.0.0.1:21000/api`
  - `test/configure.test.ts:35` — `http://127.0.0.1:21000/api/`
  - `test/configure.test.ts:61` — `http://127.0.0.1:21000/`
  - `test/configure.test.ts:76` — `http://127.0.0.1:21000/`
  - ……另有 6 处 / … and 6 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **低 / LOW** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `test/configure.test.ts:24` — `endpoint: 'http://127.0.0.1:21000/api',`
  - `test/configure.test.ts:35` — `assert.equal(first.endpoint, 'http://127.0.0.1:21000/api/');`
  - `test/configure.test.ts:61` — `endpoint: 'http://127.0.0.1:21000/',`
  - `test/configure.test.ts:76` — `endpoint: 'http://127.0.0.1:21000/',`
  - ……另有 10 处 / … and 10 more location(s)
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **低 / LOW** `net.token-or-blob-in-url` — 把凭据或编码数据块放进 URL / Puts a credential or encoded blob in a URL
  中 令牌形状的查询参数、内嵌的 `user:password` 授权部分，或超长高熵的查询值，都意味着密钥或载荷数据在 URL 中传输，最终会留在访问日志、代理和浏览器历史里。
  EN A token-shaped query parameter, an embedded `user:password` authority, or a long high-entropy query value means secret material or payload data travels in a URL, where it lands in access logs, proxies and browser history.
  - `test/endpoint.test.ts:41` — `'https://«redacted»@example.com'`
  - `test/endpoint.test.ts:42` — `'https://example.com?token=secret'`
  中 修复：凭据放在 Authorization 头里发送，载荷用 POST 放在请求体中，不要编码进查询字符串。
  EN Fix: Send credentials in an Authorization header, and POST payloads in the body rather than encoding them into the query string.

_按类别 / By category:_ 网络回调 / network callbacks 4 · 凭据读取 / credential access 2 · 持久化 / persistence 1 · 滥用宿主环境 / harness abuse 1

## 扫描说明 / Scan notes

- scoped to the subdirectory `src/bcs/crates/plugins/deepseek-harness-channel-bcn/`
- stripped the archive's single top-level directory `Avernet-HEAD/`
- outbound fetching was permitted for this audit

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
