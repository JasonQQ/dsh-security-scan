> 批量压测 / Batch stress test · ★ 187 · `PerryLink/dsh-auto-review`
> https://github.com/PerryLink/dsh-auto-review · audited in 0.9s
# 安装前体检 / Pre-install audit: dsh-auto-review@0.12.6

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

- 来源 / Source: `https://codeload.github.com/PerryLink/dsh-auto-review/tar.gz/HEAD` (URL / url)
- 已分析文件：120 个（1.8 MiB） / Files analysed: 120 (1.8 MiB)
- 内容摘要 / Content digest: `ab6187cdb1ddc25fcd3404b9dfc4246b…`
- 体检时间 / Audited at: 2026-09-20T09:53:45.938Z

## 最严重的风险 / Most severe risk

**同一个包内既有环境变量收集又有对外请求 / Environment harvest and an outbound request in the same package** `exfil.environment-harvest-then-callback`

中 数据会离开这台机器。该包中有代码把本机上的内容发往外部地址。
EN Data leaves this machine. Something in this package takes content that lives here and sends it to a destination outside it.

该包会访问的目标：`127.0.0.1`、`www.apache.org`、`github.com`、`docs.renovatebot.com`、`registry.npmjs.org` / Destinations this package reaches: `127.0.0.1`, `www.apache.org`, `github.com`, `docs.renovatebot.com`, `registry.npmjs.org`

- 中 它发生在安装时：`prepare` 脚本会执行它，你不需要自己运行任何东西。
  EN It happens at install time: the `prepare` script runs it, so you do not have to run anything yourself.
- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 它还安排了之后继续运行，所以仅仅卸载这个包并不够。
  EN It also arranges to run again later, so removing the package is not enough on its own.

决定该评级的规则命中于 `tsdown.config.ts:106`；完整列表见下方「发现」。 / The rule that decided the grade fired at `tsdown.config.ts:106`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

- `prepare` (`package.json`): `node scripts/prepare.mjs`

发布期钩子（维护者打包或发布时运行，安装时不会执行）： / Publish-time hooks (run when the maintainer packs or publishes, not on install):

- `prepublishOnly`: `pnpm run typecheck && pnpm test && pnpm run build && pnpm run verify:self-contained`

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `/tmp/doctor.json`, `../package.json`, `package.json`, `node:fs/promises`, `.tgz`, `lib/client.js`, `cordis.patch.yml`, `../../package.json`, `a.session.jsonl`
- **写入的文件路径 / File paths written:** `../lib`, `package.json`, `node:fs/promises`, `keep.txt`, `junk.js`, `node_modules/junk.js`, `base.txt`
- **派生的命令 / Commands spawned:** `node:child_process`, `inherit`, `pnpm`, `install`, `--ignore-scripts`
- **连接的域名 / Domains contacted:** `127.0.0.1`, `www.apache.org`, `github.com`, `docs.renovatebot.com`, `registry.npmjs.org`
- **读取的环境变量 / Environment variables read:** `process.env (every variable)`, `DSH_EVAL_SESSIONS_ROOT`, `DSH_EVAL_SESSION_COMPRESSION`, `DSH_EVAL_WORKSPACE_ROOT`, `PINNED_REF`, `NODE_ENV`

## 发现 / Findings

### 严重 / CRITICAL (1)

- **严重 / CRITICAL** `exfil.environment-harvest-then-callback` — 同一个包内既有环境变量收集又有对外请求 / Environment harvest and an outbound request in the same package
  中 该包读取或整体导出进程环境变量，同时又建立对外连接。CI 运行器和宿主会话都会把 API Key 导出到环境变量中，因此这一组合会把仍有效的凭据送出本机。
  EN The package reads or dumps process environment values and also opens outbound connections. CI runners and harness sessions export API keys into the environment, so this combination sends working credentials off the machine.
  - `tsdown.config.ts:106` — `JSON.stringify(process.env`
  - `tsdown.config.ts:107` — `JSON.stringify(process.env`
  - `demo/capture-demo.mjs:42` — `const response = await fetch(`/api/${method}`, {`
  - `demo/capture-diag.mjs:23` — `const response = await fetch(`/api/${method}`, {`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：删除环境变量的整体导出，只逐个读取插件确实需要、且有文档说明的变量。
  EN Fix: Remove the environment dump, and read only individually documented variables that the plugin actually needs.

