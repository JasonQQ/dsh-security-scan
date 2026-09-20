> 批量压测 / Batch stress test · ★ 4202 · `dsh-market/dsh-market`
> https://github.com/dsh-market/dsh-market · audited in 2.3s
# 安装前体检 / Pre-install audit: dshmarket@1.50.0

**信任评级 / Trust grade: D** (评分 / score 0/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/dsh-market/dsh-market/tar.gz/HEAD` (URL / url)
- 已分析文件：220 个（6.4 MiB） / Files analysed: 220 (6.4 MiB)
- 内容摘要 / Content digest: `1f97a8785e1093d67794dafb6cc4e392…`
- 体检时间 / Audited at: 2026-09-20T09:51:45.649Z

## 最严重的风险 / Most severe risk

**源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model** `prompt.embedded-instruction-string`

中 它夹带了写给 agent 而不是写给人看的文字——试图在你不察觉的情况下改变 agent 行为的指令。
EN It carries text aimed at the agent rather than at a person — instructions that try to change what the agent does without telling you.

该包会访问的目标：`github.com`、`awesome-dsh-plugin.com`、`registry.npmjs.org`、`www.npmjs.com`、`www.w3.org`、`opencollective.com`、`tidelift.com`、`dshmarket.com` / Destinations this package reaches: `github.com`, `awesome-dsh-plugin.com`, `registry.npmjs.org`, `www.npmjs.com`, `www.w3.org`, `opencollective.com`, `tidelift.com`, `dshmarket.com`

- 中 它发生在安装时：`prepare` 脚本会执行它，你不需要自己运行任何东西。
  EN It happens at install time: the `prepare` script runs it, so you do not have to run anything yourself.
- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 它还安排了之后继续运行，所以仅仅卸载这个包并不够。
  EN It also arranges to run again later, so removing the package is not enough on its own.
- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `src/dsh-cli.ts:802`；完整列表见下方「发现」。 / The rule that decided the grade fired at `src/dsh-cli.ts:802`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

- `prepare` (`package.json`): `npm run build`

发布期钩子（维护者打包或发布时运行，安装时不会执行）： / Publish-time hooks (run when the maintainer packs or publishes, not on install):

- `prepack`: `npm run build && node scripts/preflight.mjs`

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `site/assets`, `site/assets/${f}`, `${OUT}/assets/${f}`, `robots.txt`, `ads.txt`, `site/${f}`, `${OUT}/${f}`, `site/browse-template.html`, `site/plugin-template.html`, `package.json`, `.github`, `ci.yml` （另有 57 项） / (+57 more)
- **写入的文件路径 / File paths written:** `${OUT}/assets`, `site/assets/${f}`, `${OUT}/assets/${f}`, `robots.txt`, `ads.txt`, `site/${f}`, `${OUT}/${f}`, `index.html`, `/`, `${OUT}/index.html`, `${OUT}/sitemap.xml`, `1.0` （另有 133 项） / (+133 more)
- **派生的命令 / Commands spawned:** `node:child_process`, `cmd.exe`, `/d`, `/s`, `/c`, `"${command}"`, `${command}`, `ignore`, `"${cmdCommandLine([file, ...args])}"`, `${cmdCommandLine([file, ...args])}`, `taskkill`, `/pid` （另有 20 项） / (+20 more)
- **连接的域名 / Domains contacted:** `github.com`, `awesome-dsh-plugin.com`, `registry.npmjs.org`, `www.npmjs.com`, `www.w3.org`, `opencollective.com`, `tidelift.com`, `dshmarket.com`, `pagead2.googlesyndication.com`, `schema.org`, `www.sitemaps.org`, `127.0.0.1` （另有 96 项） / (+96 more)
- **读取的环境变量 / Environment variables read:** `ADSENSE_CLIENT`, `ComSpec`, `DSHM_REGISTRY_URL`, `process.env (every variable)`, `DSHM_UPDATES_ORIGIN`, `PATH`, `DSH_MARKET_INSTALL_TIMEOUT_MS`, `PATHEXT`, `DSH_MARKET_HOT_MOUNT_TIMEOUT_MS`, `https_proxy`, `HTTPS_PROXY`, `npm_config_https_proxy` （另有 14 项） / (+14 more)

## 发现 / Findings

### 高 / HIGH (6)

- **高 / HIGH** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 102 distinct remote hosts (awesome-dsh-plugin.com, dshmarket.com, github.com, opencollective.com, registry.npmjs.org, tidelift.com, www.npmjs.com, www.w3.org, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `.github/ISSUE_TEMPLATE/config.yml:4` — `https://github.com/awesome-dsh-plugin/awesome-dsh-plugin`
  - `.github/ISSUE_TEMPLATE/feature_request.yml:8` — `https://github.com/dsh-market/dsh-market/issues?q=is%3Aissue+is%3Aopen+label%3Aroadmap`
  - `.github/workflows/build-site.yml:52` — `https://awesome-dsh-plugin.com/plugins.json`
  - `.github/workflows/release.yml:49` — `https://registry.npmjs.org`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `scripts/restart-smoke.mjs:6` — `function request(remoteAddress, origin = 'http://127.0.0.1:3080', host = '127.0.0.1:3080') {`
  - `scripts/restart-smoke.mjs:10` — `assert.equal(trustedRestartRequest(request('127.0.0.1')), true)`
  - `scripts/restart-smoke.mjs:12` — `assert.equal(trustedRestartRequest(request('::ffff:127.0.0.1')), true)`
  - `scripts/restart-smoke.mjs:13` — `assert.equal(trustedRestartRequest(request('192.168.1.2')), false)`
  - ……另有 31 处 / … and 31 more location(s)
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **高 / HIGH** `obf.dynamic-require` — require 或 import 了动态计算的模块路径 / Requires or imports a computed module path
  中 模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。
  EN The module path is computed rather than written literally, so the package that actually gets loaded is decided at runtime and cannot be checked by reading the imports.
  - `src/hot.ts:122` — `const mod = (await import(specifier)) as {`
  - `src/hot.ts:125` — `import(name: string, getOuterStack?: () => string[]): unknown`
  - `src/hot.ts:133` — `override import(name: string, getOuterStack?: () => string[]): unknown {`
  - `src/hot.ts:135` — `return super.import(name, getOuterStack)`
  - ……另有 3 处 / … and 3 more location(s)
  中 修复：使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。
  EN Fix: Use a static import specifier, or an explicit table mapping known keys to static imports.
- **高 / HIGH** `persist.global-self-install` — 全局安装依赖包 / Installs a package globally
  中 该命令把包安装到全局前缀，于是用户的 PATH 上多出一个可执行文件，而且当前项目删除后它仍然留在那里。
  EN The command installs a package into the global prefix, which puts a new executable on the user's PATH and keeps it there after the current project is deleted.
  - `.github/workflows/ci.yml:136` — `npm install -g`
  - `.github/workflows/release.yml:54` — `npm install -g`
  - `src/dsh-cli.ts:777` — `npm i -g pnpm --force / A pnpm executable already exists (usually a corepack shim), so npm refused to overwrite it. Run one of these in a terminal: `corepack prepare pnpm@latest --activate` (preferred — activates the shim already there) or …`
  - `src/dsh-cli.ts:780` — `npm i -g pnpm，或改用无需写系统目录的安装方式：macOS/Linux 用 brew install pnpm，Windows 用 iwr https://get.pnpm.io/install.ps1 -useb | iex / No permission to write into the Node install directory. Run `npm i -g`
  - ……另有 3 处 / … and 3 more location(s)
  中 修复：改为本地安装，并通过项目自身的脚本调用该工具；全局安装应由用户自己决定，而不是由插件代劳。
  EN Fix: Install locally and invoke the tool through the project's own scripts; global installs belong to the user's decision, not to a plugin.
- **高 / HIGH** `persist.persistence-with-install-hook` — 安装钩子叠加持久化机制 / Install hook combined with a persistence mechanism
  中 生命周期钩子在安装期间运行，而目录树中又有东西把自己注册为稍后运行。这一组合会在用户以为只是一次普通依赖安装的过程中装入一个常驻组件。
  EN A lifecycle hook runs during install and something in the tree registers itself to run later. The combination installs a resident component during what the user believed was a normal dependency install.
  - `src/check.ts:1009` — `? manifest.dsh.profile.bundles.filter((name): name is string => typeof name === 'string')`
  - `src/order.ts:69` — `? manifest.dsh.profile.bundles.filter((name): name is string => typeof name === 'string')`
  - `src/profile.ts:232` — `manifest.dsh!.profile!.bundles = bundles.filter(bundle => bundle !== name)`
  - `package.json:31` — `"prepare": "npm run build",`
  中 修复：删除这一定时注册。任何需要持续运行的东西，都应由用户作为一个明确可见的步骤来设置。
  EN Fix: Remove the scheduling. Anything that should keep running must be set up by the user as a deliberate, visible step.
- **高 / HIGH** `prompt.embedded-instruction-string` — 源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model
  中 源码中的字符串字面量——通常是工具描述或系统提示词片段——要求模型绕过确认或对用户隐瞒某些事，于是它作为一条指令进入上下文窗口。
  EN A string literal in the source — typically a tool description or system prompt fragment — tells the model to bypass confirmation or to hide something from the user, so it lands in the context window as a directive.
  - `src/dsh-cli.ts:802` — ``找到 pnpm 了，但运行 \`pnpm --version\` 失败——所以问题不在路径上，设 PNPM_HOME 没有用。最常见的原因是 corepack 的 shim 需要联网下载 pnpm 本体，而这台机器下不到。请在终端执行一次 \`pnpm --version\`：如果同样失败，按它的提示修（受限网络可用…`
  - `src/pnpm-compat.ts:317` — `'这个 profile 里有一个刚发布不久的插件版本，pnpm 的安全等待期检查因此拒绝了本次改动（即使改的是别的插件）。市场已自动放行重试一次；若仍看到本条，请导出日志反馈 / a recently-published plugin version in this profile trips pnpm\'s fres…`
  - `tests/flows.spec.ts:1146` — `'keeps a minimumReleaseAge the profile set on purpose: no bypass, the mature version installs, and it is logged (#594)'`
  中 修复：如实描述工具的行为，删除那些会改变 agent 对待用户方式的指令。
  EN Fix: Describe the tool's behavior factually and remove directives that change how the agent treats the user.

### 中 / MEDIUM (5)

- **中 / MEDIUM** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `src/client/index.ts:193` — `name: 'shell.overlay',`
  - `src/snapshot.ts:486` — `mkdirSync(dirname(write.target), { recursive: true })`
  - `src/snapshot.ts:498` — `mkdirSync(dirname(write.target), { recursive: true })`
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `scripts/build-site.mjs:525` — `http://www.sitemaps.org/schemas/sitemap/0.9`
  - `scripts/restart-smoke.mjs:6` — `http://127.0.0.1:3080`
  - `scripts/restart-smoke.mjs:11` — `http://localhost:3080localhost:3080`
  - `scripts/restart-smoke.mjs:14` — `http://evil.example`
  - ……另有 46 处 / … and 46 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `persist.shell-rc-append` — 追加写入 shell 启动文件 / Appends to a shell startup file
  中 该行写入了 `.bashrc`、`.zshrc`、`.profile` 或 fish 配置，因此改动会在之后每个交互式 shell 中生效，而且删掉包目录也不会消失。
  EN The line writes into `.bashrc`, `.zshrc`, `.profile` or a fish config, so the change takes effect in every future interactive shell and survives removing the package directory.
  - `src/check.ts:1009` — `? manifest.dsh.profile.bundles.filter((name): name is string => typeof name === 'string')`
  - `src/order.ts:69` — `? manifest.dsh.profile.bundles.filter((name): name is string => typeof name === 'string')`
  - `src/profile.ts:232` — `manifest.dsh!.profile!.bundles = bundles.filter(bundle => bundle !== name)`
  - `src/routes.ts:1789` — `name => readInstalledVersion(config.profile, name, activeProfileDir) !== null,`
  - ……另有 5 处 / … and 5 more location(s)
  中 修复：不要修改 shell 启动文件；如果需要 shell 集成，就把那行内容打印出来，由用户自行决定是否添加。
  EN Fix: Do not modify shell startup files; if a shell integration is required, print the line for the user to add deliberately.
- **中 / MEDIUM** `priv.package-manager-config-write` — 改写包管理器或全局 git 配置 / Rewrites a package manager or global git configuration
  中 该行执行了 `npm config set` 或 `git config --global`，这会改变用户之后每条命令的配置——包括依赖从哪个仓库拉取，以及 git 调用哪个程序作为钩子。
  EN The line runs `npm config set` or `git config --global`, which changes settings for every future command the user runs — including which registry packages come from and which program git calls for hooks.
  - `scripts/smoke-spawn.mjs:43` — `console.error(`smoke failed on ${process.platform}: spawn pnpm --version did not exit 0 (is pnpm set up in CI?)`)`
  中 修复：用环境变量或命令行参数为单条命令传配置，而不是写入用户的持久化配置。
  EN Fix: Pass configuration per command with environment variables or flags instead of writing the user's persistent config.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 11 shipped file(s) are 64 KiB or larger and were not read as text, the largest being assets/themes-zh.png at 435 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `assets/themes-zh.png` — `445703 bytes not decoded as text`
  - `package-lock.json:13` — `"undici": "^7.29.0"`
  - `package-lock.json:1892` — `"undici-types": "~8.3.0"`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (11)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `src/backup.ts:26` — `export const SECRET_FILE_HINTS = /(^|\/)(config\.toml|\.env(\.\w+)?|secrets?\.\w+t?j?s?o?n|pnpm-workspace\.yaml)$/i`
  - `src/backup.ts:60` — `if (entry.isDirectory()) files.push(...profileFiles(root, path))`
  - `src/backup.ts:102` — `const profileBlock = dsh?.profile === null || typeof dsh?.profile !== 'object' || Array.isArray(dsh?.profile)`
  - `src/backup.ts:104` — `: dsh.profile as { bundles?: unknown }`
  - ……另有 83 处 / … and 83 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `cred.many-secret-env-vars` — 读取多个不同名称的密钥类环境变量 / Reads several differently-named secret environment variables
  中 这里的一行、或整个包里的若干行，读取了名称看起来像凭据的环境变量。只读一个文档中声明的 key 是插件本该有的认证方式；枚举多个不同名称的密钥，则是在收集凭据而不是在使用凭据。
  EN One line here, or several across the package, read environment variables whose names look like credentials. Reading a single documented key is how a plugin is meant to authenticate; enumerating many differently-named ones is how credentials are gathered rather than used.
  - `tests/gist.spec.ts:67` — `process.env.DSH_GITHUB_TOKEN`
  - `tests/gist.spec.ts:90` — `process.env.DSH_GITHUB_TOKEN`
  - `tests/gist.spec.ts:97` — `process.env.DSH_GITHUB_TOKEN`
  - `tests/gist.spec.ts:291` — `process.env.DSH_GITHUB_TOKEN`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：只保留插件确实需要且有文档说明的变量，删掉与任何功能无关的密钥读取。
  EN Fix: Keep to the variables this plugin documents and needs, and delete reads of keys it has no feature for.
- **低 / LOW** `cred.read-dotenv-or-history` — 读取 dotenv 文件或 shell 历史 / Reads a dotenv file or shell history
  中 该行读取了 `.env` 或 shell 历史文件。这两处都是令牌、云密钥和曾经粘贴过的密钥堆积的地方，而 shell 历史还会勾勒出用户的基础设施全貌。
  EN This line reads `.env` or a shell history file. Both are where tokens, cloud keys and previously pasted secrets accumulate, and a shell history also maps out the user's infrastructure.
  - `tests/flows.spec.ts:140` — `return JSON.parse(readFileSync(join(fake.profileDir, 'package.json'), 'utf8'))`
  - `tests/flows.spec.ts:1142` — `const installed = JSON.parse(readFileSync(join(fake.profileDir, 'node_modules', 'dsh-loop', 'package.json'), 'utf8')) as { version?: string }`
  - `tests/flows.spec.ts:1167` — `const installed = JSON.parse(readFileSync(join(fake.profileDir, 'node_modules', 'dsh-loop', 'package.json'), 'utf8')) as { version?: string }`
  - `tests/flows.spec.ts:1249` — `const installed = JSON.parse(readFileSync(join(fake.profileDir, 'node_modules', 'dsh-loop', 'package.json'), 'utf8')) as { version?: string }`
  - ……另有 2 处 / … and 2 more location(s)
  中 修复：通过插件配置 schema 加载配置，而不是读取 dotenv 文件；永远不要打开用户的历史记录。
  EN Fix: Load configuration through the plugin config schema instead of reading dotenv files, and never open the user's history.
- **低 / LOW** `destructive.recursive-delete-system-path` — 递归删除指向用户主目录或系统目录 / Recursive delete aimed at a home or system directory
  中 递归删除的目标是用户主目录或系统路径，一旦变量写错、展开为空或缺少判空保护，被销毁的就是用户数据而不是包自己的构建产物。
  EN A recursive delete targets a home directory or a system path, so a wrong variable, an empty expansion or a missing guard destroys user data instead of the package's own build output.
  - `tests/dsh-cli.spec.ts:243` — `'dsh; rm -rf /',`
  中 修复：只删除包在自己目录下创建的路径，并在解析出的路径不位于该目录内时拒绝执行。
  EN Fix: Delete only paths the package created under its own directory, and refuse to run when the resolved path is not inside it.
- **低 / LOW** `destructive.shipped-command` — 内置破坏性文件系统命令 / Ships a destructive filesystem command
  中 抹掉用户主目录、根文件系统或分区的命令出现在可执行内容里，而不是文档描述中。即便有条件判断保护，这种原语也绝不该被塞进插件里。
  EN A command that erases a home directory, a root filesystem or a partition appears in executable content rather than in prose. Even guarded by a condition, it is a primitive that should never travel inside a plugin.
  - `tests/dsh-cli.spec.ts:243` — `'dsh; rm -rf /',`
  中 修复：删除该命令。插件如果必须清理，应把删除限定在它自己创建的目录，并以包根目录为基准解析这个路径。
  EN Fix: Delete the command. If a plugin must clean up, restrict deletion to a directory it created and resolve that path from the package root.
- **低 / LOW** `harness.installed-package-edit` — 改动宿主安装目录或已安装的其他插件 / Touches the harness installation or another installed plugin
  中 该行读写宿主自身的安装目录，或 `node_modules` 下另一个插件的目录。修改已安装的代码会替换掉用户审查过的产物，并可能禁用或劫持任意插件。
  EN The line reads or writes inside the harness's own installation or another plugin's directory under `node_modules`. Editing installed code replaces the artifact the user reviewed and can disable or hijack any plugin.
  - `tests/client/diagnostics-panels.spec.tsx:27` — `patchPath: '/synthetic/node_modules/@deepseek-ai/dsh-base/cordis.patch.yml',`
  - `tests/client/diagnostics.spec.tsx:23` — `patchPath: '/synthetic/node_modules/@deepseek-ai/dsh-base/cordis.patch.yml',`
  - `tests/client/diagnostics.spec.tsx:29` — `patchPath: '/synthetic/node_modules/dsh-market/cordis.patch.yml',`
  - `tests/flows.spec.ts:2518` — `node_modules/dsh-loop/cordis.patch.yml/utf8`
  - ……另有 10 处 / … and 10 more location(s)
  中 修复：绝不在运行时修改已安装的包；把改动提交到上游，或提供一个增量插件。
  EN Fix: Never modify installed packages at runtime; contribute the change upstream or ship an additive plugin.
- **低 / LOW** `net.token-or-blob-in-url` — 把凭据或编码数据块放进 URL / Puts a credential or encoded blob in a URL
  中 令牌形状的查询参数、内嵌的 `user:password` 授权部分，或超长高熵的查询值，都意味着密钥或载荷数据在 URL 中传输，最终会留在访问日志、代理和浏览器历史里。
  EN A token-shaped query parameter, an embedded `user:password` authority, or a long high-entropy query value means secret material or payload data travels in a URL, where it lands in access logs, proxies and browser history.
  - `tests/client/comments-modal.client.spec.tsx:45` — `'/?token=local-host-secret'`
  - `tests/flows.spec.ts:4908` — `'https://«redacted»@mirror.example'`
  - `tests/flows.spec.ts:4909` — `'https://mirror.example/?token=secret'`
  - `tests/registry.spec.ts:352` — `'https://«redacted»@proxy.corp.example:8080'`
  - ……另有 8 处 / … and 8 more location(s)
  中 修复：凭据放在 Authorization 头里发送，载荷用 POST 放在请求体中，不要编码进查询字符串。
  EN Fix: Send credentials in an Authorization header, and POST payloads in the body rather than encoding them into the query string.
- **低 / LOW** `obf.decoded-payload-literal` — 携带解码、转义或高熵字面量 / Carries a decoded, escaped or high-entropy literal
  中 一个很长的字面量会在运行时被解码（base64、`atob`、`unescape`、`decodeURIComponent`），或者写满了密集的十六进制、Unicode 转义，或者呈现出编码数据块那种近乎均匀的字符分布。
  EN A long literal is decoded at runtime (base64, `atob`, `unescape`, `decodeURIComponent`), written with dense hex or unicode escapes, or has the near-uniform character distribution of an encoded blob.
  - `tests/web/scaffold.ts:209` — `const COOKIE_VALUE = /^[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]*$/u`
  中 修复：把该值保存为可读源码，或保存为格式有文档说明的数据，让审查者能看清实际运行的到底是什么。
  EN Fix: Store the value as readable source or as data with a documented format, so a reviewer can see what is actually being run.
- **低 / LOW** `obf.obfuscated-identifier` — 使用混淆的标识符或混用字符集的名称 / Uses obfuscated identifiers or mixed-script names
  中 该行出现了压缩器风格的 `_0x…` 名称，或混用拉丁字母与西里尔、希腊形近字母的标识符。两者都会让试图扫读熟悉名称的人看漏，后者更是经典的仿冒手法。
  EN The line contains minifier-style `_0x…` names or an identifier that mixes Latin letters with Cyrillic or Greek lookalikes. Both defeat a reader scanning for a familiar name and the second is a classic impersonation trick.
  - `tests/dsh-cli.spec.ts:33` — `profileПрофиль`
  - `tests/profile.spec.ts:64` — `profileПрофиль`
  中 修复：发布标识符名称有意义的源码，绝不在同一个标识符里混用不同字符集。
  EN Fix: Ship source with meaningful identifier names, and never mix script systems inside one identifier.
- **低 / LOW** `persist.dsh-settings-rewrite` — 改写 DSH 配置或 profile / Rewrites DSH settings or profiles
  中 该行写入了宿主配置（`~/.dsh/settings.yaml`、profile 或 storages）。改动 profile 会改变此后每次宿主启动时加载哪些插件，以及它们如何配置。
  EN The line writes into the harness configuration (`~/.dsh/settings.yaml`, profiles or storages). Changing the profile changes which plugins load and how they are configured on every future harness start.
  - `tests/patch.spec.ts:391` — `options: { id: 'include', name: 'cordis:include', config: { path: 'file:///home/u/.dsh/profiles/web/cordis.yml' } },`
  - `tests/patch.spec.ts:395` — `expect(findUserPatchPath(host, '/fallback')).toBe('/home/u/.dsh/profiles/web/cordis.patch.yml')`
  - `tests/patch.spec.ts:395` — `/fallback/home/u/.dsh/profiles/web/cordis.patch.yml`
  中 修复：把用户应当应用的配置打印出来，而不是直接写宿主的运行状态。
  EN Fix: Print the configuration the user should apply instead of writing the harness state directly.
- **低 / LOW** `supply.foreign-registry` — 仓库或 scope 覆盖指向 npmjs 之外 / Registry or scope override points away from npmjs
  中 某个 registry 或 `_authToken` 条目指向的服务器并非 npmjs。随包发布的 `.npmrc` 或 `publishConfig` 配置把解析重定向后，所有依赖拉取都会来自用户并未选择的主机。
  EN A registry or `_authToken` entry names a server that is not npmjs. A shipped `.npmrc` or `publishConfig` block that redirects resolution makes every dependency fetch come from a host the user did not choose.
  - `tests/catalog-npm.spec.ts:83` — `const REGISTRY = 'https://mirror.test/npm'`
  - `tests/dsh-cli.spec.ts:160` — `expect(proxyEnvForPnpm({ npm_config_registry: 'https://npm.corp/' }, 'china')).toEqual({})`
  - `tests/dsh-cli.spec.ts:162` — `expect(proxyEnvForPnpm({ NPM_CONFIG_REGISTRY: 'https://npm.corp/' }, 'china')).toEqual({})`
  - `tests/regions.spec.ts:71` — `expect(routes.catalog[0]).toEqual({ kind: 'npm', registry: 'https://npm.internal', pkg: 'dsh-plugin-catalog' })`
  中 修复：删除该覆盖；选择仓库本就是用户自己的配置，不该由被安装的包决定。
  EN Fix: Remove the override; registry selection belongs to the user's own configuration, not to the package being installed.

_按类别 / By category:_ 网络回调 / network callbacks 4 · 持久化 / persistence 4 · 混淆 / obfuscation 3 · 凭据读取 / credential access 3 · 滥用宿主环境 / harness abuse 2 · 供应链 / supply chain 2 · 破坏性 / destructive 2 · 提示注入 / prompt injection 1 · 提权 / privilege 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `dsh-market-HEAD/`
- skipped client/client.js: 577874 bytes exceeds the 524288-byte per-file cap
- not scanned (binary): assets/demo-en.png, assets/demo-zh.png, assets/logo-512.png, assets/themes-en.png, assets/themes-zh.png and 8 more
- outbound fetching was permitted for this audit
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
