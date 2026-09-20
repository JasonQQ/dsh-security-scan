> 批量压测 / Batch stress test · ★ 210 · `e2mcc/dsh-popout-sidebar`
> https://github.com/e2mcc/dsh-popout-sidebar · audited in 0.7s
# 安装前体检 / Pre-install audit: dsh-popout-sidebar@1.0.1

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/e2mcc/dsh-popout-sidebar/tar.gz/HEAD` (URL / url)
- 已分析文件：25 个（579.3 KiB） / Files analysed: 25 (579.3 KiB)
- 内容摘要 / Content digest: `ec7e654a323aff8c39402ff7d6146720…`
- 体检时间 / Audited at: 2026-09-20T09:53:32.476Z

## 最严重的风险 / Most severe risk

**执行运行时拼装出来的代码 / Evaluates code built at runtime** `obf.dynamic-code-eval`

中 它把自己的写法藏了起来，所以读源码基本看不出它真正执行的是什么。
EN It hides how it is written, so reading it tells a reviewer little about what it actually executes.

该包会访问的目标：`github.com`、`www.w3.org`、`www.apache.org`、`${t` / Destinations this package reaches: `github.com`, `www.w3.org`, `www.apache.org`, `${t`

- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `src/index.js:15`；完整列表见下方「发现」。 / The rule that decided the grade fired at `src/index.js:15`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `artifacts.read`, `./host.js`, `pdfjs-dist/build/pdf`
- **写入的文件路径 / File paths written:** （无） / (none)
- **派生的命令 / Commands spawned:** （无） / (none)
- **连接的域名 / Domains contacted:** `github.com`, `www.w3.org`, `www.apache.org`, `${t`
- **读取的环境变量 / Environment variables read:** （无） / (none)

## 发现 / Findings

### 严重 / CRITICAL (1)

- **严重 / CRITICAL** `obf.dynamic-code-eval` — 执行运行时拼装出来的代码 / Evaluates code built at runtime
  中 该行执行的是一个并非源码字面量的表达式，真正运行的代码在插件运行时才被拼装出来，无法在 tarball 中审查。
  EN The line evaluates an expression that is not a source literal, so the executed code is assembled while the plugin runs and cannot be reviewed in the tarball.
  - `src/index.js:15` — `const makePlugin = new Function(readFileSync(new URL('./host.js', import.meta.url), 'utf8'))`
  中 修复：用静态函数或数据表替代动态求值；任何审计都无法为运行时才存在的代码背书。
  EN Fix: Replace the dynamic evaluation with a static function or a data table; there is no audit that can vouch for code that does not exist until runtime.

### 高 / HIGH (1)

- **高 / HIGH** `obf.decoded-payload-literal` — 携带解码、转义或高熵字面量 / Carries a decoded, escaped or high-entropy literal
  中 一个很长的字面量会在运行时被解码（base64、`atob`、`unescape`、`decodeURIComponent`），或者写满了密集的十六进制、Unicode 转义，或者呈现出编码数据块那种近乎均匀的字符分布。
  EN A long literal is decoded at runtime (base64, `atob`, `unescape`, `decodeURIComponent`), written with dense hex or unicode escapes, or has the near-uniform character distribution of an encoded blob.
  - `src/client.js:182` — `'\\b(?:console|Math|JSON|Promise|Array|Object|String|Number|Boolean|RegExp|Date|Map|Set|WeakMap|WeakSet|Symbol|BigInt|Infinity|NaN|window|document|process|requi…`
  - `src/shared/highlight.js:85` — `'\\b(?:console|Math|JSON|Promise|Array|Object|String|Number|Boolean|RegExp|Date|Map|Set|WeakMap|WeakSet|Symbol|BigInt|Infinity|NaN|window|document|process|requi…`
  中 修复：把该值保存为可读源码，或保存为格式有文档说明的数据，让审查者能看清实际运行的到底是什么。
  EN Fix: Store the value as readable source or as data with a documented format, so a reviewer can see what is actually being run.

### 中 / MEDIUM (1)

- **中 / MEDIUM** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `src/client.js:1652` — `{ name: 'shell.overlay', id: 'artifacts-sidebar-trigger', order: 40, label: 'Artifacts' },`
  - `src/client.js:1657` — `{ name: 'shell.overlay', id: 'artifacts-sidebar-panel', order: 50, label: 'Artifacts Panel' },`
  - `src/client/body.js:92` — `{ name: 'shell.overlay', id: 'artifacts-sidebar-trigger', order: 40, label: 'Artifacts' },`
  - `src/client/body.js:97` — `{ name: 'shell.overlay', id: 'artifacts-sidebar-panel', order: 50, label: 'Artifacts Panel' },`
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.

_按类别 / By category:_ 混淆 / obfuscation 2 · 滥用宿主环境 / harness abuse 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `dsh-popout-sidebar-HEAD/`
- skipped src/host.js: 1505033 bytes exceeds the 524288-byte per-file cap
- skipped src/vendor/pdfjs/pdf.worker.min.js: 1087212 bytes exceeds the 524288-byte per-file cap
- outbound fetching was permitted for this audit
- grade forced to D by a critical finding: obf.dynamic-code-eval — Evaluates code built at runtime
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
