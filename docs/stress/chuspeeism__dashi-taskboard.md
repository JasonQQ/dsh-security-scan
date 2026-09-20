> 批量压测 / Batch stress test · ★ 3159 · `chuspeeism/dashi-taskboard#integrations/deepseek-harness`
> https://github.com/chuspeeism/dashi-taskboard/tree/main/integrations/deepseek-harness · audited in 1.7s
# 安装前体检 / Pre-install audit: dsh-codex-taskboard@1.0.0

**信任评级 / Trust grade: A** (评分 / score 100/100 — 没有值得注意的风险信号 / no meaningful risk signals)

- 来源 / Source: `https://codeload.github.com/chuspeeism/dashi-taskboard/tar.gz/HEAD` (URL / url)
- 已分析文件：5 个（8.6 KiB） / Files analysed: 5 (8.6 KiB)
- 内容摘要 / Content digest: `594228bd5fcb2693ede2d145fc07f94e…`
- 体检时间 / Audited at: 2026-09-20T09:51:51.016Z

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `node:fs/promises`
- **写入的文件路径 / File paths written:** （无） / (none)
- **派生的命令 / Commands spawned:** （无） / (none)
- **连接的域名 / Domains contacted:** （无） / (none)
- **读取的环境变量 / Environment variables read:** `CODEX_TASKBOARD_RUNTIME_FILE`

## 发现 / Findings

没有任何规则命中。这只说明「在已读取的内容里没有发现」，部分扫描或二进制载荷仍可能藏有行为。 / No rule fired. This is evidence of absence only within what was read — a partial scan or a binary payload can still hide behavior.

## 扫描说明 / Scan notes

- scoped to the subdirectory `integrations/deepseek-harness/`
- stripped the archive's single top-level directory `dashi-taskboard-HEAD/`
- outbound fetching was permitted for this audit

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
