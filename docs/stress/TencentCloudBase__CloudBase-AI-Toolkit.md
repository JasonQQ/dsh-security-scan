> 批量压测 / Batch stress test · ★ 1115 · `TencentCloudBase/CloudBase-AI-Toolkit#dsh-plugin`
> https://github.com/TencentCloudBase/CloudBase-AI-Toolkit/tree/main/dsh-plugin · audited in 19.4s
# 安装前体检 / Pre-install audit: @cloudbase/dsh-plugin@0.1.2

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

- 来源 / Source: `https://codeload.github.com/TencentCloudBase/CloudBase-AI-Toolkit/tar.gz/HEAD` (URL / url)
- 已分析文件：134 个（3.6 MiB） / Files analysed: 134 (3.6 MiB)
- 内容摘要 / Content digest: `95149da2dc0c33112ed465d9a23939e3…`
- 体检时间 / Audited at: 2026-09-20T09:52:34.224Z

## 最严重的风险 / Most severe risk

**凭据读取、解码步骤与对外请求同时出现 / Credential read, decoding step and outbound request together** `exfil.credential-read-decode-callback`

中 数据会离开这台机器。该包中有代码把本机上的内容发往外部地址。
EN Data leaves this machine. Something in this package takes content that lives here and sends it to a destination outside it.

该包会访问的目标：`registry.npmjs.org`、`registry.npmmirror.com`、`opencollective.com`、`github.com`、`tidelift.com`、`127.0.0.1`、`${trimmed`、`your-app.example.com` / Destinations this package reaches: `registry.npmjs.org`, `registry.npmmirror.com`, `opencollective.com`, `github.com`, `tidelift.com`, `127.0.0.1`, `${trimmed`, `your-app.example.com`

- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.

决定该评级的规则命中于 `scripts/install.sh:21`；完整列表见下方「发现」。 / The rule that decided the grade fired at `scripts/install.sh:21`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

发布期钩子（维护者打包或发布时运行，安装时不会执行）： / Publish-time hooks (run when the maintainer packs or publishes, not on install):

- `prepublishOnly`: `npm run typecheck && npm run build && npm test`

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `package.json`, `dist/index.js`, `cordis.patch.yml`, `skills/cloudbase`, `src/client/lib/typert.ts`, `src/shared/types.ts`
- **写入的文件路径 / File paths written:** `dist/skill-cli.js`
- **派生的命令 / Commands spawned:** `node:child_process`, `dsh`, `--version`, `utf8`, `--profile`, `--dump-config`, `npx`, `-y`, `@cloudbase/cloudbase-mcp@latest`
- **连接的域名 / Domains contacted:** `registry.npmjs.org`, `registry.npmmirror.com`, `opencollective.com`, `github.com`, `tidelift.com`, `127.0.0.1`, `${trimmed`, `your-app.example.com`, `mock.example.com`, `demo.mock.example.com`, `www.w3.org`, `${url` （另有 9 项） / (+9 more)
- **读取的环境变量 / Environment variables read:** `CLOUDBASE_ENV_ID`, `CLOUDBASE_DSH_PROFILE`, `CLOUDBASE_DSH_REQUIRE_DUMP`, `CLOUDBASE_DSH_HEADLESS`, `CLOUDBASE_MCP_COMMAND`, `CLOUDBASE_MCP_ARGS`, `CLOUDBASE_DSH_ENV_HINT_FILE`, `CLOUDBASE_MCP_DEBUG`, `process.env (every variable)`

## 发现 / Findings

### 严重 / CRITICAL (2)

