> 批量压测 / Batch stress test · ★ 469 · `chenxiachan/thoughtdag#dsh`
> https://github.com/chenxiachan/thoughtdag/tree/main/dsh · audited in 26.5s
# 安装前体检 / Pre-install audit: dsh-thoughtdag@0.4.16

**信任评级 / Trust grade: D** (评分 / score 48/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

- 来源 / Source: `https://codeload.github.com/chenxiachan/thoughtdag/tar.gz/HEAD` (URL / url)
- 已分析文件：9 个（87.0 KiB） / Files analysed: 9 (87.0 KiB)
- 内容摘要 / Content digest: `fb6cbc0adcfab55dfef88b580f335fd8…`
- 体检时间 / Audited at: 2026-09-20T09:53:21.650Z

## 最严重的风险 / Most severe risk

**向裸 IP 地址发送请求 / Sends a request to a bare IP address** `net.raw-ip-destination`

中 它会建立出站连接，因此可以在你无法选择的时机接收指令或送出数据。
EN It opens an outbound connection, so it can receive instructions or send data at a moment you do not choose.

该包会访问的目标：`registry.npmjs.org`、`dsh.local`、`github.com`、`127.0.0.1` / Destinations this package reaches: `registry.npmjs.org`, `dsh.local`, `github.com`, `127.0.0.1`

- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.

决定该评级的规则命中于 `scripts/verify-write-bridge.mjs:7`；完整列表见下方「发现」。 / The rule that decided the grade fired at `scripts/verify-write-bridge.mjs:7`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

发布期钩子（维护者打包或发布时运行，安装时不会执行）： / Publish-time hooks (run when the maintainer packs or publishes, not on install):

- `prepack`: `npm run build`

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `node:fs/promises`, `package.json`
- **写入的文件路径 / File paths written:** （无） / (none)
- **派生的命令 / Commands spawned:** `node:child_process`, `node_modules/typescript/bin/tsc`, `-b`, `inherit`, `node_modules/vite/bin/vite.js`, `build`, `--base=/thoughtdag/`, `--outDir=`, `/thoughtdag/api`, `/thoughtdag`
- **连接的域名 / Domains contacted:** `registry.npmjs.org`, `dsh.local`, `github.com`, `127.0.0.1`
- **读取的环境变量 / Environment variables read:** `DSH_HOME`, `THOUGHTDAG_REPO`

## 发现 / Findings

### 高 / HIGH (2)

- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `scripts/verify-write-bridge.mjs:7` — `const B = 'http://127.0.0.1:3080/thoughtdag/api';`
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **高 / HIGH** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `lib/index.js:89` — `const PLUGIN_VERSION = (() => { try { return require(resolve(__dirname, '..', 'package.json')).version ?? null } catch { return null } })()`
  - `lib/index.js:104` — `const { createAgentsHttp } = require(resolve(__dirname, 'runtime', 'agents', 'http.cjs'))`
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.

### 中 / MEDIUM (2)

- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `scripts/verify-write-bridge.mjs:7` — `http://127.0.0.1:3080/thoughtdag/api`
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `obf.long-minified-line` — 整行是压缩或机器生成的数据块 / Line is a single minified or machine-generated blob
  中 该行超过 500 个字符且几乎没有空白，正是打包载荷、压缩字符串表或机器生成单行代码的样子。这样的一行用肉眼什么也审不出来。
  EN The line is over 500 characters with almost no whitespace, which is what a bundled payload, a packed string table or a machine-generated one-liner looks like. Nothing on such a line is reviewable by eye.
  - `lib/client.js:34` — `style.textContent = '.dsh-td-switch{display:inline-flex;gap:2px;border:1px solid #d1d5db;border-radius:999px;background:rgba(255,255,255,.96);padding:3px;backdr…`
  中 修复：发布未压缩的源码，或在 README 中说明该文件由哪个构建产出、可读源码在哪里。
  EN Fix: Ship unminified source, or state in the README which build produced the file and where the readable source lives.

### 低 / LOW (1)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `scripts/build.mjs:57` — `define: { 'import.meta.env': '{}' },`
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.

_按类别 / By category:_ 网络回调 / network callbacks 2 · 混淆 / obfuscation 2 · 凭据读取 / credential access 1

## 扫描说明 / Scan notes

- scoped to the subdirectory `dsh/`
- stripped the archive's single top-level directory `thoughtdag-HEAD/`
- outbound fetching was permitted for this audit
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
