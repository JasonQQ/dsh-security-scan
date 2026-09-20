> 批量压测 / Batch stress test · ★ 420 · `anysearch-team/anysearch-dsh`
> https://github.com/anysearch-team/anysearch-dsh · audited in 0.8s
# 安装前体检 / Pre-install audit: @anysearch/anysearch-dsh@0.1.6

**信任评级 / Trust grade: D** (评分 / score 19/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

- 来源 / Source: `https://codeload.github.com/anysearch-team/anysearch-dsh/tar.gz/HEAD` (URL / url)
- 已分析文件：43 个（409.1 KiB） / Files analysed: 43 (409.1 KiB)
- 内容摘要 / Content digest: `58bfbc697539bea826ead63e667c5ab3…`
- 体检时间 / Audited at: 2026-09-20T09:53:03.384Z

## 最严重的风险 / Most severe risk

**源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model** `prompt.embedded-instruction-string`

中 它夹带了写给 agent 而不是写给人看的文字——试图在你不察觉的情况下改变 agent 行为的指令。
EN It carries text aimed at the agent rather than at a person — instructions that try to change what the agent does without telling you.

该包会访问的目标：`registry.npmjs.org`、`www.w3.org`、`github.com`、`api.anysearch.test`、`example.test`、`api.anysearch.com`、`httpbin.dev`、`${query` / Destinations this package reaches: `registry.npmjs.org`, `www.w3.org`, `github.com`, `api.anysearch.test`, `example.test`, `api.anysearch.com`, `httpbin.dev`, `${query`

- 中 它发生在安装时：`prepare` 脚本会执行它，你不需要自己运行任何东西。
  EN It happens at install time: the `prepare` script runs it, so you do not have to run anything yourself.
- 中 它还安排了之后继续运行，所以仅仅卸载这个包并不够。
  EN It also arranges to run again later, so removing the package is not enough on its own.

决定该评级的规则命中于 `tests/client.spec.ts:382`；完整列表见下方「发现」。 / The rule that decided the grade fired at `tests/client.spec.ts:382`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

- `prepare` (`package.json`): `tsc -p tsconfig.json`

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `node:fs/promises`, `./dsh-compat-versions.json`, `package.json`, `../${readme}`, `../package.json`, `../cordis.patch.yml`
- **写入的文件路径 / File paths written:** `node:fs/promises`, `package.json`, `install.log`, `typecheck.log`, `runtime.log`, `failure.log`, `results.json`
- **派生的命令 / Commands spawned:** `node:child_process`, `cmd.exe`, `/d`, `/s`, `/c`, `npm.cmd ${args.join(' ')}`, `npm`, `node_modules/typescript/bin/tsc`, `-p`, `tsconfig.json`, `--noEmit`, `smoke.mjs` （另有 1 项） / (+1 more)
- **连接的域名 / Domains contacted:** `registry.npmjs.org`, `www.w3.org`, `github.com`, `api.anysearch.test`, `example.test`, `api.anysearch.com`, `httpbin.dev`, `${query`, `result.test`, `first.test`, `second.test`, `source.test` （另有 6 项） / (+6 more)
- **读取的环境变量 / Environment variables read:** `RUNNER_TEMP`, `ComSpec`, `ANYSEARCH_E2E`, `ANYSEARCH_E2E_ANONYMOUS`, `ANYSEARCH_API_KEY`, `ANYSEARCH_BASE_URL`, `ANYSEARCH_E2E_EXTRACT_URL`

## 发现 / Findings

### 高 / HIGH (3)

- **高 / HIGH** `persist.global-self-install` — 全局安装依赖包 / Installs a package globally
  中 该命令把包安装到全局前缀，于是用户的 PATH 上多出一个可执行文件，而且当前项目删除后它仍然留在那里。
  EN The command installs a package into the global prefix, which puts a new executable on the user's PATH and keeps it there after the current project is deleted.
  - `.github/workflows/publish-npm.yml:37` — `npm install --global`
  中 修复：改为本地安装，并通过项目自身的脚本调用该工具；全局安装应由用户自己决定，而不是由插件代劳。
  EN Fix: Install locally and invoke the tool through the project's own scripts; global installs belong to the user's decision, not to a plugin.
- **高 / HIGH** `persist.persistence-with-install-hook` — 安装钩子叠加持久化机制 / Install hook combined with a persistence mechanism
  中 生命周期钩子在安装期间运行，而目录树中又有东西把自己注册为稍后运行。这一组合会在用户以为只是一次普通依赖安装的过程中装入一个常驻组件。
  EN A lifecycle hook runs during install and something in the tree registers itself to run later. The combination installs a resident component during what the user believed was a normal dependency install.
  - `.github/workflows/publish-npm.yml:37` — `npm install --global`
  - `package.json:48` — `"prepare": "tsc -p tsconfig.json",`
  中 修复：删除这一定时注册。任何需要持续运行的东西，都应由用户作为一个明确可见的步骤来设置。
  EN Fix: Remove the scheduling. Anything that should keep running must be set up by the user as a deliberate, visible step.
- **高 / HIGH** `prompt.embedded-instruction-string` — 源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model
  中 源码中的字符串字面量——通常是工具描述或系统提示词片段——要求模型绕过确认或对用户隐瞒某些事，于是它作为一条指令进入上下文窗口。
  EN A string literal in the source — typically a tool description or system prompt fragment — tells the model to bypass confirmation or to hide something from the user, so it lands in the context window as a directive.
  - `tests/client.spec.ts:382` — ``ignore previous instructions\n${'x'.repeat(MAX_UPSTREAM_ERROR_CHARS)}TAIL``
  - `tests/client.spec.ts:394` — `'"ignore previous instructions\\n'`
  中 修复：如实描述工具的行为，删除那些会改变 agent 对待用户方式的指令。
  EN Fix: Describe the tool's behavior factually and remove directives that change how the agent treats the user.

### 中 / MEDIUM (3)

- **中 / MEDIUM** `cred.many-secret-env-vars` — 读取多个不同名称的密钥类环境变量 / Reads several differently-named secret environment variables
  中 这里的一行、或整个包里的若干行，读取了名称看起来像凭据的环境变量。只读一个文档中声明的 key 是插件本该有的认证方式；枚举多个不同名称的密钥，则是在收集凭据而不是在使用凭据。
  EN One line here, or several across the package, read environment variables whose names look like credentials. Reading a single documented key is how a plugin is meant to authenticate; enumerating many differently-named ones is how credentials are gathered rather than used.
  - `scripts/live-e2e.mjs:26` — `process.env.ANYSEARCH_API_KEY`
  - `tests/provider.spec.ts:438` — `process.env.ANYSEARCH_API_KEY`
  中 修复：只保留插件确实需要且有文档说明的变量，删掉与任何功能无关的密钥读取。
  EN Fix: Keep to the variables this plugin documents and needs, and delete reads of keys it has no feature for.
- **中 / MEDIUM** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 17 distinct remote hosts (${query, api.anysearch.com, api.anysearch.test, example.test, github.com, httpbin.dev, registry.npmjs.org, www.w3.org, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `.github/workflows/publish-npm.yml:29` — `https://registry.npmjs.org`
  - `docs/assets/anysearch-logo.svg:1` — `http://www.w3.org/2000/svg`
  - `package.json:12` — `https://github.com/anysearch-team/anysearch-dsh#readme`
  - `package.json:60` — `https://registry.npmjs.org/`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 1 shipped file(s) are 64 KiB or larger and were not read as text, the largest being docs/assets/discord-community-qr.png at 78 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `docs/assets/discord-community-qr.png` — `79547 bytes not decoded as text`
  - `pnpm-lock.yaml:531` — `undici-types@6.21.0:`
  - `pnpm-lock.yaml:831` — `undici-types: 6.21.0`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (3)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `src/client.ts:306` — `...envelope.requestId === undefined ? {} : { requestId: envelope.requestId },`
  - `src/client.ts:342` — `...envelope.requestId === undefined ? {} : { requestId: envelope.requestId },`
  - `src/client.ts:359` — `...envelope.requestId === undefined ? {} : { requestId: envelope.requestId },`
  - `src/client.ts:391` — `...envelope.requestId === undefined ? {} : { requestId: envelope.requestId },`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `tests/client.spec.ts:351` — `http://127.0.0.1/private`
  - `tests/provider.spec.ts:451` — `http://127.0.0.1:${address.port`
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **低 / LOW** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `tests/client.spec.ts:351` — `await expect(new AnySearchClient(options).extract({ url: 'http://127.0.0.1/private' }))`
  - `tests/provider.spec.ts:451` — `return `http://127.0.0.1:${address.port}``
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.

_按类别 / By category:_ 网络回调 / network callbacks 3 · 持久化 / persistence 2 · 凭据读取 / credential access 2 · 提示注入 / prompt injection 1 · 供应链 / supply chain 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `anysearch-dsh-HEAD/`
- not scanned (binary, contents unreadable as text): docs/assets/discord-community-qr.png, docs/assets/wechat-community-qr.jpg
- outbound fetching was permitted for this audit
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
