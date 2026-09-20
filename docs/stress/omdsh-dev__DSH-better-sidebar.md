> 批量压测 / Batch stress test · ★ 3680 · `omdsh-dev/DSH-better-sidebar`
> https://github.com/omdsh-dev/DSH-better-sidebar · audited in 2.1s
# 安装前体检 / Pre-install audit: dsh-better-sidebar@0.19.1

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

- 来源 / Source: `https://codeload.github.com/omdsh-dev/DSH-better-sidebar/tar.gz/HEAD` (URL / url)
- 已分析文件：389 个（4.6 MiB） / Files analysed: 389 (4.6 MiB)
- 内容摘要 / Content digest: `3b02bf87b360d740319f9add8680065f…`
- 体检时间 / Audited at: 2026-09-20T09:51:48.067Z

## 最严重的风险 / Most severe risk

**同一个包内既有环境变量收集又有对外请求 / Environment harvest and an outbound request in the same package** `exfil.environment-harvest-then-callback`

中 数据会离开这台机器。该包中有代码把本机上的内容发往外部地址。
EN Data leaves this machine. Something in this package takes content that lives here and sends it to a destination outside it.

该包会访问的目标：`editorconfig.org`、`github.com`、`registry.npmjs.org`、`0.0.0.127`、`dsh.internal`、`${trimmed`、`www.w3.org`、`file` / Destinations this package reaches: `editorconfig.org`, `github.com`, `registry.npmjs.org`, `0.0.0.127`, `dsh.internal`, `${trimmed`, `www.w3.org`, `file`

- 中 它发生在安装时：`prepare` 脚本会执行它，你不需要自己运行任何东西。
  EN It happens at install time: the `prepare` script runs it, so you do not have to run anything yourself.
- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 它还安排了之后继续运行，所以仅仅卸载这个包并不够。
  EN It also arranges to run again later, so removing the package is not enough on its own.

决定该评级的规则命中于 `tsdown.config.ts:140`；完整列表见下方「发现」。 / The rule that decided the grade fired at `tsdown.config.ts:140`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

- `prepare` (`package.json`): `tsdown`

发布期钩子（维护者打包或发布时运行，安装时不会执行）： / Publish-time hooks (run when the maintainer packs or publishes, not on install):

- `prepublishOnly`: `pnpm build`

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `\n`, `node:fs/promises`, `package.json`, `pnpm-workspace.yaml`, `lib/client-${name}.js`, `src/client/sidebar.module.css`, `../src/client/lang.ts`, `old-name.txt`, `new-name.txt`, `newdir/nested/deep.txt`, `same.txt`, `dst.txt` （另有 17 项） / (+17 more)
- **写入的文件路径 / File paths written:** `node:fs/promises`, `note.md`, `f.txt`, `client-editor.js`, `seed.txt`, `old-name.txt`, `olddir/nested`, `olddir/nested/deep.txt`, `same.txt`, `r.txt`, `src.txt`, `dst.txt` （另有 44 项） / (+44 more)
- **派生的命令 / Commands spawned:** `node:child_process`, `git`, `ignore`, `-C`, `init`, `-q`, `config`, `user.email`, `t@t`, `user.name`, `commit`, `--allow-empty` （另有 18 项） / (+18 more)
- **连接的域名 / Domains contacted:** `editorconfig.org`, `github.com`, `registry.npmjs.org`, `0.0.0.127`, `dsh.internal`, `${trimmed`, `www.w3.org`, `file`, `${authority`, `${entry`, `example.com`, `x.dev` （另有 39 项） / (+39 more)
- **读取的环境变量 / Environment variables read:** `DSH_HOME`, `process.env (every variable)`, `DSH_E2E_URL`, `DSH_E2E_WORKSPACE`, `DSH_E2E_PERF_WORKSPACE`, `PATH`, `HOME`, `NODE_ENV`

## 发现 / Findings

### 严重 / CRITICAL (1)

