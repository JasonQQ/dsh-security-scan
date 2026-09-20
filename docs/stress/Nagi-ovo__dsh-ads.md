> 批量压测 / Batch stress test · ★ 628 · `Nagi-ovo/dsh-ads`
> https://github.com/Nagi-ovo/dsh-ads · audited in 4.9s
# 安装前体检 / Pre-install audit: @nagi-ovo/dsh-ads@0.1.0

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/Nagi-ovo/dsh-ads/tar.gz/HEAD` (URL / url)
- 已分析文件：112 个（3.3 MiB） / Files analysed: 112 (3.3 MiB)
- 内容摘要 / Content digest: `ed938bd7bcef56113f00ad4e243e6ddb…`
- 体检时间 / Audited at: 2026-09-20T09:52:42.133Z

## 最严重的风险 / Most severe risk

**同一个包内既有环境变量收集又有对外请求 / Environment harvest and an outbound request in the same package** `exfil.environment-harvest-then-callback`

中 数据会离开这台机器。该包中有代码把本机上的内容发往外部地址。
EN Data leaves this machine. Something in this package takes content that lives here and sends it to a destination outside it.

该包会访问的目标：`github.com`、`api.github.com`、`www.w3.org`、`gitlab.com` / Destinations this package reaches: `github.com`, `api.github.com`, `www.w3.org`, `gitlab.com`

- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `tsdown.config.ts:49`；完整列表见下方「发现」。 / The rule that decided the grade fired at `tsdown.config.ts:49`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

发布期钩子（维护者打包或发布时运行，安装时不会执行）： / Publish-time hooks (run when the maintainer packs or publishes, not on install):

- `prepublishOnly`: `pnpm run build`

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `node:fs/promises`, `jackpot-orca-original.png`, `../README.md`, `../README.en.md`, `../${asset}`
- **写入的文件路径 / File paths written:** `node:fs/promises`
- **派生的命令 / Commands spawned:** `node:child_process`, `gh`, `magick`, `identify`, `-format`, `%w %h`, `${join(abs, file)}[0]`, `utf8`, `${join(dir, spec.image)}[0]`, `rsvg-convert`, `--width`, `--height` （另有 10 项） / (+10 more)
- **连接的域名 / Domains contacted:** `github.com`, `api.github.com`, `www.w3.org`, `gitlab.com`
- **读取的环境变量 / Environment variables read:** `GITHUB_TOKEN`, `GH_TOKEN`, `DSH_ADS_EN_SOURCES`, `NODE_ENV`

## 发现 / Findings

### 严重 / CRITICAL (1)

- **严重 / CRITICAL** `exfil.environment-harvest-then-callback` — 同一个包内既有环境变量收集又有对外请求 / Environment harvest and an outbound request in the same package
  中 该包读取或整体导出进程环境变量，同时又建立对外连接。CI 运行器和宿主会话都会把 API Key 导出到环境变量中，因此这一组合会把仍有效的凭据送出本机。
  EN The package reads or dumps process environment values and also opens outbound connections. CI runners and harness sessions export API keys into the environment, so this combination sends working credentials off the machine.
  - `tsdown.config.ts:49` — `JSON.stringify(process.env`
  - `lib/index.js:1779` — `const response = await fetch(url, {`
  - `lib/index.js:1907` — `return classifyStarStatus((await fetch(`https://api.github.com/user/starred/${repo}`, { headers: {`
  - `pnpm-lock.yaml:1869` — `undici-types@6.21.0:`
  中 修复：删除环境变量的整体导出，只逐个读取插件确实需要、且有文档说明的变量。
  EN Fix: Remove the environment dump, and read only individually documented variables that the plugin actually needs.

### 高 / HIGH (2)

- **高 / HIGH** `cred.env-harvest` — 读取或整体导出进程环境变量 / Reads or dumps the process environment
  中 该行把整个环境当成一个值取走——序列化、遍历或打印它，而不是只取自己需要的那一个变量。CI 运行器和宿主都会把 API Key 导出到环境变量里，因此整体导出就是一次凭据收集。
  EN The line takes the whole environment as a value — serializing it, iterating it, or printing it — rather than the one variable it needs. CI runners and the harness export API keys into the environment, so a dump is a credential harvest.
  - `tsdown.config.ts:49` — `JSON.stringify(process.env`
  中 修复：只逐个读取插件文档中声明过的变量，绝不序列化整个环境对象，也不要把它写进日志或请求。
  EN Fix: Read only the variables the plugin documents, one at a time, and never serialize the environment object or forward it into a log or request.
- **高 / HIGH** `net.token-or-blob-in-url` — 把凭据或编码数据块放进 URL / Puts a credential or encoded blob in a URL
  中 令牌形状的查询参数、内嵌的 `user:password` 授权部分，或超长高熵的查询值，都意味着密钥或载荷数据在 URL 中传输，最终会留在访问日志、代理和浏览器历史里。
  EN A token-shaped query parameter, an embedded `user:password` authority, or a long high-entropy query value means secret material or payload data travels in a URL, where it lands in access logs, proxies and browser history.
  - `lib/index.js:603` — `"DSH WebUI 深链插件：?session=/?workspace= 直接打开指定项目对话"`
  - `src/catalog-snapshot.ts:631` — `"DSH WebUI 深链插件：?session=/?workspace= 直接打开指定项目对话"`
  中 修复：凭据放在 Authorization 头里发送，载荷用 POST 放在请求体中，不要编码进查询字符串。
  EN Fix: Send credentials in an Authorization header, and POST payloads in the body rather than encoding them into the query string.

### 中 / MEDIUM (3)

- **中 / MEDIUM** `cred.many-secret-env-vars` — 读取多个不同名称的密钥类环境变量 / Reads several differently-named secret environment variables
  中 这里的一行、或整个包里的若干行，读取了名称看起来像凭据的环境变量。只读一个文档中声明的 key 是插件本该有的认证方式；枚举多个不同名称的密钥，则是在收集凭据而不是在使用凭据。
  EN One line here, or several across the package, read environment variables whose names look like credentials. Reading a single documented key is how a plugin is meant to authenticate; enumerating many differently-named ones is how credentials are gathered rather than used.
  - `lib/index.js:1805` — `process.env.GITHUB_TOKEN`
  - `lib/index.js:1805` — `process.env.GH_TOKEN`
  - `lib/index.js:1923` — `process.env.GITHUB_TOKEN`
  - `lib/index.js:1923` — `process.env.GH_TOKEN`
  - ……另有 4 处 / … and 4 more location(s)
  中 修复：只保留插件确实需要且有文档说明的变量，删掉与任何功能无关的密钥读取。
  EN Fix: Keep to the variables this plugin documents and needs, and delete reads of keys it has no feature for.
- **中 / MEDIUM** `install.hook-runs-shell-code` — 安装期钩子执行的不只是构建 / Lifecycle hook runs more than a build
  中 该钩子命令不属于常见的编译与拷贝步骤，安装这个包时会以用户权限运行任意代码，而这一切发生在任何人来得及检查之前。
  EN This hook command is not one of the usual compile-and-copy steps, so installing the package runs arbitrary code with the user's privileges before anything can be inspected.
  - `package.json:31` — `"prepublishOnly": "pnpm run build"`
  中 修复：把钩子收敛为 `tsc` 或 `npm run build` 之类的构建命令，或把这项工作移到一个由用户主动执行的显式脚本里。
  EN Fix: Reduce the hook to a build command such as `tsc` or `npm run build`, or move the work into an explicit script the user chooses to run.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 13 shipped file(s) are 64 KiB or larger and were not read as text, the largest being assets/social-preview.jpg at 307 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `assets/social-preview.jpg` — `314657 bytes not decoded as text`
  - `lib/index.js:1779` — `const response = await fetch(url, {`
  - `lib/index.js:1907` — `return classifyStarStatus((await fetch(`https://api.github.com/user/starred/${repo}`, { headers: {`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

_按类别 / By category:_ 凭据读取 / credential access 2 · 数据外传 / exfiltration 1 · 网络回调 / network callbacks 1 · 安装脚本 / install scripts 1 · 供应链 / supply chain 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `dsh-ads-HEAD/`
- skipped assets/en/posters/poster-fail-game.mp4: 783502 bytes exceeds the 524288-byte per-file cap
- skipped assets/poster-blue-whale-small.gif: 3641837 bytes exceeds the 524288-byte per-file cap
- skipped assets/posters/poster-blue-whale-harness.webp: 1127150 bytes exceeds the 524288-byte per-file cap
- skipped assets/posters/poster-blue-whale.mp4: 571653 bytes exceeds the 524288-byte per-file cap
- skipped assets/posters/poster-blue-whale.webp: 974544 bytes exceeds the 524288-byte per-file cap
- skipped assets/visualize-demo.mp4: 525076 bytes exceeds the 524288-byte per-file cap
- skipped lib/client.js: 7030021 bytes exceeds the 524288-byte per-file cap
- skipped src/client/builtin-ads.ts: 6830867 bytes exceeds the 524288-byte per-file cap
- not scanned (binary): assets/ads/flat-fable.webp, assets/ads/fluor-sft.webp, assets/ads/gpu-4090.webp, assets/ads/neon-token.webp, assets/ads/ruyi-v4pro.webp and 33 more
- outbound fetching was permitted for this audit
- grade forced to D by a critical finding: exfil.environment-harvest-then-callback — Environment harvest and an outbound request in the same package
- ……另有 1 项 / … and 1 more

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
