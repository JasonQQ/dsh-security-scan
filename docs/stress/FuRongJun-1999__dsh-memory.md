> 批量压测 / Batch stress test · ★ 225 · `FuRongJun-1999/dsh-memory`
> https://github.com/FuRongJun-1999/dsh-memory · audited in 8.9s
# 安装前体检 / Pre-install audit: @furongjun1999/dsh-memory@0.4.11

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/FuRongJun-1999/dsh-memory/tar.gz/HEAD` (URL / url)
- 已分析文件：1801 个（18.7 MiB） / Files analysed: 1801 (18.7 MiB)
- 内容摘要 / Content digest: `d9dd25504b4eda4991ff6949bfd8e23d…`
- 体检时间 / Audited at: 2026-09-20T09:53:39.794Z

## 最严重的风险 / Most severe risk

**凭据读取、解码步骤与对外请求同时出现 / Credential read, decoding step and outbound request together** `exfil.credential-read-decode-callback`

中 数据会离开这台机器。该包中有代码把本机上的内容发往外部地址。
EN Data leaves this machine. Something in this package takes content that lives here and sends it to a destination outside it.

该包会访问的目标：`github.com`、`baike.baidu.com`、`creativecommons.org`、`huggingface.co`、`cdn.jsdelivr.net`、`127.0.0.1`、`registry.npmjs.org`、`api.deepseek.com` / Destinations this package reaches: `github.com`, `baike.baidu.com`, `creativecommons.org`, `huggingface.co`, `cdn.jsdelivr.net`, `127.0.0.1`, `registry.npmjs.org`, `api.deepseek.com`

- 中 它发生在安装时：`prepare` 脚本会执行它，你不需要自己运行任何东西。
  EN It happens at install time: the `prepare` script runs it, so you do not have to run anything yourself.
- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 它还安排了之后继续运行，所以仅仅卸载这个包并不够。
  EN It also arranges to run again later, so removing the package is not enough on its own.
- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `src/lib/token_store.ts:39`；完整列表见下方「发现」。 / The rule that decided the grade fired at `src/lib/token_store.ts:39`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

- `prepare` (`package.json`): `node -e "const fs=require('fs');const tsc='node_modules/typescript/bin/tsc';fs.existsSync(tsc)?(fs.rmSync('lib',{recursive:true,force:true}),require('child_process').execFileSync(process.execPath,[tsc,'-p','tsconfig.json'],{stdio:'inherit'})):console.log('[prepare] 跳过构建：typescript 未安装（NODE_ENV=production 或 --omit=dev 会省略 devDependencies）——需要构建请用 npm install --include=dev')"`

发布期钩子（维护者打包或发布时运行，安装时不会执行）： / Publish-time hooks (run when the maintainer packs or publishes, not on install):

- `prepublishOnly`: `npm run build && npm test && python scripts/check_publish_artifact.py`

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `spec.json`, `log.txt`, `result.json`, `_serve.json`, `status.json`, `/proc/{pid}/cmdline`, `claimed.lock`, `big.png`, `photo.jpg`, `notes.txt`, `archive.bin`, `lines.txt` （另有 76 项） / (+76 more)
- **写入的文件路径 / File paths written:** `node_modules/typescript/bin/tsc`, `tsconfig.json`, `heartbeat.web.stamp`, `last_contact.json`, `\n`, `package.json`, `data/mdcg`, `mem.md`, `data/mdcg/mem.md`, `ledger.jsonl`, `data/ledger.jsonl`, `paths.json` （另有 2 项） / (+2 more)
- **派生的命令 / Commands spawned:** `spawn_subtask`, `poll_subtasks`, `read_full`, `ok`, `error`, `B4 缺 user_prompt 诚实拒`, `user_prompt`, `tools`, `context_files`, `无此文件`, `子任务甲：统计 A 目录`, `lingshu_cg` （另有 26 项） / (+26 more)
- **连接的域名 / Domains contacted:** `github.com`, `baike.baidu.com`, `creativecommons.org`, `huggingface.co`, `cdn.jsdelivr.net`, `127.0.0.1`, `registry.npmjs.org`, `api.deepseek.com`, `open.bigmodel.cn`, `html.duckduckgo.com`, `a.example`, `b.example` （另有 16 项） / (+16 more)
- **读取的环境变量 / Environment variables read:** `BOCHA_API_KEY`, `AEIS_DESIGNER_KEY`, `DEEPSEEK_API_KEY`, `X`, `MDCG_TOKEN`, `DSH_ROOT`, `HIVE_REPO`, `HIVE_LIB`, `MDCG_ROOT`, `MDCG_LEGACY_ENV_AUTH`, `DSH_HOME`, `PYTHONPATH` （另有 4 项） / (+4 more)

## 发现 / Findings

### 严重 / CRITICAL (3)

- **严重 / CRITICAL** `exfil.credential-read-decode-callback` — 凭据读取、解码步骤与对外请求同时出现 / Credential read, decoding step and outbound request together
  中 编码外传的三个要素全部齐备：读取了凭据，有解码或编码动作，并且有请求离开本机。编码这一步的作用，正是让随便看一眼流量的人看不出其中的密钥。
  EN All three ingredients of an encoded exfiltration are present: a credential is read, something is decoded or encoded, and a request leaves the machine. The encoding step is what hides the secret from a casual look at the traffic.
  - `src/lib/token_store.ts:39` — `| 'keyring' // 密钥环 ~/.mdcg/token`
  - `src/lib/token_store.ts:166` — `if (fromRing) return { token: fromRing, source: 'keyring', keyringPath }`
  - `md_cg/crypto.py:202` — `# 生效条件：master_file=None、env_var=MASTER_ENV、create=True 为可选入参；从 os.environ.get(env_var) 读取并 strip，若 raw 非空则长度 64 走 bytes.fromhex、否则 _b64d，解码失败抛 CryptoError；否则 pa…`
  - `md_cg/crypto.py:208` — `return bytes.fromhex(raw) if len(raw) == 64 else _b64d(raw)`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：删除凭据读取或对外调用。绝不要发布既接触密钥、又在向外发送途中编码载荷的包。
  EN Fix: Remove the credential read or the outbound call. Never ship a package that both touches secrets and encodes a payload on its way out.
