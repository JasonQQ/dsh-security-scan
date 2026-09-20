> 批量压测 / Batch stress test · ★ 1711 · `superdesigndev/treg`
> https://github.com/superdesigndev/treg · audited in 29.6s
# 安装前体检 / Pre-install audit: treg-dsh@0.20.0

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/superdesigndev/treg/tar.gz/HEAD` (URL / url)
- 已分析文件：3394 个（27.7 MiB） / Files analysed: 3394 (27.7 MiB)
- 内容摘要 / Content digest: `78da4442709564705ee37136e3d29fac…`
- 体检时间 / Audited at: 2026-09-20T09:52:28.054Z

## 最严重的风险 / Most severe risk

**执行运行时拼装出来的代码 / Evaluates code built at runtime** `obf.dynamic-code-eval`

中 它把自己的写法藏了起来，所以读源码基本看不出它真正执行的是什么。
EN It hides how it is written, so reading it tells a reviewer little about what it actually executes.

该包会访问的目标：`api.openai.com`、`uguu.se`、`catbox.moe`、`litterbox.catbox.moe`、`json.schemastore.org`、`treg.to`、`github.com`、`127.0.0.1` / Destinations this package reaches: `api.openai.com`, `uguu.se`, `catbox.moe`, `litterbox.catbox.moe`, `json.schemastore.org`, `treg.to`, `github.com`, `127.0.0.1`

- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 它还安排了之后继续运行，所以仅仅卸载这个包并不够。
  EN It also arranges to run again later, so removing the package is not enough on its own.
- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `src/treg/web/vendor/vue-3.5.41.global.prod.js:14`；完整列表见下方「发现」。 / The rule that decided the grade fired at `src/treg/web/vendor/vue-3.5.41.global.prod.js:14`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `$CONFIG/source_globs`, `.words.json`, `{tmp}/filter.txt`, `.request.json`, `node:fs/promises`, `.env`, `{base}/sitemap.xml`, `{base}/{KEY}.txt`, `/tutorial.md`, `../../src/treg/web/enrich-arena/bench.js`, `vendor/vue-3.5.41.global.prod.js`, `enrich-arena.html` （另有 5 项） / (+5 more)
- **写入的文件路径 / File paths written:** `screenshot-test.db`, `SKILL.md`, `.cursor`, `.claude`, `.secrets`, `.secret`, `.config`, `.codex`, `.env`, `README.md`, `f.md`, `token.json`
- **派生的命令 / Commands spawned:** `node:child_process`, `win32`, `where`, `which`, `treg`, `inherit`, `sh`, `-c`, `curl -fsSL ${BASE}/install.sh | sh`
- **连接的域名 / Domains contacted:** `api.openai.com`, `uguu.se`, `catbox.moe`, `litterbox.catbox.moe`, `json.schemastore.org`, `treg.to`, `github.com`, `127.0.0.1`, `fonts.googleapis.com`, `fonts.gstatic.com`, `www.google.com`, `www.w3.org` （另有 229 项） / (+229 more)
- **读取的环境变量 / Environment variables read:** `TREG_TOKEN`, `PORT`, `SSL_CERT_FILE`, `NODE_EXTRA_CA_CERTS`, `HTTPS_PROXY`, `https_proxy`, `TREG_BASE_URL`

## 发现 / Findings

### 严重 / CRITICAL (2)

- **严重 / CRITICAL** `obf.dynamic-code-eval` — 执行运行时拼装出来的代码 / Evaluates code built at runtime
  中 该行执行的是一个并非源码字面量的表达式，真正运行的代码在插件运行时才被拼装出来，无法在 tarball 中审查。
  EN The line evaluates an expression that is not a source literal, so the executed code is assembled while the plugin runs and cannot be reviewed in the tarball.
  - `src/treg/web/vendor/vue-3.5.41.global.prod.js:14` — ``,0),a()),c||i("return "),e.codegenNode?an(e.codegenNode,n):i("null"),h&&(o(),i("}")),o(),i("}"),{ast:e,code:n.code,preamble:"",map:n.map?n.map.toJSON():void 0}…`
  - `src/treg/web/vendor/vue-3.5.41.global.prod.js:14` — `,0),a()),c||i("return "),e.codegenNode?an(e.codegenNode,n):i("null"),h&&(o(),i("}")),o(),i("}"),{ast:e,code:n.code,preamble:"",map:n.map?n.map.toJSON():void 0}}…`
  - `tests/js/arena-bench.test.cjs:4` — `const runtime={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../src/treg/web/enrich-arena/bench.js'),'utf8'),runtime);`
  - `tests/js/arena-template.test.cjs:12` — `vm.runInNewContext(fs.readFileSync(path.join(web,'vendor/vue-3.5.41.global.prod.js'),'utf8'),runtime);`
  - ……另有 3 处 / … and 3 more location(s)
  中 修复：用静态函数或数据表替代动态求值；任何审计都无法为运行时才存在的代码背书。
  EN Fix: Replace the dynamic evaluation with a static function or a data table; there is no audit that can vouch for code that does not exist until runtime.
