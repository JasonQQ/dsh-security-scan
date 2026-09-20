> 批量压测 / Batch stress test · ★ 5794 · `Tencent/BrowserSkill#packages/dsh-plugin-browserskill`
> https://github.com/Tencent/BrowserSkill/tree/main/packages/dsh-plugin-browserskill · audited in 2.6s
# 安装前体检 / Pre-install audit: @wxg-prc-cpg/browser-skill-dsh-plugin@0.3.0

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

- 来源 / Source: `https://codeload.github.com/Tencent/BrowserSkill/tar.gz/HEAD` (URL / url)
- 已分析文件：64 个（621.1 KiB） / Files analysed: 64 (621.1 KiB)
- 内容摘要 / Content digest: `b90a75a49f22054e318160828cacb91e…`
- 体检时间 / Audited at: 2026-09-20T09:51:46.004Z

## 最严重的风险 / Most severe risk

**同一个包内既有环境变量收集又有对外请求 / Environment harvest and an outbound request in the same package** `exfil.environment-harvest-then-callback`

中 数据会离开这台机器。该包中有代码把本机上的内容发往外部地址。
EN Data leaves this machine. Something in this package takes content that lives here and sends it to a destination outside it.

该包会访问的目标：`registry.npmjs.org`、`github.com`、`localhost`、`localhostthumbnails0`、`x`、`newtab`、`example.com`、`evil.example` / Destinations this package reaches: `registry.npmjs.org`, `github.com`, `localhost`, `localhostthumbnails0`, `x`, `newtab`, `example.com`, `evil.example`

- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.

决定该评级的规则命中于 `tsdown.config.ts:54`；完整列表见下方「发现」。 / The rule that decided the grade fired at `tsdown.config.ts:54`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

发布期钩子（维护者打包或发布时运行，安装时不会执行）： / Publish-time hooks (run when the maintainer packs or publishes, not on install):

- `prepack`: `pnpm run build`

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `tailwind.css`, `../ui/src/styles/tailwind.css`, `SKILL.md`, `skill/SKILL.md`, `node:fs/promises`, `package.json`, `../package.json`, `requests.json`
- **写入的文件路径 / File paths written:** `requests.json`
- **派生的命令 / Commands spawned:** `node:child_process`
- **连接的域名 / Domains contacted:** `registry.npmjs.org`, `github.com`, `localhost`, `localhostthumbnails0`, `x`, `newtab`, `example.com`, `evil.example`, `127.0.0.1`, `example.org`, `example.test`, `a.test` （另有 2 项） / (+2 more)
- **读取的环境变量 / Environment variables read:** `BSK_HOME`, `NODE_ENV`

## 发现 / Findings

### 严重 / CRITICAL (1)

- **严重 / CRITICAL** `exfil.environment-harvest-then-callback` — 同一个包内既有环境变量收集又有对外请求 / Environment harvest and an outbound request in the same package
  中 该包读取或整体导出进程环境变量，同时又建立对外连接。CI 运行器和宿主会话都会把 API Key 导出到环境变量中，因此这一组合会把仍有效的凭据送出本机。
  EN The package reads or dumps process environment values and also opens outbound connections. CI runners and harness sessions export API keys into the environment, so this combination sends working credentials off the machine.
  - `tsdown.config.ts:54` — `JSON.stringify(process.env`
  - `tsdown.config.ts:55` — `JSON.stringify(process.env`
  - `src/client/index.ts:22` — `import { type EventSourceLike, ObservationClientStore } from "./observation-store";`
  - `src/client/index.ts:55` — `const res = await fetch(`/bsk-observation/thumbnail/${encodeURIComponent(attachmentId)}`);`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：删除环境变量的整体导出，只逐个读取插件确实需要、且有文档说明的变量。
  EN Fix: Remove the environment dump, and read only individually documented variables that the plugin actually needs.

### 高 / HIGH (5)