- **严重 / CRITICAL** `exfil.credential-read-decode-callback` — 凭据读取、解码步骤与对外请求同时出现 / Credential read, decoding step and outbound request together
  中 编码外传的三个要素全部齐备：读取了凭据，有解码或编码动作，并且有请求离开本机。编码这一步的作用，正是让随便看一眼流量的人看不出其中的密钥。
  EN All three ingredients of an encoded exfiltration are present: a credential is read, something is decoded or encoded, and a request leaves the machine. The encoding step is what hides the secret from a casual look at the traffic.
  - `scripts/install.sh:21` — `if [ ! -f "$PROFILE_DIR/.npmrc" ] || ! grep -q "enable-scripts=true" "$PROFILE_DIR/.npmrc" 2>/dev/null; then`
  - `src/server/data-service.ts:668` — `const body = Buffer.from(opts.fileBase64, "base64");`
  - `package-lock.json:1082` — `"undici-types": "~7.10.0"`
  - `package-lock.json:1689` — `"node_modules/undici-types": {`
  中 修复：删除凭据读取或对外调用。绝不要发布既接触密钥、又在向外发送途中编码载荷的包。
  EN Fix: Remove the credential read or the outbound call. Never ship a package that both touches secrets and encodes a payload on its way out.
- **严重 / CRITICAL** `exfil.credential-read-then-callback` — 同一个包内既有凭据文件读取又有对外请求 / Credential file read and an outbound request in the same package
  中 既读取凭据文件又发起对外请求的包，已经凑齐了窃取凭据的两半。单独看每一半都能找到理由，合在一起就只能解释为数据被送出本机。
  EN A package that reads a credential file and also makes outbound requests has the two halves of credential theft. Individually each half can be justified; together they only make sense as data leaving the machine.
  - `scripts/install.sh:21` — `if [ ! -f "$PROFILE_DIR/.npmrc" ] || ! grep -q "enable-scripts=true" "$PROFILE_DIR/.npmrc" 2>/dev/null; then`
  - `package-lock.json:1082` — `"undici-types": "~7.10.0"`
  - `package-lock.json:1689` — `"node_modules/undici-types": {`
  - `package-lock.json:1691` — `"resolved": "https://registry.npmjs.org/undici-types/-/undici-types-7.10.0.tgz",`
  中 修复：删除凭据读取。如果对外调用才是真正的功能，那么包内任何地方都不应在它之前读取密钥文件。
  EN Fix: Remove the credential read. If the outbound call is the real feature, it must not be preceded by a read of a secret file anywhere in the package.

### 高 / HIGH (3)

- **高 / HIGH** `cred.credential-read-with-command-execution` — 同一个包内既有凭据文件读取又有 shell 执行 / Credential file read and shell execution in the same package
  中 这个包里某处读取了凭据文件，另一处又启动了进程。仅这一组合就足以把密钥管道给命令、通过 CLI 把它外传，或用窃取到的材料改写本机配置。
  EN A credential file is read somewhere in this package and a process is spawned somewhere else. That pairing is enough to pipe a secret into a command, exfiltrate it through a CLI, or rewrite the machine's configuration from stolen material.
  - `scripts/install.sh:21` — `if [ ! -f "$PROFILE_DIR/.npmrc" ] || ! grep -q "enable-scripts=true" "$PROFILE_DIR/.npmrc" 2>/dev/null; then`
  - `scripts/e2e-live.mjs:12` — `import { execFileSync, spawnSync } from "node:child_process";`
  - `scripts/e2e-live.mjs:176` — `const dsh = spawnSync("dsh", ["--version"], { encoding: "utf8" });`
  - `scripts/e2e-live.mjs:180` — `const dump = spawnSync("dsh", ["--profile", profile, "--dump-config"], {`
  中 修复：删除凭据读取，并把进程启动限制在完全不会接触到密钥值的命令上。
  EN Fix: Remove the credential access, and keep process spawning limited to commands that never see secret values.
