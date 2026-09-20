> 批量压测 / Batch stress test · ★ 512 · `omdsh-dev/dsh-at-file`
> https://github.com/omdsh-dev/dsh-at-file · audited in 2.4s
# 安装前体检 / Pre-install audit: dsh-at-file@0.7.0

**信任评级 / Trust grade: C** (评分 / score 66/100 — 有值得注意的风险信号，确认后再安装 / notable risk signals, install only with intent)

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/omdsh-dev/dsh-at-file/tar.gz/HEAD` (URL / url)
- 已分析文件：77 个（1014.4 KiB） / Files analysed: 77 (1014.4 KiB)
- 内容摘要 / Content digest: `38a904f7da87be836d36546703539e4e…`
- 体检时间 / Audited at: 2026-09-20T09:52:52.617Z

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `lib/client.js`
- **写入的文件路径 / File paths written:** `node:fs/promises`, `src/client`, `node_modules/pkg`, `.git`, `.git/objects`, `README.md`, `index.ts`, `src/index.ts`, `view.ts`, `src/client/view.ts`, `ignored.ts`, `node_modules/pkg/ignored.ts` （另有 23 项） / (+23 more)
- **派生的命令 / Commands spawned:** `node:child_process`, `node_modules/.bin/tsc`, `-p`, `tsconfig.json`, `inherit`, `mkfifo`
- **连接的域名 / Domains contacted:** （无） / (none)
- **读取的环境变量 / Environment variables read:** （无） / (none)

## 发现 / Findings

### 高 / HIGH (1)

- **高 / HIGH** `supply.url-dependency` — 依赖解析到 URL、git 引用或文件路径 / Dependency resolves to a URL, git ref or file path
  中 依赖不是从仓库解析，而是来自 URL、git 引用、本地路径或 patch，因此其内容不受仓库锁文件和任何完整性元数据约束，可以在版本号不变的情况下被替换。
  EN A dependency is resolved from a URL, a git reference, a local path or a patch instead of the registry, so its contents are not covered by the registry lockfile or by any integrity metadata and can change without a version bump.
  - `package.json:122` — `"@deepseek-ai/cordis": "link:../deepseek-harness/vendor/cordis",`
  - `package.json:123` — `"@deepseek-ai/dsh-agent": "link:../deepseek-harness/packages/core/agent",`
  - `package.json:124` — `"@deepseek-ai/dsh-typert-protocol": "link:../deepseek-harness/packages/typert/protocol",`
  - `package.json:125` — `"@deepseek-ai/dsh-invariants": "link:../deepseek-harness/packages/runtime-diagnostics/invariants",`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：改为依赖仓库中已发布的版本，并用锁文件固定；如果确实必须用 fork，就把它发布到自己名下的 scope。
  EN Fix: Depend on a published version from the registry, pinned by a lockfile; if a fork is unavoidable, publish it under your own scope.

### 中 / MEDIUM (2)

- **中 / MEDIUM** `supply.unpinned-range` — 依赖版本范围未固定 / Dependency range is unpinned
  中 该依赖接受任意版本（`*`、`x` 或 `latest`），明天安装到的就是仓库当时提供的代码，而经过审计的版本对它毫无保证。
  EN The dependency accepts any version (`*`, `x` or `latest`), so the code that installs tomorrow is whatever the registry serves then, and the audited version says nothing about it.
  - `package.json:52` — `"@deepseek-ai/dsh-agent": "*",`
  - `package.json:53` — `"@deepseek-ai/dsh-typert-protocol": "*",`
  - `package.json:54` — `"@deepseek-ai/dsh-client-runtime": "*",`
  - `package.json:55` — `"@deepseek-ai/dsh-client-store": "*",`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：固定 semver 范围并提交锁文件，使安装解析到的正是被审查过的那些版本。
  EN Fix: Pin a semver range and commit a lockfile so an install resolves to the versions that were reviewed.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 3 shipped file(s) are 64 KiB or larger and were not read as text, the largest being assets/screenshots/file-mention-settings.png at 297 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `assets/screenshots/file-mention-settings.png` — `304490 bytes not decoded as text`
  - `pnpm-lock.yaml:826` — `undici-types@7.18.2:`
  - `pnpm-lock.yaml:829` — `undici@7.29.0:`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (1)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `src/client/icons.tsx:28` — `if (DATA_EXTENSIONS.has(extension) || basename === '.env' || basename.startsWith('.env.')) return 'data'`
  - `tests/icons.spec.tsx:22` — `[entry('.env'), 'data'],`
  - `tests/icons.spec.tsx:23` — `[entry('.env.local'), 'data'],`
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.

_按类别 / By category:_ 供应链 / supply chain 3 · 凭据读取 / credential access 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `dsh-at-file-HEAD/`
- skipped lib/client.js: 614019 bytes exceeds the 524288-byte per-file cap
- skipped lib/client.js.map: 1102055 bytes exceeds the 524288-byte per-file cap
- skipped lib/index.js: 598561 bytes exceeds the 524288-byte per-file cap
- skipped lib/index.js.map: 1087576 bytes exceeds the 524288-byte per-file cap
- not scanned (binary, contents unreadable as text): assets/screenshots/file-mention-composer.png, assets/screenshots/file-mention-settings.png, assets/screenshots/workspace-path-picker.png
- outbound fetching was permitted for this audit

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
