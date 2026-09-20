> 批量压测 / Batch stress test · ★ 685 · `PC2005-cloud/dsh-pet#dsh-pet`
> https://github.com/PC2005-cloud/dsh-pet/tree/main/dsh-pet · audited in 24.7s
# 安装前体检 / Pre-install audit: dsh-pet@0.2.11

**信任评级 / Trust grade: D** (评分 / score 46/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/PC2005-cloud/dsh-pet/tar.gz/HEAD` (URL / url)
- 已分析文件：189 个（35.4 MiB） / Files analysed: 189 (35.4 MiB)
- 内容摘要 / Content digest: `303401c9364ab552d599e685ba1102ef…`
- 体检时间 / Audited at: 2026-09-20T09:52:59.169Z

## 最严重的风险 / Most severe risk

**向裸 IP 地址发送请求 / Sends a request to a bare IP address** `net.raw-ip-destination`

中 它会建立出站连接，因此可以在你无法选择的时机接收指令或送出数据。
EN It opens an outbound connection, so it can receive instructions or send data at a moment you do not choose.

该包会访问的目标：`registry.npmmirror.com`、`opencollective.com`、`eslint.org`、`github.com`、`tidelift.com`、`paulmillr.com`、`127.0.0.1`、`dsh-pet` / Destinations this package reaches: `registry.npmmirror.com`, `opencollective.com`, `eslint.org`, `github.com`, `tidelift.com`, `paulmillr.com`, `127.0.0.1`, `dsh-pet`

- 中 它发生在安装时：`prepare` 脚本会执行它，你不需要自己运行任何东西。
  EN It happens at install time: the `prepare` script runs it, so you do not have to run anything yourself.
- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `runtime/electron-helper/constants.js:13`；完整列表见下方「发现」。 / The rule that decided the grade fired at `runtime/electron-helper/constants.js:13`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

- `prepare` (`package.json`): `node scripts/prepare.js`

发布期钩子（维护者打包或发布时运行，安装时不会执行）： / Publish-time hooks (run when the maintainer packs or publishes, not on install):

- `prepack`: `npm run types && npm run typecheck && npm run lint && npm run format:check && node scripts/prepack-check.js`

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `node_modules/readdirp`, `client.js`, `lib/client.js`, `package.json`, `.png`, `config.jsonc`, `assets/config.jsonc`, `.tgz`, `node:fs/promises`, `../../runtime/electron-helper/main.js`
- **写入的文件路径 / File paths written:** `\n`, `dshhome/electron`, `node:fs/promises`, `.png`, `pet/${CN_PET}-animation`, `test.webm`, `pet/${CN_PET}-animation/test.webm`, `main-animation/webm`, `mainidle.webm`, `main-animation/webm/mainidle.webm`, `leak.webm`, `outside-animation/leak.webm`
- **派生的命令 / Commands spawned:** `node_modules/cross-spawn`, `resolved`, `https://registry.npmmirror.com/cross-spawn/-/cross-spawn-7.0.6.tgz`, `cross-spawn`, `^7.0.6`, `node:child_process`, `--dsh-pet-dpi-probe`, `inherit`
- **连接的域名 / Domains contacted:** `registry.npmmirror.com`, `opencollective.com`, `eslint.org`, `github.com`, `tidelift.com`, `paulmillr.com`, `127.0.0.1`, `dsh-pet`, `127.0.0.1:object`, `localhost`, `127.0.0.1:${port`, `npmmirror.com` （另有 2 项） / (+2 more)
- **读取的环境变量 / Environment variables read:** `DSH_PET_DPI_PROBE`, `DSH_PET_HOST_PID`, `DSH_PET_FORCE_DSF`, `DSH_PET_SCALE`, `DSH_PET_BRIDGE`, `DSH_PET_PETS`, `DSH_PET_CONFIG_URL`, `DSH_PET_SMOKE`, `DSH_PET_SMOKE_OUT`, `DSH_PET_SMOKE_AFTER_MS`, `DSH_HOME`, `USERPROFILE` （另有 11 项） / (+11 more)

## 发现 / Findings

### 高 / HIGH (1)

- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `runtime/electron-helper/constants.js:13` — `configUrl: params.get('configUrl') || 'http://127.0.0.1:3080/dsh-pet-7340/config',`
  - `runtime/electron-helper/main.js:383` — `const configUrl = process.env.DSH_PET_CONFIG_URL || 'http://127.0.0.1:3080/dsh-pet-7340/config';`
  - `runtime/electron-helper/main.js:559` — `bridgeCallbackUrl = 'http://127.0.0.1:' + (addr && typeof addr === 'object' ? addr.port : 0) + '/respond';`
  - `runtime/electron-helper/main.js:559` — `http://127.0.0.1:object/respond`
  - ……另有 13 处 / … and 13 more location(s)
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.

### 中 / MEDIUM (4)

- **中 / MEDIUM** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `src/client/app.ts:77` — `yield ctx.slots.register({ name: 'shell.overlay', id: 'pet', order: 1000 }, () => h(PetMulti, {}));`
  - `src/host/work-status.test.ts:75` — `assert.equal(reduceWorkStatus({ type: 'tool/call', data: { name: 'read' } }, { goalRound: true }), 'working');`
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.
- **中 / MEDIUM** `install.hook-runs-shell-code` — 安装期钩子执行的不只是构建 / Lifecycle hook runs more than a build
  中 该钩子命令不属于常见的编译与拷贝步骤，安装这个包时会以用户权限运行任意代码，而这一切发生在任何人来得及检查之前。
  EN This hook command is not one of the usual compile-and-copy steps, so installing the package runs arbitrary code with the user's privileges before anything can be inspected.
  - `package.json:73` — `"prepare": "node scripts/prepare.js",`
  中 修复：把钩子收敛为 `tsc` 或 `npm run build` 之类的构建命令，或把这项工作移到一个由用户主动执行的显式脚本里。
  EN Fix: Reduce the hook to a build command such as `tsc` or `npm run build`, or move the work into an explicit script the user chooses to run.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `runtime/electron-helper/constants.js:13` — `http://127.0.0.1:3080/dsh-pet-7340/config`
  - `runtime/electron-helper/main.js:383` — `http://127.0.0.1:3080/dsh-pet-7340/config`
  - `runtime/electron-helper/main.js:559` — `http://127.0.0.1:`
  - `runtime/electron-helper/main.js:559` — `http://127.0.0.1:object/respond`
  - ……另有 11 处 / … and 11 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 98 shipped file(s) are 64 KiB or larger and were not read as text, the largest being assets/webm/玩水枪.webm at 511 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `assets/webm/玩水枪.webm` — `523346 bytes not decoded as text`
  - `package-lock.json:1278` — `"undici": "^7.24.4"`
  - `package-lock.json:2403` — `"undici-types": "~8.3.0"`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (4)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `src/client/settings.ts:1059` — `children: t('uninstallCmd').replace('{profile}', paths.profile || '<profile>'),`
  - `src/host/host-liveness.test.ts:149` — `/const HOST_PID = parseHostPid\(process\.env\.DSH_PET_HOST_PID\)/.test(main),`
  - `src/host/host-liveness.test.ts:177` — `/env: \{ \.\.\.process\.env, DSH_PET_HOST_PID: String\(process\.pid\), \.\.\.this\.options\.env \}/.test(src),`
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `cred.env-harvest` — 读取或整体导出进程环境变量 / Reads or dumps the process environment
  中 该行把整个环境当成一个值取走——序列化、遍历或打印它，而不是只取自己需要的那一个变量。CI 运行器和宿主都会把 API Key 导出到环境变量里，因此整体导出就是一次凭据收集。
  EN The line takes the whole environment as a value — serializing it, iterating it, or printing it — rather than the one variable it needs. CI runners and the harness export API keys into the environment, so a dump is a credential harvest.
  - `src/host/helper-process.test.ts:151` — `Object.assign(process.env`
  中 修复：只逐个读取插件文档中声明过的变量，绝不序列化整个环境对象，也不要把它写进日志或请求。
  EN Fix: Read only the variables the plugin documents, one at a time, and never serialize the environment object or forward it into a log or request.
- **低 / LOW** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `src/host/host-liveness.test.ts:32` — `const { HOST_POLL_MS, parseHostPid, hostIsGone, isBrokenPipeError } = require(helper + 'host-liveness.js');`
  - `src/host/pointer-target.test.ts:24` — `const { HIT_BOX, CANVAS_H, STAGE_W, POINTER_POLL_MS, spriteHitRect, decideWindowIgnore } = require(`
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.
- **低 / LOW** `supply.build-script-excluded-from-package` — 安装钩子运行的脚本被发布文件集排除在外 / Install hook runs a script the published file set excludes
  中 清单声明的安装钩子所引用的脚本没有被 `files` 白名单包含，或被 `.npmignore` 匹配排除。这样一来，从仓库安装时运行的文件与被审计和测试过的并不是同一个，甚至根本不存在。
  EN The prepare hook runs scripts/prepare.js, but the files allowlist (lib, src, assets/webm, runtime/electron-helper, assets/fonts, assets/pic, assets/memes, assets/config.jsonc, scripts/ensure-electron.mjs, cordis.patch.yml) does not cover scripts/prepare.js. The published tarball therefore behaves differently from this source tree.
  - `package.json:73` — `"prepare": "node scripts/prepare.js",`
  中 修复：把被引用的脚本加入 `files`，或把钩子移到会被发布的文件里。
  EN Fix: Add the referenced script to `files`, or move the hook into a file that is published.

_按类别 / By category:_ 网络回调 / network callbacks 2 · 供应链 / supply chain 2 · 凭据读取 / credential access 2 · 滥用宿主环境 / harness abuse 1 · 安装脚本 / install scripts 1 · 混淆 / obfuscation 1

## 扫描说明 / Scan notes

- scoped to the subdirectory `dsh-pet/`
- stripped the archive's single top-level directory `dsh-pet-HEAD/`
- skipped assets/fonts/上首软糖体.ttf: 4083908 bytes exceeds the 524288-byte per-file cap
- skipped assets/preview/beiluoye-yanmo.gif: 629167 bytes exceeds the 524288-byte per-file cap
- skipped assets/preview/beishubiao-tuozhuai-xuankong-fankui.gif: 654762 bytes exceeds the 524288-byte per-file cap
- skipped assets/preview/beixiayitiao-zhamao.gif: 623877 bytes exceeds the 524288-byte per-file cap
- skipped assets/preview/bian-gezi.gif: 651972 bytes exceeds the 524288-byte per-file cap
- skipped assets/preview/cha-zhuyu-shangju.gif: 615404 bytes exceeds the 524288-byte per-file cap
- skipped assets/preview/chai-liwu.gif: 622000 bytes exceeds the 524288-byte per-file cap
- skipped assets/preview/chaoda-shenlanyao.gif: 617589 bytes exceeds the 524288-byte per-file cap
- skipped assets/preview/chenjian-shuaya.gif: 644856 bytes exceeds the 524288-byte per-file cap
- skipped assets/preview/chi-baifan.gif: 622739 bytes exceeds the 524288-byte per-file cap
- ……另有 135 项 / … and 135 more

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
