> 批量压测 / Batch stress test · ★ 7199 · `yjh051108/dsh-routing-suite`
> https://github.com/yjh051108/dsh-routing-suite · audited in 2.1s
# 安装前体检 / Pre-install audit: @dsh-external/dsh-graded-mode@0.0.1-rc1

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

- 来源 / Source: `https://codeload.github.com/yjh051108/dsh-routing-suite/tar.gz/HEAD` (URL / url)
- 已分析文件：122 个（1.6 MiB） / Files analysed: 122 (1.6 MiB)
- 内容摘要 / Content digest: `dd6e9afe9711175c721839fdf497b5ea…`
- 体检时间 / Audited at: 2026-09-20T09:51:43.383Z

## 最严重的风险 / Most severe risk

**同一个包内既有环境变量收集又有对外请求 / Environment harvest and an outbound request in the same package** `exfil.environment-harvest-then-callback`

中 数据会离开这台机器。该包中有代码把本机上的内容发往外部地址。
EN Data leaves this machine. Something in this package takes content that lives here and sends it to a destination outside it.

该包会访问的目标：`x`、`xsid`、`www.apache.org`、`127.0.0.1`、`github.com`、`registry.npmjs.org`、`opencollective.com`、`localhost` / Destinations this package reaches: `x`, `xsid`, `www.apache.org`, `127.0.0.1`, `github.com`, `registry.npmjs.org`, `opencollective.com`, `localhost`

- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 它还安排了之后继续运行，所以仅仅卸载这个包并不够。
  EN It also arranges to run again later, so removing the package is not enough on its own.

决定该评级的规则命中于 `injector/src/index.ts:420`；完整列表见下方「发现」。 / The rule that decided the grade fired at `injector/src/index.ts:420`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `.json`, `graded-settings.json`, `.settings.json`, `graded-state/_/.settings.json`, `client.js`, `index.js`, `${DSH_HOME}/sessions`, `\n`, `\\n`, `package.json`, `src/client/index.ts`, `build.sh` （另有 16 项） / (+16 more)
- **写入的文件路径 / File paths written:** `client.js`, `graded-settings.json`, `sid-x.settings.json`, `graded-state/sid-x.settings.json`, `node_modules/@standard-schema`, `node_modules/@standard-schema/spec`, `\n`, `\\n`, `.2`, `.1`, `reload-debug.log`, `super-injector/reload-debug.log` （另有 32 项） / (+32 more)
- **派生的命令 / Commands spawned:** `node:child_process`, `python`, `-c`, `inherit`, `win32`, `bash`, `--version`, `utf8`, `node "${selftestPath}"`, `run`, `prepare`, `pack` （另有 3 项） / (+3 more)
- **连接的域名 / Domains contacted:** `x`, `xsid`, `www.apache.org`, `127.0.0.1`, `github.com`, `registry.npmjs.org`, `opencollective.com`, `localhost`
- **读取的环境变量 / Environment variables read:** `DSH_HOME`, `USERPROFILE`, `NODE_ENV`, `process.env (every variable)`, `PATH`, `DSH_WEB`, `GIT_BASH`, `ProgramFiles`, `ProgramFiles(x86)`, `LOCALAPPDATA`, `DSH_ROUTER_STAGE_FILE`

## 发现 / Findings

### 严重 / CRITICAL (1)

- **严重 / CRITICAL** `exfil.environment-harvest-then-callback` — 同一个包内既有环境变量收集又有对外请求 / Environment harvest and an outbound request in the same package
  中 该包读取或整体导出进程环境变量，同时又建立对外连接。CI 运行器和宿主会话都会把 API Key 导出到环境变量中，因此这一组合会把仍有效的凭据送出本机。
  EN The package reads or dumps process environment values and also opens outbound connections. CI runners and harness sessions export API keys into the environment, so this combination sends working credentials off the machine.
  - `injector/src/index.ts:420` — `JSON.stringify(process.env`
  - `injector/tsdown.config.ts:22` — `JSON.stringify(process.env`
  - `graded/client/client.js:243` — `fetch("/graded-mode/api/settings" + qs, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ conceptLimit: settings.limit, v…`
  - `graded/client/client.js:263` — `fetch("/graded-mode/api/settings" + qs).then((r) => r.json()).then((j) => { if (alive && j && j.conceptLimit !== undefined) { setLimit(j.conceptLimit); setVm(j.…`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：删除环境变量的整体导出，只逐个读取插件确实需要、且有文档说明的变量。
  EN Fix: Remove the environment dump, and read only individually documented variables that the plugin actually needs.

