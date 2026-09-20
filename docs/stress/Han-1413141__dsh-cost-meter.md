> 批量压测 / Batch stress test · ★ 314 · `Han-1413141/dsh-cost-meter`
> https://github.com/Han-1413141/dsh-cost-meter · audited in 3.9s
# 安装前体检 / Pre-install audit: dsh-cost-meter@1.7.30

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/Han-1413141/dsh-cost-meter/tar.gz/HEAD` (URL / url)
- 已分析文件：287 个（7.3 MiB） / Files analysed: 287 (7.3 MiB)
- 内容摘要 / Content digest: `bbadd91ec8a2b55dfb84b8225e92b3f3…`
- 体检时间 / Audited at: 2026-09-20T09:53:22.664Z

## 最严重的风险 / Most severe risk

**向裸 IP 地址发送请求 / Sends a request to a bare IP address** `net.raw-ip-destination`

中 它会建立出站连接，因此可以在你无法选择的时机接收指令或送出数据。
EN It opens an outbound connection, so it can receive instructions or send data at a moment you do not choose.

该包会访问的目标：`github.com`、`www.w3.org`、`your-litellm.example.com`、`developers.openai.com`、`opencode.ai`、`ai.google.dev`、`docs.x.ai`、`www.alibabacloud.com` / Destinations this package reaches: `github.com`, `www.w3.org`, `your-litellm.example.com`, `developers.openai.com`, `opencode.ai`, `ai.google.dev`, `docs.x.ai`, `www.alibabacloud.com`

- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 它还安排了之后继续运行，所以仅仅卸载这个包并不够。
  EN It also arranges to run again later, so removing the package is not enough on its own.
- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `lib/client.js:6`；完整列表见下方「发现」。 / The rule that decided the grade fired at `lib/client.js:6`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `${home}/.claude/.credentials.json`, `node:fs/promises`, `package.json`, `.js`, `ds-pricing.html`, `ledger.json`, `../package.json`, `\n`, `storages/cost-meter/ledger.json`, `.tmp`, `../lib/client.js`, `../scripts/build.mjs` （另有 14 项） / (+14 more)
- **写入的文件路径 / File paths written:** `\n`, `storages/cost-meter`, `session.jsonl`, `ledger.json`, `auth.json`, `compatibility-probe.json`, `node_modules/dsh-cost-meter`, `package.json`, `\n{"torn":`, `@qianwenai/qianwen-cli`, `dist/bin/qianwen.js`, `qianwen.cmd` （另有 34 项） / (+34 more)
- **派生的命令 / Commands spawned:** `node:child_process`, `utf8`, `ignore`, `pipe`, `powershell.exe`, `-NoProfile`, `-NonInteractive`, `-Command`, `$fso = New-Object -ComObject Scripting.FileSystemObject; $fso.GetFolder($env:CM_REPAIR_ALIAS_DIRECTORY).ShortPath`, `lib/repair-sessions-cli.js`, `--sessions-root`, `--write` （另有 7 项） / (+7 more)
- **连接的域名 / Domains contacted:** `github.com`, `www.w3.org`, `your-litellm.example.com`, `developers.openai.com`, `opencode.ai`, `ai.google.dev`, `docs.x.ai`, `www.alibabacloud.com`, `www.upstage.ai`, `raw.githubusercontent.com`, `business.aliyuncs.com`, `platform.deepseek.com` （另有 58 项） / (+58 more)
- **读取的环境变量 / Environment variables read:** `USERPROFILE`, `HOME`, `XDG_CONFIG_HOME`, `DEEPSEEK_BASE_URL`, `process.env (every variable)`, `DSH_HOME`, `TEMP`, `TMPDIR`, `OPENCODE_GO_API_KEY`, `ARBITRARY_ROUTE_KEY`, `OPENCODE_API_KEY`, `CM_HOST_PACKAGE` （另有 7 项） / (+7 more)

## 发现 / Findings

### 高 / HIGH (5)

- **高 / HIGH** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 66 distinct remote hosts (ai.google.dev, developers.openai.com, docs.x.ai, github.com, opencode.ai, www.alibabacloud.com, www.w3.org, your-litellm.example.com, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `.github/ISSUE_TEMPLATE/config.yml:4` — `https://github.com/Han-1413141/dsh-cost-meter/security/advisories/new`
  - `.github/ISSUE_TEMPLATE/feature_request.yml:9` — `https://github.com/Han-1413141/dsh-cost-meter/blob/master/CHANGELOG.md`
  - `docs/diagram-architecture.en.svg:1` — `http://www.w3.org/2000/svg`
  - `docs/examples/custom-balance-litellm.json:10` — `https://your-litellm.example.com/key/info`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `lib/client.js:6` — ``),O=w.map((D,G)=>D.text!=null?e("div",{key:G,className:"cm-mm-row wide"},e("span",{className:"cm-bbox-label"},D.name),e("span",{className:"cm-mm-text cm-num"},…`
  - `src/client/03-settings-panels-main.js:1736` — `sources: [...sources, { id: 'gateway-' + Date.now().toString(36), type: 'cliproxyapi', label: 'CLIProxyAPI', baseURL: 'http://127.0.0.1:8317', enabled: false, d…`
  - `src/client/03-settings-panels-main.js:1736` — `gateway-cliproxyapiCLIProxyAPIhttp://127.0.0.1:8317both`
  - `test/custom-balance-ui.mjs:25` — `const entry = { enabled: true, unit: 'CREDITS', request: { url: 'http://127.0.0.1:3080/status' } }`
  - ……另有 13 处 / … and 13 more location(s)
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **高 / HIGH** `obf.decoded-payload-literal` — 携带解码、转义或高熵字面量 / Carries a decoded, escaped or high-entropy literal
  中 一个很长的字面量会在运行时被解码（base64、`atob`、`unescape`、`decodeURIComponent`），或者写满了密集的十六进制、Unicode 转义，或者呈现出编码数据块那种近乎均匀的字符分布。
  EN A long literal is decoded at runtime (base64, `atob`, `unescape`, `decodeURIComponent`), written with dense hex or unicode escapes, or has the near-uniform character distribution of an encoded blob.
  - `src/client/01-open-styles-i18n.js:291` — `'.cm-bal-link{flex:none;display:inline-flex;align-items:center;justify-content:center;padding:2px;border-radius:4px;font-size:12px;line-height:16px;color:var(--…`
  中 修复：把该值保存为可读源码，或保存为格式有文档说明的数据，让审查者能看清实际运行的到底是什么。
  EN Fix: Store the value as readable source or as data with a documented format, so a reviewer can see what is actually being run.
- **高 / HIGH** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `lib/index.js:182` — `legacyImportNone: 'No pre-install history to import (scanned {scanned} session logs; missing dates are empty or already imported).',`
  - `lib/repair-sessions-cli.js:27` — `try { Host = (await import(pathToFileURL(require.resolve('@deepseek-ai/dsh-session-persistence-jsonl')).href)).default }`
  - `test/host-compatibility-probe.mjs:25` — `const { Service } = await import(pathToFileURL(hostRequire.resolve('@deepseek-ai/cordis')).href)`
  - `test/market-hot-install.mjs:13` — `const imp = name => import(pathToFileURL(req.resolve(name)).href)`
  - ……另有 8 处 / … and 8 more location(s)
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.
- **高 / HIGH** `persist.global-self-install` — 全局安装依赖包 / Installs a package globally
  中 该命令把包安装到全局前缀，于是用户的 PATH 上多出一个可执行文件，而且当前项目删除后它仍然留在那里。
  EN The command installs a package into the global prefix, which puts a new executable on the user's PATH and keeps it there after the current project is deleted.
  - `.github/workflows/install-smoke.yml:22` — `npm install -g`
  - `.github/workflows/install-smoke.yml:50` — `npm install -g`
  - `.github/workflows/install-smoke.yml:79` — `npm install -g`
  - `.github/workflows/install-smoke.yml:83` — `npm install -g`
  - ……另有 4 处 / … and 4 more location(s)
  中 修复：改为本地安装，并通过项目自身的脚本调用该工具；全局安装应由用户自己决定，而不是由插件代劳。
  EN Fix: Install locally and invoke the tool through the project's own scripts; global installs belong to the user's decision, not to a plugin.

### 中 / MEDIUM (2)

- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `lib/client.js:6` — `http://127.0.0.1:8317`
  - `src/client/03-settings-panels-main.js:1736` — `http://127.0.0.1:8317`
  - `src/client/03-settings-panels-main.js:1736` — `http://127.0.0.1:8317both`
  - `test/custom-balance-ui.mjs:25` — `http://127.0.0.1:3080/status`
  - ……另有 18 处 / … and 18 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 18 shipped file(s) are 64 KiB or larger and were not read as text, the largest being docs/promo-combo.png at 489 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `docs/promo-combo.png` — `501231 bytes not decoded as text`
  - `lib/client.js:3` — ``),g=e(I,null,e("div",{className:"cm-mm-title"},i("codingPlanMinimaxTitle")),u.row,c.row),x=e(I,null,e("div",{className:"cm-bbox-rail cm-num"},u.label===null?"—…`
  - `lib/native-search-billing.js:80` — `const source = diagnostics(`undici:request:${name}`)`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (7)

- **低 / LOW** `cred.many-secret-env-vars` — 读取多个不同名称的密钥类环境变量 / Reads several differently-named secret environment variables
  中 这里的一行、或整个包里的若干行，读取了名称看起来像凭据的环境变量。只读一个文档中声明的 key 是插件本该有的认证方式；枚举多个不同名称的密钥，则是在收集凭据而不是在使用凭据。
  EN One line here, or several across the package, read environment variables whose names look like credentials. Reading a single documented key is how a plugin is meant to authenticate; enumerating many differently-named ones is how credentials are gathered rather than used.
  - `test/go-credentials.mjs:89` — `process.env.OPENCODE_GO_API_KEY`
  - `test/go-credentials.mjs:91` — `process.env.OPENCODE_GO_API_KEY`
  - `test/go-credentials.mjs:116` — `process.env.OPENCODE_API_KEY`
  - `test/go-credentials.mjs:119` — `process.env.OPENCODE_API_KEY`
  - ……另有 5 处 / … and 5 more location(s)
  中 修复：只保留插件确实需要且有文档说明的变量，删掉与任何功能无关的密钥读取。
  EN Fix: Keep to the variables this plugin documents and needs, and delete reads of keys it has no feature for.
- **低 / LOW** `harness.installed-package-edit` — 改动宿主安装目录或已安装的其他插件 / Touches the harness installation or another installed plugin
  中 该行读写宿主自身的安装目录，或 `node_modules` 下另一个插件的目录。修改已安装的代码会替换掉用户审查过的产物，并可能禁用或劫持任意插件。
  EN The line reads or writes inside the harness's own installation or another plugin's directory under `node_modules`. Editing installed code replaces the artifact the user reviewed and can disable or hijack any plugin.
  - `test/market-hot-install.mjs:30` — `symlinkSync(root, join(work, 'node_modules/dsh-cost-meter'), 'junction')`
  中 修复：绝不在运行时修改已安装的包；把改动提交到上游，或提供一个增量插件。
  EN Fix: Never modify installed packages at runtime; contribute the change upstream or ship an additive plugin.
- **低 / LOW** `net.token-or-blob-in-url` — 把凭据或编码数据块放进 URL / Puts a credential or encoded blob in a URL
  中 令牌形状的查询参数、内嵌的 `user:password` 授权部分，或超长高熵的查询值，都意味着密钥或载荷数据在 URL 中传输，最终会留在访问日志、代理和浏览器历史里。
  EN A token-shaped query parameter, an embedded `user:password` authority, or a long high-entropy query value means secret material or payload data travels in a URL, where it lands in access logs, proxies and browser history.
  - `test/minimax-endpoint.mjs:20` — `'https://quota.example/?key=PRIVATE'`
  - `test/minimax-endpoint.mjs:20` — `?key=PRIVATEhttps://quota.example/#xhttps://quota.example/?https://quota.example/..https://quota.example\\pathhttps://quo\nta.examplehttps://https://a`
  - `test/minimax-endpoint.mjs:20` — `?key=PRIVATE/https:/quota.example/#x/https:/quota.example/?/https:/quota.example/../https:/quota.example\\path/https:/quo\nta.example/https:/https:/a`
  - `test/verify.mjs:6308` — `'https://«redacted»@cpa.example.test'`
  中 修复：凭据放在 Authorization 头里发送，载荷用 POST 放在请求体中，不要编码进查询字符串。
  EN Fix: Send credentials in an Authorization header, and POST payloads in the body rather than encoding them into the query string.
- **低 / LOW** `obf.dynamic-code-eval` — 执行运行时拼装出来的代码 / Evaluates code built at runtime
  中 该行执行的是一个并非源码字面量的表达式，真正运行的代码在插件运行时才被拼装出来，无法在 tarball 中审查。
  EN The line evaluates an expression that is not a source literal, so the executed code is assembled while the plugin runs and cannot be reviewed in the tarball.
  - `test/billing-channel-peak.mjs:24` — `vm.runInNewContext(source.replace('exports.apply = apply', 'exports.test = { billingClassOfLocal, planProviderIdOfLocal, tierFor, costOfBuckets, resolveClientPr…`
  - `test/client-issues-127-129.mjs:44` — `vm.runInNewContext(source.replace('exports.apply = apply', `exports.test = { ${expose.join(', ')} }; exports.apply = apply`), {`
  - `test/custom-balance-ui.mjs:39` — `vm.runInNewContext(code, { window: { __ModuleLoader__: { load: value => { factory = value.factory } } }, navigator: { language: 'en' } })`
  - `test/deepseek-pricing-september.mjs:21` — `vm.runInNewContext(source.replace('exports.apply = apply', 'exports.test = { priceAt, tierFor, normalizeClientPrice, parseConfig, resolveClientPrice, makeT, Pri…`
  - ……另有 12 处 / … and 12 more location(s)
  中 修复：用静态函数或数据表替代动态求值；任何审计都无法为运行时才存在的代码背书。
  EN Fix: Replace the dynamic evaluation with a static function or a data table; there is no audit that can vouch for code that does not exist until runtime.
- **低 / LOW** `obf.long-minified-line` — 整行是压缩或机器生成的数据块 / Line is a single minified or machine-generated blob
  中 该行超过 500 个字符且几乎没有空白，正是打包载荷、压缩字符串表或机器生成单行代码的样子。这样的一行用肉眼什么也审不出来。
  EN The line is over 500 characters with almost no whitespace, which is what a bundled payload, a packed string table or a machine-generated one-liner looks like. Nothing on such a line is reviewable by eye.
  - `lib/client.js:3` — ``),g=e(I,null,e("div",{className:"cm-mm-title"},i("codingPlanMinimaxTitle")),u.row,c.row),x=e(I,null,e("div",{className:"cm-bbox-rail cm-num"},u.label===null?"—…`
  - `lib/client.js:4` — ``),f=e(I,null,e("div",{className:"cm-mm-title"},n("codexQuotaTitle")),u.row),b=e("div",{className:"cm-bbox-rail cm-num"},u.label===null?"—":u.label+"%");return …`
  - `test/sidebar-quota-hover.mjs:93` — `writeFileSync(new URL('../.tmp-sidebar-qa.html', import.meta.url), `<!doctype html><meta charset="utf-8"><title>侧栏布局验证</title><style>:root{--dsw-alias-bg-layer-…`
  - `test/sidebar-quota-hover.mjs:93` — `../.tmp-sidebar-qa.html<!doctype html><meta charset="utf-8"><title>侧栏布局验证</title><style>:root{--dsw-alias-bg-layer-2:#f2f4f8;--dsw-alias-label-primary:#182035;-…`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：发布未压缩的源码，或在 README 中说明该文件由哪个构建产出、可读源码在哪里。
  EN Fix: Ship unminified source, or state in the README which build produced the file and where the readable source lives.
- **低 / LOW** `obf.obfuscated-identifier` — 使用混淆的标识符或混用字符集的名称 / Uses obfuscated identifiers or mixed-script names
  中 该行出现了压缩器风格的 `_0x…` 名称，或混用拉丁字母与西里尔、希腊形近字母的标识符。两者都会让试图扫读熟悉名称的人看漏，后者更是经典的仿冒手法。
  EN The line contains minifier-style `_0x…` names or an identifier that mixes Latin letters with Cyrillic or Greek lookalikes. Both defeat a reader scanning for a familiar name and the second is a classic impersonation trick.
  - `test/verify.mjs:3997` — `Δtokens`
  - `test/verify.mjs:3998` — `Δt`
  - `test/verify.mjs:4003` — `Δtokens`
  中 修复：发布标识符名称有意义的源码，绝不在同一个标识符里混用不同字符集。
  EN Fix: Ship source with meaningful identifier names, and never mix script systems inside one identifier.
- **低 / LOW** `supply.packaging-constraints` — 清单内置依赖或限定平台 / Manifest bundles dependencies or pins platforms
  中 `bundledDependencies` 会把依赖的私有副本打进 tarball，使这部分代码绕过仓库的完整性元数据；而 `os`/`cpu` 数组则直接限制了包能安装在哪些机器上。
  EN `bundledDependencies` ships a private copy of dependencies inside the tarball, which bypasses the registry's integrity metadata for that code, and `os`/`cpu` arrays restrict which machines the package installs on at all.
  - `package.json:120` — `"os": [`
  中 修复：通过仓库配合锁文件发布依赖，并把平台限制写在 README 里，而不是写进 `os`/`cpu` 字段。
  EN Fix: Ship dependencies through the registry with a lockfile, and document platform limits in the README rather than in `os`/`cpu` fields.

_按类别 / By category:_ 混淆 / obfuscation 5 · 网络回调 / network callbacks 4 · 供应链 / supply chain 2 · 持久化 / persistence 1 · 凭据读取 / credential access 1 · 滥用宿主环境 / harness abuse 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `dsh-cost-meter-HEAD/`
- skipped docs/demo.gif: 896010 bytes exceeds the 524288-byte per-file cap
- skipped docs/promo.en.png: 1680185 bytes exceeds the 524288-byte per-file cap
- skipped docs/promo.png: 1663351 bytes exceeds the 524288-byte per-file cap
- not scanned (binary): docs/dock-display-settings-en.png, docs/dock-display-settings-zh.png, docs/peak-notice-en.png, docs/peak-notice-settings-en.png, docs/peak-notice-settings-zh.png and 56 more
- outbound fetching was permitted for this audit
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
