> 批量压测 / Batch stress test · ★ 3642 · `strukto-ai/mirage#typescript/packages/dsh`
> https://github.com/strukto-ai/mirage/tree/main/typescript/packages/dsh · audited in 4.5s
# 安装前体检 / Pre-install audit: @struktoai/mirage-dsh@0.0.7-alpha.2

**信任评级 / Trust grade: C** (评分 / score 74/100 — 有值得注意的风险信号，确认后再安装 / notable risk signals, install only with intent)

- 来源 / Source: `https://codeload.github.com/strukto-ai/mirage/tar.gz/HEAD` (URL / url)
- 已分析文件：27 个（291.6 KiB） / Files analysed: 27 (291.6 KiB)
- 内容摘要 / Content digest: `bf73ce85cefe6ce7a8ef8d3054b6dbf6…`
- 体检时间 / Audited at: 2026-09-20T09:51:50.983Z

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `/data/a.txt`, `/data/vault/secret`
- **写入的文件路径 / File paths written:** `/data/notes.txt`, `/data/second.txt`, `node:fs/promises`, `/data`, `/data/a.txt`, `/data/vault`, `/data/vault/secret`, `/data/public.txt`, `/data/work`, `/data/keep.txt`, `a.txt`, `b.txt` （另有 8 项） / (+8 more)
- **派生的命令 / Commands spawned:** （无） / (none)
- **连接的域名 / Domains contacted:** `github.com`, `${encoded`, `r.txt`
- **读取的环境变量 / Environment variables read:** （无） / (none)

## 发现 / Findings

### 高 / HIGH (1)

- **高 / HIGH** `supply.url-dependency` — 依赖解析到 URL、git 引用或文件路径 / Dependency resolves to a URL, git ref or file path
  中 依赖不是从仓库解析，而是来自 URL、git 引用、本地路径或 patch，因此其内容不受仓库锁文件和任何完整性元数据约束，可以在版本号不变的情况下被替换。
  EN A dependency is resolved from a URL, a git reference, a local path or a patch instead of the registry, so its contents are not covered by the registry lockfile or by any integrity metadata and can change without a version bump.
  - `package.json:62` — `"@struktoai/mirage-core": "workspace:*",`
  - `package.json:63` — `"@struktoai/mirage-node": "workspace:*"`
  中 修复：改为依赖仓库中已发布的版本，并用锁文件固定；如果确实必须用 fork，就把它发布到自己名下的 scope。
  EN Fix: Depend on a published version from the registry, pinned by a lockfile; if a fork is unavoidable, publish it under your own scope.

### 低 / LOW (4)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `src/service.ts:178` — `config.profiles !== undefined ||`
  - `src/service.ts:179` — `config.profile !== undefined`
  - `src/service.ts:199` — `if (config.profiles !== undefined) {`
  - `src/service.ts:200` — `if (options.profiles !== undefined) {`
  - ……另有 5 处 / … and 5 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `destructive.recursive-delete-system-path` — 递归删除指向用户主目录或系统目录 / Recursive delete aimed at a home or system directory
  中 递归删除的目标是用户主目录或系统路径，一旦变量写错、展开为空或缺少判空保护，被销毁的就是用户数据而不是包自己的构建产物。
  EN A recursive delete targets a home directory or a system path, so a wrong variable, an empty expansion or a missing guard destroys user data instead of the package's own build output.
  - `src/approval.test.ts:153` — `expect(said(['/data/a\nrm -rf /'])).toBe("deletes are reviewed: rm '/data/a'$'\\n''rm -rf /'")`
  中 修复：只删除包在自己目录下创建的路径，并在解析出的路径不位于该目录内时拒绝执行。
  EN Fix: Delete only paths the package created under its own directory, and refuse to run when the resolved path is not inside it.
- **低 / LOW** `destructive.shipped-command` — 内置破坏性文件系统命令 / Ships a destructive filesystem command
  中 抹掉用户主目录、根文件系统或分区的命令出现在可执行内容里，而不是文档描述中。即便有条件判断保护，这种原语也绝不该被塞进插件里。
  EN A command that erases a home directory, a root filesystem or a partition appears in executable content rather than in prose. Even guarded by a condition, it is a primitive that should never travel inside a plugin.
  - `src/approval.test.ts:153` — `expect(said(['/data/a\nrm -rf /'])).toBe("deletes are reviewed: rm '/data/a'$'\\n''rm -rf /'")`
  中 修复：删除该命令。插件如果必须清理，应把删除限定在它自己创建的目录，并以包根目录为基准解析这个路径。
  EN Fix: Delete the command. If a plugin must clean up, restrict deletion to a directory it created and resolve that path from the package root.
- **低 / LOW** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `src/integration.test.ts:102` — `toolName: 'bash',`
  - `src/spill-store.test.ts:62` — `toolName: 'bash',`
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.

_按类别 / By category:_ 破坏性 / destructive 2 · 供应链 / supply chain 1 · 凭据读取 / credential access 1 · 滥用宿主环境 / harness abuse 1

## 扫描说明 / Scan notes

- scoped to the subdirectory `typescript/packages/dsh/`
- stripped the archive's single top-level directory `mirage-HEAD/`
- outbound fetching was permitted for this audit

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
