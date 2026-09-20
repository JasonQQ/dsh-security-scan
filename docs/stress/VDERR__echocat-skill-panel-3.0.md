> 批量压测 / Batch stress test · ★ 201 · `VDERR/echocat-skill-panel-3.0`
> https://github.com/VDERR/echocat-skill-panel-3.0 · audited in 4.0s
# 安装前体检 / Pre-install audit: echocat-skill-panel-3.0@4.0.0

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

- 来源 / Source: `https://codeload.github.com/VDERR/echocat-skill-panel-3.0/tar.gz/HEAD` (URL / url)
- 已分析文件：43 个（1.4 MiB） / Files analysed: 43 (1.4 MiB)
- 内容摘要 / Content digest: `873ed4e47a3c57cb2ce53e996645263d…`
- 体检时间 / Audited at: 2026-09-20T09:53:40.350Z

## 最严重的风险 / Most severe risk

**连接已知的数据外传或隧道服务 / Contacts a known exfiltration or tunnelling service** `net.exfil-service-host`

中 它会建立出站连接，因此可以在你无法选择的时机接收指令或送出数据。
EN It opens an outbound connection, so it can receive instructions or send data at a moment you do not choose.

该包会访问的目标：`github.com`、`dsh.internal`、`dsh.internalforce1`、`registry.npmjs.org`、`api.github.com`、`x`、`dsh.internalhead`、`127.0.0.1` / Destinations this package reaches: `github.com`, `dsh.internal`, `dsh.internalforce1`, `registry.npmjs.org`, `api.github.com`, `x`, `dsh.internalhead`, `127.0.0.1`

- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.

决定该评级的规则命中于 `lib/client.js:3506`；完整列表见下方「发现」。 / The rule that decided the grade fired at `lib/client.js:3506`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `SKILL.md`, `package.json`, `skills/route-skill/SKILL.md`, `skills/previewed`, `skills/route-skill`, `skills/ren-demo`, `meta.yaml`, `skills/route-zh/meta.yaml`, `skills/route-long`, `demo-skill/SKILL.md`, `bare-skill/SKILL.md`, `wrapped-skill/SKILL.md` （另有 27 项） / (+27 more)
- **写入的文件路径 / File paths written:** `SKILL.md`, `notes.txt`, `a.txt`, `skills/git-skill`, `skills/git-skill/SKILL.md`, `top.txt`, `pack.pack`, `nested/pack.pack`, `meta.yaml`, `has-meta/meta.yaml`, `</body>`, `${MEASURE}\n</body>` （另有 1 项） / (+1 more)
- **派生的命令 / Commands spawned:** `node:child_process`, `--version`, `ignore`, `pipe`, `git`, `utf8`
- **连接的域名 / Domains contacted:** `github.com`, `dsh.internal`, `dsh.internalforce1`, `registry.npmjs.org`, `api.github.com`, `x`, `dsh.internalhead`, `127.0.0.1`, `dsh.internal${releaseroute.path`, `dsh.internal${route.path`, `example.com`, `192.168.1.9` （另有 3 项） / (+3 more)
- **读取的环境变量 / Environment variables read:** `DSH_HOME`, `process.env (every variable)`, `DSH_APP_ROOT`

## 发现 / Findings

### 严重 / CRITICAL (2)

- **严重 / CRITICAL** `net.exfil-service-host` — 连接已知的数据外传或隧道服务 / Contacts a known exfiltration or tunnelling service
  中 该行出现了请求捕获、粘贴板或隧道服务的主机名，这些服务存在的意义就是接收来自别处的数据。它们被用于投放和命令控制回调，而不是实现插件自身的功能。
  EN The line names a request-capture, paste or tunnel host that exists to receive data from somewhere else. These services are used for drop-off and for command-and-control callbacks, not for shipping a plugin's own features.
  - `lib/client.js:3506` — `h('span', { className: 'sr-toast-msg' }, toast.message),`
  - `src/client/install.js:164` — `h('span', { className: 'sr-toast-msg' }, toast.message),`
  中 修复：删除该端点。如果它只是开发时的占位符，就删掉它，不要让它在已发布的包里仍然可达。
  EN Fix: Remove the endpoint. If it is a placeholder from development, delete it rather than leave it reachable in the published package.
- **严重 / CRITICAL** `obf.dynamic-code-eval` — 执行运行时拼装出来的代码 / Evaluates code built at runtime
  中 该行执行的是一个并非源码字面量的表达式，真正运行的代码在插件运行时才被拼装出来，无法在 tarball 中审查。
  EN The line evaluates an expression that is not a source literal, so the executed code is assembled while the plugin runs and cannot be reviewed in the tarball.
  - `tools/build-client.mjs:157` — `new Function(written)`
  中 修复：用静态函数或数据表替代动态求值；任何审计都无法为运行时才存在的代码背书。
  EN Fix: Replace the dynamic evaluation with a static function or a data table; there is no audit that can vouch for code that does not exist until runtime.

