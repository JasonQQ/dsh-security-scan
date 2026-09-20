> 批量压测 / Batch stress test · ★ 326 · `shengsheng90/DSH-taskboard`
> https://github.com/shengsheng90/DSH-taskboard · audited in 0.8s
# 安装前体检 / Pre-install audit: @shengsheng/dsh-taskboard@0.1.6

**信任评级 / Trust grade: D** (评分 / score 10/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

- 来源 / Source: `https://codeload.github.com/shengsheng90/DSH-taskboard/tar.gz/HEAD` (URL / url)
- 已分析文件：86 个（1.7 MiB） / Files analysed: 86 (1.7 MiB)
- 内容摘要 / Content digest: `abb0523c438bc33cc85d846bfe9760fc…`
- 体检时间 / Audited at: 2026-09-20T09:53:18.735Z

## 最严重的风险 / Most severe risk

**文档中包含针对模型的指令 / Documentation contains instructions aimed at a model** `prompt.doc-instruction`

中 它夹带了写给 agent 而不是写给人看的文字——试图在你不察觉的情况下改变 agent 行为的指令。
EN It carries text aimed at the agent rather than at a person — instructions that try to change what the agent does without telling you.

该包会访问的目标：`www.apache.org`、`127.0.0.1:$port`、`www.w3.org`、`taskboard.invalid`、`example.com`、`safe.example` / Destinations this package reaches: `www.apache.org`, `127.0.0.1:$port`, `www.w3.org`, `taskboard.invalid`, `example.com`, `safe.example`

- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.

决定该评级的规则命中于 `skills/manage-taskboard/SKILL.md:33`；完整列表见下方「发现」。 / The rule that decided the grade fired at `skills/manage-taskboard/SKILL.md:33`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `/proc/$pid/cwd`, `node:fs/promises`, `tsconfig.json`, `.dsh`, `.dsh/taskboard.sqlite`, `.dsh/.gitignore`, `.blob`
- **写入的文件路径 / File paths written:** `node:fs/promises`, `tsconfig.host.json`, `tsconfig.base.json`, `tsconfig.json`, `.git`, `.dsh`, `.dsh/.gitignore`
- **派生的命令 / Commands spawned:** （无） / (none)
- **连接的域名 / Domains contacted:** `www.apache.org`, `127.0.0.1:$port`, `www.w3.org`, `taskboard.invalid`, `example.com`, `safe.example`
- **读取的环境变量 / Environment variables read:** `DSH_TASKBOARD_DATABASE`, `DSH_TASKBOARD_ATTACHMENTS`, `KEEP_TYPERT_WORKSPACE`, `DSH_HARNESS_ROOT`, `DSH_TASKBOARD_ATTACHMENT_ROOT`, `DSH_TASKBOARD_ALLOWED_CONTENT_TYPES`, `DSH_HOME`

## 发现 / Findings

### 高 / HIGH (3)

- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `restart-harness.sh:103` — `if curl -sf "http://127.0.0.1:$PORT/" >/dev/null 2>&1; then UP=1; break; fi`
  - `restart-harness.sh:113` — `if curl -s "http://127.0.0.1:$PORT/" | grep -q "$PLUGIN"; then FOUND=1; break; fi`
  - `restart-harness.sh:117` — `echo "bundle http: $(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/plugins/$PLUGIN/client.js")"`
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **高 / HIGH** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `scripts/generate-typert.mjs:106` — `const { WorkspaceTypertGenerator } = await import(pathToFileURL(generatorPath).href)`
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.
- **高 / HIGH** `prompt.doc-instruction` — 文档中包含针对模型的指令 / Documentation contains instructions aimed at a model
  中 随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。
  EN A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.
  - `skills/manage-taskboard/SKILL.md:33` — `Do not bypass service policy with direct SQLite access, browser-side file access, generic status mutation, or prompt-only assumptions. The SQLite Provider and H…`
  中 修复：把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。
  EN Fix: Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.

### 中 / MEDIUM (4)

- **中 / MEDIUM** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `src/client/index.tsx:1615` — `slots.inject('shell.overlay', () => slots.register({ name: 'shell.overlay', id: 'taskboard.page' }, Page))`
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `restart-harness.sh:103` — `http://127.0.0.1:$PORT/`
  - `restart-harness.sh:113` — `http://127.0.0.1:$PORT/`
  - `restart-harness.sh:117` — `http://127.0.0.1:$PORT/plugins/$PLUGIN/client.js`
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `obf.long-minified-line` — 整行是压缩或机器生成的数据块 / Line is a single minified or machine-generated blob
  中 该行超过 500 个字符且几乎没有空白，正是打包载荷、压缩字符串表或机器生成单行代码的样子。这样的一行用肉眼什么也审不出来。
  EN The line is over 500 characters with almost no whitespace, which is what a bundled payload, a packed string table or a machine-generated one-liner looks like. Nothing on such a line is reviewable by eye.
  - `src/client/index.tsx:277` — `.dsh-taskboard-nav{-webkit-appearance:none;appearance:none;flex:none;display:flex;align-items:center;gap:8px;width:calc(100% + 8px);height:34px;margin:4px -4px;…`
  - `src/client/index.tsx:776` — `return <><div className="dsh-taskboard-dashboard">{(['todo', 'in_progress', 'in_review', 'blocked'] as const).map(status => <div key={status}><strong>{counts[st…`
  中 修复：发布未压缩的源码，或在 README 中说明该文件由哪个构建产出、可读源码在哪里。
  EN Fix: Ship unminified source, or state in the README which build produced the file and where the readable source lives.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 3 shipped file(s) are 64 KiB or larger and were not read as text, the largest being docs/assets/taskboard-demo.gif at 351 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `docs/assets/taskboard-demo.gif` — `359497 bytes not decoded as text`
  - `pnpm-lock.yaml:1312` — `undici-types@6.21.0:`
  - `pnpm-lock.yaml:2048` — `undici-types: 6.21.0`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (1)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `tests/markdown.spec.ts:56` — `assert.equal(sanitizeMarkdownUrl('/etc/passwd'), undefined)`
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.

_按类别 / By category:_ 网络回调 / network callbacks 2 · 混淆 / obfuscation 2 · 提示注入 / prompt injection 1 · 滥用宿主环境 / harness abuse 1 · 供应链 / supply chain 1 · 凭据读取 / credential access 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `DSH-taskboard-HEAD/`
- not scanned (binary): docs/assets/taskboard-board.jpg, docs/assets/taskboard-dashboard-latest.jpg, docs/assets/taskboard-demo.gif, docs/assets/taskboard-detail.jpg, docs/assets/taskboard-gantt-latest.jpg and 5 more
- outbound fetching was permitted for this audit
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
