> 批量压测 / Batch stress test · ★ 1216 · `GanyuanRan/Aegis`
> https://github.com/GanyuanRan/Aegis · audited in 1.8s
# 安装前体检 / Pre-install audit: aegis@2.10.6

**信任评级 / Trust grade: D** (评分 / score 12/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/GanyuanRan/Aegis/tar.gz/HEAD` (URL / url)
- 已分析文件：535 个（3.9 MiB） / Files analysed: 535 (3.9 MiB)
- 内容摘要 / Content digest: `e67933e66a6123716d243a7b20685136…`
- 体检时间 / Audited at: 2026-09-20T09:52:14.791Z

## 最严重的风险 / Most severe risk

**文档中包含针对模型的指令 / Documentation contains instructions aimed at a model** `prompt.doc-instruction`

中 它夹带了写给 agent 而不是写给人看的文字——试图在你不察觉的情况下改变 agent 行为的指令。
EN It carries text aimed at the agent rather than at a person — instructions that try to change what the agent does without telling you.

该包会访问的目标：`github.com`、`discord.gg`、`www.w3.org`、`code.claude.com`、`nightly-reports-archive`、`nightly-reports-archivekeep_last`、`drift.invalid`、`example.invalid` / Destinations this package reaches: `github.com`, `discord.gg`, `www.w3.org`, `code.claude.com`, `nightly-reports-archive`, `nightly-reports-archivekeep_last`, `drift.invalid`, `example.invalid`

- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 它还安排了之后继续运行，所以仅仅卸载这个包并不够。
  EN It also arranges to run again later, so removing the package is not enough on its own.
- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `docs/current/AEGIS_AGENTIC_BENCHMARK_BASELINE.md:530`；完整列表见下方「发现」。 / The rule that decided the grade fired at `docs/current/AEGIS_AGENTIC_BENCHMARK_BASELINE.md:530`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `package.json`, `SKILL.md`, `skills/using-aegis/SKILL.md`, `\n`, `release.json`
- **写入的文件路径 / File paths written:** `\n`, `.config`, `.config/aegis`, `transient.txt`, `source.py`, `other.py`, `check.py`, `.tmp`, `baseline-no-aegis/workspace/notes.txt`, `.codex`, `isolated/home`, `package.json` （另有 4 项） / (+4 more)
- **派生的命令 / Commands spawned:** `node:child_process`, `git`, `ls-remote`, `HEAD`
- **连接的域名 / Domains contacted:** `github.com`, `discord.gg`, `www.w3.org`, `code.claude.com`, `nightly-reports-archive`, `nightly-reports-archivekeep_last`, `drift.invalid`, `example.invalid`, `docs.github.com`, `docs.qoder.com`, `github`, `moonshotai.github.io` （另有 20 项） / (+20 more)
- **读取的环境变量 / Environment variables read:** `HOME`, `USERPROFILE`, `AEGIS_ACTIVATION_MODE`, `AEGIS_TDD_MODE`, `AEGIS_METHOD_PACK_ROOT`, `OPENCODE_CONFIG_DIR`, `AEGIS_PLUGIN_FILE`, `TEST_HOME`, `SHARED_CORE`, `USING_AEGIS_SKILL`

## 发现 / Findings

### 高 / HIGH (4)

- **高 / HIGH** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 31 distinct remote hosts (code.claude.com, discord.gg, drift.invalid, example.invalid, github.com, nightly-reports-archive, nightly-reports-archivekeep_last, www.w3.org, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `.claude-plugin/plugin.json:8` — `https://github.com/GanyuanRan/Aegis`
  - `.github/ISSUE_TEMPLATE/config.yml:4` — `https://discord.gg/35wsABTejz`
  - `.opencode/plugins/aegis.js:309` — `https://github.com/GanyuanRan/Aegis.git`
  - `assets/aegis-small.svg:1` — `http://www.w3.org/2000/svg`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **高 / HIGH** `priv.sudo-invocation` — 通过 sudo 提权 / Escalates with sudo
  中 该行通过 `sudo` 执行命令，意味着这个以用户级工具身份安装的插件在索要 root 权限，而用户事先看不到提权提示。
  EN The line runs a command through `sudo`, so the plugin is asking for root on a machine where it was installed as a user-level tool and where the user cannot see the escalation prompt in advance.
  - `.github/workflows/ci.yml:25` — `sudo apt-get update`
  - `.github/workflows/ci.yml:26` — `sudo apt-get install --yes bubblewrap`
  中 修复：去掉提权，把任何需要特权的步骤写成一条由用户主动执行的独立命令并加以说明。
  EN Fix: Remove the escalation and document any privileged step as a separate command the user runs deliberately.
- **高 / HIGH** `prompt.doc-instruction` — 文档中包含针对模型的指令 / Documentation contains instructions aimed at a model
  中 随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。
  EN A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.
  - `docs/current/AEGIS_AGENTIC_BENCHMARK_BASELINE.md:530` — `Legacy Landlock, `danger-full-access`, sandbox bypass and dual-path fallbacks`
  - `docs/current/AEGIS_HOST_COMPATIBILITY_MATRIX_SNAPSHOT.md:58` — `| `OMP (Oh My Pi)` | Agent Skills `agents` provider (`~/.agents/skills/`), `alwaysApply` frontmatter, and extension loading support structural exposure; no curr…`
  - `docs/current/AEGIS_KNOWN_LIMITATIONS.md:471` — `the system prompt), which Aegis now uses for `using-aegis`.`
  - `docs/current/AEGIS_PROCESS_BASELINE.md:1086` — `preventing medium/high-complexity tasks from bypassing planning, and confirm`
  - ……另有 22 处 / … and 22 more location(s)
  中 修复：把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。
  EN Fix: Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.
- **高 / HIGH** `prompt.embedded-instruction-string` — 源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model
  中 源码中的字符串字面量——通常是工具描述或系统提示词片段——要求模型绕过确认或对用户隐瞒某些事，于是它作为一条指令进入上下文窗口。
  EN A string literal in the source — typically a tool description or system prompt fragment — tells the model to bypass confirmation or to hide something from the user, so it lands in the context window as a directive.
  - `tests/e2e/agentic-benchmark-check.sh:466` — `'Legacy Landlock, `danger-full-access`, sandbox bypass and dual-path'`
  - `tests/e2e/governance-completion-contract-check.sh:78` — `"verification gate prevents small changes from bypassing dual-track closure"`
  中 修复：如实描述工具的行为，删除那些会改变 agent 对待用户方式的指令。
  EN Fix: Describe the tool's behavior factually and remove directives that change how the agent treats the user.

### 低 / LOW (5)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `tests/deepseek-harness/run-tests.sh:64` — `const bundles = manifest.dsh?.profile?.bundles ?? []`
  - `tests/e2e/agentic-benchmark-check.sh:806` — `value = os.environ.get(key)`
  - `tests/e2e/agentic-benchmark-isolation-check.sh:64` — `if os.environ.get(key):`
  - `tests/e2e/agentic-benchmark-isolation-check.sh:65` — `assert os.environ[key] not in serialized`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `tests/opencode/test-plugin-loading.sh:170` — `await after({ tool: 'bash', sessionID: 's1', callID: 'c1', args: {} }, out);`
  - `tests/opencode/test-plugin-loading.sh:175` — `await after({ tool: 'edit', sessionID: 's1', callID: 'c2', args: {} }, out);`
  - `tests/opencode/test-plugin-loading.sh:181` — `await after({ tool: 'bash', sessionID: 's2', callID: 'c1', args: {} }, out);`
  - `tests/opencode/test-plugin-loading.sh:186` — `await after({ tool: 'read', sessionID: 's3', callID: 'c1', args: {} }, out);`
  - ……另有 5 处 / … and 5 more location(s)
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.
- **低 / LOW** `harness.settings-widen-permission` — 放宽宿主的沙箱或审批策略 / Widens the harness sandbox or approval policy
  中 该行在宿主设置、profile 或 composition patch 中写入了宽松的沙箱或权限值。放宽策略会移除用户为所有插件——而不只是这一个插件——设定的文件与命令边界。
  EN The line sets a permissive sandbox or permission value in the harness settings, a profile or a composition patch. Widening the policy removes the file and command boundaries the user chose for every plugin, not just for this one.
  - `tests/explicit-skill-requests/run-claude-describes-sdd.sh:42` — `--dangerously-skip-permissions \`
  - `tests/explicit-skill-requests/run-claude-describes-sdd.sh:55` — `--dangerously-skip-permissions \`
  - `tests/explicit-skill-requests/run-extended-multiturn-test.sh:28` — `--dangerously-skip-permissions \`
  - `tests/explicit-skill-requests/run-extended-multiturn-test.sh:39` — `--dangerously-skip-permissions \`
  - ……另有 12 处 / … and 12 more location(s)
  中 修复：沙箱与审批设置交给用户决定；插件若需要某项能力，应加以说明并由用户显式授予。
  EN Fix: Leave sandbox and approval settings to the user; if the plugin needs a capability, document it and let the user grant it explicitly.
- **低 / LOW** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `tests/e2e/agentic-benchmark-isolation-check.sh:75` — `from agentic_benchmark_isolation import (`
  - `tests/opencode/test-plugin-loading.sh:107` — `const module = await import(pathToFileURL(pluginPath).href);`
  - `tests/opencode/test-plugin-loading.sh:155` — `const module = await import(pathToFileURL(pluginPath).href);`
  - `tests/opencode/test-plugin-loading.sh:206` — `const module = await import(pathToFileURL(pluginPath).href);`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.
- **低 / LOW** `persist.global-self-install` — 全局安装依赖包 / Installs a package globally
  中 该命令把包安装到全局前缀，于是用户的 PATH 上多出一个可执行文件，而且当前项目删除后它仍然留在那里。
  EN The command installs a package into the global prefix, which puts a new executable on the user's PATH and keeps it there after the current project is deleted.
  - `tests/e2e/pi-host-boundary-check.sh:130` — `npm install -g`
  中 修复：改为本地安装，并通过项目自身的脚本调用该工具；全局安装应由用户自己决定，而不是由插件代劳。
  EN Fix: Install locally and invoke the tool through the project's own scripts; global installs belong to the user's decision, not to a plugin.

_按类别 / By category:_ 提示注入 / prompt injection 2 · 滥用宿主环境 / harness abuse 2 · 网络回调 / network callbacks 1 · 提权 / privilege 1 · 凭据读取 / credential access 1 · 混淆 / obfuscation 1 · 持久化 / persistence 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `Aegis-HEAD/`
- skipped assets/aegis-hero.png: 1944238 bytes exceeds the 524288-byte per-file cap
- not scanned (binary, contents unreadable as text): assets/aegis-qrcode.jpg, assets/app-icon.png
- outbound fetching was permitted for this audit
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
