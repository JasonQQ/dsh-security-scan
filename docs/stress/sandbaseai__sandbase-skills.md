> 批量压测 / Batch stress test · ★ 195 · `sandbaseai/sandbase-skills`
> https://github.com/sandbaseai/sandbase-skills · audited in 5.8s
# 安装前体检 / Pre-install audit: @sandbaseai/dsh-skills@0.3.5

**信任评级 / Trust grade: A** (评分 / score 93/100 — 没有值得注意的风险信号 / no meaningful risk signals)

- 来源 / Source: `https://codeload.github.com/sandbaseai/sandbase-skills/tar.gz/HEAD` (URL / url)
- 已分析文件：333 个（811.7 KiB） / Files analysed: 333 (811.7 KiB)
- 内容摘要 / Content digest: `374d3f6666e8d0a0f8cac194c2005a1a…`
- 体检时间 / Audited at: 2026-09-20T09:53:46.190Z

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `node:fs/promises`, `package.json`, `plugin.json`, `agent-plugin/plugin.json`, `dsh/cordis.patch.yml`, `SKILL.md`
- **写入的文件路径 / File paths written:** `node:fs/promises`, `SKILL.md`
- **派生的命令 / Commands spawned:** （无） / (none)
- **连接的域名 / Domains contacted:** `json.schemastore.org`, `github.com`, `agent-plugins.org`, `http:`, `www.w3.org`, `docs.github.com`, `docs.gitlab.com`, `support.atlassian.com`, `raw.githubusercontent.com`, `example.com`, `www.apache.org`, `skills.sh` （另有 3 项） / (+3 more)
- **读取的环境变量 / Environment variables read:** （无） / (none)

## 发现 / Findings

### 中 / MEDIUM (1)

- **中 / MEDIUM** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 15 distinct remote hosts (agent-plugins.org, docs.github.com, docs.gitlab.com, github.com, http:, json.schemastore.org, support.atlassian.com, www.w3.org, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `.claude-plugin/marketplace.json:2` — `https://json.schemastore.org/claude-code-marketplace.json`
  - `.claude-plugin/marketplace.json:12` — `https://github.com/sandbaseai`
  - `agent-plugin/plugin.json:2` — `https://agent-plugins.org/schemas/1.0.0/plugin.schema.json`
  - `agent-plugin/skills/multi-source-search/scripts/validate_report.py:21` — `https://http://`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `sandbase-skills-HEAD/`
- outbound fetching was permitted for this audit

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
