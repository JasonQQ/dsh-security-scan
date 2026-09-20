> 批量压测 / Batch stress test · ★ 2750 · `MeteorNOX/DeepSeek-Balance-Whale-Widget`
> https://github.com/MeteorNOX/DeepSeek-Balance-Whale-Widget · audited in 7.2s
# 安装前体检 / Pre-install audit: dsh-whale-widget@0.3.9

**信任评级 / Trust grade: D** (评分 / score 30/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/MeteorNOX/DeepSeek-Balance-Whale-Widget/tar.gz/HEAD` (URL / url)
- 已分析文件：20 个（1.5 MiB） / Files analysed: 20 (1.5 MiB)
- 内容摘要 / Content digest: `2bf4c6ff989b77f602df6cfd84fc8b6e…`
- 体检时间 / Audited at: 2026-09-20T09:51:58.198Z

## 最严重的风险 / Most severe risk

**包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts** `net.excessive-distinct-hosts`

中 它会建立出站连接，因此可以在你无法选择的时机接收指令或送出数据。
EN It opens an outbound connection, so it can receive instructions or send data at a moment you do not choose.

该包会访问的目标：`registry.npmjs.org`、`github.com`、`api.deepseek.com`、`openrouter.ai`、`api.siliconflow.cn`、`api.siliconflow.com`、`api.moonshot.cn`、`api.moonshot.ai` / Destinations this package reaches: `registry.npmjs.org`, `github.com`, `api.deepseek.com`, `openrouter.ai`, `api.siliconflow.cn`, `api.siliconflow.com`, `api.moonshot.cn`, `api.moonshot.ai`

- 中 它还安排了之后继续运行，所以仅仅卸载这个包并不够。
  EN It also arranges to run again later, so removing the package is not enough on its own.
- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `.github/workflows/publish.yml:35`；完整列表见下方「发现」。 / The rule that decided the grade fired at `.github/workflows/publish.yml:35`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `.before-recharge-fix.bak`, `.dshw-codex.json`
- **写入的文件路径 / File paths written:** `.before-recharge-fix.bak`, `.dshw-codex.json`, `.wav`
- **派生的命令 / Commands spawned:** （无） / (none)
- **连接的域名 / Domains contacted:** `registry.npmjs.org`, `github.com`, `api.deepseek.com`, `openrouter.ai`, `api.siliconflow.cn`, `api.siliconflow.com`, `api.moonshot.cn`, `api.moonshot.ai`, `api.stepfun.com`, `api.novita.ai`, `ark.cn-beijing.volces.com`, `open.bigmodel.cn` （另有 24 项） / (+24 more)
- **读取的环境变量 / Environment variables read:** `DSH_HOME`, `CODEX_HOME`

## 发现 / Findings

### 高 / HIGH (3)

- **高 / HIGH** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 34 distinct remote hosts (api.deepseek.com, api.moonshot.ai, api.moonshot.cn, api.siliconflow.cn, api.siliconflow.com, github.com, openrouter.ai, registry.npmjs.org, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `.github/workflows/publish.yml:35` — `https://registry.npmjs.org`
  - `.github/workflows/publish.yml:105` — `https://github.com/${GITHUB_REPOSITORY`
  - `lib/index.js:100` — `https://api.deepseek.com/user/balance`
  - `lib/index.js:104` — `https://openrouter.ai/api/v1/credits`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `lib/index.js:339` — `apiNote: '本地推理没有余额概念 → 余额「—」；填好 Base URL（如 http://127.0.0.1:11434/v1）后按会话事件统计 token',`
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **高 / HIGH** `persist.global-self-install` — 全局安装依赖包 / Installs a package globally
  中 该命令把包安装到全局前缀，于是用户的 PATH 上多出一个可执行文件，而且当前项目删除后它仍然留在那里。
  EN The command installs a package into the global prefix, which puts a new executable on the user's PATH and keeps it there after the current project is deleted.
  - `.github/workflows/publish.yml:39` — `npm install -g`
  中 修复：改为本地安装，并通过项目自身的脚本调用该工具；全局安装应由用户自己决定，而不是由插件代劳。
  EN Fix: Install locally and invoke the tool through the project's own scripts; global installs belong to the user's decision, not to a plugin.

### 中 / MEDIUM (2)

- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `lib/index.js:339` — `http://127.0.0.1:11434/v1）后按会话事件统计`
  - `lib/index.js:2641` — `http://localhostrefresh1`
  - `lib/index.js:2744` — `http://localhostmodelId`
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 5 shipped file(s) are 64 KiB or larger and were not read as text, the largest being assets/DSniang02.png at 456 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `assets/DSniang02.png` — `466452 bytes not decoded as text`
  - `lib/index.js:796` — `res = await fetch(BALANCE_URL, {`
  - `lib/index.js:1575` — `const res = await fetch(u, { headers, signal: AbortSignal.timeout(15000) })`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (1)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `.github/workflows/publish.yml:43` — `- name: Clean .npmrc for OIDC`
  - `.github/workflows/publish.yml:46` — `echo "Stripping _authToken from .npmrc for OIDC..."`
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.

_按类别 / By category:_ 网络回调 / network callbacks 3 · 持久化 / persistence 1 · 供应链 / supply chain 1 · 凭据读取 / credential access 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `DeepSeek-Balance-Whale-Widget-HEAD/`
- skipped assets/DSH2.png: 809921 bytes exceeds the 524288-byte per-file cap
- skipped assets/bubble-money1.gif: 2704365 bytes exceeds the 524288-byte per-file cap
- skipped assets/whale-widget.js: 717022 bytes exceeds the 524288-byte per-file cap
- not scanned (binary): assets/bubble-petpet.gif, assets/D1.mp3, assets/D2.mp3, assets/DSniang02.png, assets/DSniang1.png and 5 more
- outbound fetching was permitted for this audit
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