- **严重 / CRITICAL** `exfil.credential-read-then-callback` — 同一个包内既有凭据文件读取又有对外请求 / Credential file read and an outbound request in the same package
  中 既读取凭据文件又发起对外请求的包，已经凑齐了窃取凭据的两半。单独看每一半都能找到理由，合在一起就只能解释为数据被送出本机。
  EN A package that reads a credential file and also makes outbound requests has the two halves of credential theft. Individually each half can be justified; together they only make sense as data leaving the machine.
  - `src/lib/token_store.ts:39` — `| 'keyring' // 密钥环 ~/.mdcg/token`
  - `src/lib/token_store.ts:166` — `if (fromRing) return { token: fromRing, source: 'keyring', keyringPath }`
  - `md_cg/whitebox_kb/wisdom/browser_units.py:115` — `"def build_get_request(url, host, headers=None):\n"`
  - `md_cg/whitebox_kb/wisdom/chat.html:163` — `const r = await fetch('/chat', {`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：删除凭据读取。如果对外调用才是真正的功能，那么包内任何地方都不应在它之前读取密钥文件。
  EN Fix: Remove the credential read. If the outbound call is the real feature, it must not be preceded by a read of a secret file anywhere in the package.
- **严重 / CRITICAL** `install.hook-with-network-callback` — 安装钩子叠加对外网络访问 / Install hook combined with outbound network access
  中 该包声明了生命周期钩子，同时又建立对外连接，于是安装期运行的代码可以使用网络。无论这个钩子做什么，它可能拉取或发送的载荷都不在 tarball 里。
  EN The package declares a lifecycle hook whose command reaches the network, so code runs at install time with the ability to fetch or send payloads that are not in the tarball.
  - `package.json:81` — `"prepare": "node -e \"const fs=require('fs');const tsc='node_modules/typescript/bin/tsc';fs.existsSync(tsc)?(fs.rmSync('lib',{recursive:true,force:true}),requir…`
  中 修复：删除该钩子或网络访问。需要联网的安装应当成为由用户主动执行的一步。
  EN Fix: Remove the network access from the hook, or remove the hook. An install that needs the network should be an explicit step the user runs.

### 高 / HIGH (9)