- **严重 / CRITICAL** `priv.curl-pipe-shell` — 把下载内容直接管道给 shell / Pipes a download straight into a shell
  中 一步完成“拉取脚本并执行”，运行的就是远端服务器当时返回的任何内容；既没有可计算哈希、可审查、可固定版本的产物，服务器一旦被攻破就等于这台机器被攻破。
  EN Fetching a script and executing it in one step runs whatever the remote server returns at that moment; there is no artifact to hash, review or pin, and a compromise of the server becomes a compromise of this machine.
  - `packages/npm/bin/treg.js:42` — `curl -fsSL ${BASE}/install.sh | sh`
  - `packages/npm/bin/treg.js:47` — `curl -fsSL ${BASE}/install.sh | sh`
  - `src/treg/web/install.sh:60` — `curl -LsSf https://astral.sh/uv/install.sh | sh`
  中 修复：先下载产物、校验其校验和，再执行校验通过的文件；绝不要把下载内容管道给解释器。
  EN Fix: Download the artifact, verify its checksum, and execute the verified file; never pipe a download into an interpreter.

### 高 / HIGH (11)

- **高 / HIGH** `destructive.recursive-delete-system-path` — 递归删除指向用户主目录或系统目录 / Recursive delete aimed at a home or system directory
  中 递归删除的目标是用户主目录或系统路径，一旦变量写错、展开为空或缺少判空保护，被销毁的就是用户数据而不是包自己的构建产物。
  EN A recursive delete targets a home directory or a system path, so a wrong variable, an empty expansion or a missing guard destroys user data instead of the package's own build output.
  - `scripts/fresh-test-reset.sh:25` — `rm -rf "$HOME/.treg" && say "~/.treg" "removed (login + proxy state)"`
  - `scripts/fresh-test-reset.sh:32` — `rm -rf "$HOME/.claude/skills/treg" && say "~/.claude/skills/treg" "removed"`
  中 修复：只删除包在自己目录下创建的路径，并在解析出的路径不位于该目录内时拒绝执行。
  EN Fix: Delete only paths the package created under its own directory, and refuse to run when the resolved path is not inside it.
- **高 / HIGH** `exfil.curl-post-body` — 用 curl 上传本地文件 / Uploads a local file with curl
  中 该命令把磁盘上的文件 POST 到远程端点（`-d @`、`--data-binary @`、`-F …=@`、`-T`），本质上是伪装成表单提交的文件上传。
  EN The command posts a file from disk to a remote endpoint (`-d @`, `--data-binary @`, `-F …=@`, `-T`), which is a file upload disguised as a form post.
  - `tests/fixtures/aggregators/monid_miss_zero_cost.json:63` — `curl -X POST`
  - `tests/fixtures/aggregators/monid_ok_sync.json:86` — `curl -X POST`
  中 修复：删除这次上传，或让目标地址显式且可配置，使用户能看清自己的数据去了哪里。
  EN Fix: Remove the upload, or make the destination explicit and configurable so a user can see where their data goes.
