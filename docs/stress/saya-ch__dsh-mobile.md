> 批量压测 / Batch stress test · ★ 276 · `saya-ch/dsh-mobile`
> https://github.com/saya-ch/dsh-mobile · audited in 8.5s
# 安装前体检 / Pre-install audit: dsh-mobile@0.4.3

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/saya-ch/dsh-mobile/tar.gz/HEAD` (URL / url)
- 已分析文件：226 个（5.9 MiB） / Files analysed: 226 (5.9 MiB)
- 内容摘要 / Content digest: `df9830221fdd9e49ce170d1d590aeb89…`
- 体检时间 / Audited at: 2026-09-20T09:53:34.168Z

## 最严重的风险 / Most severe risk

**凭据读取、解码步骤与对外请求同时出现 / Credential read, decoding step and outbound request together** `exfil.credential-read-decode-callback`

中 数据会离开这台机器。该包中有代码把本机上的内容发往外部地址。
EN Data leaves this machine. Something in this package takes content that lives here and sends it to a destination outside it.

该包会访问的目标：`registry.npmjs.org`、`schemas.android.com`、`$renderedhost$renderedport`、`$host:$port`、`$trimmed`、`github.com`、`192.168.1.20`、`192.168.1.20:3443。` / Destinations this package reaches: `registry.npmjs.org`, `schemas.android.com`, `$renderedhost$renderedport`, `$host:$port`, `$trimmed`, `github.com`, `192.168.1.20`, `192.168.1.20:3443。`

- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 它还安排了之后继续运行，所以仅仅卸载这个包并不够。
  EN It also arranges to run again later, so removing the package is not enough on its own.
- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `src/vps-deploy.ts:489`；完整列表见下方「发现」。 / The rule that decided the grade fired at `src/vps-deploy.ts:489`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

发布期钩子（维护者打包或发布时运行，安装时不会执行）： / Publish-time hooks (run when the maintainer packs or publishes, not on install):

- `prepack`: `npm run check:version && npm run check:funnel-licenses && npm run build`

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `node:fs/promises`, `go.mod`, `mobile.js`, `mobile.css`, `package.json`, `cordis.patch.yml`, `../cordis.patch.yml`, `../src/client.ts`, `../src`, `../src/${file}`, `../src/plugin.ts`, `../package.json` （另有 5 项） / (+5 more)
- **写入的文件路径 / File paths written:** `node:fs/promises`, `cloudflared.exe`, `x.trycloudflare.com`, `photo.PNG`, `notes.txt`, `extension.json`, `1.0.0`, `mobile.js`, `value.txt`, `assets/value.txt`, `host.mjs`, `assets/nested` （另有 6 项） / (+6 more)
- **派生的命令 / Commands spawned:** `node:child_process`, `./exec-file.js`, `powershell.exe`, `-NoProfile`, `-NonInteractive`, `-Command`, `utf8`, `verify`, `-c`, `whoami.exe`, `/user`, `/fo` （另有 23 项） / (+23 more)
- **连接的域名 / Domains contacted:** `registry.npmjs.org`, `schemas.android.com`, `$renderedhost$renderedport`, `$host:$port`, `$trimmed`, `github.com`, `192.168.1.20`, `192.168.1.20:3443。`, `example.cpolar.cn`, `computer.tail1234.ts.net`, `dsh.example.com`, `remote.cpolar.cn` （另有 123 项） / (+123 more)
- **读取的环境变量 / Environment variables read:** `GO_BINARY`, `DSH_SOURCE_ROOT`, `GITHUB_REF_NAME`, `DSH_HOME`, `process.env (every variable)`, `ComSpec`, `ProgramFiles`, `DSH_MOBILE_FRP_E2E`, `DSH_MOBILE_FRP_LOCAL`, `DSH_MOBILE_FRP_E2E_FRPC`, `DSH_MOBILE_FRP_E2E_SERVER`, `DSH_MOBILE_FRP_E2E_PORT` （另有 2 项） / (+2 more)

## 发现 / Findings

### 严重 / CRITICAL (3)

- **严重 / CRITICAL** `exfil.credential-read-decode-callback` — 凭据读取、解码步骤与对外请求同时出现 / Credential read, decoding step and outbound request together
  中 编码外传的三个要素全部齐备：读取了凭据，有解码或编码动作，并且有请求离开本机。编码这一步的作用，正是让随便看一眼流量的人看不出其中的密钥。
  EN All three ingredients of an encoded exfiltration are present: a credential is read, something is decoded or encoded, and a request leaves the machine. The encoding step is what hides the secret from a casual look at the traffic.
  - `src/vps-deploy.ts:489` — `chmod 0644 /usr/share/keyrings/caddy-stable-archive-keyring.gpg 2>/dev/null || true`
  - `src/vps-deploy.ts:492` — `apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl gnupg`
  - `src/vps-deploy.ts:493` — `curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg`
  - `.github/workflows/release.yml:94` — `printf '%s' "$ANDROID_KEYSTORE_BASE64" | base64 --decode > "$RUNNER_TEMP/dsh-mobile-release.jks"`
  - ……另有 3 处 / … and 3 more location(s)
  中 修复：删除凭据读取或对外调用。绝不要发布既接触密钥、又在向外发送途中编码载荷的包。
  EN Fix: Remove the credential read or the outbound call. Never ship a package that both touches secrets and encodes a payload on its way out.
- **严重 / CRITICAL** `exfil.credential-read-then-callback` — 同一个包内既有凭据文件读取又有对外请求 / Credential file read and an outbound request in the same package
  中 既读取凭据文件又发起对外请求的包，已经凑齐了窃取凭据的两半。单独看每一半都能找到理由，合在一起就只能解释为数据被送出本机。
  EN A package that reads a credential file and also makes outbound requests has the two halves of credential theft. Individually each half can be justified; together they only make sense as data leaving the machine.
  - `src/vps-deploy.ts:489` — `chmod 0644 /usr/share/keyrings/caddy-stable-archive-keyring.gpg 2>/dev/null || true`
  - `src/vps-deploy.ts:492` — `apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl gnupg`
  - `src/vps-deploy.ts:493` — `curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg`
  - `package-lock.json:886` — `"undici-types": "~8.9.0"`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：删除凭据读取。如果对外调用才是真正的功能，那么包内任何地方都不应在它之前读取密钥文件。
  EN Fix: Remove the credential read. If the outbound call is the real feature, it must not be preceded by a read of a secret file anywhere in the package.
- **严重 / CRITICAL** `priv.scripting-host-inline-command` — 用内联或编码命令调用系统脚本宿主 / Runs an OS scripting host with an inline or encoded command
  中 `osascript` 的 `do shell script`，或带 `-enc`/`-EncodedCommand` 的 PowerShell，执行的是操作系统从不在控制台显示、审查者在源码里也读不出来的命令字符串。
  EN `osascript` with `do shell script`, or PowerShell with `-enc`/`-EncodedCommand`, executes a command string that the operating system never shows in a console and that no reviewer can read in the source.
  - `src/lan-setup.ts:37` — `` -ArgumentList @('-NoProfile','-NonInteractive','-EncodedCommand','${encoded}')`,`
  中 修复：删除对脚本宿主的调用，或换成一条用户能在运行前看到的、有文档说明的外部命令。
  EN Fix: Remove the scripting-host invocation, or replace it with a documented external command that a user can see before it runs.

### 高 / HIGH (13)

- **高 / HIGH** `cred.credential-read-with-command-execution` — 同一个包内既有凭据文件读取又有 shell 执行 / Credential file read and shell execution in the same package
  中 这个包里某处读取了凭据文件，另一处又启动了进程。仅这一组合就足以把密钥管道给命令、通过 CLI 把它外传，或用窃取到的材料改写本机配置。
  EN A credential file is read somewhere in this package and a process is spawned somewhere else. That pairing is enough to pipe a secret into a command, exfiltrate it through a CLI, or rewrite the machine's configuration from stolen material.
  - `src/vps-deploy.ts:489` — `chmod 0644 /usr/share/keyrings/caddy-stable-archive-keyring.gpg 2>/dev/null || true`
  - `src/vps-deploy.ts:492` — `apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl gnupg`
  - `src/vps-deploy.ts:493` — `curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg`
  - `scripts/build-funnel-host.mjs:1` — `import { execFile as execFileCallback } from 'node:child_process'`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：删除凭据读取，并把进程启动限制在完全不会接触到密钥值的命令上。
  EN Fix: Remove the credential access, and keep process spawning limited to commands that never see secret values.
- **高 / HIGH** `cred.read-system-secret` — 读取系统密钥库或钥匙串 / Reads a system secret store or keychain
  中 该行读取了 `/etc/shadow`、钥匙串文件或 `.git-credentials`，或者通过 `security`、`keytar` 之类的库操作 macOS 钥匙串，从而拿到其他应用保存的密码。
  EN The line reads `/etc/shadow`, a keychain file, `.git-credentials`, or drives the macOS keychain through `security`, `keytar` or an equivalent library, which exposes stored passwords for other applications.
  - `src/vps-deploy.ts:489` — `chmod 0644 /usr/share/keyrings/caddy-stable-archive-keyring.gpg 2>/dev/null || true`
  - `src/vps-deploy.ts:492` — `apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl gnupg`
  - `src/vps-deploy.ts:493` — `curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg`
  - `src/vps-deploy.ts:495` — `chmod 0644 /usr/share/keyrings/caddy-stable-archive-keyring.gpg /etc/apt/sources.list.d/caddy-stable.list`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：删除这次读取。确实需要某个已保存的密钥时，应向用户索取，并通过有文档说明的宿主配置项读取。
  EN Fix: Remove the read. If a stored secret is required, ask the user and read it through a documented harness configuration key.
- **高 / HIGH** `destructive.recursive-delete-system-path` — 递归删除指向用户主目录或系统目录 / Recursive delete aimed at a home or system directory
  中 递归删除的目标是用户主目录或系统路径，一旦变量写错、展开为空或缺少判空保护，被销毁的就是用户数据而不是包自己的构建产物。
  EN A recursive delete targets a home directory or a system path, so a wrong variable, an empty expansion or a missing guard destroys user data instead of the package's own build output.
  - `src/vps-deploy.ts:523` — `rm -f /etc/caddy/Caddyfile.dsh-new`
  - `src/vps-deploy.ts:539` — `rm -f /etc/caddy/Caddyfile.dsh-new`
  - `src/vps-deploy.ts:854` — `rm -f /etc/systemd/system/dsh-mobile-frps.service`
  - `src/vps-deploy.ts:855` — `rm -f /etc/systemd/system/dsh-mobile-cert-renew.service`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：只删除包在自己目录下创建的路径，并在解析出的路径不位于该目录内时拒绝执行。
  EN Fix: Delete only paths the package created under its own directory, and refuse to run when the resolved path is not inside it.
- **高 / HIGH** `exfil.clipboard-read-then-callback` — 同一个包内既有剪贴板读取又有对外请求 / Clipboard read and an outbound request in the same package
  中 该包读取系统剪贴板，同时发起对外请求。剪贴板里有刚刚复制过的密码和令牌，而这个包里没有任何东西能解释这两种行为为何同时存在。
  EN The package reads the system clipboard and also makes outbound requests. Clipboards hold passwords and tokens that were copied moments earlier, and nothing in this package explains why the two behaviors coexist.
  - `src/client.ts:3104` — `clipboard.readText(`
  - `package-lock.json:886` — `"undici-types": "~8.9.0"`
  - `package-lock.json:3191` — `"node_modules/undici-types": {`
  - `package-lock.json:3193` — `"resolved": "https://registry.npmjs.org/undici-types/-/undici-types-8.9.0.tgz",`
  中 修复：删除剪贴板读取，或让目标地址默认不可达，并向用户说明。
  EN Fix: Remove the clipboard read, or make the destination unreachable by default and documented for the user.
- **高 / HIGH** `net.covert-channel` — 通过 websocket 或 DNS 查询回连 / Beacons over a websocket or DNS lookup
  中 该行打开了 websocket，或通过 `dns.*` 或 DNS 工具解析某个域名。两者都能在不像是 HTTP 请求的情况下传递数据，而 DNS 尤其通常被所有防火墙和代理放行。
  EN The line opens a websocket or resolves a literal domain through `dns.*` or a DNS tool. Both carry data without looking like an HTTP request, and DNS in particular is normally permitted through every firewall and proxy.
  - `apps/mobile/contract/url-policy-cases.json:36` — `"input": "wss://dsh.local",`
  - `src/plugin.ts:443` — `const webSocketPaths = new WebSocketPathStore(join(stateDirectory, 'websocket-paths.json'))`
  - `tests/gateway.test.ts:1056` — `const opened = await openWebSocket(instance, '/api/remote.mux', paired.session)`
  - `tests/gateway.test.ts:1793` — `const opened = await openWebSocket(instance, '/api/events.mux', paired.session)`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：改用发往文档中说明的端点的普通 HTTPS 请求，让流量可以被检查和记录。
  EN Fix: Use ordinary HTTPS requests to a documented endpoint so that the traffic can be inspected and logged.
- **高 / HIGH** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 112 distinct remote hosts ($host:$port, $renderedhost$renderedport, $trimmed, 192.168.1.20:3443。, example.cpolar.cn, github.com, registry.npmjs.org, schemas.android.com, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `.github/workflows/release.yml:148` — `https://registry.npmjs.org`
  - `apps/mobile/android/app/src/main/AndroidManifest.xml:2` — `http://schemas.android.com/apk/res/android`
  - `apps/mobile/android/app/src/main/java/io/github/sayach/dshmobile/GatewayUrlPolicy.kt:16` — `https://$renderedHost$renderedPort`
  - `apps/mobile/android/app/src/main/java/io/github/sayach/dshmobile/LanDiscovery.kt:174` — `https://$host:$port`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `apps/mobile/android/app/src/main/res/values-it/strings.xml:35` — `<string name="gateway_hint">https://192.168.1.20:3443</string>`
  - `apps/mobile/android/app/src/main/res/values-it/strings.xml:62` — `<string name="invalid_gateway">Indirizzo non valido\nManca un indirizzo HTTPS o una porta validi. Inserisci l\'indirizzo completo mostrato sul computer, ad esem…`
  - `apps/mobile/android/app/src/main/res/values-zh-rCN/strings.xml:35` — `<string name="gateway_hint">https://192.168.1.20:3443</string>`
  - `apps/mobile/android/app/src/main/res/values-zh-rCN/strings.xml:60` — `<string name="invalid_gateway">地址无效\n缺少有效的 HTTPS 地址或端口。请输入电脑端显示的完整地址，例如 https://192.168.1.20:3443。</string>`
  - ……另有 67 处 / … and 67 more location(s)
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **高 / HIGH** `net.token-or-blob-in-url` — 把凭据或编码数据块放进 URL / Puts a credential or encoded blob in a URL
  中 令牌形状的查询参数、内嵌的 `user:password` 授权部分，或超长高熵的查询值，都意味着密钥或载荷数据在 URL 中传输，最终会留在访问日志、代理和浏览器历史里。
  EN A token-shaped query parameter, an embedded `user:password` authority, or a long high-entropy query value means secret material or payload data travels in a URL, where it lands in access logs, proxies and browser history.
  - `apps/mobile/contract/url-policy-cases.json:41` — `"https://«redacted»@dsh.local"`
  - `apps/mobile/contract/url-policy-cases.json:56` — `"https://dsh.local/?token=secret"`
  - `apps/mobile/contract/url-policy-cases.json:104` — `"https://DSH.LOCAL:3443/mobile-access/pair#instance=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb&token=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa…`
  - `apps/mobile/contract/url-policy-cases.json:107` — `"https://dsh.local:3443/mobile-access/pair#instance=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb&token=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa…`
  - ……另有 13 处 / … and 13 more location(s)
  中 修复：凭据放在 Authorization 头里发送，载荷用 POST 放在请求体中，不要编码进查询字符串。
  EN Fix: Send credentials in an Authorization header, and POST payloads in the body rather than encoding them into the query string.
- **高 / HIGH** `persist.global-self-install` — 全局安装依赖包 / Installs a package globally
  中 该命令把包安装到全局前缀，于是用户的 PATH 上多出一个可执行文件，而且当前项目删除后它仍然留在那里。
  EN The command installs a package into the global prefix, which puts a new executable on the user's PATH and keeps it there after the current project is deleted.
  - `.github/workflows/ci.yml:44` — `npm install --global`
  中 修复：改为本地安装，并通过项目自身的脚本调用该工具；全局安装应由用户自己决定，而不是由插件代劳。
  EN Fix: Install locally and invoke the tool through the project's own scripts; global installs belong to the user's decision, not to a plugin.
- **高 / HIGH** `persist.scheduled-task-write` — 安装计划任务、agent 或系统服务 / Installs a scheduled task, agent or service
  中 该行注册了稍后会自动运行的东西——cron 条目、launch agent、systemd unit、Windows 计划任务或注册表 Run 键——因此插件在把它装进来的那次安装结束之后仍在持续执行。
  EN The line registers something that runs later — a cron entry, launch agent, systemd unit, Windows scheduled task or registry Run key — so the plugin keeps executing after the install that brought it in.
  - `src/frp-template.ts:79` — `'# systemctl start caddy',`
  - `src/vps-deploy.ts:410` — `systemctl start caddy.service || true`
  - `src/vps-deploy.ts:420` — `trap 'systemctl start caddy.service' EXIT`
  - `src/vps-deploy.ts:427` — `cat > /etc/systemd/system/dsh-mobile-cert-renew.service <<'DSH_MOBILE_CERT_SERVICE'`
  - ……另有 3 处 / … and 3 more location(s)
  中 修复：删除这一定时注册，或交给用户一条有文档说明、可以自行运行和审查的命令。
  EN Fix: Remove the scheduling, or hand the user a documented command they can run and review themselves.
- **高 / HIGH** `priv.sudo-invocation` — 通过 sudo 提权 / Escalates with sudo
  中 该行通过 `sudo` 执行命令，意味着这个以用户级工具身份安装的插件在索要 root 权限，而用户事先看不到提权提示。
  EN The line runs a command through `sudo`, so the plugin is asking for root on a machine where it was installed as a user-level tool and where the user cannot see the escalation prompt in advance.
  - `src/vps-deploy.ts:727` — `: `sudo -n env DSH_MOBILE_FRP_ARCHIVE=${shellQuote(remoteArchive)} sh -s``
  - `src/vps-deploy.ts:938` — `const remoteCommand = parsedInput.sshUser === 'root' ? 'sh -s' : 'sudo -n sh -s'`
  中 修复：去掉提权，把任何需要特权的步骤写成一条由用户主动执行的独立命令并加以说明。
  EN Fix: Remove the escalation and document any privileged step as a separate command the user runs deliberately.
- **高 / HIGH** `priv.system-path-modification` — 修改系统路径或把文件设为全局可写 / Modifies a system path or makes a file world-writable
  中 该行写入 `/etc`、`/usr`、`/bin` 或 launch daemon 目录，把属主改为 root，或设置全局可写权限。任何一种都改变了安装包之外的机器状态，也可能为后续提权铺路。
  EN The line writes under `/etc`, `/usr`, `/bin` or a launch-daemon directory, changes ownership to root, or sets world-writable permissions. Any of these changes the machine beyond the installed package and can prepare an escalation later.
  - `src/frp-template.ts:76` — `'# install -d -m 0750 -o caddy -g caddy /var/lib/caddy/dsh-mobile-certs',`
  - `src/frp-template.ts:77` — ``# install -m 0640 -o caddy -g caddy /etc/letsencrypt/live/${publicHost}/fullchain.pem /var/lib/caddy/dsh-mobile-certs/fullchain.pem`,`
  - `src/frp-template.ts:78` — ``# install -m 0640 -o caddy -g caddy /etc/letsencrypt/live/${publicHost}/privkey.pem /var/lib/caddy/dsh-mobile-certs/privkey.pem`,`
  - `src/vps-deploy.ts:413` — `install -d -m 0750 -o caddy -g caddy /var/lib/caddy/dsh-mobile-certs`
  - ……另有 6 处 / … and 6 more location(s)
  中 修复：把写入限制在包目录或用户自己的配置目录内，绝不要为了让安装成功而放宽权限。
  EN Fix: Keep writes inside the package or the user's own configuration directory, and never loosen permissions to make an install succeed.
- **高 / HIGH** `prompt.doc-instruction` — 文档中包含针对模型的指令 / Documentation contains instructions aimed at a model
  中 随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。
  EN A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.
  - `CHANGELOG.md:41` — `- Require a same-origin `Origin` header on every mutating desktop management request, including clients that omit Fetch Metadata, so private-Host reverse proxie…`
  - `docs/SELF_HOSTED_ORIGIN.en.md:16` — `Select **Save and start backend**, then point the proxy at the displayed HTTP backend. **Never expose/port-forward that HTTP listener publicly**, and never bypa…`
  - `README.en.md:147` — `The own-proxy HTTP backend must remain on a trusted private network: **never port-forward it publicly or bypass it by proxying to DSH or the existing LAN 3443 g…`
  - `README.en.md:221` — `- Approval only lets that path pass through the authenticated, same-origin DSH Mobile gateway. It does not open arbitrary TCP/UDP ports or bypass device pairing…`
  中 修复：把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。
  EN Fix: Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.

### 中 / MEDIUM (4)

- **中 / MEDIUM** `exfil.clipboard-read` — 读取系统剪贴板 / Reads the system clipboard
  中 该行通过 `pbpaste`、`xclip`、`wl-paste`、`Get-Clipboard` 或 `clipboardy` 读取剪贴板。剪贴板里经常放着刚刚复制过的密码、令牌和私密文本。
  EN The line reads the clipboard through `pbpaste`, `xclip`, `wl-paste`, `Get-Clipboard` or `clipboardy`. Clipboards routinely hold passwords, tokens and private text that were copied moments earlier.
  - `src/client.ts:3104` — `clipboard.readText(`
  中 修复：通过插件配置向用户索取该值，而不是读取剪贴板上恰好存在的内容。
  EN Fix: Ask the user for the value through the plugin config instead of reading whatever happens to be on the clipboard.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `src/client-messages.ts:354` — `http://127.0.0.1:{port`
  - `src/client-messages.ts:423` — `http://127.0.0.1:{port`
  - `src/client-messages.ts:492` — `http://127.0.0.1:{port`
  - `src/cloudflared.ts:357` — `http://127.0.0.1:${String(reservation.port`
  - ……另有 48 处 / … and 48 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `obf.long-minified-line` — 整行是压缩或机器生成的数据块 / Line is a single minified or machine-generated blob
  中 该行超过 500 个字符且几乎没有空白，正是打包载荷、压缩字符串表或机器生成单行代码的样子。这样的一行用肉眼什么也审不出来。
  EN The line is over 500 characters with almost no whitespace, which is what a bundled payload, a packed string table or a machine-generated one-liner looks like. Nothing on such a line is reviewable by eye.
  - `src/client-messages.ts:34` — `generateCopyKey: '生成并复制密钥', copyPairLink: '复制配对链接', managePairedDevices: '管理配对设备', clearAllDevices: '清除所有设备', pairingQr: '配对二维码', remoteIntro: '选择更适合你的远程通道。切换或关…`
  - `src/client-messages.ts:37` — `cpolarUnsupported: '当前支持 Windows x64 与 Linux x64/arm64。', cpolarNotInstalled: '尚未安装。只有点击下方按钮后，才会从 cpolar 官网下载固定版本。', cpolarNeedsToken: '官方组件 {version} 已校验，下一步只需…`
  - `src/client.ts:2306` — `cloudflared_component_missing: 'cloudflaredMissing', cloudflared_component_invalid: 'cloudflaredInvalid', cloudflared_component_unsupported: 'cloudflaredCompone…`
  - `src/client.ts:2307` — `frp_component_missing: 'frpMissing', frp_component_invalid: 'frpInvalid', frp_config_missing: 'frpConfigMissing', frp_config_verify_failed: 'frpConfigVerifyFail…`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：发布未压缩的源码，或在 README 中说明该文件由哪个构建产出、可读源码在哪里。
  EN Fix: Ship unminified source, or state in the README which build produced the file and where the readable source lives.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 11 shipped file(s) are 64 KiB or larger and were not read as text, the largest being apps/mobile/store/android/icon-512.png at 511 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `apps/mobile/store/android/icon-512.png` — `523379 bytes not decoded as text`
  - `package-lock.json:886` — `"undici-types": "~8.9.0"`
  - `package-lock.json:3191` — `"node_modules/undici-types": {`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (4)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `src/client-messages.ts:55` — `frpStep2Title: '2 · Prepare the VPS', frpStep2Text: 'Copy the restricted frps and Caddy template, then apply it on your VPS.', copyServerTemplate: 'Copy server …`
  - `src/client-messages.ts:55` — `2 · Prepare the VPSCopy the restricted frps and Caddy template, then apply it on your VPS.Copy server templateServer template copied. Save frps.toml and the Cad…`
  - `src/client-messages.ts:65` — `frpStep2Title: '2 · Prepara il VPS', frpStep2Text: 'Copia il modello limitato per frps e Caddy e applicalo sul VPS.', copyServerTemplate: 'Copia modello server'…`
  - `src/client-messages.ts:65` — `2 · Prepara il VPSCopia il modello limitato per frps e Caddy e applicalo sul VPS.Copia modello serverModello server copiato. Salva frps.toml e lo snippet Caddy …`
  - ……另有 9 处 / … and 9 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `cred.many-secret-env-vars` — 读取多个不同名称的密钥类环境变量 / Reads several differently-named secret environment variables
  中 这里的一行、或整个包里的若干行，读取了名称看起来像凭据的环境变量。只读一个文档中声明的 key 是插件本该有的认证方式；枚举多个不同名称的密钥，则是在收集凭据而不是在使用凭据。
  EN One line here, or several across the package, read environment variables whose names look like credentials. Reading a single documented key is how a plugin is meant to authenticate; enumerating many differently-named ones is how credentials are gathered rather than used.
  - `tests/frp-live.test.ts:187` — `process.env.DSH_MOBILE_FRP_E2E_TOKEN`
  中 修复：只保留插件确实需要且有文档说明的变量，删掉与任何功能无关的密钥读取。
  EN Fix: Keep to the variables this plugin documents and needs, and delete reads of keys it has no feature for.
- **低 / LOW** `destructive.shipped-command` — 内置破坏性文件系统命令 / Ships a destructive filesystem command
  中 抹掉用户主目录、根文件系统或分区的命令出现在可执行内容里，而不是文档描述中。即便有条件判断保护，这种原语也绝不该被塞进插件里。
  EN A command that erases a home directory, a root filesystem or a partition appears in executable content rather than in prose. Even guarded by a condition, it is a primitive that should never travel inside a plugin.
  - `tests/vps-deploy.test.ts:45` — `expect(() => parseVpsDeploymentInput({ sshUser: 'root;rm -rf /', sshPort: 22, hostFingerprints: [fingerprintA] })).toThrow('vps_ssh_user_invalid')`
  中 修复：删除该命令。插件如果必须清理，应把删除限定在它自己创建的目录，并以包根目录为基准解析这个路径。
  EN Fix: Delete the command. If a plugin must clean up, restrict deletion to a directory it created and resolve that path from the package root.
- **低 / LOW** `obf.dynamic-code-eval` — 执行运行时拼装出来的代码 / Evaluates code built at runtime
  中 该行执行的是一个并非源码字面量的表达式，真正运行的代码在插件运行时才被拼装出来，无法在 tarball 中审查。
  EN The line evaluates an expression that is not a source literal, so the executed code is assembled while the plugin runs and cannot be reviewed in the tarball.
  - `tests/gateway.test.ts:1618` — `expect(() => new Function(loginScript.body)).not.toThrow()`
  中 修复：用静态函数或数据表替代动态求值；任何审计都无法为运行时才存在的代码背书。
  EN Fix: Replace the dynamic evaluation with a static function or a data table; there is no audit that can vouch for code that does not exist until runtime.

_按类别 / By category:_ 网络回调 / network callbacks 5 · 数据外传 / exfiltration 4 · 凭据读取 / credential access 4 · 提权 / privilege 3 · 破坏性 / destructive 2 · 持久化 / persistence 2 · 混淆 / obfuscation 2 · 提示注入 / prompt injection 1 · 供应链 / supply chain 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `dsh-mobile-HEAD/`
- skipped apps/mobile/android/app/src/main/res/drawable-nodpi/setup_background_image.png: 1136524 bytes exceeds the 524288-byte per-file cap
- skipped apps/mobile/brand/app-icon-master.png: 1986820 bytes exceeds the 524288-byte per-file cap
- skipped assets/brand/app-icon-master.png: 1986820 bytes exceeds the 524288-byte per-file cap
- skipped assets/brand/repository-hero.png: 1702015 bytes exceeds the 524288-byte per-file cap
- skipped assets/screenshots/device-management.jpg: 683707 bytes exceeds the 524288-byte per-file cap
- skipped assets/screenshots/third-party-plugin-adaptation.png: 581036 bytes exceeds the 524288-byte per-file cap
- skipped assets/screenshots/websocket-diagnostics.png: 1264066 bytes exceeds the 524288-byte per-file cap
- skipped bin/dsh-mobile-funnel-linux-arm64: 20643966 bytes exceeds the 524288-byte per-file cap
- skipped bin/dsh-mobile-funnel-linux-x64: 22257790 bytes exceeds the 524288-byte per-file cap
- skipped bin/dsh-mobile-funnel-win32-x64.exe: 22535680 bytes exceeds the 524288-byte per-file cap
- not scanned (binary): apps/mobile/android/app/src/main/res/mipmap-hdpi/ic_launcher.png, apps/mobile/android/app/src/main/res/mipmap-mdpi/ic_launcher.png, apps/mobile/android/app/src/main/res/mipmap-xhdpi/ic_launcher.png, apps/mobile/android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png, apps/mobile/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png and 12 more
- ……另有 3 项 / … and 3 more

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
