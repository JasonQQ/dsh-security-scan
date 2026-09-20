> 批量压测 / Batch stress test · ★ 883 · `Anionex/dsh-vision-toolkit`
> https://github.com/Anionex/dsh-vision-toolkit · audited in 3.0s
# 安装前体检 / Pre-install audit: @anionex/dsh-vision-toolkit@0.1.45

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/Anionex/dsh-vision-toolkit/tar.gz/HEAD` (URL / url)
- 已分析文件：318 个（8.7 MiB） / Files analysed: 318 (8.7 MiB)
- 内容摘要 / Content digest: `f5c075ddb891b4ad20ff1caf5e8efd30…`
- 体检时间 / Audited at: 2026-09-20T09:52:31.296Z

## 最严重的风险 / Most severe risk

**源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model** `prompt.embedded-instruction-string`

中 它夹带了写给 agent 而不是写给人看的文字——试图在你不察觉的情况下改变 agent 行为的指令。
EN It carries text aimed at the agent rather than at a person — instructions that try to change what the agent does without telling you.

该包会访问的目标：`ifdian.net`、`github.com`、`registry.npmjs.org`、`dsh-vision-python-bootstrap-1317715800.cos.ap-guangzhou.myqcloud.com`、`www.w3.org`、`agent-vision.anionex.me`、`dsh.local`、`vision.anionex.me` / Destinations this package reaches: `ifdian.net`, `github.com`, `registry.npmjs.org`, `dsh-vision-python-bootstrap-1317715800.cos.ap-guangzhou.myqcloud.com`, `www.w3.org`, `agent-vision.anionex.me`, `dsh.local`, `vision.anionex.me`

- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 它还安排了之后继续运行，所以仅仅卸载这个包并不够。
  EN It also arranges to run again later, so removing the package is not enough on its own.
- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `lib/upstream.js:390`；完整列表见下方「发现」。 / The rule that decided the grade fired at `lib/upstream.js:390`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

发布期钩子（维护者打包或发布时运行，安装时不会执行）： / Publish-time hooks (run when the maintainer packs or publishes, not on install):

- `prepack`: `npm run build`

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `node:fs/promises`, `/metadata.json`, `/package.json`, `/pnpm-lock.yaml`, `/node_modules/`, `metadata.json`, `package.json`, `pnpm-lock.yaml`, `../assets/skill/SKILL.md`, `../package.json`, `/`, `metrics.json` （另有 55 项） / (+55 more)
- **写入的文件路径 / File paths written:** `node:fs/promises`, `package.json`, `pnpm-lock.yaml`, `metadata.json`, `runtime.json`, `client.js`, `UPSTREAM.json`, `metrics.json`, `autocrlf-probe.txt`, `html_shot.py`, `a.png`, `b.webp` （另有 25 项） / (+25 more)
- **派生的命令 / Commands spawned:** `node:child_process`, `-e`, `execa`, `^10.0.0`, `--import`, `tsx/esm`, `ignore`, `pipe`, `-c`, `utf8`, `--check`, `cmd.exe` （另有 18 项） / (+18 more)
- **连接的域名 / Domains contacted:** `ifdian.net`, `github.com`, `registry.npmjs.org`, `dsh-vision-python-bootstrap-1317715800.cos.ap-guangzhou.myqcloud.com`, `www.w3.org`, `agent-vision.anionex.me`, `dsh.local`, `vision.anionex.me`, `dsh.internal`, `${authority`, `mirrors.cloud.tencent.com`, `127.0.0.1` （另有 22 项） / (+22 more)
- **读取的环境变量 / Environment variables read:** `process.env (every variable)`, `DSH_HOME`, `DSH_VISION_TOOLKIT_ALLOW_DETACHED_RESTART`, `COMSPEC`, `VISION_SSL_VERIFY`, `DVT_RESTART_STATE`, `DVT_INSTALLED_PACKAGE`, `DSH_VISION_PROFILE_DSH_VERSION`, `DSH_VISION_REQUIRE_PROFILE_E2E`

## 发现 / Findings

### 高 / HIGH (6)

- **高 / HIGH** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 30 distinct remote hosts (${authority, agent-vision.anionex.me, dsh-vision-python-bootstrap-1317715800.cos.ap-guangzhou.myqcloud.com, github.com, ifdian.net, registry.npmjs.org, vision.anionex.me, www.w3.org, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `.github/FUNDING.yml:2` — `https://ifdian.net/a/anionex`
  - `.github/ISSUE_TEMPLATE/config.yml:7` — `https://github.com/Anionex/dsh-vision-toolkit/blob/main/SUPPORT.md`
  - `.github/workflows/ci.yml:38` — `https://registry.npmjs.org`
  - `assets/python-bootstrap.json:5` — `https://dsh-vision-python-bootstrap-1317715800.cos.ap-guangzhou.myqcloud.com`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `lib/upstream.js:390` — `' command[1:1]=["--use-mock-keychain",f"--user-data-dir={profile}","--incognito","--disable-background-networking","--proxy-server=http://127.0.0.1:9","--proxy-…`
  - `src/upstream.ts:570` — `' command[1:1]=["--use-mock-keychain",f"--user-data-dir={profile}","--incognito","--disable-background-networking","--proxy-server=http://127.0.0.1:9","--proxy-…`
  - `tests/artifact-access.spec.ts:59` — `return `http://127.0.0.1:${address.port}``
  - `tests/paste-images.spec.ts:57` — `const base = `http://127.0.0.1:${address.port}``
  - ……另有 18 处 / … and 18 more location(s)
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **高 / HIGH** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `lib/client.js:2138` — `if (__modules[id] === undefined) return require(id);`
  - `lib/client.js:2141` — `__modules[id](module, module.exports, require, function(request) { var resolved = __resolve(id, request); return __modules[resolved] === undefined ? require(req…`
  - `scripts/build-client.mjs:48` — `' if (__modules[id] === undefined) return require(id);',`
  - `scripts/build-client.mjs:51` — `' __modules[id](module, module.exports, require, function(request) { var resolved = __resolve(id, request); return __modules[resolved] === undefined ? require(r…`
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.
- **高 / HIGH** `persist.global-self-install` — 全局安装依赖包 / Installs a package globally
  中 该命令把包安装到全局前缀，于是用户的 PATH 上多出一个可执行文件，而且当前项目删除后它仍然留在那里。
  EN The command installs a package into the global prefix, which puts a new executable on the user's PATH and keeps it there after the current project is deleted.
  - `.github/workflows/ci.yml:91` — `npm install --global`
  - `.github/workflows/ci.yml:163` — `npm install --global`
  中 修复：改为本地安装，并通过项目自身的脚本调用该工具；全局安装应由用户自己决定，而不是由插件代劳。
  EN Fix: Install locally and invoke the tool through the project's own scripts; global installs belong to the user's decision, not to a plugin.
- **高 / HIGH** `prompt.embedded-instruction-string` — 源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model
  中 源码中的字符串字面量——通常是工具描述或系统提示词片段——要求模型绕过确认或对用户隐瞒某些事，于是它作为一条指令进入上下文窗口。
  EN A string literal in the source — typically a tool description or system prompt fragment — tells the model to bypass confirmation or to hide something from the user, so it lands in the context window as a directive.
  - `lib/upstream.js:390` — `' command[1:1]=["--use-mock-keychain",f"--user-data-dir={profile}","--incognito","--disable-background-networking","--proxy-server=http://127.0.0.1:9","--proxy-…`
  - `src/upstream.ts:570` — `' command[1:1]=["--use-mock-keychain",f"--user-data-dir={profile}","--incognito","--disable-background-networking","--proxy-server=http://127.0.0.1:9","--proxy-…`
  中 修复：如实描述工具的行为，删除那些会改变 agent 对待用户方式的指令。
  EN Fix: Describe the tool's behavior factually and remove directives that change how the agent treats the user.
- **高 / HIGH** `supply.url-dependency` — 依赖解析到 URL、git 引用或文件路径 / Dependency resolves to a URL, git ref or file path
  中 依赖不是从仓库解析，而是来自 URL、git 引用、本地路径或 patch，因此其内容不受仓库锁文件和任何完整性元数据约束，可以在版本号不变的情况下被替换。
  EN A dependency is resolved from a URL, a git reference, a local path or a patch instead of the registry, so its contents are not covered by the registry lockfile or by any integrity metadata and can change without a version bump.
  - `package.json:94` — `"upstreamRepository": "https://github.com/Anionex/agent-vision-toolkit",`
  中 修复：改为依赖仓库中已发布的版本，并用锁文件固定；如果确实必须用 fork，就把它发布到自己名下的 scope。
  EN Fix: Depend on a published version from the registry, pinned by a lockfile; if a fork is unavoidable, publish it under your own scope.

### 中 / MEDIUM (5)

- **中 / MEDIUM** `cred.read-dotenv-or-history` — 读取 dotenv 文件或 shell 历史 / Reads a dotenv file or shell history
  中 该行读取了 `.env` 或 shell 历史文件。这两处都是令牌、云密钥和曾经粘贴过的密钥堆积的地方，而 shell 历史还会勾勒出用户的基础设施全貌。
  EN This line reads `.env` or a shell history file. Both are where tokens, cloud keys and previously pasted secrets accumulate, and a shell history also maps out the user's infrastructure.
  - `lib/client.js:1163` — `}) })] }), (0, jsx_runtime_1.jsxs)("section", { className: "dvt-panel dvt-update-panel", children: [(0, jsx_runtime_1.jsxs)("div", { className: "dvt-panel-title…`
  - `lib/plugin-update.js:175` — `const manifest = JSON.parse(readFileSync(payload.profileDir + '/node_modules/'`
  - `src/plugin-update.ts:295` — `const manifest = JSON.parse(readFileSync(payload.profileDir + '/node_modules/'`
  - `tests/plugin-update.spec.ts:458` — `await expect(readFile(join(fixture.profileDir, '.dsh-vision-toolkit-update.lock')))`
  - ……另有 4 处 / … and 4 more location(s)
  中 修复：通过插件配置 schema 加载配置，而不是读取 dotenv 文件；永远不要打开用户的历史记录。
  EN Fix: Load configuration through the plugin config schema instead of reading dotenv files, and never open the user's history.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `lib/plugin-update.js:363` — `http://${authority`
  - `lib/plugin-update.js:566` — `http://${authority`
  - `lib/upstream.js:390` — `http://127.0.0.1:9`
  - `src/plugin-update.ts:477` — `http://${authority`
  - ……另有 24 处 / … and 24 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `obf.long-minified-line` — 整行是压缩或机器生成的数据块 / Line is a single minified or machine-generated blob
  中 该行超过 500 个字符且几乎没有空白，正是打包载荷、压缩字符串表或机器生成单行代码的样子。这样的一行用肉眼什么也审不出来。
  EN The line is over 500 characters with almost no whitespace, which is what a bundled payload, a packed string table or a machine-generated one-liner looks like. Nothing on such a line is reviewable by eye.
  - `lib/client.js:1167` — `.dvt-tool-head{width:100%;min-height:38px;display:flex;align-items:center;gap:7px;padding:8px 10px;border:0;background:transparent;color:inherit;text-align:left…`
  - `lib/client.js:1168` — `.dvt-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.dvt-metrics>div,.dvt-diff-score{padding:10px;border-radius:9px;background:var(-…`
  - `src/client/index.tsx:1438` — `<section className="dvt-panel"><div className="dvt-panel-title"><div><h3>{t('health')}</h3><p>{t('connectionHint')}</p></div><div className="dvt-actions"><Butto…`
  - `src/client/index.tsx:1515` — `.dvt-tool-head{width:100%;min-height:38px;display:flex;align-items:center;gap:7px;padding:8px 10px;border:0;background:transparent;color:inherit;text-align:left…`
  中 修复：发布未压缩的源码，或在 README 中说明该文件由哪个构建产出、可读源码在哪里。
  EN Fix: Ship unminified source, or state in the README which build produced the file and where the readable source lives.
- **中 / MEDIUM** `prompt.concealed-instruction` — 把文本藏在注释或不可见字符中 / Hides text in a comment or invisible characters
  中 该行把内容藏在 HTML 注释里，或藏在零宽字符与双向控制字符之后，这些内容在 diff 或渲染后的文档中什么都看不见，却仍会作为文本被读取。
  EN The line conceals content either in an HTML comment or behind zero-width and bidirectional control characters, which render as nothing in a diff or a rendered document while still being read as text.
  - `.github/PULL_REQUEST_TEMPLATE.md:7` — `Summarize the implementation and the affected tools, lifecycle paths, files, or public claims.`
  中 修复：删除被隐藏的文本和不可见字符；审查者看不到的东西就不该出现在发布的包里。
  EN Fix: Delete the concealed text and the invisible characters; anything a reviewer cannot see does not belong in a shipped package.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 31 shipped file(s) are 64 KiB or larger and were not read as text, the largest being assets/dsh-conversation-screenshot-debugging.png at 378 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `assets/dsh-conversation-screenshot-debugging.png` — `386587 bytes not decoded as text`
  - `lib/client.js:34` — `const response = await fetch(exports.DISPLAY_CONFIG_ROUTE, { cache: 'no-store' });`
  - `lib/client.js:690` — `const response = await fetch(SETTINGS_ROUTE, { credentials: 'same-origin', ...init });`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (5)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `lib/client.js:1142` — `const manualUpdateProfile = updateCapability.profile ?? 'web';`
  - `lib/client.js:1163` — `}) })] }), (0, jsx_runtime_1.jsxs)("section", { className: "dvt-panel dvt-update-panel", children: [(0, jsx_runtime_1.jsxs)("div", { className: "dvt-panel-title…`
  - `lib/plugin-update.js:96` — `atomicWrite(payload.profileDir + '/package.json', manifest, metadata.manifestMode)`
  - `lib/plugin-update.js:97` — `const lockfile = payload.profileDir + '/pnpm-lock.yaml'`
  - ……另有 33 处 / … and 33 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `cred.env-harvest` — 读取或整体导出进程环境变量 / Reads or dumps the process environment
  中 该行把整个环境当成一个值取走——序列化、遍历或打印它，而不是只取自己需要的那一个变量。CI 运行器和宿主都会把 API Key 导出到环境变量里，因此整体导出就是一次凭据收集。
  EN The line takes the whole environment as a value — serializing it, iterating it, or printing it — rather than the one variable it needs. CI runners and the harness export API keys into the environment, so a dump is a credential harvest.
  - `tests/profile-install.e2e.spec.ts:76` — `Object.entries({ ...process.env`
  中 修复：只逐个读取插件文档中声明过的变量，绝不序列化整个环境对象，也不要把它写进日志或请求。
  EN Fix: Read only the variables the plugin documents, one at a time, and never serialize the environment object or forward it into a log or request.
- **低 / LOW** `net.token-or-blob-in-url` — 把凭据或编码数据块放进 URL / Puts a credential or encoded blob in a URL
  中 令牌形状的查询参数、内嵌的 `user:password` 授权部分，或超长高熵的查询值，都意味着密钥或载荷数据在 URL 中传输，最终会留在访问日志、代理和浏览器历史里。
  EN A token-shaped query parameter, an embedded `user:password` authority, or a long high-entropy query value means secret material or payload data travels in a URL, where it lands in access logs, proxies and browser history.
  - `tests/plugin-update.spec.ts:393` — `'GET https://«redacted»@registry.example/?token=query-secret failed '`
  中 修复：凭据放在 Authorization 头里发送，载荷用 POST 放在请求体中，不要编码进查询字符串。
  EN Fix: Send credentials in an Authorization header, and POST payloads in the body rather than encoding them into the query string.
- **低 / LOW** `persist.shell-rc-append` — 追加写入 shell 启动文件 / Appends to a shell startup file
  中 该行写入了 `.bashrc`、`.zshrc`、`.profile` 或 fish 配置，因此改动会在之后每个交互式 shell 中生效，而且删掉包目录也不会消失。
  EN The line writes into `.bashrc`, `.zshrc`, `.profile` or a fish config, so the change takes effect in every future interactive shell and survives removing the package directory.
  - `tests/plugin-update.spec.ts:338` — `await writeFile(join(fixture.profileDir, 'package.json'), JSON.stringify({`
  中 修复：不要修改 shell 启动文件；如果需要 shell 集成，就把那行内容打印出来，由用户自行决定是否添加。
  EN Fix: Do not modify shell startup files; if a shell integration is required, print the line for the user to add deliberately.
- **低 / LOW** `priv.system-path-modification` — 修改系统路径或把文件设为全局可写 / Modifies a system path or makes a file world-writable
  中 该行写入 `/etc`、`/usr`、`/bin` 或 launch daemon 目录，把属主改为 root，或设置全局可写权限。任何一种都改变了安装包之外的机器状态，也可能为后续提权铺路。
  EN The line writes under `/etc`, `/usr`, `/bin` or a launch-daemon directory, changes ownership to root, or sets world-writable permissions. Any of these changes the machine beyond the installed package and can prepare an escalation later.
  - `tests/plugin-update.spec.ts:29` — `readonly resolveExecutable = vi.fn(async () => '/usr/local/bin/pnpm')`
  中 修复：把写入限制在包目录或用户自己的配置目录内，绝不要为了让安装成功而放宽权限。
  EN Fix: Keep writes inside the package or the user's own configuration directory, and never loosen permissions to make an install succeed.

_按类别 / By category:_ 网络回调 / network callbacks 4 · 凭据读取 / credential access 3 · 混淆 / obfuscation 2 · 持久化 / persistence 2 · 提示注入 / prompt injection 2 · 供应链 / supply chain 2 · 提权 / privilege 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `dsh-vision-toolkit-HEAD/`
- skipped assets/hero-v2.png: 1721963 bytes exceeds the 524288-byte per-file cap
- skipped workers/moondream-openai-proxy/worker-configuration.d.ts: 574257 bytes exceeds the 524288-byte per-file cap
- not scanned (binary): assets/community-group-qr.png, assets/dsh-conversation-artifact.png, assets/dsh-conversation-image-qa-top.png, assets/dsh-conversation-image-qa.png, assets/dsh-conversation-pixel-diff.png and 36 more
- outbound fetching was permitted for this audit
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