- **高 / HIGH** `cred.credential-read-with-command-execution` — 同一个包内既有凭据文件读取又有 shell 执行 / Credential file read and shell execution in the same package
  中 这个包里某处读取了凭据文件，另一处又启动了进程。仅这一组合就足以把密钥管道给命令、通过 CLI 把它外传，或用窃取到的材料改写本机配置。
  EN A credential file is read somewhere in this package and a process is spawned somewhere else. That pairing is enough to pipe a secret into a command, exfiltrate it through a CLI, or rewrite the machine's configuration from stolen material.
  - `src/lib/token_store.ts:39` — `| 'keyring' // 密钥环 ~/.mdcg/token`
  - `src/lib/token_store.ts:166` — `if (fromRing) return { token: fromRing, source: 'keyring', keyringPath }`
  - `hive/hive_mcp/mcp_server.py:274` — `def _t_spawn(a: dict) -> dict:`
  - `hive/orch.py:315` — `def _spawn(a: dict) -> dict:`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：删除凭据读取，并把进程启动限制在完全不会接触到密钥值的命令上。
  EN Fix: Remove the credential access, and keep process spawning limited to commands that never see secret values.
- **高 / HIGH** `cred.read-system-secret` — 读取系统密钥库或钥匙串 / Reads a system secret store or keychain
  中 该行读取了 `/etc/shadow`、钥匙串文件或 `.git-credentials`，或者通过 `security`、`keytar` 之类的库操作 macOS 钥匙串，从而拿到其他应用保存的密码。
  EN The line reads `/etc/shadow`, a keychain file, `.git-credentials`, or drives the macOS keychain through `security`, `keytar` or an equivalent library, which exposes stored passwords for other applications.
  - `src/lib/token_store.ts:39` — `| 'keyring' // 密钥环 ~/.mdcg/token`
  - `src/lib/token_store.ts:166` — `if (fromRing) return { token: fromRing, source: 'keyring', keyringPath }`
  中 修复：删除这次读取。确实需要某个已保存的密钥时，应向用户索取，并通过有文档说明的宿主配置项读取。
  EN Fix: Remove the read. If a stored secret is required, ask the user and read it through a documented harness configuration key.
- **高 / HIGH** `install.hook-network-fetch` — 安装期钩子在安装时访问网络 / Lifecycle hook fetches from the network
  中 npm 生命周期钩子在安装期间访问网络，这意味着安装不再能从 tarball 复现，拉取到的内容既无版本约束也未经过审计。
  EN An npm lifecycle hook reaches the network during install, which means installation is no longer reproducible from the tarball and the fetched content is unversioned and unaudited.
  - `package.json:81` — `"prepare": "node -e \"const fs=require('fs');const tsc='node_modules/typescript/bin/tsc';fs.existsSync(tsc)?(fs.rmSync('lib',{recursive:true,force:true}),requir…`
  中 修复：去掉这次网络请求，或把产物随包内置，并在使用前校验其摘要。
  EN Fix: Drop the fetch, or vendor the artifact into the package and verify its digest before use.
- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `dsh/update-lingshu.ps1:267` — `Log 'DSH 已在新窗口启动；浏览器访问 http://127.0.0.1:3080'`
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **高 / HIGH** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `dsh/hive-mcp-probe.mjs:32` — `const { Client } = await import(SDK + '/client/index.js')`
  - `dsh/hive-mcp-probe.mjs:33` — `const { StdioClientTransport } = await import(SDK + '/client/stdio.js')`
  - `test/datapath-migration.test.ts:46` — `const m = await import(${JSON.stringify(entry)})`
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.
- **高 / HIGH** `persist.dsh-settings-rewrite` — 改写 DSH 配置或 profile / Rewrites DSH settings or profiles
  中 该行写入了宿主配置（`~/.dsh/settings.yaml`、profile 或 storages）。改动 profile 会改变此后每次宿主启动时加载哪些插件，以及它们如何配置。
  EN The line writes into the harness configuration (`~/.dsh/settings.yaml`, profiles or storages). Changing the profile changes which plugins load and how they are configured on every future harness start.
  - `docs/discipline/harnesses.yaml:64` — `path: '~/.dsh/profiles/web/cordis.patch.yml'`
  中 修复：把用户应当应用的配置打印出来，而不是直接写宿主的运行状态。
  EN Fix: Print the configuration the user should apply instead of writing the harness state directly.