### 高 / HIGH (1)

- **高 / HIGH** `prompt.embedded-instruction-string` — 源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model
  中 源码中的字符串字面量——通常是工具描述或系统提示词片段——要求模型绕过确认或对用户隐瞒某些事，于是它作为一条指令进入上下文窗口。
  EN A string literal in the source — typically a tool description or system prompt fragment — tells the model to bypass confirmation or to hide something from the user, so it lands in the context window as a directive.
  - `test/release.mjs:173` — `'`force` bypasses the cache'`
  中 修复：如实描述工具的行为，删除那些会改变 agent 对待用户方式的指令。
  EN Fix: Describe the tool's behavior factually and remove directives that change how the agent treats the user.

### 中 / MEDIUM (3)

- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `src/index.js:977` — `http://dsh.internalforce1`
  - `test/http.mjs:118` — `http://dsh.internalHEAD`
  - `test/install-route.mjs:210` — `http://127.0.0.1/x.md`
  - `test/install-route.mjs:446` — `http://dsh.internal${releaseRoute.path`
  - ……另有 6 处 / … and 6 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `supply.unpinned-range` — 依赖版本范围未固定 / Dependency range is unpinned
  中 该依赖接受任意版本（`*`、`x` 或 `latest`），明天安装到的就是仓库当时提供的代码，而经过审计的版本对它毫无保证。
  EN The dependency accepts any version (`*`, `x` or `latest`), so the code that installs tomorrow is whatever the registry serves then, and the audited version says nothing about it.
  - `package.json:53` — `"@deepseek-ai/dsh-llm": "*",`
  中 修复：固定 semver 范围并提交锁文件，使安装解析到的正是被审查过的那些版本。
  EN Fix: Pin a semver range and commit a lockfile so an install resolves to the versions that were reviewed.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 1 shipped file(s) are 64 KiB or larger and were not read as text, the largest being docs/panel.png at 96 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `docs/panel.png` — `98234 bytes not decoded as text`
  - `lib/client.js:2291` — `publish({ phase: 'error', error: 'this shell exposes no fetch()', data: state.data })`
  - `lib/client.js:2860` — `if (typeof fetch !== 'function') return fail('NETWORK', '\u5f53\u524d\u5916\u58f3\u6ca1\u6709\u66b4\u9732 fetch()')`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (4)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `安装-3.0.ps1:14` — ``dsh.profile.bundles` whose directory no longer exists aborts profile`
  - `安装-3.0.ps1:143` — `foreach ($entry in @($doc.dsh.profile.bundles)) {`
  - `安装-3.0.ps1:148` — `$doc.dsh.profile.bundles = $bundles`
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `test/units.mjs:34` — `const otherCall = () => ({ type: 'tool/call', data: { name: 'bash', arguments: '{}' } })`
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.
- **低 / LOW** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `test/install-route.mjs:210` — `const privateUrl = await jsonPost(route, { action: 'install', mode: 'url', url: 'http://127.0.0.1/x.md' })`
  - `test/install.mjs:290` — `const privateResult = await installer.install({ action: 'install', mode: 'url', url: 'http://127.0.0.1:8080/skill.md' })`
  - `test/install.mjs:293` — `const lanResult = await installer.install({ action: 'install', mode: 'url', url: 'http://192.168.1.9/skill.md' })`
  - `test/install.mjs:301` — `}).install({ action: 'install', mode: 'url', url: 'http://127.0.0.1:8080/skill.md' })`
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **低 / LOW** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `lib/client.js:6572` — `return require(id);`
  - `test/smoke.mjs:17` — `const plugin = await import(target.startsWith('file:') ? target : pathToFileURL(target).href)`
  - `tools/build-client.mjs:130` — `\t\t\treturn require(id);`
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.

_按类别 / By category:_ 网络回调 / network callbacks 3 · 混淆 / obfuscation 2 · 供应链 / supply chain 2 · 提示注入 / prompt injection 1 · 凭据读取 / credential access 1 · 滥用宿主环境 / harness abuse 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `echocat-skill-panel-3.0-HEAD/`
- not scanned (binary, contents unreadable as text): docs/install-sheet.png, docs/panel.png
- outbound fetching was permitted for this audit
- grade forced to D by a critical finding: net.exfil-service-host — Contacts a known exfiltration or tunnelling service
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
