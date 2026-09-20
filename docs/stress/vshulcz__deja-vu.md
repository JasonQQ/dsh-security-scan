> 批量压测 / Batch stress test · ★ 871 · `vshulcz/deja-vu#extensions/dsh`
> https://github.com/vshulcz/deja-vu/tree/main/extensions/dsh · audited in 1.5s
# 安装前体检 / Pre-install audit: dsh-deja@0.20.9

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

- 来源 / Source: `https://codeload.github.com/vshulcz/deja-vu/tar.gz/HEAD` (URL / url)
- 已分析文件：8 个（36.4 KiB） / Files analysed: 8 (36.4 KiB)
- 内容摘要 / Content digest: `484fe1a5c1c7d4bc6eab211da9ba3c89…`
- 体检时间 / Audited at: 2026-09-20T09:52:32.821Z

## 最严重的风险 / Most severe risk

**把下载内容直接管道给 shell / Pipes a download straight into a shell** `priv.curl-pipe-shell`

中 它以超出任务所需的权限运行，因此它一旦出错，后果也更大。
EN It runs with more privilege than the task needs, so a mistake in it is larger than it should be.

该包会访问的目标：`raw.githubusercontent.com`、`github.com`、`vshulcz.github.io` / Destinations this package reaches: `raw.githubusercontent.com`, `github.com`, `vshulcz.github.io`

决定该评级的规则命中于 `index.js:79`；完整列表见下方「发现」。 / The rule that decided the grade fired at `index.js:79`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `../index.js`, `../cordis.patch.yml`, `../package.json`, `../${file}`
- **写入的文件路径 / File paths written:** `plugins/deja`, `// installed by deja\n`
- **派生的命令 / Commands spawned:** `node:child_process`, `version`
- **连接的域名 / Domains contacted:** `raw.githubusercontent.com`, `github.com`, `vshulcz.github.io`
- **读取的环境变量 / Environment variables read:** `DEJA_BIN`, `DSH_HOME`

## 发现 / Findings

### 严重 / CRITICAL (1)

- **严重 / CRITICAL** `priv.curl-pipe-shell` — 把下载内容直接管道给 shell / Pipes a download straight into a shell
  中 一步完成“拉取脚本并执行”，运行的就是远端服务器当时返回的任何内容；既没有可计算哈希、可审查、可固定版本的产物，服务器一旦被攻破就等于这台机器被攻破。
  EN Fetching a script and executing it in one step runs whatever the remote server returns at that moment; there is no artifact to hash, review or pin, and a compromise of the server becomes a compromise of this machine.
  - `index.js:79` — `curl -fsSL https://raw.githubusercontent.com/vshulcz/deja-vu/main/install.sh | sh`
  中 修复：先下载产物、校验其校验和，再执行校验通过的文件；绝不要把下载内容管道给解释器。
  EN Fix: Download the artifact, verify its checksum, and execute the verified file; never pipe a download into an interpreter.

## 扫描说明 / Scan notes

- scoped to the subdirectory `extensions/dsh/`
- stripped the archive's single top-level directory `deja-vu-HEAD/`
- outbound fetching was permitted for this audit
- grade forced to D by a critical finding: priv.curl-pipe-shell — Pipes a download straight into a shell
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
