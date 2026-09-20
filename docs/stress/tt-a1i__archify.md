> 批量压测 / Batch stress test · ★ 67553 · `tt-a1i/archify#integrations/deepseek-harness`
> https://github.com/tt-a1i/archify/tree/main/integrations/deepseek-harness · audited in 4.4s
# 安装前体检 / Pre-install audit: @tt-a1i/archify-dsh@0.2.0

**信任评级 / Trust grade: A** (评分 / score 98/100 — 没有值得注意的风险信号 / no meaningful risk signals)

- 来源 / Source: `https://codeload.github.com/tt-a1i/archify/tar.gz/HEAD` (URL / url)
- 已分析文件：21 个（71.6 KiB） / Files analysed: 21 (71.6 KiB)
- 内容摘要 / Content digest: `fb2363951c8d26395573f16acef9e964…`
- 体检时间 / Audited at: 2026-09-20T09:51:29.993Z

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `package.json`, `package/package.json`, `SKILL.md`, `committed.zip`, `.tgz`, `archify/package.json`, `.js`, `\n`, `/`, `untracked-dirty.mjs`, `lib/untracked-dirty.mjs`, `release.json` （另有 9 项） / (+9 more)
- **写入的文件路径 / File paths written:** `committed.zip`, `cordis.patch.yml`, `README.md`, `\n${dirtyMarker}\n`, `lib/index.js`, `// ${dirtyMarker}\n`, `lib/untracked-dirty.mjs`, `// ${marker}\n`
- **派生的命令 / Commands spawned:** `node:child_process`, `git`, `clone`, `--shared`, `--no-checkout`, `--`, `show`, `${head}:integrations/deepseek-harness/${relative}`, `--out`, `--json`, `utf8`, `tar` （另有 10 项） / (+10 more)
- **连接的域名 / Domains contacted:** `github.com`
- **读取的环境变量 / Environment variables read:** `process.env (every variable)`, `ARCHIFY_DSH_PROBE_OUT`

## 发现 / Findings

### 低 / LOW (1)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `scripts/distribution-acceptance.mjs:271` — `const bundles = profileManifest.dsh?.profile?.bundles || [];`
  - `scripts/distribution-acceptance.mjs:385` — `if ((removedManifest.dsh?.profile?.bundles || []).includes(PACKAGE_NAME)`
  - `scripts/distribution-acceptance.mjs:389` — `pass('uninstall', { bundles: removedManifest.dsh?.profile?.bundles || [] });`
  - `scripts/distribution-acceptance.mjs:399` — `pass('base-profile', { bundles: removedManifest.dsh?.profile?.bundles || [] });`
  - ……另有 3 处 / … and 3 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.

## 扫描说明 / Scan notes

- scoped to the subdirectory `integrations/deepseek-harness/`
- stripped the archive's single top-level directory `archify-HEAD/`
- outbound fetching was permitted for this audit

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
