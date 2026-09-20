> 批量压测 / Batch stress test · ★ 27530 · `Tencent/WeKnora#packages/dsh-weknora`
> https://github.com/Tencent/WeKnora/tree/main/packages/dsh-weknora · audited in 9.0s
# 安装前体检 / Pre-install audit: @wxg-prc-cpg/dsh-weknora@0.1.0

**信任评级 / Trust grade: A** (评分 / score 94/100 — 没有值得注意的风险信号 / no meaningful risk signals)

- 来源 / Source: `https://codeload.github.com/Tencent/WeKnora/tar.gz/HEAD` (URL / url)
- 已分析文件：24 个（154.5 KiB） / Files analysed: 24 (154.5 KiB)
- 内容摘要 / Content digest: `17688c604845b7a02b7b6a54406f0cbc…`
- 体检时间 / Audited at: 2026-09-20T09:51:34.605Z

## 安装期脚本 / Install-time scripts

- `prepare` (`package.json`): `npm run build`

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `node:fs/promises`, `api-contract.json`, `fixtures/api-contract.json`, `index.js`, `dist/index.js`, `package.json`, `profiles/headless/package.json`
- **写入的文件路径 / File paths written:** `node:fs/promises`, `package.json`
- **派生的命令 / Commands spawned:** `node:child_process`
- **连接的域名 / Domains contacted:** `localhost`, `registry.npmjs.org`, `github.com`, `127.0.0.1`, `kb.example.com`, `kb.example.comhttps:`, `fake-model.invalid`, `127.0.0.1:${port`, `abcdefghijklmnopqrstuv`, `cdn.example.com`, `mock.invalid`
- **读取的环境变量 / Environment variables read:** `WEKNORA_BASE_URL`, `WEKNORA_API_KEY`, `WEKNORA_KNOWLEDGE_BASE_IDS`, `WEKNORA_AGENT_ID`, `WEKNORA_RESOURCE_URLS`, `DSH_INSTALL_DIR`, `DSH_PACKAGE_SPEC`, `DSH_BIN`, `DSH_E2E_LOG`, `DSH_E2E_KEEP_HOME`

## 发现 / Findings

### 低 / LOW (3)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `test/e2e/run-in-dsh.mjs:215` — `log(`# profile bundles: ${JSON.stringify(manifest.dsh.profile.bundles)}`)`
  - `test/e2e/run-in-dsh.mjs:217` — `manifest.dsh.profile.bundles.includes('@wxg-prc-cpg/dsh-weknora'),`
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `test/client.test.mjs:140` — `http://127.0.0.1:1/api/v1`
  - `test/e2e/fake-model.mjs:135` — `http://127.0.0.1:${port`
  - `test/helpers/mock-weknora.mjs:356` — `http://127.0.0.1:${port`
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **低 / LOW** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `test/client.test.mjs:140` — `const client = new WeknoraClient(resolveConfig({ baseUrl: 'http://127.0.0.1:1/api/v1', requestTimeoutMs: 1000 }))`
  - `test/e2e/fake-model.mjs:135` — `url: `http://127.0.0.1:${port}/v1`,`
  - `test/helpers/mock-weknora.mjs:356` — `url: `http://127.0.0.1:${port}/api/v1`,`
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.

_按类别 / By category:_ 网络回调 / network callbacks 2 · 凭据读取 / credential access 1

## 扫描说明 / Scan notes

- scoped to the subdirectory `packages/dsh-weknora/`
- stripped the archive's single top-level directory `WeKnora-HEAD/`
- outbound fetching was permitted for this audit

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
