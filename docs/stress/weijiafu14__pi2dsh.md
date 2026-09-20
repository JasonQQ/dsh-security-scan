> 批量压测 / Batch stress test · ★ 199 · `weijiafu14/pi2dsh`
> https://github.com/weijiafu14/pi2dsh · audited in 15.2s
# 安装前体检 / Pre-install audit: dsh-work-x@0.4.2

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/weijiafu14/pi2dsh/tar.gz/HEAD` (URL / url)
- 已分析文件：639 个（16.0 MiB） / Files analysed: 639 (16.0 MiB)
- 内容摘要 / Content digest: `4e26adf3d2f07bf68a42a6d8e180e521…`
- 体检时间 / Audited at: 2026-09-20T09:53:51.918Z

## 最严重的风险 / Most severe risk

**同一个包内既有环境变量收集又有对外请求 / Environment harvest and an outbound request in the same package** `exfil.environment-harvest-then-callback`

中 数据会离开这台机器。该包中有代码把本机上的内容发往外部地址。
EN Data leaves this machine. Something in this package takes content that lives here and sends it to a destination outside it.

该包会访问的目标：`github.com`、`pi.dev`、`gitlab.com`、`127.0.0.1`、`api.deepseek.com`、`registry.npmjs.org`、`your-searxng.example.com`、`ali-oss-yceachan.oss-cn-chengdu.aliyuncs.com` / Destinations this package reaches: `github.com`, `pi.dev`, `gitlab.com`, `127.0.0.1`, `api.deepseek.com`, `registry.npmjs.org`, `your-searxng.example.com`, `ali-oss-yceachan.oss-cn-chengdu.aliyuncs.com`

- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 它还安排了之后继续运行，所以仅仅卸载这个包并不够。
  EN It also arranges to run again later, so removing the package is not enough on its own.
- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `scripts/blackbox-community.mjs:207`；完整列表见下方「发现」。 / The rule that decided the grade fired at `scripts/blackbox-community.mjs:207`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

发布期钩子（维护者打包或发布时运行，安装时不会执行）： / Publish-time hooks (run when the maintainer packs or publishes, not on install):

- `prepack`: `node -e "require('fs').accessSync('client.js')" || (echo 'dsh-x/client.js missing — run pnpm build at the repo root first' && exit 1)`

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `node:fs/promises`, `manual-overrides.json`, `discussions.json`, `classifications.json`, `product-matches.json`, `architecture-feasibility-overrides.json`, `provider-78-live.json`, `architecture-feasibility.json`, `architecture-feasibility-challenge-overrides.json`, `partial-reassessment-0.20.json`, `architecture-feasibility-final.json`, `architecture-feasibility-challenges.json` （另有 67 项） / (+67 more)
- **写入的文件路径 / File paths written:** `node:fs/promises`, `architecture-feasibility-final.json`, `architecture-feasibility-report.md`, `\n`, `provider-78-final.json`, `provider-78-report.md`, `reasoning-history-results.json`, `sample.txt`, `sample.ts`, `settings.json`, `mcp-fixture-server.mjs`, `.pi` （另有 107 项） / (+107 more)
- **派生的命令 / Commands spawned:** `error`, `node --trace-warnings ...`, `/tmp/pi2dsh-hermes-20260910/cli/node_modules/.bin/dsh plugin --profile web add /var/folders/6m/14zlftds6md1btml42wsbvl80000gp/T/pi2dsh-codex-image-FB4Ivg/dsh-work-x-0.4.0.tgz`, `Progress: resolved 0, reused 0, downloaded 1, added 0\\n`, `Progress: resolved 15, reused 0, downloaded 1, added 0\\n`, `Progress: resolved 78, reused 0, downloaded 1, added 0\\n`, `Progress: resolved 158, reused 0, downloaded 1, added 0\\n`, `[WARN] Issues with peer dependencies found. Run \"pnpm peers check\" to list them.\\n`, `\\n`, `dependencies:\\n`, `+ dsh-work-x file:/var/folders/6m/14zlftds6md1btml42wsbvl80000gp/T/pi2dsh-codex-image-FB4Ivg/dsh-work-x-0.4.0.tgz\\n`, `Packages: +161\\n` （另有 123 项） / (+123 more)
- **连接的域名 / Domains contacted:** `github.com`, `pi.dev`, `gitlab.com`, `127.0.0.1`, `api.deepseek.com`, `registry.npmjs.org`, `your-searxng.example.com`, `ali-oss-yceachan.oss-cn-chengdu.aliyuncs.com`, `openrouter.ai`, `opencode.ai`, `chatgpt.com`, `sandbaseai.github.io` （另有 94 项） / (+94 more)
- **读取的环境变量 / Environment variables read:** `REPO`, `PI_AI`, `FEASIBILITY_OUTPUT`, `DEEPSEEK_API_KEY`, `FEASIBILITY_MODEL`, `FEASIBILITY_MAX_TOKENS`, `FEASIBILITY_LIMIT`, `FEASIBILITY_BATCH_SIZE`, `FEASIBILITY_CONCURRENCY`, `PROVIDER_AUDIT_MODEL`, `PROVIDER_AUDIT_MAX_TOKENS`, `PROVIDER_AUDIT_CONCURRENCY` （另有 139 项） / (+139 more)

