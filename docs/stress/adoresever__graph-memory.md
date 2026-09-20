> 批量压测 / Batch stress test · ★ 626 · `adoresever/graph-memory`
> https://github.com/adoresever/graph-memory · audited in 2.9s
# 安装前体检 / Pre-install audit: graph-memory-pro-dsh@0.1.0-beta.1

**信任评级 / Trust grade: C** (评分 / score 53/100 — 有值得注意的风险信号，确认后再安装 / notable risk signals, install only with intent)

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/adoresever/graph-memory/tar.gz/HEAD` (URL / url)
- 已分析文件：120 个（2.3 MiB） / Files analysed: 120 (2.3 MiB)
- 内容摘要 / Content digest: `f355d9703228cdc08ddefa99872fc98e…`
- 体检时间 / Audited at: 2026-09-20T09:52:43.635Z

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `scenario-20.json`, `\n`, `../package.json`, `../node_modules/${dependency}/package.json`, `../dsh-pro/client.js`
- **写入的文件路径 / File paths written:** `manifest.partial.json`, `manifest.json`
- **派生的命令 / Commands spawned:** `node:child_process`, `npm`, `pack`, `--dry-run`, `--json`
- **连接的域名 / Domains contacted:** `${baseurl`, `api.openai.com`, `api.anthropic.com`, `www.inkscape.org`, `sodipodi.sourceforge.net`, `www.w3.org`, `github.com`, `api.minimaxi.com`, `evilminimaxi.com`, `example.com`, `example.test`, `127.0.0.1`
- **读取的环境变量 / Environment variables read:** `DSH_USAGE_TAP_FILE`, `BENCHMARK_DSH_REPO`, `BENCHMARK_DSH_HOME`, `BENCHMARK_WORKSPACE`, `BENCHMARK_RUN_ID`, `BENCHMARK_PROVIDER`, `BENCHMARK_MODEL`, `BENCHMARK_PROFILE`, `BENCHMARK_PATCHES`, `GRAPH_MEMORY_SEMANTIC_SCORE_THRESHOLD`, `GRAPH_MEMORY_LLM_PROVIDER`, `GRAPH_MEMORY_LLM_MODEL` （另有 6 项） / (+6 more)

## 发现 / Findings

### 高 / HIGH (1)

- **高 / HIGH** `prompt.embedded-instruction-string` — 源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model
  中 源码中的字符串字面量——通常是工具描述或系统提示词片段——要求模型绕过确认或对用户隐瞒某些事，于是它作为一条指令进入上下文窗口。
  EN A string literal in the source — typically a tool description or system prompt fragment — tells the model to bypass confirmation or to hide something from the user, so it lands in the context window as a directive.
  - `test/turn-memory.test.ts:306` — `"does not let a covered graph node bypass a rejected summary"`
  中 修复：如实描述工具的行为，删除那些会改变 agent 对待用户方式的指令。
  EN Fix: Describe the tool's behavior factually and remove directives that change how the agent treats the user.

### 中 / MEDIUM (3)

- **中 / MEDIUM** `obf.long-minified-line` — 整行是压缩或机器生成的数据块 / Line is a single minified or machine-generated blob
  中 该行超过 500 个字符且几乎没有空白，正是打包载荷、压缩字符串表或机器生成单行代码的样子。这样的一行用肉眼什么也审不出来。
  EN The line is over 500 characters with almost no whitespace, which is what a bundled payload, a packed string table or a machine-generated one-liner looks like. Nothing on such a line is reviewable by eye.
  - `dist/dsh.js:658` — `return `Graph Memory active (DSH native)\nStore: ${config.dbPath}\nTurn memories: ${stats.turnMemories}\nNavigation: ${stats.navigationTerms} terms / ${stats.na…`
  - `dist/dsh.js:658` — `Graph Memory active (DSH native)\nStore: ${config.dbPath}\nTurn memories: ${stats.turnMemories}\nNavigation: ${stats.navigationTerms} terms / ${stats.navigation…`
  - `dist/dsh.js:723` — `return `Turn memories: ${stats.turnMemories}\nNavigation terms: ${stats.navigationTerms}\nNavigation triples: ${stats.navigationTriples}\nNavigation communities…`
  - `dsh.ts:815` — `return `Graph Memory active (DSH native)\nStore: ${config.dbPath}\nTurn memories: ${stats.turnMemories}\nNavigation: ${stats.navigationTerms} terms / ${stats.na…`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：发布未压缩的源码，或在 README 中说明该文件由哪个构建产出、可读源码在哪里。
  EN Fix: Ship unminified source, or state in the README which build produced the file and where the readable source lives.
- **中 / MEDIUM** `supply.unpinned-range` — 依赖版本范围未固定 / Dependency range is unpinned
  中 该依赖接受任意版本（`*`、`x` 或 `latest`），明天安装到的就是仓库当时提供的代码，而经过审计的版本对它毫无保证。
  EN The dependency accepts any version (`*`, `x` or `latest`), so the code that installs tomorrow is whatever the registry serves then, and the audited version says nothing about it.
  - `package.json:73` — `"openclaw": "*"`
  中 修复：固定 semver 范围并提交锁文件，使安装解析到的正是被审查过的那些版本。
  EN Fix: Pin a semver range and commit a lockfile so an install resolves to the versions that were reviewed.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 10 shipped file(s) are 64 KiB or larger and were not read as text, the largest being docs/images/dsh/vector-cross-session-recall.png at 251 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `docs/images/dsh/vector-cross-session-recall.png` — `257038 bytes not decoded as text`
  - `dist/src/engine/embed.js:14` — `const res = await fetch(url, { ...init, signal: ctrl.signal });`
  - `dist/src/engine/llm.js:44` — `const res = await fetch(url, { ...init, signal: ctrl.signal });`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (4)

- **低 / LOW** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `test/dsh-adapter.test.ts:615` — `{ type: "tool-call", name: "read", arguments: { path: "secret" } },`
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.
- **低 / LOW** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `test/embed.test.ts:107` — `http://127.0.0.1:11434/v1/`
  - `test/embed.test.ts:113` — `http://127.0.0.1:11434/v1/embeddings`
  - `test/embed.test.ts:114` — `http://127.0.0.1:11434/v1/embeddings`
  - `test/llm.test.ts:32` — `http://127.0.0.1:8080/v1/`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **低 / LOW** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `test/embed.test.ts:107` — `baseUrl: "http://127.0.0.1:11434/v1/",`
  - `test/embed.test.ts:113` — `"http://127.0.0.1:11434/v1/embeddings",`
  - `test/embed.test.ts:114` — `"http://127.0.0.1:11434/v1/embeddings",`
  - `test/llm.test.ts:32` — `baseUrl: "http://127.0.0.1:8080/v1/",`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **低 / LOW** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `benchmarks/dsh-context-takeover/scripts/run-scenario.mjs:35` — `const {DeepSeekHarness} = await import(pathToFileURL(sdkPath).href);`
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.

_按类别 / By category:_ 混淆 / obfuscation 2 · 供应链 / supply chain 2 · 网络回调 / network callbacks 2 · 提示注入 / prompt injection 1 · 滥用宿主环境 / harness abuse 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `graph-memory-HEAD/`
- skipped docs/images/banner.jpg: 698703 bytes exceeds the 524288-byte per-file cap
- not scanned (binary): docs/images/brand/graph-memory-hosts-banner.png, docs/images/context-memory-illustration.webp, docs/images/dsh/plugin-inventory-active.png, docs/images/dsh/vector-cross-session-recall.png, docs/images/dsh/vector-status.png and 6 more
- outbound fetching was permitted for this audit

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
