> 批量压测 / Batch stress test · ★ 262 · `Nagi-ovo/dsh-visualize`
> https://github.com/Nagi-ovo/dsh-visualize · audited in 3.2s
# 安装前体检 / Pre-install audit: @nagi-ovo/dsh-visualize@0.1.2

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/Nagi-ovo/dsh-visualize/tar.gz/HEAD` (URL / url)
- 已分析文件：35 个（737.1 KiB） / Files analysed: 35 (737.1 KiB)
- 内容摘要 / Content digest: `84a68ae1baaac5a66da3600ba12491de…`
- 体检时间 / Audited at: 2026-09-20T09:53:31.039Z

## 最严重的风险 / Most severe risk

**同一个包内既有环境变量收集又有对外请求 / Environment harvest and an outbound request in the same package** `exfil.environment-harvest-then-callback`

中 数据会离开这台机器。该包中有代码把本机上的内容发往外部地址。
EN Data leaves this machine. Something in this package takes content that lives here and sends it to a destination outside it.

该包会访问的目标：`cdn.jsdelivr.net`、`cdnjs.cloudflare.com`、`esm.sh`、`fonts.bunny.net`、`fonts.googleapis.com`、`fonts.gstatic.com`、`unpkg.com`、`github.com` / Destinations this package reaches: `cdn.jsdelivr.net`, `cdnjs.cloudflare.com`, `esm.sh`, `fonts.bunny.net`, `fonts.googleapis.com`, `fonts.gstatic.com`, `unpkg.com`, `github.com`

- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `tsdown.config.ts:54`；完整列表见下方「发现」。 / The rule that decided the grade fired at `tsdown.config.ts:54`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

发布期钩子（维护者打包或发布时运行，安装时不会执行）： / Publish-time hooks (run when the maintainer packs or publishes, not on install):

- `prepublishOnly`: `pnpm run build`

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `node:fs/promises`
- **写入的文件路径 / File paths written:** （无） / (none)
- **派生的命令 / Commands spawned:** （无） / (none)
- **连接的域名 / Domains contacted:** `cdn.jsdelivr.net`, `cdnjs.cloudflare.com`, `esm.sh`, `fonts.bunny.net`, `fonts.googleapis.com`, `fonts.gstatic.com`, `unpkg.com`, `github.com`
- **读取的环境变量 / Environment variables read:** `NODE_ENV`

## 发现 / Findings

### 严重 / CRITICAL (1)

- **严重 / CRITICAL** `exfil.environment-harvest-then-callback` — 同一个包内既有环境变量收集又有对外请求 / Environment harvest and an outbound request in the same package
  中 该包读取或整体导出进程环境变量，同时又建立对外连接。CI 运行器和宿主会话都会把 API Key 导出到环境变量中，因此这一组合会把仍有效的凭据送出本机。
  EN The package reads or dumps process environment values and also opens outbound connections. CI runners and harness sessions export API keys into the environment, so this combination sends working credentials off the machine.
  - `tsdown.config.ts:54` — `JSON.stringify(process.env`
  - `pnpm-lock.yaml:1408` — `undici-types@6.21.0:`
  - `pnpm-lock.yaml:2352` — `undici-types: 6.21.0`
  - `pnpm-lock.yaml:2715` — `undici-types@6.21.0: {}`
  中 修复：删除环境变量的整体导出，只逐个读取插件确实需要、且有文档说明的变量。
  EN Fix: Remove the environment dump, and read only individually documented variables that the plugin actually needs.

### 高 / HIGH (1)

- **高 / HIGH** `cred.env-harvest` — 读取或整体导出进程环境变量 / Reads or dumps the process environment
  中 该行把整个环境当成一个值取走——序列化、遍历或打印它，而不是只取自己需要的那一个变量。CI 运行器和宿主都会把 API Key 导出到环境变量里，因此整体导出就是一次凭据收集。
  EN The line takes the whole environment as a value — serializing it, iterating it, or printing it — rather than the one variable it needs. CI runners and the harness export API keys into the environment, so a dump is a credential harvest.
  - `tsdown.config.ts:54` — `JSON.stringify(process.env`
  中 修复：只逐个读取插件文档中声明过的变量，绝不序列化整个环境对象，也不要把它写进日志或请求。
  EN Fix: Read only the variables the plugin documents, one at a time, and never serialize the environment object or forward it into a log or request.

### 中 / MEDIUM (2)

- **中 / MEDIUM** `install.hook-runs-shell-code` — 安装期钩子执行的不只是构建 / Lifecycle hook runs more than a build
  中 该钩子命令不属于常见的编译与拷贝步骤，安装这个包时会以用户权限运行任意代码，而这一切发生在任何人来得及检查之前。
  EN This hook command is not one of the usual compile-and-copy steps, so installing the package runs arbitrary code with the user's privileges before anything can be inspected.
  - `package.json:28` — `"prepublishOnly": "pnpm run build"`
  中 修复：把钩子收敛为 `tsc` 或 `npm run build` 之类的构建命令，或把这项工作移到一个由用户主动执行的显式脚本里。
  EN Fix: Reduce the hook to a build command such as `tsc` or `npm run build`, or move the work into an explicit script the user chooses to run.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 2 shipped file(s) are 64 KiB or larger and were not read as text, the largest being assets/social-preview.jpg at 241 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `assets/social-preview.jpg` — `247264 bytes not decoded as text`
  - `pnpm-lock.yaml:1408` — `undici-types@6.21.0:`
  - `pnpm-lock.yaml:2352` — `undici-types: 6.21.0`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

_按类别 / By category:_ 数据外传 / exfiltration 1 · 凭据读取 / credential access 1 · 安装脚本 / install scripts 1 · 供应链 / supply chain 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `dsh-visualize-HEAD/`
- skipped assets/demo.mp4: 525076 bytes exceeds the 524288-byte per-file cap
- not scanned (binary, contents unreadable as text): assets/demo.webp, assets/social-preview.jpg
- outbound fetching was permitted for this audit
- grade forced to D by a critical finding: exfil.environment-harvest-then-callback — Environment harvest and an outbound request in the same package
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
