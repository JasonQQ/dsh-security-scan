> 批量压测 / Batch stress test · ★ 1736 · `NanmiCoder/dsh-agent-teams`
> https://github.com/NanmiCoder/dsh-agent-teams · audited in 3.8s
# 安装前体检 / Pre-install audit: legacy-plugin@0.1.1

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/NanmiCoder/dsh-agent-teams/tar.gz/HEAD` (URL / url)
- 已分析文件：652 个（10.3 MiB） / Files analysed: 652 (10.3 MiB)
- 内容摘要 / Content digest: `3547a48b6568f824d328b7256131b9a3…`
- 体检时间 / Audited at: 2026-09-20T09:52:02.026Z

## 最严重的风险 / Most severe risk

**同一个包内既有环境变量收集又有对外请求 / Environment harvest and an outbound request in the same package** `exfil.environment-harvest-then-callback`

中 数据会离开这台机器。该包中有代码把本机上的内容发往外部地址。
EN Data leaves this machine. Something in this package takes content that lives here and sends it to a destination outside it.

该包会访问的目标：`127.0.0.1`、`api.github.com`、`localhost`、`127.0.0.1:${portarg`、`github.com`、`registry.npmjs.org`、`json-schema.org`、`raw.githubusercontent.com` / Destinations this package reaches: `127.0.0.1`, `api.github.com`, `localhost`, `127.0.0.1:${portarg`, `github.com`, `registry.npmjs.org`, `json-schema.org`, `raw.githubusercontent.com`

- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 它还安排了之后继续运行，所以仅仅卸载这个包并不够。
  EN It also arranges to run again later, so removing the package is not enough on its own.
- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `tsdown.config.ts:73`；完整列表见下方「发现」。 / The rule that decided the grade fired at `tsdown.config.ts:73`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `\n\n`, `package.json`, `/tmp/judge.out`, `\n`, `files.txt`, `file.txt`, `node:fs/promises`, `result.json`, `patch.yml`, `.claude`, `../references/workflow-selection.schema.json`, `candidate/candidate.tgz` （另有 91 项） / (+91 more)
- **写入的文件路径 / File paths written:** `/logs/verifier/reward.txt`, `\n`, `file.txt`, `package.json`, `manifest-diff.txt`, `commits.txt`, `reverts.txt`, `node:fs/promises`, `stdout.log`, `stderr.log`, `legacy-note.txt`, `cordis.patch.yml` （另有 61 项） / (+61 more)
- **派生的命令 / Commands spawned:** `node:child_process`, `git`, `sh`, `-c`, `utf8`, `ignore`, `pipe`, `dsh`, `--profile`, `headless`, `ping`, `node:child_process|spawn\\(|exec(File)?Sync\\(|execa|Bun\\.spawn` （另有 25 项） / (+25 more)
- **连接的域名 / Domains contacted:** `127.0.0.1`, `api.github.com`, `localhost`, `127.0.0.1:${portarg`, `github.com`, `registry.npmjs.org`, `json-schema.org`, `raw.githubusercontent.com`, `www.w3.org`, `npm-registry-packages-npm-production`, `nodejs.org`, `slsa.dev` （另有 7 项） / (+7 more)
- **读取的环境变量 / Environment variables read:** `HOME`, `NPM_CONFIG_PREFIX`, `PATH`, `NPM_CONFIG_MAXSOCKETS`, `NPM_CONFIG_FETCH_RETRIES`, `NPM_CONFIG_FETCH_RETRY_MINTIMEOUT`, `NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT`, `NPM_CONFIG_FETCH_TIMEOUT`, `DSH_HARNESS_SOURCE_ROOT`, `VERIFIED_HOSTS`, `RUNNER_TEMP`, `EXPECTED_SHA256` （另有 17 项） / (+17 more)

## 发现 / Findings

### 严重 / CRITICAL (1)

- **严重 / CRITICAL** `exfil.environment-harvest-then-callback` — 同一个包内既有环境变量收集又有对外请求 / Environment harvest and an outbound request in the same package
  中 该包读取或整体导出进程环境变量，同时又建立对外连接。CI 运行器和宿主会话都会把 API Key 导出到环境变量中，因此这一组合会把仍有效的凭据送出本机。
  EN The package reads or dumps process environment values and also opens outbound connections. CI runners and harness sessions export API keys into the environment, so this combination sends working credentials off the machine.
  - `tsdown.config.ts:73` — `JSON.stringify(process.env`
  - `tsdown.config.ts:74` — `JSON.stringify(process.env`
  - `.dsh/skills/dsh-benchmark-case/assets/judge-utils.mjs:172` — `const r1 = await fetch(match[1], { redirect: "manual" });`
  - `.dsh/skills/dsh-upgrade-audit/scripts/materialize-npm.mjs:177` — `const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/compare/${range}`)`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：删除环境变量的整体导出，只逐个读取插件确实需要、且有文档说明的变量。
  EN Fix: Remove the environment dump, and read only individually documented variables that the plugin actually needs.

### 高 / HIGH (8)

- **高 / HIGH** `cred.env-harvest` — 读取或整体导出进程环境变量 / Reads or dumps the process environment
  中 该行把整个环境当成一个值取走——序列化、遍历或打印它，而不是只取自己需要的那一个变量。CI 运行器和宿主都会把 API Key 导出到环境变量里，因此整体导出就是一次凭据收集。
  EN The line takes the whole environment as a value — serializing it, iterating it, or printing it — rather than the one variable it needs. CI runners and the harness export API keys into the environment, so a dump is a credential harvest.
  - `tsdown.config.ts:73` — `JSON.stringify(process.env`
  - `tsdown.config.ts:74` — `JSON.stringify(process.env`
  中 修复：只逐个读取插件文档中声明过的变量，绝不序列化整个环境对象，也不要把它写进日志或请求。
  EN Fix: Read only the variables the plugin documents, one at a time, and never serialize the environment object or forward it into a log or request.
- **高 / HIGH** `harness.installed-package-edit` — 改动宿主安装目录或已安装的其他插件 / Touches the harness installation or another installed plugin
  中 该行读写宿主自身的安装目录，或 `node_modules` 下另一个插件的目录。修改已安装的代码会替换掉用户审查过的产物，并可能禁用或劫持任意插件。
  EN The line reads or writes inside the harness's own installation or another plugin's directory under `node_modules`. Editing installed code replaces the artifact the user reviewed and can disable or hijack any plugin.
  - `scripts/harness-model-benchmark.mjs:101` — `symlinkSync(join(runtime,'node_modules/@deepseek-ai'),join(profile,'node_modules/@deepseek-ai'),'dir');`
  中 修复：绝不在运行时修改已安装的包；把改动提交到上游，或提供一个增量插件。
  EN Fix: Never modify installed packages at runtime; contribute the change upstream or ship an additive plugin.
- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `.dsh/skills/dsh-benchmark-case/assets/judge-utils.mjs:175` — `const r2 = await fetch("http://127.0.0.1:3080/", { headers: { cookie } });`
  - `.dsh/skills/plugin-upgrade/examples/legacy-plugin/src/index.ts:51` — `server.listen(43121, '127.0.0.1') // http://localhost:43121/api/legacy`
  - `.dsh/skills/plugin-upgrade/scripts/ghost-host-check.mjs:133` — `const res = await fetch(`http://127.0.0.1:${portArg}/api/agentPreset.list`, {`
  - `.dsh/skills/plugin-upgrade/scripts/verify-runtime.mjs:56` — `const DEAD_MODEL_BASE_URL = 'http://127.0.0.1:9/v1' // port 9 (discard): nothing listens -> immediate ECONNREFUSED`
  - ……另有 15 处 / … and 15 more location(s)
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **高 / HIGH** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `docs/session-latency-audit-2026-09-12/host-boundary-probe.mjs:33` — `return import(pathToFileURL(file));`
  - `docs/session-latency-audit-2026-09-12/host-boundary-probe.mjs:38` — `const { queueMemberPrompt, guardSubagentDelivery } = await import(`
  - `docs/session-latency-audit-2026-09-12/host-boundary-probe.mjs:40` — `const { describeQualityLoop, canDeclareDelivery } = await import(`
  - `scripts/capabilities.test.mjs:21` — `const { ToolResultPruner } = await import(pathToFileURL(requireBase.resolve('@deepseek-ai/dsh-compaction-tool-result-pruner')).href)`
  - ……另有 7 处 / … and 7 more location(s)
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.
- **高 / HIGH** `persist.global-self-install` — 全局安装依赖包 / Installs a package globally
  中 该命令把包安装到全局前缀，于是用户的 PATH 上多出一个可执行文件，而且当前项目删除后它仍然留在那里。
  EN The command installs a package into the global prefix, which puts a new executable on the user's PATH and keeps it there after the current project is deleted.
  - `.github/workflows/publish.yml:56` — `npm install --global`
  - `.github/workflows/verify.yml:42` — `npm install --global`
  - `.github/workflows/verify.yml:91` — `npm install --global`
  - `.github/workflows/verify.yml:118` — `npm install --global`
  中 修复：改为本地安装，并通过项目自身的脚本调用该工具；全局安装应由用户自己决定，而不是由插件代劳。
  EN Fix: Install locally and invoke the tool through the project's own scripts; global installs belong to the user's decision, not to a plugin.
- **高 / HIGH** `priv.system-path-modification` — 修改系统路径或把文件设为全局可写 / Modifies a system path or makes a file world-writable
  中 该行写入 `/etc`、`/usr`、`/bin` 或 launch daemon 目录，把属主改为 root，或设置全局可写权限。任何一种都改变了安装包之外的机器状态，也可能为后续提权铺路。
  EN The line writes under `/etc`, `/usr`, `/bin` or a launch-daemon directory, changes ownership to root, or sets world-writable permissions. Any of these changes the machine beyond the installed package and can prepare an escalation later.
  - `docs/session-latency-audit-2026-09-12/complex-verification/scope-incident.json:8` — `"command": "cd /tmp/agentteams-complex-20260913-run3/candidate/workspace && mkdir -p .verify && ( node --input-type=module > .verify/server.log 2>&1 <<'EOF'\nim…`
  - `docs/session-latency-audit-2026-09-12/complex-verification/scope-incident.json:8` — `commandcd /tmp/agentteams-complex-20260913-run3/candidate/workspace && mkdir -p .verify && ( node --input-type=module > .verify/server.log 2>&1 <<'EOF'\nimport …`
  中 修复：把写入限制在包目录或用户自己的配置目录内，绝不要为了让安装成功而放宽权限。
  EN Fix: Keep writes inside the package or the user's own configuration directory, and never loosen permissions to make an install succeed.
- **高 / HIGH** `prompt.doc-instruction` — 文档中包含针对模型的指令 / Documentation contains instructions aimed at a model
  中 随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。
  EN A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.
  - `.dsh/skills/dsh-plugin-development/SKILL.md:22` — `- 工具、system prompt、HTTP、持久化、provider：host。`
  - `.dsh/skills/plugin-release/references/publish-playbook.md:23` — `> resolves the transitive dependencies of `file:` tarballs by bypassing overrides and looking for a`
  - `.dsh/skills/plugin-upgrade/references/api-migration-0.1.2-alpha.2.md:346` — `2. Do not use `as SettingsNamespace` to bypass the grammar; pass a literal directly and keep the inference.`
  - `.dsh/skills/plugin-upgrade/references/api-migration-0.1.2-alpha.2.md:429` — `The envelope semantics of `ignorable` itself are still in effect: when a reader meets an unknown type, it may continue only if that event already carries `ignor…`
  - ……另有 23 处 / … and 23 more location(s)
  中 修复：把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。
  EN Fix: Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.
- **高 / HIGH** `prompt.embedded-instruction-string` — 源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model
  中 源码中的字符串字面量——通常是工具描述或系统提示词片段——要求模型绕过确认或对用户隐瞒某些事，于是它作为一条指令进入上下文窗口。
  EN A string literal in the source — typically a tool description or system prompt fragment — tells the model to bypass confirmation or to hide something from the user, so it lands in the context window as a directive.
  - `.dsh/skills/plugin-upgrade/evals/evals.json:19` — `"Recognize the signature drift: from alpha.1 on, handle() drops the third parameter and ignores extra arguments at runtime; because the declared devDependencies…`
  - `docs/maintenance-2026-09-06/real-api/summary.json:211` — `"Earlier 178862738* runs failed before HTTP dispatch: the generated test profile package.json omitted version and the official package-inventory request extensi…`
  - `docs/releases/v0.1.19/repair.json:567` — `"You are the implementation/repair worker of this team.\n\nPROJECT DIRECTORY (absolute, the only place you may read, write or run commands in): /tmp/agentteams-…`
  - `scripts/lifecycle-verify.mjs:1037` — `'captain bypassed handoff'`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：如实描述工具的行为，删除那些会改变 agent 对待用户方式的指令。
  EN Fix: Describe the tool's behavior factually and remove directives that change how the agent treats the user.

### 中 / MEDIUM (7)

- **中 / MEDIUM** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `.dsh/skills/plugin-write/scripts/query-registry.check.mjs:25` — `name: 'web-search',`
  - `.dsh/skills/plugin-write/scripts/validate-names.check.mjs:23` — `name: 'web-search',`
  - `scripts/capabilities.test.mjs:183` — `const result = await host.tools.execute({ name: 'run_code', arguments: { code: 'return await tools.agent_teams_status({});', description: 'Read current team sta…`
  - `scripts/capabilities.test.mjs:193` — `const result = await host.tools.execute({ name: 'run_code', arguments: { code: 'await tools.agent_teams_status({}); return "STATUS_OUTPUT_DISCARDED";', descript…`
  - ……另有 3 处 / … and 3 more location(s)
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.
- **中 / MEDIUM** `install.hook-runs-shell-code` — 安装期钩子执行的不只是构建 / Lifecycle hook runs more than a build
  中 该钩子命令不属于常见的编译与拷贝步骤，安装这个包时会以用户权限运行任意代码，而这一切发生在任何人来得及检查之前。
  EN This hook command is not one of the usual compile-and-copy steps, so installing the package runs arbitrary code with the user's privileges before anything can be inspected.
  - `package.json:90` — `"prepublishOnly": "pnpm build && pnpm verify",`
  中 修复：把钩子收敛为 `tsc` 或 `npm run build` 之类的构建命令，或把这项工作移到一个由用户主动执行的显式脚本里。
  EN Fix: Reduce the hook to a build command such as `tsc` or `npm run build`, or move the work into an explicit script the user chooses to run.
- **中 / MEDIUM** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 17 distinct remote hosts (127.0.0.1:${portarg, api.github.com, github.com, json-schema.org, npm-registry-packages-npm-production, raw.githubusercontent.com, registry.npmjs.org, www.w3.org, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `.dsh/skills/dsh-upgrade-audit/scripts/materialize-npm.mjs:177` — `https://api.github.com/repos/${owner`
  - `.dsh/skills/plugin-upgrade/scripts/ghost-host-check.mjs:133` — `http://127.0.0.1:${portArg`
  - `.dsh/skills/plugin-upgrade/scripts/verify-runtime.check.mjs:132` — `https://github.com/user/plugin.git`
  - `.dsh/skills/plugin-upgrade/scripts/verify-runtime.mjs:247` — `https://registry.npmjs.org`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `.dsh/skills/dsh-benchmark-case/assets/judge-utils.mjs:175` — `http://127.0.0.1:3080/`
  - `.dsh/skills/plugin-upgrade/scripts/ghost-host-check.mjs:133` — `http://127.0.0.1:${portArg`
  - `.dsh/skills/plugin-upgrade/scripts/verify-runtime.mjs:56` — `http://127.0.0.1:9/v1`
  - `.dsh/skills/plugin-write/scripts/query-registry.check.mjs:167` — `http://127.0.0.1:1/index.json`
  - ……另有 15 处 / … and 15 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `obf.long-minified-line` — 整行是压缩或机器生成的数据块 / Line is a single minified or machine-generated blob
  中 该行超过 500 个字符且几乎没有空白，正是打包载荷、压缩字符串表或机器生成单行代码的样子。这样的一行用肉眼什么也审不出来。
  EN The line is over 500 characters with almost no whitespace, which is what a bundled payload, a packed string table or a machine-generated one-liner looks like. Nothing on such a line is reviewable by eye.
  - `scripts/fixtures/harness-complex-oracle.mjs:43` — `await check('32 concurrent purchases cannot oversell 20 units',async()=>{const s=await start(join(scratch,'concurrent.json'),{A:20,B:0,FREE:0});const results=aw…`
  - `scripts/fixtures/harness-complex-oracle.mjs:44` — `await check('16 simultaneous identical keys create one order',async()=>{const s=await start(join(scratch,'same-key.json'));const results=await Promise.all(Array…`
  - `scripts/fixtures/harness-issue-case.mjs:18` — `: '仅两个成员worker和reviewer。先创建implementation任务[SEED]分配worker，inScope=["data/sample.txt"]，' + (scenario === 'repair-conflict' ? 'outOfScope=["README.md"]（只对SEED有效，后…`
  - `scripts/fixtures/harness-issue-case.mjs:18` — `仅两个成员worker和reviewer。先创建implementation任务[SEED]分配worker，inScope=["data/sample.txt"]，repair-conflictoutOfScope=["README.md"]（只对SEED有效，后续修复应允许README.md），acceptance…`
  - ……另有 5 处 / … and 5 more location(s)
  中 修复：发布未压缩的源码，或在 README 中说明该文件由哪个构建产出、可读源码在哪里。
  EN Fix: Ship unminified source, or state in the README which build produced the file and where the readable source lives.
- **中 / MEDIUM** `persist.shell-rc-append` — 追加写入 shell 启动文件 / Appends to a shell startup file
  中 该行写入了 `.bashrc`、`.zshrc`、`.profile` 或 fish 配置，因此改动会在之后每个交互式 shell 中生效，而且删掉包目录也不会消失。
  EN The line writes into `.bashrc`, `.zshrc`, `.profile` or a fish config, so the change takes effect in every future interactive shell and survives removing the package directory.
  - `scripts/harness-runtime-verify.mjs:257` — `const assertions = { exit0: result.code === 0 && !result.timedOut, productMarker: result.stdout.includes('PROTOCOL_COMPATIBILITY_OK'), legacyAllowlistAndColdRes…`
  - `scripts/lifecycle-verify.mjs:404` — `invokedAgentTeamsInvocation([userMessage('/agent-teams-demo-delivery ship a CLI')], () => liveProfiles)?.profile === 'demo-delivery'`
  - `scripts/lifecycle-verify.mjs:407` — `invokedAgentTeamsInvocation([userMessage('/agent-teams-demo-delivery')], () => liveProfiles)?.profile === 'demo-delivery'`
  - `src/command.ts:96` — `if (parsed.profile !== undefined && !Object.keys(getProfiles()).some(key => key.trim() === parsed.profile)) return { kind: 'error', text: `unknown AgentTeams pr…`
  - ……另有 4 处 / … and 4 more location(s)
  中 修复：不要修改 shell 启动文件；如果需要 shell 集成，就把那行内容打印出来，由用户自行决定是否添加。
  EN Fix: Do not modify shell startup files; if a shell integration is required, print the line for the user to add deliberately.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 17 shipped file(s) are 64 KiB or larger and were not read as text, the largest being docs/releases/v0.1.17-rc.1/real-browser.png at 392 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `docs/releases/v0.1.17-rc.1/real-browser.png` — `401541 bytes not decoded as text`
  - `.dsh/skills/dsh-benchmark-case/assets/judge-utils.mjs:172` — `const r1 = await fetch(match[1], { redirect: "manual" });`
  - `.dsh/skills/dsh-upgrade-audit/scripts/materialize-npm.mjs:177` — `const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/compare/${range}`)`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (3)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `.dsh/skills/plugin-test/scripts/container-runner.mjs:68` — `env: options.env,`
  - `.dsh/skills/plugin-test/scripts/container-runner.mjs:277` — `['plugin', '--profile', config.profile, 'add', pluginPath],`
  - `.dsh/skills/plugin-test/scripts/docker-release-smoke.mjs:36` — `profile: requireString(input.profile, 'config.profile'),`
  - `.dsh/skills/plugin-test/scripts/docker-release-smoke.mjs:51` — `if (!profileName.test(config.profile)) throw new Error('config.profile contains unsupported characters')`
  - ……另有 69 处 / … and 69 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `exfil.local-data-in-request` — 在同一个请求里发送本地文件或环境变量数据 / Sends local file or environment data in one request
  中 同一行既读取本地文件或整个进程环境，又把结果直接送进对外的网络请求。这是本地数据流向第三方的最短路径，用户完全没机会先看一眼这些值。
  EN A single line reads local files, or the whole process environment, and passes the result straight into an outbound request. That is the shortest possible path from local data to a third party, with no chance for a user to see the value first.
  - `scripts/fixtures/harness-complex-oracle.mjs:44` — `await check('16 simultaneous identical keys create one order',async()=>{const s=await start(join(scratch,'same-key.json'));const results=await Promise.all(Array…`
  中 修复：把读取和发送拆开，只发送端点真正需要的具名字段，绝不整体上传环境变量。
  EN Fix: Separate the read from the send, send only the named fields the endpoint needs, and never include environment variables wholesale.
- **低 / LOW** `obf.decoded-payload-literal` — 携带解码、转义或高熵字面量 / Carries a decoded, escaped or high-entropy literal
  中 一个很长的字面量会在运行时被解码（base64、`atob`、`unescape`、`decodeURIComponent`），或者写满了密集的十六进制、Unicode 转义，或者呈现出编码数据块那种近乎均匀的字符分布。
  EN A long literal is decoded at runtime (base64, `atob`, `unescape`, `decodeURIComponent`), written with dense hex or unicode escapes, or has the near-uniform character distribution of an encoded blob.
  - `scripts/fixtures/harness-issue-case.mjs:13` — `'请用AgentTeams执行真实验证，立即运行无需审批。所有文件操作限制在消息开头指定的项目目录，给成员传递完整目录。队长不代写文件，不绕过契约，不读取项目以外的文件或插件配置。保留团队以便复核。禁止在agent_teams_create中使用plan参数；先仅建空团队再添加成员，必须用agent_teams_cre…`
  中 修复：把该值保存为可读源码，或保存为格式有文档说明的数据，让审查者能看清实际运行的到底是什么。
  EN Fix: Store the value as readable source or as data with a documented format, so a reviewer can see what is actually being run.

_按类别 / By category:_ 网络回调 / network callbacks 3 · 混淆 / obfuscation 3 · 数据外传 / exfiltration 2 · 凭据读取 / credential access 2 · 滥用宿主环境 / harness abuse 2 · 持久化 / persistence 2 · 提示注入 / prompt injection 2 · 提权 / privilege 1 · 安装脚本 / install scripts 1 · 供应链 / supply chain 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `dsh-agent-teams-HEAD/`
- skipped assets/ui.png: 749179 bytes exceeds the 524288-byte per-file cap
- skipped pnpm-lock.yaml: 555161 bytes exceeds the 524288-byte per-file cap
- not scanned (binary): assets/agent-teams/action-celebrating-v2.png, assets/agent-teams/action-reporting-v2.png, assets/agent-teams/action-sending-v2.png, assets/agent-teams/action-sleeping-v2.png, assets/agent-teams/action-thinking-v2.png and 20 more
- outbound fetching was permitted for this audit
- grade forced to D by a critical finding: exfil.environment-harvest-then-callback — Environment harvest and an outbound request in the same package
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
