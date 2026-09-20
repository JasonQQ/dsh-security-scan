> 批量压测 / Batch stress test · ★ 174 · `ZSeven-W/dsh-openpencil`
> https://github.com/ZSeven-W/dsh-openpencil · audited in 2.7s
# 安装前体检 / Pre-install audit: @zseven-w/dsh-openpencil-darwin-arm64@0.1.0-rc.10

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/ZSeven-W/dsh-openpencil/tar.gz/HEAD` (URL / url)
- 已分析文件：120 个（2.0 MiB） / Files analysed: 120 (2.0 MiB)
- 内容摘要 / Content digest: `c2c068ac6426f4f1c1eae4e5b7853f38…`
- 体检时间 / Audited at: 2026-09-20T09:53:54.650Z

## 最严重的风险 / Most severe risk

**向裸 IP 地址发送请求 / Sends a request to a bare IP address** `net.raw-ip-destination`

中 它会建立出站连接，因此可以在你无法选择的时机接收指令或送出数据。
EN It opens an outbound connection, so it can receive instructions or send data at a moment you do not choose.

该包会访问的目标：`github.com`、`registry.npmjs.org`、`127.0.0.1:${address.port`、`package-smoke`、`127.0.0.1:${handshake.port`、`127.0.0.1`、`dsh.invalid`、`${authority` / Destinations this package reaches: `github.com`, `registry.npmjs.org`, `127.0.0.1:${address.port`, `package-smoke`, `127.0.0.1:${handshake.port`, `127.0.0.1`, `dsh.invalid`, `${authority`

- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 它还安排了之后继续运行，所以仅仅卸载这个包并不够。
  EN It also arranges to run again later, so removing the package is not enough on its own.
- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `scripts/test-host.mjs:145`；完整列表见下方「发现」。 / The rule that decided the grade fired at `scripts/test-host.mjs:145`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `node:fs/promises`, `package.json`, `.md`, `npm/package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `Cargo.toml`, `vendor/openpencil/Cargo.toml`, `platforms.json`, `sdk.js`, `op_web_sdk_bg.wasm`, `/` （另有 11 项） / (+11 more)
- **写入的文件路径 / File paths written:** `node:fs/promises`, `.json`, `\n`, `dsh-viewer-assets.d.ts`, `src/dsh-viewer-assets.d.ts`, `manifest.json`, `package.json`, `\\n`, `openpencil-runtime.json`, `op_host_web.js`, `op_host_web_bg.wasm`, `web/pkg/op_host_web.js` （另有 8 项） / (+8 more)
- **派生的命令 / Commands spawned:** `node:child_process`, `win32`, `cargo.exe`, `cargo`, `bash`, `tools/check-wasm-bundle.sh`, `git`, `utf8`, `install`, `--lockfile-only`, `--ignore-scripts`, `inherit` （另有 2 项） / (+2 more)
- **连接的域名 / Domains contacted:** `github.com`, `registry.npmjs.org`, `127.0.0.1:${address.port`, `package-smoke`, `127.0.0.1:${handshake.port`, `127.0.0.1`, `dsh.invalid`, `${authority`, `${entry`, `dsh.local`, `localhost`, `example.com` （另有 10 项） / (+10 more)
- **读取的环境变量 / Environment variables read:** `process.env (every variable)`, `NODE_AUTH_TOKEN`, `DSH_SOURCE_ROOT`, `OPENPENCIL_ROOT`, `ESBUILD_BIN`, `DSHPLUGIN_OPENPENCIL_VIEWER_SOURCE`, `DSH_OPENPENCIL_VIEWER_SOURCE`, `DSH_HOME`, `PATH`, `FAKE_DRAFT_LOG`, `FAKE_DRAFT_HANDSHAKE_DELAY_MS`, `FAKE_DRAFT_DROP_RESET_RESPONSE_ONCE` （另有 8 项） / (+8 more)

## 发现 / Findings

### 高 / HIGH (4)

- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `scripts/test-host.mjs:145` — `const origin = `http://127.0.0.1:${address.port}``
  - `scripts/test-viewer-assets.mjs:39` — `const origin = `http://127.0.0.1:${address.port}``
  - `scripts/verify-platform-packages.mjs:230` — `const base = `http://127.0.0.1:${handshake.port}``
  - `src/design-draft-controller.ts:432` — `allowOrigin: 'http://127.0.0.1',`
  - ……另有 22 处 / … and 22 more location(s)
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **高 / HIGH** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `scripts/verify-selective-install.mjs:172` — `"import(pathToFileURL(join(dirname(manifest), 'lib', 'editor-runtime.js')).href).then(mod => {",`
  - `src/client/index.tsx:608` — `pending = import(/* @vite-ignore */ absoluteUrl).then((module: unknown) => {`
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.
- **高 / HIGH** `persist.global-self-install` — 全局安装依赖包 / Installs a package globally
  中 该命令把包安装到全局前缀，于是用户的 PATH 上多出一个可执行文件，而且当前项目删除后它仍然留在那里。
  EN The command installs a package into the global prefix, which puts a new executable on the user's PATH and keeps it there after the current project is deleted.
  - `.github/workflows/release.yml:380` — `npm install --global`
  - `.github/workflows/release.yml:410` — `npm install --global`
  中 修复：改为本地安装，并通过项目自身的脚本调用该工具；全局安装应由用户自己决定，而不是由插件代劳。
  EN Fix: Install locally and invoke the tool through the project's own scripts; global installs belong to the user's decision, not to a plugin.
- **高 / HIGH** `priv.sudo-invocation` — 通过 sudo 提权 / Escalates with sudo
  中 该行通过 `sudo` 执行命令，意味着这个以用户级工具身份安装的插件在索要 root 权限，而用户事先看不到提权提示。
  EN The line runs a command through `sudo`, so the plugin is asking for root on a machine where it was installed as a user-level tool and where the user cannot see the escalation prompt in advance.
  - `.github/workflows/check.yml:115` — `sudo apt-get update`
  - `.github/workflows/check.yml:116` — `sudo apt-get install --yes pkg-config libfreetype-dev libfontconfig1-dev fonts-noto-cjk`
  - `.github/workflows/release.yml:123` — `sudo apt-get update`
  - `.github/workflows/release.yml:124` — `sudo apt-get install --yes pkg-config libfreetype-dev libfontconfig1-dev fonts-noto-cjk`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：去掉提权，把任何需要特权的步骤写成一条由用户主动执行的独立命令并加以说明。
  EN Fix: Remove the escalation and document any privileged step as a separate command the user runs deliberately.

### 中 / MEDIUM (4)

- **中 / MEDIUM** `cred.many-secret-env-vars` — 读取多个不同名称的密钥类环境变量 / Reads several differently-named secret environment variables
  中 这里的一行、或整个包里的若干行，读取了名称看起来像凭据的环境变量。只读一个文档中声明的 key 是插件本该有的认证方式；枚举多个不同名称的密钥，则是在收集凭据而不是在使用凭据。
  EN One line here, or several across the package, read environment variables whose names look like credentials. Reading a single documented key is how a plugin is meant to authenticate; enumerating many differently-named ones is how credentials are gathered rather than used.
  - `scripts/publish-release.mjs:42` — `process.env.NODE_AUTH_TOKEN`
  中 修复：只保留插件确实需要且有文档说明的变量，删掉与任何功能无关的密钥读取。
  EN Fix: Keep to the variables this plugin documents and needs, and delete reads of keys it has no feature for.
- **中 / MEDIUM** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 19 distinct remote hosts (${authority, ${entry, 127.0.0.1:${address.port, 127.0.0.1:${handshake.port, dsh.invalid, github.com, package-smoke, registry.npmjs.org, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `.github/workflows/release.yml:143` — `https://github.com/WebAssembly/binaryen/releases/download/${BINARYEN_VERSION`
  - `.github/workflows/release.yml:407` — `https://registry.npmjs.org`
  - `.gitmodules:3` — `https://github.com/ZSeven-W/openpencil.git`
  - `npm/darwin-arm64/package.json:8` — `git+https://github.com/ZSeven-W/dsh-openpencil.git`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `scripts/test-host.mjs:145` — `http://127.0.0.1:${address.port`
  - `scripts/test-viewer-assets.mjs:39` — `http://127.0.0.1:${address.port`
  - `scripts/verify-platform-packages.mjs:230` — `http://127.0.0.1:${handshake.port`
  - `src/design-draft-controller.ts:432` — `http://127.0.0.1`
  - ……另有 24 处 / … and 24 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `obf.long-minified-line` — 整行是压缩或机器生成的数据块 / Line is a single minified or machine-generated blob
  中 该行超过 500 个字符且几乎没有空白，正是打包载荷、压缩字符串表或机器生成单行代码的样子。这样的一行用肉眼什么也审不出来。
  EN The line is over 500 characters with almost no whitespace, which is what a bundled payload, a packed string table or a machine-generated one-liner looks like. Nothing on such a line is reviewable by eye.
  - `src/design-draft-tools.ts:69` — `const VERIFIED_LUCIDE_ICONS = 'home/search/shopping-bag/shopping-cart/user/heart/star/plus/arrow-right/sparkles/sun/apple/snowflake/droplet/cookie/leaf/coffee/p…`
  - `tests/design-draft-tools.test.mjs:403` — `assert.match(result.buildContract.generation.second, /Second=fresh parent-only I\/K.*no mutation\/new Page\/App Content\/Header\/Hero.*rootNodeId<=3 regions.*ol…`
  - `tests/design-draft-tools.test.mjs:418` — `assert.match(result.buildContract.node.icon, /\{type:'icon_font',name:'Search icon',iconFontName:'search',width:20,height:20\}.*name=layer label.*iconFontName=g…`
  中 修复：发布未压缩的源码，或在 README 中说明该文件由哪个构建产出、可读源码在哪里。
  EN Fix: Ship unminified source, or state in the README which build produced the file and where the readable source lives.

### 低 / LOW (2)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `scripts/collab-bootstrap-config.mjs:12` — `const sanitized = { ...env }`
  - `src/editor-runtime.ts:585` — `const env = options.env ?? process.env`
  - `src/plugin-env.ts:56` — `const env = options.env ?? process.env`
  - `src/plugin-env.ts:68` — `+ `DSH reserves the ${LEGACY_ENV_PREFIX} prefix for itself: a .env file that sets ${legacy} makes the ``
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `supply.packaging-constraints` — 清单内置依赖或限定平台 / Manifest bundles dependencies or pins platforms
  中 `bundledDependencies` 会把依赖的私有副本打进 tarball，使这部分代码绕过仓库的完整性元数据；而 `os`/`cpu` 数组则直接限制了包能安装在哪些机器上。
  EN `bundledDependencies` ships a private copy of dependencies inside the tarball, which bypasses the registry's integrity metadata for that code, and `os`/`cpu` arrays restrict which machines the package installs on at all.
  - `npm/darwin-arm64/package.json:11` — `"os": [`
  - `npm/darwin-arm64/package.json:14` — `"cpu": [`
  - `npm/darwin-x64/package.json:11` — `"os": [`
  - `npm/darwin-x64/package.json:14` — `"cpu": [`
  - ……另有 8 处 / … and 8 more location(s)
  中 修复：通过仓库配合锁文件发布依赖，并把平台限制写在 README 里，而不是写进 `os`/`cpu` 字段。
  EN Fix: Ship dependencies through the registry with a lockfile, and document platform limits in the README rather than in `os`/`cpu` fields.

_按类别 / By category:_ 网络回调 / network callbacks 3 · 混淆 / obfuscation 2 · 凭据读取 / credential access 2 · 持久化 / persistence 1 · 提权 / privilege 1 · 供应链 / supply chain 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `dsh-openpencil-HEAD/`
- skipped docs/images/dsh-openpencil-logo.png: 807392 bytes exceeds the 524288-byte per-file cap
- skipped docs/images/dsh-openpencil-overview.png: 1163960 bytes exceeds the 524288-byte per-file cap
- outbound fetching was permitted for this audit
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
