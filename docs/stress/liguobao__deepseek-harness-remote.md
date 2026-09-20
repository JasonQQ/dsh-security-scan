> 批量压测 / Batch stress test · ★ 207 · `liguobao/deepseek-harness-remote`
> https://github.com/liguobao/deepseek-harness-remote · audited in 4.4s
# 安装前体检 / Pre-install audit: @dsh-remote/android@0.4.14

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/liguobao/deepseek-harness-remote/tar.gz/HEAD` (URL / url)
- 已分析文件：325 个（5.1 MiB） / Files analysed: 325 (5.1 MiB)
- 内容摘要 / Content digest: `a8703ab71fe5da0102a389fa019df99a…`
- 体检时间 / Audited at: 2026-09-20T09:53:36.335Z

## 最严重的风险 / Most severe risk

**在同一个请求里发送本地文件或环境变量数据 / Sends local file or environment data in one request** `exfil.local-data-in-request`

中 数据会离开这台机器。该包中有代码把本机上的内容发往外部地址。
EN Data leaves this machine. Something in this package takes content that lives here and sends it to a destination outside it.

该包会访问的目标：`registry.npmjs.org`、`npm.pkg.github.com`、`github.com`、`${value`、`remote.example.com`、`dsh.r2049.cn`、`api.github.com`、`www.zhihu.com` / Destinations this package reaches: `registry.npmjs.org`, `npm.pkg.github.com`, `github.com`, `${value`, `remote.example.com`, `dsh.r2049.cn`, `api.github.com`, `www.zhihu.com`

- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 它还安排了之后继续运行，所以仅仅卸载这个包并不够。
  EN It also arranges to run again later, so removing the package is not enough on its own.
- 中 它会访问云实例元数据端点——在云主机上，那个端点会直接交出角色凭据。
  EN It contacts the cloud instance-metadata endpoint, which on a hosted machine hands out role credentials.
- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `apps/server/Dockerfile:31`；完整列表见下方「发现」。 / The rule that decided the grade fired at `apps/server/Dockerfile:31`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `node:fs/promises`, `packages/plugin/package.json`, `packages/client-core/dist/remote-gateway.js`, `packages/client-core/dist/harness-alpha-client.js`, `packages/client-core/dist/codex-client.js`, `state.json`, `session/follow`, `workspace/follow`, `session/control`, `workspace.selection.consume`, `package.json`, `device.json` （另有 11 项） / (+11 more)
- **写入的文件路径 / File paths written:** `node:fs/promises`, `package.json`, `@deepseek-ai/dsh`, `0.1.0-rc.6`, `device.json`
- **派生的命令 / Commands spawned:** `node:child_process`, `pipe`, `app-server`, `win32`, `where`, `which`, `ignore`, `--input-type=module`, `--eval`
- **连接的域名 / Domains contacted:** `registry.npmjs.org`, `npm.pkg.github.com`, `github.com`, `${value`, `remote.example.com`, `dsh.r2049.cn`, `api.github.com`, `www.zhihu.com`, `oauth`, `remote.example.comaccess-token-for-client`, `server.example.com`, `server.example.comaccess-token` （另有 43 项） / (+43 more)
- **读取的环境变量 / Environment variables read:** `GITHUB_REF_NAME`, `RUNNER_TEMP`, `PACKAGE_NAME`, `EXPO_PUBLIC_DSH_REMOTE_SERVER`, `NODE_ENV`, `DSH_SERVER_PORT`, `DSH_SERVER_ACCOUNT`, `DSH_SERVER_PASSWORD`, `DSH_SERVER_PUBLIC_URL`, `DSH_SERVER_DATA_FILE`, `DSH_SERVER_HOST`, `DSH_REMOTE_SERVER` （另有 13 项） / (+13 more)

## 发现 / Findings

### 高 / HIGH (10)

- **高 / HIGH** `destructive.recursive-delete-system-path` — 递归删除指向用户主目录或系统目录 / Recursive delete aimed at a home or system directory
  中 递归删除的目标是用户主目录或系统路径，一旦变量写错、展开为空或缺少判空保护，被销毁的就是用户数据而不是包自己的构建产物。
  EN A recursive delete targets a home directory or a system path, so a wrong variable, an empty expansion or a missing guard destroys user data instead of the package's own build output.
  - `scripts/uninstall.sh:11` — `${sudo_prefix} rm -f "/etc/systemd/system/${SERVICE_NAME}.service"`
  - `scripts/uninstall.sh:14` — `rm -f "${HOME}/.config/systemd/user/${SERVICE_NAME}.service"`
  - `scripts/uninstall.sh:19` — `rm -f "${HOME}/Library/LaunchAgents/${SERVICE_NAME}.plist"`
  - `scripts/uninstall.sh:24` — `rm -f "${HOME}/.local/share/dsh-remote/start-host.sh"`
  中 修复：只删除包在自己目录下创建的路径，并在解析出的路径不位于该目录内时拒绝执行。
  EN Fix: Delete only paths the package created under its own directory, and refuse to run when the resolved path is not inside it.
- **高 / HIGH** `exfil.local-data-in-request` — 在同一个请求里发送本地文件或环境变量数据 / Sends local file or environment data in one request
  中 同一行既读取本地文件或整个进程环境，又把结果直接送进对外的网络请求。这是本地数据流向第三方的最短路径，用户完全没机会先看一眼这些值。
  EN A single line reads local files, or the whole process environment, and passes the result straight into an outbound request. That is the shortest possible path from local data to a third party, with no chance for a user to see the value first.
  - `apps/server/Dockerfile:31` — `CMD node -e "fetch('http://127.0.0.1:'+process.env.DSH_SERVER_PORT+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"`
  中 修复：把读取和发送拆开，只发送端点真正需要的具名字段，绝不整体上传环境变量。
  EN Fix: Separate the read from the send, send only the named fields the endpoint needs, and never include environment variables wholesale.
- **高 / HIGH** `net.covert-channel` — 通过 websocket 或 DNS 查询回连 / Beacons over a websocket or DNS lookup
  中 该行打开了 websocket，或通过 `dns.*` 或 DNS 工具解析某个域名。两者都能在不像是 HTTP 请求的情况下传递数据，而 DNS 尤其通常被所有防火墙和代理放行。
  EN The line opens a websocket or resolves a literal domain through `dns.*` or a DNS tool. Both carry data without looking like an HTTP request, and DNS in particular is normally permitted through every firewall and proxy.
  - `apps/android/tests/server-url.test.ts:7` — `expect(websocketUrl('https://remote.example.com')).toBe('wss://remote.example.com/ws/v1/connect')`
  - `apps/server/tests/server.test.ts:47` — `const ws = new WebSocket(base.replace('http:', 'ws:') + '/ws/v1/connect'); sockets.push(ws)`
  - `examples/mock-host/index.ts:28` — `const server = process.env.DSH_REMOTE_SERVER ?? 'ws://127.0.0.1:8080/ws/v1/connect'`
  - `packages/plugin/src/loopback-host.ts:151` — `const socket = new WebSocket(`ws://127.0.0.1:${value.port}${value.path}`, value.protocols, {`
  - ……另有 11 处 / … and 11 more location(s)
  中 修复：改用发往文档中说明的端点的普通 HTTPS 请求，让流量可以被检查和记录。
  EN Fix: Use ordinary HTTPS requests to a documented endpoint so that the traffic can be inspected and logged.
- **高 / HIGH** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 45 distinct remote hosts (${value, api.github.com, dsh.r2049.cn, github.com, npm.pkg.github.com, registry.npmjs.org, remote.example.com, www.zhihu.com, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `.github/workflows/release.yml:38` — `https://registry.npmjs.org`
  - `.github/workflows/release.yml:119` — `https://npm.pkg.github.com`
  - `apps/android/src/lib/links.ts:1` — `https://github.com/liguobao/ds-harness-remote`
  - `apps/android/src/lib/server-url.ts:25` — `https://${value`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `apps/android/tests/server-url.test.ts:11` — `expect(normalizeServerUrl('http://10.0.2.2:8080')).toBe('http://10.0.2.2:8080')`
  - `apps/android/tests/server-url.test.ts:13` — `expect(() => normalizeServerUrl('http://8.8.8.8')).toThrow(/HTTPS/)`
  - `apps/android/tests/server-url.test.ts:17` — `expect(normalizeServerUrl('http://192.168.31.9:8090')).toBe('http://192.168.31.9:8090')`
  - `apps/android/tests/server-url.test.ts:18` — `expect(normalizeServerUrl('http://10.1.2.3:8080')).toBe('http://10.1.2.3:8080')`
  - ……另有 14 处 / … and 14 more location(s)
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **高 / HIGH** `obf.decoded-payload-literal` — 携带解码、转义或高熵字面量 / Carries a decoded, escaped or high-entropy literal
  中 一个很长的字面量会在运行时被解码（base64、`atob`、`unescape`、`decodeURIComponent`），或者写满了密集的十六进制、Unicode 转义，或者呈现出编码数据块那种近乎均匀的字符分布。
  EN A long literal is decoded at runtime (base64, `atob`, `unescape`, `decodeURIComponent`), written with dense hex or unicode escapes, or has the near-uniform character distribution of an encoded blob.
  - `packages/plugin/dist/client.github.js:1754` — `"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAACVBMVEUAAADy8vXx8fUsA3vyAAAAAXRSTlMAQObYZgAAAOxJREFUWMPtlsEOwyAMQxP+/6OnTZMGxHGcot3wDYgfh…`
  - `packages/plugin/dist/client.github.js:3902` — `".dshRemoteAcpCheckLink.isPassed{color:var(--dsw-alias-state-success-primary)}.dshRemoteAcpCheckLink.isFailed{color:var(--dsw-alias-state-danger-primary)}.dshRe…`
  - `packages/plugin/src/client.ts:28` — `'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAACVBMVEUAAADy8vXx8fUsA3vyAAAAAXRSTlMAQObYZgAAAOxJREFUWMPtlsEOwyAMQxP+/6OnTZMGxHGcot3wDYgfh…`
  - `packages/plugin/src/client.ts:29` — `'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAclBMVEX////v7+++wMf////s7O3k5OTExcrX2Ny6vMTv8PPW19yXmqRqboJmaHd3eoaqrLPs7fGMjpfb3eKlpq1eY…`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：把该值保存为可读源码，或保存为格式有文档说明的数据，让审查者能看清实际运行的到底是什么。
  EN Fix: Store the value as readable source or as data with a documented format, so a reviewer can see what is actually being run.
- **高 / HIGH** `persist.scheduled-task-write` — 安装计划任务、agent 或系统服务 / Installs a scheduled task, agent or service
  中 该行注册了稍后会自动运行的东西——cron 条目、launch agent、systemd unit、Windows 计划任务或注册表 Run 键——因此插件在把它装进来的那次安装结束之后仍在持续执行。
  EN The line registers something that runs later — a cron entry, launch agent, systemd unit, Windows scheduled task or registry Run key — so the plugin keeps executing after the install that brought it in.
  - `scripts/install.sh:132` — `command -v systemctl >/dev/null 2>&1 || die 'systemctl is required to install the system service.'`
  - `scripts/install.sh:157` — `${sudo_prefix} systemctl enable --now "${SERVICE_NAME}.service"`
  - `scripts/install.sh:177` — `launchctl bootout "gui/$(id -u)" "$plist_path" >/dev/null 2>&1 || true`
  - `scripts/install.sh:178` — `launchctl bootstrap "gui/$(id -u)" "$plist_path"`
  - ……另有 5 处 / … and 5 more location(s)
  中 修复：删除这一定时注册，或交给用户一条有文档说明、可以自行运行和审查的命令。
  EN Fix: Remove the scheduling, or hand the user a documented command they can run and review themselves.
- **高 / HIGH** `priv.sudo-invocation` — 通过 sudo 提权 / Escalates with sudo
  中 该行通过 `sudo` 执行命令，意味着这个以用户级工具身份安装的插件在索要 root 权限，而用户事先看不到提权提示。
  EN The line runs a command through `sudo`, so the plugin is asking for root on a machine where it was installed as a user-level tool and where the user cannot see the escalation prompt in advance.
  - `scripts/install.sh:136` — `command -v sudo >/dev/null 2>&1 || die 'sudo is required to install the system service. Re-run as root.'`
  - `scripts/install.sh:193` — `Linux) say "After CLI login/logout, run: sudo systemctl restart ${SERVICE_NAME}.service" ;;`
  中 修复：去掉提权，把任何需要特权的步骤写成一条由用户主动执行的独立命令并加以说明。
  EN Fix: Remove the escalation and document any privileged step as a separate command the user runs deliberately.
- **高 / HIGH** `priv.system-path-modification` — 修改系统路径或把文件设为全局可写 / Modifies a system path or makes a file world-writable
  中 该行写入 `/etc`、`/usr`、`/bin` 或 launch daemon 目录，把属主改为 root，或设置全局可写权限。任何一种都改变了安装包之外的机器状态，也可能为后续提权铺路。
  EN The line writes under `/etc`, `/usr`, `/bin` or a launch-daemon directory, changes ownership to root, or sets world-writable permissions. Any of these changes the machine beyond the installed package and can prepare an escalation later.
  - `scripts/install.sh:172` — `<key>ProgramArguments</key><array><string>/bin/bash</string><string>${escaped_command}</string></array>`
  - `scripts/uninstall.sh:11` — `${sudo_prefix} rm -f "/etc/systemd/system/${SERVICE_NAME}.service"`
  中 修复：把写入限制在包目录或用户自己的配置目录内，绝不要为了让安装成功而放宽权限。
  EN Fix: Keep writes inside the package or the user's own configuration directory, and never loosen permissions to make an install succeed.
- **高 / HIGH** `supply.url-dependency` — 依赖解析到 URL、git 引用或文件路径 / Dependency resolves to a URL, git ref or file path
  中 依赖不是从仓库解析，而是来自 URL、git 引用、本地路径或 patch，因此其内容不受仓库锁文件和任何完整性元数据约束，可以在版本号不变的情况下被替换。
  EN A dependency is resolved from a URL, a git reference, a local path or a patch instead of the registry, so its contents are not covered by the registry lockfile or by any integrity metadata and can change without a version bump.
  - `apps/android/package.json:7` — `"@dsh-remote/client-core": "workspace:*",`
  - `apps/android/package.json:8` — `"@dsh-remote/crypto": "workspace:*",`
  - `apps/android/package.json:9` — `"@dsh-remote/protocol": "workspace:*",`
  - `apps/android/package.json:10` — `"@dsh-remote/webrtc": "workspace:*",`
  - ……另有 19 处 / … and 19 more location(s)
  中 修复：改为依赖仓库中已发布的版本，并用锁文件固定；如果确实必须用 fork，就把它发布到自己名下的 scope。
  EN Fix: Depend on a published version from the registry, pinned by a lockfile; if a fork is unavoidable, publish it under your own scope.

### 中 / MEDIUM (8)

- **中 / MEDIUM** `cred.many-secret-env-vars` — 读取多个不同名称的密钥类环境变量 / Reads several differently-named secret environment variables
  中 这里的一行、或整个包里的若干行，读取了名称看起来像凭据的环境变量。只读一个文档中声明的 key 是插件本该有的认证方式；枚举多个不同名称的密钥，则是在收集凭据而不是在使用凭据。
  EN One line here, or several across the package, read environment variables whose names look like credentials. Reading a single documented key is how a plugin is meant to authenticate; enumerating many differently-named ones is how credentials are gathered rather than used.
  - `apps/server/src/main.ts:8` — `process.env.DSH_SERVER_PASSWORD`
  - `examples/mock-host/index.ts:31` — `process.env.DSH_REMOTE_ACCOUNT_PASSWORD`
  - `examples/mock-host/index.ts:50` — `process.env.DSH_REMOTE_TOKEN`
  - `examples/mock-host/smoke-client.ts:12` — `process.env.DSH_REMOTE_ACCOUNT_PASSWORD`
  中 修复：只保留插件确实需要且有文档说明的变量，删掉与任何功能无关的密钥读取。
  EN Fix: Keep to the variables this plugin documents and needs, and delete reads of keys it has no feature for.
- **中 / MEDIUM** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `apps/android/tests/event-reducer.test.ts:106` — `expect.objectContaining({ kind: 'tool', id: 'c1', toolName: 'bash' }),`
  - `apps/android/tests/event-reducer.test.ts:144` — `sessionEvent({ type: 'tool/call', data: { callId: 'c1', name: 'bash', arguments: '{"command":"git status"}' } }),`
  - `apps/android/tests/event-reducer.test.ts:149` — `{ kind: 'tool', id: 'c1', toolName: 'bash', state: 'running' },`
  - `apps/android/tests/event-reducer.test.ts:220` — `data: { callId: 'c1', name: 'run_code', arguments: '{"code":"long input"}' },`
  - ……另有 6 处 / … and 6 more location(s)
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.
- **中 / MEDIUM** `install.dependency-manifest-hook` — 随包携带的清单声明了安装钩子 / Bundled manifest declares install hooks
  中 非包根目录的清单声明了生命周期钩子。从这棵目录树安装的内置或嵌套依赖会运行自己的安装脚本，却不会像已发布依赖那样经过仓库审查。
  EN A manifest other than the package root declares lifecycle hooks. A vendored or nested dependency installed from this tree runs its own install scripts without the registry review that a published dependency would have had.
  - `apps/android/package.json:43` — `"prepare:workspace": "pnpm --filter '@dsh-remote/android^...' -r build && pnpm run verify:workspace",`
  - `apps/android/package.json:45` — `"prestart": "pnpm run prepare:workspace",`
  - `apps/android/package.json:47` — `"preandroid": "pnpm run prepare:workspace",`
  - `apps/android/package.json:49` — `"preios": "pnpm run prepare:workspace",`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：通过锁文件从仓库安装嵌套依赖，并删除自带钩子的内置清单。
  EN Fix: Install nested dependencies from the registry with a lockfile, and delete vendored manifests that carry their own hooks.
- **中 / MEDIUM** `install.native-downloader` — 安装流程会编译或下载原生产物 / Install path builds or downloads a native artifact
  中 依赖包在安装期间编译原生代码或拉取预编译二进制文件，于是最终在本机被执行的不是被审查过的源码。
  EN The package compiles native code or fetches a prebuilt binary during install, so bytes that are not the reviewed source end up executed on this machine.
  - `pnpm-lock.yaml:4506` — `prebuild-install@7.1.3:`
  - `pnpm-lock.yaml:9898` — `prebuild-install: 7.1.3`
  - `pnpm-lock.yaml:10467` — `prebuild-install@7.1.3:`
  中 修复：优先使用纯实现；若必须使用预编译产物，则内置该产物并记录其摘要，而不是在安装时下载。
  EN Fix: Prefer a pure implementation, or vendor the prebuilt artifact with a recorded digest instead of downloading it at install time.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `apps/android/tests/server-url.test.ts:11` — `http://10.0.2.2:8080`
  - `apps/android/tests/server-url.test.ts:13` — `http://8.8.8.8`
  - `apps/android/tests/server-url.test.ts:17` — `http://192.168.31.9:8090`
  - `apps/android/tests/server-url.test.ts:18` — `http://10.1.2.3:8080`
  - ……另有 14 处 / … and 14 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `obf.long-minified-line` — 整行是压缩或机器生成的数据块 / Line is a single minified or machine-generated blob
  中 该行超过 500 个字符且几乎没有空白，正是打包载荷、压缩字符串表或机器生成单行代码的样子。这样的一行用肉眼什么也审不出来。
  EN The line is over 500 characters with almost no whitespace, which is what a bundled payload, a packed string table or a machine-generated one-liner looks like. Nothing on such a line is reviewable by eye.
  - `apps/android/src/locales/zh-CN.ts:23` — `more: '更多', checkUpdates: '检查更新', checkingUpdates: '正在检查更新…', updateFoundTitle: '发现新版本', updateFoundBody: (latest: string, current: string) => `发现新版本 v${latest}…`
  - `apps/android/src/locales/zh-CN.ts:63` — `fullAccessTitle: '开启完全访问权限？', fullAccessBody: '开启后，DeepSeek Harness 可以直接修改文件和运行命令。只建议在你信任当前任务时使用。', codexFullAccessTitle: '允许 CodeX 完全访问电脑？', codexFullAccessBod…`
  - `apps/vscode/src/extension.ts:167` — `panel.webview.html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>body{display:grid;place-items:c…`
  - `apps/vscode/src/extension.ts:467` — `*{box-sizing:border-box}body{margin:0;padding:14px;color:var(--vscode-foreground);background:var(--vscode-sideBar-background);font-family:var(--vscode-font-fami…`
  - ……另有 6 处 / … and 6 more location(s)
  中 修复：发布未压缩的源码，或在 README 中说明该文件由哪个构建产出、可读源码在哪里。
  EN Fix: Ship unminified source, or state in the README which build produced the file and where the readable source lives.
- **中 / MEDIUM** `supply.foreign-registry` — 仓库或 scope 覆盖指向 npmjs 之外 / Registry or scope override points away from npmjs
  中 某个 registry 或 `_authToken` 条目指向的服务器并非 npmjs。随包发布的 `.npmrc` 或 `publishConfig` 配置把解析重定向后，所有依赖拉取都会来自用户并未选择的主机。
  EN A registry or `_authToken` entry names a server that is not npmjs. A shipped `.npmrc` or `publishConfig` block that redirects resolution makes every dependency fetch come from a host the user did not choose.
  - `.github/workflows/release.yml:119` — `printf '@%s:registry=https://npm.pkg.github.com\n' "$PACKAGE_SCOPE" >> "$NPM_CONFIG_USERCONFIG"`
  - `.github/workflows/release.yml:122` — `if npm view "$PACKAGE_NAME@$VERSION" --registry=https://npm.pkg.github.com >/dev/null 2>&1; then`
  - `.github/workflows/release.yml:139` — `registry: 'https://npm.pkg.github.com',`
  - `.github/workflows/release.yml:145` — `npm publish "$GITHUB_PACKAGE_DIR/package" --registry=https://npm.pkg.github.com --access public`
  中 修复：删除该覆盖；选择仓库本就是用户自己的配置，不该由被安装的包决定。
  EN Fix: Remove the override; registry selection belongs to the user's own configuration, not to the package being installed.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 7 shipped file(s) are 64 KiB or larger and were not read as text, the largest being apps/android/assets/android-icon-foreground.png at 508 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `apps/android/assets/android-icon-foreground.png` — `520277 bytes not decoded as text`
  - `apps/android/src/screens/setup-screens.tsx:301` — `const response = await fetch(releaseApiUrl)`
  - `apps/android/src/services/api.ts:90` — `await this.request('/api/v1/devices/self', { method: 'DELETE' })`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (3)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `.github/workflows/release.yml:115` — `NPM_CONFIG_USERCONFIG="$RUNNER_TEMP/github-packages.npmrc"`
  - `apps/server/compose.yaml:9` — `DSH_SERVER_ACCOUNT: ${DSH_SERVER_ACCOUNT:?Set DSH_SERVER_ACCOUNT in .env}`
  - `apps/server/compose.yaml:10` — `DSH_SERVER_PASSWORD: ${DSH_SERVER_PASSWORD:?Set DSH_SERVER_PASSWORD in .env}`
  - `apps/server/src/server.ts:104` — `json(res, 200, { ...profile(), token: value, expiresAt }); return`
  - ……另有 15 处 / … and 15 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `net.metadata-endpoint` — 访问云实例元数据端点 / Contacts a cloud instance-metadata endpoint
  中 该行访问了云元数据地址，该地址会向机器上运行的任何程序发放临时实例凭据。插件去请求它就是窃取凭据，而这个地址也是经典的 SSRF 目标。
  EN The line reaches the cloud metadata address, which serves temporary instance credentials to anything running on the machine. Requesting it from a plugin is credential theft, and the address is also the classic SSRF target.
  - `packages/plugin/tests/loopback.test.ts:43` — `if (req.url === '/redirect') { res.writeHead(302, { Location: 'http://169.254.169.254/' }); res.end(); return }`
  中 修复：删除该请求；插件代码永远不应该获取实例凭据。
  EN Fix: Delete the request; instance credentials should never be fetched by plugin code.
- **低 / LOW** `net.token-or-blob-in-url` — 把凭据或编码数据块放进 URL / Puts a credential or encoded blob in a URL
  中 令牌形状的查询参数、内嵌的 `user:password` 授权部分，或超长高熵的查询值，都意味着密钥或载荷数据在 URL 中传输，最终会留在访问日志、代理和浏览器历史里。
  EN A token-shaped query parameter, an embedded `user:password` authority, or a long high-entropy query value means secret material or payload data travels in a URL, where it lands in access logs, proxies and browser history.
  - `packages/plugin/tests/config.test.ts:30` — `'https://«redacted»@remote.example.com'`
  - `packages/plugin/tests/config.test.ts:31` — `'https://remote.example.com?token=secret'`
  - `packages/plugin/tests/harness-api-bridge.test.ts:601` — `'https://«redacted»@api.example.com/v1'`
  - `packages/plugin/tests/harness-api-bridge.test.ts:620` — `'https://api.example.com/v1?key=sk-secret'`
  中 修复：凭据放在 Authorization 头里发送，载荷用 POST 放在请求体中，不要编码进查询字符串。
  EN Fix: Send credentials in an Authorization header, and POST payloads in the body rather than encoding them into the query string.

_按类别 / By category:_ 网络回调 / network callbacks 6 · 供应链 / supply chain 3 · 混淆 / obfuscation 2 · 提权 / privilege 2 · 凭据读取 / credential access 2 · 安装脚本 / install scripts 2 · 破坏性 / destructive 1 · 数据外传 / exfiltration 1 · 持久化 / persistence 1 · 滥用宿主环境 / harness abuse 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `ds-harness-remote-HEAD/`
- skipped apps/android/assets/icon.png: 811089 bytes exceeds the 524288-byte per-file cap
- skipped docs/images/image-msg.jpg: 721768 bytes exceeds the 524288-byte per-file cap
- skipped docs/images/image-result.jpg: 924056 bytes exceeds the 524288-byte per-file cap
- skipped docs/images/remote.png: 951048 bytes exceeds the 524288-byte per-file cap
- skipped packages/plugin/dist/index.js: 1004584 bytes exceeds the 524288-byte per-file cap
- not scanned (binary): apps/android/assets/android-icon-foreground-adaptive.png, apps/android/assets/android-icon-foreground.png, apps/android/assets/splash-brand.png, apps/browser/media/icon.png, apps/vscode/media/icon.png and 3 more
- outbound fetching was permitted for this audit
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
