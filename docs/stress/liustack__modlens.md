> 批量压测 / Batch stress test · ★ 3996 · `liustack/modlens`
> https://github.com/liustack/modlens · audited in 3.7s
# 安装前体检 / Pre-install audit: @liustack/modlens@3.26.2

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/liustack/modlens/tar.gz/HEAD` (URL / url)
- 已分析文件：157 个（4.0 MiB） / Files analysed: 157 (4.0 MiB)
- 内容摘要 / Content digest: `245f4594df8c5deff91bfbba0b9fb43d…`
- 体检时间 / Audited at: 2026-09-20T09:51:49.316Z

## 最严重的风险 / Most severe risk

**凭据读取、解码步骤与对外请求同时出现 / Credential read, decoding step and outbound request together** `exfil.credential-read-decode-callback`

中 数据会离开这台机器。该包中有代码把本机上的内容发往外部地址。
EN Data leaves this machine. Something in this package takes content that lives here and sends it to a destination outside it.

该包会访问的目标：`registry.npmjs.org`、`biomejs.dev`、`127.0.0.1`、`localhost`、`localhostmodel`、`${host`、`localhostdiscover`、`github.com` / Destinations this package reaches: `registry.npmjs.org`, `biomejs.dev`, `127.0.0.1`, `localhost`, `localhostmodel`, `${host`, `localhostdiscover`, `github.com`

- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 它还安排了之后继续运行，所以仅仅卸载这个包并不够。
  EN It also arranges to run again later, so removing the package is not enough on its own.
- 中 它会访问云实例元数据端点——在云主机上，那个端点会直接交出角色凭据。
  EN It contacts the cloud instance-metadata endpoint, which on a hosted machine hands out role credentials.
- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `src/providers/antigravity.ts:148`；完整列表见下方「发现」。 / The rule that decided the grade fired at `src/providers/antigravity.ts:148`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

发布期钩子（维护者打包或发布时运行，安装时不会执行）： / Publish-time hooks (run when the maintainer packs or publishes, not on install):

- `prepublishOnly`: `pnpm build`

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `./vision-schema.json`, `node:fs/promises`, `package.json`, `CHANGELOG.md`, `auth.json`, `config.toml`, `models-store.json`, `client.js`, `../dsh/client.js`, `vision-schema.json`, `../dsh/vision-schema.json`, `../package.json` （另有 10 项） / (+10 more)
- **写入的文件路径 / File paths written:** `node:fs/promises`, `#!/bin/sh\n`, `.pi`, `.pi/agent`, `secret.txt`, `.codex`, `auth.json`, `.codex/auth.json`, `config.toml`, `.codex/config.toml`, `file.txt`, `.grok` （另有 14 项） / (+14 more)
- **派生的命令 / Commands spawned:** `child_process`, `node:child_process`, `git`, `rev-parse`, `--short`, `HEAD`, `node`, `utf-8`, `pipe`, `inherit`, `ls-files`, `-z` （另有 26 项） / (+26 more)
- **连接的域名 / Domains contacted:** `registry.npmjs.org`, `biomejs.dev`, `127.0.0.1`, `localhost`, `localhostmodel`, `${host`, `localhostdiscover`, `github.com`, `nodejs.org`, `bun.sh`, `example.com`, `x.example` （另有 50 项） / (+50 more)
- **读取的环境变量 / Environment variables read:** `MODLENS_DSH_CLI`, `process.env (every variable)`, `OPENAI_BASE_URL`, `ANTHROPIC_BASE_URL`, `MODLENS_HARNESS`, `HOME`, `USERPROFILE`, `PATH`, `TMPDIR`, `TMP`, `TEMP`, `MODLENS_MODEL` （另有 3 项） / (+3 more)

## 发现 / Findings

### 严重 / CRITICAL (3)

- **严重 / CRITICAL** `exfil.credential-read-decode-callback` — 凭据读取、解码步骤与对外请求同时出现 / Credential read, decoding step and outbound request together
  中 编码外传的三个要素全部齐备：读取了凭据，有解码或编码动作，并且有请求离开本机。编码这一步的作用，正是让随便看一眼流量的人看不出其中的密钥。
  EN All three ingredients of an encoded exfiltration are present: a credential is read, something is decoded or encoded, and a request leaves the machine. The encoding step is what hides the secret from a casual look at the traffic.
  - `src/providers/antigravity.ts:148` — `evidence.includes('keyring') ||`
  - `src/providers/antigravity.ts:153` — `'On Linux this usually means the OS keyring is locked, which is normal for headless sessions (agents, cron, systemd, SSH without a desktop login). agy then repo…`
  - `src/imageInput.ts:153` — `return { data: buffer.toString('base64'), mimeType };`
  - `src/imageInput.ts:239` — `return { data: buffer.toString('base64'), mimeType };`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：删除凭据读取或对外调用。绝不要发布既接触密钥、又在向外发送途中编码载荷的包。
  EN Fix: Remove the credential read or the outbound call. Never ship a package that both touches secrets and encodes a payload on its way out.
- **严重 / CRITICAL** `exfil.credential-read-then-callback` — 同一个包内既有凭据文件读取又有对外请求 / Credential file read and an outbound request in the same package
  中 既读取凭据文件又发起对外请求的包，已经凑齐了窃取凭据的两半。单独看每一半都能找到理由，合在一起就只能解释为数据被送出本机。
  EN A package that reads a credential file and also makes outbound requests has the two halves of credential theft. Individually each half can be justified; together they only make sense as data leaving the machine.
  - `src/providers/antigravity.ts:148` — `evidence.includes('keyring') ||`
  - `src/providers/antigravity.ts:153` — `'On Linux this usually means the OS keyring is locked, which is normal for headless sessions (agents, cron, systemd, SSH without a desktop login). agy then repo…`
  - `dsh/client.js:91` — `fetch('/modlens/paste', { method: 'POST', body: buffer }).then((res) => {`
  - `dsh/client.js:147` — `fetch(`/modlens/paste?model=${encodeURIComponent(label)}`)`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：删除凭据读取。如果对外调用才是真正的功能，那么包内任何地方都不应在它之前读取密钥文件。
  EN Fix: Remove the credential read. If the outbound call is the real feature, it must not be preceded by a read of a secret file anywhere in the package.
- **严重 / CRITICAL** `priv.curl-pipe-shell` — 把下载内容直接管道给 shell / Pipes a download straight into a shell
  中 一步完成“拉取脚本并执行”，运行的就是远端服务器当时返回的任何内容；既没有可计算哈希、可审查、可固定版本的产物，服务器一旦被攻破就等于这台机器被攻破。
  EN Fetching a script and executing it in one step runs whatever the remote server returns at that moment; there is no artifact to hash, review or pin, and a compromise of the server becomes a compromise of this machine.
  - `src/analyzer.ts:148` — `curl -fsSL https://antigravity.google/cli/install.sh | bash`
  - `src/providers/availability.ts:42` — `curl -fsSL https://antigravity.google/cli/install.sh | bash`
  中 修复：先下载产物、校验其校验和，再执行校验通过的文件；绝不要把下载内容管道给解释器。
  EN Fix: Download the artifact, verify its checksum, and execute the verified file; never pipe a download into an interpreter.

### 高 / HIGH (8)

- **高 / HIGH** `cred.credential-read-with-command-execution` — 同一个包内既有凭据文件读取又有 shell 执行 / Credential file read and shell execution in the same package
  中 这个包里某处读取了凭据文件，另一处又启动了进程。仅这一组合就足以把密钥管道给命令、通过 CLI 把它外传，或用窃取到的材料改写本机配置。
  EN A credential file is read somewhere in this package and a process is spawned somewhere else. That pairing is enough to pipe a secret into a command, exfiltrate it through a CLI, or rewrite the machine's configuration from stolen material.
  - `src/providers/antigravity.ts:148` — `evidence.includes('keyring') ||`
  - `src/providers/antigravity.ts:153` — `'On Linux this usually means the OS keyring is locked, which is normal for headless sessions (agents, cron, systemd, SSH without a desktop login). agy then repo…`
  - `dsh/spawnHidden.d.ts:1` — `import type { ChildProcess, SpawnOptions } from 'child_process';`
  - `dsh/spawnHidden.js:16` — `import { spawn } from 'node:child_process'`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：删除凭据读取，并把进程启动限制在完全不会接触到密钥值的命令上。
  EN Fix: Remove the credential access, and keep process spawning limited to commands that never see secret values.
- **高 / HIGH** `cred.read-system-secret` — 读取系统密钥库或钥匙串 / Reads a system secret store or keychain
  中 该行读取了 `/etc/shadow`、钥匙串文件或 `.git-credentials`，或者通过 `security`、`keytar` 之类的库操作 macOS 钥匙串，从而拿到其他应用保存的密码。
  EN The line reads `/etc/shadow`, a keychain file, `.git-credentials`, or drives the macOS keychain through `security`, `keytar` or an equivalent library, which exposes stored passwords for other applications.
  - `src/providers/antigravity.test.ts:159` — `it('explains a locked keyring when agy logs an auth failure', () => {`
  - `src/providers/antigravity.test.ts:172` — `expect(message).toContain('keyring is locked');`
  - `src/providers/antigravity.test.ts:226` — `expect(message).not.toContain('keyring is locked');`
  - `src/providers/antigravity.ts:148` — `evidence.includes('keyring') ||`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：删除这次读取。确实需要某个已保存的密钥时，应向用户索取，并通过有文档说明的宿主配置项读取。
  EN Fix: Remove the read. If a stored secret is required, ask the user and read it through a documented harness configuration key.
- **高 / HIGH** `net.covert-channel` — 通过 websocket 或 DNS 查询回连 / Beacons over a websocket or DNS lookup
  中 该行打开了 websocket，或通过 `dns.*` 或 DNS 工具解析某个域名。两者都能在不像是 HTTP 请求的情况下传递数据，而 DNS 尤其通常被所有防火墙和代理放行。
  EN The line opens a websocket or resolves a literal domain through `dns.*` or a DNS tool. Both carry data without looking like an HTTP request, and DNS in particular is normally permitted through every firewall and proxy.
  - `src/net/network.ts:119` — `resolved = await dns.lookup(hostname, { all: true, verbatim: true });`
  中 修复：改用发往文档中说明的端点的普通 HTTPS 请求，让流量可以被检查和记录。
  EN Fix: Use ordinary HTTPS requests to a documented endpoint so that the traffic can be inspected and logged.
- **高 / HIGH** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 55 distinct remote hosts (${host, biomejs.dev, bun.sh, github.com, localhostdiscover, localhostmodel, nodejs.org, registry.npmjs.org, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `.github/workflows/release.yml:42` — `https://registry.npmjs.org`
  - `biome.json:2` — `https://biomejs.dev/schemas/2.5.7/schema.json`
  - `dsh/index.js:501` — `http://localhostmodel`
  - `dsh/index.js:1930` — `http://${host`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `dsh/client.js:246` — `proxyExample: 'http://127.0.0.1:7890',`
  - `dsh/client.js:282` — `proxyExample: 'http://127.0.0.1:7890',`
  - `src/config.test.ts:62` — `proxy: 'http://127.0.0.1:7890',`
  - `src/config.test.ts:116` — `providers: { openai: { proxy: 'socks5://bob:hunter2@10.0.0.1:1080' } },`
  - ……另有 28 处 / … and 28 more location(s)
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **高 / HIGH** `persist.global-self-install` — 全局安装依赖包 / Installs a package globally
  中 该命令把包安装到全局前缀，于是用户的 PATH 上多出一个可执行文件，而且当前项目删除后它仍然留在那里。
  EN The command installs a package into the global prefix, which puts a new executable on the user's PATH and keeps it there after the current project is deleted.
  - `.github/workflows/release.yml:46` — `npm install -g`
  中 修复：改为本地安装，并通过项目自身的脚本调用该工具；全局安装应由用户自己决定，而不是由插件代劳。
  EN Fix: Install locally and invoke the tool through the project's own scripts; global installs belong to the user's decision, not to a plugin.
- **高 / HIGH** `prompt.doc-instruction` — 文档中包含针对模型的指令 / Documentation contains instructions aimed at a model
  中 随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。
  EN A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.
  - `CHANGELOG.md:83` — `- **dsh: a failed image read no longer bills the whole session, and never rewrites history while the outcome stands ([#68](https://github.com/liustack/modlens/i…`
  - `skills/modlens/SKILL.md:18` — `powershell -ExecutionPolicy Bypass -File <skill-dir>\scripts\run.ps1 <args> # Windows`
  - `skills/modlens/SKILL.md:47` — `1. **First read of a session**: `modlens guard --model <your-model-id>` (pass your model id only when your system prompt states it, never a guess). Exit 0: proc…`
  中 修复：把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。
  EN Fix: Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.
- **高 / HIGH** `prompt.embedded-instruction-string` — 源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model
  中 源码中的字符串字面量——通常是工具描述或系统提示词片段——要求模型绕过确认或对用户隐瞒某些事，于是它作为一条指令进入上下文窗口。
  EN A string literal in the source — typically a tool description or system prompt fragment — tells the model to bypass confirmation or to hide something from the user, so it lands in the context window as a directive.
  - `src/dshClient.test.ts:1622` — `'lets an API provider bypass inherited proxies and posts that choice (#97)'`
  - `src/recoverPaste/index.ts:165` — ``No pasted images found in any session storage for this directory (looked in: ${dirs}). The user may not have pasted any, the storage format changed, or a legac…`
  - `src/recoverPaste/index.ts:250` — ``No pasted images found in ${source.location}. The user may not have pasted any, the storage format changed, or a legacy transcript records no cwd (ownership ca…`
  中 修复：如实描述工具的行为，删除那些会改变 agent 对待用户方式的指令。
  EN Fix: Describe the tool's behavior factually and remove directives that change how the agent treats the user.

### 中 / MEDIUM (4)

- **中 / MEDIUM** `install.hook-runs-shell-code` — 安装期钩子执行的不只是构建 / Lifecycle hook runs more than a build
  中 该钩子命令不属于常见的编译与拷贝步骤，安装这个包时会以用户权限运行任意代码，而这一切发生在任何人来得及检查之前。
  EN This hook command is not one of the usual compile-and-copy steps, so installing the package runs arbitrary code with the user's privileges before anything can be inspected.
  - `package.json:19` — `"prepublishOnly": "pnpm build",`
  中 修复：把钩子收敛为 `tsc` 或 `npm run build` 之类的构建命令，或把这项工作移到一个由用户主动执行的显式脚本里。
  EN Fix: Reduce the hook to a build command such as `tsc` or `npm run build`, or move the work into an explicit script the user chooses to run.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `dsh/client.js:246` — `http://127.0.0.1:7890`
  - `dsh/client.js:282` — `http://127.0.0.1:7890`
  - `dsh/index.js:501` — `http://localhostmodel`
  - `dsh/index.js:1930` — `http://${host`
  - ……另有 40 处 / … and 40 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `obf.long-minified-line` — 整行是压缩或机器生成的数据块 / Line is a single minified or machine-generated blob
  中 该行超过 500 个字符且几乎没有空白，正是打包载荷、压缩字符串表或机器生成单行代码的样子。这样的一行用肉眼什么也审不出来。
  EN The line is over 500 characters with almost no whitespace, which is what a bundled payload, a packed string table or a machine-generated one-liner looks like. Nothing on such a line is reviewable by eye.
  - `src/prompt.ts:15` — `{"summary":"one paragraph describing the image","ocr":{"full_text":"all visible text","lines":[{"text":"one line","language":"en"}]},"layout":{"regions":[{"type…`
  中 修复：发布未压缩的源码，或在 README 中说明该文件由哪个构建产出、可读源码在哪里。
  EN Fix: Ship unminified source, or state in the README which build produced the file and where the readable source lives.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 9 shipped file(s) are 64 KiB or larger and were not read as text, the largest being assets/demo-claude-paste-recovery.jpg at 410 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `assets/demo-claude-paste-recovery.jpg` — `420092 bytes not decoded as text`
  - `dsh/client.js:91` — `fetch('/modlens/paste', { method: 'POST', body: buffer }).then((res) => {`
  - `dsh/client.js:147` — `fetch(`/modlens/paste?model=${encodeURIComponent(label)}`)`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (5)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `dsh/client.js:848` — `t.envSourced,`
  - `src/analyzer.ts:377` — `const chain = [...providerChain(kind, config, autoOptions?.env ?? process.env)];`
  - `src/analyzer.ts:412` — `return reorderByCooldown(chain, cooldown, config, autoOptions?.env ?? process.env);`
  - `src/analyzer.ts:474` — `discoverAuto({ env: autoOptions?.env, home: autoOptions?.home });`
  - ……另有 18 处 / … and 18 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `net.metadata-endpoint` — 访问云实例元数据端点 / Contacts a cloud instance-metadata endpoint
  中 该行访问了云元数据地址，该地址会向机器上运行的任何程序发放临时实例凭据。插件去请求它就是窃取凭据，而这个地址也是经典的 SSRF 目标。
  EN The line reaches the cloud metadata address, which serves temporary instance credentials to anything running on the machine. Requesting it from a plugin is credential theft, and the address is also the classic SSRF target.
  - `src/imageInput.test.ts:164` — `fetchRemoteImageBase64('http://169.254.169.254/latest/meta-data', 1000),`
  中 修复：删除该请求；插件代码永远不应该获取实例凭据。
  EN Fix: Delete the request; instance credentials should never be fetched by plugin code.
- **低 / LOW** `net.token-or-blob-in-url` — 把凭据或编码数据块放进 URL / Puts a credential or encoded blob in a URL
  中 令牌形状的查询参数、内嵌的 `user:password` 授权部分，或超长高熵的查询值，都意味着密钥或载荷数据在 URL 中传输，最终会留在访问日志、代理和浏览器历史里。
  EN A token-shaped query parameter, an embedded `user:password` authority, or a long high-entropy query value means secret material or payload data travels in a URL, where it lands in access logs, proxies and browser history.
  - `src/config.test.ts:115` — `'https://«redacted»@proxy.example:8080'`
  - `src/config.test.ts:116` — `'socks5://bob:hunter2@10.0.0.1:1080'`
  - `src/config.test.ts:127` — `'https://«redacted»@proxy.example:8080'`
  - `src/config.test.ts:468` — `'https://«redacted»@gw.example/v1'`
  - ……另有 14 处 / … and 14 more location(s)
  中 修复：凭据放在 Authorization 头里发送，载荷用 POST 放在请求体中，不要编码进查询字符串。
  EN Fix: Send credentials in an Authorization header, and POST payloads in the body rather than encoding them into the query string.
- **低 / LOW** `obf.decoded-payload-literal` — 携带解码、转义或高熵字面量 / Carries a decoded, escaped or high-entropy literal
  中 一个很长的字面量会在运行时被解码（base64、`atob`、`unescape`、`decodeURIComponent`），或者写满了密集的十六进制、Unicode 转义，或者呈现出编码数据块那种近乎均匀的字符分布。
  EN A long literal is decoded at runtime (base64, `atob`, `unescape`, `decodeURIComponent`), written with dense hex or unicode escapes, or has the near-uniform character distribution of an encoded blob.
  - `src/imageInput.test.ts:58` — `const html = Buffer.from('<!doctype html><html>not an image</html>');`
  中 修复：把该值保存为可读源码，或保存为格式有文档说明的数据，让审查者能看清实际运行的到底是什么。
  EN Fix: Store the value as readable source or as data with a documented format, so a reviewer can see what is actually being run.
- **低 / LOW** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `src/dshPlugin.test.ts:5098` — `'const { __paste } = await import(process.argv[1]); await new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(process.argv[4]) - Date.now()))); awai…`
  - `src/dshPlugin.test.ts:5345` — `'const { __paste } = await import(process.argv[1]); process.stdout.write(await __paste.openPasteRoot(process.argv[2]));';`
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.

_按类别 / By category:_ 网络回调 / network callbacks 6 · 凭据读取 / credential access 3 · 混淆 / obfuscation 3 · 数据外传 / exfiltration 2 · 提示注入 / prompt injection 2 · 提权 / privilege 1 · 持久化 / persistence 1 · 安装脚本 / install scripts 1 · 供应链 / supply chain 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `modlens-HEAD/`
- skipped assets/banner.jpg: 814969 bytes exceeds the 524288-byte per-file cap
- not scanned (binary): assets/demo-claude-paste-recovery.jpg, assets/demo-codex-app.jpg, assets/demo-codex-batch.jpg, assets/demo-codex-chart.jpg, assets/demo-dsh-paste.jpg and 6 more
- outbound fetching was permitted for this audit
- grade forced to D by a critical finding: exfil.credential-read-decode-callback — Credential read, decoding step and outbound request together
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
