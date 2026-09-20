> 批量压测 / Batch stress test · ★ 1472 · `YuJunZhiXue/dsh-purge`
> https://github.com/YuJunZhiXue/dsh-purge · audited in 2.7s
# 安装前体检 / Pre-install audit: dsh-purge@1.1.11

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

- 来源 / Source: `https://codeload.github.com/YuJunZhiXue/dsh-purge/tar.gz/HEAD` (URL / url)
- 已分析文件：34 个（921.7 KiB） / Files analysed: 34 (921.7 KiB)
- 内容摘要 / Content digest: `c4dba12acdcfb0356d61dd294f5895ab…`
- 体检时间 / Audited at: 2026-09-20T09:52:02.300Z

## 最严重的风险 / Most severe risk

**源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model** `prompt.embedded-instruction-string`

中 它夹带了写给 agent 而不是写给人看的文字——试图在你不察觉的情况下改变 agent 行为的指令。
EN It carries text aimed at the agent rather than at a person — instructions that try to change what the agent does without telling you.

该包会访问的目标：`www.w3.org`、`127.0.0.1`、`github.com`、`cdn.jsdelivr.net`、`raw.githubusercontent.com`、`api.github.com` / Destinations this package reaches: `www.w3.org`, `127.0.0.1`, `github.com`, `cdn.jsdelivr.net`, `raw.githubusercontent.com`, `api.github.com`

- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 它还安排了之后继续运行，所以仅仅卸载这个包并不够。
  EN It also arranges to run again later, so removing the package is not enough on its own.

决定该评级的规则命中于 `lib/core.js:1729`；完整列表见下方「发现」。 / The rule that decided the grade fired at `lib/core.js:1729`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `package.json`, `dsh-web-fetch-http/package.json`, `.dshpurge.bak`, `bin.js`, `lib/bin.js`, `.git`
- **写入的文件路径 / File paths written:** （无） / (none)
- **派生的命令 / Commands spawned:** `child_process`, `node:child_process`, `npm`, `import { spawn } from "node:child_process";`, `\tconst child = spawn(program, args, {\n`, `execFileSync("git", [`, `schtasks`, `/Query`, `/TN`, `DSH Doctor Supervisor`, `/Delete`, `/F` （另有 24 项） / (+24 more)
- **连接的域名 / Domains contacted:** `www.w3.org`, `127.0.0.1`, `github.com`, `cdn.jsdelivr.net`, `raw.githubusercontent.com`, `api.github.com`
- **读取的环境变量 / Environment variables read:** `PATH`, `Path`, `LOCALAPPDATA`, `DSH_HOME`, `DSH_PERMISSION_MODE`, `process.env (every variable)`, `APPDATA`, `DSH_BASE`, `DSH_SYSTEM_PROMPT`, `DSH_PURGE_DEFAULT_PROMPT`, `EDITOR`, `DSH_PURGE_RESTART` （另有 1 项） / (+1 more)

## 发现 / Findings

### 高 / HIGH (6)

- **高 / HIGH** `harness.installed-package-edit` — 改动宿主安装目录或已安装的其他插件 / Touches the harness installation or another installed plugin
  中 该行读写宿主自身的安装目录，或 `node_modules` 下另一个插件的目录。修改已安装的代码会替换掉用户审查过的产物，并可能禁用或劫持任意插件。
  EN The line reads or writes inside the harness's own installation or another plugin's directory under `node_modules`. Editing installed code replaces the artifact the user reviewed and can disable or hijack any plugin.
  - `lib/restart-desktop.js:61` — `const out = execFileSync("tasklist", ["/FI", "IMAGENAME eq DSH Desktop.exe", "/FO", "CSV", "/NH"], {`
  中 修复：绝不在运行时修改已安装的包；把改动提交到上游，或提供一个增量插件。
  EN Fix: Never modify installed packages at runtime; contribute the change upstream or ship an additive plugin.
- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `lib/index.js:764` — `const url = new URL(request.url, "http://127.0.0.1");`
  - `lib/index.js:782` — `const url = new URL(request.url, "http://127.0.0.1");`
  - `lib/index.js:796` — `const url = new URL(request.url, "http://127.0.0.1");`
  - `lib/index.js:1173` — `const url = new URL(request.url ?? "", "http://127.0.0.1");`
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **高 / HIGH** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `lib/core.js:3881` — `" ? require(\"node:fs\")\n" +`
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.
- **高 / HIGH** `persist.scheduled-task-write` — 安装计划任务、agent 或系统服务 / Installs a scheduled task, agent or service
  中 该行注册了稍后会自动运行的东西——cron 条目、launch agent、systemd unit、Windows 计划任务或注册表 Run 键——因此插件在把它装进来的那次安装结束之后仍在持续执行。
  EN The line registers something that runs later — a cron entry, launch agent, systemd unit, Windows scheduled task or registry Run key — so the plugin keeps executing after the install that brought it in.
  - `lib/core.js:934` — `execFileSync("schtasks", ["/Query", "/TN", "DSH Doctor Supervisor"], {`
  - `lib/core.js:944` — `execFileSync("schtasks", ["/Delete", "/F", "/TN", "DSH Doctor Supervisor"], {`
  中 修复：删除这一定时注册，或交给用户一条有文档说明、可以自行运行和审查的命令。
  EN Fix: Remove the scheduling, or hand the user a documented command they can run and review themselves.
