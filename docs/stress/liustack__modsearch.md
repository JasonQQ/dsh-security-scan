> 批量压测 / Batch stress test · ★ 508 · `liustack/modsearch`
> https://github.com/liustack/modsearch · audited in 2.8s
# 安装前体检 / Pre-install audit: @liustack/modsearch@5.10.3

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/liustack/modsearch/tar.gz/HEAD` (URL / url)
- 已分析文件：125 个（2.4 MiB） / Files analysed: 125 (2.4 MiB)
- 内容摘要 / Content digest: `6d0aeaaa27abf577e926e7f2d68bb353…`
- 体检时间 / Audited at: 2026-09-20T09:52:53.770Z

## 最严重的风险 / Most severe risk

**把下载内容直接管道给 shell / Pipes a download straight into a shell** `priv.curl-pipe-shell`

中 它以超出任务所需的权限运行，因此它一旦出错，后果也更大。
EN It runs with more privilege than the task needs, so a mistake in it is larger than it should be.

该包会访问的目标：`registry.npmjs.org`、`biomejs.dev`、`api.example.com`、`localhost`、`localhostdoctor`、`example.com`、`raw.githubusercontent.com`、`play.tailwindcss.com` / Destinations this package reaches: `registry.npmjs.org`, `biomejs.dev`, `api.example.com`, `localhost`, `localhostdoctor`, `example.com`, `raw.githubusercontent.com`, `play.tailwindcss.com`

- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 它还安排了之后继续运行，所以仅仅卸载这个包并不够。
  EN It also arranges to run again later, so removing the package is not enough on its own.
- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `src/doctor.ts:118`；完整列表见下方「发现」。 / The rule that decided the grade fired at `src/doctor.ts:118`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

发布期钩子（维护者打包或发布时运行，安装时不会执行）： / Publish-time hooks (run when the maintainer packs or publishes, not on install):

- `prepublishOnly`: `pnpm build`

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `CHANGELOG.md`, `./search-schema.json`, `./fetch-schema.json`, `package.json`, `client.js`, `../dsh/client.js`, `../package.json`, `../cordis.patch.yml`
- **写入的文件路径 / File paths written:** `RELEASE_NOTES.md`, `.grok`, `auth.json`, `.grok/auth.json`
- **派生的命令 / Commands spawned:** `child_process`, `node:child_process`, `git`, `rev-parse`, `--short`, `HEAD`, `utf-8`, `pipe`, `inherit`, `lets nothing but the wrappers reach child_process`
- **连接的域名 / Domains contacted:** `registry.npmjs.org`, `biomejs.dev`, `api.example.com`, `localhost`, `localhostdoctor`, `example.com`, `raw.githubusercontent.com`, `play.tailwindcss.com`, `github.com`, `nodejs.org`, `bun.sh`, `gw.example.com` （另有 63 项） / (+63 more)
- **读取的环境变量 / Environment variables read:** `GITHUB_REF_NAME`, `process.env (every variable)`, `MODSEARCH_DSH_CLI`, `ELECTRON_RUN_AS_NODE`, `HOME`, `USERPROFILE`, `TAVILY_API_KEY`, `MODSEARCH_NESTED`, `MODSEARCH_TEST_SENTINEL`

## 发现 / Findings

### 严重 / CRITICAL (1)

- **严重 / CRITICAL** `priv.curl-pipe-shell` — 把下载内容直接管道给 shell / Pipes a download straight into a shell
  中 一步完成“拉取脚本并执行”，运行的就是远端服务器当时返回的任何内容；既没有可计算哈希、可审查、可固定版本的产物，服务器一旦被攻破就等于这台机器被攻破。
  EN Fetching a script and executing it in one step runs whatever the remote server returns at that moment; there is no artifact to hash, review or pin, and a compromise of the server becomes a compromise of this machine.
  - `src/doctor.ts:118` — `curl -fsSL https://antigravity.google/cli/install.sh | bash`
  - `src/doctor.ts:119` — `curl -fsSL https://x.ai/cli/install.sh | bash`
  中 修复：先下载产物、校验其校验和，再执行校验通过的文件；绝不要把下载内容管道给解释器。
  EN Fix: Download the artifact, verify its checksum, and execute the verified file; never pipe a download into an interpreter.

