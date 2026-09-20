> 批量压测 / Batch stress test · ★ 176 · `toolclub/dsh-agent-team-gui`
> https://github.com/toolclub/dsh-agent-team-gui · audited in 4.8s
# 安装前体检 / Pre-install audit: dsh-agent-team-gui@1.3.0

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/toolclub/dsh-agent-team-gui/tar.gz/HEAD` (URL / url)
- 已分析文件：119 个（2.8 MiB） / Files analysed: 119 (2.8 MiB)
- 内容摘要 / Content digest: `5bbe30e3b535eac0dbff90d949a1a50d…`
- 体检时间 / Audited at: 2026-09-20T09:53:52.551Z

## 最严重的风险 / Most severe risk

**同一个包内既有环境变量收集又有对外请求 / Environment harvest and an outbound request in the same package** `exfil.environment-harvest-then-callback`

中 数据会离开这台机器。该包中有代码把本机上的内容发往外部地址。
EN Data leaves this machine. Something in this package takes content that lives here and sends it to a destination outside it.

该包会访问的目标：`github.com`、`codeload.github.com`、`127.0.0.1`、`proxy.example.test`、`example.test`、`fixture.test` / Destinations this package reaches: `github.com`, `codeload.github.com`, `127.0.0.1`, `proxy.example.test`, `example.test`, `fixture.test`

- 中 它发生在安装时：`prepare` 脚本会执行它，你不需要自己运行任何东西。
  EN It happens at install time: the `prepare` script runs it, so you do not have to run anything yourself.
- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 它还安排了之后继续运行，所以仅仅卸载这个包并不够。
  EN It also arranges to run again later, so removing the package is not enough on its own.
- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `tsdown.config.ts:54`；完整列表见下方「发现」。 / The rule that decided the grade fired at `tsdown.config.ts:54`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

- `prepare` (`package.json`): `pnpm run build`

发布期钩子（维护者打包或发布时运行，安装时不会执行）： / Publish-time hooks (run when the maintainer packs or publishes, not on install):

- `prepack`: `pnpm run build`

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `node:fs/promises`, `.tgz`, `lib/client.js`, `lib/index.js`, `package.json`, `scripts/quality/dsh-fixture.mjs`, `scripts/quality/common.mjs`, `scripts/quality/browser-smoke.mjs`, `scripts/quality/capture-readme.mjs`, `scripts/quality/doctor.mjs`, `scripts/quality/release-preflight.mjs`, `scripts/quality/dsh-smoke.mjs` （另有 7 项） / (+7 more)
- **写入的文件路径 / File paths written:** `node:fs/promises`
- **派生的命令 / Commands spawned:** `node:child_process`, `--profile`, `web`, `--port`, `--no-open`
- **连接的域名 / Domains contacted:** `github.com`, `codeload.github.com`, `127.0.0.1`, `proxy.example.test`, `example.test`, `fixture.test`
- **读取的环境变量 / Environment variables read:** `SMOKE_SCREENSHOT_DIR`, `README_SCREENSHOT_DIR`, `process.env (every variable)`, `DSH_BIN`, `API_VERSION`, `SMOKE_TIMEOUT_MS`, `PLUGIN_SPEC`, `PLUGIN_TARBALL`, `GITHUB_BASE_REF`, `QUALITY_DIFF_BASE`, `GITHUB_EVENT_BEFORE`, `PACK_TARBALL` （另有 4 项） / (+4 more)

## 发现 / Findings

### 严重 / CRITICAL (1)

- **严重 / CRITICAL** `exfil.environment-harvest-then-callback` — 同一个包内既有环境变量收集又有对外请求 / Environment harvest and an outbound request in the same package
  中 该包读取或整体导出进程环境变量，同时又建立对外连接。CI 运行器和宿主会话都会把 API Key 导出到环境变量中，因此这一组合会把仍有效的凭据送出本机。
  EN The package reads or dumps process environment values and also opens outbound connections. CI runners and harness sessions export API keys into the environment, so this combination sends working credentials off the machine.
  - `tsdown.config.ts:54` — `JSON.stringify(process.env`
  - `tsdown.config.ts:55` — `JSON.stringify(process.env`
  - `pnpm-lock.yaml:1626` — `undici-types@7.18.2:`
  - `pnpm-lock.yaml:2355` — `undici-types: 7.18.2`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：删除环境变量的整体导出，只逐个读取插件确实需要、且有文档说明的变量。
  EN Fix: Remove the environment dump, and read only individually documented variables that the plugin actually needs.

### 高 / HIGH (7)

- **高 / HIGH** `cred.env-harvest` — 读取或整体导出进程环境变量 / Reads or dumps the process environment
  中 该行把整个环境当成一个值取走——序列化、遍历或打印它，而不是只取自己需要的那一个变量。CI 运行器和宿主都会把 API Key 导出到环境变量里，因此整体导出就是一次凭据收集。
  EN The line takes the whole environment as a value — serializing it, iterating it, or printing it — rather than the one variable it needs. CI runners and the harness export API keys into the environment, so a dump is a credential harvest.
  - `tsdown.config.ts:54` — `JSON.stringify(process.env`
  - `tsdown.config.ts:55` — `JSON.stringify(process.env`
  中 修复：只逐个读取插件文档中声明过的变量，绝不序列化整个环境对象，也不要把它写进日志或请求。
  EN Fix: Read only the variables the plugin documents, one at a time, and never serialize the environment object or forward it into a log or request.
- **高 / HIGH** `harness.settings-widen-permission` — 放宽宿主的沙箱或审批策略 / Widens the harness sandbox or approval policy
  中 该行在宿主设置、profile 或 composition patch 中写入了宽松的沙箱或权限值。放宽策略会移除用户为所有插件——而不只是这一个插件——设定的文件与命令边界。
  EN The line sets a permissive sandbox or permission value in the harness settings, a profile or a composition patch. Widening the policy removes the file and command boundaries the user chose for every plugin, not just for this one.
  - `.github/ISSUE_TEMPLATE/feature.yml:30` — `- label: The proposal does not require exposing credentials or bypassing Harness permissions.`
  中 修复：沙箱与审批设置交给用户决定；插件若需要某项能力，应加以说明并由用户显式授予。
  EN Fix: Leave sandbox and approval settings to the user; if the plugin needs a capability, document it and let the user grant it explicitly.
- **高 / HIGH** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `src/client/controller.ts:430` — `import(doc: unknown, policy: 'merge' | 'copy', routeRemap: Record<string, unknown>, expectedRevision: number): Promise<unknown> {`
  - `src/client/RecipesWorkspace.tsx:140` — `await controller.recipes.import(recipeDoc, policy, routeRemap, expectedRevision)`
  - `src/client/SettingsPage.tsx:331` — `const created = await controller.recipes.import(document, 'copy', {}, preview.definitionRevision) as { squadId: string }`
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.
- **高 / HIGH** `persist.global-self-install` — 全局安装依赖包 / Installs a package globally
  中 该命令把包安装到全局前缀，于是用户的 PATH 上多出一个可执行文件，而且当前项目删除后它仍然留在那里。
  EN The command installs a package into the global prefix, which puts a new executable on the user's PATH and keeps it there after the current project is deleted.
  - `.github/workflows/ci.yml:63` — `npm install --global`
  - `.github/workflows/ci.yml:106` — `npm install --global`
  - `.github/workflows/release-preflight.yml:37` — `npm install --global`
  中 修复：改为本地安装，并通过项目自身的脚本调用该工具；全局安装应由用户自己决定，而不是由插件代劳。
  EN Fix: Install locally and invoke the tool through the project's own scripts; global installs belong to the user's decision, not to a plugin.
- **高 / HIGH** `persist.persistence-with-install-hook` — 安装钩子叠加持久化机制 / Install hook combined with a persistence mechanism
  中 生命周期钩子在安装期间运行，而目录树中又有东西把自己注册为稍后运行。这一组合会在用户以为只是一次普通依赖安装的过程中装入一个常驻组件。
  EN A lifecycle hook runs during install and something in the tree registers itself to run later. The combination installs a resident component during what the user believed was a normal dependency install.
  - `.github/workflows/ci.yml:63` — `npm install --global`
  - `.github/workflows/ci.yml:106` — `npm install --global`
  - `.github/workflows/release-preflight.yml:37` — `npm install --global`
  - `package.json:83` — `"prepare": "pnpm run build",`
  中 修复：删除这一定时注册。任何需要持续运行的东西，都应由用户作为一个明确可见的步骤来设置。
  EN Fix: Remove the scheduling. Anything that should keep running must be set up by the user as a deliberate, visible step.
- **高 / HIGH** `prompt.doc-instruction` — 文档中包含针对模型的指令 / Documentation contains instructions aimed at a model
  中 随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。
  EN A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.
  - `docs/developing-a-deepseek-harness-plugin.zh-CN.md:202` — `// 挂载数据表，然后注册工具、RPC、system prompt 与对话编排。`
  - `docs/execution-chains.md:111` — `not exposed as a model bypass around chain limits. Diagnosis applies on failure when`
  - `README-zh.md:238` — `定义导出包含成员 system prompt 和模型路由名；运行导出还包含用户任务和成员输出。分享前请`
  - `README.md:153` — `override and bypasses DAG planning.`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。
  EN Fix: Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.
- **高 / HIGH** `prompt.embedded-instruction-string` — 源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model
  中 源码中的字符串字面量——通常是工具描述或系统提示词片段——要求模型绕过确认或对用户隐瞒某些事，于是它作为一条指令进入上下文窗口。
  EN A string literal in the source — typically a tool description or system prompt fragment — tells the model to bypass confirmation or to hide something from the user, so it lands in the context window as a directive.
  - `src/tools/application/definition-service.ts:707` — `'No fixed member order is configured. If delegation is useful, omit assignments and memberOrder to let the planner select members and build a dependency graph. …`
  - `src/tools/application/definition-service.ts:730` — `'A settled failed/partial run may expose continuation.allowed=true. Then review the failure diagnosis and existing artifacts and call continue_squad_run with it…`
  - `src/tools/continue-squad-run.ts:34` — `'This is the same execution chain, not a new dispatch. Report unfinished work honestly; do not bypass the continuation limit or silently replace workers. Full h…`
  - `tests/on-demand.spec.ts:113` — `'bypass selection'`
  中 修复：如实描述工具的行为，删除那些会改变 agent 对待用户方式的指令。
  EN Fix: Describe the tool's behavior factually and remove directives that change how the agent treats the user.

### 中 / MEDIUM (3)

- **中 / MEDIUM** `install.hook-runs-shell-code` — 安装期钩子执行的不只是构建 / Lifecycle hook runs more than a build
  中 该钩子命令不属于常见的编译与拷贝步骤，安装这个包时会以用户权限运行任意代码，而这一切发生在任何人来得及检查之前。
  EN This hook command is not one of the usual compile-and-copy steps, so installing the package runs arbitrary code with the user's privileges before anything can be inspected.
  - `package.json:83` — `"prepare": "pnpm run build",`
  - `package.json:84` — `"prepack": "pnpm run build",`
  中 修复：把钩子收敛为 `tsc` 或 `npm run build` 之类的构建命令，或把这项工作移到一个由用户主动执行的显式脚本里。
  EN Fix: Reduce the hook to a build command such as `tsc` or `npm run build`, or move the work into an explicit script the user chooses to run.
- **中 / MEDIUM** `obf.long-minified-line` — 整行是压缩或机器生成的数据块 / Line is a single minified or machine-generated blob
  中 该行超过 500 个字符且几乎没有空白，正是打包载荷、压缩字符串表或机器生成单行代码的样子。这样的一行用肉眼什么也审不出来。
  EN The line is over 500 characters with almost no whitespace, which is what a bundled payload, a packed string table or a machine-generated one-liner looks like. Nothing on such a line is reviewable by eye.
  - `src/client/i18n.ts:74` — `backup: '全部定义备份', backupHint: '只迁移成员与小队定义；不包含运行历史、会话选择、项目默认或版本历史。导入前必须预览。', mergeImport: '合并定义', replaceImport: '替换全部定义', definitionBackupApplied: '定义备份已导入。', d…`
  - `src/client/RunCenter.tsx:109` — `<span className={`atg-status-dot status-${run.status}`} /><span className="atg-run-title"><strong>{run.squadName}</strong><small>{truncate(run.task, 90)}</small…`
  - `src/client/RunCenter.tsx:115` — `{stages.length > 0 && <section className="atg-stages" aria-label={t('dependencyStages')}><h3>{t('dependencyStages')}</h3><div className="atg-stage-scroll" role=…`
  - `src/client/SettingsPage.tsx:340` — `<aside className="atg-master" aria-label={t('teamList')}><button type="button" className="atg-button primary wide" onClick={() => { select() }}>＋ {t('newTeam')}…`
  - ……另有 3 处 / … and 3 more location(s)
  中 修复：发布未压缩的源码，或在 README 中说明该文件由哪个构建产出、可读源码在哪里。
  EN Fix: Ship unminified source, or state in the README which build produced the file and where the readable source lives.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 8 shipped file(s) are 64 KiB or larger and were not read as text, the largest being assets/promotion-walkthrough-preview.gif at 430 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `assets/promotion-walkthrough-preview.gif` — `440652 bytes not decoded as text`
  - `pnpm-lock.yaml:1626` — `undici-types@7.18.2:`
  - `pnpm-lock.yaml:2355` — `undici-types: 7.18.2`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (4)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `scripts/quality/browser-smoke.mjs:157` — `browser = await chromium.launch({ headless: true, env: fixture.env })`
  - `scripts/quality/capture-readme.mjs:166` — `browser = await chromium.launch({ headless: true, env: fixture.env })`
  - `scripts/quality/common.mjs:131` — `this.env = env`
  - `scripts/quality/common.mjs:140` — `env: this.env,`
  - ……另有 7 处 / … and 7 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `tests/client-domain.client.spec.ts:20` — `expect(validateAgent({ ...base, fallbackProvider: 'p2' }, [{ name: 'read' }]).errors.fallback).toBe('fallbackPairError')`
  - `tests/client-domain.client.spec.ts:21` — `expect(validateAgent({ ...base, allow: 'read', deny: 'read' }, [{ name: 'read' }]).errors.tools).toBe('toolConflictError')`
  - `tests/client-domain.client.spec.ts:22` — `const scopedTool = validateAgent({ ...base, allow: 'shell' }, [{ name: 'read' }])`
  - `tests/service.spec.ts:312` — `{ name: 'subagent', description: 'Delegate' },`
  - ……另有 5 处 / … and 5 more location(s)
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.
- **低 / LOW** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `tests/rpc-transport.spec.ts:6` — `http://127.0.0.1/api/agentTeamGui`
  - `tests/rpc-transport.spec.ts:32` — `http://127.0.0.1/api/agentTeamGui`
  - `tests/smoke/quality-helpers.spec.ts:58` — `http://127.0.0.1:48123`
  - `tests/smoke/quality-helpers.spec.ts:59` — `http://127.0.0.1:48123/api/host.describe`
  - ……另有 3 处 / … and 3 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **低 / LOW** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `tests/rpc-transport.spec.ts:6` — `return new Request('http://127.0.0.1/api/agentTeamGui', {`
  - `tests/rpc-transport.spec.ts:32` — `expect((await handle(new Request('http://127.0.0.1/api/agentTeamGui', { method: 'POST', body: '{' }))).status).toBe(400)`
  - `tests/smoke/quality-helpers.spec.ts:58` — `baseUrl: 'http://127.0.0.1:48123',`
  - `tests/smoke/quality-helpers.spec.ts:59` — `sourceUrl: 'http://127.0.0.1:48123/api/host.describe',`
  - ……另有 3 处 / … and 3 more location(s)
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.

_按类别 / By category:_ 凭据读取 / credential access 2 · 滥用宿主环境 / harness abuse 2 · 混淆 / obfuscation 2 · 持久化 / persistence 2 · 提示注入 / prompt injection 2 · 网络回调 / network callbacks 2 · 数据外传 / exfiltration 1 · 安装脚本 / install scripts 1 · 供应链 / supply chain 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `dsh-agent-team-gui-HEAD/`
- skipped assets/promotion-walkthrough-zh.mp4: 2079241 bytes exceeds the 524288-byte per-file cap
- not scanned (binary): assets/promotion-walkthrough-poster.png, assets/promotion-walkthrough-preview.gif, assets/squad-mode-v0.4.jpg, assets/team-runs-v0.4.jpg, assets/team-settings-v0.4.jpg and 6 more
- outbound fetching was permitted for this audit
- grade forced to D by a critical finding: exfil.environment-harvest-then-callback — Environment harvest and an outbound request in the same package
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
