> 批量压测 / Batch stress test · ★ 466 · `omdsh-dev/dsh-genui`
> https://github.com/omdsh-dev/dsh-genui · audited in 3.0s
# 安装前体检 / Pre-install audit: @changfenhuang/dsh-genui@0.11.1-preview.2

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/omdsh-dev/dsh-genui/tar.gz/HEAD` (URL / url)
- 已分析文件：195 个（3.5 MiB） / Files analysed: 195 (3.5 MiB)
- 内容摘要 / Content digest: `dd32b1240add11c300dcce6f4ca9c36b…`
- 体检时间 / Audited at: 2026-09-20T09:52:59.991Z

## 最严重的风险 / Most severe risk

**同一个包内既有环境变量收集又有对外请求 / Environment harvest and an outbound request in the same package** `exfil.environment-harvest-then-callback`

中 数据会离开这台机器。该包中有代码把本机上的内容发往外部地址。
EN Data leaves this machine. Something in this package takes content that lives here and sends it to a destination outside it.

该包会访问的目标：`github.com`、`registry.npmjs.org`、`127.0.0.1:${port`、`tailwindcss.com`、`fonts.googleapis.com`、`fonts.gstatic.com`、`react.dev`、`www.w3.org` / Destinations this package reaches: `github.com`, `registry.npmjs.org`, `127.0.0.1:${port`, `tailwindcss.com`, `fonts.googleapis.com`, `fonts.gstatic.com`, `react.dev`, `www.w3.org`

- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 它还安排了之后继续运行，所以仅仅卸载这个包并不够。
  EN It also arranges to run again later, so removing the package is not enough on its own.
- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `tsdown.config.ts:112`；完整列表见下方「发现」。 / The rule that decided the grade fired at `tsdown.config.ts:112`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

发布期钩子（维护者打包或发布时运行，安装时不会执行）： / Publish-time hooks (run when the maintainer packs or publishes, not on install):

- `prepack`: `node scripts/prepack.mjs`

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `node:fs/promises`, `../package.json`, `scripts/e2e.mjs`, `src/client`, `src/client/GenuiBlock.module.css`, `src/client/mermaid-core.ts`, `SKILL.md`
- **写入的文件路径 / File paths written:** `node:fs/promises`, `storages/workspace.json`, `11.7.0`, `package.json`, `@changfenhuang/dsh-genui`, `SKILL.md`, `{"name":"web","dependencies":{"@changfenhuang/dsh-genui":"link:whatever"}}\n`, `missing.md`, `nowhere/missing.md`, `node_modules/@changfenhuang/dsh-genui/SKILL.md`
- **派生的命令 / Commands spawned:** `node:child_process`, `which`, `dsh`, `utf8`, `plugin`, `--profile`, `web`, `add`, `inherit`, `--port`, `--no-open`, `sh` （另有 14 项） / (+14 more)
- **连接的域名 / Domains contacted:** `github.com`, `registry.npmjs.org`, `127.0.0.1:${port`, `tailwindcss.com`, `fonts.googleapis.com`, `fonts.gstatic.com`, `react.dev`, `www.w3.org`, `manus-analytics.com`, `x`, `127.0.0.1`, `evil` （另有 3 项） / (+3 more)
- **读取的环境变量 / Environment variables read:** `DSH_BIN`, `E2E_PLUGIN_SPEC`, `PLAYWRIGHT_PATH`, `DSH_ROOT`, `HOME`, `DEEPSEEK_API_KEY`, `DSH_HOME`, `PROFILE`, `ComSpec`, `process.env (every variable)`, `GENUI_PACK_MAX_TARBALL`, `GENUI_PACK_MAX_UNPACKED` （另有 3 项） / (+3 more)

## 发现 / Findings

### 严重 / CRITICAL (1)

- **严重 / CRITICAL** `exfil.environment-harvest-then-callback` — 同一个包内既有环境变量收集又有对外请求 / Environment harvest and an outbound request in the same package
  中 该包读取或整体导出进程环境变量，同时又建立对外连接。CI 运行器和宿主会话都会把 API Key 导出到环境变量中，因此这一组合会把仍有效的凭据送出本机。
  EN The package reads or dumps process environment values and also opens outbound connections. CI runners and harness sessions export API keys into the environment, so this combination sends working credentials off the machine.
  - `tsdown.config.ts:112` — `JSON.stringify(process.env`
  - `tsdown.config.ts:113` — `JSON.stringify(process.env`
  - `tsdown.config.ts:157` — `JSON.stringify(process.env`
  - `pnpm-lock.yaml:2865` — `undici-types@6.21.0:`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：删除环境变量的整体导出，只逐个读取插件确实需要、且有文档说明的变量。
  EN Fix: Remove the environment dump, and read only individually documented variables that the plugin actually needs.

### 高 / HIGH (7)

- **高 / HIGH** `cred.env-harvest` — 读取或整体导出进程环境变量 / Reads or dumps the process environment
  中 该行把整个环境当成一个值取走——序列化、遍历或打印它，而不是只取自己需要的那一个变量。CI 运行器和宿主都会把 API Key 导出到环境变量里，因此整体导出就是一次凭据收集。
  EN The line takes the whole environment as a value — serializing it, iterating it, or printing it — rather than the one variable it needs. CI runners and the harness export API keys into the environment, so a dump is a credential harvest.
  - `tsdown.config.ts:112` — `JSON.stringify(process.env`
  - `tsdown.config.ts:113` — `JSON.stringify(process.env`
  - `tsdown.config.ts:157` — `JSON.stringify(process.env`
  中 修复：只逐个读取插件文档中声明过的变量，绝不序列化整个环境对象，也不要把它写进日志或请求。
  EN Fix: Read only the variables the plugin documents, one at a time, and never serialize the environment object or forward it into a log or request.
- **高 / HIGH** `exfil.clipboard-read-then-callback` — 同一个包内既有剪贴板读取又有对外请求 / Clipboard read and an outbound request in the same package
  中 该包读取系统剪贴板，同时发起对外请求。剪贴板里有刚刚复制过的密码和令牌，而这个包里没有任何东西能解释这两种行为为何同时存在。
  EN The package reads the system clipboard and also makes outbound requests. Clipboards hold passwords and tokens that were copied moments earlier, and nothing in this package explains why the two behaviors coexist.
  - `scripts/e2e.mjs:258` — `clipboard.readText(`
  - `pnpm-lock.yaml:2865` — `undici-types@6.21.0:`
  - `pnpm-lock.yaml:4206` — `undici-types: 6.21.0`
  - `pnpm-lock.yaml:5645` — `undici-types@6.21.0: {}`
  中 修复：删除剪贴板读取，或让目标地址默认不可达，并向用户说明。
  EN Fix: Remove the clipboard read, or make the destination unreachable by default and documented for the user.
- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `scripts/e2e-visual.mts:124` — `const BASE = `http://127.0.0.1:${PORT}``
  - `scripts/e2e.mjs:169` — `const BASE = `http://127.0.0.1:${PORT}``
  - `tests/e2e-auth.spec.ts:12` — `expect(findDshWebUrl('booting\ndsh web: http://127.0.0.1:3190/?token=abc_DEF-123\n'))`
  - `tests/e2e-auth.spec.ts:13` — `.toBe('http://127.0.0.1:3190/?token=abc_DEF-123')`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **高 / HIGH** `net.token-or-blob-in-url` — 把凭据或编码数据块放进 URL / Puts a credential or encoded blob in a URL
  中 令牌形状的查询参数、内嵌的 `user:password` 授权部分，或超长高熵的查询值，都意味着密钥或载荷数据在 URL 中传输，最终会留在访问日志、代理和浏览器历史里。
  EN A token-shaped query parameter, an embedded `user:password` authority, or a long high-entropy query value means secret material or payload data travels in a URL, where it lands in access logs, proxies and browser history.
  - `scripts/e2e-visual.mts:57` — `?token=[A-Za-z0-9_-]+)?)/u)?.[1]`
  - `scripts/e2e.mjs:46` — `?token=[A-Za-z0-9_-]+)?)/u)?.[1]`
  - `tests/e2e-auth.spec.ts:12` — `'booting\ndsh web: http://127.0.0.1:3190/?token=abc_DEF-123\n'`
  - `tests/e2e-auth.spec.ts:13` — `'http://127.0.0.1:3190/?token=abc_DEF-123'`
  中 修复：凭据放在 Authorization 头里发送，载荷用 POST 放在请求体中，不要编码进查询字符串。
  EN Fix: Send credentials in an Authorization header, and POST payloads in the body rather than encoding them into the query string.
- **高 / HIGH** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `scripts/e2e-visual.mts:78` — `return await import(p)`
  - `scripts/e2e.mjs:184` — `const { chromium } = await import(pathToFileURL(join(DSH_ROOT, 'apps/web/node_modules/playwright/index.mjs')).href)`
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.
- **高 / HIGH** `persist.global-self-install` — 全局安装依赖包 / Installs a package globally
  中 该命令把包安装到全局前缀，于是用户的 PATH 上多出一个可执行文件，而且当前项目删除后它仍然留在那里。
  EN The command installs a package into the global prefix, which puts a new executable on the user's PATH and keeps it there after the current project is deleted.
  - `.github/workflows/release.yml:44` — `npm install --global`
  - `scripts/install.sh:117` — `npm i -g`
  中 修复：改为本地安装，并通过项目自身的脚本调用该工具；全局安装应由用户自己决定，而不是由插件代劳。
  EN Fix: Install locally and invoke the tool through the project's own scripts; global installs belong to the user's decision, not to a plugin.
- **高 / HIGH** `prompt.embedded-instruction-string` — 源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model
  中 源码中的字符串字面量——通常是工具描述或系统提示词片段——要求模型绕过确认或对用户隐瞒某些事，于是它作为一条指令进入上下文窗口。
  EN A string literal in the source — typically a tool description or system prompt fragment — tells the model to bypass confirmation or to hide something from the user, so it lands in the context window as a directive.
  - `src/plugin/tool.ts:302` — `'Render an interactive UI card in the conversation tool row by passing a GenUI spec (a white-listed component tree; the same vocabulary as the ```dsh-ui fence, …`
  中 修复：如实描述工具的行为，删除那些会改变 agent 对待用户方式的指令。
  EN Fix: Describe the tool's behavior factually and remove directives that change how the agent treats the user.

### 中 / MEDIUM (7)

- **中 / MEDIUM** `cred.many-secret-env-vars` — 读取多个不同名称的密钥类环境变量 / Reads several differently-named secret environment variables
  中 这里的一行、或整个包里的若干行，读取了名称看起来像凭据的环境变量。只读一个文档中声明的 key 是插件本该有的认证方式；枚举多个不同名称的密钥，则是在收集凭据而不是在使用凭据。
  EN One line here, or several across the package, read environment variables whose names look like credentials. Reading a single documented key is how a plugin is meant to authenticate; enumerating many differently-named ones is how credentials are gathered rather than used.
  - `scripts/e2e.mjs:75` — `process.env.DEEPSEEK_API_KEY`
  中 修复：只保留插件确实需要且有文档说明的变量，删掉与任何功能无关的密钥读取。
  EN Fix: Keep to the variables this plugin documents and needs, and delete reads of keys it has no feature for.
- **中 / MEDIUM** `exfil.clipboard-read` — 读取系统剪贴板 / Reads the system clipboard
  中 该行通过 `pbpaste`、`xclip`、`wl-paste`、`Get-Clipboard` 或 `clipboardy` 读取剪贴板。剪贴板里经常放着刚刚复制过的密码、令牌和私密文本。
  EN The line reads the clipboard through `pbpaste`, `xclip`, `wl-paste`, `Get-Clipboard` or `clipboardy`. Clipboards routinely hold passwords, tokens and private text that were copied moments earlier.
  - `scripts/e2e.mjs:258` — `clipboard.readText(`
  中 修复：通过插件配置向用户索取该值，而不是读取剪贴板上恰好存在的内容。
  EN Fix: Ask the user for the value through the plugin config instead of reading whatever happens to be on the clipboard.
- **中 / MEDIUM** `install.hook-runs-shell-code` — 安装期钩子执行的不只是构建 / Lifecycle hook runs more than a build
  中 该钩子命令不属于常见的编译与拷贝步骤，安装这个包时会以用户权限运行任意代码，而这一切发生在任何人来得及检查之前。
  EN This hook command is not one of the usual compile-and-copy steps, so installing the package runs arbitrary code with the user's privileges before anything can be inspected.
  - `package.json:178` — `"prepack": "node scripts/prepack.mjs"`
  中 修复：把钩子收敛为 `tsc` 或 `npm run build` 之类的构建命令，或把这项工作移到一个由用户主动执行的显式脚本里。
  EN Fix: Reduce the hook to a build command such as `tsc` or `npm run build`, or move the work into an explicit script the user chooses to run.
- **中 / MEDIUM** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 14 distinct remote hosts (127.0.0.1:${port, fonts.googleapis.com, fonts.gstatic.com, github.com, react.dev, registry.npmjs.org, tailwindcss.com, www.w3.org, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `.github/workflows/ci.yml:47` — `https://github.com/deepseek-ai/deepseek-harness.git`
  - `.github/workflows/release.yml:34` — `https://registry.npmjs.org`
  - `package.json:57` — `https://github.com/omdsh-dev/dsh-genui.git`
  - `scripts/e2e-visual.mts:124` — `http://127.0.0.1:${PORT`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `scripts/e2e-visual.mts:124` — `http://127.0.0.1:${PORT`
  - `scripts/e2e.mjs:169` — `http://127.0.0.1:${PORT`
  - `src/plugin/index.ts:52` — `http://x`
  - `tests/e2e-auth.spec.ts:12` — `http://127.0.0.1:3190/?token=abc_DEF-123\n`
  - ……另有 3 处 / … and 3 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `prompt.concealed-instruction` — 把文本藏在注释或不可见字符中 / Hides text in a comment or invisible characters
  中 该行把内容藏在 HTML 注释里，或藏在零宽字符与双向控制字符之后，这些内容在 diff 或渲染后的文档中什么都看不见，却仍会作为文本被读取。
  EN The line conceals content either in an HTML comment or behind zero-width and bidirectional control characters, which render as nothing in a diff or a rendered document while still being read as text.
  - `README.md:226` — `## 🧑‍💻 Development`
  - `README.zh-CN.md:232` — `## 🧑‍💻 开发`
  中 修复：删除被隐藏的文本和不可见字符；审查者看不到的东西就不该出现在发布的包里。
  EN Fix: Delete the concealed text and the invisible characters; anything a reviewer cannot see does not belong in a shipped package.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 8 shipped file(s) are 64 KiB or larger and were not read as text, the largest being docs/screenshots/issue-159-light-surface.png at 186 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `docs/screenshots/issue-159-light-surface.png` — `190339 bytes not decoded as text`
  - `pnpm-lock.yaml:2865` — `undici-types@6.21.0:`
  - `pnpm-lock.yaml:4206` — `undici-types: 6.21.0`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (3)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `scripts/e2e.mjs:149` — `const hostSettings = join(homedir(), '.dsh/settings.yaml')`
  - `scripts/e2e.mjs:154` — `log('警告: 未找到 ~/.dsh/settings.yaml，模型可能不可用')`
  - `tests/install-script.spec.ts:123` — `const pkgSkill = join(e.profile, 'node_modules', '@changfenhuang', 'dsh-genui', 'SKILL.md')`
  - `tsdown.config.ts:113` — `'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV ?? 'production'),`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `obf.long-minified-line` — 整行是压缩或机器生成的数据块 / Line is a single minified or machine-generated blob
  中 该行超过 500 个字符且几乎没有空白，正是打包载荷、压缩字符串表或机器生成单行代码的样子。这样的一行用肉眼什么也审不出来。
  EN The line is over 500 characters with almost no whitespace, which is what a bundled payload, a packed string table or a machine-generated one-liner looks like. Nothing on such a line is reviewable by eye.
  - `tests/genui-fence-fallback.spec.tsx:111` — `'{"title":"DSH 侧可复用缝隙","gap":10,"items":[{"type":"table","columns":["缝隙","作用","recap 用法"],"rows":[["ctx.llm","provider 中立 LLM 流式服务","recap 生成调用（compact-basic / …`
  - `tests/genui-fence-fallback.spec.tsx:191` — `const REAL = '{"title":"11 个失败全清单","gap":8,"items":[{"type":"table","columns":["测试文件","测的是什么","为什么挂","跟我有关？"],"rows":[["hmr-config ×2","开发时配置文件热更新的监听行为","测试路径带符…`
  中 修复：发布未压缩的源码，或在 README 中说明该文件由哪个构建产出、可读源码在哪里。
  EN Fix: Ship unminified source, or state in the README which build produced the file and where the readable source lives.
- **低 / LOW** `persist.shell-rc-append` — 追加写入 shell 启动文件 / Appends to a shell startup file
  中 该行写入了 `.bashrc`、`.zshrc`、`.profile` 或 fish 配置，因此改动会在之后每个交互式 shell 中生效，而且删掉包目录也不会消失。
  EN The line writes into `.bashrc`, `.zshrc`, `.profile` or a fish config, so the change takes effect in every future interactive shell and survives removing the package directory.
  - `tests/install-script.spec.ts:166` — `rmSync(join(e.profile, 'node_modules', '@changfenhuang', 'dsh-genui', 'SKILL.md'))`
  中 修复：不要修改 shell 启动文件；如果需要 shell 集成，就把那行内容打印出来，由用户自行决定是否添加。
  EN Fix: Do not modify shell startup files; if a shell integration is required, print the line for the user to add deliberately.

_按类别 / By category:_ 网络回调 / network callbacks 4 · 数据外传 / exfiltration 3 · 凭据读取 / credential access 3 · 混淆 / obfuscation 2 · 持久化 / persistence 2 · 提示注入 / prompt injection 2 · 安装脚本 / install scripts 1 · 供应链 / supply chain 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `dsh-genui-HEAD/`
- skipped assets/demo.mp4: 2608997 bytes exceeds the 524288-byte per-file cap
- skipped site/assets/demo.mp4: 2608997 bytes exceeds the 524288-byte per-file cap
- skipped site/assets/index-CbA0uR5g.js: 615315 bytes exceeds the 524288-byte per-file cap
- not scanned (binary): assets/demo-thumb.png, assets/showcase-panel.png, assets/showcase-plot.png, assets/showcase.png, docs/screenshots/achievements.png and 8 more
- outbound fetching was permitted for this audit
- grade forced to D by a critical finding: exfil.environment-harvest-then-callback — Environment harvest and an outbound request in the same package
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
