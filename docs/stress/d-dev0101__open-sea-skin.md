> 批量压测 / Batch stress test · ★ 378 · `d-dev0101/open-sea-skin`
> https://github.com/d-dev0101/open-sea-skin · audited in 8.8s
# 安装前体检 / Pre-install audit: @deepseek-ai/dsh-client-ui-open-sea-skin@0.1.0

**信任评级 / Trust grade: D** (评分 / score 5/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/d-dev0101/open-sea-skin/tar.gz/HEAD` (URL / url)
- 已分析文件：142 个（3.5 MiB） / Files analysed: 142 (3.5 MiB)
- 内容摘要 / Content digest: `72701588fcb1e08c42257475a04c065d…`
- 体检时间 / Audited at: 2026-09-20T09:53:14.212Z

## 最严重的风险 / Most severe risk

**向裸 IP 地址发送请求 / Sends a request to a bare IP address** `net.raw-ip-destination`

中 它会建立出站连接，因此可以在你无法选择的时机接收指令或送出数据。
EN It opens an outbound connection, so it can receive instructions or send data at a moment you do not choose.

该包会访问的目标：`registry.npmjs.org`、`127.0.0.1`、`localhost`、`x`、`github.com`、`d-dev0101.github.io`、`dsh.local`、`newtab` / Destinations this package reaches: `registry.npmjs.org`, `127.0.0.1`, `localhost`, `x`, `github.com`, `d-dev0101.github.io`, `dsh.local`, `newtab`

- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `extension/manifest.json:19`；完整列表见下方「发现」。 / The rule that decided the grade fired at `extension/manifest.json:19`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `node:fs/promises`, `index.html`, `shared/skin-core.js`, `shared/ocean.js`, `ocean.js`, `shared/styles.css`, `styles.css`, `shared/vendor`, `extension/icons/icon48.png`, `icon48.png`, `docs/marketplace/open-sea-harness-cover.png`, `og.png` （另有 6 项） / (+6 more)
- **写入的文件路径 / File paths written:** `shared/ocean.js`, `ocean.js`, `shared/styles.css`, `styles.css`, `shared/vendor`, `extension/icons/icon48.png`, `icon48.png`, `docs/marketplace/open-sea-harness-cover.png`, `og.png`, `docs/screenshots`, `.nojekyll`, `node:fs/promises` （另有 3 项） / (+3 more)
- **派生的命令 / Commands spawned:** `node:child_process`, `bash`, `native-dist/install-skin.sh`, `--dist`, `--uninstall`, `ffmpeg`, `git`, `show`, `v1.2.2:plugin/client.js`, `utf8`, `tar`, `-czf` （另有 3 项） / (+3 more)
- **连接的域名 / Domains contacted:** `registry.npmjs.org`, `127.0.0.1`, `localhost`, `x`, `github.com`, `d-dev0101.github.io`, `dsh.local`, `newtab`, `fixture`, `127.0.0.1:${address.port`, `www.w3.org`, `cdn.jsdelivr.net` （另有 2 项） / (+2 more)
- **读取的环境变量 / Environment variables read:** `OSS_HEADLESS`, `OSS_CHROME_BIN`, `OSS_HARNESS_URL`, `OSS_DESKTOP_BASELINE`, `OSS_WEBSITE_SCREENSHOTS`

## 发现 / Findings

### 高 / HIGH (3)

- **高 / HIGH** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `extension/manifest.json:19` — `"http://127.0.0.1/*",`
  - `extension/manifest.json:24` — `"matches": ["http://127.0.0.1/*", "http://localhost/*"],`
  - `extension/manifest.json:24` — `matcheshttp://127.0.0.1/*http://localhost/*`
  - `extension/manifest.json:41` — `"matches": ["http://127.0.0.1/*", "http://localhost/*"]`
  - ……另有 5 处 / … and 5 more location(s)
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.
- **高 / HIGH** `obf.decoded-payload-literal` — 携带解码、转义或高熵字面量 / Carries a decoded, escaped or high-entropy literal
  中 一个很长的字面量会在运行时被解码（base64、`atob`、`unescape`、`decodeURIComponent`），或者写满了密集的十六进制、Unicode 转义，或者呈现出编码数据块那种近乎均匀的字符分布。
  EN A long literal is decoded at runtime (base64, `atob`, `unescape`, `decodeURIComponent`), written with dense hex or unicode escapes, or has the near-uniform character distribution of an encoded blob.
  - `scripts/build-runtime.mjs:52` — `const banner = Buffer.from('// GENERATED from shared/skin-core.js. Run npm run build after editing shared sources.\n')`
  中 修复：把该值保存为可读源码，或保存为格式有文档说明的数据，让审查者能看清实际运行的到底是什么。
  EN Fix: Store the value as readable source or as data with a documented format, so a reviewer can see what is actually being run.
- **高 / HIGH** `supply.url-dependency` — 依赖解析到 URL、git 引用或文件路径 / Dependency resolves to a URL, git ref or file path
  中 依赖不是从仓库解析，而是来自 URL、git 引用、本地路径或 patch，因此其内容不受仓库锁文件和任何完整性元数据约束，可以在版本号不变的情况下被替换。
  EN A dependency is resolved from a URL, a git reference, a local path or a patch instead of the registry, so its contents are not covered by the registry lockfile or by any integrity metadata and can change without a version bump.
  - `harness-plugin/package.json:46` — `"@deepseek-ai/cordis": "workspace:^",`
  - `harness-plugin/package.json:47` — `"@deepseek-ai/dsh-api-remotes": "workspace:^",`
  - `harness-plugin/package.json:48` — `"@deepseek-ai/dsh-client-connection": "workspace:^",`
  - `harness-plugin/package.json:49` — `"@deepseek-ai/dsh-client-locale": "workspace:^",`
  - ……另有 1 处 / … and 1 more location(s)
  中 修复：改为依赖仓库中已发布的版本，并用锁文件固定；如果确实必须用 fork，就把它发布到自己名下的 scope。
  EN Fix: Depend on a published version from the registry, pinned by a lockfile; if a fork is unavoidable, publish it under your own scope.

### 中 / MEDIUM (5)

- **中 / MEDIUM** `harness.reserved-tool-name` — 用保留名称注册工具 / Registers a tool under a reserved name
  中 注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。
  EN A tool is registered with the name of a built-in harness tool, so the model may call this implementation while believing it is calling the core one, and the tool-call record becomes misleading.
  - `harness-plugin/src/client/index.ts:99` — `name: 'shell.background',`
  中 修复：给工具加上插件专属前缀重命名，不要占用保留名称。
  EN Fix: Rename the tool with a plugin-specific prefix instead of claiming a reserved name.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `extension/manifest.json:19` — `http://127.0.0.1/*`
  - `extension/manifest.json:24` — `http://127.0.0.1/*`
  - `extension/manifest.json:24` — `http://127.0.0.1/*http://localhost/*`
  - `extension/manifest.json:41` — `http://127.0.0.1/*`
  - ……另有 8 处 / … and 8 more location(s)
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `obf.long-minified-line` — 整行是压缩或机器生成的数据块 / Line is a single minified or machine-generated blob
  中 该行超过 500 个字符且几乎没有空白，正是打包载荷、压缩字符串表或机器生成单行代码的样子。这样的一行用肉眼什么也审不出来。
  EN The line is over 500 characters with almost no whitespace, which is what a bundled payload, a packed string table or a machine-generated one-liner looks like. Nothing on such a line is reviewable by eye.
  - `extension/vendor/addons/controls/OrbitControls.js:1` — `import{Controls as S,MOUSE as _,Quaternion as E,Spherical as P,TOUCH as u,Vector2 as c,Vector3 as p,Plane as w,Ray as O,MathUtils as R}from"../../three.webgpu.j…`
  - `extension/vendor/addons/controls/OrbitControls.js:1` — `../../three.webgpu.jschangestartendArrowLeftArrowUpArrowRightArrowDownpointerdownpointercancelcontextmenuwheelkeydownnonepointerdownpointermovepointeruppointerc…`
  - `extension/vendor/addons/tsl/display/BloomNode.js:1` — `import{HalfFloatType as f,RenderTarget as M,Vector2 as _,Vector3 as x,TempNode as D,QuadMesh as L,NodeMaterial as N,RendererUtils as F,NodeUpdateType as W}from"…`
  - `extension/vendor/three.core.js:9` — `}`;class Ds extends mt{constructor(t){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.v…`
  - ……另有 16 处 / … and 16 more location(s)
  中 修复：发布未压缩的源码，或在 README 中说明该文件由哪个构建产出、可读源码在哪里。
  EN Fix: Ship unminified source, or state in the README which build produced the file and where the readable source lives.
- **中 / MEDIUM** `supply.client-without-bundle` — 声明了 client 入口却没有 bundle 清单 / Declares a client entry without a bundle manifest
  中 清单声明了 `dsh.client`，却没有 `dsh.bundle` patch，因此该包无法作为 bundle 被组合：市场会拒绝它，而手动安装的用户会得到一个永远加载不起来的插件。
  EN The manifest declares `dsh.client` but no `dsh.bundle` patch, so the package cannot be composed as a bundle: the marketplace rejects it, and a user who installs it gets a plugin that never loads.
  - `harness-plugin/package.json:25` — `"dsh": {`
  中 修复：增加指向 composition patch 的 `dsh.bundle.patch` 条目，或者在包没有 UI 时去掉 client 声明。
  EN Fix: Add a `dsh.bundle.patch` entry pointing at the composition patch, or drop the client declaration if the package has no UI.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 3 shipped file(s) are 64 KiB or larger and were not read as text, the largest being docs/screenshots/harness-open-sea-overview.png at 453 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `docs/screenshots/harness-open-sea-overview.png` — `463537 bytes not decoded as text`
  - `extension/vendor/three.core.js:44` — ``},s=new rs(5,5,5),n=new Ds({name:"CubemapFromEquirect",uniforms:Li(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:Wn,blending:Ao}…`
  - `harness-plugin/assets/vendor/three.core.js:44` — ``},s=new rs(5,5,5),n=new Ds({name:"CubemapFromEquirect",uniforms:Li(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:Wn,blending:Ao}…`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

_按类别 / By category:_ 供应链 / supply chain 3 · 网络回调 / network callbacks 2 · 混淆 / obfuscation 2 · 滥用宿主环境 / harness abuse 1

## 扫描说明 / Scan notes

- stripped the archive's single top-level directory `open-sea-skin-HEAD/`
- skipped docs/marketplace/open-sea-harness-cover.png: 1322631 bytes exceeds the 524288-byte per-file cap
- skipped docs/screenshots/extension-new-tab.png: 1416981 bytes exceeds the 524288-byte per-file cap
- skipped docs/screenshots/harness-calm-sea.png: 946481 bytes exceeds the 524288-byte per-file cap
- skipped docs/screenshots/harness-dark-overview-40.gif: 8308841 bytes exceeds the 524288-byte per-file cap
- skipped docs/screenshots/harness-daylight-sunset-40.gif: 7772017 bytes exceeds the 524288-byte per-file cap
- skipped docs/screenshots/harness-high-sea.png: 1141515 bytes exceeds the 524288-byte per-file cap
- skipped docs/screenshots/harness-light-overview-40.gif: 8328634 bytes exceeds the 524288-byte per-file cap
- skipped docs/screenshots/harness-quick-controls.png: 1066029 bytes exceeds the 524288-byte per-file cap
- skipped docs/screenshots/harness-sunset.png: 1085877 bytes exceeds the 524288-byte per-file cap
- skipped docs/screenshots/harness-wave-control-40.gif: 9683003 bytes exceeds the 524288-byte per-file cap
- skipped docs/screenshots/open-sea-controls.gif: 834992 bytes exceeds the 524288-byte per-file cap
- ……另有 7 项 / … and 7 more

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