### 高 / HIGH (8)

- **高 / HIGH** `cred.env-harvest` — 读取或整体导出进程环境变量 / Reads or dumps the process environment
  中 该行把整个环境当成一个值取走——序列化、遍历或打印它，而不是只取自己需要的那一个变量。CI 运行器和宿主都会把 API Key 导出到环境变量里，因此整体导出就是一次凭据收集。
  EN The line takes the whole environment as a value — serializing it, iterating it, or printing it — rather than the one variable it needs. CI runners and the harness export API keys into the environment, so a dump is a credential harvest.
  - `injector/src/index.ts:420` — `JSON.stringify(process.env`
  - `injector/tsdown.config.ts:22` — `JSON.stringify(process.env`
  中 修复：只逐个读取插件文档中声明过的变量，绝不序列化整个环境对象，也不要把它写进日志或请求。
  EN Fix: Read only the variables the plugin documents, one at a time, and never serialize the environment object or forward it into a log or request.
- **高 / HIGH** `harness.installed-package-edit` — 改动宿主安装目录或已安装的其他插件 / Touches the harness installation or another installed plugin
  中 该行读写宿主自身的安装目录，或 `node_modules` 下另一个插件的目录。修改已安装的代码会替换掉用户审查过的产物，并可能禁用或劫持任意插件。
  EN The line reads or writes inside the harness's own installation or another plugin's directory under `node_modules`. Editing installed code replaces the artifact the user reviewed and can disable or hijack any plugin.
  - `injector/src/index.ts:3050` — `writeFileSync(join(tmpDir, 'scripts', 'build.sh'), `#!/bin/bash\nset -euo pipefail\nROOT="$(cd "$(dirname "$0")/.." && pwd)"\ncd "$ROOT"\nCHECKOUT="\${DSH_CHECK…`
  - `injector/src/index.ts:3050` — `scriptsbuild.sh#!/bin/bash\nset -euo pipefail\nROOT="$(cd "$(dirname "$0")/.." && pwd)"\ncd "$ROOT"\nCHECKOUT="\${DSH_CHECKOUT:-}"\nif [ -z "$CHECKOUT" ] || [ !…`
  - `injector/src/index.ts:3050` — `scripts/build.sh/#!/bin/bash\nset -euo pipefail\nROOT="$(cd "$(dirname "$0")/.." && pwd)"\ncd "$ROOT"\nCHECKOUT="\${DSH_CHECKOUT:-}"\nif [ -z "$CHECKOUT" ] || […`
  中 修复：绝不在运行时修改已安装的包；把改动提交到上游，或提供一个增量插件。
  EN Fix: Never modify installed packages at runtime; contribute the change upstream or ship an additive plugin.
- **高 / HIGH** `net.covert-channel` — 通过 websocket 或 DNS 查询回连 / Beacons over a websocket or DNS lookup
  中 该行打开了 websocket，或通过 `dns.*` 或 DNS 工具解析某个域名。两者都能在不像是 HTTP 请求的情况下传递数据，而 DNS 尤其通常被所有防火墙和代理放行。
  EN The line opens a websocket or resolves a literal domain through `dns.*` or a DNS tool. Both carry data without looking like an HTTP request, and DNS in particular is normally permitted through every firewall and proxy.
  - `graded/scripts/e2e-develop.mjs:62` — `const ws = new WebSocket(`${BASE.replace('http', 'ws')}/api/events.mux`)`
  - `graded/scripts/e2e-v4.mjs:55` — `const ws = new WebSocket(`${BASE.replace('http', 'ws')}/api/events.mux`)`
  中 修复：改用发往文档中说明的端点的普通 HTTPS 请求，让流量可以被检查和记录。
  EN Fix: Use ordinary HTTPS requests to a documented endpoint so that the traffic can be inspected and logged.
- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `graded/scripts/e2e-develop.mjs:16` — `const BASE = 'http://127.0.0.1:3080'`
  - `graded/scripts/e2e-v4.mjs:15` — `const BASE = 'http://127.0.0.1:3080'`
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **高 / HIGH** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `injector/src/index.ts:921` — `await ctx.loader.import(pathToFileURL(realLib).href, () => [])`
  - `injector/src/index.ts:1009` — `const probeNs = await ctx.loader.import(entryUrlFinal, () => [])`
  - `injector/src/index.ts:1069` — `await entry.parent.tree.import(entry.options.name, () => []),`
  - `injector/src/index.ts:1164` — `const fresh = ctx.loader.unwrapExports(await ctx.loader.import(entryUrlFinal, () => []))`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.
- **高 / HIGH** `persist.dsh-settings-rewrite` — 改写 DSH 配置或 profile / Rewrites DSH settings or profiles
  中 该行写入了宿主配置（`~/.dsh/settings.yaml`、profile 或 storages）。改动 profile 会改变此后每次宿主启动时加载哪些插件，以及它们如何配置。
  EN The line writes into the harness configuration (`~/.dsh/settings.yaml`, profiles or storages). Changing the profile changes which plugins load and how they are configured on every future harness start.
  - `injector/src/index.ts:2585` — `description: 'profile patch 修复：扫描 ~/.dsh/profiles/*/cordis.patch.yml，按 entry id 去重（同 id 保留最后一条，备份原文件）——修复 "duplicate loader entry id" 启动崩溃（手动 patch 两次/重复安装造成）。-…`
  中 修复：把用户应当应用的配置打印出来，而不是直接写宿主的运行状态。
  EN Fix: Print the configuration the user should apply instead of writing the harness state directly.
- **高 / HIGH** `prompt.doc-instruction` — 文档中包含针对模型的指令 / Documentation contains instructions aimed at a model
  中 随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。
  EN A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.
  - `injector/CHANGELOG.md:130` — `- **注入缓存友好化**：注入文本固定 + order 9998 尾部化（参考官方 system prompt 设计），移除 llm/stream 动态旁路——system 前缀恒定，缓存命中不再受注入波动影响`
  - `injector/README.md:204` — `**为什么**：DeepSeek V4 Pro 的行为策略在首轮请求处被「完整 system prompt + 工具 schema 分布」强条件化。同题同环境：minimal（2 工具）99/96，standard（25 工具）91，两阶段锚定 98/99——先窄后宽，能力与完整工具面兼得。微探针证明起作用的是**可调…`
  - `preset/CHANGELOG.md:177` — `- **bootstrap 口径收口**：`phase_begin` 引导文本不再 `stageText(stage, [])` 走静态回退，改为安装 shim 后取真实 `runtimeCallable` 列表（与 system prompt 同一事实源）。`
  - `preset/docs/blog.md:19` — `在 Project2 评测（V4.1b，冻结）里，我们把差距量化了：**同一模型**，官方极简模式（一句 system prompt + 两个工具）两跑 99/96；完整标准模式 91；代码模式 92。约 10 分的差距，只来自「第一个请求长什么样」。`
  - ……另有 5 处 / … and 5 more location(s)
  中 修复：把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。
  EN Fix: Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.
- **高 / HIGH** `prompt.embedded-instruction-string` — 源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model
  中 源码中的字符串字面量——通常是工具描述或系统提示词片段——要求模型绕过确认或对用户隐瞒某些事，于是它作为一条指令进入上下文窗口。
  EN A string literal in the source — typically a tool description or system prompt fragment — tells the model to bypass confirmation or to hide something from the user, so it lands in the context window as a directive.
  - `preset/docs/archive/router-react/router-bootstrap-v1.mjs:226` — `'Run one task in a DIFFERENT reasoning mode than this session, in a fresh isolated context (own system prompt). The current session trajectory is untouched. Mod…`
  - `preset/docs/archive/router-react/router-bootstrap-v5.mjs:262` — `'Run one task in a DIFFERENT reasoning mode than this session, in a fresh isolated context (own system prompt). The current session trajectory is untouched. Mod…`
  - `preset/docs/archive/router-react/router-bootstrap-v6.mjs:277` — `'Run one task in a DIFFERENT reasoning mode than this session, in a fresh isolated context (own system prompt). The current session trajectory is untouched. Mod…`
  - `preset/docs/archive/router-react/router-bootstrap-v7.mjs:259` — `'Run one task in a DIFFERENT reasoning mode than this session, in a fresh isolated context (own system prompt). The current session trajectory is untouched. Mod…`
  - ……另有 11 处 / … and 11 more location(s)
  中 修复：如实描述工具的行为，删除那些会改变 agent 对待用户方式的指令。
  EN Fix: Describe the tool's behavior factually and remove directives that change how the agent treats the user.