- **高 / HIGH** `cred.read-registry-token` — 读取包仓库令牌文件 / Reads a package registry token file
  中 该行读取了 `.npmrc`、`.yarnrc`、`.pypirc` 或同类凭据文件。这些文件里保存的发布令牌可以让攻击者以用户的名义发布新版本。
  EN The line reads `.npmrc`, `.yarnrc`, `.pypirc` or an equivalent credential file. Those files carry publish tokens that let an attacker push new versions under the user's name.
  - `scripts/install.sh:21` — `if [ ! -f "$PROFILE_DIR/.npmrc" ] || ! grep -q "enable-scripts=true" "$PROFILE_DIR/.npmrc" 2>/dev/null; then`
  中 修复：在真正需要的时刻从环境变量读取令牌，并删除所有打开仓库配置文件的代码。
  EN Fix: Read the token from the environment at the moment it is needed, and delete any code that opens the registry config file.
- **高 / HIGH** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `scripts/e2e-live.mjs:51` — `const { CloudBaseMcpBridge, createCloudBaseDataService } = await import(`
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.

### 中 / MEDIUM (2)

- **中 / MEDIUM** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 20 distinct remote hosts (${trimmed, github.com, mock.example.com, opencollective.com, registry.npmjs.org, registry.npmmirror.com, tidelift.com, your-app.example.com, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `package-lock.json:47` — `https://registry.npmjs.org/@codemirror/autocomplete/-/autocomplete-6.20.3.tgz`
  - `package-lock.json:126` — `https://registry.npmmirror.com/@deepseek-ai/cordis/-/cordis-4.0.1.tgz`
  - `package-lock.json:1109` — `https://opencollective.com/vitest`
  - `package-lock.json:1440` — `https://github.com/sponsors/ai`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 22 shipped file(s) are 64 KiB or larger and were not read as text, the largest being docs/screenshots/env-sync-from-session-history.png at 190 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `docs/screenshots/env-sync-from-session-history.png` — `194253 bytes not decoded as text`
  - `package-lock.json:1082` — `"undici-types": "~7.10.0"`
  - `package-lock.json:1689` — `"node_modules/undici-types": {`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (2)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `scripts/e2e-live.mjs:98` — `pass(`authStatus signedIn=${auth.signedIn} envId=${auth.envId ?? "—"} mode=${auth.authMode ?? "—"}`);`
  - `scripts/e2e-live.mjs:112` — `if (auth.signedIn && !auth.envId) {`
  - `scripts/e2e-live.mjs:120` — `if (auth.envId) {`
  - `scripts/e2e-live.mjs:121` — `pass(`setEnvironment bound ${auth.envId}`);`
  - ……另有 72 处 / … and 72 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `obf.dynamic-code-eval` — 执行运行时拼装出来的代码 / Evaluates code built at runtime
  中 该行执行的是一个并非源码字面量的表达式，真正运行的代码在插件运行时才被拼装出来，无法在 tarball 中审查。
  EN The line evaluates an expression that is not a source literal, so the executed code is assembled while the plugin runs and cannot be reviewed in the tarball.
  - `tests/patch-js-path.test.ts:13` — `ctxexprwith (ctx) { return eval(expr) }`
  中 修复：用静态函数或数据表替代动态求值；任何审计都无法为运行时才存在的代码背书。
  EN Fix: Replace the dynamic evaluation with a static function or a data table; there is no audit that can vouch for code that does not exist until runtime.

_按类别 / By category:_ 凭据读取 / credential access 3 · 数据外传 / exfiltration 2 · 混淆 / obfuscation 2 · 网络回调 / network callbacks 1 · 供应链 / supply chain 1

## 扫描说明 / Scan notes

- scoped to the subdirectory `dsh-plugin/`
- stripped the archive's single top-level directory `CloudBase-AI-Toolkit-HEAD/`
- not scanned (binary): docs/screenshots/ato-secrets.png, docs/screenshots/ato-suggestions.png, docs/screenshots/ato-users-growth.png, docs/screenshots/auto-preview-activated.png, docs/screenshots/btn-primary-style.png and 17 more
- outbound fetching was permitted for this audit
- grade forced to D by a critical finding: exfil.credential-read-decode-callback — Credential read, decoding step and outbound request together
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
