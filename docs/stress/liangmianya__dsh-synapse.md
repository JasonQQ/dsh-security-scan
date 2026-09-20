> 批量压测 / Batch stress test · ★ 409 · `liangmianya/dsh-synapse`
> https://github.com/liangmianya/dsh-synapse · audited in 2.0s
# 安装前体检 / Pre-install audit: dsh-synapse@0.4.1

**信任评级 / Trust grade: C** (评分 / score 59/100 — 有值得注意的风险信号，确认后再安装 / notable risk signals, install only with intent)

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/liangmianya/dsh-synapse/tar.gz/HEAD` (URL / url)
- 已分析文件：24 个（412.0 KiB） / Files analysed: 24 (412.0 KiB)
- 内容摘要 / Content digest: `db67f52a2ef3eee5e0264d1dfa9d7225…`
- 体检时间 / Audited at: 2026-09-20T09:53:05.411Z

## 安装期脚本 / Install-time scripts

- `prepare` (`package.json`): `pnpm run build`

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `node:fs/promises`, `/synapse/app.js`, `./app.js`, `/synapse/styles.css`, `./styles.css`, `/synapse/deepseek-mark.svg`, `image/svg+xml`, `./deepseek-mark.svg`, `../app.js`, `../client.js`, `../styles.css`, `state.json`
- **写入的文件路径 / File paths written:** `node:fs/promises`
- **派生的命令 / Commands spawned:** （无） / (none)
- **连接的域名 / Domains contacted:** `registry.npmjs.org`, `www.w3.org`, `dsh.local`
- **读取的环境变量 / Environment variables read:** （无） / (none)

## 发现 / Findings

### 高 / HIGH (1)

- **高 / HIGH** `prompt.doc-instruction` — 文档中包含针对模型的指令 / Documentation contains instructions aimed at a model
  中 随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。
  EN A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.
  - `docs/architecture.md:82` — `- system prompts;`
  - `docs/en/README.md:149` — `Does not invalidate. The plugin never changes request headers, system prompts, or tool registries, so an already-reusable KV prefix stays reusable; canvas proje…`
  中 修复：把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。
  EN Fix: Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.

### 中 / MEDIUM (3)

- **中 / MEDIUM** `install.hook-runs-shell-code` — 安装期钩子执行的不只是构建 / Lifecycle hook runs more than a build
  中 该钩子命令不属于常见的编译与拷贝步骤，安装这个包时会以用户权限运行任意代码，而这一切发生在任何人来得及检查之前。
  EN This hook command is not one of the usual compile-and-copy steps, so installing the package runs arbitrary code with the user's privileges before anything can be inspected.
  - `package.json:26` — `"prepare": "pnpm run build",`
  中 修复：把钩子收敛为 `tsc` 或 `npm run build` 之类的构建命令，或把这项工作移到一个由用户主动执行的显式脚本里。
  EN Fix: Reduce the hook to a build command such as `tsc` or `npm run build`, or move the work into an explicit script the user chooses to run.
- **中 / MEDIUM** `obf.long-minified-line` — 整行是压缩或机器生成的数据块 / Line is a single minified or machine-generated blob
  中 该行超过 500 个字符且几乎没有空白，正是打包载荷、压缩字符串表或机器生成单行代码的样子。这样的一行用肉眼什么也审不出来。
  EN The line is over 500 characters with almost no whitespace, which is what a bundled payload, a packed string table or a machine-generated one-liner looks like. Nothing on such a line is reviewable by eye.
  - `app.js:908` — `const phrases = state.quickPhrases.map((phrase, index) => `<div class="draft-quick-phrase-editor-row"><input data-quick-phrase-index="${index}" maxlength="${MAX…`
  - `app.js:909` — `return `<section class="draft-quick-editor" aria-label="编辑快捷词"><div class="draft-quick-editor-list">${phrases}</div><div class="draft-quick-phrase-add"><input m…`
  - `client.js:39` — `style.textContent = '.dsh-synapse-switch{position:fixed;z-index:80;top:12px;left:50%;display:flex;gap:2px;transform:translateX(-50%);border:1px solid #d1d5db;bo…`
  中 修复：发布未压缩的源码，或在 README 中说明该文件由哪个构建产出、可读源码在哪里。
  EN Fix: Ship unminified source, or state in the README which build produced the file and where the readable source lives.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 1 shipped file(s) are 64 KiB or larger and were not read as text, the largest being docs/images/native-webui.jpg at 125 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `docs/images/native-webui.jpg` — `128037 bytes not decoded as text`
  - `app.js:111` — `const response = await fetch(path, { ...options, headers: { 'content-type': 'application/json', ...(options.headers ?? {}) } })`
  - `client.js:95` — `void fetch('/synapse/api/sessions/sync', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessions, removedSessionIds }…`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (1)

- **低 / LOW** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `test/workspace-store.test.js:31` — `{ type: 'tool/call', seq: 2, time: 3, data: { turn: 1, step: 1, callId: 'c1', name: 'bash', arguments: '{"cmd":"pnpm test"}' } },`
  - `test/workspace-store.test.js:63` — `{ type: 'tool/call', seq: 2, time: 3, data: { turn: 1, step: 1, callId: 'c1', name: 'bash', arguments: '{}' } },`
  - `test/workspace-store.test.js:85` — `{ type: 'tool/call', seq: 2, time: 2, data: { turn: 7, step: 1, callId: 'search-1', name: 'web_search', arguments: '{"query":"竞品"}' } },`
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.

_按类别 / By category:_ 提示注入 / prompt injection 1 · 安装脚本 / install scripts 1 · 混淆 / obfuscation 1 · 供应链 / supply chain 1 · 滥用宿主环境 / harness abuse 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `dsh-synapse-HEAD/`
- skipped docs/images/synapse-map.jpg: 665422 bytes exceeds the 524288-byte per-file cap
- not scanned (binary, contents unreadable as text): docs/images/native-webui.jpg
- outbound fetching was permitted for this audit

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
