> 批量压测 / Batch stress test · ★ 180 · `seriousz158/dsh-memory`
> https://github.com/seriousz158/dsh-memory · audited in 1.6s
# 安装前体检 / Pre-install audit: dsh-git-memory@0.9.3

**信任评级 / Trust grade: C** (评分 / score 70/100 — 有值得注意的风险信号，确认后再安装 / notable risk signals, install only with intent)

- 来源 / Source: `https://codeload.github.com/seriousz158/dsh-memory/tar.gz/HEAD` (URL / url)
- 已分析文件：100 个（950.8 KiB） / Files analysed: 100 (950.8 KiB)
- 内容摘要 / Content digest: `a0efc9a8690f71f201e2a29d84723104…`
- 体检时间 / Audited at: 2026-09-20T09:53:47.772Z

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `node:fs/promises`, `summary.md`, `.sync`, `last-run.json`, `.sync/last-run.json`, `failure-sentinel.json`, `.sync/failure-sentinel.json`, `finalize-failure.json`, `.sync/finalize-failure.json`, `.sync/runs`, `.sync/runs/${runId}.json`, `owner.json` （另有 28 项） / (+28 more)
- **写入的文件路径 / File paths written:** `node:fs/promises`, `\n`, `.sync`, `.sync/runs/${record.run_id}.json`, `last-run.json`, `.sync/last-run.json`, `owner.json`, `summary.md`, `.sync/runs`, `.sync/runs/${runId}.json`, `package.json`, `cordis.yml` （另有 56 项） / (+56 more)
- **派生的命令 / Commands spawned:** `node:child_process`, `/usr/bin/git`, `-C`, `utf8`, `bundle`, `verify`, `list-heads`, `/usr/bin/python3`, `prepare-preview`, `--root`, `--run-id`, `init` （另有 30 项） / (+30 more)
- **连接的域名 / Domains contacted:** `www.apple.com`, `registry.npmjs.org`, `github.com`, `opencollective.com`, `registry.npmmirror.com`, `127.0.0.1:${service.port`, `example.invalid`
- **读取的环境变量 / Environment variables read:** `DSH_HOME`, `DSH_MEMORY_ROOT`, `DPSK_PYTHON3`, `process.env (every variable)`, `DSH_RUNTIME_ROOT`, `HOME`, `DSH_E2E_VERSION`, `DPSK_ZSTD`, `DSH_RUNTIME_NODE_MODULES`, `DSH_EXPECTED_VERSION`, `SAFE_TOKEN`, `CLIENT_SECRET`

## 发现 / Findings

### 高 / HIGH (1)

- **高 / HIGH** `prompt.doc-instruction` — 文档中包含针对模型的指令 / Documentation contains instructions aimed at a model
  中 随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。
  EN A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.
  - `docs/release-checklist.md:29` — `The secret scan checks both tracked working-tree content and the Git index. The public-tree guard constructs an isolated snapshot from the Git index before read…`
  中 修复：把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。
  EN Fix: Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.

### 低 / LOW (6)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `tests/test_release_guards.sh:113` — `print -- "_authToken=${prefix}_${suffix}" > "$fixture/.npmrc"`
  - `tests/test_release_guards.sh:118` — `print -- "_authToken=${prefix}_${suffix}" > "$fixture/.npmrc"`
  - `tests/test_release_guards.sh:119` — `git -C "$fixture" add .npmrc`
  - `tools/public-tree-check.mjs:292` — `/(?:^|\/)(?:\.env(?:\.|$)|\.npmrc|\.dsh|\.playwright-cli|node_modules|__pycache__)(?:\/|$)/.test(file)`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `cred.many-secret-env-vars` — 读取多个不同名称的密钥类环境变量 / Reads several differently-named secret environment variables
  中 这里的一行、或整个包里的若干行，读取了名称看起来像凭据的环境变量。只读一个文档中声明的 key 是插件本该有的认证方式；枚举多个不同名称的密钥，则是在收集凭据而不是在使用凭据。
  EN One line here, or several across the package, read environment variables whose names look like credentials. Reading a single documented key is how a plugin is meant to authenticate; enumerating many differently-named ones is how credentials are gathered rather than used.
  - `tests/test_release_guards.sh:156` — `process.env.SAFE_TOKEN`
  - `tests/test_release_guards.sh:195` — `process.env.CLIENT_SECRET`
  - `tests/test_release_guards.sh:201` — `process.env.CLIENT_SECRET`
  - `tests/test_release_guards.sh:222` — `process.env.SAFE_TOKEN`
  中 修复：只保留插件确实需要且有文档说明的变量，删掉与任何功能无关的密钥读取。
  EN Fix: Keep to the variables this plugin documents and needs, and delete reads of keys it has no feature for.
- **低 / LOW** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `tests/helpers/dsh-e2e-service.mjs:237` — `http://127.0.0.1:${service.port`
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **低 / LOW** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `tests/helpers/dsh-e2e-service.mjs:237` — `service.baseUrl = `http://127.0.0.1:${service.port}`;`
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **低 / LOW** `net.token-or-blob-in-url` — 把凭据或编码数据块放进 URL / Puts a credential or encoded blob in a URL
  中 令牌形状的查询参数、内嵌的 `user:password` 授权部分，或超长高熵的查询值，都意味着密钥或载荷数据在 URL 中传输，最终会留在访问日志、代理和浏览器历史里。
  EN A token-shaped query parameter, an embedded `user:password` authority, or a long high-entropy query value means secret material or payload data travels in a URL, where it lands in access logs, proxies and browser history.
  - `tests/test_dsh_memory_redaction.mjs:69` — ``Keep benign-assistant-text; redact ${syntheticFineGrainedGitHubToken} and https://example.invalid/cb?token=${querySecret}.``
  中 修复：凭据放在 Authorization 头里发送，载荷用 POST 放在请求体中，不要编码进查询字符串。
  EN Fix: Send credentials in an Authorization header, and POST payloads in the body rather than encoding them into the query string.
- **低 / LOW** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `tests/test_dsh_memory_marketplace.mjs:53` — `const host = await import(join(project, "packages/dsh-git-memory/lib/index.js"));`
  - `tests/test_dsh_memory_runtime.sh:40` — `const p=require(process.argv[1]);`
  - `tests/test_dsh_memory_ui_settings_row.sh:53` — `const p=require(process.argv[1]);`
  - `tests/test_dsh_runtime_imports.mjs:16` — `const entry = await import(pathToFileURL(join(destination, "lib/index.js")).href);`
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.

_按类别 / By category:_ 网络回调 / network callbacks 3 · 凭据读取 / credential access 2 · 提示注入 / prompt injection 1 · 混淆 / obfuscation 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `dsh-memory-HEAD/`
- outbound fetching was permitted for this audit

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
