> 批量压测 / Batch stress test · ★ 38104 · `volcengine/OpenViking#examples/dsh-memory-plugin`
> https://github.com/volcengine/OpenViking/tree/main/examples/dsh-memory-plugin · audited in 11.2s
# 安装前体检 / Pre-install audit: @openviking/dsh-memory-plugin@0.4.3

**信任评级 / Trust grade: C** (评分 / score 67/100 — 有值得注意的风险信号，确认后再安装 / notable risk signals, install only with intent)

- 来源 / Source: `https://codeload.github.com/volcengine/OpenViking/tar.gz/HEAD` (URL / url)
- 已分析文件：29 个（186.6 KiB） / Files analysed: 29 (186.6 KiB)
- 内容摘要 / Content digest: `751acad457961545db11036445e6b6c6…`
- 体检时间 / Audited at: 2026-09-20T09:51:36.756Z

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

发布期钩子（维护者打包或发布时运行，安装时不会执行）： / Publish-time hooks (run when the maintainer packs or publishes, not on install):

- `prepack`: `node ../memory-plugin-shared/sync.mjs`
- `prepublishOnly`: `npm run prepack && npm run check && npm test`

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `node:fs/promises`, `./cordis.patch.yml`, `./package.json`, `./package-lock.json`, `node_modules/readdirp`, `./config.mjs`, `package.json`, `SKILL.md`, `openviking-memory/SKILL.md`
- **写入的文件路径 / File paths written:** `.git`, `.git/HEAD`, `node:fs/promises`
- **派生的命令 / Commands spawned:** `cross-spawn`, `^7.0.5`, `node_modules/cross-spawn`, `resolved`, `https://registry.npmjs.org/cross-spawn/-/cross-spawn-7.0.6.tgz`
- **连接的域名 / Domains contacted:** `session`, `127.0.0.1`, `plugin.local`, `env.local`, `ov.example.com`, `registry.npmjs.org`, `github.com`, `opencollective.com`, `paulmillr.com`, `user`, `resources`
- **读取的环境变量 / Environment variables read:** `process.env (every variable)`, `OPENVIKING_E2E`, `OPENVIKING_PENDING_DIR`, `OPENVIKING_PENDING_MAX_RETRIES`, `OPENVIKING_PENDING_REPLAY_LIMIT`, `OPENVIKING_PENDING_TTL_DAYS`, `OPENVIKING_PENDING_DRAIN_INTERVAL_MS`, `OPENVIKING_STATE_DIR`

## 发现 / Findings

### 高 / HIGH (1)

- **高 / HIGH** `prompt.doc-instruction` — 文档中包含针对模型的指令 / Documentation contains instructions aimed at a model
  中 随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。
  EN A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.
  - `README.md:103` — `### Why injection uses pre-step user messages, not the system prompt`
  - `README.md:107` — `They are deliberately **not** added to the system prompt: a DSH preset whose`
  中 修复：把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。
  EN Fix: Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.

### 中 / MEDIUM (1)

- **中 / MEDIUM** `install.hook-runs-shell-code` — 安装期钩子执行的不只是构建 / Lifecycle hook runs more than a build
  中 该钩子命令不属于常见的编译与拷贝步骤，安装这个包时会以用户权限运行任意代码，而这一切发生在任何人来得及检查之前。
  EN This hook command is not one of the usual compile-and-copy steps, so installing the package runs arbitrary code with the user's privileges before anything can be inspected.
  - `package.json:33` — `"prepack": "node ../memory-plugin-shared/sync.mjs",`
  中 修复：把钩子收敛为 `tsc` 或 `npm run build` 之类的构建命令，或把这项工作移到一个由用户主动执行的显式脚本里。
  EN Fix: Reduce the hook to a build command such as `tsc` or `npm run build`, or move the work into an explicit script the user chooses to run.

### 低 / LOW (4)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `index.mjs:52` — `runtime.profileMessage(agent),`
  - `lifecycle.mjs:4` — `const profile = await runtime.profileMessage(agent);`
  - `mcp.test.mjs:45` — `assert.equal(parsed.env.ELECTRON_RUN_AS_NODE, "1");`
  - `mcp.test.mjs:111` — `const proxy = readProxyConfig({ ...files, ...buildMcpConfig(config).env }, dir);`
  - ……另有 13 处 / … and 13 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `capture.test.mjs:56` — `data: { callId: "call-1", name: "bash", arguments: "{\"command\":\"pwd\"}" },`
  - `capture.test.mjs:86` — `data: { callId: "call-err", name: "bash", arguments: "{\"command\":\"df\"}" },`
  - `capture.test.mjs:115` — `data: { callId: "call-disabled", name: "bash" },`
  - `uri-guard.test.mjs:38` — `await guardVikingUri({ name: "read", arguments: { file_path: "/tmp/a" } }, next),`
  - ……另有 4 处 / … and 4 more location(s)
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.
- **低 / LOW** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `client.test.mjs:25` — `http://127.0.0.1:1933`
  - `client.test.mjs:39` — `http://127.0.0.1:1933/api/v1/sessions/dsh-1/commit`
  - `client.test.mjs:56` — `http://127.0.0.1:1933`
  - `client.test.mjs:80` — `http://127.0.0.1:1933`
  - ……另有 11 处 / … and 11 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **低 / LOW** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `client.test.mjs:25` — `endpoint: "http://127.0.0.1:1933",`
  - `client.test.mjs:39` — `assert.equal(seen.url, "http://127.0.0.1:1933/api/v1/sessions/dsh-1/commit");`
  - `client.test.mjs:56` — `endpoint: "http://127.0.0.1:1933",`
  - `client.test.mjs:80` — `endpoint: "http://127.0.0.1:1933",`
  - ……另有 11 处 / … and 11 more location(s)
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.

_按类别 / By category:_ 网络回调 / network callbacks 2 · 提示注入 / prompt injection 1 · 安装脚本 / install scripts 1 · 凭据读取 / credential access 1 · 滥用宿主环境 / harness abuse 1

## 扫描说明 / Scan notes

- scoped to the subdirectory `examples/dsh-memory-plugin/`
- stripped the archive's single top-level directory `OpenViking-HEAD/`
- outbound fetching was permitted for this audit

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
