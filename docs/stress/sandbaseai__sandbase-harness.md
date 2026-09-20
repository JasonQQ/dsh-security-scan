> 批量压测 / Batch stress test · ★ 647 · `sandbaseai/sandbase-harness`
> https://github.com/sandbaseai/sandbase-harness · audited in 3.8s
# 安装前体检 / Pre-install audit: managed-agents@0.3.8

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

- 来源 / Source: `https://codeload.github.com/sandbaseai/sandbase-harness/tar.gz/HEAD` (URL / url)
- 已分析文件：393 个（3.4 MiB） / Files analysed: 393 (3.4 MiB)
- 内容摘要 / Content digest: `4d0c16d25138b32f7fd8e1123affce07…`
- 体检时间 / Audited at: 2026-09-20T09:52:40.771Z

## 最严重的风险 / Most severe risk

**用 curl 上传本地文件 / Uploads a local file with curl** `exfil.curl-post-body`

中 数据会离开这台机器。该包中有代码把本机上的内容发往外部地址。
EN Data leaves this machine. Something in this package takes content that lives here and sends it to a destination outside it.

该包会访问的目标：`github.com`、`agent-plugins.org`、`drivemcp.googleapis.com`、`gmailmcp.googleapis.com`、`calendarmcp.googleapis.com`、`mcp.canva.com`、`mcp.figma.com`、`mcp.notion.com` / Destinations this package reaches: `github.com`, `agent-plugins.org`, `drivemcp.googleapis.com`, `gmailmcp.googleapis.com`, `calendarmcp.googleapis.com`, `mcp.canva.com`, `mcp.figma.com`, `mcp.notion.com`

- 中 它发生在安装时：`prepare` 脚本会执行它，你不需要自己运行任何东西。
  EN It happens at install time: the `prepare` script runs it, so you do not have to run anything yourself.
- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 它还安排了之后继续运行，所以仅仅卸载这个包并不够。
  EN It also arranges to run again later, so removing the package is not enough on its own.

决定该评级的规则命中于 `apps/console/src/components/pages/settings/apiReferenceExamples.ts:24`；完整列表见下方「发现」。 / The rule that decided the grade fired at `apps/console/src/components/pages/settings/apiReferenceExamples.ts:24`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

- `prepare` (`package.json`): `node scripts/prepare-install.mjs`

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `index.html`, `node:fs/promises`, `manifest.yaml`, `runtime-agent.yaml`, `secrets.key`, `SKILL.md`, `example.txt`, `resources/example.txt`, `escape.txt`, `test.txt`, `/etc/hostname`, `nested/test.txt` （另有 42 项） / (+42 more)
- **写入的文件路径 / File paths written:** `skills/example-skill`, `node:fs/promises`, `manifest.yaml`, `\n`, `echo-agent.yaml`, `SKILL.md`, `research/SKILL.md`, `managed-agents.config.yaml`, `test.txt`, `../escaped.txt`, `only-in-a.txt`, `nested/test.txt` （另有 30 项） / (+30 more)
- **派生的命令 / Commands spawned:** `cross-spawn`, `^7.0.5`, `node_modules/cross-spawn`, `resolved`, `https://registry.npmmirror.com/cross-spawn/-/cross-spawn-7.0.6.tgz`, `node:child_process`, `npm`, `run`, `build`, `init`, `/bin/sh`, `-lc` （另有 32 项） / (+32 more)
- **连接的域名 / Domains contacted:** `github.com`, `agent-plugins.org`, `drivemcp.googleapis.com`, `gmailmcp.googleapis.com`, `calendarmcp.googleapis.com`, `mcp.canva.com`, `mcp.figma.com`, `mcp.notion.com`, `mcp.example.com`, `example.com`, `api.anthropic.com`, `api.minimax.io` （另有 42 项） / (+42 more)
- **读取的环境变量 / Environment variables read:** `MANAGED_AGENTS_API_KEY`, `MANAGED_AGENTS_URL`, `OPENAI_BASE_URL`, `OPENAI_API_KEY`, `MANAGED_AGENTS_ENVIRONMENT_KEY`, `process.env (every variable)`, `MANAGED_AGENTS_HOME`, `MANAGED_AGENTS_LOG_LEVEL`, `MANAGED_AGENTS_LOG_FORMAT`, `MANAGED_AGENTS_SECRET_KEY`, `MANAGED_AGENTS_CORS_ORIGINS`, `MANAGED_AGENTS_TEST_K8S_NAMESPACE` （另有 19 项） / (+19 more)