## 发现 / Findings

### 严重 / CRITICAL (1)

- **严重 / CRITICAL** `exfil.environment-harvest-then-callback` — 同一个包内既有环境变量收集又有对外请求 / Environment harvest and an outbound request in the same package
  中 该包读取或整体导出进程环境变量，同时又建立对外连接。CI 运行器和宿主会话都会把 API Key 导出到环境变量中，因此这一组合会把仍有效的凭据送出本机。
  EN The package reads or dumps process environment values and also opens outbound connections. CI runners and harness sessions export API keys into the environment, so this combination sends working credentials off the machine.
  - `scripts/blackbox-community.mjs:207` — `JSON.stringify(process.env`
  - `src/compat/pi-coding-agent.ts:1014` — `Object.keys(process.env`
  - `src/compat/vendor/pi-oauth-flows/provider-env.ts:15` — `Object.keys(process.env`
  - `community/full-audit-work/audit-feasibility.mjs:233` — `const response = await fetch('https://api.deepseek.com/anthropic/v1/messages', {`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：删除环境变量的整体导出，只逐个读取插件确实需要、且有文档说明的变量。
  EN Fix: Remove the environment dump, and read only individually documented variables that the plugin actually needs.

### 高 / HIGH (16)

- **高 / HIGH** `cred.env-harvest` — 读取或整体导出进程环境变量 / Reads or dumps the process environment
  中 该行把整个环境当成一个值取走——序列化、遍历或打印它，而不是只取自己需要的那一个变量。CI 运行器和宿主都会把 API Key 导出到环境变量里，因此整体导出就是一次凭据收集。
  EN The line takes the whole environment as a value — serializing it, iterating it, or printing it — rather than the one variable it needs. CI runners and the harness export API keys into the environment, so a dump is a credential harvest.
  - `scripts/blackbox-community.mjs:207` — `JSON.stringify(process.env`
  - `src/compat/pi-coding-agent.ts:1014` — `Object.keys(process.env`
  - `src/compat/vendor/pi-oauth-flows/provider-env.ts:15` — `Object.keys(process.env`
  - `src/compat/vendor/pi-tools/shell.ts:110` — `Object.keys(process.env`
  中 修复：只逐个读取插件文档中声明过的变量，绝不序列化整个环境对象，也不要把它写进日志或请求。
  EN Fix: Read only the variables the plugin documents, one at a time, and never serialize the environment object or forward it into a log or request.
