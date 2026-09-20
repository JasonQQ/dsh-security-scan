> 批量压测 / Batch stress test · ★ 386 · `omdsh-dev/dsh-mnemon`
> https://github.com/omdsh-dev/dsh-mnemon · audited in 13.9s
# 安装前体检 / Pre-install audit: issue261-turn-tail-peers@0.0.0

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/omdsh-dev/dsh-mnemon/tar.gz/HEAD` (URL / url)
- 已分析文件：1172 个（35.2 MiB） / Files analysed: 1172 (35.2 MiB)
- 内容摘要 / Content digest: `d71d63f49c5f2ca1877c42e24eb7e5b3…`
- 体检时间 / Audited at: 2026-09-20T09:53:17.917Z

## 最严重的风险 / Most severe risk

**同一个包内既有环境变量收集又有对外请求 / Environment harvest and an outbound request in the same package** `exfil.environment-harvest-then-callback`

中 数据会离开这台机器。该包中有代码把本机上的内容发往外部地址。
EN Data leaves this machine. Something in this package takes content that lives here and sends it to a destination outside it.

该包会访问的目标：`github.com`、`registry.npmjs.org`、`www.npmjs.com`、`localhost`、`www.w3.org`、`user`、`127.0.0.1`、`127.0.0.1:${model.address(` / Destinations this package reaches: `github.com`, `registry.npmjs.org`, `www.npmjs.com`, `localhost`, `www.w3.org`, `user`, `127.0.0.1`, `127.0.0.1:${model.address(`

- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 它还安排了之后继续运行，所以仅仅卸载这个包并不够。
  EN It also arranges to run again later, so removing the package is not enough on its own.
- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `plugins/dsh-mnemon-source-memory-spaces/src/runner.ts:61`；完整列表见下方「发现」。 / The rule that decided the grade fired at `plugins/dsh-mnemon-source-memory-spaces/src/runner.ts:61`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `node:fs/promises`, `tsconfig.json`, `node_modules/@deepseek-ai`, `package.json`, `artifacts.json`, `root-pack.json`, `node_modules/@deepseek-ai/package.json`, `package-lock.json`, `node_modules/@deepseek-ai/dsh/package.json`, `./e2e/framework-peers-${cohort}.json`, `ADR.md`, `.mnemon` （另有 67 项） / (+67 more)
- **写入的文件路径 / File paths written:** `node:fs/promises`, `\n`, `source-diff.patch`, `artifacts.json`, `package.json`, `settings.yaml`, `README.md`, `model-events.jsonl`, `model-requests.jsonl`, `model-errors.log`, `result.json`, `artifact.json` （另有 63 项） / (+63 more)
- **派生的命令 / Commands spawned:** `node:child_process`, `git`, `utf8`, `tar`, `-xOf`, `package/package.json`, `ignore`, `pipe`, `npm`, `pack`, `--ignore-scripts`, `--json` （另有 52 项） / (+52 more)
- **连接的域名 / Domains contacted:** `github.com`, `registry.npmjs.org`, `www.npmjs.com`, `localhost`, `www.w3.org`, `user`, `127.0.0.1`, `127.0.0.1:${model.address(`, `127.0.0.1:${registry.address(`, `registry.npmjs.orgapplication`, `api.deepseek.com`, `api.hindsight.vectorize.io` （另有 43 项） / (+43 more)
- **读取的环境变量 / Environment variables read:** `MNEMON_GIT_PROBE_PHASE`, `MNEMON_GIT_PROBE_TRACE`, `MNEMON_CLI_PATH`, `MNEMON_OPENVIKING_TEST_ENDPOINT`, `MNEMON_OPENVIKING_TEST_API_KEY`, `MNEMON_OPENVIKING_TEST_REPORT`, `NODE_ENV`, `process.env (every variable)`, `MNEMON_DATA_DIR`, `MNEMON_STORE`, `MNEMON_NATIVE_TEST_CLI`, `MNEMON_EMBED_ENDPOINT` （另有 36 项） / (+36 more)

## 发现 / Findings

### 严重 / CRITICAL (1)

- **严重 / CRITICAL** `exfil.environment-harvest-then-callback` — 同一个包内既有环境变量收集又有对外请求 / Environment harvest and an outbound request in the same package
  中 该包读取或整体导出进程环境变量，同时又建立对外连接。CI 运行器和宿主会话都会把 API Key 导出到环境变量中，因此这一组合会把仍有效的凭据送出本机。
  EN The package reads or dumps process environment values and also opens outbound connections. CI runners and harness sessions export API keys into the environment, so this combination sends working credentials off the machine.
  - `plugins/dsh-mnemon-source-memory-spaces/src/runner.ts:61` — `Object.entries(process.env`
  - `tsdown.config.ts:53` — `JSON.stringify(process.env`
  - `plugins/dsh-mnemon-provider-hindsight/src/driver.ts:79` — `await this.request(body, '/health/live', { headers: this.headers(connection), signal })`
  - `plugins/dsh-mnemon-provider-hindsight/src/driver.ts:82` — `this.request(body, `${this.bankPath(connection)}/stats`, { headers: this.headers(connection), signal }),`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：删除环境变量的整体导出，只逐个读取插件确实需要、且有文档说明的变量。
  EN Fix: Remove the environment dump, and read only individually documented variables that the plugin actually needs.

### 高 / HIGH (11)

- **高 / HIGH** `cred.env-harvest` — 读取或整体导出进程环境变量 / Reads or dumps the process environment
  中 该行把整个环境当成一个值取走——序列化、遍历或打印它，而不是只取自己需要的那一个变量。CI 运行器和宿主都会把 API Key 导出到环境变量里，因此整体导出就是一次凭据收集。
  EN The line takes the whole environment as a value — serializing it, iterating it, or printing it — rather than the one variable it needs. CI runners and the harness export API keys into the environment, so a dump is a credential harvest.
  - `plugins/dsh-mnemon-source-memory-spaces/src/runner.ts:61` — `Object.entries(process.env`
  - `tsdown.config.ts:53` — `JSON.stringify(process.env`
  中 修复：只逐个读取插件文档中声明过的变量，绝不序列化整个环境对象，也不要把它写进日志或请求。
  EN Fix: Read only the variables the plugin documents, one at a time, and never serialize the environment object or forward it into a log or request.
- **高 / HIGH** `cred.environment-secret-enumeration` — 枚举大量不同名称的密钥类环境变量 / Enumerates many differently-named secret environment variables
  中 该包读取了一批看起来是凭据的环境变量，而它对这些服务并没有其他任何调用。读一个文档中声明的 key 是插件正常的认证方式；扫走五个以上不同名称的密钥，是在收集凭据。
  EN 5 distinct secret-named environment variables are read (MNEMON_OPENVIKING_TEST_API_KEY, MNEMON_EMBED_API_KEY, OPENVIKING_ROOT_API_KEY, SUPERMEMORY_API_KEY, DEEPSEEK_API_KEY).
  - `plugins/dsh-mnemon-provider-openviking/tests/integration.spec.ts:8` — `const apiKey = process.env.MNEMON_OPENVIKING_TEST_API_KEY ?? ''`
  - `plugins/dsh-mnemon-source-memory-spaces/tests/runner-config.spec.ts:42` — `expect(process.env.MNEMON_EMBED_API_KEY).toBe('host-secret')`
  - `scripts/probe-provider-lab.mjs:4` — `['OpenViking', 'http://127.0.0.1:1933/health', { headers: { Authorization: `Bearer ${process.env.OPENVIKING_ROOT_API_KEY ?? 'dsh-provider-lab-local-only'}`, 'X-…`
  - `scripts/seed-provider-lab.mjs:16` — `const supermemoryApiKey = process.env.SUPERMEMORY_API_KEY?.trim()`
  中 修复：删掉与本插件功能无关的变量读取，只保留其文档化集成所需的键。
  EN Fix: Delete the reads of variables this plugin has no feature for, and keep only the keys its documented integration needs.
- **高 / HIGH** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 51 distinct remote hosts (127.0.0.1:${model.address(, 127.0.0.1:${registry.address(, github.com, registry.npmjs.org, registry.npmjs.orgapplication, user, www.npmjs.com, www.w3.org, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `.github/ISSUE_TEMPLATE/bug_report.yml:18` — `https://github.com/omdsh-dev/dsh-mnemon/issues?q=is%3Aissue`
  - `.github/workflows/publish.yml:51` — `https://registry.npmjs.org`
  - `.github/workflows/publish.yml:118` — `https://www.npmjs.com/package/dsh-mnemon/v/${{`
  - `.github/workflows/reject-docs-pr.yml:49` — `https://github.com/${context.repo.owner`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `docs/pr-assets/issue-233-openviking-20260916/verification.json:18` — `"endpoint": "http://127.0.0.1:19335",`
  - `docs/pr-assets/issue-233-openviking-20260916/verification.json:41` — `"endpoint": "http://127.0.0.1:19333",`
  - `docs/pr-assets/issue-261-dsh-slots/harness/headless-check.mjs:61` — `const env = { ...process.env, DSH_HOME: home, DSH_TELEMETRY_DISABLED: '1', DSH_TELEMETRY_MODE: 'DISABLED', MNEMON_DATA_DIR: data, MNEMON_CLI_PATH: nativeCli, DE…`
  - `docs/pr-assets/issue-261-dsh-slots/harness/packed-e2e.mjs:60` — `const path = new URL(request.url, 'http://127.0.0.1').pathname;`
  - ……另有 62 处 / … and 62 more location(s)
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **高 / HIGH** `net.token-or-blob-in-url` — 把凭据或编码数据块放进 URL / Puts a credential or encoded blob in a URL
  中 令牌形状的查询参数、内嵌的 `user:password` 授权部分，或超长高熵的查询值，都意味着密钥或载荷数据在 URL 中传输，最终会留在访问日志、代理和浏览器历史里。
  EN A token-shaped query parameter, an embedded `user:password` authority, or a long high-entropy query value means secret material or payload data travels in a URL, where it lands in access logs, proxies and browser history.
  - `plugins/dsh-mnemon-source-memory-spaces/tests/config.spec.ts:28` — `'https://«redacted»@localhost:11434'`
  - `provider-lab/docker-compose.yml:33` — `//postgres:postgres@`
  - `tests/source-failures.spec.ts:62` — `'https://private.example?token=DO-NOT-EXPOSE'`
  中 修复：凭据放在 Authorization 头里发送，载荷用 POST 放在请求体中，不要编码进查询字符串。
  EN Fix: Send credentials in an Authorization header, and POST payloads in the body rather than encoding them into the query string.
- **高 / HIGH** `obf.decoded-payload-literal` — 携带解码、转义或高熵字面量 / Carries a decoded, escaped or high-entropy literal
  中 一个很长的字面量会在运行时被解码（base64、`atob`、`unescape`、`decodeURIComponent`），或者写满了密集的十六进制、Unicode 转义，或者呈现出编码数据块那种近乎均匀的字符分布。
  EN A long literal is decoded at runtime (base64, `atob`, `unescape`, `decodeURIComponent`), written with dense hex or unicode escapes, or has the near-uniform character distribution of an encoded blob.
  - `plugins/dsh-mnemon-provider-byterover/src/icon.ts:2` — `"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHZpZXdCb3g9IjAgMCAzNiAzNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhd…`
  - `plugins/dsh-mnemon-provider-hindsight/src/icon.ts:2` — `"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEgAAAA2CAYAAABkxd/2AAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAARGVYSWZNT…`
  - `plugins/dsh-mnemon-provider-holographic/src/icon.ts:2` — `"data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMzYgMzYiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjM2IiBoZWlnaHQ9IjM2I…`
  - `plugins/dsh-mnemon-provider-honcho/src/icon.ts:2` — `"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjUwIiBoZWlnaHQ9IjY1MCIgdmlld0JveD0iMCAwIDY1MCA2NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+C…`
  - ……另有 4 处 / … and 4 more location(s)
  中 修复：把该值保存为可读源码，或保存为格式有文档说明的数据，让审查者能看清实际运行的到底是什么。
  EN Fix: Store the value as readable source or as data with a documented format, so a reviewer can see what is actually being run.
- **高 / HIGH** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `bin/repair-legacy-session.mjs:104` — `require(tool ? supportedPackedToolRun(row, false) : supportedPackedTextRun(row), 'A packed source has unsupported fields or coordinates.')`
  - `bin/repair-legacy-session.mjs:109` — `require(logical.length < maximumBytes / 128, 'The identity proof exceeds its bounded event count.')`
  - `bin/repair-legacy-session.mjs:119` — `require(logical.every((value, index) => value.row.seq === index && integer(value.row.time)), 'Logical events must have unique complete sequence coordinates and …`
  - `bin/repair-legacy-session.mjs:127` — `require(Array.isArray(values), 'Tool history needs explicit, valid assistant chunk provenance.')`
  - ……另有 17 处 / … and 17 more location(s)
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.
- **高 / HIGH** `persist.global-self-install` — 全局安装依赖包 / Installs a package globally
  中 该命令把包安装到全局前缀，于是用户的 PATH 上多出一个可执行文件，而且当前项目删除后它仍然留在那里。
  EN The command installs a package into the global prefix, which puts a new executable on the user's PATH and keeps it there after the current project is deleted.
  - `.github/workflows/ci.yml:33` — `npm install --global`
  - `.github/workflows/ci.yml:93` — `npm install --global`
  - `.github/workflows/publish.yml:55` — `npm install --global`
  - `.github/workflows/publish.yml:144` — `npm install --global`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：改为本地安装，并通过项目自身的脚本调用该工具；全局安装应由用户自己决定，而不是由插件代劳。
  EN Fix: Install locally and invoke the tool through the project's own scripts; global installs belong to the user's decision, not to a plugin.
- **高 / HIGH** `prompt.doc-instruction` — 文档中包含针对模型的指令 / Documentation contains instructions aimed at a model
  中 随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。
  EN A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.
  - `.github/release-notes/v0.5.8.md:8` — `- Prevent composed plugins from bypassing idle-review tool restrictions; reuse complete inherited evidence.`
  - `docs/en/guides/operations.md:254` — `Report vulnerabilities privately through [SECURITY.md](../../../SECURITY.md), not a public issue. Data loss, path traversal, lock/revision bypasses, subagent-is…`
  - `docs/en/guides/operations.md:282` — `| ZIP export reports WAL busy | Wait for Memory Space writes to settle; do not bypass the uncheckpointed-WAL guard |`
  - `docs/en/reference/configuration.md:341` — `- Source management and model actions cannot bypass the Host write restriction.`
  - ……另有 28 处 / … and 28 more location(s)
  中 修复：把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。
  EN Fix: Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.
- **高 / HIGH** `prompt.embedded-instruction-string` — 源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model
  中 源码中的字符串字面量——通常是工具描述或系统提示词片段——要求模型绕过确认或对用户隐瞒某些事，于是它作为一条指令进入上下文窗口。
  EN A string literal in the source — typically a tool description or system prompt fragment — tells the model to bypass confirmation or to hide something from the user, so it lands in the context window as a directive.
  - `docs/pr-assets/issue-261-dsh-slots/harness/evidence-summary.json:156` — `"baselineOnlyLegacyPeerBypass"`
  - `docs/pr-assets/issue-261-dsh-slots/harness/evidence-summary.json:201` — `"baselineOnlyLegacyPeerBypass"`
  - `docs/pr-assets/issue-261-dsh-slots/harness/evidence-summary.json:246` — `"baselineOnlyLegacyPeerBypass"`
  - `plugins/dsh-mnemon-source-documents/tests/io-freshness.spec.ts:80` — `'does not let a warm excerpt bypass changed file permissions'`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：如实描述工具的行为，删除那些会改变 agent 对待用户方式的指令。
  EN Fix: Describe the tool's behavior factually and remove directives that change how the agent treats the user.
- **高 / HIGH** `supply.url-dependency` — 依赖解析到 URL、git 引用或文件路径 / Dependency resolves to a URL, git ref or file path
  中 依赖不是从仓库解析，而是来自 URL、git 引用、本地路径或 patch，因此其内容不受仓库锁文件和任何完整性元数据约束，可以在版本号不变的情况下被替换。
  EN A dependency is resolved from a URL, a git reference, a local path or a patch instead of the registry, so its contents are not covered by the registry lockfile or by any integrity metadata and can change without a version bump.
  - `package.json:195` — `"@deepseek-ai/dsh-session-projection-legacy": "npm:@deepseek-ai/dsh-session-projection@0.1.0-rc.8",`
  中 修复：改为依赖仓库中已发布的版本，并用锁文件固定；如果确实必须用 fork，就把它发布到自己名下的 scope。
  EN Fix: Depend on a published version from the registry, pinned by a lockfile; if a fork is unavoidable, publish it under your own scope.

### 中 / MEDIUM (6)

- **中 / MEDIUM** `cred.many-secret-env-vars` — 读取多个不同名称的密钥类环境变量 / Reads several differently-named secret environment variables
  中 这里的一行、或整个包里的若干行，读取了名称看起来像凭据的环境变量。只读一个文档中声明的 key 是插件本该有的认证方式；枚举多个不同名称的密钥，则是在收集凭据而不是在使用凭据。
  EN One line here, or several across the package, read environment variables whose names look like credentials. Reading a single documented key is how a plugin is meant to authenticate; enumerating many differently-named ones is how credentials are gathered rather than used.
  - `plugins/dsh-mnemon-provider-openviking/tests/integration.spec.ts:8` — `process.env.MNEMON_OPENVIKING_TEST_API_KEY`
  - `plugins/dsh-mnemon-source-memory-spaces/tests/runner-config.spec.ts:42` — `process.env.MNEMON_EMBED_API_KEY`
  - `plugins/dsh-mnemon-source-memory-spaces/tests/runner.spec.ts:200` — `process.env.MNEMON_EMBED_API_KEY`
  - `scripts/probe-provider-lab.mjs:4` — `process.env.OPENVIKING_ROOT_API_KEY`
  - ……另有 7 处 / … and 7 more location(s)
  中 修复：只保留插件确实需要且有文档说明的变量，删掉与任何功能无关的密钥读取。
  EN Fix: Keep to the variables this plugin documents and needs, and delete reads of keys it has no feature for.
- **中 / MEDIUM** `install.hook-runs-shell-code` — 安装期钩子执行的不只是构建 / Lifecycle hook runs more than a build
  中 该钩子命令不属于常见的编译与拷贝步骤，安装这个包时会以用户权限运行任意代码，而这一切发生在任何人来得及检查之前。
  EN This hook command is not one of the usual compile-and-copy steps, so installing the package runs arbitrary code with the user's privileges before anything can be inspected.
  - `package.json:122` — `"prepublishOnly": "pnpm run verify",`
  中 修复：把钩子收敛为 `tsc` 或 `npm run build` 之类的构建命令，或把这项工作移到一个由用户主动执行的显式脚本里。
  EN Fix: Reduce the hook to a build command such as `tsc` or `npm run build`, or move the work into an explicit script the user chooses to run.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `docs/pr-assets/issue-233-openviking-20260916/verification.json:18` — `http://127.0.0.1:19335`
  - `docs/pr-assets/issue-233-openviking-20260916/verification.json:41` — `http://127.0.0.1:19333`
  - `docs/pr-assets/issue-261-dsh-slots/harness/headless-check.mjs:61` — `http://127.0.0.1:${model.address(`
  - `docs/pr-assets/issue-261-dsh-slots/harness/packed-e2e.mjs:60` — `http://127.0.0.1`
  - ……另有 56 处 / … and 56 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `obf.long-minified-line` — 整行是压缩或机器生成的数据块 / Line is a single minified or machine-generated blob
  中 该行超过 500 个字符且几乎没有空白，正是打包载荷、压缩字符串表或机器生成单行代码的样子。这样的一行用肉眼什么也审不出来。
  EN The line is over 500 characters with almost no whitespace, which is what a bundled payload, a packed string table or a machine-generated one-liner looks like. Nothing on such a line is reviewable by eye.
  - `plugins/dsh-mnemon-provider-byterover/src/icon.ts:2` — `export const ICON = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHZpZXdCb3g9IjAgMCAzNiAzNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnL…`
  - `plugins/dsh-mnemon-provider-hindsight/src/icon.ts:2` — `export const ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEgAAAA2CAYAAABkxd/2AAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF…`
  - `plugins/dsh-mnemon-provider-holographic/src/icon.ts:2` — `export const ICON = "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMzYgMzYiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9I…`
  - `plugins/dsh-mnemon-provider-honcho/src/icon.ts:2` — `export const ICON = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjUwIiBoZWlnaHQ9IjY1MCIgdmlld0JveD0iMCAwIDY1MCA2NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczL…`
  - ……另有 14 处 / … and 14 more location(s)
  中 修复：发布未压缩的源码，或在 README 中说明该文件由哪个构建产出、可读源码在哪里。
  EN Fix: Ship unminified source, or state in the README which build produced the file and where the readable source lives.
- **中 / MEDIUM** `prompt.concealed-instruction` — 把文本藏在注释或不可见字符中 / Hides text in a comment or invisible characters
  中 该行把内容藏在 HTML 注释里，或藏在零宽字符与双向控制字符之后，这些内容在 diff 或渲染后的文档中什么都看不见，却仍会作为文本被读取。
  EN The line conceals content either in an HTML comment or behind zero-width and bidirectional control characters, which render as nothing in a diff or a rendered document while still being read as text.
  - `.github/pull_request_template.md:9` — `用一两句话说明改了什么、为什么改，以及用户或系统行为如何变化。 / In one or two sentences, explain what changed, why, and how user or system behavior changes.`
  - `.github/pull_request_template.md:52` — `必填。勾选且仅勾选一项；模型和工具字段不得留空。 / Required. Check exactly one option; the model and tool fields must not be blank.`
  - `.github/pull_request_template.md:64` — `使用 AI 时填写 Codex、Claude Code、Cursor 等；未使用时填 N/A。 / Name tools such as Codex, Claude Code, or Cursor when AI was used; otherwise enter N/A.`
  - `.github/pull_request_template.md:68` — `本仓库硬性规范，请逐项确认。 / Confirm every mandatory repository rule.`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：删除被隐藏的文本和不可见字符；审查者看不到的东西就不该出现在发布的包里。
  EN Fix: Delete the concealed text and the invisible characters; anything a reviewer cannot see does not belong in a shipped package.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 207 shipped file(s) are 64 KiB or larger and were not read as text, the largest being docs/assets/screenshots/documents-markdown.png at 413 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `docs/assets/screenshots/documents-markdown.png` — `422644 bytes not decoded as text`
  - `plugins/dsh-mnemon-provider-hindsight/src/driver.ts:79` — `await this.request(body, '/health/live', { headers: this.headers(connection), signal })`
  - `plugins/dsh-mnemon-provider-hindsight/src/driver.ts:82` — `this.request(body, `${this.bankPath(connection)}/stats`, { headers: this.headers(connection), signal }),`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (5)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `.github/workflows/issue-template-enforcer.yml:64` — `labels.environment,`
  - `plugins/dsh-mnemon-provider-byterover/tests/driver.spec.ts:39` — `expect(calls[1]?.options.env?.BRV_API_KEY).toBe('brv-secret')`
  - `plugins/dsh-mnemon-source-memory-spaces/src/native-cli.ts:111` — `const env = options.env ?? process.env`
  - `plugins/dsh-mnemon-source-memory-spaces/src/providers/process.ts:35` — `...(options.env === undefined ? {} : { env: options.env }),`
  - ……另有 28 处 / … and 28 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `harness.installed-package-edit` — 改动宿主安装目录或已安装的其他插件 / Touches the harness installation or another installed plugin
  中 该行读写宿主自身的安装目录，或 `node_modules` 下另一个插件的目录。修改已安装的代码会替换掉用户审查过的产物，并可能禁用或劫持任意插件。
  EN The line reads or writes inside the harness's own installation or another plugin's directory under `node_modules`. Editing installed code replaces the artifact the user reviewed and can disable or hijack any plugin.
  - `tests/version-updates.spec.ts:180` — `mkdirSync(join(value.profile, 'node_modules/.pnpm/old/node_modules/dsh-mnemon'), { recursive: true })`
  中 修复：绝不在运行时修改已安装的包；把改动提交到上游，或提供一个增量插件。
  EN Fix: Never modify installed packages at runtime; contribute the change upstream or ship an additive plugin.
- **低 / LOW** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `tests/client-apply.spec.ts:84` — `expect.objectContaining({ name: 'shell.overlay', id: 'mnemon', children: { 'mnemon.source.page': { kind: 'list', scope: 'root' } } }),`
  - `tests/client-apply.spec.ts:139` — `expect(slots.at(-1)).toMatchObject({ name: 'shell.overlay' })`
  - `tests/lifecycle.spec.ts:1085` — `{ type: 'tool-call', id: 'call-1', name: 'read', arguments: '{}' },`
  - `tests/review-evidence-host.spec.ts:87` — `name: 'run_code', args: { description: 'Exercise the review boundary through Code Mode.', code: `return await tools[${JSON.stringify(name)}](${JSON.stringify(ar…`
  - ……另有 5 处 / … and 5 more location(s)
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.
- **低 / LOW** `persist.shell-rc-append` — 追加写入 shell 启动文件 / Appends to a shell startup file
  中 该行写入了 `.bashrc`、`.zshrc`、`.profile` 或 fish 配置，因此改动会在之后每个交互式 shell 中生效，而且删掉包目录也不会消失。
  EN The line writes into `.bashrc`, `.zshrc`, `.profile` or a fish config, so the change takes effect in every future interactive shell and survives removing the package directory.
  - `scripts/fixtures/reproduce-published-team.mjs:17` — `if (!values.profile) throw new Error('Pass --profile <isolated npm directory> with DSH 0.1.5-rc.2 and both Agent Teams packages 0.1.5-alpha.2 installed.')`
  - `tests/version-updates.spec.ts:180` — `mkdirSync(join(value.profile, 'node_modules/.pnpm/old/node_modules/dsh-mnemon'), { recursive: true })`
  中 修复：不要修改 shell 启动文件；如果需要 shell 集成，就把那行内容打印出来，由用户自行决定是否添加。
  EN Fix: Do not modify shell startup files; if a shell integration is required, print the line for the user to add deliberately.
- **低 / LOW** `priv.system-path-modification` — 修改系统路径或把文件设为全局可写 / Modifies a system path or makes a file world-writable
  中 该行写入 `/etc`、`/usr`、`/bin` 或 launch daemon 目录，把属主改为 root，或设置全局可写权限。任何一种都改变了安装包之外的机器状态，也可能为后续提权铺路。
  EN The line writes under `/etc`, `/usr`, `/bin` or a launch-daemon directory, changes ownership to root, or sets world-writable permissions. Any of these changes the machine beyond the installed package and can prepare an escalation later.
  - `tests/version-updates.spec.ts:29` — `const install = () => { writeFileSync(command, '#!/bin/sh\n'); chmodSync(command, 0o755) }`
  中 修复：把写入限制在包目录或用户自己的配置目录内，绝不要为了让安装成功而放宽权限。
  EN Fix: Keep writes inside the package or the user's own configuration directory, and never loosen permissions to make an install succeed.

_按类别 / By category:_ 凭据读取 / credential access 4 · 网络回调 / network callbacks 4 · 混淆 / obfuscation 3 · 提示注入 / prompt injection 3 · 持久化 / persistence 2 · 供应链 / supply chain 2 · 滥用宿主环境 / harness abuse 2 · 数据外传 / exfiltration 1 · 安装脚本 / install scripts 1 · 提权 / privilege 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `dsh-mnemon-HEAD/`
- skipped docs/assets/media/dsh-mnemon-memory-system-demo.gif: 8495823 bytes exceeds the 524288-byte per-file cap
- skipped docs/assets/media/dsh-mnemon-memory-system-demo.mp4: 5512802 bytes exceeds the 524288-byte per-file cap
- skipped docs/assets/screenshots/ai-metadata-dialog.png: 772732 bytes exceeds the 524288-byte per-file cap
- skipped docs/assets/screenshots/distillation-strategy.png: 654113 bytes exceeds the 524288-byte per-file cap
- skipped docs/assets/screenshots/memory-content.png: 554952 bytes exceeds the 524288-byte per-file cap
- skipped docs/assets/screenshots/memory-space-create-dialog.png: 623899 bytes exceeds the 524288-byte per-file cap
- skipped docs/assets/screenshots/mobile-dialogs-responsive-before-after.png: 746047 bytes exceeds the 524288-byte per-file cap
- skipped docs/assets/screenshots/overview-memory-graph.png: 594993 bytes exceeds the 524288-byte per-file cap
- skipped docs/assets/screenshots/remember-dialog.png: 597616 bytes exceeds the 524288-byte per-file cap
- skipped docs/assets/showcase/demo.mp4: 1093216 bytes exceeds the 524288-byte per-file cap
- skipped docs/assets/webui-v0.5.4/en/demo.mp4: 1409802 bytes exceeds the 524288-byte per-file cap
- ……另有 9 项 / … and 9 more

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