## 发现 / Findings

### 高 / HIGH (9)

- **高 / HIGH** `cred.environment-secret-enumeration` — 枚举大量不同名称的密钥类环境变量 / Enumerates many differently-named secret environment variables
  中 该包读取了一批看起来是凭据的环境变量，而它对这些服务并没有其他任何调用。读一个文档中声明的 key 是插件正常的认证方式；扫走五个以上不同名称的密钥，是在收集凭据。
  EN 9 distinct secret-named environment variables are read (MANAGED_AGENTS_API_KEY, OPENAI_API_KEY, MANAGED_AGENTS_SECRET_KEY, API_KEY, MANAGED_AGENTS_TEST_SECRET, SANDBASE_PI_API_KEY, PI_MODEL_API_KEY, UNRELATED_SERVICE_SECRET, …).
  - `apps/console/src/components/pages/settings/apiReferenceExamples.ts:131` — `const sdkAuth = context.authEnabled ? "\n apiKey: process.env.MANAGED_AGENTS_API_KEY," : '';`
  - `scripts/smoke-release.mjs:65` — `OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? 'smoke-test-key',`
  - `src/core/security/secrets.ts:37` — `const configuredKey = process.env.MANAGED_AGENTS_SECRET_KEY;`
  - `tests/unit/env-resolver.test.ts:19` — `process.env['API_KEY'] = 'sk-123456';`
  中 修复：删掉与本插件功能无关的变量读取，只保留其文档化集成所需的键。
  EN Fix: Delete the reads of variables this plugin has no feature for, and keep only the keys its documented integration needs.
- **高 / HIGH** `exfil.curl-post-body` — 用 curl 上传本地文件 / Uploads a local file with curl
  中 该命令把磁盘上的文件 POST 到远程端点（`-d @`、`--data-binary @`、`-F …=@`、`-T`），本质上是伪装成表单提交的文件上传。
  EN The command posts a file from disk to a remote endpoint (`-d @`, `--data-binary @`, `-F …=@`, `-T`), which is a file upload disguised as a form post.
  - `apps/console/src/components/pages/settings/apiReferenceExamples.ts:24` — `curl -sS -X POST`
  - `apps/console/src/components/pages/settings/apiReferenceExamples.ts:29` — `curl -N -X POST`
  - `apps/console/src/components/pages/settings/apiReferenceExamples.ts:38` — `curl -N -X POST`
  - `apps/console/src/components/pages/settings/apiReferenceExamples.ts:47` — `curl -sS -X POST`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：删除这次上传，或让目标地址显式且可配置，使用户能看清自己的数据去了哪里。
  EN Fix: Remove the upload, or make the destination explicit and configurable so a user can see where their data goes.
- **高 / HIGH** `harness.settings-widen-permission` — 放宽宿主的沙箱或审批策略 / Widens the harness sandbox or approval policy
  中 该行在宿主设置、profile 或 composition patch 中写入了宽松的沙箱或权限值。放宽策略会移除用户为所有插件——而不只是这一个插件——设定的文件与命令边界。
  EN The line sets a permissive sandbox or permission value in the harness settings, a profile or a composition patch. Widening the policy removes the file and command boundaries the user chose for every plugin, not just for this one.
  - `src/strategy/pi-launcher.ts:161` — `-NoProfile-NonInteractive-ExecutionPolicyBypass-Command`
  中 修复：沙箱与审批设置交给用户决定；插件若需要某项能力，应加以说明并由用户显式授予。
  EN Fix: Leave sandbox and approval settings to the user; if the plugin needs a capability, document it and let the user grant it explicitly.