### 高 / HIGH (7)

- **高 / HIGH** `cred.env-harvest` — 读取或整体导出进程环境变量 / Reads or dumps the process environment
  中 该行把整个环境当成一个值取走——序列化、遍历或打印它，而不是只取自己需要的那一个变量。CI 运行器和宿主都会把 API Key 导出到环境变量里，因此整体导出就是一次凭据收集。
  EN The line takes the whole environment as a value — serializing it, iterating it, or printing it — rather than the one variable it needs. CI runners and the harness export API keys into the environment, so a dump is a credential harvest.
  - `tsdown.config.ts:106` — `JSON.stringify(process.env`
  - `tsdown.config.ts:107` — `JSON.stringify(process.env`
  中 修复：只逐个读取插件文档中声明过的变量，绝不序列化整个环境对象，也不要把它写进日志或请求。
  EN Fix: Read only the variables the plugin documents, one at a time, and never serialize the environment object or forward it into a log or request.
- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `demo/capture-demo.mjs:12` — `const BASE = 'http://127.0.0.1:3090'`
  - `demo/capture-diag.mjs:19` — `await page.goto('http://127.0.0.1:3090', { waitUntil: 'load' })`
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **高 / HIGH** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `scripts/loader-runner.mjs:70` — `async import(specifier) {`
  - `scripts/loader-runner.mjs:71` — `if (specifier.startsWith('file:')) return import(specifier)`
  - `scripts/loader-runner.mjs:72` — `if (specifier.startsWith('node:')) return import(specifier)`
  - `scripts/loader-runner.mjs:74` — `return import(pathToFileURL(absolute ? specifier : configRequire.resolve(specifier)).href)`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.
- **高 / HIGH** `persist.global-self-install` — 全局安装依赖包 / Installs a package globally
  中 该命令把包安装到全局前缀，于是用户的 PATH 上多出一个可执行文件，而且当前项目删除后它仍然留在那里。
  EN The command installs a package into the global prefix, which puts a new executable on the user's PATH and keeps it there after the current project is deleted.
  - `.github/workflows/compat.yml:86` — `npm install -g`
  - `.github/workflows/publish.yml:66` — `npm install -g`
  中 修复：改为本地安装，并通过项目自身的脚本调用该工具；全局安装应由用户自己决定，而不是由插件代劳。
  EN Fix: Install locally and invoke the tool through the project's own scripts; global installs belong to the user's decision, not to a plugin.
- **高 / HIGH** `persist.persistence-with-install-hook` — 安装钩子叠加持久化机制 / Install hook combined with a persistence mechanism
  中 生命周期钩子在安装期间运行，而目录树中又有东西把自己注册为稍后运行。这一组合会在用户以为只是一次普通依赖安装的过程中装入一个常驻组件。
  EN A lifecycle hook runs during install and something in the tree registers itself to run later. The combination installs a resident component during what the user believed was a normal dependency install.
  - `.github/workflows/compat.yml:86` — `npm install -g`
  - `.github/workflows/publish.yml:66` — `npm install -g`
  - `package.json:236` — `"prepare": "node scripts/prepare.mjs",`
  中 修复：删除这一定时注册。任何需要持续运行的东西，都应由用户作为一个明确可见的步骤来设置。
  EN Fix: Remove the scheduling. Anything that should keep running must be set up by the user as a deliberate, visible step.
- **高 / HIGH** `prompt.doc-instruction` — 文档中包含针对模型的指令 / Documentation contains instructions aimed at a model
  中 随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。
  EN A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.
  - `AGENTS.md:28` — `- The `never` approval policy is enforced inside the core service; this plugin never tries to bypass it.`
  - `CHANGELOG.md:77` — `- `src/eval/trace.ts`: the traced system prompt is read from the last non-empty `system/message` surface node on the 0.1.5 line (the prompt moved into the messa…`
  - `CHANGELOG.md:222` — `- **Prompt regression** (`expect.prompt`): the rendered system prompt must match a committed `baseline` (inline or via `baselineFrom` file); any drift is report…`
  - `CHANGELOG.md:271` — `- **dsh-eval agent evaluation engine** (`dsh-auto-review/eval` + the `dsh-eval` CLI): a YAML case DSL (`input`, structured `expect` block — tool-call sequence w…`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。
  EN Fix: Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.
