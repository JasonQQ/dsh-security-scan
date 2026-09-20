> 批量压测 / Batch stress test · ★ 318 · `hust-open-atom-club/oh-dsh`
> https://github.com/hust-open-atom-club/oh-dsh · audited in 6.4s
# 安装前体检 / Pre-install audit: @oh-dsh/desktop@0.2.0

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/hust-open-atom-club/oh-dsh/tar.gz/HEAD` (URL / url)
- 已分析文件：2627 个（16.1 MiB） / Files analysed: 2627 (16.1 MiB)
- 内容摘要 / Content digest: `ef8e8bd11702f935b7a656f40c9fbd29…`
- 体检时间 / Audited at: 2026-09-20T09:53:24.646Z

## 最严重的风险 / Most severe risk

**把下载内容直接管道给 shell / Pipes a download straight into a shell** `priv.curl-pipe-shell`

中 它以超出任务所需的权限运行，因此它一旦出错，后果也更大。
EN It runs with more privilege than the task needs, so a mistake in it is larger than it should be.

该包会访问的目标：`github.com`、`www.w3.org`、`registry.npmjs.org`、`raw.githubusercontent.com`、`api.github.com`、`curl.se`、`127.0.0.1:${string(address.port`、`oh-dsh-preview.internal` / Destinations this package reaches: `github.com`, `www.w3.org`, `registry.npmjs.org`, `raw.githubusercontent.com`, `api.github.com`, `curl.se`, `127.0.0.1:${string(address.port`, `oh-dsh-preview.internal`

- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 它还安排了之后继续运行，所以仅仅卸载这个包并不够。
  EN It also arranges to run again later, so removing the package is not enough on its own.
- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `website/site.js:109`；完整列表见下方「发现」。 / The rule that decided the grade fired at `website/site.js:109`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `$dest/bin/ohdsh`, `/node_modules/`, `agent.cordis.yml`, `preset.yml`, `/usr/bin/sandbox-exec`, `pnpm-lock.yaml`, `node:fs/promises`, `ohdsh.js`, `cli.js`, `dist/ohdsh.js`, `install.sh`, `install.ps1` （另有 185 项） / (+185 more)
- **写入的文件路径 / File paths written:** `\n`, `pnpm-lock.yaml`, `node:fs/promises`, `pnpm.cmd`, `.nojekyll`, `lib/oh-dsh`, `ohdsh.js`, `cli.js`, `dist/ohdsh.js`, `install.sh`, `install.ps1`, `release-package.json` （另有 119 项） / (+119 more)
- **派生的命令 / Commands spawned:** `testing/2026-07-26-execa-for-test-subprocess-plumbing.i18n.yaml`, `sha256:dd45cddb591b892739b75b0c180bde7f14008f4769227b863571475be295e1e0`, `testing/2026-07-26-execa-for-test-subprocess-plumbing.md`, `sha256:1f45a69d0a7367ec5afbf112a77b355339b35270af8ff52696bee879cdf770d3`, `testing/2026-07-26-execa-for-test-subprocess-plumbing.zh.md`, `sha256:8a24bdc8376373d7a97f65cefc07078824bf918d6a9934056a025ecfafe8634b`, `node:child_process`, `git`, `@malept/cross-spawn-promise@2.0.0`, `@malept/cross-spawn-promise`, `/usr/bin/codesign`, `inherit` （另有 42 项） / (+42 more)
- **连接的域名 / Domains contacted:** `github.com`, `www.w3.org`, `registry.npmjs.org`, `raw.githubusercontent.com`, `api.github.com`, `curl.se`, `127.0.0.1:${string(address.port`, `oh-dsh-preview.internal`, `${value`, `oh-dsh.internal`, `www.npmjs.com`, `127.0.0.1` （另有 15 项） / (+15 more)
- **读取的环境变量 / Environment variables read:** `DSH_HOME`, `OH_DSH_HOME`, `OH_DSH_READ_ONLY`, `process.env (every variable)`, `OH_DSH_TUI_LANG`, `CC_TUI_LANG`, `OH_DSH_MARKETPLACE_PREVIEW`, `OH_DSH_TUI_CONFIG_HOME`, `OH_DSH_TUI_MARKETPLACE_PREVIEW_PROBE`, `OH_DSH_TUI_SESSION_ID`, `OH_DSH_TUI_PROVIDER`, `OH_DSH_TUI_MODEL` （另有 39 项） / (+39 more)

## 发现 / Findings

### 严重 / CRITICAL (2)

- **严重 / CRITICAL** `priv.curl-pipe-shell` — 把下载内容直接管道给 shell / Pipes a download straight into a shell
  中 一步完成“拉取脚本并执行”，运行的就是远端服务器当时返回的任何内容；既没有可计算哈希、可审查、可固定版本的产物，服务器一旦被攻破就等于这台机器被攻破。
  EN Fetching a script and executing it in one step runs whatever the remote server returns at that moment; there is no artifact to hash, review or pin, and a compromise of the server becomes a compromise of this machine.
  - `website/site.js:109` — `curl -fsSL https://raw.githubusercontent.com/hust-open-atom-club/oh-dsh/main/install.sh | bash`
  中 修复：先下载产物、校验其校验和，再执行校验通过的文件；绝不要把下载内容管道给解释器。
  EN Fix: Download the artifact, verify its checksum, and execute the verified file; never pipe a download into an interpreter.
- **严重 / CRITICAL** `priv.scripting-host-inline-command` — 用内联或编码命令调用系统脚本宿主 / Runs an OS scripting host with an inline or encoded command
  中 `osascript` 的 `do shell script`，或带 `-enc`/`-EncodedCommand` 的 PowerShell，执行的是操作系统从不在控制台显示、审查者在源码里也读不出来的命令字符串。
  EN `osascript` with `do shell script`, or PowerShell with `-enc`/`-EncodedCommand`, executes a command string that the operating system never shows in a console and that no reviewer can read in the source.
  - `install.sh:1190` — `osascript -e "tell application id \"$BUNDLE_ID\" to quit" >/dev/null 2>&1 || true`
  中 修复：删除对脚本宿主的调用，或换成一条用户能在运行前看到的、有文档说明的外部命令。
  EN Fix: Remove the scripting-host invocation, or replace it with a documented external command that a user can see before it runs.

### 高 / HIGH (8)

- **高 / HIGH** `harness.settings-widen-permission` — 放宽宿主的沙箱或审批策略 / Widens the harness sandbox or approval policy
  中 该行在宿主设置、profile 或 composition patch 中写入了宽松的沙箱或权限值。放宽策略会移除用户为所有插件——而不只是这一个插件——设定的文件与命令边界。
  EN The line sets a permissive sandbox or permission value in the harness settings, a profile or a composition patch. Widening the policy removes the file and command boundaries the user chose for every plugin, not just for this one.
  - `src/self-update.ts:330` — `-NoProfile-ExecutionPolicyBypass`
  - `src/self-update.ts:493` — `-NoProfile-ExecutionPolicyBypass-Command`
  - `tests/install-ps1.test.ts:52` — `-NoProfile-ExecutionPolicyBypass-File`
  - `tests/self-update.test.ts:139` — `-NoProfile-ExecutionPolicyBypass-File`
  中 修复：沙箱与审批设置交给用户决定；插件若需要某项能力，应加以说明并由用户显式授予。
  EN Fix: Leave sandbox and approval settings to the user; if the plugin needs a capability, document it and let the user grant it explicitly.
- **高 / HIGH** `net.covert-channel` — 通过 websocket 或 DNS 查询回连 / Beacons over a websocket or DNS lookup
  中 该行打开了 websocket，或通过 `dns.*` 或 DNS 工具解析某个域名。两者都能在不像是 HTTP 请求的情况下传递数据，而 DNS 尤其通常被所有防火墙和代理放行。
  EN The line opens a websocket or resolves a literal domain through `dns.*` or a DNS tool. Both carry data without looking like an HTTP request, and DNS in particular is normally permitted through every firewall and proxy.
  - `plugins/panel-controls/src/terminal/terminal-socket.ts:43` — `const socket = new WebSocket(this.url ?? terminalWebSocketUrl(scope))`
  中 修复：改用发往文档中说明的端点的普通 HTTPS 请求，让流量可以被检查和记录。
  EN Fix: Use ordinary HTTPS requests to a documented endpoint so that the traffic can be inspected and logged.
- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `plugins/plugin-marketplace/src/host/agent-gateway.ts:143` — `url: `http://127.0.0.1:${String(address.port)}/v1/marketplace`,`
  - `scripts/build-web.mjs:114` — `默认地址是 \`http://127.0.0.1:3080\`。运行`
  - `scripts/build-web.mjs:126` — `The default URL is \`http://127.0.0.1:3080\`. Run`
  - `tests/helpers/mock-github.ts:28` — `const url = new URL(req.url ?? '/', 'http://127.0.0.1')`
  - ……另有 14 处 / … and 14 more location(s)
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **高 / HIGH** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `plugins/desktop-frame/src/client/plugin.tsx:198` — `toggleSidebar(): void { this.require().toggleSidebar() }`
  - `plugins/desktop-frame/src/client/plugin.tsx:199` — `openRightbar(_track?: unknown, fullscreen?: boolean): void { this.require().openRightbar(fullscreen) }`
  - `plugins/desktop-frame/src/client/plugin.tsx:200` — `closeRightbar(): void { this.require().closeRightbar() }`
  - `plugins/desktop-frame/src/client/plugin.tsx:201` — `beginNavigation(): void { this.require().beginNavigation() }`
  - ……另有 3 处 / … and 3 more location(s)
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.
- **高 / HIGH** `priv.sudo-invocation` — 通过 sudo 提权 / Escalates with sudo
  中 该行通过 `sudo` 执行命令，意味着这个以用户级工具身份安装的插件在索要 root 权限，而用户事先看不到提权提示。
  EN The line runs a command through `sudo`, so the plugin is asking for root on a machine where it was installed as a user-level tool and where the user cannot see the escalation prompt in advance.
  - `.github/workflows/ci.yml:168` — `run: sudo apt-get update && sudo apt-get install -y xvfb`
  中 修复：去掉提权，把任何需要特权的步骤写成一条由用户主动执行的独立命令并加以说明。
  EN Fix: Remove the escalation and document any privileged step as a separate command the user runs deliberately.
- **高 / HIGH** `prompt.doc-instruction` — 文档中包含针对模型的指令 / Documentation contains instructions aimed at a model
  中 随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。
  EN A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.
  - `.agents/notes/archived/architecture/2026-07-03-filesystem-directory-listing-seam.md:44` — `**Keep directory enumeration in each consumer.** Rejected. That would bind product packages such as `dsh-skill` to Node/local filesystem behavior and bypass pol…`
  - `.agents/notes/archived/feature/2026-06-14-acp-agent-client-protocol.md:14` — `The bridge must preserve the harness's existing ownership boundaries. It cannot depend on the concrete agent loop, bypass the tool registry, execute shell comma…`
  - `.agents/notes/archived/feature/2026-06-14-acp-agent-client-protocol.md:46` — `**Execute bash through ACP `terminal/*`** — rejected. That would move execution outside the harness and bypass its sandbox, credential scrub, task ownership, cw…`
  - `.agents/notes/archived/feature/2026-06-18-acp-terminal-and-tool-rendering.md:18` — `The ACP spec has a *client-side* terminal sub-protocol — the agent calls the client's `terminal/create` with `{ command, args, cwd, env }` and the **editor** ex…`
  - ……另有 169 处 / … and 169 more location(s)
  中 修复：把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。
  EN Fix: Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.
- **高 / HIGH** `prompt.embedded-instruction-string` — 源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model
  中 源码中的字符串字面量——通常是工具描述或系统提示词片段——要求模型绕过确认或对用户隐瞒某些事，于是它作为一条指令进入上下文窗口。
  EN A string literal in the source — typically a tool description or system prompt fragment — tells the model to bypass confirmation or to hide something from the user, so it lands in the context window as a directive.
  - `tests/update-manager.test.ts:274` — `'manager keeps the proxy bypassed for later operations'`
  - `tests/update-manager.test.ts:300` — `'manager does not bypass the proxy for unrelated failures'`
  中 修复：如实描述工具的行为，删除那些会改变 agent 对待用户方式的指令。
  EN Fix: Describe the tool's behavior factually and remove directives that change how the agent treats the user.
- **高 / HIGH** `prompt.fake-system-message` — 文本伪装成系统消息 / Text impersonates a system message
  中 这段文字模仿系统或开发者消息的形式（`<system>`、`[SYSTEM]`、`<<SYS>>`、“system message:”）。自称拥有特权角色的内容，是想在模型上下文中抬高自己的权威。
  EN The text is shaped like a system or developer message (`<system>`, `[SYSTEM]`, `<<SYS>>`, "system message:"). Content that claims a privileged role is an attempt to raise its own authority inside the model's context.
  - `.agents/notes/proposed/feature/2026-07-06-recallable-compaction.md:53` — `[system]`
  - `.agents/notes/proposed/feature/2026-07-06-recallable-compaction.zh.md:53` — `[system]`
  中 修复：删除这些角色标记；面向用户的文本绝不应该被写成看起来像宿主指令的样子。
  EN Fix: Remove the role markers; user-visible text should never be formatted to look like harness instructions.

### 中 / MEDIUM (9)

- **中 / MEDIUM** `cred.many-secret-env-vars` — 读取多个不同名称的密钥类环境变量 / Reads several differently-named secret environment variables
  中 这里的一行、或整个包里的若干行，读取了名称看起来像凭据的环境变量。只读一个文档中声明的 key 是插件本该有的认证方式；枚举多个不同名称的密钥，则是在收集凭据而不是在使用凭据。
  EN One line here, or several across the package, read environment variables whose names look like credentials. Reading a single documented key is how a plugin is meant to authenticate; enumerating many differently-named ones is how credentials are gathered rather than used.
  - `scripts/watch-upstream.mjs:271` — `process.env.GITHUB_TOKEN`
  中 修复：只保留插件确实需要且有文档说明的变量，删掉与任何功能无关的密钥读取。
  EN Fix: Keep to the variables this plugin documents and needs, and delete reads of keys it has no feature for.
- **中 / MEDIUM** `cred.read-dotenv-or-history` — 读取 dotenv 文件或 shell 历史 / Reads a dotenv file or shell history
  中 该行读取了 `.env` 或 shell 历史文件。这两处都是令牌、云密钥和曾经粘贴过的密钥堆积的地方，而 shell 历史还会勾勒出用户的基础设施全貌。
  EN This line reads `.env` or a shell history file. Both are where tokens, cloud keys and previously pasted secrets accumulate, and a shell history also maps out the user's infrastructure.
  - `src/self-update.ts:212` — `const content = readFile(join(installerRecordHome(platform, env), 'launcher.env'))`
  - `tests/install-ps1.test.ts:128` — `const marker = (await readFile(join(payload, '.oh-dsh-install.env'), 'utf8'))`
  - `tests/install-sh.test.ts:277` — `assert.match(await readFile(join(home, '.bash_profile'), 'utf8'), /Oh-DSH launcher path/)`
  - `tests/install-sh.test.ts:278` — `assert.match(await readFile(join(home, '.bashrc'), 'utf8'), /Oh-DSH launcher path/)`
  - ……另有 13 处 / … and 13 more location(s)
  中 修复：通过插件配置 schema 加载配置，而不是读取 dotenv 文件；永远不要打开用户的历史记录。
  EN Fix: Load configuration through the plugin config schema instead of reading dotenv files, and never open the user's history.
- **中 / MEDIUM** `install.native-downloader` — 安装流程会编译或下载原生产物 / Install path builds or downloads a native artifact
  中 依赖包在安装期间编译原生代码或拉取预编译二进制文件，于是最终在本机被执行的不是被审查过的源码。
  EN The package compiles native code or fetches a prebuilt binary during install, so bytes that are not the reviewed source end up executed on this machine.
  - `flake.nix:30` — `pkgs.python3 # node-gyp`
  - `pnpm-lock.yaml:4246` — `node-gyp@12.4.0:`
  - `pnpm-lock.yaml:6731` — `node-gyp: 12.4.0`
  - `pnpm-lock.yaml:8816` — `node-gyp@12.4.0:`
  - ……另有 3 处 / … and 3 more location(s)
  中 修复：优先使用纯实现；若必须使用预编译产物，则内置该产物并记录其摘要，而不是在安装时下载。
  EN Fix: Prefer a pure implementation, or vendor the prebuilt artifact with a recorded digest instead of downloading it at install time.
- **中 / MEDIUM** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 24 distinct remote hosts (${value, 127.0.0.1:${string(address.port, api.github.com, curl.se, github.com, raw.githubusercontent.com, registry.npmjs.org, www.w3.org, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `.github/workflows/runtime-release.yml:137` — `https://github.com/$GITHUB_REPOSITORY.git`
  - `.gitmodules:3` — `https://github.com/omdsh-dev/DSH-better-sidebar.git`
  - `assets/icon.svg:1` — `http://www.w3.org/2000/svg`
  - `dsh-source.json:6` — `https://registry.npmjs.org/@deepseek-ai/dsh/-/dsh-0.1.5-rc.1.tgz`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `plugins/plugin-marketplace/src/host/agent-gateway.ts:143` — `http://127.0.0.1:${String(address.port`
  - `scripts/build-web.mjs:114` — `http://127.0.0.1:3080\`
  - `scripts/build-web.mjs:126` — `http://127.0.0.1:3080\`
  - `tests/helpers/mock-github.ts:28` — `http://127.0.0.1`
  - ……另有 13 处 / … and 13 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `prompt.concealed-instruction` — 把文本藏在注释或不可见字符中 / Hides text in a comment or invisible characters
  中 该行把内容藏在 HTML 注释里，或藏在零宽字符与双向控制字符之后，这些内容在 diff 或渲染后的文档中什么都看不见，却仍会作为文本被读取。
  EN The line conceals content either in an HTML comment or behind zero-width and bidirectional control characters, which render as nothing in a diff or a rendered document while still being read as text.
  - `tests/self-update.test.ts:448` — `const content = ' ; generated by install.ps1\r\nWEB_DEST=/opt/oh web\r\nBIN_DIR=/opt/bin\r\n'`
  中 修复：删除被隐藏的文本和不可见字符；审查者看不到的东西就不该出现在发布的包里。
  EN Fix: Delete the concealed text and the invisible characters; anything a reviewer cannot see does not belong in a shipped package.
- **中 / MEDIUM** `supply.foreign-registry` — 仓库或 scope 覆盖指向 npmjs 之外 / Registry or scope override points away from npmjs
  中 某个 registry 或 `_authToken` 条目指向的服务器并非 npmjs。随包发布的 `.npmrc` 或 `publishConfig` 配置把解析重定向后，所有依赖拉取都会来自用户并未选择的主机。
  EN A registry or `_authToken` entry names a server that is not npmjs. A shipped `.npmrc` or `publishConfig` block that redirects resolution makes every dependency fetch come from a host the user did not choose.
  - `scripts/watch-upstream.mjs:186` — ``Registry: https://www.npmjs.com/package/${subject.package}`,`
  中 修复：删除该覆盖；选择仓库本就是用户自己的配置，不该由被安装的包决定。
  EN Fix: Remove the override; registry selection belongs to the user's own configuration, not to the package being installed.
- **中 / MEDIUM** `supply.patch-target-missing` — 包内缺少 bundle patch 的目标文件 / Bundle patch target is missing from the package
  中 声明的 composition patch 不在已发布的文件里，或路径指向包根目录之外。这样安装时什么也组合不出来，或者安装会在包已经跑完自己的安装钩子之后才失败。
  EN dsh.bundle.patch points at dist/cordis.patch.yml, which is not among the 2627 staged files. The package cannot be composed as a bundle in this form.
  - `package.json:34` — `"patch": "./dist/cordis.patch.yml"`
  中 修复：让 `dsh.bundle.patch` 指向确实会被发布的 patch 文件，并把它列进 `files`。
  EN Fix: Point `dsh.bundle.patch` at a patch file that is actually shipped, and list it in `files`.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 9 shipped file(s) are 64 KiB or larger and were not read as text, the largest being assets/oh-dsh-desktop-ui.png at 487 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `assets/oh-dsh-desktop-ui.png` — `498467 bytes not decoded as text`
  - `plugins/panel-controls/src/terminal/terminal-socket.ts:16` — `export function terminalWebSocketUrl(scope: TerminalSocketScope): string {`
  - `plugins/panel-controls/src/terminal/terminal-socket.ts:28` — `private socket: WebSocket | undefined`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (6)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `install.ps1:126` — `$LauncherEnv = Join-Path $DataHome 'launcher.env'`
  - `install.ps1:169` — `if (($oldContent -like '*OHRECORD*') -or ($oldContent -like '*launcher.env*')) {`
  - `install.ps1:178` — `$oldMarker = Join-Path $previousDest '.oh-dsh-install.env'`
  - `install.ps1:217` — `-or ($existing -like '*launcher.env*') ``
  - ……另有 99 处 / … and 99 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `cred.read-browser-store` — 读取浏览器 Cookie 或保存的登录凭据 / Reads browser cookies or saved logins
  中 该行读取了 `Cookies`、`Login Data` 或 `logins.json` 之类的浏览器配置文件。会话 Cookie 等价于该用户已登录的每个站点的有效凭据。
  EN The line reads a browser profile store such as `Cookies`, `Login Data` or `logins.json`. Session cookies are equivalent to live credentials for every site the user is signed in to.
  - `tests/data-root.test.ts:80` — `readFileSync(join(sharedRoot, 'desktop', 'Local Storage', 'leveldb', 'state'), 'utf8'),`
  中 修复：删除这次读取；没有任何宿主插件需要打开浏览器配置目录。
  EN Fix: Delete the read; no harness plugin has a reason to open a browser profile directory.
- **低 / LOW** `harness.installed-package-edit` — 改动宿主安装目录或已安装的其他插件 / Touches the harness installation or another installed plugin
  中 该行读写宿主自身的安装目录，或 `node_modules` 下另一个插件的目录。修改已安装的代码会替换掉用户审查过的产物，并可能禁用或劫持任意插件。
  EN The line reads or writes inside the harness's own installation or another plugin's directory under `node_modules`. Editing installed code replaces the artifact the user reviewed and can disable or hijack any plugin.
  - `tests/install-mac.test.ts:24` — `await writeFile(join(path, 'Contents', 'MacOS', 'Oh-DSH Desktop'), marker)`
  - `tests/install-mac.test.ts:32` — `await writeFile(join(path, 'Contents', 'Resources', 'app.asar'), marker)`
  - `tests/install-sh.test.ts:106` — `await writeFile(join(appDir, 'Contents', 'Resources', 'app.asar'), 'asar')`
  - `tests/install-sh.test.ts:1303` — `await rm(join(apps, 'Oh-DSH Desktop.app', 'Contents', 'MacOS', 'Oh-DSH Desktop'))`
  中 修复：绝不在运行时修改已安装的包；把改动提交到上游，或提供一个增量插件。
  EN Fix: Never modify installed packages at runtime; contribute the change upstream or ship an additive plugin.
- **低 / LOW** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `tests/pinned-summary.test.ts:28` — `{ kind: 'tool-call', name: 'shell', callId: 'call-1', argsRaw: '{}' },`
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.
- **低 / LOW** `net.token-or-blob-in-url` — 把凭据或编码数据块放进 URL / Puts a credential or encoded blob in a URL
  中 令牌形状的查询参数、内嵌的 `user:password` 授权部分，或超长高熵的查询值，都意味着密钥或载荷数据在 URL 中传输，最终会留在访问日志、代理和浏览器历史里。
  EN A token-shaped query parameter, an embedded `user:password` authority, or a long high-entropy query value means secret material or payload data travels in a URL, where it lands in access logs, proxies and browser history.
  - `tests/update-manager.test.ts:520` — `'GET https://example.invalid/Oh-DSH-Desktop-1.2.0-arm64.zip?token=secret-token-123 failed with status 500'`
  中 修复：凭据放在 Authorization 头里发送，载荷用 POST 放在请求体中，不要编码进查询字符串。
  EN Fix: Send credentials in an Authorization header, and POST payloads in the body rather than encoding them into the query string.
- **低 / LOW** `persist.shell-rc-append` — 追加写入 shell 启动文件 / Appends to a shell startup file
  中 该行写入了 `.bashrc`、`.zshrc`、`.profile` 或 fish 配置，因此改动会在之后每个交互式 shell 中生效，而且删掉包目录也不会消失。
  EN The line writes into `.bashrc`, `.zshrc`, `.profile` or a fish config, so the change takes effect in every future interactive shell and survives removing the package directory.
  - `tests/plugin-marketplace.test.ts:1378` — `writeFileSync(join(setup.profileDir, 'pnpm-lock.yaml'), 'lockfileVersion: "9.0"\n')`
  - `tests/plugin-marketplace.test.ts:1959` — `mkdirSync(join(setup.profileDir, '.oh-dsh'), { recursive: true })`
  - `tests/plugin-marketplace.test.ts:1960` — `writeFileSync(join(setup.profileDir, '.oh-dsh', 'marketplace.json'), JSON.stringify({`
  - `tests/plugin-marketplace.test.ts:1971` — `writeFileSync(join(setup.profileDir, 'cordis.patch.yml'), [`
  - ……另有 3 处 / … and 3 more location(s)
  中 修复：不要修改 shell 启动文件；如果需要 shell 集成，就把那行内容打印出来，由用户自行决定是否添加。
  EN Fix: Do not modify shell startup files; if a shell integration is required, print the line for the user to add deliberately.

_按类别 / By category:_ 网络回调 / network callbacks 5 · 提示注入 / prompt injection 4 · 凭据读取 / credential access 4 · 提权 / privilege 3 · 滥用宿主环境 / harness abuse 3 · 供应链 / supply chain 3 · 混淆 / obfuscation 1 · 安装脚本 / install scripts 1 · 持久化 / persistence 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `oh-dsh-HEAD/`
- skipped assets/DSH Desktop.icns: 706420 bytes exceeds the 524288-byte per-file cap
- skipped assets/Oh-DSH-Desktop.icns: 706420 bytes exceeds the 524288-byte per-file cap
- skipped assets/oh-dsh-desktop-showcase.png: 1017371 bytes exceeds the 524288-byte per-file cap
- skipped assets/oh-dsh-desktop-skins.png: 717543 bytes exceeds the 524288-byte per-file cap
- skipped assets/oh-dsh-official-showcase.png: 1299893 bytes exceeds the 524288-byte per-file cap
- skipped assets/oh-dsh-plugin-marketplace.png: 742672 bytes exceeds the 524288-byte per-file cap
- skipped assets/oh-dsh-social-preview.png: 924257 bytes exceeds the 524288-byte per-file cap
- skipped assets/oh-dsh-surfaces.svg: 607780 bytes exceeds the 524288-byte per-file cap
- not scanned (binary): assets/dsh-whale.png, assets/icon.png, assets/icons/1024x1024.png, assets/icons/128x128.png, assets/icons/16x16.png and 11 more
- outbound fetching was permitted for this audit
- grade forced to D by a critical finding: priv.curl-pipe-shell — Pipes a download straight into a shell
- ……另有 1 项 / … and 1 more

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