### 高 / HIGH (7)

- **高 / HIGH** `exfil.clipboard-read-then-callback` — 同一个包内既有剪贴板读取又有对外请求 / Clipboard read and an outbound request in the same package
  中 该包读取系统剪贴板，同时发起对外请求。剪贴板里有刚刚复制过的密码和令牌，而这个包里没有任何东西能解释这两种行为为何同时存在。
  EN The package reads the system clipboard and also makes outbound requests. Clipboards hold passwords and tokens that were copied moments earlier, and nothing in this package explains why the two behaviors coexist.
  - `src/main.ts:160` — `pbpaste`
  - `dsh/client.js:476` — `fetch('/modsearch/config?doctor=1')`
  - `dsh/client.js:508` — `fetch('/modsearch/config?doctor=1')`
  - `dsh/client.js:857` — `fetch('/modsearch/config', {`
  中 修复：删除剪贴板读取，或让目标地址默认不可达，并向用户说明。
  EN Fix: Remove the clipboard read, or make the destination unreachable by default and documented for the user.
- **高 / HIGH** `net.covert-channel` — 通过 websocket 或 DNS 查询回连 / Beacons over a websocket or DNS lookup
  中 该行打开了 websocket，或通过 `dns.*` 或 DNS 工具解析某个域名。两者都能在不像是 HTTP 请求的情况下传递数据，而 DNS 尤其通常被所有防火墙和代理放行。
  EN The line opens a websocket or resolves a literal domain through `dns.*` or a DNS tool. Both carry data without looking like an HTTP request, and DNS in particular is normally permitted through every firewall and proxy.
  - `src/providers/http/network.ts:123` — `resolved = await dns.lookup(hostname, { all: true, verbatim: true });`
  - `src/providers/http/network.ts:208` — `const resolved = await dns.lookup(hostname, { all: true, verbatim: true });`
  中 修复：改用发往文档中说明的端点的普通 HTTPS 请求，让流量可以被检查和记录。
  EN Fix: Use ordinary HTTPS requests to a documented endpoint so that the traffic can be inspected and logged.
