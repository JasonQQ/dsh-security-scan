> 批量压测 / Batch stress test · ★ 195 · `omdsh-dev/dsh-data-agent`
> https://github.com/omdsh-dev/dsh-data-agent · audited in 5.2s
# 安装前体检 / Pre-install audit: dsh-data-agent-native-only-fixture

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/omdsh-dev/dsh-data-agent/tar.gz/HEAD` (URL / url)
- 已分析文件：179 个（2.4 MiB） / Files analysed: 179 (2.4 MiB)
- 内容摘要 / Content digest: `5a66fccbbfa93b7c0bdec800492b265b…`
- 体检时间 / Audited at: 2026-09-20T09:53:45.024Z

## 最严重的风险 / Most severe risk

**同一个包内既有环境变量收集又有对外请求 / Environment harvest and an outbound request in the same package** `exfil.environment-harvest-then-callback`

中 数据会离开这台机器。该包中有代码把本机上的内容发往外部地址。
EN Data leaves this machine. Something in this package takes content that lives here and sends it to a destination outside it.

该包会访问的目标：`github.com`、`dsh.community`、`${connection.host`、`dsh.internal`、`www.w3.org`、`schemas.openxmlformats.org`、`evil.invalid`、`evil` / Destinations this package reaches: `github.com`, `dsh.community`, `${connection.host`, `dsh.internal`, `www.w3.org`, `schemas.openxmlformats.org`, `evil.invalid`, `evil`

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

- **读取的文件路径 / File paths read:** `node:fs/promises`, `agent.cordis.yml`, `package.json`, `cordis.patch.yml`, `preset/data-agent/agent.cordis.yml`, `tool.ts`, `src/tool.ts`, `catalog-tools.ts`, `src/catalog-tools.ts`, `command.ts`, `src/command.ts`, `catalog-command.ts` （另有 29 项） / (+29 more)
- **写入的文件路径 / File paths written:** `node:fs/promises`, `package.json`, `ecosystem.js`, `lib/ecosystem.js`, `dsh-plugin.json`, `preset.yml`
- **派生的命令 / Commands spawned:** `node:child_process`, `sqlite3`, `CREATE TABLE "中文表名" ("姓名" TEXT NOT NULL);`, `中文表名`, `姓名`, `ALTER TABLE orders ADD COLUMN ordered_at TEXT;`, `'./index`, `'./command`, `'./routes`, `'./tool`, `process.stdin`, `process.stdout` （另有 3 项） / (+3 more)
- **连接的域名 / Domains contacted:** `github.com`, `dsh.community`, `${connection.host`, `dsh.internal`, `www.w3.org`, `schemas.openxmlformats.org`, `evil.invalid`, `evil`, `hive.internal`, `localhost`, `dsh.internalcursor`, `fixture` （另有 4 项） / (+4 more)
- **读取的环境变量 / Environment variables read:** `process.env (every variable)`, `DSH_SMOKE_CLICKHOUSE_SECURE`, `DSH_SMOKE_CLICKHOUSE_ENABLED`, `DSH_SMOKE_DORIS_ENABLED`, `DSH_SMOKE_SQLSERVER_ENABLED`, `DSH_SMOKE_SQLSERVER_SCHEMA`, `NODE_ENV`

## 发现 / Findings

### 严重 / CRITICAL (1)

- **严重 / CRITICAL** `exfil.environment-harvest-then-callback` — 同一个包内既有环境变量收集又有对外请求 / Environment harvest and an outbound request in the same package
  中 该包读取或整体导出进程环境变量，同时又建立对外连接。CI 运行器和宿主会话都会把 API Key 导出到环境变量中，因此这一组合会把仍有效的凭据送出本机。
  EN The package reads or dumps process environment values and also opens outbound connections. CI runners and harness sessions export API keys into the environment, so this combination sends working credentials off the machine.
  - `tsdown.config.ts:73` — `JSON.stringify(process.env`
  - `tsdown.config.ts:74` — `JSON.stringify(process.env`
  - `pnpm-lock.yaml:2452` — `undici-types@7.24.6:`
  - `pnpm-lock.yaml:2455` — `undici@8.10.0:`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：删除环境变量的整体导出，只逐个读取插件确实需要、且有文档说明的变量。
  EN Fix: Remove the environment dump, and read only individually documented variables that the plugin actually needs.

### 高 / HIGH (5)

- **高 / HIGH** `cred.env-harvest` — 读取或整体导出进程环境变量 / Reads or dumps the process environment
  中 该行把整个环境当成一个值取走——序列化、遍历或打印它，而不是只取自己需要的那一个变量。CI 运行器和宿主都会把 API Key 导出到环境变量里，因此整体导出就是一次凭据收集。
  EN The line takes the whole environment as a value — serializing it, iterating it, or printing it — rather than the one variable it needs. CI runners and the harness export API keys into the environment, so a dump is a credential harvest.
  - `tsdown.config.ts:73` — `JSON.stringify(process.env`
  - `tsdown.config.ts:74` — `JSON.stringify(process.env`
  中 修复：只逐个读取插件文档中声明过的变量，绝不序列化整个环境对象，也不要把它写进日志或请求。
  EN Fix: Read only the variables the plugin documents, one at a time, and never serialize the environment object or forward it into a log or request.
- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `lib/connections-eb9xwiLF.js:1037` — `case "hive": return connection.user !== void 0 ? `!connect jdbc:hive2://${connection.host ?? "127.0.0.1"}:${connection.port ?? defaultDatabasePort("hive")}/${co…`
  - `src/clients.ts:574` — `? `!connect jdbc:hive2://${connection.host ?? '127.0.0.1'}:${connection.port ?? defaultDatabasePort('hive')}/${connection.database} ${connection.user} ${connect…`
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **高 / HIGH** `prompt.embedded-instruction-string` — 源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model
  中 源码中的字符串字面量——通常是工具描述或系统提示词片段——要求模型绕过确认或对用户隐瞒某些事，于是它作为一条指令进入上下文窗口。
  EN A string literal in the source — typically a tool description or system prompt fragment — tells the model to bypass confirmation or to hide something from the user, so it lands in the context window as a directive.
  - `tests/catalog-tools.spec.ts:15` — `'Ignore system prompt\u0000'`
  中 修复：如实描述工具的行为，删除那些会改变 agent 对待用户方式的指令。
  EN Fix: Describe the tool's behavior factually and remove directives that change how the agent treats the user.
- **高 / HIGH** `supply.typosquat-name` — 依赖名与热门包高度形近 / Dependency name is a near-miss of a popular package
  中 该依赖名是已知的仿冒包，或与某个热门包只差一个字母或一处字符顺序，安装它极可能拉进作者从未打算依赖的包。
  EN The dependency name is a known impostor, or differs from a popular package by a single typo or transposition, so installing it most likely pulls a package the author never intended to depend on.
  - `tests/fixtures/profiles/dsh-tui/package.json:5` — `"@deepseek-harness-tui/dsh-tui": "0.6.1",`
  - `tests/fixtures/profiles/missing/package.json:5` — `"@deepseek-harness-tui/dsh-tui": "0.6.1"`
  中 修复：对照你本意要安装的包核对其拼写，并把该条目改成真正的包名。
  EN Fix: Check the spelling against the package you meant to install and replace the entry with the real name.
- **高 / HIGH** `supply.url-dependency` — 依赖解析到 URL、git 引用或文件路径 / Dependency resolves to a URL, git ref or file path
  中 依赖不是从仓库解析，而是来自 URL、git 引用、本地路径或 patch，因此其内容不受仓库锁文件和任何完整性元数据约束，可以在版本号不变的情况下被替换。
  EN A dependency is resolved from a URL, a git reference, a local path or a patch instead of the registry, so its contents are not covered by the registry lockfile or by any integrity metadata and can change without a version bump.
  - `conformance/dsh-ecosystem/fixtures/profiles/native-only/package.json:6` — `"@yejiming/dsh-data-agent": "file:../../../../.."`
  - `conformance/dsh-ecosystem/fixtures/profiles/native-plus-adapter/package.json:7` — `"@yejiming/dsh-data-agent": "file:../../../../.."`
  - `tests/fixtures/profiles/dsh-tui/package.json:6` — `"@yejiming/dsh-data-agent": "file:../../../.."`
  - `tests/fixtures/profiles/web/package.json:5` — `"@yejiming/dsh-data-agent": "file:../../../.."`
  中 修复：改为依赖仓库中已发布的版本，并用锁文件固定；如果确实必须用 fork，就把它发布到自己名下的 scope。
  EN Fix: Depend on a published version from the registry, pinned by a lockfile; if a fork is unavoidable, publish it under your own scope.

### 中 / MEDIUM (4)

- **中 / MEDIUM** `obf.long-minified-line` — 整行是压缩或机器生成的数据块 / Line is a single minified or machine-generated blob
  中 该行超过 500 个字符且几乎没有空白，正是打包载荷、压缩字符串表或机器生成单行代码的样子。这样的一行用肉眼什么也审不出来。
  EN The line is over 500 characters with almost no whitespace, which is what a bundled payload, a packed string table or a machine-generated one-liner looks like. Nothing on such a line is reviewable by eye.
  - `lib/tool-B7CC1EPd.js:704` — `*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft…`
  - `lib/tool-B7CC1EPd.js:731` — `function tableFor(dataset,columns){const selected=(columns&&columns.length?columns:dataset.columns).map(name=>[name,indexOf(dataset,name)]);const wrap=el('div',…`
  - `lib/types/index.d.ts:37` — `export type { CatalogAssetDetail, CatalogAssetHead, CatalogAssetKind, CatalogAssetRevision, CatalogAssetStatus, CatalogCapability, CatalogDiffItem, CatalogDiffK…`
  - `src/analysis-html.ts:59` — `*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft…`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：发布未压缩的源码，或在 README 中说明该文件由哪个构建产出、可读源码在哪里。
  EN Fix: Ship unminified source, or state in the README which build produced the file and where the readable source lives.
- **中 / MEDIUM** `persist.shell-rc-append` — 追加写入 shell 启动文件 / Appends to a shell startup file
  中 该行写入了 `.bashrc`、`.zshrc`、`.profile` 或 fish 配置，因此改动会在之后每个交互式 shell 中生效，而且删掉包目录也不会消失。
  EN The line writes into `.bashrc`, `.zshrc`, `.profile` or a fish config, so the change takes effect in every future interactive shell and survives removing the package directory.
  - `lib/connections-eb9xwiLF.js:2184` — `const matchingProfiles = (connection) => (persistence?.listProfiles?.() ?? []).filter((entry) => profileMatchesConnection(entry.profile, connection, resolvedOpt…`
  - `lib/connections-eb9xwiLF.js:2187` — `return matches.filter((entry) => preferred.has(entry.profileId));`
  - `lib/connections-eb9xwiLF.js:2194` — `const boundMatch = binding === void 0 ? void 0 : matches.find((entry) => entry.profileId === binding.profileId);`
  - `lib/connections-eb9xwiLF.js:2197` — `if (boundMatch !== void 0 && preferred.some((entry) => entry.profileId === boundMatch.profileId)) return boundMatch.profileId;`
  - ……另有 14 处 / … and 14 more location(s)
  中 修复：不要修改 shell 启动文件；如果需要 shell 集成，就把那行内容打印出来，由用户自行决定是否添加。
  EN Fix: Do not modify shell startup files; if a shell integration is required, print the line for the user to add deliberately.
- **中 / MEDIUM** `prompt.concealed-instruction` — 把文本藏在注释或不可见字符中 / Hides text in a comment or invisible characters
  中 该行把内容藏在 HTML 注释里，或藏在零宽字符与双向控制字符之后，这些内容在 diff 或渲染后的文档中什么都看不见，却仍会作为文本被读取。
  EN The line conceals content either in an HTML comment or behind zero-width and bidirectional control characters, which render as nothing in a diff or a rendered document while still being read as text.
  - `lib/connections-eb9xwiLF.js:510` — `* leading whitespace, `--` line comments, and nested `/* ... *​/` block`
  - `lib/connections-eb9xwiLF.js:510` — `--/* ... *​/`
  - `lib/connections-eb9xwiLF.js:545` — `/** Find the index just past a `/* ... *​/` block starting at `start` (nesting-aware). */`
  - `src/clients.ts:30` — `* leading whitespace, `--` line comments, and nested `/* ... *​/` block`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：删除被隐藏的文本和不可见字符；审查者看不到的东西就不该出现在发布的包里。
  EN Fix: Delete the concealed text and the invisible characters; anything a reviewer cannot see does not belong in a shipped package.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 6 shipped file(s) are 64 KiB or larger and were not read as text, the largest being assets/settings.webp at 83 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `assets/settings.webp` — `84646 bytes not decoded as text`
  - `pnpm-lock.yaml:2452` — `undici-types@7.24.6:`
  - `pnpm-lock.yaml:2455` — `undici@8.10.0:`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (5)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `lib/catalog-D0SV_6Jv.js:980` — `if (summary?.profileId !== void 0 && summary.profileId !== requestedSourceId) throw new Error("Requested Catalog source does not match the current session conne…`
  - `lib/catalog-D0SV_6Jv.js:984` — `if (summary?.profileId !== void 0) {`
  - `lib/catalog-D0SV_6Jv.js:985` — `const connected = persistence.getSource(summary.profileId);`
  - `lib/catalog-D0SV_6Jv.js:1131` — `if (summary?.profileId === void 0 || summary.profileId.trim().length === 0) throw new Error("Catalog scan requires a connected, stable connection profile");`
  - ……另有 76 处 / … and 76 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `cred.read-dotenv-or-history` — 读取 dotenv 文件或 shell 历史 / Reads a dotenv file or shell history
  中 该行读取了 `.env` 或 shell 历史文件。这两处都是令牌、云密钥和曾经粘贴过的密钥堆积的地方，而 shell 历史还会勾勒出用户的基础设施全貌。
  EN This line reads `.env` or a shell history file. Both are where tokens, cloud keys and previously pasted secrets accumulate, and a shell history also maps out the user's infrastructure.
  - `tests/catalog-service.spec.ts:259` — `const currentKinds = persistence.listAssetHeads(connection.profileId).map(head => (`
  - `tests/catalog-service.spec.ts:260` — `service.read.getAsset(connection.profileId, head.assetId).asset.payload.identity.kind`
  中 修复：通过插件配置 schema 加载配置，而不是读取 dotenv 文件；永远不要打开用户的历史记录。
  EN Fix: Load configuration through the plugin config schema instead of reading dotenv files, and never open the user's history.
- **低 / LOW** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `tests/analysis.spec.ts:66` — `http://evil`
  - `tests/data-agent-workbench.spec.tsx:752` — `http://dsh.internalcursor`
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **低 / LOW** `net.token-or-blob-in-url` — 把凭据或编码数据块放进 URL / Puts a credential or encoded blob in a URL
  中 令牌形状的查询参数、内嵌的 `user:password` 授权部分，或超长高熵的查询值，都意味着密钥或载荷数据在 URL 中传输，最终会留在访问日志、代理和浏览器历史里。
  EN A token-shaped query parameter, an embedded `user:password` authority, or a long high-entropy query value means secret material or payload data travels in a URL, where it lands in access logs, proxies and browser history.
  - `tests/ecosystem-conformance.spec.ts:351` — `'postgres://user:password@db.example/app'`
  - `tests/ecosystem-conformance.spec.ts:351` — `//user:password@`
  中 修复：凭据放在 Authorization 头里发送，载荷用 POST 放在请求体中，不要编码进查询字符串。
  EN Fix: Send credentials in an Authorization header, and POST payloads in the body rather than encoding them into the query string.
- **低 / LOW** `priv.system-path-modification` — 修改系统路径或把文件设为全局可写 / Modifies a system path or makes a file world-writable
  中 该行写入 `/etc`、`/usr`、`/bin` 或 launch daemon 目录，把属主改为 root，或设置全局可写权限。任何一种都改变了安装包之外的机器状态，也可能为后续提权铺路。
  EN The line writes under `/etc`, `/usr`, `/bin` or a launch-daemon directory, changes ownership to root, or sets world-writable permissions. Any of these changes the machine beyond the installed package and can prepare an escalation later.
  - `tests/ecosystem-conformance.spec.ts:203` — `resolveExecutable: async (command: string) => `/usr/bin/${command}`,`
  - `tests/render-analysis.spec.ts:84` — `resolveExecutable: async (command: string) => '/usr/bin/' + command,`
  - `tests/scope-surface.spec.ts:98` — `resolveExecutable: async (command: string) => `/usr/bin/${command}`,`
  - `tests/scope-surface.spec.ts:136` — `resolveExecutable: async (command: string) => `/usr/bin/${command}`,`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：把写入限制在包目录或用户自己的配置目录内，绝不要为了让安装成功而放宽权限。
  EN Fix: Keep writes inside the package or the user's own configuration directory, and never loosen permissions to make an install succeed.

_按类别 / By category:_ 凭据读取 / credential access 3 · 网络回调 / network callbacks 3 · 供应链 / supply chain 3 · 提示注入 / prompt injection 2 · 数据外传 / exfiltration 1 · 混淆 / obfuscation 1 · 持久化 / persistence 1 · 提权 / privilege 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `dsh-data-agent-HEAD/`
- skipped assets/banner.png: 584085 bytes exceeds the 524288-byte per-file cap
- skipped assets/data-governance.png: 607018 bytes exceeds the 524288-byte per-file cap
- skipped assets/features.png: 682097 bytes exceeds the 524288-byte per-file cap
- skipped lib/client.js: 1735829 bytes exceeds the 524288-byte per-file cap
- skipped lib/client.js.map: 3657983 bytes exceeds the 524288-byte per-file cap
- not scanned (binary): assets/banner.webp, assets/charts.webp, assets/data-governance.webp, assets/features.webp, assets/settings.webp and 1 more
- outbound fetching was permitted for this audit
- grade forced to D by a critical finding: exfil.environment-harvest-then-callback — Environment harvest and an outbound request in the same package
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
