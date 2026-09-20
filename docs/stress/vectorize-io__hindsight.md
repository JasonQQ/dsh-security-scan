> 批量压测 / Batch stress test · ★ 23965 · `vectorize-io/hindsight#hindsight-integrations/coding-agents`
> https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/coding-agents · audited in 17.3s
# 安装前体检 / Pre-install audit: @vectorize-io/hindsight-coding-agents@0.6.1

**信任评级 / Trust grade: D** (评分 / score 38/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

- 来源 / Source: `https://codeload.github.com/vectorize-io/hindsight/tar.gz/HEAD` (URL / url)
- 已分析文件：230 个（1.9 MiB） / Files analysed: 230 (1.9 MiB)
- 内容摘要 / Content digest: `2084d33fa6edeec1442754ee320547ac…`
- 体检时间 / Audited at: 2026-09-20T09:51:42.888Z

## 最严重的风险 / Most severe risk

**源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model** `prompt.embedded-instruction-string`

中 它夹带了写给 agent 而不是写给人看的文字——试图在你不察觉的情况下改变 agent 行为的指令。
EN It carries text aimed at the agent rather than at a person — instructions that try to change what the agent does without telling you.

该包会访问的目标：`cursor.com`、`langch.in`、`cli.devin.ai`、`app.factory.ai`、`x.ai`、`app.primeintellect.ai`、`registry.npmjs.org`、`github.com` / Destinations this package reaches: `cursor.com`, `langch.in`, `cli.devin.ai`, `app.factory.ai`, `x.ai`, `app.primeintellect.ai`, `registry.npmjs.org`, `github.com`

- 中 它还安排了之后继续运行，所以仅仅卸载这个包并不够。
  EN It also arranges to run again later, so removing the package is not enough on its own.

决定该评级的规则命中于 `src/core/survey.test.ts:119`；完整列表见下方「发现」。 / The rule that decided the grade fired at `src/core/survey.test.ts:119`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

发布期钩子（维护者打包或发布时运行，安装时不会执行）： / Publish-time hooks (run when the maintainer packs or publishes, not on install):

- `prepublishOnly`: `npm run clean && npm run skill:build && npm run build`

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `node_modules/readdirp`, `\n\n`, `package.json`, `"/memories`, `core/hindsight.ts`, `\n`, `.claude`, `SKILL.md`, `.claude/skills/hindsight-coding-agent/SKILL.md`, `.claude/skills/hindsight-coding-agent`, `.agents`, `.agents/skills/hindsight-coding-agent/SKILL.md` （另有 52 项） / (+52 more)
- **写入的文件路径 / File paths written:** `package.json`, `0.4.2`, `.install-origin.json`, `.git`, `myrepo/.git/worktrees/wt1`, `s1.jsonl`, `mine.jsonl`, `/repo/mine`, `theirs.jsonl`, `/repo/theirs`, `/Users/x/dev/myrepo/sub`, `.claude` （另有 40 项） / (+40 more)
- **派生的命令 / Commands spawned:** `cross-spawn`, `^7.0.5`, `7.0.6`, `node_modules/cross-spawn`, `resolved`, `https://registry.npmjs.org/cross-spawn/-/cross-spawn-7.0.6.tgz`, `^7.0.6`, `node:child_process`, `git`, `-C`, `utf8`, `init` （另有 68 项） / (+68 more)
- **连接的域名 / Domains contacted:** `cursor.com`, `langch.in`, `cli.devin.ai`, `app.factory.ai`, `x.ai`, `app.primeintellect.ai`, `registry.npmjs.org`, `github.com`, `opencollective.com`, `www.patreon.com`, `feross.org`, `paulmillr.com` （另有 30 项） / (+30 more)
- **读取的环境变量 / Environment variables read:** `HINDSIGHT_STUB_BASE_URL`, `HINDSIGHT_DISABLE_HOOKS`, `CLAUDE_PROJECT_DIR`, `HINDSIGHT_DIAG_FILE`, `HOME`, `HINDSIGHT_CHANNEL_ID`, `HINDSIGHT_USER_ID`, `process.env (every variable)`, `HINDSIGHT_MAX_PARALLEL_RETAINS`, `HINDSIGHT_REFLECT_TOOL_TIMEOUT_MS`, `HINDSIGHT_REFLECT_BUDGET`, `HINDSIGHT_API_URL` （另有 31 项） / (+31 more)

## 发现 / Findings

### 高 / HIGH (2)

- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `src/core/config.ts:520` — `? `http://127.0.0.1:${apiPort}``
  - `src/core/daemon.test.ts:13` — `expect(cfg.apiUrl).toBe("http://127.0.0.1:9077");`
  - `src/core/daemon.test.ts:18` — `"http://127.0.0.1:9999"`
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **高 / HIGH** `prompt.embedded-instruction-string` — 源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model
  中 源码中的字符串字面量——通常是工具描述或系统提示词片段——要求模型绕过确认或对用户隐瞒某些事，于是它作为一条指令进入上下文窗口。
  EN A string literal in the source — typically a tool description or system prompt fragment — tells the model to bypass confirmation or to hide something from the user, so it lands in the context window as a directive.
  - `src/core/survey.test.ts:119` — `"bypassPermissions"`
  - `src/e2e/codex.ts:16` — `"--dangerously-bypass-hook-trust"`
  - `src/harness/opencode2.test.ts:174` — `"pushes this turn's injection into the system prompt, keyed by session"`
  - `src/harness/opencode2.test.ts:187` — `"leaves the system prompt untouched when there is nothing to inject"`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：如实描述工具的行为，删除那些会改变 agent 对待用户方式的指令。
  EN Fix: Describe the tool's behavior factually and remove directives that change how the agent treats the user.

### 中 / MEDIUM (2)

- **中 / MEDIUM** `install.native-downloader` — 安装流程会编译或下载原生产物 / Install path builds or downloads a native artifact
  中 依赖包在安装期间编译原生代码或拉取预编译二进制文件，于是最终在本机被执行的不是被审查过的源码。
  EN The package compiles native code or fetches a prebuilt binary during install, so bytes that are not the reviewed source end up executed on this machine.
  - `e2e/Dockerfile.dsh:4` — `# machine npm falls back to node-gyp, which needs a toolchain the slim base deliberately omits.`
  - `package-lock.json:1247` — `"@npmcli/node-gyp": "^5.0.0",`
  - `package-lock.json:1584` — `"node_modules/@npmcli/node-gyp": {`
  - `package-lock.json:1586` — `"resolved": "https://registry.npmjs.org/@npmcli/node-gyp/-/node-gyp-5.0.0.tgz",`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：优先使用纯实现；若必须使用预编译产物，则内置该产物并记录其摘要，而不是在安装时下载。
  EN Fix: Prefer a pure implementation, or vendor the prebuilt artifact with a recorded digest instead of downloading it at install time.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `src/core/config.test.ts:44` — `http://x:1`
  - `src/core/config.test.ts:52` — `http://x:1`
  - `src/core/config.ts:520` — `http://127.0.0.1:${apiPort`
  - `src/core/daemon.test.ts:13` — `http://127.0.0.1:9077`
  - ……另有 28 处 / … and 28 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.

### 低 / LOW (6)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `src/core/survey.test.ts:90` — `const spec = JSON.parse(options.env[SURVEY_SPEC_ENV]) as SurveySupervisorSpec;`
  - `src/core/survey.test.ts:130` — `expect(parsed.mcpServers.hindsight.env.HINDSIGHT_MCP_PROJECT_CWD).toBe("/repo");`
  - `src/core/survey.test.ts:133` — `expect(parsed.mcpServers.hindsight.env.HINDSIGHT_MCP_HARNESS).toBe("claude-code");`
  - `src/core/survey.test.ts:139` — `expect(options.env.HINDSIGHT_DISABLE_HOOKS).toBe("1");`
  - ……另有 6 处 / … and 6 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `cred.many-secret-env-vars` — 读取多个不同名称的密钥类环境变量 / Reads several differently-named secret environment variables
  中 这里的一行、或整个包里的若干行，读取了名称看起来像凭据的环境变量。只读一个文档中声明的 key 是插件本该有的认证方式；枚举多个不同名称的密钥，则是在收集凭据而不是在使用凭据。
  EN One line here, or several across the package, read environment variables whose names look like credentials. Reading a single documented key is how a plugin is meant to authenticate; enumerating many differently-named ones is how credentials are gathered rather than used.
  - `src/core/config.test.ts:267` — `process.env.HINDSIGHT_API_TOKEN`
  - `src/core/config.test.ts:276` — `process.env.HINDSIGHT_API_TOKEN`
  - `src/e2e/harness.ts:155` — `process.env.HINDSIGHT_E2E_API_TOKEN`
  中 修复：只保留插件确实需要且有文档说明的变量，删掉与任何功能无关的密钥读取。
  EN Fix: Keep to the variables this plugin documents and needs, and delete reads of keys it has no feature for.
- **低 / LOW** `cred.read-system-secret` — 读取系统密钥库或钥匙串 / Reads a system secret store or keychain
  中 该行读取了 `/etc/shadow`、钥匙串文件或 `.git-credentials`，或者通过 `security`、`keytar` 之类的库操作 macOS 钥匙串，从而拿到其他应用保存的密码。
  EN The line reads `/etc/shadow`, a keychain file, `.git-credentials`, or drives the macOS keychain through `security`, `keytar` or an equivalent library, which exposes stored passwords for other applications.
  - `src/e2e/harnesses.ts:149` — `"system keyring, so there is no file to mount either.",`
  中 修复：删除这次读取。确实需要某个已保存的密钥时，应向用户索取，并通过有文档说明的宿主配置项读取。
  EN Fix: Remove the read. If a stored secret is required, ask the user and read it through a documented harness configuration key.
- **低 / LOW** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `src/core/transcript-codex.test.ts:213` — `writeFileSync(file, item({ type: "function_call", name: "shell", arguments: "not json" }));`
  - `src/core/transcript-cursor.test.ts:37` — `{ type: "tool_use", name: "read", input: { path: "src/parser.ts" } },`
  - `src/core/transcript-cursor.test.ts:44` — `name: "write",`
  - `src/core/transcript-dsh.test.ts:25` — `data: { turn: 1, step: 1, callId: "c1", name: "read", arguments: '{"path":"src/app.ts"}' },`
  - ……另有 13 处 / … and 13 more location(s)
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.
- **低 / LOW** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 40 distinct remote hosts (app.factory.ai, app.primeintellect.ai, cli.devin.ai, cursor.com, github.com, langch.in, registry.npmjs.org, x.ai, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `e2e/Dockerfile.cursor-cli:2` — `https://cursor.com/install`
  - `e2e/Dockerfile.dcode:7` — `https://langch.in/dcode`
  - `e2e/Dockerfile.devin-cli:4` — `https://cli.devin.ai/install.sh`
  - `e2e/Dockerfile.factory-droid:6` — `https://app.factory.ai/cli`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **低 / LOW** `persist.global-self-install` — 全局安装依赖包 / Installs a package globally
  中 该命令把包安装到全局前缀，于是用户的 PATH 上多出一个可执行文件，而且当前项目删除后它仍然留在那里。
  EN The command installs a package into the global prefix, which puts a new executable on the user's PATH and keeps it there after the current project is deleted.
  - `e2e/run-harness.sh:9` — `npm install --global`
  中 修复：改为本地安装，并通过项目自身的脚本调用该工具；全局安装应由用户自己决定，而不是由插件代劳。
  EN Fix: Install locally and invoke the tool through the project's own scripts; global installs belong to the user's decision, not to a plugin.

_按类别 / By category:_ 网络回调 / network callbacks 3 · 凭据读取 / credential access 3 · 提示注入 / prompt injection 1 · 安装脚本 / install scripts 1 · 滥用宿主环境 / harness abuse 1 · 持久化 / persistence 1

## 扫描说明 / Scan notes

- scoped to the subdirectory `hindsight-integrations/coding-agents/`
- stripped the archive's single top-level directory `hindsight-HEAD/`
- outbound fetching was permitted for this audit
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
