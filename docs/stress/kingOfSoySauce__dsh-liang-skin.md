> 批量压测 / Batch stress test · ★ 204 · `kingOfSoySauce/dsh-liang-skin`
> https://github.com/kingOfSoySauce/dsh-liang-skin · audited in 4.6s
# 安装前体检 / Pre-install audit: dsh-client-liang-intensity-skin@0.1.7

**信任评级 / Trust grade: B** (评分 / score 82/100 — 有轻微信号，建议复核 / minor signals, review recommended)

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/kingOfSoySauce/dsh-liang-skin/tar.gz/HEAD` (URL / url)
- 已分析文件：39 个（1.5 MiB） / Files analysed: 39 (1.5 MiB)
- 内容摘要 / Content digest: `1cdbff9b3a29ea21ccc712261ec0a4bd…`
- 体检时间 / Audited at: 2026-09-20T09:53:37.066Z

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** （无） / (none)
- **写入的文件路径 / File paths written:** （无） / (none)
- **派生的命令 / Commands spawned:** （无） / (none)
- **连接的域名 / Domains contacted:** `www.w3.org`, `registry.npmmirror.com`, `github.com`, `opencollective.com`, `tidelift.com`, `dsh.local`
- **读取的环境变量 / Environment variables read:** `NODE_ENV`

## 发现 / Findings

### 高 / HIGH (1)

- **高 / HIGH** `harness.patch-disable-plugin` — composition patch 会禁用其他插件 / Composition patch disables another plugin
  中 该 patch 删除或禁用了已有的插件条目。应用到 profile 后，它会悄悄关掉另一个组件——通常是安全或策略插件——而用户本意只是添加这一个插件。
  EN The patch removes or disables an existing plugin entry. Applied to a profile it silently turns off another component — commonly a security or policy plugin — while the user only intended to add this one.
  - `lib/client.js.map:4` — `"sourcesContent": ["import {\n useEffect,\n useMemo,\n useRef,\n useState,\n useSyncExternalStore,\n} from \"react\";\nimport type { ClientContext, SnapshotStor…`
  - `lib/client.js.map:4` — `sourcesContentimport {\n useEffect,\n useMemo,\n useRef,\n useState,\n useSyncExternalStore,\n} from \"react\";\nimport type { ClientContext, SnapshotStore } fr…`
  - `lib/client.js.map:4` — `sourcesContent/import {\n useEffect,\n useMemo,\n useRef,\n useState,\n useSyncExternalStore,\n} from \"react\";\nimport type { ClientContext, SnapshotStore } f…`
  中 修复：只提供仅插入本插件的增量 patch，并在 README 中说明会改动哪些条目。
  EN Fix: Ship an additive patch that inserts only this plugin, and explain in the README which entries change.

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `dsh-liang-skin-HEAD/`
- skipped docs/preview.png: 903442 bytes exceeds the 524288-byte per-file cap
- not scanned (binary): assets/portrait-source-v2/bridge-15.webp, assets/portrait-source-v2/bridge-27.webp, assets/portrait-source-v2/level-01.webp, assets/portrait-source-v2/level-03.webp, assets/portrait-source-v2/level-04.webp and 19 more
- outbound fetching was permitted for this audit

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