- **高 / HIGH** `cred.env-harvest` — 读取或整体导出进程环境变量 / Reads or dumps the process environment
  中 该行把整个环境当成一个值取走——序列化、遍历或打印它，而不是只取自己需要的那一个变量。CI 运行器和宿主都会把 API Key 导出到环境变量里，因此整体导出就是一次凭据收集。
  EN The line takes the whole environment as a value — serializing it, iterating it, or printing it — rather than the one variable it needs. CI runners and the harness export API keys into the environment, so a dump is a credential harvest.
  - `tsdown.config.ts:54` — `JSON.stringify(process.env`
  - `tsdown.config.ts:55` — `JSON.stringify(process.env`
  中 修复：只逐个读取插件文档中声明过的变量，绝不序列化整个环境对象，也不要把它写进日志或请求。
  EN Fix: Read only the variables the plugin documents, one at a time, and never serialize the environment object or forward it into a log or request.
- **高 / HIGH** `obf.decoded-payload-literal` — 携带解码、转义或高熵字面量 / Carries a decoded, escaped or high-entropy literal
  中 一个很长的字面量会在运行时被解码（base64、`atob`、`unescape`、`decodeURIComponent`），或者写满了密集的十六进制、Unicode 转义，或者呈现出编码数据块那种近乎均匀的字符分布。
  EN A long literal is decoded at runtime (base64, `atob`, `unescape`, `decodeURIComponent`), written with dense hex or unicode escapes, or has the near-uniform character distribution of an encoded blob.
  - `src/client/brand-icon.ts:8` — `"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAJGklEQVR42m2X248c2V3HP79zTlV19/TcPOOZWY+vsdmQFdngTQJswgs3hQ15iCJslAey+8xDAIHgH+CBNxIpj0gkE…`
  中 修复：把该值保存为可读源码，或保存为格式有文档说明的数据，让审查者能看清实际运行的到底是什么。
  EN Fix: Store the value as readable source or as data with a documented format, so a reviewer can see what is actually being run.
- **高 / HIGH** `prompt.doc-instruction` — 文档中包含针对模型的指令 / Documentation contains instructions aimed at a model
  中 随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。
  EN A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.
  - `docs/development.md:21` — `concatenated: its command examples belong to a different execution interface and would bypass`
  - `docs/development.md:28` — `With `lazyTools: true`, the six tool schemas stay out of the system prompt until`
  - `README.md:146` — `the model. The six `browser_*` tool schemas are added to the system prompt after`
  - `skill/SKILL.md:60` — `govern confirmation and help; never change them to bypass a prompt or repeat`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。
  EN Fix: Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.
- **高 / HIGH** `prompt.embedded-instruction-string` — 源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model
  中 源码中的字符串字面量——通常是工具描述或系统提示词片段——要求模型绕过确认或对用户隐瞒某些事，于是它作为一条指令进入上下文窗口。
  EN A string literal in the source — typically a tool description or system prompt fragment — tells the model to bypass confirmation or to hide something from the user, so it lands in the context window as a directive.
  - `src/browser-tools.ts:145` — `"Bypass cache for reload."`
  - `src/phase-one-tools-navigation.ts:112` — `"bypass the HTTP cache."`
  - `src/phase-one-tools-navigation.ts:118` — `"Bypass the HTTP cache while reloading."`
  中 修复：如实描述工具的行为，删除那些会改变 agent 对待用户方式的指令。
  EN Fix: Describe the tool's behavior factually and remove directives that change how the agent treats the user.
- **高 / HIGH** `supply.url-dependency` — 依赖解析到 URL、git 引用或文件路径 / Dependency resolves to a URL, git ref or file path
  中 依赖不是从仓库解析，而是来自 URL、git 引用、本地路径或 patch，因此其内容不受仓库锁文件和任何完整性元数据约束，可以在版本号不变的情况下被替换。
  EN A dependency is resolved from a URL, a git reference, a local path or a patch instead of the registry, so its contents are not covered by the registry lockfile or by any integrity metadata and can change without a version bump.
  - `package.json:129` — `"@browser-skill/ui": "workspace:*",`
  中 修复：改为依赖仓库中已发布的版本，并用锁文件固定；如果确实必须用 fork，就把它发布到自己名下的 scope。
  EN Fix: Depend on a published version from the registry, pinned by a lockfile; if a fork is unavoidable, publish it under your own scope.