- **严重 / CRITICAL** `exfil.environment-harvest-then-callback` — 同一个包内既有环境变量收集又有对外请求 / Environment harvest and an outbound request in the same package
  中 该包读取或整体导出进程环境变量，同时又建立对外连接。CI 运行器和宿主会话都会把 API Key 导出到环境变量中，因此这一组合会把仍有效的凭据送出本机。
  EN The package reads or dumps process environment values and also opens outbound connections. CI runners and harness sessions export API keys into the environment, so this combination sends working credentials off the machine.
  - `tsdown.config.ts:140` — `JSON.stringify(process.env`
  - `tsdown.config.ts:141` — `JSON.stringify(process.env`
  - `tsdown.config.ts:206` — `JSON.stringify(process.env`
  - `pnpm-lock.yaml:2929` — `undici-types@7.18.2:`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：删除环境变量的整体导出，只逐个读取插件确实需要、且有文档说明的变量。
  EN Fix: Remove the environment dump, and read only individually documented variables that the plugin actually needs.

### 高 / HIGH (8)

- **高 / HIGH** `cred.env-harvest` — 读取或整体导出进程环境变量 / Reads or dumps the process environment
  中 该行把整个环境当成一个值取走——序列化、遍历或打印它，而不是只取自己需要的那一个变量。CI 运行器和宿主都会把 API Key 导出到环境变量里，因此整体导出就是一次凭据收集。
  EN The line takes the whole environment as a value — serializing it, iterating it, or printing it — rather than the one variable it needs. CI runners and the harness export API keys into the environment, so a dump is a credential harvest.
  - `tsdown.config.ts:140` — `JSON.stringify(process.env`
  - `tsdown.config.ts:141` — `JSON.stringify(process.env`
  - `tsdown.config.ts:206` — `JSON.stringify(process.env`
  - `tsdown.config.ts:207` — `JSON.stringify(process.env`
  中 修复：只逐个读取插件文档中声明过的变量，绝不序列化整个环境对象，也不要把它写进日志或请求。
  EN Fix: Read only the variables the plugin documents, one at a time, and never serialize the environment object or forward it into a log or request.
- **高 / HIGH** `exfil.curl-post-body` — 用 curl 上传本地文件 / Uploads a local file with curl
  中 该命令把磁盘上的文件 POST 到远程端点（`-d @`、`--data-binary @`、`-F …=@`、`-T`），本质上是伪装成表单提交的文件上传。
  EN The command posts a file from disk to a remote endpoint (`-d @`, `--data-binary @`, `-F …=@`, `-T`), which is a file upload disguised as a form post.
  - `scripts/e2e-aggregate-mount.sh:114` — `curl -s -X POST`
  - `scripts/e2e-aggregate-mount.sh:120` — `curl -s -o /dev/null -w '%{http_code}' -X POST`
  中 修复：删除这次上传，或让目标地址显式且可配置，使用户能看清自己的数据去了哪里。
  EN Fix: Remove the upload, or make the destination explicit and configurable so a user can see where their data goes.
- **高 / HIGH** `net.covert-channel` — 通过 websocket 或 DNS 查询回连 / Beacons over a websocket or DNS lookup
  中 该行打开了 websocket，或通过 `dns.*` 或 DNS 工具解析某个域名。两者都能在不像是 HTTP 请求的情况下传递数据，而 DNS 尤其通常被所有防火墙和代理放行。
  EN The line opens a websocket or resolves a literal domain through `dns.*` or a DNS tool. Both carry data without looking like an HTTP request, and DNS in particular is normally permitted through every firewall and proxy.
  - `src/client/sidebar/use-host-feeds.ts:112` — `socket = new WebSocket(url.toString())`
  - `src/client/sidebar/use-host-feeds.ts:174` — `socket = new WebSocket(url.toString())`
  中 修复：改用发往文档中说明的端点的普通 HTTPS 请求，让流量可以被检查和记录。
  EN Fix: Use ordinary HTTPS requests to a documented endpoint so that the traffic can be inspected and logged.
