> 批量压测 / Batch stress test · ★ 202 · `zh667/TokenLedger`
> https://github.com/zh667/TokenLedger · audited in 2.6s
# 安装前体检 / Pre-install audit: dsh-tokenledger@0.1.1-blue.0

**信任评级 / Trust grade: D** (评分 / score 42/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

- 来源 / Source: `https://codeload.github.com/zh667/TokenLedger/tar.gz/HEAD` (URL / url)
- 已分析文件：69 个（1.1 MiB） / Files analysed: 69 (1.1 MiB)
- 内容摘要 / Content digest: `cbaece30e83b9ac2ab3e3e8acef16d90…`
- 体检时间 / Audited at: 2026-09-20T09:53:36.763Z

## 最严重的风险 / Most severe risk

**文档中包含针对模型的指令 / Documentation contains instructions aimed at a model** `prompt.doc-instruction`

中 它夹带了写给 agent 而不是写给人看的文字——试图在你不察觉的情况下改变 agent 行为的指令。
EN It carries text aimed at the agent rather than at a person — instructions that try to change what the agent does without telling you.

该包会访问的目标：`dsh-blue.dev`、`github.com`、`registry.npmjs.org`、`api.deepseek.com`、`api.z.ai`、`open.bigmodel.cn`、`localhost`、`localhostaccount` / Destinations this package reaches: `dsh-blue.dev`, `github.com`, `registry.npmjs.org`, `api.deepseek.com`, `api.z.ai`, `open.bigmodel.cn`, `localhost`, `localhostaccount`

- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 它还安排了之后继续运行，所以仅仅卸载这个包并不够。
  EN It also arranges to run again later, so removing the package is not enough on its own.

决定该评级的规则命中于 `docs/UI-PLAN.md:69`；完整列表见下方「发现」。 / The rule that decided the grade fired at `docs/UI-PLAN.md:69`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `../../blue.plugin.json`, `node:fs/promises`, `package.json`, `blue.plugin.json`, `cordis.patch.yml`, `README.md`, `.tgz`, `./fixtures/sub2api.json`, `../package.json`, `../cordis.patch.yml`, `../src/plugin.js`, `../README.md` （另有 2 项） / (+2 more)
- **写入的文件路径 / File paths written:** `package.json`
- **派生的命令 / Commands spawned:** `node:child_process`, `npm`, `pack`, `--json`, `--ignore-scripts`, `--pack-destination`, `utf8`, `--install`, `ignore`, `view`, `${name}@${version}`, `git` （另有 4 项） / (+4 more)
- **连接的域名 / Domains contacted:** `dsh-blue.dev`, `github.com`, `registry.npmjs.org`, `api.deepseek.com`, `api.z.ai`, `open.bigmodel.cn`, `localhost`, `localhostaccount`, `localhostforce`, `localhostorigin`, `relay.example.com`, `api.relay-one.example` （另有 44 项） / (+44 more)
- **读取的环境变量 / Environment variables read:** `BLUE_REPOSITORY`

## 发现 / Findings

### 高 / HIGH (2)

- **高 / HIGH** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 54 distinct remote hosts (api.deepseek.com, api.z.ai, dsh-blue.dev, github.com, localhostaccount, localhostforce, open.bigmodel.cn, registry.npmjs.org, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `blue.plugin.json:2` — `https://dsh-blue.dev/schema/blue.plugin.v1.schema.json`
  - `NOTICE:6` — `https://github.com/Ychris12138/dsh-usage-stats`
  - `package-lock.json:30` — `https://registry.npmjs.org/@deepseek-ai/cordis/-/cordis-4.0.2.tgz`
  - `package.json:9` — `https://github.com/zh667/TokenLedger.git`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **高 / HIGH** `prompt.doc-instruction` — 文档中包含针对模型的指令 / Documentation contains instructions aimed at a model
  中 随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。
  EN A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.
  - `docs/UI-PLAN.md:69` — `which means they **bypass the RPC trust boundary**, so the handler owns its own`
  中 修复：把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。
  EN Fix: Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.

### 中 / MEDIUM (2)

- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `src/http.js:135` — `http://localhostaccount`
  - `src/http.js:149` — `http://localhostforce`
  - `src/http.js:159` — `http://localhostorigin`
  - `test/balance.test.js:556` — `http://127.0.0.1:7801/v1`
  - ……另有 8 处 / … and 8 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 1 shipped file(s) are 64 KiB or larger and were not read as text, the largest being docs/images/panel.png at 154 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `docs/images/panel.png` — `158107 bytes not decoded as text`
  - `src/client.js:576` — `const response = await fetch(path, { headers: { accept: "application/json" }, signal });`
  - `src/client.js:1617` — `const response = await fetch(USERAUTH_PATH, {`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (4)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `src/balance.js:660` — `const refusal = spec.envelope?.(body);`
  - `test/balance.test.js:42` — `if (spec.envelope !== undefined) assert.equal(typeof spec.envelope, "function", name);`
  - `test/balance.test.js:977` — `assert.equal(SCHEMES[scheme].envelope, undefined, scheme);`
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `test/balance.test.js:556` — `a: { baseURL: "http://127.0.0.1:7801/v1" },`
  - `test/balance.test.js:557` — `b: { baseURL: "http://127.0.0.1:7802/v1" }`
  - `test/balance.test.js:560` — `{ softwareOf: new Map([["http://127.0.0.1:7801", "newapi"]]) }`
  - `test/balance.test.js:560` — `http://127.0.0.1:7801newapi`
  - ……另有 6 处 / … and 6 more location(s)
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **低 / LOW** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `test/blue-packed-fixture.mjs:327` — ``const plugin = await import(${JSON.stringify("dsh-tokenledger")})`,`
  - `test/packaging.test.js:82` — `const root = await import(new URL(`..${pkg.exports["."].slice(1)}`, import.meta.url));`
  - `test/packaging.test.js:189` — `const module = await import(new URL(`../${target.replace(/^\.\//, "")}`, import.meta.url));`
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.
- **低 / LOW** `persist.global-self-install` — 全局安装依赖包 / Installs a package globally
  中 该命令把包安装到全局前缀，于是用户的 PATH 上多出一个可执行文件，而且当前项目删除后它仍然留在那里。
  EN The command installs a package into the global prefix, which puts a new executable on the user's PATH and keeps it there after the current project is deleted.
  - `test/blue-packaging.test.js:43` — `npm install --global`
  中 修复：改为本地安装，并通过项目自身的脚本调用该工具；全局安装应由用户自己决定，而不是由插件代劳。
  EN Fix: Install locally and invoke the tool through the project's own scripts; global installs belong to the user's decision, not to a plugin.

_按类别 / By category:_ 网络回调 / network callbacks 3 · 提示注入 / prompt injection 1 · 供应链 / supply chain 1 · 凭据读取 / credential access 1 · 混淆 / obfuscation 1 · 持久化 / persistence 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `TokenLedger-HEAD/`
- not scanned (binary, contents unreadable as text): docs/images/panel.png
- outbound fetching was permitted for this audit
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