- **高 / HIGH** `cred.environment-secret-enumeration` — 枚举大量不同名称的密钥类环境变量 / Enumerates many differently-named secret environment variables
  中 该包读取了一批看起来是凭据的环境变量，而它对这些服务并没有其他任何调用。读一个文档中声明的 key 是插件正常的认证方式；扫走五个以上不同名称的密钥，是在收集凭据。
  EN 18 distinct secret-named environment variables are read (DEEPSEEK_API_KEY, FEASIBILITY_MAX_TOKENS, PROVIDER_AUDIT_MAX_TOKENS, EXAMPLE_TOKEN, MCP_TOKEN, LITELLM_API_KEY, OPENROUTER_API_KEY, UPSTREAM_API_KEY, …).
  - `community/full-audit-work/audit-feasibility.mjs:16` — `const apiKey = process.env.DEEPSEEK_API_KEY`
  - `community/full-audit-work/audit-feasibility.mjs:242` — `max_tokens: Number(process.env.FEASIBILITY_MAX_TOKENS ?? 10000),`
  - `community/full-audit-work/audit-provider-78-live.mjs:105` — `max_tokens: Number(process.env.PROVIDER_AUDIT_MAX_TOKENS ?? 5000),`
  - `community/full-audit-work/reassessed-live.json:1634` — `"body": "你观察得对：**当前 Web 设置页没有通用 MCP server 的添加表单**。现有入口是组合配置，而不是 GUI。\n\n官方已经提供 `@deepseek-ai/dsh-mcp-client`，一个 server 对应一个插件实例。最安全的试用方式是先建一个临时 overlay：\n\n```…`
  中 修复：删掉与本插件功能无关的变量读取，只保留其文档化集成所需的键。
  EN Fix: Delete the reads of variables this plugin has no feature for, and keep only the keys its documented integration needs.
- **高 / HIGH** `exfil.clipboard-read-then-callback` — 同一个包内既有剪贴板读取又有对外请求 / Clipboard read and an outbound request in the same package
  中 该包读取系统剪贴板，同时发起对外请求。剪贴板里有刚刚复制过的密码和令牌，而这个包里没有任何东西能解释这两种行为为何同时存在。
  EN The package reads the system clipboard and also makes outbound requests. Clipboards hold passwords and tokens that were copied moments earlier, and nothing in this package explains why the two behaviors coexist.
  - `src/compat/pi-coding-agent.ts:384` — `xclip`
  - `src/compatibility.ts:91` — `xclip`
  - `community/full-audit-work/audit-feasibility.mjs:233` — `const response = await fetch('https://api.deepseek.com/anthropic/v1/messages', {`
  - `community/full-audit-work/audit-provider-78-live.mjs:100` — `const response = await fetch('https://api.deepseek.com/anthropic/v1/messages', {`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：删除剪贴板读取，或让目标地址默认不可达，并向用户说明。
  EN Fix: Remove the clipboard read, or make the destination unreachable by default and documented for the user.
- **高 / HIGH** `harness.patch-disable-plugin` — composition patch 会禁用其他插件 / Composition patch disables another plugin
  中 该 patch 删除或禁用了已有的插件条目。应用到 profile 后，它会悄悄关掉另一个组件——通常是安全或策略插件——而用户本意只是添加这一个插件。
  EN The patch removes or disables an existing plugin entry. Applied to a profile it silently turns off another component — commonly a security or policy plugin — while the user only intended to add this one.
  - `community/full-audit-work/e2e-live.json:11` — `"body": "**Web profile: `dsh-tool-web` (web_fetch) is disabled by default → agents fall back to `bash`+`curl` with a fingerprintable default UA and get blocked …`
  - `community/full-audit-work/e2e-live.json:11` — `body**Web profile: `dsh-tool-web` (web_fetch) is disabled by default → agents fall back to `bash`+`curl` with a fingerprintable default UA and get blocked by WA…`
  - `community/full-audit-work/e2e-live.json:1678` — `"body": "已经明确，启动时需要指定配置文件中的provider模型，就可以正常工作\r\npnpm dsh --profile tui -m your-gateway/deepseek-v4-flash\r\n\r\n1、正确配置settings.yaml中reasoningEfforts: [ off, lo…`
  - `community/full-audit-work/reassessed-live.json:135` — `"body": "**Web profile: `dsh-tool-web` (web_fetch) is disabled by default → agents fall back to `bash`+`curl` with a fingerprintable default UA and get blocked …`
  - ……另有 3 处 / … and 3 more location(s)
  中 修复：只提供仅插入本插件的增量 patch，并在 README 中说明会改动哪些条目。
  EN Fix: Ship an additive patch that inserts only this plugin, and explain in the README which entries change.
- **高 / HIGH** `harness.settings-widen-permission` — 放宽宿主的沙箱或审批策略 / Widens the harness sandbox or approval policy
  中 该行在宿主设置、profile 或 composition patch 中写入了宽松的沙箱或权限值。放宽策略会移除用户为所有插件——而不只是这一个插件——设定的文件与命令边界。
  EN The line sets a permissive sandbox or permission value in the harness settings, a profile or a composition patch. Widening the policy removes the file and command boundaries the user chose for every plugin, not just for this one.
  - `community/full-audit-work/reassessed-live.json:3022` — `"body": "Hi all — I've been building **[dsh-ccTUI](https://github.com/agentforce314/dsh-ccTUI)**, a terminal UI for deepseek-harness in the style of Claude Code…`
  - `community/full-audit-work/reassessed-live.json:3022` — `bodyHi all — I've been building **[dsh-ccTUI](https://github.com/agentforce314/dsh-ccTUI)**, a terminal UI for deepseek-harness in the style of Claude Code. It …`
  - `community/full-audit-work/reassessed-live.json:3022` — `body/Hi all — I've been building **[dsh-ccTUI](https:/github.com/agentforce314/dsh-ccTUI)**, a terminal UI for deepseek-harness in the style of Claude Code. It …`
  中 修复：沙箱与审批设置交给用户决定；插件若需要某项能力，应加以说明并由用户显式授予。
  EN Fix: Leave sandbox and approval settings to the user; if the plugin needs a capability, document it and let the user grant it explicitly.
- **高 / HIGH** `net.dynamic-dns-host` — 使用免费动态 DNS 主机名 / Uses a free dynamic DNS hostname
  中 动态 DNS 服务商提供的主机名任何人都能注册并随意改指，因此这类端点可能在审计之后、安装之前的间隙换到别的运营者手里。
  EN Dynamic DNS providers hand out hostnames that anyone can register and repoint at will, so an endpoint on one of them can move to a new operator between the audit and the install.
  - `community/provider-universe.json:731` — `infra-headroom-1vnnn6-82-193-93-167.sslip.io`
  - `community/provider-universe.json:732` — `infra-headroom-1vnnn6.sslip.io`
  - `community/provider-universe.json:733` — `infra-vulkan-llamacpp-wvayfg-39ab2d-82-193-93-167.sslip.io`
  中 修复：把端点换成自己拥有的稳定域名，或彻底删除该回调。
  EN Fix: Replace the endpoint with a stable, owned domain, or remove the callback entirely.
- **高 / HIGH** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 103 distinct remote hosts (ali-oss-yceachan.oss-cn-chengdu.aliyuncs.com, api.deepseek.com, github.com, gitlab.com, openrouter.ai, pi.dev, registry.npmjs.org, your-searxng.example.com, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `.github/workflows/ci.yml:25` — `https://github.com/deepseek-ai/deepseek-harness.git`
  - `community/audit-results.json:5` — `https://pi.dev/packages?type=extension`
  - `community/audit-results.json:23` — `git+https://github.com/nicobailon/pi-mcp-adapter.git`
  - `community/audit-results.json:971` — `git+https://gitlab.com/jarkkojs/readseek.git`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `community/blackbox-results.json:892` — `"url": "http://127.0.0.1:55735/page",`
  - `community/blackbox-results.json:1593` — `"url": "http://127.0.0.1:55735/page"`
  - `community/blackbox-results.json:1605` — `"evidence": "**Search results for \"pi2dsh exercise probe\":**\n\n1. **pi2dsh exercise result**\n http://127.0.0.1/result\n PI2DSH_EXERCISE_OK"`
  - `community/blackbox-results.json:1825` — `"url": "http://127.0.0.1:55735/page"`
  - ……另有 58 处 / … and 58 more location(s)
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **高 / HIGH** `net.token-or-blob-in-url` — 把凭据或编码数据块放进 URL / Puts a credential or encoded blob in a URL
  中 令牌形状的查询参数、内嵌的 `user:password` 授权部分，或超长高熵的查询值，都意味着密钥或载荷数据在 URL 中传输，最终会留在访问日志、代理和浏览器历史里。
  EN A token-shaped query parameter, an embedded `user:password` authority, or a long high-entropy query value means secret material or payload data travels in a URL, where it lands in access logs, proxies and browser history.
  - `dsh-x/client.js:250` — ``/pi2dsh/browser-state?session=${encodeURIComponent(session)}``
  - `dsh-x/client.js:1352` — ``/pi2dsh/browser-state?session=${encodeURIComponent(session)}``
  - `dsh-x/client.js:1502` — ``/pi2dsh/mcp-state?session=${encodeURIComponent(session)}``
  - `dsh-x/client.js:1813` — ``/dsh-x/memory-state?session=${encodeURIComponent(session)}``
  - ……另有 24 处 / … and 24 more location(s)
  中 修复：凭据放在 Authorization 头里发送，载荷用 POST 放在请求体中，不要编码进查询字符串。
  EN Fix: Send credentials in an Authorization header, and POST payloads in the body rather than encoding them into the query string.
- **高 / HIGH** `obf.decoded-payload-literal` — 携带解码、转义或高熵字面量 / Carries a decoded, escaped or high-entropy literal
  中 一个很长的字面量会在运行时被解码（base64、`atob`、`unescape`、`decodeURIComponent`），或者写满了密集的十六进制、Unicode 转义，或者呈现出编码数据块那种近乎均匀的字符分布。
  EN A long literal is decoded at runtime (base64, `atob`, `unescape`, `decodeURIComponent`), written with dense hex or unicode escapes, or has the near-uniform character distribution of an encoded blob.
  - `dsh-x/client.js:49` — `const ESCAPES = `(?:${ESC + String.raw`\[([0-9;]*)m`}|${ESC + String.raw`\]8;[^;\u0007\u001b]*;([^\u0007\u001b]*)(?:\u0007|\u001b\\)`}|${ESC + String.raw`\][^\u…`
  - `src/runtime.ts:769` — `const OSC8_HYPERLINK = /\u001b\]8;[^;]*;([^\u0007\u001b]*)(?:\u0007|\u001b\\)([\s\S]*?)\u001b\]8;;(?:\u0007|\u001b\\)/gu`
  中 修复：把该值保存为可读源码，或保存为格式有文档说明的数据，让审查者能看清实际运行的到底是什么。
  EN Fix: Store the value as readable source or as data with a documented format, so a reviewer can see what is actually being run.
- **高 / HIGH** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `scripts/generate-capability-docs.mjs:18` — `await import(join(root, 'dist', 'index.mjs'))`
  - `scripts/verify-model-bridge-e2e.mjs:27` — `const bridge = await jiti.import(join(projectRoot, 'src/model-bridge.ts'))`
  - `scripts/verify-oauth-e2e.mjs:32` — `const { FileCredentialStore, loginPiProvider, resolveOAuthApiKey } = await jiti.import(join(projectRoot, 'src/oauth-bridge.ts'))`
  - `scripts/verify-oauth-e2e.mjs:33` — `const piAi = await jiti.import(join(projectRoot, 'src/compat/pi-ai.ts'))`
  - ……另有 15 处 / … and 15 more location(s)
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.
- **高 / HIGH** `persist.dsh-settings-rewrite` — 改写 DSH 配置或 profile / Rewrites DSH settings or profiles
  中 该行写入了宿主配置（`~/.dsh/settings.yaml`、profile 或 storages）。改动 profile 会改变此后每次宿主启动时加载哪些插件，以及它们如何配置。
  EN The line writes into the harness configuration (`~/.dsh/settings.yaml`, profiles or storages). Changing the profile changes which plugins load and how they are configured on every future harness start.
  - `community/full-audit-work/e2e-live.json:11` — `"body": "**Web profile: `dsh-tool-web` (web_fetch) is disabled by default → agents fall back to `bash`+`curl` with a fingerprintable default UA and get blocked …`
  - `community/full-audit-work/e2e-live.json:11` — `body**Web profile: `dsh-tool-web` (web_fetch) is disabled by default → agents fall back to `bash`+`curl` with a fingerprintable default UA and get blocked by WA…`
  - `community/full-audit-work/e2e-live.json:1678` — `"body": "已经明确，启动时需要指定配置文件中的provider模型，就可以正常工作\r\npnpm dsh --profile tui -m your-gateway/deepseek-v4-flash\r\n\r\n1、正确配置settings.yaml中reasoningEfforts: [ off, lo…`
  - `community/full-audit-work/provider-78-audit.json:1154` — `"latestThreadState": "用户 yu-zhy 已提供完整解决方案：使用 pnpm dsh --profile tui -m your-gateway/deepseek-v4-flash 指定模型，在 ~/.dsh/profiles/tui/cordis.patch.yml 中禁用 llm-deepse…`
  - ……另有 6 处 / … and 6 more location(s)
  中 修复：把用户应当应用的配置打印出来，而不是直接写宿主的运行状态。
  EN Fix: Print the configuration the user should apply instead of writing the harness state directly.
- **高 / HIGH** `persist.global-self-install` — 全局安装依赖包 / Installs a package globally
  中 该命令把包安装到全局前缀，于是用户的 PATH 上多出一个可执行文件，而且当前项目删除后它仍然留在那里。
  EN The command installs a package into the global prefix, which puts a new executable on the user's PATH and keeps it there after the current project is deleted.
  - `community/dsh-015-compat/new-subagents-lifecycle.json:49` — `npm i -g`
  - `community/dsh-015-compat/new-subagents-lifecycle.json:50` — `npm i -g`
  - `community/full-audit-work/reassessed-live.json:3739` — `npm i -g`
  中 修复：改为本地安装，并通过项目自身的脚本调用该工具；全局安装应由用户自己决定，而不是由插件代劳。
  EN Fix: Install locally and invoke the tool through the project's own scripts; global installs belong to the user's decision, not to a plugin.
- **高 / HIGH** `priv.system-path-modification` — 修改系统路径或把文件设为全局可写 / Modifies a system path or makes a file world-writable
  中 该行写入 `/etc`、`/usr`、`/bin` 或 launch daemon 目录，把属主改为 root，或设置全局可写权限。任何一种都改变了安装包之外的机器状态，也可能为后续提权铺路。
  EN The line writes under `/etc`, `/usr`, `/bin` or a launch-daemon directory, changes ownership to root, or sets world-writable permissions. Any of these changes the machine beyond the installed package and can prepare an escalation later.
  - `community/dsh-015-compat/new-examples.json:248` — `"error": "Command failed: npm install --no-fund --no-audit\nnpm error code ENOSPC\nnpm error syscall write\nnpm error errno ENOSPC\nnpm error nospc Invalid resp…`
  - `community/dsh-015-compat/new-examples.json:252` — `"error": "Command failed: npm install --no-fund --no-audit\nnpm error code ENOSPC\nnpm error syscall write\nnpm error errno ENOSPC\nnpm error nospc Invalid resp…`
  中 修复：把写入限制在包目录或用户自己的配置目录内，绝不要为了让安装成功而放宽权限。
  EN Fix: Keep writes inside the package or the user's own configuration directory, and never loosen permissions to make an install succeed.
- **高 / HIGH** `prompt.doc-instruction` — 文档中包含针对模型的指令 / Documentation contains instructions aimed at a model
  中 随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。
  EN A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.
  - `AGENTS.md:54` — `adapter that bypasses a broken seam does not prove the original seam is fixed.`
  - `community/dsh-pi-opportunity-ledger.md:304` — `so this can bypass missing DSH MCP features if its real Pi interaction`
  - `community/full-audit-work/provider-78-report.md:857` — `- Latest state: 评论指出根因是默认system prompt/persona为英文，模型跟随其语言。解决方案包括：配置级修改persona、安装dsh-zh插件、会话级指令。有用户反馈插件安装后思维链仍为英文。另一评论指出rc.7中persona默认为空，固定Harness身份和工具提示为英文，直接De…`
  - `community/v2-honest-limits.md:194` — `| [#3159](https://github.com/deepseek-ai/deepseek-harness/discussions/3159) | 1 | Upstream candidates from an rc.7 plugin-heav | 仅对第 1 项：改用自带传输的 Pi provider 包，请…`
  - ……另有 9 处 / … and 9 more location(s)
  中 修复：把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。
  EN Fix: Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.
- **高 / HIGH** `prompt.embedded-instruction-string` — 源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model
  中 源码中的字符串字面量——通常是工具描述或系统提示词片段——要求模型绕过确认或对用户隐瞒某些事，于是它作为一条指令进入上下文窗口。
  EN A string literal in the source — typically a tool description or system prompt fragment — tells the model to bypass confirmation or to hide something from the user, so it lands in the context window as a directive.
  - `community/full-audit-work/e2e-live.json:1183` — `"That log actually makes the cause much clearer. The `320` isn't the configured 8192 output limit being reached — it's the amount of output that could fit after…`
  - `community/full-audit-work/e2e-live.json:1908` — `"<img width=\"1404\" height=\"592\" alt=\"48ebab252e7ab8833bb11b4c31402b4b\" src=\"https://github.com/user-attachments/assets/38c5452d-90a2-4edb-bf40-e0c60a1e5f…`
  - `community/full-audit-work/e2e-live.json:2541` — `"## Problem\n\nFor a hand-declared `openai-completions` route pointing at an OpenAI-compatible gateway, `dsh-llm-pi-ai` relies on pi-ai's URL-derived compat det…`
  - `community/full-audit-work/e2e-live.json:2541` — `'s URL-derived compat detection. An unrecognized gateway URL is treated as a standard OpenAI endpoint, so the adapter sends:\n\n- the system prompt as `role: \"…`
  - ……另有 36 处 / … and 36 more location(s)
  中 修复：如实描述工具的行为，删除那些会改变 agent 对待用户方式的指令。
  EN Fix: Describe the tool's behavior factually and remove directives that change how the agent treats the user.

### 中 / MEDIUM (11)

- **中 / MEDIUM** `cred.many-secret-env-vars` — 读取多个不同名称的密钥类环境变量 / Reads several differently-named secret environment variables
  中 这里的一行、或整个包里的若干行，读取了名称看起来像凭据的环境变量。只读一个文档中声明的 key 是插件本该有的认证方式；枚举多个不同名称的密钥，则是在收集凭据而不是在使用凭据。
  EN One line here, or several across the package, read environment variables whose names look like credentials. Reading a single documented key is how a plugin is meant to authenticate; enumerating many differently-named ones is how credentials are gathered rather than used.
  - `community/full-audit-work/audit-feasibility.mjs:16` — `process.env.DEEPSEEK_API_KEY`
  - `community/full-audit-work/audit-feasibility.mjs:242` — `process.env.FEASIBILITY_MAX_TOKENS`
  - `community/full-audit-work/audit-provider-78-live.mjs:7` — `process.env.DEEPSEEK_API_KEY`
  - `community/full-audit-work/audit-provider-78-live.mjs:105` — `process.env.PROVIDER_AUDIT_MAX_TOKENS`
  - ……另有 40 处 / … and 40 more location(s)
  中 修复：只保留插件确实需要且有文档说明的变量，删掉与任何功能无关的密钥读取。
  EN Fix: Keep to the variables this plugin documents and needs, and delete reads of keys it has no feature for.
- **中 / MEDIUM** `cred.read-dotenv-or-history` — 读取 dotenv 文件或 shell 历史 / Reads a dotenv file or shell history
  中 该行读取了 `.env` 或 shell 历史文件。这两处都是令牌、云密钥和曾经粘贴过的密钥堆积的地方，而 shell 历史还会勾勒出用户的基础设施全貌。
  EN This line reads `.env` or a shell history file. Both are where tokens, cloud keys and previously pasted secrets accumulate, and a shell history also maps out the user's infrastructure.
  - `scripts/verify-native-subagents-e2e.mjs:62` — `const envFile = readFileSync(resolve(projectRoot, '..', 'deepseek-harness', '.env'), 'utf8')`
  - `scripts/verify-pi-code-headless-e2e.mjs:139` — `console.log(`[pi-code-headless] settings.env → ${envSeen ? 'PASS' : 'FAIL'}; PreToolUse hook → ${existsSync(HOOK_MARK) ? 'PASS' : 'FAIL'}`)`
  - `scripts/verify-pi-tui-ecosystem-e2e.mjs:42` — `const text = readFileSync(resolve(projectRoot, '..', 'deepseek-harness', '.env'), 'utf8')`
  - `scripts/verify-subagents-e2e.mjs:59` — `const envFile = readFileSync(resolve(projectRoot, '..', 'deepseek-harness', '.env'), 'utf8')`
  - ……另有 3 处 / … and 3 more location(s)
  中 修复：通过插件配置 schema 加载配置，而不是读取 dotenv 文件；永远不要打开用户的历史记录。
  EN Fix: Load configuration through the plugin config schema instead of reading dotenv files, and never open the user's history.
- **中 / MEDIUM** `exfil.clipboard-read` — 读取系统剪贴板 / Reads the system clipboard
  中 该行通过 `pbpaste`、`xclip`、`wl-paste`、`Get-Clipboard` 或 `clipboardy` 读取剪贴板。剪贴板里经常放着刚刚复制过的密码、令牌和私密文本。
  EN The line reads the clipboard through `pbpaste`, `xclip`, `wl-paste`, `Get-Clipboard` or `clipboardy`. Clipboards routinely hold passwords, tokens and private text that were copied moments earlier.
  - `src/compat/pi-coding-agent.ts:384` — `xclip`
  - `src/compatibility.ts:91` — `xclip`
  中 修复：通过插件配置向用户索取该值，而不是读取剪贴板上恰好存在的内容。
  EN Fix: Ask the user for the value through the plugin config instead of reading whatever happens to be on the clipboard.
- **中 / MEDIUM** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `community/full-audit-work/args-reparse-scaling.mjs:26` — `choices: [{ index: 0, delta: { role: 'assistant', tool_calls: [{ index: 0, id: 'call_1', type: 'function', function: { name: 'write', arguments: '' } }] }, fini…`
  - `community/full-audit-work/transport-classify-experiment.mjs:107` — `chunk({ role: 'assistant', content: '<invoke name="write"><parameter name="file_path">a.txt</parameter></invoke>' }),`
  - `dsh-x/client.js:1250` — `name: "shell.overlay",`
  - `dsh-x/client.js:2582` — `name: "shell.overlay",`
  - ……另有 20 处 / … and 20 more location(s)
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.
- **中 / MEDIUM** `install.dependency-manifest-hook` — 随包携带的清单声明了安装钩子 / Bundled manifest declares install hooks
  中 非包根目录的清单声明了生命周期钩子。从这棵目录树安装的内置或嵌套依赖会运行自己的安装脚本，却不会像已发布依赖那样经过仓库审查。
  EN A manifest other than the package root declares lifecycle hooks. A vendored or nested dependency installed from this tree runs its own install scripts without the registry review that a published dependency would have had.
  - `dsh-x/package.json:61` — `"prepack": "node -e \"require('fs').accessSync('client.js')\" || (echo 'dsh-x/client.js missing \u2014 run pnpm build at the repo root first' && exit 1)"`
  中 修复：通过锁文件从仓库安装嵌套依赖，并删除自带钩子的内置清单。
  EN Fix: Install nested dependencies from the registry with a lockfile, and delete vendored manifests that carry their own hooks.
- **中 / MEDIUM** `install.hook-runs-shell-code` — 安装期钩子执行的不只是构建 / Lifecycle hook runs more than a build
  中 该钩子命令不属于常见的编译与拷贝步骤，安装这个包时会以用户权限运行任意代码，而这一切发生在任何人来得及检查之前。
  EN This hook command is not one of the usual compile-and-copy steps, so installing the package runs arbitrary code with the user's privileges before anything can be inspected.
  - `dsh-x/package.json:61` — `"prepack": "node -e \"require('fs').accessSync('client.js')\" || (echo 'dsh-x/client.js missing \u2014 run pnpm build at the repo root first' && exit 1)"`
  - `package.json:49` — `"prepare": "tsdown",`
  中 修复：把钩子收敛为 `tsc` 或 `npm run build` 之类的构建命令，或把这项工作移到一个由用户主动执行的显式脚本里。
  EN Fix: Reduce the hook to a build command such as `tsc` or `npm run build`, or move the work into an explicit script the user chooses to run.
- **中 / MEDIUM** `install.native-downloader` — 安装流程会编译或下载原生产物 / Install path builds or downloads a native artifact
  中 依赖包在安装期间编译原生代码或拉取预编译二进制文件，于是最终在本机被执行的不是被审查过的源码。
  EN The package compiles native code or fetches a prebuilt binary during install, so bytes that are not the reviewed source end up executed on this machine.
  - `pnpm-lock.yaml:1214` — `'@npmcli/node-gyp@5.0.0':`
  - `pnpm-lock.yaml:2269` — `node-gyp@12.4.0:`
  - `pnpm-lock.yaml:3908` — `'@npmcli/node-gyp@5.0.0': {}`
  - `pnpm-lock.yaml:3928` — `'@npmcli/node-gyp': 5.0.0`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：优先使用纯实现；若必须使用预编译产物，则内置该产物并记录其摘要，而不是在安装时下载。
  EN Fix: Prefer a pure implementation, or vendor the prebuilt artifact with a recorded digest instead of downloading it at install time.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `community/blackbox-results.json:892` — `http://127.0.0.1:55735/page`
  - `community/blackbox-results.json:1593` — `http://127.0.0.1:55735/page`
  - `community/blackbox-results.json:1605` — `http://127.0.0.1/result\n`
  - `community/blackbox-results.json:1825` — `http://127.0.0.1:55735/page`
  - ……另有 55 处 / … and 55 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `obf.long-minified-line` — 整行是压缩或机器生成的数据块 / Line is a single minified or machine-generated blob
  中 该行超过 500 个字符且几乎没有空白，正是打包载荷、压缩字符串表或机器生成单行代码的样子。这样的一行用肉眼什么也审不出来。
  EN The line is over 500 characters with almost no whitespace, which is what a bundled payload, a packed string table or a machine-generated one-liner looks like. Nothing on such a line is reviewable by eye.
  - `community/full-audit-work/classify.mjs:42` — `provider_model=provider transports/OAuth/catalog/protocol/reasoning; mcp=advanced MCP; subagents=child agents/model pins/steering/resume; autonomous_goals_tasks…`
  - `community/full-audit-work/repair-low.mjs:12` — `const categories = ['provider_model_protocol','install_update_startup','plugin_framework_market','session_workspace_history','tool_loop_runtime','background_job…`
  中 修复：发布未压缩的源码，或在 README 中说明该文件由哪个构建产出、可读源码在哪里。
  EN Fix: Ship unminified source, or state in the README which build produced the file and where the readable source lives.
- **中 / MEDIUM** `prompt.concealed-instruction` — 把文本藏在注释或不可见字符中 / Hides text in a comment or invisible characters
  中 该行把内容藏在 HTML 注释里，或藏在零宽字符与双向控制字符之后，这些内容在 diff 或渲染后的文档中什么都看不见，却仍会作为文本被读取。
  EN The line conceals content either in an HTML comment or behind zero-width and bidirectional control characters, which render as nothing in a diff or a rendered document while still being read as text.
  - `community/full-audit-work/e2e-live.json:1792` — `"body": "我来帮你做一个可视化界面(Local Web UI),它可以输入提示词、点击生成按钮触发 ComfyUI workflow,并把生成的图片实时显示给你看对吗？\r\n是的，我现在就开始动手搭建这个界面.\r\n在你动手之前，我先问你一个问题:你想在你的界面上显示什么：'') jump boxes fo…`
  - `community/full-audit-work/e2e-live.json:1792` — `body我来帮你做一个可视化界面(Local Web UI),它可以输入提示词、点击生成按钮触发 ComfyUI workflow,并把生成的图片实时显示给你看对吗？\r\n是的，我现在就开始动手搭建这个界面.\r\n在你动手之前，我先问你一个问题:你想在你的界面上显示什么：'') jump boxes for Beg…`
  - `community/full-audit-work/e2e-live.json:1792` — `body/我来帮你做一个可视化界面(Local Web UI),它可以输入提示词、点击生成按钮触发 ComfyUI workflow,并把生成的图片实时显示给你看对吗？\r\n是的，我现在就开始动手搭建这个界面.\r\n在你动手之前，我先问你一个问题:你想在你的界面上显示什么：'') jump boxes for Be…`
  - `community/full-audit-work/e2e-live.json:3384` — `"body": " 想帮你定位，但还缺几个关键信息：\n1. 这个 qwen 是**本地部署**（ollama/vllm 等）还是**云端 API**（阿里云百炼等）？\n2. 模型具体是哪个（如 qwen2.5:7b / qwen-max）？如果是本地，用的什么量化、什么显卡/显存？\n3. 对比的 81 tok/s…`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：删除被隐藏的文本和不可见字符；审查者看不到的东西就不该出现在发布的包里。
  EN Fix: Delete the concealed text and the invisible characters; anything a reviewer cannot see does not belong in a shipped package.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 67 shipped file(s) are 64 KiB or larger and were not read as text, the largest being docs/posting-kit/assets/01-vision-companion-model-picker.png at 207 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `docs/posting-kit/assets/01-vision-companion-model-picker.png` — `211908 bytes not decoded as text`
  - `community/full-audit-work/audit-feasibility.mjs:233` — `const response = await fetch('https://api.deepseek.com/anthropic/v1/messages', {`
  - `community/full-audit-work/audit-provider-78-live.mjs:100` — `const response = await fetch('https://api.deepseek.com/anthropic/v1/messages', {`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (1)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `community/full-audit-work/e2e-live.json:2751` — `"body": "> Ark (volces.com) integration fails with 400 `InvalidParameter`: system prompt is sent with role `developer`, which the Ark gateway rejects\r\n\r\n## …`
  - `community/full-audit-work/e2e-live.json:2751` — `body> Ark (volces.com) integration fails with 400 `InvalidParameter`: system prompt is sent with role `developer`, which the Ark gateway rejects\r\n\r\n## 环境\r\…`
  - `community/full-audit-work/e2e-live.json:2751` — `body/> Ark (volces.com) integration fails with 400 `InvalidParameter`: system prompt is sent with role `developer`, which the Ark gateway rejects\r\n\r\n## 环境\r…`
  - `community/full-audit-work/provider-78-audit.json:84` — `"latestThreadState": "ogj130评论指出思考强度问题已通过配置修改解决：在~/.dsh/settings.yaml中为模型添加reasoningEfforts声明，重启dsh服务后链路打通，wire层会发送reasoning: { effort: \"...\" }。blackteaYES评论提…`
  - ……另有 44 处 / … and 44 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.

_按类别 / By category:_ 凭据读取 / credential access 5 · 网络回调 / network callbacks 5 · 数据外传 / exfiltration 3 · 滥用宿主环境 / harness abuse 3 · 混淆 / obfuscation 3 · 提示注入 / prompt injection 3 · 安装脚本 / install scripts 3 · 持久化 / persistence 2 · 提权 / privilege 1 · 供应链 / supply chain 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `pi2dsh-HEAD/`
- skipped community/full-audit-work/architecture-feasibility-challenges.json: 1297486 bytes exceeds the 524288-byte per-file cap
- skipped community/full-audit-work/architecture-feasibility-final.json: 1651114 bytes exceeds the 524288-byte per-file cap
- skipped community/full-audit-work/architecture-feasibility-recoveries.json: 700981 bytes exceeds the 524288-byte per-file cap
- skipped community/full-audit-work/architecture-feasibility.json: 1009516 bytes exceeds the 524288-byte per-file cap
- skipped community/full-audit-work/candidate-comments.json: 643531 bytes exceeds the 524288-byte per-file cap
- skipped community/full-audit-work/classifications.json: 1349958 bytes exceeds the 524288-byte per-file cap
- skipped community/full-audit-work/discussions.json: 12773910 bytes exceeds the 524288-byte per-file cap
- skipped community/full-audit-work/partial-reassessment-0.20.json: 562557 bytes exceeds the 524288-byte per-file cap
- skipped community/full-audit-work/product-matches.json: 1056019 bytes exceeds the 524288-byte per-file cap
- skipped community/full-audit-work/provider-78-live.json: 587692 bytes exceeds the 524288-byte per-file cap
- skipped community/full-audit-work/ready-live.json: 850186 bytes exceeds the 524288-byte per-file cap
- ……另有 18 项 / … and 18 more

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