- **高 / HIGH** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 41 distinct remote hosts (${authority, ${entry, ${trimmed, editorconfig.org, file, github.com, registry.npmjs.org, www.w3.org, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `.editorconfig:1` — `https://editorconfig.org`
  - `.github/ISSUE_TEMPLATE/issue_report.yml:53` — `https://github.com/anywhere-labs/deepseek-harness-desktop`
  - `.github/workflows/release.yml:62` — `https://registry.npmjs.org`
  - `package.json:8` — `https://github.com/omdsh-dev/DSH-better-sidebar`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **高 / HIGH** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `src/client/chunk-loader.ts:97` — `import(specifier: string): Promise<unknown>`
  - `src/client/chunk-loader.ts:184` — `return [spec, await modules.import(spec)] as const`
  - `src/client/locales.ts:873` — `pluginServerDeckDesc: 'Server card dashboard: one card per host showing online status, OS, uptime and CPU/mem/disk usage with latency; click a card to open an i…`
  - `src/context-types.ts:522` — `modules: { import(specifier: string): Promise<unknown> }`
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.
- **高 / HIGH** `persist.global-self-install` — 全局安装依赖包 / Installs a package globally
  中 该命令把包安装到全局前缀，于是用户的 PATH 上多出一个可执行文件，而且当前项目删除后它仍然留在那里。
  EN The command installs a package into the global prefix, which puts a new executable on the user's PATH and keeps it there after the current project is deleted.
  - `.github/workflows/ci.yml:178` — `npm install -g`
  - `scripts/e2e-common.sh:49` — `npm i -g`
  中 修复：改为本地安装，并通过项目自身的脚本调用该工具；全局安装应由用户自己决定，而不是由插件代劳。
  EN Fix: Install locally and invoke the tool through the project's own scripts; global installs belong to the user's decision, not to a plugin.
- **高 / HIGH** `persist.persistence-with-install-hook` — 安装钩子叠加持久化机制 / Install hook combined with a persistence mechanism
  中 生命周期钩子在安装期间运行，而目录树中又有东西把自己注册为稍后运行。这一组合会在用户以为只是一次普通依赖安装的过程中装入一个常驻组件。
  EN A lifecycle hook runs during install and something in the tree registers itself to run later. The combination installs a resident component during what the user believed was a normal dependency install.
  - `tests/smoke.spec.ts:357` — `writeFileSync(join(home, '.profile'), 'export DSH_LOGIN_MARKER=loaded-from-profile\n')`
  - `.github/workflows/ci.yml:178` — `npm install -g`
  - `scripts/e2e-common.sh:49` — `npm i -g`
  - `package.json:81` — `"prepare": "tsdown",`
  中 修复：删除这一定时注册。任何需要持续运行的东西，都应由用户作为一个明确可见的步骤来设置。
  EN Fix: Remove the scheduling. Anything that should keep running must be set up by the user as a deliberate, visible step.
- **高 / HIGH** `prompt.embedded-instruction-string` — 源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model
  中 源码中的字符串字面量——通常是工具描述或系统提示词片段——要求模型绕过确认或对用户隐瞒某些事，于是它作为一条指令进入上下文窗口。
  EN A string literal in the source — typically a tool description or system prompt fragment — tells the model to bypass confirmation or to hide something from the user, so it lands in the context window as a directive.
  - `src/client/locales.ts:764` — `'When on, clicking an external link in the chat or GUI opens the sidebar instead of a new window; HTTP and HTTPS are controlled separately by the switches below…`
  - `src/client/locales.ts:766` — `'When on, clicking an HTTP external link in the chat or GUI opens the sidebar (plugin pages declaring urlTarget win); Ctrl/Cmd+click always bypasses'`
  - `src/pty-deps.ts:189` — ``powershell -ExecutionPolicy Bypass -File "${script}" -Repair${profileArg}``
  - `tests/link-intercept.spec.ts:51` — `'bypasses modified clicks (Ctrl/Cmd/Shift/Alt) and non-left buttons'`
  - ……另有 4 处 / … and 4 more location(s)
  中 修复：如实描述工具的行为，删除那些会改变 agent 对待用户方式的指令。
  EN Fix: Describe the tool's behavior factually and remove directives that change how the agent treats the user.

### 中 / MEDIUM (6)

- **中 / MEDIUM** `install.hook-runs-shell-code` — 安装期钩子执行的不只是构建 / Lifecycle hook runs more than a build
  中 该钩子命令不属于常见的编译与拷贝步骤，安装这个包时会以用户权限运行任意代码，而这一切发生在任何人来得及检查之前。
  EN This hook command is not one of the usual compile-and-copy steps, so installing the package runs arbitrary code with the user's privileges before anything can be inspected.
  - `package.json:77` — `"prepublishOnly": "pnpm build",`
  - `package.json:81` — `"prepare": "tsdown",`
  中 修复：把钩子收敛为 `tsc` 或 `npm run build` 之类的构建命令，或把这项工作移到一个由用户主动执行的显式脚本里。
  EN Fix: Reduce the hook to a build command such as `tsc` or `npm run build`, or move the work into an explicit script the user chooses to run.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `scripts/e2e-aggregate-mount.sh:96` — `http://127\.0\.0\.1:[0-9`
  - `scripts/e2e-mount.sh:98` — `http://127\.0\.0\.1:[0-9`
  - `src/trust-fence.ts:25` — `http://${authority`
  - `tests/browser.spec.ts:10` — `http://127.0.0.1:3080`
  - ……另有 33 处 / … and 33 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `priv.package-manager-config-write` — 改写包管理器或全局 git 配置 / Rewrites a package manager or global git configuration
  中 该行执行了 `npm config set` 或 `git config --global`，这会改变用户之后每条命令的配置——包括依赖从哪个仓库拉取，以及 git 调用哪个程序作为钩子。
  EN The line runs `npm config set` or `git config --global`, which changes settings for every future command the user runs — including which registry packages come from and which program git calls for hooks.
  - `.github/workflows/ci.yml:38` — `git config --global user.name "dsh-better-sidebar-ci"`
  - `.github/workflows/ci.yml:39` — `git config --global user.email "ci@dsh.invalid"`
  - `.github/workflows/ci.yml:87` — `git config --global user.name "dsh-better-sidebar-ci"`
  - `.github/workflows/ci.yml:88` — `git config --global user.email "ci@dsh.invalid"`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：用环境变量或命令行参数为单条命令传配置，而不是写入用户的持久化配置。
  EN Fix: Pass configuration per command with environment variables or flags instead of writing the user's persistent config.
- **中 / MEDIUM** `prompt.concealed-instruction` — 把文本藏在注释或不可见字符中 / Hides text in a comment or invisible characters
  中 该行把内容藏在 HTML 注释里，或藏在零宽字符与双向控制字符之后，这些内容在 diff 或渲染后的文档中什么都看不见，却仍会作为文本被读取。
  EN The line conceals content either in an HTML comment or behind zero-width and bidirectional control characters, which render as nothing in a diff or a rendered document while still being read as text.
  - `scripts/install.ps1:1` — `## =============================================================================`
  中 修复：删除被隐藏的文本和不可见字符；审查者看不到的东西就不该出现在发布的包里。
  EN Fix: Delete the concealed text and the invisible characters; anything a reviewer cannot see does not belong in a shipped package.
- **中 / MEDIUM** `supply.dependency-count-outlier` — 运行时依赖数量远超其声明的用途 / Runtime dependency count is far above the declared purpose
  中 相对于它自己所描述的用途，该包声明了数量庞大的运行时依赖。每一个都会被安装、会经由传递依赖的生命周期脚本被执行，并且会像这个包本身一样被信任。
  EN The package declares 30 runtime dependencies (@codemirror/commands, @codemirror/lang-cpp, @codemirror/lang-css, @codemirror/lang-go, @codemirror/lang-html, @codemirror/lang-java, @codemirror/lang-javascript, @codemirror/lang-json, …) for a harness plugin of this size. Each one widens the install-time attack surface beyond what this audit reviewed.
  - `package.json:119` — `"dependencies": {`
  中 修复：去掉运行时并不需要的依赖，把仅用于构建的工具移到 `devDependencies`。
  EN Fix: Drop dependencies the package does not need at runtime, and move build-only tooling into `devDependencies`.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 1 shipped file(s) are 64 KiB or larger and were not read as text, the largest being docs/screenshots/multi-repository-git-status.png at 200 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `docs/screenshots/multi-repository-git-status.png` — `204296 bytes not decoded as text`
  - `pnpm-lock.yaml:2929` — `undici-types@7.18.2:`
  - `pnpm-lock.yaml:2932` — `undici@7.29.0:`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (8)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `scripts/e2e-mount.sh:79` — `const bundles = p.dsh?.profile?.bundles ?? [];`
  - `scripts/e2e-mount.sh:82` — `warn "dsh-better-sidebar 未出现在 dsh.profile.bundles 中——挂载未注册"`
  - `scripts/e2e-mount.sh:86` — `say "挂载已注册：dsh.profile.bundles 包含 dsh-better-sidebar"`
  - `scripts/install.ps1:206` — `Say "[dry-run] 步骤 3：校验 dsh.profile.bundles 含 $PKG"`
  - ……另有 51 处 / … and 51 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `tests/changes-tab.spec.tsx:27` — `{ type: 'tool/call', seq, time: seq, data: { name: 'write', callId: `w${seq}`, arguments: JSON.stringify({ file_path: path, content: 'body' }) } },`
  - `tests/changes-tab.spec.tsx:157` — `{ type: 'tool/call', seq: 1, time: 1, data: { name: 'read', callId: 'r1', arguments: JSON.stringify({ file_path: 'C:/repo/main/notes.md' }) } },`
  - `tests/sidechat-core.spec.ts:124` — `ev('tool/call', 3, { turn: 1, step: 1, callId: 'c1', name: 'read', arguments: '{}' }),`
  - `tests/sidechat-core.spec.ts:203` — `ev('tool/call', 4, { turn: 1, step: 1, callId: 'c1', name: 'bash', arguments: '{"cmd":"sleep 9"}' }),`
  - ……另有 20 处 / … and 20 more location(s)
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.
- **低 / LOW** `harness.settings-widen-permission` — 放宽宿主的沙箱或审批策略 / Widens the harness sandbox or approval policy
  中 该行在宿主设置、profile 或 composition patch 中写入了宽松的沙箱或权限值。放宽策略会移除用户为所有插件——而不只是这一个插件——设定的文件与命令边界。
  EN The line sets a permissive sandbox or permission value in the harness settings, a profile or a composition patch. Widening the policy removes the file and command boundaries the user chose for every plugin, not just for this one.
  - `tests/install-powershell.spec.ts:124` — `-ExecutionPolicyBypass-File-Version0.11.0-DryRun`
  - `tests/install-powershell.spec.ts:137` — `-ExecutionPolicyBypass-File-Version0.11.0-DryRun`
  中 修复：沙箱与审批设置交给用户决定；插件若需要某项能力，应加以说明并由用户显式授予。
  EN Fix: Leave sandbox and approval settings to the user; if the plugin needs a capability, document it and let the user grant it explicitly.
- **低 / LOW** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `tests/browser.spec.ts:10` — `const SELF = 'http://127.0.0.1:3080'`
  - `tests/browser.spec.ts:26` — `expect(normalizeBrowserUrl('https://8.8.8.8/dns', SELF)?.kind).toBe('ok')`
  - `tests/browser.spec.ts:39` — `'http://127.0.0.1/', 'http://127.255.255.255/',`
  - `tests/browser.spec.ts:39` — `http://127.0.0.1/http://127.255.255.255/`
  - ……另有 16 处 / … and 16 more location(s)
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **低 / LOW** `net.token-or-blob-in-url` — 把凭据或编码数据块放进 URL / Puts a credential or encoded blob in a URL
  中 令牌形状的查询参数、内嵌的 `user:password` 授权部分，或超长高熵的查询值，都意味着密钥或载荷数据在 URL 中传输，最终会留在访问日志、代理和浏览器历史里。
  EN A token-shaped query parameter, an embedded `user:password` authority, or a long high-entropy query value means secret material or payload data travels in a URL, where it lands in access logs, proxies and browser history.
  - `tests/e2e-host-protocol.spec.ts:23` — `'http://127.0.0.1:4199/?token=AbCdEf0123456789_-AbCdEf0123456789_-AbCd'`
  中 修复：凭据放在 Authorization 头里发送，载荷用 POST 放在请求体中，不要编码进查询字符串。
  EN Fix: Send credentials in an Authorization header, and POST payloads in the body rather than encoding them into the query string.
- **低 / LOW** `obf.dynamic-code-eval` — 执行运行时拼装出来的代码 / Evaluates code built at runtime
  中 该行执行的是一个并非源码字面量的表达式，真正运行的代码在插件运行时才被拼装出来，无法在 tarball 中审查。
  EN The line evaluates an expression that is not a source literal, so the executed code is assembled while the plugin runs and cannot be reviewed in the tarball.
  - `tests/chunk-artifact.spec.ts:39` — `expect(() => new Function(code)(), name).not.toThrow()`
  中 修复：用静态函数或数据表替代动态求值；任何审计都无法为运行时才存在的代码背书。
  EN Fix: Replace the dynamic evaluation with a static function or a data table; there is no audit that can vouch for code that does not exist until runtime.
- **低 / LOW** `persist.shell-rc-append` — 追加写入 shell 启动文件 / Appends to a shell startup file
  中 该行写入了 `.bashrc`、`.zshrc`、`.profile` 或 fish 配置，因此改动会在之后每个交互式 shell 中生效，而且删掉包目录也不会消失。
  EN The line writes into `.bashrc`, `.zshrc`, `.profile` or a fish config, so the change takes effect in every future interactive shell and survives removing the package directory.
  - `tests/smoke.spec.ts:357` — `writeFileSync(join(home, '.profile'), 'export DSH_LOGIN_MARKER=loaded-from-profile\n')`
  中 修复：不要修改 shell 启动文件；如果需要 shell 集成，就把那行内容打印出来，由用户自行决定是否添加。
  EN Fix: Do not modify shell startup files; if a shell integration is required, print the line for the user to add deliberately.
- **低 / LOW** `priv.system-path-modification` — 修改系统路径或把文件设为全局可写 / Modifies a system path or makes a file world-writable
  中 该行写入 `/etc`、`/usr`、`/bin` 或 launch daemon 目录，把属主改为 root，或设置全局可写权限。任何一种都改变了安装包之外的机器状态，也可能为后续提权铺路。
  EN The line writes under `/etc`, `/usr`, `/bin` or a launch-daemon directory, changes ownership to root, or sets world-writable permissions. Any of these changes the machine beyond the installed package and can prepare an escalation later.
  - `tests/pty-deps.spec.ts:73` — `writeFileSync(join(pluginRoot, 'scripts', 'install.sh'), '#!/usr/bin/env bash\n')`
  - `tests/pty-deps.spec.ts:73` — `scripts/install.sh/#!/usr/bin/env bash\n`
  - `tests/pty-deps.spec.ts:170` — `writeFileSync(join(pkgRoot, 'scripts', 'install.sh'), '#!/usr/bin/env bash\n')`
  - `tests/pty-deps.spec.ts:170` — `scripts/install.sh/#!/usr/bin/env bash\n`
  中 修复：把写入限制在包目录或用户自己的配置目录内，绝不要为了让安装成功而放宽权限。
  EN Fix: Keep writes inside the package or the user's own configuration directory, and never loosen permissions to make an install succeed.

_按类别 / By category:_ 网络回调 / network callbacks 5 · 持久化 / persistence 3 · 数据外传 / exfiltration 2 · 凭据读取 / credential access 2 · 混淆 / obfuscation 2 · 提示注入 / prompt injection 2 · 提权 / privilege 2 · 供应链 / supply chain 2 · 滥用宿主环境 / harness abuse 2 · 安装脚本 / install scripts 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `DSH-better-sidebar-HEAD/`
- not scanned (binary, contents unreadable as text): docs/screenshots/multi-repository-branches.png, docs/screenshots/multi-repository-git-status.png, docs/screenshots/multi-repository-selector.png
- outbound fetching was permitted for this audit
- grade forced to D by a critical finding: exfil.environment-harvest-then-callback — Environment harvest and an outbound request in the same package
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
