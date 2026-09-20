> 批量压测 / Batch stress test · ★ 475 · `gitroomhq/postiz-agent#plugins/dsh-postiz`
> https://github.com/gitroomhq/postiz-agent/tree/main/plugins/dsh-postiz · audited in 1.4s
# 安装前体检 / Pre-install audit: dsh-postiz@0.1.0

**信任评级 / Trust grade: A** (评分 / score 100/100 — 没有值得注意的风险信号 / no meaningful risk signals)

- 来源 / Source: `https://codeload.github.com/gitroomhq/postiz-agent/tar.gz/HEAD` (URL / url)
- 已分析文件：7 个（19.2 KiB） / Files analysed: 7 (19.2 KiB)
- 内容摘要 / Content digest: `b2f977039f44b385053ed02ff97efee0…`
- 体检时间 / Audited at: 2026-09-20T09:52:55.193Z

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `package.json`, `../package.json`, `cordis.patch.yml`, `../cordis.patch.yml`
- **写入的文件路径 / File paths written:** （无） / (none)
- **派生的命令 / Commands spawned:** （无） / (none)
- **连接的域名 / Domains contacted:** `mcp.postiz.com`, `www.gnu.org`, `postiz.com`, `github.com`, `postiz.example.com`
- **读取的环境变量 / Environment variables read:** `process.env (every variable)`

## 发现 / Findings

没有任何规则命中。这只说明「在已读取的内容里没有发现」，部分扫描或二进制载荷仍可能藏有行为。 / No rule fired. This is evidence of absence only within what was read — a partial scan or a binary payload can still hide behavior.

## 扫描说明 / Scan notes

- scoped to the subdirectory `plugins/dsh-postiz/`
- stripped the archive's single top-level directory `postiz-agent-HEAD/`
- outbound fetching was permitted for this audit

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