- **高 / HIGH** `prompt.embedded-instruction-string` — 源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model
  中 源码中的字符串字面量——通常是工具描述或系统提示词片段——要求模型绕过确认或对用户隐瞒某些事，于是它作为一条指令进入上下文窗口。
  EN A string literal in the source — typically a tool description or system prompt fragment — tells the model to bypass confirmation or to hide something from the user, so it lands in the context window as a directive.
  - `src/eval/assert.ts:326` — `'the captured system prompt'`
  - `src/eval/assert.ts:327` — `'no system prompt captured (the log had no request/header event)'`
  - `src/eval/assert.ts:348` — ``system prompt matches the baseline (${baseline.split('\n').length} line(s))``
  - `src/eval/assert.ts:351` — `'system prompt matches the baseline'`
  - ……另有 9 处 / … and 9 more location(s)
  中 修复：如实描述工具的行为，删除那些会改变 agent 对待用户方式的指令。
  EN Fix: Describe the tool's behavior factually and remove directives that change how the agent treats the user.

### 中 / MEDIUM (5)

- **中 / MEDIUM** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `eval/cases/demo.yaml:60` — `- tool: read`
  - `eval/cases/demo.yaml:64` — `- tool: write`
  - `eval/cases/demo.yaml:69` — `- tool: read`
  - `scripts/loader-runner.mjs:101` — `{ agent, toolName: 'bash', reason: 'loader smoke' },`
  - ……另有 62 处 / … and 62 more location(s)
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.
- **中 / MEDIUM** `install.hook-runs-shell-code` — 安装期钩子执行的不只是构建 / Lifecycle hook runs more than a build
  中 该钩子命令不属于常见的编译与拷贝步骤，安装这个包时会以用户权限运行任意代码，而这一切发生在任何人来得及检查之前。
  EN This hook command is not one of the usual compile-and-copy steps, so installing the package runs arbitrary code with the user's privileges before anything can be inspected.
  - `package.json:122` — `"install": "docs/omdsh-evidence/install.md",`
  - `package.json:236` — `"prepare": "node scripts/prepare.mjs",`
  - `package.json:239` — `"prepublishOnly": "pnpm run typecheck && pnpm test && pnpm run build && pnpm run verify:self-contained"`
  中 修复：把钩子收敛为 `tsc` 或 `npm run build` 之类的构建命令，或把这项工作移到一个由用户主动执行的显式脚本里。
  EN Fix: Reduce the hook to a build command such as `tsc` or `npm run build`, or move the work into an explicit script the user chooses to run.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `demo/capture-demo.mjs:12` — `http://127.0.0.1:3090`
  - `demo/capture-diag.mjs:19` — `http://127.0.0.1:3090`
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `prompt.concealed-instruction` — 把文本藏在注释或不可见字符中 / Hides text in a comment or invisible characters
  中 该行把内容藏在 HTML 注释里，或藏在零宽字符与双向控制字符之后，这些内容在 diff 或渲染后的文档中什么都看不见，却仍会作为文本被读取。
  EN The line conceals content either in an HTML comment or behind zero-width and bidirectional control characters, which render as nothing in a diff or a rendered document while still being read as text.
  - `renovate.json5:1` — `{`
  中 修复：删除被隐藏的文本和不可见字符；审查者看不到的东西就不该出现在发布的包里。
  EN Fix: Delete the concealed text and the invisible characters; anything a reviewer cannot see does not belong in a shipped package.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 2 shipped file(s) are 64 KiB or larger and were not read as text, the largest being docs/demo-auto-review.gif at 362 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `docs/demo-auto-review.gif` — `370528 bytes not decoded as text`
  - `demo/capture-demo.mjs:42` — `const response = await fetch(`/api/${method}`, {`
  - `demo/capture-diag.mjs:23` — `const response = await fetch(`/api/${method}`, {`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (4)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `tsdown.config.ts:107` — `'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV ?? 'production'),`
  - `tsdown.config.ts:108` — `'import.meta.env': JSON.stringify({ MODE: process.env.NODE_ENV ?? 'production' }),`
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `destructive.recursive-delete-system-path` — 递归删除指向用户主目录或系统目录 / Recursive delete aimed at a home or system directory
  中 递归删除的目标是用户主目录或系统路径，一旦变量写错、展开为空或缺少判空保护，被销毁的就是用户数据而不是包自己的构建产物。
  EN A recursive delete targets a home directory or a system path, so a wrong variable, an empty expansion or a missing guard destroys user data instead of the package's own build output.
  - `test/cache-integration.spec.ts:73` — `presentCall(harness, CallId('call-2'), '{"command":"rm -rf /"}')`
  - `test/cache-integration.spec.ts:73` — `call-2{"command":"rm -rf /"}`
  - `test/cache-integration.spec.ts:108` — `presentCall(harness, CallId('call-1'), '{"command":"rm -rf /"}')`
  - `test/cache-integration.spec.ts:108` — `call-1{"command":"rm -rf /"}`
  - ……另有 4 处 / … and 4 more location(s)
  中 修复：只删除包在自己目录下创建的路径，并在解析出的路径不位于该目录内时拒绝执行。
  EN Fix: Delete only paths the package created under its own directory, and refuse to run when the resolved path is not inside it.
