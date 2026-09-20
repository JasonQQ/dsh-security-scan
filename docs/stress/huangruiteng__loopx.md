> 批量压测 / Batch stress test · ★ 5902 · `huangruiteng/loopx#packages/dsh-loopx-plugin`
> https://github.com/huangruiteng/loopx/tree/main/packages/dsh-loopx-plugin · audited in 7.8s
# 安装前体检 / Pre-install audit: dsh-loopx-plugin@0.1.1-beta.5

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/huangruiteng/loopx/tar.gz/HEAD` (URL / url)
- 已分析文件：51 个（584.5 KiB） / Files analysed: 51 (584.5 KiB)
- 内容摘要 / Content digest: `66da4b94720980a18cea49f55012a694…`
- 体检时间 / Audited at: 2026-09-20T09:51:50.699Z

## 最严重的风险 / Most severe risk

**执行运行时拼装出来的代码 / Evaluates code built at runtime** `obf.dynamic-code-eval`

中 它把自己的写法藏了起来，所以读源码基本看不出它真正执行的是什么。
EN It hides how it is written, so reading it tells a reviewer little about what it actually executes.

该包会访问的目标：`www.apache.org`、`github.com`、`fixture`、`127.0.0.1:${string(ctx.webserver.port`、`non-loopback.invalid`、`dsh.internal` / Destinations this package reaches: `www.apache.org`, `github.com`, `fixture`, `127.0.0.1:${string(ctx.webserver.port`, `non-loopback.invalid`, `dsh.internal`

- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `smoke/dsh-client-artifact-smoke.mjs:224`；完整列表见下方「发现」。 / The rule that decided the grade fired at `smoke/dsh-client-artifact-smoke.mjs:224`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

发布期钩子（维护者打包或发布时运行，安装时不会执行）： / Publish-time hooks (run when the maintainer packs or publishes, not on install):

- `prepack`: `pnpm build`

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `node:fs/promises`, `package.json`, `client.js`, `lib/client.js`, `\n`, `../src/observer.ts`
- **写入的文件路径 / File paths written:** `.loopx`, `registry.json`, `.loopx/registry.json`, `.codex`, `.codex/goals`, `node:fs/promises`, `\n`, `python3.998`
- **派生的命令 / Commands spawned:** `node:child_process`, `--profile`, `web`, `--port`, `--no-open`
- **连接的域名 / Domains contacted:** `www.apache.org`, `github.com`, `fixture`, `127.0.0.1:${string(ctx.webserver.port`, `non-loopback.invalid`, `dsh.internal`
- **读取的环境变量 / Environment variables read:** `DSH_BIN`, `process.env (every variable)`, `DSH_EXPECTED_VERSION`, `DSH_RUNTIME_SKIP_SESSION_FIXTURE`, `LOOPX_BIN`, `PYTHON_BIN`, `DSH_AGENTS_HOME`

## 发现 / Findings

### 严重 / CRITICAL (1)

- **严重 / CRITICAL** `obf.dynamic-code-eval` — 执行运行时拼装出来的代码 / Evaluates code built at runtime
  中 该行执行的是一个并非源码字面量的表达式，真正运行的代码在插件运行时才被拼装出来，无法在 tarball 中审查。
  EN The line evaluates an expression that is not a source literal, so the executed code is assembled while the plugin runs and cannot be reviewed in the tarball.
  - `smoke/dsh-client-artifact-smoke.mjs:224` — `vm.runInContext(source, context, { filename: sourcePath })`
  - `smoke/dsh-client-artifact-smoke.mjs:344` — `vm.runInContext(source, context, { filename: 'client.js' })`
  - `smoke/dsh-goalbar-runtime-smoke.mjs:687` — `vm.runInContext(await readFile(sourcePath, 'utf8'), context, { filename: sourcePath })`
  - `smoke/dsh-goalbar-runtime-smoke.mjs:726` — `vm.runInContext(source, context, { filename: 'served-client.js' })`
  中 修复：用静态函数或数据表替代动态求值；任何审计都无法为运行时才存在的代码背书。
  EN Fix: Replace the dynamic evaluation with a static function or a data table; there is no audit that can vouch for code that does not exist until runtime.

### 高 / HIGH (2)

- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `smoke/dsh-goalbar-runtime-smoke.mjs:364` — `baseUrl: `http://127.0.0.1:${String(ctx.webServer.port)}`,`
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **高 / HIGH** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `smoke/dsh-client-artifact-smoke.mjs:346` — `const clientExports = await modules.import(packageId, '', {})`
  - `smoke/dsh-client-artifact-smoke.mjs:383` — `const cachedExports = await modules.import(packageId, '', {})`
  - `smoke/dsh-client-artifact-smoke.mjs:401` — `return (await import(pathToFileURL(modulePath).href)).ClientModuleRegistry`
  - `smoke/dsh-client-artifact-smoke.mjs:463` — `import(pathToFileURL(resolutions.root).href),`
  - ……另有 10 处 / … and 10 more location(s)
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.

### 中 / MEDIUM (3)

- **中 / MEDIUM** `cred.read-dotenv-or-history` — 读取 dotenv 文件或 shell 历史 / Reads a dotenv file or shell history
  中 该行读取了 `.env` 或 shell 历史文件。这两处都是令牌、云密钥和曾经粘贴过的密钥堆积的地方，而 shell 历史还会勾勒出用户的基础设施全貌。
  EN This line reads `.env` or a shell history file. Both are where tokens, cloud keys and previously pasted secrets accumulate, and a shell history also maps out the user's infrastructure.
  - `src/cli.ts:320` — `const python = options.env?.PYTHON_BIN ?? process.env.PYTHON_BIN ?? 'python3'`
  - `src/init-command.ts:196` — `env: { ...(options.env ?? process.env), PYTHON_BIN: python },`
  中 修复：通过插件配置 schema 加载配置，而不是读取 dotenv 文件；永远不要打开用户的历史记录。
  EN Fix: Load configuration through the plugin config schema instead of reading dotenv files, and never open the user's history.
- **中 / MEDIUM** `install.hook-runs-shell-code` — 安装期钩子执行的不只是构建 / Lifecycle hook runs more than a build
  中 该钩子命令不属于常见的编译与拷贝步骤，安装这个包时会以用户权限运行任意代码，而这一切发生在任何人来得及检查之前。
  EN This hook command is not one of the usual compile-and-copy steps, so installing the package runs arbitrary code with the user's privileges before anything can be inspected.
  - `package.json:47` — `"prepack": "pnpm build",`
  中 修复：把钩子收敛为 `tsc` 或 `npm run build` 之类的构建命令，或把这项工作移到一个由用户主动执行的显式脚本里。
  EN Fix: Reduce the hook to a build command such as `tsc` or `npm run build`, or move the work into an explicit script the user chooses to run.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `smoke/dsh-client-artifact-smoke.mjs:501` — `http://fixture/api/loopx.goalbar`
  - `smoke/dsh-goalbar-runtime-smoke.mjs:364` — `http://127.0.0.1:${String(ctx.webServer.port`
  - `tests/goalbar-connection.spec.ts:303` — `http://fixture/api/loopx.goalbar`
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.

### 低 / LOW (4)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `src/cli.ts:84` — `env: options.env ?? process.env,`
  - `src/cli.ts:212` — `env: options.env,`
  - `src/cli.ts:319` — `const configured = options.env?.LOOPX_BIN ?? process.env.LOOPX_BIN`
  - `src/cli.ts:320` — `const python = options.env?.PYTHON_BIN ?? process.env.PYTHON_BIN ?? 'python3'`
  - ……另有 18 处 / … and 18 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `destructive.recursive-delete-system-path` — 递归删除指向用户主目录或系统目录 / Recursive delete aimed at a home or system directory
  中 递归删除的目标是用户主目录或系统路径，一旦变量写错、展开为空或缺少判空保护，被销毁的就是用户数据而不是包自己的构建产物。
  EN A recursive delete targets a home directory or a system path, so a wrong variable, an empty expansion or a missing guard destroys user data instead of the package's own build output.
  - `tests/observer.spec.ts:161` — `turn: 1, step: 1, callId: 'call-1', name: 'bash', arguments: '{"cmd":"rm -rf /"}',`
  中 修复：只删除包在自己目录下创建的路径，并在解析出的路径不位于该目录内时拒绝执行。
  EN Fix: Delete only paths the package created under its own directory, and refuse to run when the resolved path is not inside it.
- **低 / LOW** `destructive.shipped-command` — 内置破坏性文件系统命令 / Ships a destructive filesystem command
  中 抹掉用户主目录、根文件系统或分区的命令出现在可执行内容里，而不是文档描述中。即便有条件判断保护，这种原语也绝不该被塞进插件里。
  EN A command that erases a home directory, a root filesystem or a partition appears in executable content rather than in prose. Even guarded by a condition, it is a primitive that should never travel inside a plugin.
  - `tests/observer.spec.ts:161` — `turn: 1, step: 1, callId: 'call-1', name: 'bash', arguments: '{"cmd":"rm -rf /"}',`
  中 修复：删除该命令。插件如果必须清理，应把删除限定在它自己创建的目录，并以包根目录为基准解析这个路径。
  EN Fix: Delete the command. If a plugin must clean up, restrict deletion to a directory it created and resolve that path from the package root.
- **低 / LOW** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `tests/observer.spec.ts:161` — `turn: 1, step: 1, callId: 'call-1', name: 'bash', arguments: '{"cmd":"rm -rf /"}',`
  - `tests/observer.spec.ts:193` — `expect(envelopes[2]?.summary).toEqual({ turn: 1, step: 1, tool_name: 'bash' })`
  - `tests/observer.spec.ts:247` — `turn: 1, step: sequence, callId: value, name: 'bash',`
  - `tests/observer.spec.ts:256` — `turn: 1, step: sequence, callId: value, name: 'bash',`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.

_按类别 / By category:_ 混淆 / obfuscation 2 · 网络回调 / network callbacks 2 · 凭据读取 / credential access 2 · 破坏性 / destructive 2 · 安装脚本 / install scripts 1 · 滥用宿主环境 / harness abuse 1

## 扫描说明 / Scan notes

- scoped to the subdirectory `packages/dsh-loopx-plugin/`
- stripped the archive's single top-level directory `loopx-HEAD/`
- skipped pnpm-lock.yaml: 565977 bytes exceeds the 524288-byte per-file cap
- outbound fetching was permitted for this audit
- grade forced to D by a critical finding: obf.dynamic-code-eval — Evaluates code built at runtime
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
