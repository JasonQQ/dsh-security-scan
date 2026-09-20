> 批量压测 / Batch stress test · ★ 289 · `Mars-Sea/dsh-commandcode-provider`
> https://github.com/Mars-Sea/dsh-commandcode-provider · audited in 3.0s
# 安装前体检 / Pre-install audit: @mars-sea/dsh-commandcode-provider@0.11.7

**信任评级 / Trust grade: D** (评分 / score 34/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/Mars-Sea/dsh-commandcode-provider/tar.gz/HEAD` (URL / url)
- 已分析文件：98 个（3.4 MiB） / Files analysed: 98 (3.4 MiB)
- 内容摘要 / Content digest: `a515c282573372617800bf53300d46fc…`
- 体检时间 / Audited at: 2026-09-20T09:53:25.645Z

## 最严重的风险 / Most severe risk

**文档中包含针对模型的指令 / Documentation contains instructions aimed at a model** `prompt.doc-instruction`

中 它夹带了写给 agent 而不是写给人看的文字——试图在你不察觉的情况下改变 agent 行为的指令。
EN It carries text aimed at the agent rather than at a person — instructions that try to change what the agent does without telling you.

该包会访问的目标：`github.com`、`registry.npmjs.org`、`www.w3.org`、`api.commandcode.ai，一般无需修改。`、`api.commandcode.ai`、`localhost`、`staging.commandcode.ai`、`commandcode.ai` / Destinations this package reaches: `github.com`, `registry.npmjs.org`, `www.w3.org`, `api.commandcode.ai，一般无需修改。`, `api.commandcode.ai`, `localhost`, `staging.commandcode.ai`, `commandcode.ai`

- 中 它发生在安装时：`prepare` 脚本会执行它，你不需要自己运行任何东西。
  EN It happens at install time: the `prepare` script runs it, so you do not have to run anything yourself.
- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `AGENTS.md:633`；完整列表见下方「发现」。 / The rule that decided the grade fired at `AGENTS.md:633`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

- `prepare` (`package.json`): `tsdown`

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `client.js`, `pkg.version`, `../src/client/snapshot-store.ts`, `../src/client/settings.ts`, `../src/client/legacy-credentials.ts`, `../src/client/usage.ts`, `../src/client/prices.ts`, `../src/client/login.ts`, `../src/wire-shared.ts`, `../src/usage-wire.ts`, `../src/login-wire.ts`, `\\u0001` （另有 10 项） / (+10 more)
- **写入的文件路径 / File paths written:** `node:fs/promises`, `package.json`, `0.0.0`, `.npmrc`
- **派生的命令 / Commands spawned:** `node:child_process`, `utf8`
- **连接的域名 / Domains contacted:** `github.com`, `registry.npmjs.org`, `www.w3.org`, `api.commandcode.ai，一般无需修改。`, `api.commandcode.ai`, `localhost`, `staging.commandcode.ai`, `commandcode.ai`, `localhost:${options.port`, `opencollective.com`, `studio.example`, `api.commandcode.aihttps:` （另有 18 项） / (+18 more)
- **读取的环境变量 / Environment variables read:** `process.env (every variable)`, `DSH_ENGINE`

## 发现 / Findings

### 高 / HIGH (2)

- **高 / HIGH** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `scripts/verify-engine-load.mjs:222` — `const module = await import(pathToFileURL(resolved).href)`
  - `scripts/verify-engine-load.mjs:353` — `const plugin = await import(pathToFileURL(join(staged, 'lib', 'index.js')).href)`
  - `scripts/verify-engine-load.mjs:403` — `const module = await import(pathToFileURL(require.resolve(specifier)).href)`
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.
- **高 / HIGH** `prompt.doc-instruction` — 文档中包含针对模型的指令 / Documentation contains instructions aimed at a model
  中 随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。
  EN A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.
  - `AGENTS.md:633` — `- The picker also **hides models above the account's subscription tier** (`modelVisibleInPlan()`, on by default via `filterModelsByPlan`): the billing facts mir…`
  中 修复：把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。
  EN Fix: Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.

### 中 / MEDIUM (4)

- **中 / MEDIUM** `install.hook-runs-shell-code` — 安装期钩子执行的不只是构建 / Lifecycle hook runs more than a build
  中 该钩子命令不属于常见的编译与拷贝步骤，安装这个包时会以用户权限运行任意代码，而这一切发生在任何人来得及检查之前。
  EN This hook command is not one of the usual compile-and-copy steps, so installing the package runs arbitrary code with the user's privileges before anything can be inspected.
  - `package.json:58` — `"prepare": "tsdown",`
  中 修复：把钩子收敛为 `tsc` 或 `npm run build` 之类的构建命令，或把这项工作移到一个由用户主动执行的显式脚本里。
  EN Fix: Reduce the hook to a build command such as `tsc` or `npm run build`, or move the work into an explicit script the user chooses to run.
- **中 / MEDIUM** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 29 distinct remote hosts (api.commandcode.ai, api.commandcode.ai，一般无需修改。, commandcode.ai, github.com, localhost:${options.port, registry.npmjs.org, staging.commandcode.ai, www.w3.org, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `lib/client.js:2163` — `git+https://github.com/Mars-Sea/dsh-commandcode-provider.git`
  - `lib/client.js:2196` — `https://registry.npmjs.org/@mars-sea%2Fdsh-commandcode-provider/latest`
  - `lib/client.js:5730` — `http://www.w3.org/2000/svg`
  - `lib/client.js:6000` — `https://api.commandcode.ai，一般无需修改。`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `lib/index.js:5558` — `http://localhost:${options.port`
  - `src/login.ts:102` — `http://localhost:${options.port`
  - `tests/login.test.ts:117` — `http://localhost:3000http://localhost:3000`
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 2 shipped file(s) are 64 KiB or larger and were not read as text, the largest being assets/screenshots/usage-dashboard.png at 331 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `assets/screenshots/usage-dashboard.png` — `338521 bytes not decoded as text`
  - `package-lock.json:1368` — `"undici-types": "~6.21.0"`
  - `package-lock.json:3511` — `"node_modules/undici-types": {`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (1)

- **低 / LOW** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `tests/adapter.test.ts:338` — `tools: [{ name: 'bash', description: 'run a command', parameters: { type: 'object', properties: { cmd: { type: 'string' } } } }],`
  - `tests/adapter.test.ts:390` — `{ type: 'tool-call', id: callId, name: 'bash', arguments: '{"command":"ls"}' },`
  - `tests/adapter.test.ts:425` — `{ name: 'bash', description: 'run', parameters: { type: 'object', properties: { cmd: { type: 'string' } } } },`
  - `tests/adapter.test.ts:511` — `{ name: 'bash', description: 'run', parameters: { type: 'object', properties: { cmd: { type: 'string' } } } },`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.

### 提示 / INFO (1)

- **提示 / INFO** `obf.long-minified-line` — 整行是压缩或机器生成的数据块 / Line is a single minified or machine-generated blob
  中 该行超过 500 个字符且几乎没有空白，正是打包载荷、压缩字符串表或机器生成单行代码的样子。这样的一行用肉眼什么也审不出来。
  EN The line is over 500 characters with almost no whitespace, which is what a bundled payload, a packed string table or a machine-generated one-liner looks like. Nothing on such a line is reviewable by eye.
  - `lib/index.d.ts:1838` — `export { ACTIVE_ACCOUNT_AUTO, type ApiKeyValidation, BILLING_ACCESS_TTL_MS, COMMANDCODE_SEARCH_PROVIDER_ID, COMMAND_CODE_CLI_VERSION, type CommandCodeAccountCon…`
  - `lib/index.js:5017` — `lines.push(commandCopy(locale, "creditsHeader"), commandCopy(locale, "monthlyLine").replace("{monthly}", c.monthlyReported === false ? "—" : moneyShort(c.monthl…`
  - `lib/index.js:6932` — `export { ACTIVE_ACCOUNT_AUTO, BILLING_ACCESS_TTL_MS, COMMANDCODE_SEARCH_PROVIDER_ID, COMMAND_CODE_CLI_VERSION, CommandCodeAccountPool, CommandCodeAdapter, Comma…`
  中 修复：发布未压缩的源码，或在 README 中说明该文件由哪个构建产出、可读源码在哪里。
  EN Fix: Ship unminified source, or state in the README which build produced the file and where the readable source lives.

_按类别 / By category:_ 混淆 / obfuscation 2 · 网络回调 / network callbacks 2 · 提示注入 / prompt injection 1 · 安装脚本 / install scripts 1 · 供应链 / supply chain 1 · 滥用宿主环境 / harness abuse 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `dsh-commandcode-provider-HEAD/`
- skipped assets/screenshots/settings-page.png: 1616608 bytes exceeds the 524288-byte per-file cap
- skipped lib/index.js.map: 560412 bytes exceeds the 524288-byte per-file cap
- not scanned (binary, contents unreadable as text): assets/screenshots/model-picker.png, assets/screenshots/usage-dashboard.png
- outbound fetching was permitted for this audit
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
