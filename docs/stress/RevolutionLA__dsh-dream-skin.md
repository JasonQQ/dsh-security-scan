> 批量压测 / Batch stress test · ★ 177 · `RevolutionLA/dsh-dream-skin`
> https://github.com/RevolutionLA/dsh-dream-skin · audited in 9.1s
# 安装前体检 / Pre-install audit: dsh-dream-skin@9.16.0

**信任评级 / Trust grade: D** (评分 / score 43/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/RevolutionLA/dsh-dream-skin/tar.gz/HEAD` (URL / url)
- 已分析文件：66 个（2.4 MiB） / Files analysed: 66 (2.4 MiB)
- 内容摘要 / Content digest: `61080b293bdd3fbb1826c1a506013c52…`
- 体检时间 / Audited at: 2026-09-20T09:53:56.456Z

## 最严重的风险 / Most severe risk

**通过 sudo 提权 / Escalates with sudo** `priv.sudo-invocation`

中 它以超出任务所需的权限运行，因此它一旦出错，后果也更大。
EN It runs with more privilege than the task needs, so a mistake in it is larger than it should be.

该包会访问的目标：`github.com`、`www.w3.org`、`example.com`、`uapis.cn`、`${authority`、`${entry`、`registry.npmjs.org`、`api.npmjs.org` / Destinations this package reaches: `github.com`, `www.w3.org`, `example.com`, `uapis.cn`, `${authority`, `${entry`, `registry.npmjs.org`, `api.npmjs.org`

- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `.github/workflows/stats-chart.yml:39`；完整列表见下方「发现」。 / The rule that decided the grade fired at `.github/workflows/stats-chart.yml:39`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `node:fs/promises`, `client.js`, `../lib/client.js`
- **写入的文件路径 / File paths written:** `node:fs/promises`, `\n`
- **派生的命令 / Commands spawned:** （无） / (none)
- **连接的域名 / Domains contacted:** `github.com`, `www.w3.org`, `example.com`, `uapis.cn`, `${authority`, `${entry`, `registry.npmjs.org`, `api.npmjs.org`, `api.github.com`, `x`, `cdn.example.com`, `a.example.com` （另有 1 项） / (+1 more)
- **读取的环境变量 / Environment variables read:** `DSH_HOME`, `GITHUB_TOKEN`

## 发现 / Findings

### 高 / HIGH (1)

- **高 / HIGH** `priv.sudo-invocation` — 通过 sudo 提权 / Escalates with sudo
  中 该行通过 `sudo` 执行命令，意味着这个以用户级工具身份安装的插件在索要 root 权限，而用户事先看不到提权提示。
  EN The line runs a command through `sudo`, so the plugin is asking for root on a machine where it was installed as a user-level tool and where the user cannot see the escalation prompt in advance.
  - `.github/workflows/stats-chart.yml:39` — `run: sudo apt-get update && sudo apt-get install -y fonts-noto-cjk`
  中 修复：去掉提权，把任何需要特权的步骤写成一条由用户主动执行的独立命令并加以说明。
  EN Fix: Remove the escalation and document any privileged step as a separate command the user runs deliberately.

### 中 / MEDIUM (5)

- **中 / MEDIUM** `cred.many-secret-env-vars` — 读取多个不同名称的密钥类环境变量 / Reads several differently-named secret environment variables
  中 这里的一行、或整个包里的若干行，读取了名称看起来像凭据的环境变量。只读一个文档中声明的 key 是插件本该有的认证方式；枚举多个不同名称的密钥，则是在收集凭据而不是在使用凭据。
  EN One line here, or several across the package, read environment variables whose names look like credentials. Reading a single documented key is how a plugin is meant to authenticate; enumerating many differently-named ones is how credentials are gathered rather than used.
  - `scripts/collect-stats.mjs:36` — `process.env.GITHUB_TOKEN`
  中 修复：只保留插件确实需要且有文档说明的变量，删掉与任何功能无关的密钥读取。
  EN Fix: Keep to the variables this plugin documents and needs, and delete reads of keys it has no feature for.
- **中 / MEDIUM** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 13 distinct remote hosts (${authority, ${entry, api.npmjs.org, example.com, github.com, registry.npmjs.org, uapis.cn, www.w3.org, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `.github/ISSUE_TEMPLATE/config.yml:4` — `https://github.com/RevolutionLA/dsh-dream-skin/discussions`
  - `docs/stats.svg:2` — `http://www.w3.org/2000/svg`
  - `lib/client.js:3321` — `https://example.com/wall.jpg`
  - `lib/client.js:4419` — `https://uapis.cn/api/v1/image/bing-daily`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `lib/index.js:90` — `http://${authority`
  - `tests/client.persistence.test.cjs:43` — `http://x`
  - `tests/client.smoke.test.cjs:53` — `http://x`
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `supply.unpinned-range` — 依赖版本范围未固定 / Dependency range is unpinned
  中 该依赖接受任意版本（`*`、`x` 或 `latest`），明天安装到的就是仓库当时提供的代码，而经过审计的版本对它毫无保证。
  EN The dependency accepts any version (`*`, `x` or `latest`), so the code that installs tomorrow is whatever the registry serves then, and the audited version says nothing about it.
  - `package.json:85` — `"@deepseek-ai/dsh-client-store": "*",`
  中 修复：固定 semver 范围并提交锁文件，使安装解析到的正是被审查过的那些版本。
  EN Fix: Pin a semver range and commit a lockfile so an install resolves to the versions that were reviewed.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 14 shipped file(s) are 64 KiB or larger and were not read as text, the largest being wallpapers/巴伐利亚  迷人的日落  作者 Jonathan Besler.jpg at 270 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `wallpapers/巴伐利亚  迷人的日落  作者 Jonathan Besler.jpg` — `276815 bytes not decoded as text`
  - `lib/client.js:1235` — `await fetch(HOST_API, {`
  - `lib/client.js:1254` — `const res = await fetch(HOST_API, {`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (2)

- **低 / LOW** `obf.dynamic-code-eval` — 执行运行时拼装出来的代码 / Evaluates code built at runtime
  中 该行执行的是一个并非源码字面量的表达式，真正运行的代码在插件运行时才被拼装出来，无法在 tarball 中审查。
  EN The line evaluates an expression that is not a source literal, so the executed code is assembled while the plugin runs and cannot be reviewed in the tarball.
  - `tests/client.persistence.test.cjs:88` — `vm.runInContext(CODE + '\nwindow.__LOGGED__=1;', context);`
  - `tests/client.smoke.test.cjs:75` — `vm.runInContext(CODE + '\nwindow.__LOGGED__=1;', context);`
  中 修复：用静态函数或数据表替代动态求值；任何审计都无法为运行时才存在的代码背书。
  EN Fix: Replace the dynamic evaluation with a static function or a data table; there is no audit that can vouch for code that does not exist until runtime.
- **低 / LOW** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `lib/client.js:39` — `return require(name);`
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.

### 提示 / INFO (1)

- **提示 / INFO** `obf.long-minified-line` — 整行是压缩或机器生成的数据块 / Line is a single minified or machine-generated blob
  中 该行超过 500 个字符且几乎没有空白，正是打包载荷、压缩字符串表或机器生成单行代码的样子。这样的一行用肉眼什么也审不出来。
  EN The line is over 500 characters with almost no whitespace, which is what a bundled payload, a packed string table or a machine-generated one-liner looks like. Nothing on such a line is reviewable by eye.
  - `lib/client.js:5872` — `var mask = "%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20width%3D'24'%20height%3D'24'%20viewBox%3D'0%200%2024%2024'%20fill%3D'none'%20stroke%3D'bla…`
  中 修复：发布未压缩的源码，或在 README 中说明该文件由哪个构建产出、可读源码在哪里。
  EN Fix: Ship unminified source, or state in the README which build produced the file and where the readable source lives.

_按类别 / By category:_ 混淆 / obfuscation 3 · 网络回调 / network callbacks 2 · 供应链 / supply chain 2 · 提权 / privilege 1 · 凭据读取 / credential access 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `dsh-dream-skin-HEAD/`
- skipped docs/screenshots/preview.png: 1695622 bytes exceeds the 524288-byte per-file cap
- skipped docs/screenshots/settings.png: 785724 bytes exceeds the 524288-byte per-file cap
- skipped wallpapers/秋枫.jpg: 1233550 bytes exceeds the 524288-byte per-file cap
- not scanned (binary): docs/evidence/theme-roundtrip/bug-main-stale-liquid-glass-after-material-selection.jpeg, docs/evidence/theme-roundtrip/bug-material-selected-stale-liquid-glass.jpeg, docs/evidence/theme-roundtrip/bug-material-selected-stale-midnight.jpeg, docs/evidence/theme-roundtrip/fixed-material-after-midnight.jpeg, docs/previews/abyss.png and 10 more
- outbound fetching was permitted for this audit
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