- **高 / HIGH** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 52 distinct remote hosts (agent-plugins.org, calendarmcp.googleapis.com, drivemcp.googleapis.com, github.com, gmailmcp.googleapis.com, mcp.canva.com, mcp.figma.com, mcp.notion.com, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `.github/workflows/publish-mcp-registry.yml:39` — `https://github.com/modelcontextprotocol/registry/releases/download/${MCP_PUBLISHER_VERSION`
  - `agent-plugin/mcp.json:2` — `https://agent-plugins.org/schemas/1.0.0/mcp.schema.json`
  - `agent-plugin/plugin.json:2` — `https://agent-plugins.org/schemas/1.0.0/plugin.schema.json`
  - `agent-plugin/plugin.json:8` — `https://github.com/sandbaseai`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `apps/console/src/components/pages/settings/SettingsApiReference.tsx:29` — `const baseUrl = typeof window === 'undefined' ? 'http://127.0.0.1:3000' : window.location.origin;`
  - `examples/deepseek-harness/cordis.yml:11` — `MANAGED_AGENTS_URL: !!js process.env.MANAGED_AGENTS_URL ?? 'http://127.0.0.1:3000'`
  - `scripts/smoke-release.mjs:64` — `OPENAI_BASE_URL: process.env.OPENAI_BASE_URL ?? 'http://127.0.0.1:9/v1',`
  - `scripts/smoke-release.mjs:80` — `const response = await fetch(`http://127.0.0.1:${port}/v1/x/health`);`
  - ……另有 13 处 / … and 13 more location(s)
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **高 / HIGH** `persist.global-self-install` — 全局安装依赖包 / Installs a package globally
  中 该命令把包安装到全局前缀，于是用户的 PATH 上多出一个可执行文件，而且当前项目删除后它仍然留在那里。
  EN The command installs a package into the global prefix, which puts a new executable on the user's PATH and keeps it there after the current project is deleted.
  - `apps/console/src/components/pages/EnvironmentDetailViews.tsx:79` — `npm install -g`
  中 修复：改为本地安装，并通过项目自身的脚本调用该工具；全局安装应由用户自己决定，而不是由插件代劳。
  EN Fix: Install locally and invoke the tool through the project's own scripts; global installs belong to the user's decision, not to a plugin.
- **高 / HIGH** `persist.persistence-with-install-hook` — 安装钩子叠加持久化机制 / Install hook combined with a persistence mechanism
  中 生命周期钩子在安装期间运行，而目录树中又有东西把自己注册为稍后运行。这一组合会在用户以为只是一次普通依赖安装的过程中装入一个常驻组件。
  EN A lifecycle hook runs during install and something in the tree registers itself to run later. The combination installs a resident component during what the user believed was a normal dependency install.
  - `apps/console/src/components/pages/EnvironmentDetailViews.tsx:79` — `npm install -g`
  - `package.json:60` — `"prepare": "node scripts/prepare-install.mjs",`
  中 修复：删除这一定时注册。任何需要持续运行的东西，都应由用户作为一个明确可见的步骤来设置。
  EN Fix: Remove the scheduling. Anything that should keep running must be set up by the user as a deliberate, visible step.
- **高 / HIGH** `prompt.doc-instruction` — 文档中包含针对模型的指令 / Documentation contains instructions aimed at a model
  中 随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。
  EN A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.
  - `.kiro/specs/local-agent-platform/claude-console-field-alignment.md:256` — `- `System prompt``
  - `.kiro/specs/local-agent-platform/claude-console-field-alignment.md:691` — ``Name and description are rendered in the agent system prompt when this store is attached.``
  - `.kiro/specs/local-agent-platform/claude-console-field-alignment.md:965` — `- Agent detail with version, system prompt, tools, skills, sessions`
  - `.kiro/specs/local-agent-platform/dashboard-console-implementation-plan.md:320` — `system prompt when attached.`
  - ……另有 10 处 / … and 10 more location(s)
  中 修复：把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。
  EN Fix: Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.
- **高 / HIGH** `prompt.embedded-instruction-string` — 源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model
  中 源码中的字符串字面量——通常是工具描述或系统提示词片段——要求模型绕过确认或对用户隐瞒某些事，于是它作为一条指令进入上下文窗口。
  EN A string literal in the source — typically a tool description or system prompt fragment — tells the model to bypass confirmation or to hide something from the user, so it lands in the context window as a directive.
  - `apps/console/src/components/pages/settings/api-reference/agents.json:46` — `"System prompt used to drive the agent."`
  - `apps/console/src/components/pages/settings/api-reference/agents.json:138` — `"System prompt."`
  - `tests/unit/pi-engine-session.test.ts:363` — `'Do not bypass declared policies.'`
  中 修复：如实描述工具的行为，删除那些会改变 agent 对待用户方式的指令。
  EN Fix: Describe the tool's behavior factually and remove directives that change how the agent treats the user.

### 中 / MEDIUM (5)

- **中 / MEDIUM** `cred.many-secret-env-vars` — 读取多个不同名称的密钥类环境变量 / Reads several differently-named secret environment variables
  中 这里的一行、或整个包里的若干行，读取了名称看起来像凭据的环境变量。只读一个文档中声明的 key 是插件本该有的认证方式；枚举多个不同名称的密钥，则是在收集凭据而不是在使用凭据。
  EN One line here, or several across the package, read environment variables whose names look like credentials. Reading a single documented key is how a plugin is meant to authenticate; enumerating many differently-named ones is how credentials are gathered rather than used.
  - `apps/console/src/components/pages/settings/apiReferenceExamples.ts:131` — `process.env.MANAGED_AGENTS_API_KEY`
  - `scripts/smoke-release.mjs:65` — `process.env.OPENAI_API_KEY`
  - `src/api/auth.ts:94` — `process.env['MANAGED_AGENTS_API_KEY`
  - `src/core/security/secrets.ts:37` — `process.env.MANAGED_AGENTS_SECRET_KEY`
  - ……另有 18 处 / … and 18 more location(s)
  中 修复：只保留插件确实需要且有文档说明的变量，删掉与任何功能无关的密钥读取。
  EN Fix: Keep to the variables this plugin documents and needs, and delete reads of keys it has no feature for.
- **中 / MEDIUM** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `examples/basic/agents/echo-assistant.yaml:16` — `- name: bash`
  - `examples/basic/agents/echo-assistant.yaml:20` — `- name: read`
  - `examples/basic/agents/echo-assistant.yaml:22` — `- name: write`
  - `examples/basic/agents/echo-assistant.yaml:24` — `- name: edit`
  - ……另有 49 处 / … and 49 more location(s)
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.
- **中 / MEDIUM** `install.hook-runs-shell-code` — 安装期钩子执行的不只是构建 / Lifecycle hook runs more than a build
  中 该钩子命令不属于常见的编译与拷贝步骤，安装这个包时会以用户权限运行任意代码，而这一切发生在任何人来得及检查之前。
  EN This hook command is not one of the usual compile-and-copy steps, so installing the package runs arbitrary code with the user's privileges before anything can be inspected.
  - `package.json:60` — `"prepare": "node scripts/prepare-install.mjs",`
  中 修复：把钩子收敛为 `tsc` 或 `npm run build` 之类的构建命令，或把这项工作移到一个由用户主动执行的显式脚本里。
  EN Fix: Reduce the hook to a build command such as `tsc` or `npm run build`, or move the work into an explicit script the user chooses to run.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `apps/console/src/components/pages/settings/SettingsApiReference.tsx:29` — `http://127.0.0.1:3000`
  - `examples/deepseek-harness/cordis.yml:11` — `http://127.0.0.1:3000`
  - `scripts/smoke-release.mjs:64` — `http://127.0.0.1:9/v1`
  - `scripts/smoke-release.mjs:80` — `http://127.0.0.1:${port`
  - ……另有 23 处 / … and 23 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 2 shipped file(s) are 64 KiB or larger and were not read as text, the largest being docs/assets/sandbase-harness-icon.png at 136 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `docs/assets/sandbase-harness-icon.png` — `139331 bytes not decoded as text`
  - `apps/console/src/api.ts:20` — `const res = await fetch(path, { headers: authHeaders() });`
  - `apps/console/src/api.ts:26` — `const res = await fetch(path, { headers: authHeaders() });`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (5)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `apps/console/src/App.tsx:21` — `const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<string | null>(route.environmentId ?? null);`
  - `apps/console/src/App.tsx:39` — `if (route.environmentId) setSelectedEnvironmentId(route.environmentId);`
  - `apps/console/src/App.tsx:40` — `}, [route.environmentId]);`
  - `apps/console/src/components/ConsoleRoutes.tsx:138` — `const environment = props.data.environments.find((item) => item.id === props.selectedEnvironmentId);`
  - ……另有 78 处 / … and 78 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `cred.env-harvest` — 读取或整体导出进程环境变量 / Reads or dumps the process environment
  中 该行把整个环境当成一个值取走——序列化、遍历或打印它，而不是只取自己需要的那一个变量。CI 运行器和宿主都会把 API Key 导出到环境变量里，因此整体导出就是一次凭据收集。
  EN The line takes the whole environment as a value — serializing it, iterating it, or printing it — rather than the one variable it needs. CI runners and the harness export API keys into the environment, so a dump is a credential harvest.
  - `tests/unit/kubernetes-sandbox.test.ts:235` — `printenv`
  - `tests/unit/kubernetes-sandbox.test.ts:236` — `printenv`
  - `tests/unit/kubernetes-sandbox.test.ts:240` — `printenv`
  - `tests/unit/kubernetes-sandbox.test.ts:241` — `printenv`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：只逐个读取插件文档中声明过的变量，绝不序列化整个环境对象，也不要把它写进日志或请求。
  EN Fix: Read only the variables the plugin documents, one at a time, and never serialize the environment object or forward it into a log or request.
- **低 / LOW** `destructive.shipped-command` — 内置破坏性文件系统命令 / Ships a destructive filesystem command
  中 抹掉用户主目录、根文件系统或分区的命令出现在可执行内容里，而不是文档描述中。即便有条件判断保护，这种原语也绝不该被塞进插件里。
  EN A command that erases a home directory, a root filesystem or a partition appears in executable content rather than in prose. Even guarded by a condition, it is a primitive that should never travel inside a plugin.
  - `tests/unit/kubernetes-sandbox.test.ts:256` — `const argv = buildExecArgv({ ...base, command: 'true', options: { env: { A: `x'; rm -rf /; #` } } });`
  - `tests/unit/kubernetes-sandbox.test.ts:258` — `expect(shellString).toContain(`export A='x'\\''; rm -rf /; #'`);`
  中 修复：删除该命令。插件如果必须清理，应把删除限定在它自己创建的目录，并以包根目录为基准解析这个路径。
  EN Fix: Delete the command. If a plugin must clean up, restrict deletion to a directory it created and resolve that path from the package root.
- **低 / LOW** `net.token-or-blob-in-url` — 把凭据或编码数据块放进 URL / Puts a credential or encoded blob in a URL
  中 令牌形状的查询参数、内嵌的 `user:password` 授权部分，或超长高熵的查询值，都意味着密钥或载荷数据在 URL 中传输，最终会留在访问日志、代理和浏览器历史里。
  EN A token-shaped query parameter, an embedded `user:password` authority, or a long high-entropy query value means secret material or payload data travels in a URL, where it lands in access logs, proxies and browser history.
  - `tests/unit/model-error.test.ts:58` — `'https://gw.example.com/v1/chat/completions?api_key=super-secret-value-123&x=1'`
  中 修复：凭据放在 Authorization 头里发送，载荷用 POST 放在请求体中，不要编码进查询字符串。
  EN Fix: Send credentials in an Authorization header, and POST payloads in the body rather than encoding them into the query string.
- **低 / LOW** `obf.decoded-payload-literal` — 携带解码、转义或高熵字面量 / Carries a decoded, escaped or high-entropy literal
  中 一个很长的字面量会在运行时被解码（base64、`atob`、`unescape`、`decodeURIComponent`），或者写满了密集的十六进制、Unicode 转义，或者呈现出编码数据块那种近乎均匀的字符分布。
  EN A long literal is decoded at runtime (base64, `atob`, `unescape`, `decodeURIComponent`), written with dense hex or unicode escapes, or has the near-uniform character distribution of an encoded blob.
  - `tests/unit/skill-packages.test.ts:5` — `const skillContent = Buffer.from('---\nname: demo\ndescription: Demo skill\n---\nBody', 'utf8');`
  中 修复：把该值保存为可读源码，或保存为格式有文档说明的数据，让审查者能看清实际运行的到底是什么。
  EN Fix: Store the value as readable source or as data with a documented format, so a reviewer can see what is actually being run.

_按类别 / By category:_ 凭据读取 / credential access 4 · 网络回调 / network callbacks 4 · 滥用宿主环境 / harness abuse 2 · 持久化 / persistence 2 · 提示注入 / prompt injection 2 · 数据外传 / exfiltration 1 · 安装脚本 / install scripts 1 · 供应链 / supply chain 1 · 破坏性 / destructive 1 · 混淆 / obfuscation 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `sandbase-harness-HEAD/`
- not scanned (binary): docs/assets/dashboard-api-reference.png, docs/assets/dashboard-memory-stores.png, docs/assets/dashboard-overview.png, docs/assets/dashboard-sessions.png, docs/assets/dashboard-settings-models.png and 1 more
- outbound fetching was permitted for this audit
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