- **高 / HIGH** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 59 distinct remote hosts (api.example.com, biomejs.dev, example.com, github.com, localhostdoctor, play.tailwindcss.com, raw.githubusercontent.com, registry.npmjs.org, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `.github/workflows/release.yml:39` — `https://registry.npmjs.org`
  - `biome.json:2` — `https://biomejs.dev/schemas/2.5.7/schema.json`
  - `dsh/index.js:650` — `https://api.example.com`
  - `dsh/index.js:838` — `http://localhostdoctor`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `src/dshPlugin.test.ts:587` — `{ engine: '', proxy: 'http://127.0.0.1:7890', engines: { agy: { bin: '/opt/agy' } } },`
  - `src/dshPlugin.test.ts:591` — `expect(saved.proxy).toBe('http://127.0.0.1:7890');`
  - `src/dshPlugin.test.ts:677` — `{ host: '192.168.1.10:3080', origin: 'http://192.168.1.10:3080' },`
  - `src/dshPlugin.test.ts:678` — `{ host: '127.0.0.1:3080', origin: 'https://dsh.example.com' },`
  - ……另有 22 处 / … and 22 more location(s)
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **高 / HIGH** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `evals/run.mjs:105` — `const mod = await import(path.join(casesDir, file));`
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.
- **高 / HIGH** `persist.global-self-install` — 全局安装依赖包 / Installs a package globally
  中 该命令把包安装到全局前缀，于是用户的 PATH 上多出一个可执行文件，而且当前项目删除后它仍然留在那里。
  EN The command installs a package into the global prefix, which puts a new executable on the user's PATH and keeps it there after the current project is deleted.
  - `.github/workflows/release.yml:45` — `npm install -g`
  中 修复：改为本地安装，并通过项目自身的脚本调用该工具；全局安装应由用户自己决定，而不是由插件代劳。
  EN Fix: Install locally and invoke the tool through the project's own scripts; global installs belong to the user's decision, not to a plugin.
- **高 / HIGH** `prompt.doc-instruction` — 文档中包含针对模型的指令 / Documentation contains instructions aimed at a model
  中 随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。
  EN A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.
  - `CHANGELOG.md:212` — `- SSRF bypass: `http://[::ffff:127.0.0.1]` normalizes to `::ffff:7f00:1`, whose hex form the private-range check missed, and the probe reached a service bound t…`
  - `skills/modsearch/SKILL.md:30` — `powershell -ExecutionPolicy Bypass -File <skill-dir>\scripts\run.ps1 -q "test" # Windows`
  中 修复：把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。
  EN Fix: Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.

### 中 / MEDIUM (4)

- **中 / MEDIUM** `exfil.clipboard-read` — 读取系统剪贴板 / Reads the system clipboard
  中 该行通过 `pbpaste`、`xclip`、`wl-paste`、`Get-Clipboard` 或 `clipboardy` 读取剪贴板。剪贴板里经常放着刚刚复制过的密码、令牌和私密文本。
  EN The line reads the clipboard through `pbpaste`, `xclip`, `wl-paste`, `Get-Clipboard` or `clipboardy`. Clipboards routinely hold passwords, tokens and private text that were copied moments earlier.
  - `src/main.ts:160` — `pbpaste`
  中 修复：通过插件配置向用户索取该值，而不是读取剪贴板上恰好存在的内容。
  EN Fix: Ask the user for the value through the plugin config instead of reading whatever happens to be on the clipboard.
- **中 / MEDIUM** `install.hook-runs-shell-code` — 安装期钩子执行的不只是构建 / Lifecycle hook runs more than a build
  中 该钩子命令不属于常见的编译与拷贝步骤，安装这个包时会以用户权限运行任意代码，而这一切发生在任何人来得及检查之前。
  EN This hook command is not one of the usual compile-and-copy steps, so installing the package runs arbitrary code with the user's privileges before anything can be inspected.
  - `package.json:18` — `"prepublishOnly": "pnpm build",`
  中 修复：把钩子收敛为 `tsc` 或 `npm run build` 之类的构建命令，或把这项工作移到一个由用户主动执行的显式脚本里。
  EN Fix: Reduce the hook to a build command such as `tsc` or `npm run build`, or move the work into an explicit script the user chooses to run.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `dsh/index.js:838` — `http://localhostdoctor`
  - `src/dshPlugin.test.ts:587` — `http://127.0.0.1:7890`
  - `src/dshPlugin.test.ts:591` — `http://127.0.0.1:7890`
  - `src/dshPlugin.test.ts:677` — `http://192.168.1.10:3080`
  - ……另有 26 处 / … and 26 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 7 shipped file(s) are 64 KiB or larger and were not read as text, the largest being assets/demo-dsh-web-fetch.zh-CN.png at 314 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `assets/demo-dsh-web-fetch.zh-CN.png` — `321733 bytes not decoded as text`
  - `dsh/client.js:476` — `fetch('/modsearch/config?doctor=1')`
  - `dsh/client.js:508` — `fetch('/modsearch/config?doctor=1')`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (5)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `dsh/client.js:744` — `canKey && current.keySource === 'env' ? hint(t.envNote, 'envnote') : null,`
  - `src/doctor.ts:351` — `const env = options.env ?? process.env;`
  - `src/router.ts:221` — `const env = input.env ?? process.env;`
  - `src/search.ts:180` — `const env = options.env ?? process.env;`
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `cred.many-secret-env-vars` — 读取多个不同名称的密钥类环境变量 / Reads several differently-named secret environment variables
  中 这里的一行、或整个包里的若干行，读取了名称看起来像凭据的环境变量。只读一个文档中声明的 key 是插件本该有的认证方式；枚举多个不同名称的密钥，则是在收集凭据而不是在使用凭据。
  EN One line here, or several across the package, read environment variables whose names look like credentials. Reading a single documented key is how a plugin is meant to authenticate; enumerating many differently-named ones is how credentials are gathered rather than used.
  - `src/dshPlugin.test.ts:766` — `process.env.TAVILY_API_KEY`
  - `src/dshPlugin.test.ts:776` — `process.env.TAVILY_API_KEY`
  中 修复：只保留插件确实需要且有文档说明的变量，删掉与任何功能无关的密钥读取。
  EN Fix: Keep to the variables this plugin documents and needs, and delete reads of keys it has no feature for.
- **低 / LOW** `net.metadata-endpoint` — 访问云实例元数据端点 / Contacts a cloud instance-metadata endpoint
  中 该行访问了云元数据地址，该地址会向机器上运行的任何程序发放临时实例凭据。插件去请求它就是窃取凭据，而这个地址也是经典的 SSRF 目标。
  EN The line reaches the cloud metadata address, which serves temporary instance credentials to anything running on the machine. Requesting it from a plugin is credential theft, and the address is also the classic SSRF target.
  - `src/providers/http/network.test.ts:182` — `expect(isLiteralReservedTarget(u('http://metadata.google.internal/'))).toBe(true);`
  中 修复：删除该请求；插件代码永远不应该获取实例凭据。
  EN Fix: Delete the request; instance credentials should never be fetched by plugin code.
- **低 / LOW** `net.token-or-blob-in-url` — 把凭据或编码数据块放进 URL / Puts a credential or encoded blob in a URL
  中 令牌形状的查询参数、内嵌的 `user:password` 授权部分，或超长高熵的查询值，都意味着密钥或载荷数据在 URL 中传输，最终会留在访问日志、代理和浏览器历史里。
  EN A token-shaped query parameter, an embedded `user:password` authority, or a long high-entropy query value means secret material or payload data travels in a URL, where it lands in access logs, proxies and browser history.
  - `src/config.test.ts:95` — ``https://«redacted»@gw.example.com/${key}``
  - `src/config.test.ts:95` — `//user:hunter2@`
  - `src/config.test.ts:165` — `'https://gw.example.com/v1?api_key=gateway-token-xyz-123456'`
  - `src/util/redact.test.ts:42` — `'connect ECONNREFUSED via https://«redacted»@proxy.example:8080'`
  - ……另有 4 处 / … and 4 more location(s)
  中 修复：凭据放在 Authorization 头里发送，载荷用 POST 放在请求体中，不要编码进查询字符串。
  EN Fix: Send credentials in an Authorization header, and POST payloads in the body rather than encoding them into the query string.
- **低 / LOW** `obf.dynamic-code-eval` — 执行运行时拼装出来的代码 / Evaluates code built at runtime
  中 该行执行的是一个并非源码字面量的表达式，真正运行的代码在插件运行时才被拼装出来，无法在 tarball 中审查。
  EN The line evaluates an expression that is not a source literal, so the executed code is assembled while the plugin runs and cannot be reviewed in the tarball.
  - `src/dshClient.test.ts:63` — `new Function(`
  中 修复：用静态函数或数据表替代动态求值；任何审计都无法为运行时才存在的代码背书。
  EN Fix: Replace the dynamic evaluation with a static function or a data table; there is no audit that can vouch for code that does not exist until runtime.

_按类别 / By category:_ 网络回调 / network callbacks 6 · 数据外传 / exfiltration 2 · 混淆 / obfuscation 2 · 凭据读取 / credential access 2 · 提权 / privilege 1 · 持久化 / persistence 1 · 提示注入 / prompt injection 1 · 安装脚本 / install scripts 1 · 供应链 / supply chain 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `modsearch-HEAD/`
- skipped assets/banner.jpg: 584538 bytes exceeds the 524288-byte per-file cap
- skipped assets/demo-codex-fetch.png: 538865 bytes exceeds the 524288-byte per-file cap
- skipped assets/demo-codex-search.png: 528842 bytes exceeds the 524288-byte per-file cap
- skipped assets/flow.en.png: 1643081 bytes exceeds the 524288-byte per-file cap
- skipped assets/flow.zh.png: 1640166 bytes exceeds the 524288-byte per-file cap
- not scanned (binary): assets/demo-dsh-settings-card.jpg, assets/demo-dsh-web-fetch.png, assets/demo-dsh-web-fetch.zh-CN.png, assets/demo-dsh-web-search.png, assets/demo-dsh-web-search.zh-CN.png and 2 more
- outbound fetching was permitted for this audit
- grade forced to D by a critical finding: priv.curl-pipe-shell — Pipes a download straight into a shell
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