- **高 / HIGH** `persist.global-self-install` — 全局安装依赖包 / Installs a package globally
  中 该命令把包安装到全局前缀，于是用户的 PATH 上多出一个可执行文件，而且当前项目删除后它仍然留在那里。
  EN The command installs a package into the global prefix, which puts a new executable on the user's PATH and keeps it there after the current project is deleted.
  - `.github/workflows/install-verify.yml:44` — `npm install -g`
  中 修复：改为本地安装，并通过项目自身的脚本调用该工具；全局安装应由用户自己决定，而不是由插件代劳。
  EN Fix: Install locally and invoke the tool through the project's own scripts; global installs belong to the user's decision, not to a plugin.
- **高 / HIGH** `persist.persistence-with-install-hook` — 安装钩子叠加持久化机制 / Install hook combined with a persistence mechanism
  中 生命周期钩子在安装期间运行，而目录树中又有东西把自己注册为稍后运行。这一组合会在用户以为只是一次普通依赖安装的过程中装入一个常驻组件。
  EN A lifecycle hook runs during install and something in the tree registers itself to run later. The combination installs a resident component during what the user believed was a normal dependency install.
  - `docs/discipline/harnesses.yaml:64` — `path: '~/.dsh/profiles/web/cordis.patch.yml'`
  - `.github/workflows/install-verify.yml:44` — `npm install -g`
  - `package.json:81` — `"prepare": "node -e \"const fs=require('fs');const tsc='node_modules/typescript/bin/tsc';fs.existsSync(tsc)?(fs.rmSync('lib',{recursive:true,force:true}),requir…`
  中 修复：删除这一定时注册。任何需要持续运行的东西，都应由用户作为一个明确可见的步骤来设置。
  EN Fix: Remove the scheduling. Anything that should keep running must be set up by the user as a deliberate, visible step.
- **高 / HIGH** `prompt.doc-instruction` — 文档中包含针对模型的指令 / Documentation contains instructions aimed at a model
  中 随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。
  EN A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.
  - `docs/mdcg/D_meta_工程化方案_v0.2.md:202` — `4. **统一变量边界**：审美/创造/非任务探索的 `bypass_gain=True` 已存在，D_meta 只做排序加分不改变资格筛选，不侵犯边界条款。`
  - `docs/mdcg/README详细版_v0.4.10.md:605` — `- **自动召回注入**（`memory.autoRecall`）：每次模型请求组装 system prompt 时自动注入灵枢最近记忆（`system-prompt/assemble` 事件），记忆"自动可用"；召回失败静默不阻塞请求`
  - `docs/Pi可学习优点_灵枢大脑改进交接_20260915.md:59` — `- **pi 机制**：system prompt 约 150 词骨架（`system-prompt.ts:127-144`）；工具只以**一行 snippet** 常驻系统提示，完整描述只进 API tools 字段（`system-prompt.ts:82-84`）；8 个内建工具默认只激活 4 个（`agent-…`
  - `docs/Pi可学习优点_灵枢大脑改进交接_20260915.md:99` — `pi 的细节清单（出处省略，均可直接对照源码）：错误/中止的 assistant 消息不入上下文；read 截断 2000 行/50KB 附续读提示；bash 大输出全量落盘临时文件+消息保尾部；图片自动缩 2000px、token 估算按 4800 字符/张；AGENTS.md 祖先链发现+worktree 防重复；…`
  - ……另有 6 处 / … and 6 more location(s)
  中 修复：把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。
  EN Fix: Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.

### 中 / MEDIUM (5)

- **中 / MEDIUM** `cred.many-secret-env-vars` — 读取多个不同名称的密钥类环境变量 / Reads several differently-named secret environment variables
  中 这里的一行、或整个包里的若干行，读取了名称看起来像凭据的环境变量。只读一个文档中声明的 key 是插件本该有的认证方式；枚举多个不同名称的密钥，则是在收集凭据而不是在使用凭据。
  EN One line here, or several across the package, read environment variables whose names look like credentials. Reading a single documented key is how a plugin is meant to authenticate; enumerating many differently-named ones is how credentials are gathered rather than used.
  - `src/lib/token_store.ts:162` — `process.env.MDCG_TOKEN`
  中 修复：只保留插件确实需要且有文档说明的变量，删掉与任何功能无关的密钥读取。
  EN Fix: Keep to the variables this plugin documents and needs, and delete reads of keys it has no feature for.
- **中 / MEDIUM** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 26 distinct remote hosts (api.deepseek.com, baike.baidu.com, cdn.jsdelivr.net, creativecommons.org, github.com, huggingface.co, open.bigmodel.cn, registry.npmjs.org, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `claude/lingshu-memory/.claude-plugin/plugin.json:8` — `https://github.com/FuRongJun-1999/dsh-memory`
  - `data/_verdicts_batch1.jsonl:26` — `http://baike.baidu.com/view/19205.htm`
  - `data/benchmarks/locomo-zh-500/VERSION.json:10` — `https://creativecommons.org/licenses/by-nc/4.0/`
  - `data/benchmarks/locomo-zh-500/VERSION.json:18` — `https://huggingface.co/datasets/mteb/LoCoMo`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `dsh/update-lingshu.ps1:267` — `http://127.0.0.1:3080`
  - `src/lib/roleplay_web.ts:630` — `http://x`
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `prompt.concealed-instruction` — 把文本藏在注释或不可见字符中 / Hides text in a comment or invisible characters
  中 该行把内容藏在 HTML 注释里，或藏在零宽字符与双向控制字符之后，这些内容在 diff 或渲染后的文档中什么都看不见，却仍会作为文本被读取。
  EN The line conceals content either in an HTML comment or behind zero-width and bidirectional control characters, which render as nothing in a diff or a rendered document while still being read as text.
  - `dsh/update-lingshu.ps1:1` — `#Requires -Version 5.1`
  中 修复：删除被隐藏的文本和不可见字符；审查者看不到的东西就不该出现在发布的包里。
  EN Fix: Delete the concealed text and the invisible characters; anything a reviewer cannot see does not belong in a shipped package.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 3 shipped file(s) are 64 KiB or larger and were not read as text, the largest being docs/eval/第三方验证报告_LoCoMo_灵枢_.png at 310 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `docs/eval/第三方验证报告_LoCoMo_灵枢_.png` — `317742 bytes not decoded as text`
  - `md_cg/whitebox_kb/wisdom/browser_units.py:115` — `"def build_get_request(url, host, headers=None):\n"`
  - `md_cg/whitebox_kb/wisdom/chat.html:163` — `const r = await fetch('/chat', {`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (1)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `hive/plans/naming_gov/mapping_batchB.json:1319` — `"reason": "该节点正文讲述用init命令生成.env与settings.yaml配置文件，含用法选项示例，故命名为初始化配置文件。",`
  - `src/index.ts:245` — `const legacyAuth = config.env.MDCG_LEGACY_ENV_AUTH ?? process.env.MDCG_LEGACY_ENV_AUTH`
  - `src/index.ts:248` — `configured: config.env.MDCG_TOKEN,`
  - `src/index.ts:255` — `const mdcgEnv: Record<string, string> = { ...config.env }`
  - ……另有 4 处 / … and 4 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.

