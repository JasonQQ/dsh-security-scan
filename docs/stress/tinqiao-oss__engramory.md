> 批量压测 / Batch stress test · ★ 191 · `tinqiao-oss/engramory#adapters/dsh/plugin`
> https://github.com/tinqiao-oss/engramory/tree/master/adapters/dsh/plugin · audited in 1.1s
# 安装前体检 / Pre-install audit: dsh-engramory@0.2.4

**信任评级 / Trust grade: A** (评分 / score 93/100 — 没有值得注意的风险信号 / no meaningful risk signals)

- 来源 / Source: `https://codeload.github.com/tinqiao-oss/engramory/tar.gz/HEAD` (URL / url)
- 已分析文件：7 个（58.4 KiB） / Files analysed: 7 (58.4 KiB)
- 内容摘要 / Content digest: `94c7c4d9f5df56cdab55d49c3694a34e…`
- 体检时间 / Audited at: 2026-09-20T09:53:45.048Z

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** （无） / (none)
- **写入的文件路径 / File paths written:** `MEMORY.md`, `\n`
- **派生的命令 / Commands spawned:** （无） / (none)
- **连接的域名 / Domains contacted:** `github.com`
- **读取的环境变量 / Environment variables read:** （无） / (none)

## 发现 / Findings

### 中 / MEDIUM (1)

- **中 / MEDIUM** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `test.js:68` — `return { name: 'write', arguments: { file_path, content } }`
  - `test.js:143` — `assert.equal(guard({ name: 'read', arguments: { file_path: path } }), undefined)`
  - `test.js:153` — `name: 'edit',`
  - `test.js:158` — `name: 'edit',`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.

## 扫描说明 / Scan notes

- scoped to the subdirectory `adapters/dsh/plugin/`
- stripped the archive's single top-level directory `engramory-HEAD/`
- outbound fetching was permitted for this audit

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
