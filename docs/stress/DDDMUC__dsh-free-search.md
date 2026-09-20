> 批量压测 / Batch stress test · ★ 210 · `DDDMUC/dsh-free-search`
> https://github.com/DDDMUC/dsh-free-search · audited in 0.9s
# 安装前体检 / Pre-install audit: dsh-free-search@0.4.32

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

- 来源 / Source: `https://codeload.github.com/DDDMUC/dsh-free-search/tar.gz/HEAD` (URL / url)
- 已分析文件：20 个（848.1 KiB） / Files analysed: 20 (848.1 KiB)
- 内容摘要 / Content digest: `a637c6ffa68128c612d27d3e1e18d0df…`
- 体检时间 / Audited at: 2026-09-20T09:53:31.917Z

## 最严重的风险 / Most severe risk

**文档中包含针对模型的指令 / Documentation contains instructions aimed at a model** `prompt.doc-instruction`

中 它夹带了写给 agent 而不是写给人看的文字——试图在你不察觉的情况下改变 agent 行为的指令。
EN It carries text aimed at the agent rather than at a person — instructions that try to change what the agent does without telling you.

该包会访问的目标：`duckduckgo.com`、`www.bing.com`、`anysearch.com`、`github.com`、`dashboard.exa.ai`、`app.tavily.com`、`keenable.ai`、`www.firecrawl.dev` / Destinations this package reaches: `duckduckgo.com`, `www.bing.com`, `anysearch.com`, `github.com`, `dashboard.exa.ai`, `app.tavily.com`, `keenable.ai`, `www.firecrawl.dev`

- 中 它还安排了之后继续运行，所以仅仅卸载这个包并不够。
  EN It also arranges to run again later, so removing the package is not enough on its own.

决定该评级的规则命中于 `README.md:307`；完整列表见下方「发现」。 / The rule that decided the grade fired at `README.md:307`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** （无） / (none)
- **写入的文件路径 / File paths written:** （无） / (none)
- **派生的命令 / Commands spawned:** `node:child_process`
- **连接的域名 / Domains contacted:** `duckduckgo.com`, `www.bing.com`, `anysearch.com`, `github.com`, `dashboard.exa.ai`, `app.tavily.com`, `keenable.ai`, `www.firecrawl.dev`, `platform.parallel.ai`, `www.perplexity.ai`, `serpbase.dev`, `platform.deepseek.com` （另有 33 项） / (+33 more)
- **读取的环境变量 / Environment variables read:** （无） / (none)

## 发现 / Findings

### 高 / HIGH (4)

- **高 / HIGH** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 44 distinct remote hosts (anysearch.com, app.tavily.com, dashboard.exa.ai, duckduckgo.com, github.com, keenable.ai, www.bing.com, www.firecrawl.dev, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `lib/client.js:227` — `https://duckduckgo.com`
  - `lib/client.js:229` — `https://www.bing.com`
  - `lib/client.js:230` — `https://anysearch.com`
  - `lib/client.js:231` — `https://github.com/searxng/searxng`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `tools/server.mjs:34` — `const url = new URL(req.url, `http://127.0.0.1:${PORT}`);`
  - `tools/server.mjs:69` — `console.log(`DSH 搜索引擎切换器已启动: http://127.0.0.1:${PORT}`);`
  - `tools/启动DeepSeekHarness.cmd:7` — `set "HTTPS_PROXY=http://127.0.0.1:7897"`
  - `tools/启动DeepSeekHarness.cmd:8` — `set "HTTP_PROXY=http://127.0.0.1:7897"`
  - ……另有 4 处 / … and 4 more location(s)
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **高 / HIGH** `persist.dsh-settings-rewrite` — 改写 DSH 配置或 profile / Rewrites DSH settings or profiles
  中 该行写入了宿主配置（`~/.dsh/settings.yaml`、profile 或 storages）。改动 profile 会改变此后每次宿主启动时加载哪些插件，以及它们如何配置。
  EN The line writes into the harness configuration (`~/.dsh/settings.yaml`, profiles or storages). Changing the profile changes which plugins load and how they are configured on every future harness start.
  - `tools/server.mjs:7` — `.dsh/profiles/web/cordis.patch.yml`
  中 修复：把用户应当应用的配置打印出来，而不是直接写宿主的运行状态。
  EN Fix: Print the configuration the user should apply instead of writing the harness state directly.
- **高 / HIGH** `prompt.doc-instruction` — 文档中包含针对模型的指令 / Documentation contains instructions aimed at a model
  中 随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。
  EN A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.
  - `README.md:307` — `- **System Prompt Injection** — The agent is aware of the currently active engine and which engines require API keys`
  - `README.md:423` — `The command only changes the preferred engine; search still goes through `web_search` + the unified fallback chain — even if the preferred engine fails, it auto…`
  - `README.md:541` — `- `lib/index.js`: Host side. Implements `WebSearchProvider` (`id` / `available()` / `search()`), unified engine routing + auto-fallback (paid engines first, fre…`
  中 修复：把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。
  EN Fix: Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.

### 中 / MEDIUM (3)

- **中 / MEDIUM** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `lib/index.js:1023` — `name: "web_search",`
  - `lib/index.js:1260` — `tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 1 }],`
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `tools/server.mjs:34` — `http://127.0.0.1:${PORT`
  - `tools/server.mjs:69` — `http://127.0.0.1:${PORT`
  - `tools/启动DeepSeekHarness.cmd:7` — `http://127.0.0.1:7897`
  - `tools/启动DeepSeekHarness.cmd:8` — `http://127.0.0.1:7897`
  - ……另有 4 处 / … and 4 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 6 shipped file(s) are 64 KiB or larger and were not read as text, the largest being assets/settings-free1.png at 136 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `assets/settings-free1.png` — `139062 bytes not decoded as text`
  - `lib/client.js:243` — `const response = await fetch(`${BRIDGE_PREFIX}/describe`, {`
  - `lib/client.js:252` — `const response = await fetch(`${BRIDGE_PREFIX}/mutate`, {`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (1)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `lib/client.js:104` — `keysHint: "密钥读取优先级：.credentials.yaml 凭据中心 > 这里 > 环境变量。推荐把 key 写进凭据中心（与官方 LLM 一致，一处管理）。",`
  - `lib/client.js:108` — `keyStorageCredHint: (c) => `保存后写入 ~/.dsh/.credentials.yaml（最高优先级）。当前已配置：${["exa", "tavily", "keenable", "firecrawl", "parallel", "perplexity", "serpbase", "deep…`
  - `lib/client.js:171` — `keysHint: "Key resolution: .credentials.yaml credential center > here > environment variables. Recommended: store keys in the credential center (same as officia…`
  - `lib/client.js:175` — `keyStorageCredHint: (c) => `Saved to ~/.dsh/.credentials.yaml (highest priority). Currently configured: ${["exa", "tavily", "keenable", "firecrawl", "parallel",…`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.

_按类别 / By category:_ 网络回调 / network callbacks 3 · 持久化 / persistence 1 · 提示注入 / prompt injection 1 · 滥用宿主环境 / harness abuse 1 · 供应链 / supply chain 1 · 凭据读取 / credential access 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `dsh-free-search-HEAD/`
- not scanned (binary): assets/settings-apikey.png, assets/settings-free.png, assets/settings-free1.png, settings-apikey.png, settings-free.png and 1 more
- outbound fetching was permitted for this audit
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