- **高 / HIGH** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 240 distinct remote hosts (api.openai.com, catbox.moe, fonts.googleapis.com, github.com, json.schemastore.org, litterbox.catbox.moe, treg.to, uguu.se, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `.agents/skills/ugc-talking-head-video/scripts/caption_burn.py:64` — `https://api.openai.com/v1/audio/transcriptions`
  - `.agents/skills/ugc-talking-head-video/scripts/host_file.py:27` — `https://uguu.se/upload`
  - `.agents/skills/ugc-talking-head-video/scripts/host_file.py:32` — `https://catbox.moe/user/api.php`
  - `.agents/skills/ugc-talking-head-video/scripts/host_file.py:36` — `https://litterbox.catbox.moe/resources/internals/api.php`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `.github/workflows/ci.yml:81` — `TREG_TEST_DB_URL: postgresql+asyncpg://treg:treg@127.0.0.1:5432/treg_test`
  - `e2e-server.sh:40` — `echo "e2e server up on http://127.0.0.1:$PORT (db $HERE/e2e.db, log $LOG)"`
  - `src/treg/catalog/examples/diffbot.x.extract-video.json:23` — `"url": "https://rr2---sn-8xgp1vo-ab5k.googlevideo.com/videoplayback?expire=1783561226&ei=qqdOar_6LLq0kucPk6G2yAM&ip=75.197.54.91&id=o-ADXxgto9LZ1G1NJRUY90G4DYIg…`
  - `src/treg/catalog/examples/diffbot.x.extract-video.json:27` — `"html": "<video controls><source src=\"https://rr2---sn-8xgp1vo-ab5k.googlevideo.com/videoplayback?expire=1783561226&ei=qqdOar_6LLq0kucPk6G2yAM&ip=75.197.54.91&…`
  - ……另有 8 处 / … and 8 more location(s)
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **高 / HIGH** `net.token-or-blob-in-url` — 把凭据或编码数据块放进 URL / Puts a credential or encoded blob in a URL
  中 令牌形状的查询参数、内嵌的 `user:password` 授权部分，或超长高熵的查询值，都意味着密钥或载荷数据在 URL 中传输，最终会留在访问日志、代理和浏览器历史里。
  EN A token-shaped query parameter, an embedded `user:password` authority, or a long high-entropy query value means secret material or payload data travels in a URL, where it lands in access logs, proxies and browser history.
  - `.github/workflows/ci.yml:81` — `//treg:treg@`
  - `src/treg/catalog/examples/anyapi.facebook.user.posts.json:13` — `"https://scontent-phl2-1.xx.fbcdn.net/v/t51.82787-10/549104239_18565912819020081_2330706867671026439_n.jpg?stp=dst-jpg_s960x960_tt6&_nc_cat=101&ccb=1-7&_nc_sid=…`
  - `src/treg/catalog/examples/anyapi.facebook.user.posts.json:14` — `"https://video-phl2-1.xx.fbcdn.net/o1/v/t2/f2/m86/AQNrPdap6OftBP5OG6byX9Zra9AIeTlJgFFSnCnQtKX-YrtZwceyclf7S_s9vyochvQvd5rnHPfbDksk867PaxJsnJKbOjIMokT-UHM.mp4?_n…`
  - `src/treg/catalog/examples/anyapi.facebook.user.posts.json:27` — `"https://scontent-phl2-1.xx.fbcdn.net/v/t51.82787-10/548838919_18565615666020081_158902364425729178_n.jpg?stp=dst-jpg_s960x960_tt6&_nc_cat=104&ccb=1-7&_nc_sid=5…`
  - ……另有 838 处 / … and 838 more location(s)
  中 修复：凭据放在 Authorization 头里发送，载荷用 POST 放在请求体中，不要编码进查询字符串。
  EN Fix: Send credentials in an Authorization header, and POST payloads in the body rather than encoding them into the query string.
- **高 / HIGH** `persist.global-self-install` — 全局安装依赖包 / Installs a package globally
  中 该命令把包安装到全局前缀，于是用户的 PATH 上多出一个可执行文件，而且当前项目删除后它仍然留在那里。
  EN The command installs a package into the global prefix, which puts a new executable on the user's PATH and keeps it there after the current project is deleted.
  - `src/treg/web/tutorial.js:347` — `npm i -g`
  中 修复：改为本地安装，并通过项目自身的脚本调用该工具；全局安装应由用户自己决定，而不是由插件代劳。
  EN Fix: Install locally and invoke the tool through the project's own scripts; global installs belong to the user's decision, not to a plugin.
- **高 / HIGH** `priv.sudo-invocation` — 通过 sudo 提权 / Escalates with sudo
  中 该行通过 `sudo` 执行命令，意味着这个以用户级工具身份安装的插件在索要 root 权限，而用户事先看不到提权提示。
  EN The line runs a command through `sudo`, so the plugin is asking for root on a machine where it was installed as a user-level tool and where the user cannot see the escalation prompt in advance.
  - `.github/workflows/ci.yml:157` — `sudo mv gitleaks /usr/local/bin/`
  - `src/treg/web/tutorial.js:222` — `explain: "Now Bob runs Stripe's real CLI <i>through</i> treg. Everything after <code>--</code> is handed to the vendor tool verbatim. treg injects the credentia…`
  - `src/treg/web/tutorial.js:383` — `explain: "A local run puts a shared team key on a member's machine for the length of one command. That is only safe if the member cannot capture the key. <code>…`
  - `src/treg/web/tutorial.js:384` — `cmd: `sudo treg setup-local-run`,`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：去掉提权，把任何需要特权的步骤写成一条由用户主动执行的独立命令并加以说明。
  EN Fix: Remove the escalation and document any privileged step as a separate command the user runs deliberately.
- **高 / HIGH** `priv.system-path-modification` — 修改系统路径或把文件设为全局可写 / Modifies a system path or makes a file world-writable
  中 该行写入 `/etc`、`/usr`、`/bin` 或 launch daemon 目录，把属主改为 root，或设置全局可写权限。任何一种都改变了安装包之外的机器状态，也可能为后续提权铺路。
  EN The line writes under `/etc`, `/usr`, `/bin` or a launch-daemon directory, changes ownership to root, or sets world-writable permissions. Any of these changes the machine beyond the installed package and can prepare an escalation later.
  - `.github/workflows/ci.yml:157` — `sudo mv gitleaks /usr/local/bin/`
  - `src/treg/web/tutorial.js:392` — `notice: "The command ran as <b>uid=380(treg-run)</b>, not as you. One requirement: treg itself must be installed at a system path (e.g. <code>/usr/local/bin</co…`
  中 修复：把写入限制在包目录或用户自己的配置目录内，绝不要为了让安装成功而放宽权限。
  EN Fix: Keep writes inside the package or the user's own configuration directory, and never loosen permissions to make an install succeed.
- **高 / HIGH** `prompt.doc-instruction` — 文档中包含针对模型的指令 / Documentation contains instructions aimed at a model
  中 随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。
  EN A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.
  - `.agents/skills/ads-conversion-tracking/SKILL.md:84` — `It also misses `treg cli run` / `treg with`, which bypass `/call/` entirely.`
  - `docs/CLAUDE-PLUGIN.md:183` — `the CLI source: `isSuspicious` only prints an install-time warning that `--force` bypasses; only`
  - `docs/context/architecture/aiark.md:113` — `shared platform key; BYOK calls bypass shared-key smoothing. The funded allowance was not exhausted,`
  - `docs/context/architecture/archive.md:190` — `Terminal evidence bypasses best-effort queue admission and synchronously retries uploads up to`
  - ……另有 22 处 / … and 22 more location(s)
  中 修复：把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。
  EN Fix: Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.
- **高 / HIGH** `prompt.embedded-instruction-string` — 源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model
  中 源码中的字符串字面量——通常是工具描述或系统提示词片段——要求模型绕过确认或对用户隐瞒某些事，于是它作为一条指令进入上下文窗口。
  EN A string literal in the source — typically a tool description or system prompt fragment — tells the model to bypass confirmation or to hide something from the user, so it lands in the context window as a directive.
  - `src/treg/catalog/diffbot.extended.yaml:452` — `"set 0 to bypass robots.txt"`
  - `src/treg/catalog/diffbot.extended.yaml:532` — `"set 0 to bypass robots.txt"`
  - `src/treg/catalog/pdl.extended.yaml:120` — `"bypass last_requested_version for filter_updated"`
  中 修复：如实描述工具的行为，删除那些会改变 agent 对待用户方式的指令。
  EN Fix: Describe the tool's behavior factually and remove directives that change how the agent treats the user.
- **高 / HIGH** `prompt.fake-system-message` — 文本伪装成系统消息 / Text impersonates a system message
  中 这段文字模仿系统或开发者消息的形式（`<system>`、`[SYSTEM]`、`<<SYS>>`、“system message:”）。自称拥有特权角色的内容，是想在模型上下文中抬高自己的权威。
  EN The text is shaped like a system or developer message (`<system>`, `[SYSTEM]`, `<<SYS>>`, "system message:"). Content that claims a privileged role is an attempt to raise its own authority inside the model's context.
  - `src/treg/catalog/minimax.yaml:549` — `[system]`
  中 修复：删除这些角色标记；面向用户的文本绝不应该被写成看起来像宿主指令的样子。
  EN Fix: Remove the role markers; user-visible text should never be formatted to look like harness instructions.

### 中 / MEDIUM (6)

- **中 / MEDIUM** `cred.read-dotenv-or-history` — 读取 dotenv 文件或 shell 历史 / Reads a dotenv file or shell history
  中 该行读取了 `.env` 或 shell 历史文件。这两处都是令牌、云密钥和曾经粘贴过的密钥堆积的地方，而 shell 历史还会勾勒出用户的基础设施全貌。
  EN This line reads `.env` or a shell history file. Both are where tokens, cloud keys and previously pasted secrets accumulate, and a shell history also maps out the user's infrastructure.
  - `src/treg/web/tutorial.js:273` — `cmd: `treg admin login --token "$(grep -E '^TREG_ADMIN_TOKEN=' .env | cut -d= -f2-)"`,`
  中 修复：通过插件配置 schema 加载配置，而不是读取 dotenv 文件；永远不要打开用户的历史记录。
  EN Fix: Load configuration through the plugin config schema instead of reading dotenv files, and never open the user's history.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `e2e-server.sh:40` — `http://127.0.0.1:$PORT`
  - `examples/proxy-demo/server.js:254` — `http://localhost:${PORT`
  - `scripts/dev-local.sh:74` — `http://localhost:$PORT`
  - `scripts/dev-local.sh:99` — `http://localhost:%s`
  - ……另有 156 处 / … and 156 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `obf.long-minified-line` — 整行是压缩或机器生成的数据块 / Line is a single minified or machine-generated blob
  中 该行超过 500 个字符且几乎没有空白，正是打包载荷、压缩字符串表或机器生成单行代码的样子。这样的一行用肉眼什么也审不出来。
  EN The line is over 500 characters with almost no whitespace, which is what a bundled payload, a packed string table or a machine-generated one-liner looks like. Nothing on such a line is reviewable by eye.
  - `src/treg/web/enrich-arena/arena.js:148` — `template:`<div class="composer-tab-scroll"><div class="composer-tab-viewport"><div ref="scroller" class="composer-tabs" role="tablist" aria-label="Use case" @ke…`
  - `src/treg/web/enrich-arena/arena.js:153` — `components:{ArenaTaskTabs,TregTryItOut:TregAgentSetup.TryItOut,TregAgentPicker:TregAgentSetup.AgentPicker,TregSetupInstructions:TregAgentSetup.SetupInstructions…`
  - `src/treg/web/sitetrack.js:74` — `!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=func…`
  - `src/treg/web/sitetrack.js:74` — `.scripttext/javascriptanonymous.i.posthog.com-assets.i.posthog.com/static/array.jsscriptposthogposthogposthog. (stub).people (stub)init capture register registe…`
  - ……另有 6 处 / … and 6 more location(s)
  中 修复：发布未压缩的源码，或在 README 中说明该文件由哪个构建产出、可读源码在哪里。
  EN Fix: Ship unminified source, or state in the README which build produced the file and where the readable source lives.
- **中 / MEDIUM** `persist.shell-rc-append` — 追加写入 shell 启动文件 / Appends to a shell startup file
  中 该行写入了 `.bashrc`、`.zshrc`、`.profile` 或 fish 配置，因此改动会在之后每个交互式 shell 中生效，而且删掉包目录也不会消失。
  EN The line writes into `.bashrc`, `.zshrc`, `.profile` or a fish config, so the change takes effect in every future interactive shell and survives removing the package directory.
  - `src/treg/catalog/brightdata.extended.yaml:65` — `note: same generic runner as brightdata.web.scrape.structured with dataset_id fixed to this dataset (see that entry and brightdata.instagram.user.profile in the…`
  - `src/treg/catalog/brightdata.extended.yaml:115` — `note: same generic runner as brightdata.web.scrape.structured with dataset_id fixed to this dataset (see that entry and brightdata.instagram.user.profile in the…`
  - `src/treg/catalog/brightdata.extended.yaml:156` — `note: same generic runner as brightdata.web.scrape.structured with dataset_id fixed to this dataset (see that entry and brightdata.instagram.user.profile in the…`
  - `src/treg/catalog/brightdata.extended.yaml:197` — `note: same generic runner as brightdata.web.scrape.structured with dataset_id fixed to this dataset (see that entry and brightdata.instagram.user.profile in the…`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：不要修改 shell 启动文件；如果需要 shell 集成，就把那行内容打印出来，由用户自行决定是否添加。
  EN Fix: Do not modify shell startup files; if a shell integration is required, print the line for the user to add deliberately.
- **中 / MEDIUM** `prompt.concealed-instruction` — 把文本藏在注释或不可见字符中 / Hides text in a comment or invisible characters
  中 该行把内容藏在 HTML 注释里，或藏在零宽字符与双向控制字符之后，这些内容在 diff 或渲染后的文档中什么都看不见，却仍会作为文本被读取。
  EN The line conceals content either in an HTML comment or behind zero-width and bidirectional control characters, which render as nothing in a diff or a rendered document while still being read as text.
  - `.agents/skills/tools-registry-context/MAP.md:3` — `GENERATED by scripts/build-map.py — do not edit by hand; edit fragment frontmatter instead`
  - `.agents/skills/tools-registry-context/scripts/build-map.py:27` — `GENERATED by scripts/build-map.py — do not edit by hand; edit fragment frontmatter instead`
  - `docs/context/interface/catalog-review-proposal.md:93` — `because `"ads"` is a substring of `"le​ads"`. That is fixed in **(c)** — People no longer has`
  - `docs/context/interface/catalog-review-proposal.md:116` — `- `ads` matched inside **le​ads** → an **"ads"** section of 10 Hunter lead endpoints on the`
  - ……另有 20 处 / … and 20 more location(s)
  中 修复：删除被隐藏的文本和不可见字符；审查者看不到的东西就不该出现在发布的包里。
  EN Fix: Delete the concealed text and the invisible characters; anything a reviewer cannot see does not belong in a shipped package.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 31 shipped file(s) are 64 KiB or larger and were not read as text, the largest being docs/image.png at 426 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `docs/image.png` — `436249 bytes not decoded as text`
  - `scripts/backfill_call_archive_links.py:70` — `rows = await conn.fetch(MATCH_SQL, float(window_s))`
  - `scripts/catalog_drift.py:102` — `def fetch(url: str) -> str:`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (2)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `e2e-server.sh:22` — `set -a; . "$HERE/.env"; set +a`
  - `pyproject.toml:275` — `".env", ".env.*", # belt and braces: a credential file must never reach a tarball`
  - `scripts/data/anyapi_measured_charges.json:143` — `"douyin.profile": {`
  - `scripts/data/anyapi_measured_charges.json:287` — `"facebook.profile": {`
  - ……另有 139 处 / … and 139 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `obf.decoded-payload-literal` — 携带解码、转义或高熵字面量 / Carries a decoded, escaped or high-entropy literal
  中 一个很长的字面量会在运行时被解码（base64、`atob`、`unescape`、`decodeURIComponent`），或者写满了密集的十六进制、Unicode 转义，或者呈现出编码数据块那种近乎均匀的字符分布。
  EN A long literal is decoded at runtime (base64, `atob`, `unescape`, `decodeURIComponent`), written with dense hex or unicode escapes, or has the near-uniform character distribution of an encoded blob.
  - `examples/proxy-demo/server.js:39` — `const auth = Buffer.from(`${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}`).toString("base64");`
  中 修复：把该值保存为可读源码，或保存为格式有文档说明的数据，让审查者能看清实际运行的到底是什么。
  EN Fix: Store the value as readable source or as data with a documented format, so a reviewer can see what is actually being run.

_按类别 / By category:_ 网络回调 / network callbacks 4 · 提示注入 / prompt injection 4 · 混淆 / obfuscation 3 · 提权 / privilege 3 · 持久化 / persistence 2 · 凭据读取 / credential access 2 · 破坏性 / destructive 1 · 数据外传 / exfiltration 1 · 供应链 / supply chain 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `treg-HEAD/`
- skipped src/treg/catalog/dataforseo.extended.yaml: 895325 bytes exceeds the 524288-byte per-file cap
- skipped src/treg/catalog/tikhub.extended.yaml: 1064834 bytes exceeds the 524288-byte per-file cap
- skipped src/treg/web/index.html: 562222 bytes exceeds the 524288-byte per-file cap
- skipped src/treg/web/logos/contactout.svg: 1465742 bytes exceeds the 524288-byte per-file cap
- skipped src/treg/web/logos/wiza.svg: 665187 bytes exceeds the 524288-byte per-file cap
- skipped src/treg/web/media/astra/launch.mp4: 5523350 bytes exceeds the 524288-byte per-file cap
- skipped src/treg/web/media/treg-chatgpt-demo.mp4: 15274322 bytes exceeds the 524288-byte per-file cap
- skipped src/treg/web/media/ugc/demo.mp4: 3934311 bytes exceeds the 524288-byte per-file cap
- skipped src/treg/web/media/ugc/hero/h1.mp4: 1248372 bytes exceeds the 524288-byte per-file cap
- skipped src/treg/web/media/ugc/hero/h2.mp4: 720954 bytes exceeds the 524288-byte per-file cap
- skipped src/treg/web/media/ugc/hero/h3.mp4: 728520 bytes exceeds the 524288-byte per-file cap
- ……另有 9 项 / … and 9 more

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