_按类别 / By category:_ 凭据读取 / credential access 4 · 网络回调 / network callbacks 3 · 持久化 / persistence 3 · 数据外传 / exfiltration 2 · 安装脚本 / install scripts 2 · 提示注入 / prompt injection 2 · 混淆 / obfuscation 1 · 供应链 / supply chain 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `dsh-memory-HEAD/`
- skipped data/benchmarks/bench6-100-zh-en/results_v1.0.json: 583925 bytes exceeds the 524288-byte per-file cap
- skipped data/benchmarks/locomo-zh-500/corpus567.jsonl: 536983 bytes exceeds the 524288-byte per-file cap
- skipped data/memory-bench-1000.jsonl: 558116 bytes exceeds the 524288-byte per-file cap
- skipped docs/mdcg/lingshu_tutorial.html: 736446 bytes exceeds the 524288-byte per-file cap
- skipped docs/promo/promo-visual-1.png: 2453298 bytes exceeds the 524288-byte per-file cap
- skipped docs/promo/promo-visual-2.png: 1551363 bytes exceeds the 524288-byte per-file cap
- skipped docs/promo/promo-visual-3.png: 2198494 bytes exceeds the 524288-byte per-file cap
- skipped docs/promo/promo-visual-4.png: 2103048 bytes exceeds the 524288-byte per-file cap
- skipped docs/promo/promo-visual-5.png: 2673409 bytes exceeds the 524288-byte per-file cap
- skipped md_cg/lexicon/cedict_en_zh.json: 720022 bytes exceeds the 524288-byte per-file cap
- skipped md_cg/lexicon/char_atoms_clean.json: 921880 bytes exceeds the 524288-byte per-file cap
- ……另有 5 项 / … and 5 more

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