### 中 / MEDIUM (4)

- **中 / MEDIUM** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `src/client/index.ts:83` — `ctx.slots.register({ name: "shell.overlay", id: "bsk-observation" }, () =>`
  - `tests/client/browser-inspect-toolview.test.tsx:180` — `{ name: "shell.overlay", id: "bsk-observation" },`
  - `tests/lazy-tools.test.ts:76` — `callListeners(listeners, "tools/result", { name: "bash", arguments: {} }, { isError: false });`
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.
- **中 / MEDIUM** `install.hook-runs-shell-code` — 安装期钩子执行的不只是构建 / Lifecycle hook runs more than a build
  中 该钩子命令不属于常见的编译与拷贝步骤，安装这个包时会以用户权限运行任意代码，而这一切发生在任何人来得及检查之前。
  EN This hook command is not one of the usual compile-and-copy steps, so installing the package runs arbitrary code with the user's privileges before anything can be inspected.
  - `package.json:65` — `"prepack": "pnpm run build",`
  中 修复：把钩子收敛为 `tsc` 或 `npm run build` 之类的构建命令，或把这项工作移到一个由用户主动执行的显式脚本里。
  EN Fix: Reduce the hook to a build command such as `tsc` or `npm run build`, or move the work into an explicit script the user chooses to run.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `src/observation-http.ts:143` — `http://localhostthumbnails0`
  - `src/observation-http.ts:253` — `http://x`
  - `tests/observation.test.ts:774` — `http://evil.example`
  - `tests/observation.test.ts:775` — `http://127.0.0.1:3999`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `obf.long-minified-line` — 整行是压缩或机器生成的数据块 / Line is a single minified or machine-generated blob
  中 该行超过 500 个字符且几乎没有空白，正是打包载荷、压缩字符串表或机器生成单行代码的样子。这样的一行用肉眼什么也审不出来。
  EN The line is over 500 characters with almost no whitespace, which is what a bundled payload, a packed string table or a machine-generated one-liner looks like. Nothing on such a line is reviewable by eye.
  - `src/client/brand-icon.ts:8` — `"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAJGklEQVR42m2X248c2V3HP79zTlV19/TcPOOZWY+vsdmQFdngTQJswgs3hQ15iCJslAey+8xDAIHgH+CBNxIpj0gkE…`
  中 修复：发布未压缩的源码，或在 README 中说明该文件由哪个构建产出、可读源码在哪里。
  EN Fix: Ship unminified source, or state in the README which build produced the file and where the readable source lives.

### 低 / LOW (3)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `tsdown.config.ts:55` — `"import.meta.env.MODE": JSON.stringify(process.env.NODE_ENV ?? "production"),`
  - `tsdown.config.ts:56` — `"import.meta.env": JSON.stringify({ MODE: process.env.NODE_ENV ?? "production" }),`
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `tests/observation.test.ts:774` — `expect(await getState({ host: "127.0.0.1:3999", origin: "http://evil.example" })).toBe(403);`
  - `tests/observation.test.ts:775` — `expect(await getState({ host: "127.0.0.1:3999", origin: "http://127.0.0.1:3999" })).toBe(200);`
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **低 / LOW** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `tests/plugin-id.test.ts:24` — `it("declares client require()s so dsh arrives them before materialize", () => {`
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.

_按类别 / By category:_ 混淆 / obfuscation 3 · 凭据读取 / credential access 2 · 提示注入 / prompt injection 2 · 网络回调 / network callbacks 2 · 数据外传 / exfiltration 1 · 供应链 / supply chain 1 · 滥用宿主环境 / harness abuse 1 · 安装脚本 / install scripts 1

## 扫描说明 / Scan notes

- scoped to the subdirectory `packages/dsh-plugin-browserskill/`
- stripped the archive's single top-level directory `BrowserSkill-HEAD/`
- outbound fetching was permitted for this audit
- grade forced to D by a critical finding: exfil.environment-harvest-then-callback — Environment harvest and an outbound request in the same package
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