- **高 / HIGH** `prompt.doc-instruction` — 文档中包含针对模型的指令 / Documentation contains instructions aimed at a model
  中 随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。
  EN A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.
  - `README.md:756` — `- First-turn inject is complete; later turns no longer pin the previous full system prompt`
  - `README.md:771` — `- **#25:** After the first turn, do not pin the previous full system prompt. Inject `prompt-inject.md` once; later turns leave this turn’s other sections as ass…`
  - `README.md:793` — `- Prompt inject once on the first turn; later turns pin the committed system prompt instead of appending a second copy.`
  中 修复：把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。
  EN Fix: Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.
- **高 / HIGH** `prompt.embedded-instruction-string` — 源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model
  中 源码中的字符串字面量——通常是工具描述或系统提示词片段——要求模型绕过确认或对用户隐瞒某些事，于是它作为一条指令进入上下文窗口。
  EN A string literal in the source — typically a tool description or system prompt fragment — tells the model to bypass confirmation or to hide something from the user, so it lands in the context window as a directive.
  - `lib/core.js:1729` — `"auto-granted in this session (approval bypass, approval policy: never)"`
  - `lib/core.js:1791` — `'\t\t// [dsh-purge] approval bypass: every approval request is auto-granted\n'`
  - `lib/core.js:1793` — `'return "allowed-once";\n\t\t// [dsh-purge] approval bypass'`
  - `lib/core.js:1805` — `"APPROVAL_NEVER_SENTENCE_BYPASS"`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：如实描述工具的行为，删除那些会改变 agent 对待用户方式的指令。
  EN Fix: Describe the tool's behavior factually and remove directives that change how the agent treats the user.

### 中 / MEDIUM (3)

- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `lib/index.js:764` — `http://127.0.0.1`
  - `lib/index.js:782` — `http://127.0.0.1`
  - `lib/index.js:796` — `http://127.0.0.1`
  - `lib/index.js:1173` — `http://127.0.0.1`
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `persist.shell-rc-append` — 追加写入 shell 启动文件 / Appends to a shell startup file
  中 该行写入了 `.bashrc`、`.zshrc`、`.profile` 或 fish 配置，因此改动会在之后每个交互式 shell 中生效，而且删掉包目录也不会消失。
  EN The line writes into `.bashrc`, `.zshrc`, `.profile` or a fish config, so the change takes effect in every future interactive shell and survives removing the package directory.
  - `lib/uninstall.js:257` — `report.profiles = profiles.map((p) => p.name);`
  中 修复：不要修改 shell 启动文件；如果需要 shell 集成，就把那行内容打印出来，由用户自行决定是否添加。
  EN Fix: Do not modify shell startup files; if a shell integration is required, print the line for the user to add deliberately.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 2 shipped file(s) are 64 KiB or larger and were not read as text, the largest being docs/preview/settings.png at 316 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `docs/preview/settings.png` — `323668 bytes not decoded as text`
  - `client.js:58` — `const r = await fetch(apiUrl(p), Object.assign({ cache: "no-store", credentials: "same-origin", signal: ctrl.signal }, init || {}));`
  - `client.js:966` — `fetch("/dsh-purge/" + action, {`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (1)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `lib/core.js:1355` — `const env = options.env ?? process.env;`
  - `lib/desktop.js:159` — `const env = input.env ?? process.env;`
  - `lib/desktop.js:208` — `const env = input.env ?? process.env;`
  - `lib/desktop.js:253` — `const env = input.env ?? process.env;`
  - ……另有 7 处 / … and 7 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.

_按类别 / By category:_ 网络回调 / network callbacks 2 · 持久化 / persistence 2 · 提示注入 / prompt injection 2 · 滥用宿主环境 / harness abuse 1 · 混淆 / obfuscation 1 · 供应链 / supply chain 1 · 凭据读取 / credential access 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `dsh-purge-HEAD/`
- not scanned (binary, contents unreadable as text): docs/preview/rules.png, docs/preview/settings.png
- outbound fetching was permitted for this audit
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
