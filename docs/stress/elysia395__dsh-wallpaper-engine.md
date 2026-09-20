> 批量压测 / Batch stress test · ★ 307 · `elysia395/dsh-wallpaper-engine`
> https://github.com/elysia395/dsh-wallpaper-engine · audited in 11.0s
# 安装前体检 / Pre-install audit: dsh-plugin-wallpaper-engine@0.7.3

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/elysia395/dsh-wallpaper-engine/tar.gz/HEAD` (URL / url)
- 已分析文件：80 个（1.3 MiB） / Files analysed: 80 (1.3 MiB)
- 内容摘要 / Content digest: `5fa9e5a49680a3fc6dd9fcf3948ee383…`
- 体检时间 / Audited at: 2026-09-20T09:53:31.805Z

## 最严重的风险 / Most severe risk

**执行运行时拼装出来的代码 / Evaluates code built at runtime** `obf.dynamic-code-eval`

中 它把自己的写法藏了起来，所以读源码基本看不出它真正执行的是什么。
EN It hides how it is written, so reading it tells a reviewer little about what it actually executes.

该包会访问的目标：`www.w3.org`、`registry.npmmirror.com`、`github.com`、`x`、`x${base`、`registry.npmjs.org`、`opencollective.com`、`xfps` / Destinations this package reaches: `www.w3.org`, `registry.npmmirror.com`, `github.com`, `x`, `x${base`, `registry.npmjs.org`, `opencollective.com`, `xfps`

- 中 它发生在安装时：`prepare` 脚本会执行它，你不需要自己运行任何东西。
  EN It happens at install time: the `prepare` script runs it, so you do not have to run anything yourself.
- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `lib/scene-scripts.js:245`；完整列表见下方「发现」。 / The rule that decided the grade fired at `lib/scene-scripts.js:245`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

- `prepare` (`package.json`): `node scripts/prepare.mjs`

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `08b5f70da6268b9d8d4f320718fdb21d.svg`, `/mnt`, `.pkg`, `materials/`, `.tex`, `package.json`, `client.js`, `src/client.js`, `build-client.mjs`, `scripts/build-client.mjs`, `../lib/client.js`, `_rope_small.png`
- **写入的文件路径 / File paths written:** `.tmp`, `0/`, `/`, `\n`
- **派生的命令 / Commands spawned:** `node:child_process`, `scripts`, `build-client.mjs`
- **连接的域名 / Domains contacted:** `www.w3.org`, `registry.npmmirror.com`, `github.com`, `x`, `x${base`, `registry.npmjs.org`, `opencollective.com`, `xfps`
- **读取的环境变量 / Environment variables read:** `SystemRoot`, `DSH_WE_STEAM_ROOT`, `DSH_WE_TRANSCODE_TIMEOUT_MS`, `DSH_WE_CACHE_DIR`, `DSH_WE_FFMPEG_URL`, `DSH_WE_FFMPEG`, `DSH_WE_UPLOAD_DIR`, `DSH_WE_FIXTURE_1`, `DSH_WE_FIXTURE_2`

## 发现 / Findings

### 严重 / CRITICAL (1)

- **严重 / CRITICAL** `obf.dynamic-code-eval` — 执行运行时拼装出来的代码 / Evaluates code built at runtime
  中 该行执行的是一个并非源码字面量的表达式，真正运行的代码在插件运行时才被拼装出来，无法在 tarball 中审查。
  EN The line evaluates an expression that is not a source literal, so the executed code is assembled while the plugin runs and cannot be reviewed in the tarball.
  - `lib/scene-scripts.js:245` — `vm.runInContext(code, context, { timeout: 2000 });`
  中 修复：用静态函数或数据表替代动态求值；任何审计都无法为运行时才存在的代码背书。
  EN Fix: Replace the dynamic evaluation with a static function or a data table; there is no audit that can vouch for code that does not exist until runtime.

### 高 / HIGH (2)

- **高 / HIGH** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `scripts/diagnose-scenes.mjs:271` — `const mod = await import(pathToFileURL(resolve(root, 'lib', 'pkg-extract.js')).href);`
  - `scripts/verify-scene.mjs:31` — `const pkgExtract = await import(pathToFileURL(resolve(root, 'lib', 'pkg-extract.js')).href);`
  - `scripts/verify-scene.mjs:352` — `const hostMod = await import(pathToFileURL(resolve(root, 'lib', 'index.js')).href);`
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.
- **高 / HIGH** `prompt.doc-instruction` — 文档中包含针对模型的指令 / Documentation contains instructions aimed at a model
  中 随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。
  EN A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.
  - `README.en.md:365` — `> directly and bypasses WE's configuration).`
  中 修复：把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。
  EN Fix: Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.

### 中 / MEDIUM (3)

- **中 / MEDIUM** `install.hook-runs-shell-code` — 安装期钩子执行的不只是构建 / Lifecycle hook runs more than a build
  中 该钩子命令不属于常见的编译与拷贝步骤，安装这个包时会以用户权限运行任意代码，而这一切发生在任何人来得及检查之前。
  EN This hook command is not one of the usual compile-and-copy steps, so installing the package runs arbitrary code with the user's privileges before anything can be inspected.
  - `package.json:70` — `"prepare": "node scripts/prepare.mjs"`
  中 修复：把钩子收敛为 `tsc` 或 `npm run build` 之类的构建命令，或把这项工作移到一个由用户主动执行的显式脚本里。
  EN Fix: Reduce the hook to a build command such as `tsc` or `npm run build`, or move the work into an explicit script the user chooses to run.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `lib/index.js:2156` — `http://x`
  - `lib/index.js:2182` — `http://x`
  - `lib/index.js:2235` — `http://x`
  - `lib/index.js:2297` — `http://x`
  - ……另有 3 处 / … and 3 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `prompt.concealed-instruction` — 把文本藏在注释或不可见字符中 / Hides text in a comment or invisible characters
  中 该行把内容藏在 HTML 注释里，或藏在零宽字符与双向控制字符之后，这些内容在 diff 或渲染后的文档中什么都看不见，却仍会作为文本被读取。
  EN The line conceals content either in an HTML comment or behind zero-width and bidirectional control characters, which render as nothing in a diff or a rendered document while still being read as text.
  - `docs/dev-notes-bom-and-dsh-boot.md:8` — ``SyntaxError: Unexpected token ' ' ... is not valid JSON`（readProfileManifest 内 JSON.parse）。`
  中 修复：删除被隐藏的文本和不可见字符；审查者看不到的东西就不该出现在发布的包里。
  EN Fix: Delete the concealed text and the invisible characters; anything a reviewer cannot see does not belong in a shipped package.

### 低 / LOW (2)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `lib/index.js:186` — `return [...(reg ? [reg] : []), ...env, ...STEAM_PROBE_DIRS, ...wsl];`
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `supply.build-script-excluded-from-package` — 安装钩子运行的脚本被发布文件集排除在外 / Install hook runs a script the published file set excludes
  中 清单声明的安装钩子所引用的脚本没有被 `files` 白名单包含，或被 `.npmignore` 匹配排除。这样一来，从仓库安装时运行的文件与被审计和测试过的并不是同一个，甚至根本不存在。
  EN The prepare hook runs scripts/prepare.mjs, but the files allowlist (lib/index.js, lib/client.js, lib/pkg-extract.js, lib/scene-renderer.js, lib/scene-render-worker.mjs, lib/we-renderer/, lib/apng-encode.js, lib/font-render.js, lib/scene-scripts.js, lib/scene-manifest.js, lib/scene-player.js, lib/types/index.d.ts, lib/types/client.d.ts, cordis.patch.yml, README.md, README.en.md) does not cover scripts/prepare.mjs. The published tarball therefore behaves differently from this source tree.
  - `package.json:70` — `"prepare": "node scripts/prepare.mjs"`
  中 修复：把被引用的脚本加入 `files`，或把钩子移到会被发布的文件里。
  EN Fix: Add the referenced script to `files`, or move the hook into a file that is published.

_按类别 / By category:_ 混淆 / obfuscation 2 · 提示注入 / prompt injection 2 · 安装脚本 / install scripts 1 · 网络回调 / network callbacks 1 · 凭据读取 / credential access 1 · 供应链 / supply chain 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `dsh-wallpaper-engine-HEAD/`
- skipped ChatGPT Image 2026年8月24日 02_27_18.png: 1510916 bytes exceeds the 524288-byte per-file cap
- skipped ChatGPT Image 2026年8月25日 13_02_32.png: 1678607 bytes exceeds the 524288-byte per-file cap
- skipped ChatGPT Image 2026年8月25日 13_48_54.png: 2080041 bytes exceeds the 524288-byte per-file cap
- skipped docs/images/better-sidebar-font.png: 2667945 bytes exceeds the 524288-byte per-file cap
- skipped docs/images/main-interface.gif: 3464250 bytes exceeds the 524288-byte per-file cap
- skipped docs/images/mascot-drawer.png: 2927326 bytes exceeds the 524288-byte per-file cap
- skipped docs/images/settings-ui.gif: 10664427 bytes exceeds the 524288-byte per-file cap
- skipped docs/images/wallpaper-library.gif: 3423267 bytes exceeds the 524288-byte per-file cap
- skipped lib/client.js: 892425 bytes exceeds the 524288-byte per-file cap
- skipped src/client.js: 883020 bytes exceeds the 524288-byte per-file cap
- outbound fetching was permitted for this audit
- ……另有 2 项 / … and 2 more

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
