> 批量压测 / Batch stress test · ★ 1770 · `Minglink/dsh-infinite-gen-3`
> https://github.com/Minglink/dsh-infinite-gen-3 · audited in 0.5s
# 安装前体检 / Pre-install audit: dsh-infinite-gen-4@0.4.0

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/Minglink/dsh-infinite-gen-3/tar.gz/HEAD` (URL / url)
- 已分析文件：28 个（344.1 KiB） / Files analysed: 28 (344.1 KiB)
- 内容摘要 / Content digest: `196288d883b0d4f0b55dd44d8fc531b0…`
- 体检时间 / Audited at: 2026-09-20T09:51:58.493Z

## 最严重的风险 / Most severe risk

**用 curl 上传本地文件 / Uploads a local file with curl** `exfil.curl-post-body`

中 数据会离开这台机器。该包中有代码把本机上的内容发往外部地址。
EN Data leaves this machine. Something in this package takes content that lives here and sends it to a destination outside it.

该包会访问的目标：`github.com`、`api.deepseek.com`、`target` / Destinations this package reaches: `github.com`, `api.deepseek.com`, `target`

- 中 它还安排了之后继续运行，所以仅仅卸载这个包并不够。
  EN It also arranges to run again later, so removing the package is not enough on its own.
- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `scripts/scorer_semantics_test.mjs:9`；完整列表见下方「发现」。 / The rule that decided the grade fired at `scripts/scorer_semantics_test.mjs:9`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `client.js`, `\n`, `README.md`
- **写入的文件路径 / File paths written:** `\n`
- **派生的命令 / Commands spawned:** （无） / (none)
- **连接的域名 / Domains contacted:** `github.com`, `api.deepseek.com`, `target`
- **读取的环境变量 / Environment variables read:** `DEEPSEEK_MODEL`, `DEEPSEEK_API_BASE`, `DEEPSEEK_API_KEY`

## 发现 / Findings

### 高 / HIGH (4)

- **高 / HIGH** `exfil.curl-post-body` — 用 curl 上传本地文件 / Uploads a local file with curl
  中 该命令把磁盘上的文件 POST 到远程端点（`-d @`、`--data-binary @`、`-F …=@`、`-T`），本质上是伪装成表单提交的文件上传。
  EN The command posts a file from disk to a remote endpoint (`-d @`, `--data-binary @`, `-F …=@`, `-T`), which is a file upload disguised as a form post.
  - `scripts/scorer_semantics_test.mjs:9` — `curl -X POST`
  - `scripts/verify_prompt_gen4.mjs:60` — `curl -X POST`
  - `scripts/verify_prompt.mjs:77` — `curl -X POST`
  中 修复：删除这次上传，或让目标地址显式且可配置，使用户能看清自己的数据去了哪里。
  EN Fix: Remove the upload, or make the destination explicit and configurable so a user can see where their data goes.
- **高 / HIGH** `persist.global-self-install` — 全局安装依赖包 / Installs a package globally
  中 该命令把包安装到全局前缀，于是用户的 PATH 上多出一个可执行文件，而且当前项目删除后它仍然留在那里。
  EN The command installs a package into the global prefix, which puts a new executable on the user's PATH and keeps it there after the current project is deleted.
  - `install.ps1:121` — `npm install -g`
  - `install.sh:76` — `npm install -g`
  中 修复：改为本地安装，并通过项目自身的脚本调用该工具；全局安装应由用户自己决定，而不是由插件代劳。
  EN Fix: Install locally and invoke the tool through the project's own scripts; global installs belong to the user's decision, not to a plugin.
- **高 / HIGH** `prompt.doc-instruction` — 文档中包含针对模型的指令 / Documentation contains instructions aimed at a model
  中 随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。
  EN A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.
  - `prompts/infinite-gen-3.md:35` — `suffixes, multi-turn bypass, RAG attacks, output shaping): strategies,`
  - `prompts/infinite-gen-4.1-flash.md:35` — `suffixes, multi-turn bypass, RAG attacks, output shaping): strategies,`
  - `prompts/infinite-gen-4.md:35` — `suffixes, multi-turn bypass, RAG attacks, output shaping): strategies,`
  - `tests/prompt-bank.jsonl:19` — `{"case_id": "llm__research__minimal__en__00", "scenario": "llm", "level": "minimal", "language": "en", "expected_domain": "llm", "prompt": "llm research: prompt…`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。
  EN Fix: Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.
- **高 / HIGH** `prompt.embedded-instruction-string` — 源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model
  中 源码中的字符串字面量——通常是工具描述或系统提示词片段——要求模型绕过确认或对用户隐瞒某些事，于是它作为一条指令进入上下文窗口。
  EN A string literal in the source — typically a tool description or system prompt fragment — tells the model to bypass confirmation or to hide something from the user, so it lands in the context window as a directive.
  - `index.js:112` — `"bypass license"`
  - `scripts/lib/scorer.mjs:42` — `"bypass license"`
  中 修复：如实描述工具的行为，删除那些会改变 agent 对待用户方式的指令。
  EN Fix: Describe the tool's behavior factually and remove directives that change how the agent treats the user.

### 中 / MEDIUM (3)

- **中 / MEDIUM** `cred.many-secret-env-vars` — 读取多个不同名称的密钥类环境变量 / Reads several differently-named secret environment variables
  中 这里的一行、或整个包里的若干行，读取了名称看起来像凭据的环境变量。只读一个文档中声明的 key 是插件本该有的认证方式；枚举多个不同名称的密钥，则是在收集凭据而不是在使用凭据。
  EN One line here, or several across the package, read environment variables whose names look like credentials. Reading a single documented key is how a plugin is meant to authenticate; enumerating many differently-named ones is how credentials are gathered rather than used.
  - `scripts/run_bank_live.mjs:26` — `process.env.DEEPSEEK_API_KEY`
  中 修复：只保留插件确实需要且有文档说明的变量，删掉与任何功能无关的密钥读取。
  EN Fix: Keep to the variables this plugin documents and needs, and delete reads of keys it has no feature for.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `scripts/scorer_semantics_test.mjs:9` — `http://TARGET/login；2.`
  - `scripts/verify_prompt_gen4.mjs:60` — `http://TARGET/login`
  - `scripts/verify_prompt_gen4.mjs:60` — `http://TARGET/login锚点:`
  - `scripts/verify_prompt.mjs:77` — `http://TARGET/login`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 2 shipped file(s) are 64 KiB or larger and were not read as text, the largest being assets/community.jpg at 136 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `assets/community.jpg` — `138755 bytes not decoded as text`
  - `scripts/run_bank_live.mjs:57` — `const res = await fetch(`${apiBase}/v1/chat/completions`, {`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (1)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `install.ps1:207` — `if ($pkg.dsh -and $pkg.dsh.profile -and $pkg.dsh.profile.bundles) {`
  - `install.ps1:208` — `$bundles = @($pkg.dsh.profile.bundles)`
  - `install.ps1:212` — `$pkg.dsh.profile.bundles = $bundles`
  - `install.sh:127` — `if (pkg.dsh && pkg.dsh.profile && pkg.dsh.profile.bundles) {`
  - ……另有 5 处 / … and 5 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.

_按类别 / By category:_ 提示注入 / prompt injection 2 · 凭据读取 / credential access 2 · 数据外传 / exfiltration 1 · 持久化 / persistence 1 · 网络回调 / network callbacks 1 · 供应链 / supply chain 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `dsh-infinite-gen-4-HEAD/`
- skipped assets/banner.png: 917640 bytes exceeds the 524288-byte per-file cap
- not scanned (binary, contents unreadable as text): assets/community.jpg, assets/sponsor.jpg
- outbound fetching was permitted for this audit
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
