> 批量压测 / Batch stress test · ★ 1020 · `tong-io/tongflow#packages/dsh-tongflow`
> https://github.com/tong-io/tongflow/tree/main/packages/dsh-tongflow · audited in 8.0s
# 安装前体检 / Pre-install audit: dsh-tongflow@0.8.2

**信任评级 / Trust grade: D** (评分 / score 36/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

- 来源 / Source: `https://codeload.github.com/tong-io/tongflow/tar.gz/HEAD` (URL / url)
- 已分析文件：67 个（483.8 KiB） / Files analysed: 67 (483.8 KiB)
- 内容摘要 / Content digest: `35a90cb467d674ba3e1e91afa9bc23a2…`
- 体检时间 / Audited at: 2026-09-20T09:52:28.301Z

## 最严重的风险 / Most severe risk

**源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model** `prompt.embedded-instruction-string`

中 它夹带了写给 agent 而不是写给人看的文字——试图在你不察觉的情况下改变 agent 行为的指令。
EN It carries text aimed at the agent rather than at a person — instructions that try to change what the agent does without telling you.

该包会访问的目标：`github.com`、`raw.githubusercontent.com`、`localhost`、`$1`、`example.invalid`、`gitlab.com`、`x`、`chr_mei` / Destinations this package reaches: `github.com`, `raw.githubusercontent.com`, `localhost`, `$1`, `example.invalid`, `gitlab.com`, `x`, `chr_mei`

- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.

决定该评级的规则命中于 `src/activation.ts:81`；完整列表见下方「发现」。 / The rule that decided the grade fired at `src/activation.ts:81`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `node:fs/promises`, `shot/i2v.tongflow.json`
- **写入的文件路径 / File paths written:** `./util/fsx.ts`, `../util/fsx.ts`, `node:fs/promises`, `\n\n`, `characters/mei`, `README.md`, `odd/README.md`
- **派生的命令 / Commands spawned:** `node:child_process`, `uv`, `git`, `-C`, `rev-parse`, `HEAD`, `-m`, `tongflow`, `engine`, `ffprobe`, `ffmpeg`
- **连接的域名 / Domains contacted:** `github.com`, `raw.githubusercontent.com`, `localhost`, `$1`, `example.invalid`, `gitlab.com`, `x`, `chr_mei`
- **读取的环境变量 / Environment variables read:** `DSH_HOME`, `KEEP_E2E`, `NODE_ENV`

## 发现 / Findings

### 高 / HIGH (3)

- **高 / HIGH** `net.token-or-blob-in-url` — 把凭据或编码数据块放进 URL / Puts a credential or encoded blob in a URL
  中 令牌形状的查询参数、内嵌的 `user:password` 授权部分，或超长高熵的查询值，都意味着密钥或载荷数据在 URL 中传输，最终会留在访问日志、代理和浏览器历史里。
  EN A token-shaped query parameter, an embedded `user:password` authority, or a long high-entropy query value means secret material or payload data travels in a URL, where it lands in access logs, proxies and browser history.
  - `src/client/api.ts:84` — ``/p/${pid}/workflow?key=${encodeURIComponent(key)}``
  - `src/client/api.ts:89` — ``/p/${pid}/workflow?key=${encodeURIComponent(key)}``
  - `src/client/api.ts:99` — ``/p/${pid}/workflow/summary?key=${encodeURIComponent(key)}``
  - `src/client/api.ts:104` — ``/p/${pid}/workflow/confirmations?key=${encodeURIComponent(key)}``
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：凭据放在 Authorization 头里发送，载荷用 POST 放在请求体中，不要编码进查询字符串。
  EN Fix: Send credentials in an Authorization header, and POST payloads in the body rather than encoding them into the query string.
- **高 / HIGH** `prompt.embedded-instruction-string` — 源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model
  中 源码中的字符串字面量——通常是工具描述或系统提示词片段——要求模型绕过确认或对用户隐瞒某些事，于是它作为一条指令进入上下文窗口。
  EN A string literal in the source — typically a tool description or system prompt fragment — tells the model to bypass confirmation or to hide something from the user, so it lands in the context window as a directive.
  - `src/activation.ts:81` — `"dsh-tongflow: system prompt section (agent scope)"`
  中 修复：如实描述工具的行为，删除那些会改变 agent 对待用户方式的指令。
  EN Fix: Describe the tool's behavior factually and remove directives that change how the agent treats the user.
- **高 / HIGH** `supply.url-dependency` — 依赖解析到 URL、git 引用或文件路径 / Dependency resolves to a URL, git ref or file path
  中 依赖不是从仓库解析，而是来自 URL、git 引用、本地路径或 patch，因此其内容不受仓库锁文件和任何完整性元数据约束，可以在版本号不变的情况下被替换。
  EN A dependency is resolved from a URL, a git reference, a local path or a patch instead of the registry, so its contents are not covered by the registry lockfile or by any integrity metadata and can change without a version bump.
  - `package.json:63` — `"tongflow": "workspace:^"`
  中 修复：改为依赖仓库中已发布的版本，并用锁文件固定；如果确实必须用 fork，就把它发布到自己名下的 scope。
  EN Fix: Depend on a published version from the registry, pinned by a lockfile; if a fork is unavoidable, publish it under your own scope.

### 低 / LOW (2)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `src/activation.ts:72` — `registerTools(actx, { ...options.env, ctx: actx });`
  - `src/api.ts:396` — `const env = meta[pluginId]?.env ?? [];`
  - `src/api.ts:494` — `env: (meta[pluginId]?.env ?? []).map((v) => ({`
  - `src/client/studio/InspectorPane.tsx:172` — `const missing = p.env.filter((e) => e.required && !e.set);`
  - ……另有 13 处 / … and 13 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `test/node-categories.test.ts:25` — `/import (?:\{ )?(\w+)(?: \})? from "\.\/nodes\/(add|batch|compose|decompose|modality|transfer)\/[^"]+";/g,`
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.

_按类别 / By category:_ 网络回调 / network callbacks 1 · 提示注入 / prompt injection 1 · 供应链 / supply chain 1 · 凭据读取 / credential access 1 · 混淆 / obfuscation 1

## 扫描说明 / Scan notes

- scoped to the subdirectory `packages/dsh-tongflow/`
- stripped the archive's single top-level directory `tongflow-HEAD/`
- outbound fetching was permitted for this audit
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
