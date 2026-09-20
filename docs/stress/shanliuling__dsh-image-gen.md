> 批量压测 / Batch stress test · ★ 439 · `shanliuling/dsh-image-gen`
> https://github.com/shanliuling/dsh-image-gen · audited in 4.9s
# 安装前体检 / Pre-install audit: dsh-image-gen@0.6.8

**信任评级 / Trust grade: D** (评分 / score 9/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/shanliuling/dsh-image-gen/tar.gz/HEAD` (URL / url)
- 已分析文件：115 个（3.8 MiB） / Files analysed: 115 (3.8 MiB)
- 内容摘要 / Content digest: `1c713c2c589c53240ce501b239552828…`
- 体检时间 / Audited at: 2026-09-20T09:53:04.042Z

## 最严重的风险 / Most severe risk

**向裸 IP 地址发送请求 / Sends a request to a bare IP address** `net.raw-ip-destination`

中 它会建立出站连接，因此可以在你无法选择的时机接收指令或送出数据。
EN It opens an outbound connection, so it can receive instructions or send data at a moment you do not choose.

该包会访问的目标：`www.apache.org`、`github.com`、`${host`、`your-relay.example.com`、`www.w3.org`、`css-tricks.com`、`api.github.com`、`raw.githubusercontent.com` / Destinations this package reaches: `www.apache.org`, `github.com`, `${host`, `your-relay.example.com`, `www.w3.org`, `css-tricks.com`, `api.github.com`, `raw.githubusercontent.com`

- 中 它发生在安装时：`prepare` 脚本会执行它，你不需要自己运行任何东西。
  EN It happens at install time: the `prepare` script runs it, so you do not have to run anything yourself.
- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 它还安排了之后继续运行，所以仅仅卸载这个包并不够。
  EN It also arranges to run again later, so removing the package is not enough on its own.
- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `src/shared.ts:309`；完整列表见下方「发现」。 / The rule that decided the grade fired at `src/shared.ts:309`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

- `prepare` (`package.json`): `pnpm run build`

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `node:fs/promises`
- **写入的文件路径 / File paths written:** `node:fs/promises`, `source.jpg`, `images/source.jpg`, `first.png`, `second.jpg`, `source.png`, `workspace.json`
- **派生的命令 / Commands spawned:** （无） / (none)
- **连接的域名 / Domains contacted:** `www.apache.org`, `github.com`, `${host`, `your-relay.example.com`, `www.w3.org`, `css-tricks.com`, `api.github.com`, `raw.githubusercontent.com`, `${req.headers.host`, `cdn.jsdelivr.net`, `gpt-image2.canghe.ai`, `generativelanguage.googleapis.com` （另有 41 项） / (+41 more)
- **读取的环境变量 / Environment variables read:** `USERPROFILE`, `HOME`, `NODE_ENV`

## 发现 / Findings

### 高 / HIGH (3)

- **高 / HIGH** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 50 distinct remote hosts (${host, api.github.com, css-tricks.com, github.com, raw.githubusercontent.com, www.apache.org, www.w3.org, your-relay.example.com, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `LICENSE:3` — `http://www.apache.org/licenses/`
  - `package.json:9` — `git+https://github.com/shanliuling/dsh-image-gen.git`
  - `src/canvas-state-route.ts:42` — `http://${host`
  - `src/client/index.tsx:241` — `https://your-relay.example.com/v1。`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `src/shared.ts:309` — `export const DEFAULT_COMFYUI_BASE_URL = 'http://127.0.0.1:8188'`
  - `src/subscription/loopback.ts:34` — `const url = new URL(req.url ?? '/', `http://127.0.0.1:${String(port)}`)`
  - `src/subscription/loopback.ts:34` — `/http://127.0.0.1:${String(port)}`
  - `src/subscription/vendors/grok.ts:25` — `export const GROK_REDIRECT_URI = 'http://127.0.0.1:56121/callback'`
  - ……另有 13 处 / … and 13 more location(s)
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **高 / HIGH** `persist.persistence-with-install-hook` — 安装钩子叠加持久化机制 / Install hook combined with a persistence mechanism
  中 生命周期钩子在安装期间运行，而目录树中又有东西把自己注册为稍后运行。这一组合会在用户以为只是一次普通依赖安装的过程中装入一个常驻组件。
  EN A lifecycle hook runs during install and something in the tree registers itself to run later. The combination installs a resident component during what the user believed was a normal dependency install.
  - `src/client/studio-view.tsx:1186` — `<span>{comparisonEnabled ? comparisonTargets.map(target => target.profile.label).join(' · ') : `${activeProfile?.label ?? ''} · ${model}`}</span>`
  - `src/client/studio-view.tsx:1401` — `const target = comparisonTargets.find(candidate => candidate.profile.provider === item.provider)`
  - `package.json:62` — `"prepare": "pnpm run build",`
  中 修复：删除这一定时注册。任何需要持续运行的东西，都应由用户作为一个明确可见的步骤来设置。
  EN Fix: Remove the scheduling. Anything that should keep running must be set up by the user as a deliberate, visible step.

### 中 / MEDIUM (5)

- **中 / MEDIUM** `install.hook-runs-shell-code` — 安装期钩子执行的不只是构建 / Lifecycle hook runs more than a build
  中 该钩子命令不属于常见的编译与拷贝步骤，安装这个包时会以用户权限运行任意代码，而这一切发生在任何人来得及检查之前。
  EN This hook command is not one of the usual compile-and-copy steps, so installing the package runs arbitrary code with the user's privileges before anything can be inspected.
  - `package.json:62` — `"prepare": "pnpm run build",`
  中 修复：把钩子收敛为 `tsc` 或 `npm run build` 之类的构建命令，或把这项工作移到一个由用户主动执行的显式脚本里。
  EN Fix: Reduce the hook to a build command such as `tsc` or `npm run build`, or move the work into an explicit script the user chooses to run.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `src/canvas-state-route.ts:42` — `http://${host`
  - `src/image-route.ts:41` — `http://${host`
  - `src/image-route.ts:69` — `http://${host`
  - `src/inspiration-route.ts:42` — `http://${req.headers.host`
  - ……另有 20 处 / … and 20 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `obf.long-minified-line` — 整行是压缩或机器生成的数据块 / Line is a single minified or machine-generated blob
  中 该行超过 500 个字符且几乎没有空白，正是打包载荷、压缩字符串表或机器生成单行代码的样子。这样的一行用肉眼什么也审不出来。
  EN The line is over 500 characters with almost no whitespace, which is what a bundled payload, a packed string table or a machine-generated one-liner looks like. Nothing on such a line is reviewable by eye.
  - `src/client/index.tsx:602` — `.dsh-ig-studio-select{appearance:none;-webkit-appearance:none;-moz-appearance:none;height:32px;line-height:30px;padding:0 28px 0 12px;font-size:12.5px;color:var…`
  - `src/client/inspiration-style.ts:3` — `.dsh-ig-inspiration-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:18px}.dsh-ig-inspiration-head-actions{display:…`
  - `src/client/inspiration-style.ts:4` — `.dsh-ig-inspiration-toolbar{display:grid;grid-template-columns:minmax(180px,1fr) auto repeat(3,minmax(110px,140px));gap:8px;padding:10px;border:1px solid var(--…`
  - `src/client/studio-style.ts:15` — `.dsh-ig-recent-item{position:relative;width:100%;aspect-ratio:1;align-self:start;padding:0;border:1px solid transparent;border-radius:8px;background:transparent…`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：发布未压缩的源码，或在 README 中说明该文件由哪个构建产出、可读源码在哪里。
  EN Fix: Ship unminified source, or state in the README which build produced the file and where the readable source lives.
- **中 / MEDIUM** `persist.shell-rc-append` — 追加写入 shell 启动文件 / Appends to a shell startup file
  中 该行写入了 `.bashrc`、`.zshrc`、`.profile` 或 fish 配置，因此改动会在之后每个交互式 shell 中生效，而且删掉包目录也不会消失。
  EN The line writes into `.bashrc`, `.zshrc`, `.profile` or a fish config, so the change takes effect in every future interactive shell and survives removing the package directory.
  - `src/client/studio-view.tsx:1186` — `<span>{comparisonEnabled ? comparisonTargets.map(target => target.profile.label).join(' · ') : `${activeProfile?.label ?? ''} · ${model}`}</span>`
  - `src/client/studio-view.tsx:1401` — `const target = comparisonTargets.find(candidate => candidate.profile.provider === item.provider)`
  中 修复：不要修改 shell 启动文件；如果需要 shell 集成，就把那行内容打印出来，由用户自行决定是否添加。
  EN Fix: Do not modify shell startup files; if a shell integration is required, print the line for the user to add deliberately.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 12 shipped file(s) are 64 KiB or larger and were not read as text, the largest being docs/assets/gallery-preview.png at 441 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `docs/assets/gallery-preview.png` — `451641 bytes not decoded as text`
  - `pnpm-lock.yaml:2060` — `undici-types@6.21.0:`
  - `pnpm-lock.yaml:3541` — `undici-types: 6.21.0`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (1)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `src/client/studio-view.tsx:692` — `provider: target.profile.provider,`
  - `src/client/studio-view.tsx:693` — `model: target.profile.model,`
  - `src/client/studio-view.tsx:703` — `throw new Error('error' in payload && payload.error ? payload.error : `${target.profile.label}: ${t('generationFailed')}`)`
  - `src/client/studio-view.tsx:1186` — `<span>{comparisonEnabled ? comparisonTargets.map(target => target.profile.label).join(' · ') : `${activeProfile?.label ?? ''} · ${model}`}</span>`
  - ……另有 3 处 / … and 3 more location(s)
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.

_按类别 / By category:_ 网络回调 / network callbacks 3 · 持久化 / persistence 2 · 安装脚本 / install scripts 1 · 混淆 / obfuscation 1 · 供应链 / supply chain 1 · 凭据读取 / credential access 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `dsh-image-gen-HEAD/`
- skipped docs/assets/edit-example.png: 670666 bytes exceeds the 524288-byte per-file cap
- skipped docs/assets/generate-example.png: 685731 bytes exceeds the 524288-byte per-file cap
- skipped docs/assets/readme/canvas-edit.webp: 4476978 bytes exceeds the 524288-byte per-file cap
- skipped docs/assets/readme/canvas-generate.webp: 5816198 bytes exceeds the 524288-byte per-file cap
- skipped docs/assets/readme/chat-generate.webp: 714530 bytes exceeds the 524288-byte per-file cap
- skipped docs/assets/readme/other-features.webp: 5973278 bytes exceeds the 524288-byte per-file cap
- skipped src/inspiration/data/awesome-gpt-image-2.json: 1338334 bytes exceeds the 524288-byte per-file cap
- not scanned (binary): docs/assets/chat-preview.png, docs/assets/gallery-preview.png, docs/assets/hero-poster.webp, docs/assets/readme/chat-example.webp, docs/assets/readme/comfyui-workflows.webp and 12 more
- outbound fetching was permitted for this audit
- grade D is at or below the install floor D: this source is refused

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