### 中 / MEDIUM (8)

- **中 / MEDIUM** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `injector/src/index.ts:2929` — `const bashBinDir = bash !== 'bash' ? dirname(bash) : ''`
  - `injector/src/index.ts:3056` — `const bashBinDir = bash !== 'bash' ? dirname(bash) : ''`
  - `preset/router-react/agent.cordis.yml:229` — `toolName: subagent`
  - `preset/router-spec/agent.cordis.yml:229` — `toolName: subagent`
  - ……另有 9 处 / … and 9 more location(s)
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.
- **中 / MEDIUM** `install.dependency-manifest-hook` — 随包携带的清单声明了安装钩子 / Bundled manifest declares install hooks
  中 非包根目录的清单声明了生命周期钩子。从这棵目录树安装的内置或嵌套依赖会运行自己的安装脚本，却不会像已发布依赖那样经过仓库审查。
  EN A manifest other than the package root declares lifecycle hooks. A vendored or nested dependency installed from this tree runs its own install scripts without the registry review that a published dependency would have had.
  - `injector/package.json:53` — `"prepare": "node scripts/prepare.mjs",`
  中 修复：通过锁文件从仓库安装嵌套依赖，并删除自带钩子的内置清单。
  EN Fix: Install nested dependencies from the registry with a lockfile, and delete vendored manifests that carry their own hooks.
- **中 / MEDIUM** `install.hook-runs-shell-code` — 安装期钩子执行的不只是构建 / Lifecycle hook runs more than a build
  中 该钩子命令不属于常见的编译与拷贝步骤，安装这个包时会以用户权限运行任意代码，而这一切发生在任何人来得及检查之前。
  EN This hook command is not one of the usual compile-and-copy steps, so installing the package runs arbitrary code with the user's privileges before anything can be inspected.
  - `injector/package.json:53` — `"prepare": "node scripts/prepare.mjs",`
  - `package.json:7` — `"prepare": "node injector/scripts/prepare.mjs"`
  中 修复：把钩子收敛为 `tsc` 或 `npm run build` 之类的构建命令，或把这项工作移到一个由用户主动执行的显式脚本里。
  EN Fix: Reduce the hook to a build command such as `tsc` or `npm run build`, or move the work into an explicit script the user chooses to run.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `graded/lib/index.js:237` — `http://x`
  - `graded/lib/index.js:300` — `http://x`
  - `graded/lib/index.js:300` — `http://xsid`
  - `graded/lib/index.js:319` — `http://x`
  - ……另有 8 处 / … and 8 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `obf.long-minified-line` — 整行是压缩或机器生成的数据块 / Line is a single minified or machine-generated blob
  中 该行超过 500 个字符且几乎没有空白，正是打包载荷、压缩字符串表或机器生成单行代码的样子。这样的一行用肉眼什么也审不出来。
  EN The line is over 500 characters with almost no whitespace, which is what a bundled payload, a packed string table or a machine-generated one-liner looks like. Nothing on such a line is reviewable by eye.
  - `injector/src/index.ts:3050` — `writeFileSync(join(tmpDir, 'scripts', 'build.sh'), `#!/bin/bash\nset -euo pipefail\nROOT="$(cd "$(dirname "$0")/.." && pwd)"\ncd "$ROOT"\nCHECKOUT="\${DSH_CHECK…`
  - `injector/src/index.ts:3050` — `scriptsbuild.sh#!/bin/bash\nset -euo pipefail\nROOT="$(cd "$(dirname "$0")/.." && pwd)"\ncd "$ROOT"\nCHECKOUT="\${DSH_CHECKOUT:-}"\nif [ -z "$CHECKOUT" ] || [ !…`
  - `injector/src/index.ts:3050` — `scripts/build.sh/#!/bin/bash\nset -euo pipefail\nROOT="$(cd "$(dirname "$0")/.." && pwd)"\ncd "$ROOT"\nCHECKOUT="\${DSH_CHECKOUT:-}"\nif [ -z "$CHECKOUT" ] || […`
  中 修复：发布未压缩的源码，或在 README 中说明该文件由哪个构建产出、可读源码在哪里。
  EN Fix: Ship unminified source, or state in the README which build produced the file and where the readable source lives.
