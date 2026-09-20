> 批量压测 / Batch stress test · ★ 3489 · `agentscope-ai/ReMe#integrations/dsh`
> https://github.com/agentscope-ai/ReMe/tree/main/integrations/dsh · audited in 11.5s
# 安装前体检 / Pre-install audit: @agentscope-ai/reme-dsh-plugin@0.1.1

**信任评级 / Trust grade: C** (评分 / score 61/100 — 有值得注意的风险信号，确认后再安装 / notable risk signals, install only with intent)

- 来源 / Source: `https://codeload.github.com/agentscope-ai/ReMe/tar.gz/HEAD` (URL / url)
- 已分析文件：45 个（2.8 MiB） / Files analysed: 45 (2.8 MiB)
- 内容摘要 / Content digest: `6a9884266b23fc3f94f682e7a915539e…`
- 体检时间 / Audited at: 2026-09-20T09:51:59.606Z

## 安装期脚本 / Install-time scripts

- `prepare` (`package.json`): `npm run build`

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `node:fs/promises`, `../package.json`
- **写入的文件路径 / File paths written:** `node:fs/promises`
- **派生的命令 / Commands spawned:** `node_modules/cross-spawn`, `resolved`, `https://registry.npmjs.org/cross-spawn/-/cross-spawn-7.0.6.tgz`, `cross-spawn`, `^7.0.6`, `node:child_process`
- **连接的域名 / Domains contacted:** `registry.npmjs.org`, `opencollective.com`, `github.com`, `eslint.org`, `tidelift.com`, `reme.agentscope.io`, `127.0.0.1`, `${host`, `first.test`, `second.test`, `memory.local`, `localhost`
- **读取的环境变量 / Environment variables read:** `process.env (every variable)`

## 发现 / Findings

### 高 / HIGH (1)

- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `src/config.ts:53` — `endpoint: "http://127.0.0.1:2333",`
  - `tests/client.test.mjs:20` — `endpoint: "http://127.0.0.1:2333",`
  - `tests/client.test.mjs:29` — `url: "http://127.0.0.1:2333/search",`
  - `tests/client.test.mjs:48` — `endpoint: "http://127.0.0.1:2333",`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.

### 中 / MEDIUM (3)

- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `src/config.ts:53` — `http://127.0.0.1:2333`
  - `src/config.ts:85` — `http://${host`
  - `tests/client.test.mjs:20` — `http://127.0.0.1:2333`
  - `tests/client.test.mjs:29` — `http://127.0.0.1:2333/search`
  - ……另有 3 处 / … and 3 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `obf.long-minified-line` — 整行是压缩或机器生成的数据块 / Line is a single minified or machine-generated blob
  中 该行超过 500 个字符且几乎没有空白，正是打包载荷、压缩字符串表或机器生成单行代码的样子。这样的一行用肉眼什么也审不出来。
  EN The line is over 500 characters with almost no whitespace, which is what a bundled payload, a packed string table or a machine-generated one-liner looks like. Nothing on such a line is reviewable by eye.
  - `src/client/styles.ts:9` — `.reme-settings-status{flex:1 0 100%;min-width:0;display:flex;align-items:center;gap:8px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.5}.r…`
  - `src/client/styles.ts:10` — `.reme-settings-button,.reme-settings-discard,.reme-settings-save{appearance:none;border:1px solid transparent;border-radius:8px;padding:5px 12px;background:none…`
  中 修复：发布未压缩的源码，或在 README 中说明该文件由哪个构建产出、可读源码在哪里。
  EN Fix: Ship unminified source, or state in the README which build produced the file and where the readable source lives.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 9 shipped file(s) are 64 KiB or larger and were not read as text, the largest being figures/reme-status-journal.png at 342 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `figures/reme-status-journal.png` — `350124 bytes not decoded as text`
  - `package-lock.json:1340` — `"undici-types": "~6.21.0"`
  - `package-lock.json:2866` — `"node_modules/undici-types": {`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

_按类别 / By category:_ 网络回调 / network callbacks 2 · 混淆 / obfuscation 1 · 供应链 / supply chain 1

## 扫描说明 / Scan notes

- scoped to the subdirectory `integrations/dsh/`
- stripped the archive's single top-level directory `ReMe-HEAD/`
- not scanned (binary): figures/memory-context-injection.png, figures/memory-search-tool.png, figures/reme-memory-settings.png, figures/reme-status-auto-dream.png, figures/reme-status-auto-memory.png and 4 more
- outbound fetching was permitted for this audit

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