- **低 / LOW** `destructive.shipped-command` — 内置破坏性文件系统命令 / Ships a destructive filesystem command
  中 抹掉用户主目录、根文件系统或分区的命令出现在可执行内容里，而不是文档描述中。即便有条件判断保护，这种原语也绝不该被塞进插件里。
  EN A command that erases a home directory, a root filesystem or a partition appears in executable content rather than in prose. Even guarded by a condition, it is a primitive that should never travel inside a plugin.
  - `test/cache-integration.spec.ts:73` — `presentCall(harness, CallId('call-2'), '{"command":"rm -rf /"}')`
  - `test/cache-integration.spec.ts:73` — `call-2{"command":"rm -rf /"}`
  - `test/cache-integration.spec.ts:108` — `presentCall(harness, CallId('call-1'), '{"command":"rm -rf /"}')`
  - `test/cache-integration.spec.ts:108` — `call-1{"command":"rm -rf /"}`
  - ……另有 4 处 / … and 4 more location(s)
  中 修复：删除该命令。插件如果必须清理，应把删除限定在它自己创建的目录，并以包根目录为基准解析这个路径。
  EN Fix: Delete the command. If a plugin must clean up, restrict deletion to a directory it created and resolve that path from the package root.
- **低 / LOW** `supply.build-script-excluded-from-package` — 安装钩子运行的脚本被发布文件集排除在外 / Install hook runs a script the published file set excludes
  中 清单声明的安装钩子所引用的脚本没有被 `files` 白名单包含，或被 `.npmignore` 匹配排除。这样一来，从仓库安装时运行的文件与被审计和测试过的并不是同一个，甚至根本不存在。
  EN The prepare hook runs scripts/prepare.mjs, but the files allowlist (lib, src, bin, eval, cordis.patch.yml, CHANGELOG.md, README.md, README-zh.md, README-es.md, README-pt.md, README-hi.md, LICENSE) does not cover scripts/prepare.mjs. The published tarball therefore behaves differently from this source tree.
  - `package.json:236` — `"prepare": "node scripts/prepare.mjs",`
  中 修复：把被引用的脚本加入 `files`，或把钩子移到会被发布的文件里。
  EN Fix: Add the referenced script to `files`, or move the hook into a file that is published.

_按类别 / By category:_ 提示注入 / prompt injection 3 · 凭据读取 / credential access 2 · 网络回调 / network callbacks 2 · 持久化 / persistence 2 · 供应链 / supply chain 2 · 破坏性 / destructive 2 · 数据外传 / exfiltration 1 · 混淆 / obfuscation 1 · 滥用宿主环境 / harness abuse 1 · 安装脚本 / install scripts 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `dsh-auto-review-HEAD/`
- not scanned (binary, contents unreadable as text): docs/demo-auto-review.gif, docs/demo.gif
- outbound fetching was permitted for this audit
- grade forced to D by a critical finding: exfil.environment-harvest-then-callback — Environment harvest and an outbound request in the same package
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
