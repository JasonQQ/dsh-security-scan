> 批量压测 / Batch stress test · ★ 2626 · `zilliztech/memsearch#plugins/dsh`
> https://github.com/zilliztech/memsearch/tree/main/plugins/dsh · audited in 0.7s
# 安装前体检 / Pre-install audit: @zilliz/memsearch-dsh@0.1.5

**信任评级 / Trust grade: C** (评分 / score 57/100 — 有值得注意的风险信号，确认后再安装 / notable risk signals, install only with intent)

- 来源 / Source: `https://codeload.github.com/zilliztech/memsearch/tar.gz/HEAD` (URL / url)
- 已分析文件：27 个（265.0 KiB） / Files analysed: 27 (265.0 KiB)
- 内容摘要 / Content digest: `d4594fbae64381bb97b2e39fb37fbe03…`
- 体检时间 / Audited at: 2026-09-20T09:51:51.743Z

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `../client.js`, `\n`, `${memoryDir}/${files[0]}`, `${projA}/.memsearch/memory`, `${projB}/.memsearch/memory`, `${projA}/.memsearch/memory/${filesA[0]}`, `${projB}/.memsearch/memory/${filesB[0]}`
- **写入的文件路径 / File paths written:** `${memoryDir}/2026-09-07.md`, `${fakeBin}/memsearch`, `${fakeBin}/bash`, `${fakeBin}/python3`, `${fakeHome}/.local/share/pnpm`, `${fakeHome}/.local/share/pnpm/dsh`, `${candDir}/beta`, `${candDir}/alpha`, `${candDir}/no-meta`, `${candDir}/sub/not-a-dir`, `${candDir}/beta/meta.json`, `${candDir}/alpha/meta.json` （另有 18 项） / (+18 more)
- **派生的命令 / Commands spawned:** `node:child_process`, `bash`, `-c`, `command -v ${cmd} >/dev/null 2>&1`, `pipe`, `${memsearchCmd} config get '${key}'`, `${key}`, `xdg-open`, `taskkill`, `/pid`, `/t`, `/f` （另有 6 项） / (+6 more)
- **连接的域名 / Domains contacted:** `localhost`, `localhostsessionid`, `localhostpath`, `github.com`, `api.deepseek.com`, `api.deepseek.comenv:dsk`, `example.com`
- **读取的环境变量 / Environment variables read:** `HOME`, `MEMSEARCH_DIR`, `DSH_CLI`, `MEMSEARCH_DSH_SUMMARIZE`, `MEMSEARCH_PLUGIN_URL`, `MEMSEARCH_TEST_PROJECT`, `PATH`, `MEMSEARCH_ARGV_FILE`, `MEMSEARCH_TEST_CHILD_MODE`

## 发现 / Findings

### 高 / HIGH (1)

- **高 / HIGH** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `index.js:102` — `return await import(pathToFileURL(resolved).href)`
  - `tests/index.test.js:52` — `const { apply } = await import(process.env.MEMSEARCH_PLUGIN_URL)`
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.

### 中 / MEDIUM (3)

- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `index.js:567` — `http://localhostsessionId`
  - `index.js:658` — `http://localhostsessionId`
  - `index.js:659` — `http://localhostpath`
  - `index.js:699` — `http://localhostsessionId`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `prompt.concealed-instruction` — 把文本藏在注释或不可见字符中 / Hides text in a comment or invisible characters
  中 该行把内容藏在 HTML 注释里，或藏在零宽字符与双向控制字符之后，这些内容在 diff 或渲染后的文档中什么都看不见，却仍会作为文本被读取。
  EN The line conceals content either in an HTML comment or behind zero-width and bidirectional control characters, which render as nothing in a diff or a rendered document while still being read as text.
  - `index.js:1123` — `.replace(/^ ?---[\s\S]*?---\s*/u, '') // strip optional YAML frontmatter`
  - `index.js:1166` — `.replace(/^ ?---[\s\S]*?---\s*/u, '') // strip optional YAML frontmatter`
  中 修复：删除被隐藏的文本和不可见字符；审查者看不到的东西就不该出现在发布的包里。
  EN Fix: Delete the concealed text and the invisible characters; anything a reviewer cannot see does not belong in a shipped package.
- **中 / MEDIUM** `supply.unpinned-range` — 依赖版本范围未固定 / Dependency range is unpinned
  中 该依赖接受任意版本（`*`、`x` 或 `latest`），明天安装到的就是仓库当时提供的代码，而经过审计的版本对它毫无保证。
  EN The dependency accepts any version (`*`, `x` or `latest`), so the code that installs tomorrow is whatever the registry serves then, and the audited version says nothing about it.
  - `package.json:53` — `"@deepseek-ai/dsh-llm": "*"`
  中 修复：固定 semver 范围并提交锁文件，使安装解析到的正是被审查过的那些版本。
  EN Fix: Pin a semver range and commit a lockfile so an install resolves to the versions that were reviewed.

### 低 / LOW (2)

- **低 / LOW** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `tests/index.test.js:804` — `{ type: 'tool/call', data: { name: 'bash' } },`
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.
- **低 / LOW** `obf.dynamic-code-eval` — 执行运行时拼装出来的代码 / Evaluates code built at runtime
  中 该行执行的是一个并非源码字面量的表达式，真正运行的代码在插件运行时才被拼装出来，无法在 tarball 中审查。
  EN The line evaluates an expression that is not a source literal, so the executed code is assembled while the plugin runs and cannot be reviewed in the tarball.
  - `tests/client.test.js:53` — `vm.runInContext(source, context)`
  中 修复：用静态函数或数据表替代动态求值；任何审计都无法为运行时才存在的代码背书。
  EN Fix: Replace the dynamic evaluation with a static function or a data table; there is no audit that can vouch for code that does not exist until runtime.

_按类别 / By category:_ 混淆 / obfuscation 2 · 网络回调 / network callbacks 1 · 提示注入 / prompt injection 1 · 供应链 / supply chain 1 · 滥用宿主环境 / harness abuse 1

## 扫描说明 / Scan notes

- scoped to the subdirectory `plugins/dsh/`
- stripped the archive's single top-level directory `memsearch-HEAD/`
- outbound fetching was permitted for this audit

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
