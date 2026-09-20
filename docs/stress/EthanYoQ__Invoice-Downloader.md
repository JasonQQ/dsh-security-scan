> 批量压测 / Batch stress test · ★ 428 · `EthanYoQ/Invoice-Downloader#plugins/dsh-invoice-downloader`
> https://github.com/EthanYoQ/Invoice-Downloader/tree/main/plugins/dsh-invoice-downloader · audited in 3.0s
# 安装前体检 / Pre-install audit: @ethanyoq/dsh-invoice-downloader@0.1.1

**信任评级 / Trust grade: A** (评分 / score 91/100 — 没有值得注意的风险信号 / no meaningful risk signals)

- 来源 / Source: `https://codeload.github.com/EthanYoQ/Invoice-Downloader/tar.gz/HEAD` (URL / url)
- 已分析文件：37 个（162.2 KiB） / Files analysed: 37 (162.2 KiB)
- 内容摘要 / Content digest: `caafb43a08539be7aaec8ea07fdc9e9b…`
- 体检时间 / Audited at: 2026-09-20T09:53:02.974Z

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

发布期钩子（维护者打包或发布时运行，安装时不会执行）： / Publish-time hooks (run when the maintainer packs or publishes, not on install):

- `prepack`: `npm run build && npm run test:package`

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `app_api.py`, `runtime/engine/MANIFEST.json`, `package.json`, `src/invoice_engine/app_api.py`, `client-sidebar.js`, `../src/client-sidebar.js`, `invoice-scanner.ts`, `../src/invoice-scanner.ts`, `storage.ts`, `../src/storage.ts`, `install.py`, `../runtime/install.py` （另有 2 项） / (+2 more)
- **写入的文件路径 / File paths written:** `src/invoice_engine`, `__init__.py`, `src/invoice_engine/__init__.py`, `app_api.py`, `src/invoice_engine/app_api.py`
- **派生的命令 / Commands spawned:** `node:child_process`, `git`, `-C`, `rev-parse`, `HEAD`, `utf8`, `not used`
- **连接的域名 / Domains contacted:** `www.apache.org`, `github.com`, `registry.npmjs.org`
- **读取的环境变量 / Environment variables read:** `DSH_HOME`, `USERPROFILE`, `HOME`

## 发现 / Findings

### 中 / MEDIUM (1)

- **中 / MEDIUM** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `src/client-sidebar.js:520` — `{ name: 'shell.overlay', id: 'invoice-downloader-panel', order: 95, label: '发票下载' },`
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.

### 低 / LOW (1)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `src/activate.ts:45` — `const profileDir = config.profileDir?.trim()`
  - `src/rpc-handler.ts:199` — `const settings = readSettings(context.profileDir)`
  - `src/rpc-handler.ts:210` — `const current = readSettings(context.profileDir)`
  - `src/rpc-handler.ts:222` — `writeSettings(context.profileDir, settings)`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.

_按类别 / By category:_ 滥用宿主环境 / harness abuse 1 · 凭据读取 / credential access 1

## 扫描说明 / Scan notes

- scoped to the subdirectory `plugins/dsh-invoice-downloader/`
- stripped the archive's single top-level directory `Invoice-Downloader-HEAD/`
- outbound fetching was permitted for this audit

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