- **中 / MEDIUM** `persist.shell-rc-append` — 追加写入 shell 启动文件 / Appends to a shell startup file
  中 该行写入了 `.bashrc`、`.zshrc`、`.profile` 或 fish 配置，因此改动会在之后每个交互式 shell 中生效，而且删掉包目录也不会消失。
  EN The line writes into `.bashrc`, `.zshrc`, `.profile` or a fish config, so the change takes effect in every future interactive shell and survives removing the package directory.
  - `injector/src/index.ts:2600` — `if (args.profile) profileDirs = profileDirs.filter((d) => d === args.profile)`
  中 修复：不要修改 shell 启动文件；如果需要 shell 集成，就把那行内容打印出来，由用户自行决定是否添加。
  EN Fix: Do not modify shell startup files; if a shell integration is required, print the line for the user to add deliberately.
- **中 / MEDIUM** `prompt.concealed-instruction` — 把文本藏在注释或不可见字符中 / Hides text in a comment or invisible characters
  中 该行把内容藏在 HTML 注释里，或藏在零宽字符与双向控制字符之后，这些内容在 diff 或渲染后的文档中什么都看不见，却仍会作为文本被读取。
  EN The line conceals content either in an HTML comment or behind zero-width and bidirectional control characters, which render as nothing in a diff or a rendered document while still being read as text.
  - `install.ps1:1` — `# dsh-routing-suite 一键安装（Windows PowerShell）`
  中 修复：删除被隐藏的文本和不可见字符；审查者看不到的东西就不该出现在发布的包里。
  EN Fix: Delete the concealed text and the invisible characters; anything a reviewer cannot see does not belong in a shipped package.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 1 shipped file(s) are 64 KiB or larger and were not read as text, the largest being graded/dsh-external-dsh-graded-mode-0.0.1-rc1.tgz at 106 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `graded/dsh-external-dsh-graded-mode-0.0.1-rc1.tgz` — `108154 bytes not decoded as text`
  - `graded/client/client.js:243` — `fetch("/graded-mode/api/settings" + qs, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ conceptLimit: settings.limit, v…`
  - `graded/client/client.js:263` — `fetch("/graded-mode/api/settings" + qs).then((r) => r.json()).then((j) => { if (alive && j && j.conceptLimit !== undefined) { setLimit(j.conceptLimit); setVm(j.…`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (1)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `injector/src/index.ts:577` — `const profileNodeModules = config.profileNodeModules || join(dshHome, 'profiles', 'web', 'node_modules')`
  - `injector/src/index.ts:2221` — `const bundles: string[] = profilePkg?.dsh?.profile?.bundles ?? []`
  - `injector/src/index.ts:2600` — `if (args.profile) profileDirs = profileDirs.filter((d) => d === args.profile)`
  - `injector/src/index.ts:2601` — `if (!profileDirs.length) return 'ERROR: 未找到 profile: ' + (args.profile ?? '（空）')`
  - ……另有 3 处 / … and 3 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.

_按类别 / By category:_ 网络回调 / network callbacks 3 · 提示注入 / prompt injection 3 · 凭据读取 / credential access 2 · 滥用宿主环境 / harness abuse 2 · 混淆 / obfuscation 2 · 持久化 / persistence 2 · 安装脚本 / install scripts 2 · 数据外传 / exfiltration 1 · 供应链 / supply chain 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `dsh-routing-suite-HEAD/`
- not scanned (binary, contents unreadable as text): graded/dsh-external-dsh-graded-mode-0.0.1-rc1.tgz, preset/dsh-router-standard-0.3.0.tgz
- outbound fetching was permitted for this audit
- grade forced to D by a critical finding: exfil.environment-harvest-then-callback — Environment harvest and an outbound request in the same package
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
