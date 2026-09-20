> 批量压测 / Batch stress test · ★ 1359 · `Devin-AXIS/deepseek-design#packages/deepseek-ivideo`
> https://github.com/Devin-AXIS/deepseek-design/tree/main/packages/deepseek-ivideo · audited in 11.5s
# 安装前体检 / Pre-install audit: deepseek-ivideo@0.5.0

**信任评级 / Trust grade: D** (评分 / score 27/100 — 拒绝：存在严重风险信号 / refused: critical risk signals)

> **拒绝安装。** 该来源达到了配置的拒绝阈值。请先修复严重问题；若你已读过报告并接受风险，可把该包加入 `install.allow`。 / **Install refused.** This source met the configured refusal floor. Fix the critical findings, or add the package to `install.allow` if you have read them and accept the risk.

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/Devin-AXIS/deepseek-design/tar.gz/HEAD` (URL / url)
- 已分析文件：300 个（6.9 MiB） / Files analysed: 300 (6.9 MiB)
- 内容摘要 / Content digest: `7b888517130c25e42e2c5ce04ccdbec4…`
- 体检时间 / Audited at: 2026-09-20T09:52:16.013Z

## 最严重的风险 / Most severe risk

**在同一个请求里发送本地文件或环境变量数据 / Sends local file or environment data in one request** `exfil.local-data-in-request`

中 数据会离开这台机器。该包中有代码把本机上的内容发往外部地址。
EN Data leaves this machine. Something in this package takes content that lives here and sends it to a destination outside it.

该包会访问的目标：`googlechromelabs.github.io`、`evilmartians.com`、`www.w3ctech.com`、`runtime.colorgrading.compileshader`、`runtime.colorgrading.linkprogram`、`cdn.jsdelivr.net`、`localhost`、`www.apache.org` / Destinations this package reaches: `googlechromelabs.github.io`, `evilmartians.com`, `www.w3ctech.com`, `runtime.colorgrading.compileshader`, `runtime.colorgrading.linkprogram`, `cdn.jsdelivr.net`, `localhost`, `www.apache.org`

- 中 其中一部分经过混淆，源码看不出真正执行的是什么。
  EN Part of it is obfuscated, so the source does not show what actually executes.
- 中 本次扫描不完整，因此可能还有内容根本没被读到。
  EN The scan was partial, so there may be more that was never read.

决定该评级的规则命中于 `lib/hyperframes/studio/assets/StudioRightPanel-_hY61p5S.js:2`；完整列表见下方「发现」。 / The rule that decided the grade fired at `lib/hyperframes/studio/assets/StudioRightPanel-_hY61p5S.js:2`; the full list is under Findings below.

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `./rolldown-runtime-B0Z9INg1.js`, `./react-B__L-SyA.js`, `./studioTelemetry-DcOJUHoS.js`, `./jsx-runtime-B74pBk57.js`, `./Button-CHZ7xt4t.js`, `./index-VfW3tSA_.js`, `./VideoFrameThumbnail-ClpKU7hH.js`, `./renderSettings-BWdN1xnV.js`, `/api/projects/${t}/renders/file/${e.filename}`, `./timelineAssetDrop-B2RO8kIr.js`, `./studioSaveDiagnostics-B5yIFyEw.js`, `node:fs/promises` （另有 1 项） / (+1 more)
- **写入的文件路径 / File paths written:** `./rolldown-runtime-B0Z9INg1.js`, `./react-B__L-SyA.js`, `./jsx-runtime-B74pBk57.js`, `./timelineAssetDrop-B2RO8kIr.js`, `./studioSaveDiagnostics-B5yIFyEw.js`, `./index-VfW3tSA_.js`, `node:fs/promises`, `brief.json`
- **派生的命令 / Commands spawned:** （无） / (none)
- **连接的域名 / Domains contacted:** `googlechromelabs.github.io`, `evilmartians.com`, `www.w3ctech.com`, `runtime.colorgrading.compileshader`, `runtime.colorgrading.linkprogram`, `cdn.jsdelivr.net`, `localhost`, `www.apache.org`, `www.w3.org`, `react.dev`, `studio.local`, `fonts.gstatic.com` （另有 8 项） / (+8 more)
- **读取的环境变量 / Environment variables read:** `LANG`

## 发现 / Findings

### 高 / HIGH (2)

- **高 / HIGH** `exfil.local-data-in-request` — 在同一个请求里发送本地文件或环境变量数据 / Sends local file or environment data in one request
  中 同一行既读取本地文件或整个进程环境，又把结果直接送进对外的网络请求。这是本地数据流向第三方的最短路径，用户完全没机会先看一眼这些值。
  EN A single line reads local files, or the whole process environment, and passes the result straight into an outbound request. That is the shortest possible path from local data to a third party, with no chance for a user to see the value first.
  - `lib/hyperframes/studio/assets/StudioRightPanel-_hY61p5S.js:2` — `import{a as e,r as t}from"./rolldown-runtime-B0Z9INg1.js";import{t as n}from"./react-B__L-SyA.js";import{t as r}from"./jsx-runtime-B74pBk57.js";import{nt as i}f…`
  中 修复：把读取和发送拆开，只发送端点真正需要的具名字段，绝不整体上传环境变量。
  EN Fix: Separate the read from the send, send only the named fields the endpoint needs, and never include environment variables wholesale.
- **高 / HIGH** `obf.decoded-payload-literal` — 携带解码、转义或高熵字面量 / Carries a decoded, escaped or high-entropy literal
  中 一个很长的字面量会在运行时被解码（base64、`atob`、`unescape`、`decodeURIComponent`），或者写满了密集的十六进制、Unicode 转义，或者呈现出编码数据块那种近乎均匀的字符分布。
  EN A long literal is decoded at runtime (base64, `atob`, `unescape`, `decodeURIComponent`), written with dense hex or unicode escapes, or has the near-uniform character distribution of an encoded blob.
  - `lib/hyperframes/studio/assets/figmaAssetsSearch-BBaNoc8x.js:1` — ``data:image/svg+xml,%3csvg%20preserveAspectRatio='none'%20overflow='visible'%20style='display:%20block;'%20width='16'%20height='16'%20viewBox='0%200%2016%2016'%…`
  - `lib/hyperframes/studio/assets/StoryboardView-B9VTb2oS.js:3` — `"']/u,Fe=/(?!~)[\p{P}\p{S}]/u,Ie=/(?!~)[\s\p{P}\p{S}]/u,Le=/(?:[^\s\p{P}\p{S}]|~)/u,Re=E(/link|precode-code|html/,`g`).replace(`link`,/\[(?:[^\[\]`]|(?<a>`+)[^`…`
  - `lib/hyperframes/studio/assets/StoryboardView-B9VTb2oS.js:23` — ``,1)[0],u=!c.trim(),d=0;if(this.options.pedantic?(d=2,s=c.trimStart()):u?d=t[1].length+1:(d=c.search(this.rules.other.nonSpaceChar),d=d>4?1:d,s=c.slice(d),d+=t[…`
  - `lib/hyperframes/studio/assets/StudioLeftSidebar-BeR_oR_1.js:3` — ``&&s.originalPath===t.fullPath?(0,K.jsx)(Q,{defaultValue:s.originalName??t.name,depth:n,isFolder:!0,onCommit:e=>{s?.onCommit?.(e)},onCancel:()=>{s?.onCancel?.()…`
  中 修复：把该值保存为可读源码，或保存为格式有文档说明的数据，让审查者能看清实际运行的到底是什么。
  EN Fix: Store the value as readable source or as data with a documented format, so a reviewer can see what is actually being run.

### 中 / MEDIUM (5)

- **中 / MEDIUM** `net.excessive-distinct-hosts` — 包连接的不同主机数量多得不合常理 / Package contacts an implausible number of distinct hosts
  中 对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。
  EN The package reaches 18 distinct remote hosts (cdn.jsdelivr.net, evilmartians.com, googlechromelabs.github.io, runtime.colorgrading.compileshader, runtime.colorgrading.linkprogram, www.apache.org, www.w3.org, www.w3ctech.com, …). That is far more than a plugin needs, and the report cannot attribute the surplus to any documented feature.
  - `lib/hyperframes/docker/Dockerfile.render:6` — `https://googlechromelabs.github.io/chrome-for-testing/`
  - `lib/hyperframes/hyperframe-runtime.js:28` — `https://evilmartians.com/chronicles/postcss-8-plugin-migration`
  - `lib/hyperframes/hyperframe-runtime.js:29` — `https://www.w3ctech.com/topic/2226`
  - `lib/hyperframes/hyperframe-runtime.js:352` — `"runtime.colorGrading.compileShader"`
  中 修复：把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。
  EN Fix: Reduce the destination list to the documented service, and remove any endpoint the plugin cannot justify.
- **中 / MEDIUM** `net.plaintext-http` — 使用明文 HTTP 端点 / Uses a plaintext HTTP endpoint
  中 指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。
  EN An `http://` URL to a public host sends and receives data in the clear, where it can be read or rewritten in transit; anything that arrives this way can also be replaced with a different payload.
  - `lib/project-COHQvHdX.js:30` — `http://localhost:${port`
  中 修复：改用 `https://`，并固定你实际要通信的主机。
  EN Fix: Switch to `https://` and pin the host you intend to talk to.
- **中 / MEDIUM** `obf.long-minified-line` — 整行是压缩或机器生成的数据块 / Line is a single minified or machine-generated blob
  中 该行超过 500 个字符且几乎没有空白，正是打包载荷、压缩字符串表或机器生成单行代码的样子。这样的一行用肉眼什么也审不出来。
  EN The line is over 500 characters with almost no whitespace, which is what a bundled payload, a packed string table or a machine-generated one-liner looks like. Nothing on such a line is reviewable by eye.
  - `lib/hyperframes/hyperframe-runtime.js:1` — `"use strict";(()=>{var ku=Object.create;var yi=Object.defineProperty;var Du=Object.getOwnPropertyDescriptor;var Iu=Object.getOwnPropertyNames;var Pu=Object.getP…`
  - `lib/hyperframes/hyperframe-runtime.js:12` — ``,colon:": ",commentLeft:" ",commentRight:" ",emptyBody:"",indent:" ",semicolon:!1};function cd(e){return e[0].toUpperCase()+e.slice(1)}function ws(e,t){let n="…`
  - `lib/hyperframes/hyperframe.runtime.iife.js:1` — `"use strict";(()=>{var ku=Object.create;var yi=Object.defineProperty;var Du=Object.getOwnPropertyDescriptor;var Iu=Object.getOwnPropertyNames;var Pu=Object.getP…`
  - `lib/hyperframes/hyperframe.runtime.iife.js:12` — ``,colon:": ",commentLeft:" ",commentRight:" ",emptyBody:"",indent:" ",semicolon:!1};function cd(e){return e[0].toUpperCase()+e.slice(1)}function ws(e,t){let n="…`
  - ……另有 109 处 / … and 109 more location(s)
  中 修复：发布未压缩的源码，或在 README 中说明该文件由哪个构建产出、可读源码在哪里。
  EN Fix: Ship unminified source, or state in the README which build produced the file and where the readable source lives.
- **中 / MEDIUM** `prompt.concealed-instruction` — 把文本藏在注释或不可见字符中 / Hides text in a comment or invisible characters
  中 该行把内容藏在 HTML 注释里，或藏在零宽字符与双向控制字符之后，这些内容在 diff 或渲染后的文档中什么都看不见，却仍会作为文本被读取。
  EN The line conceals content either in an HTML comment or behind zero-width and bidirectional control characters, which render as nothing in a diff or a rendered document while still being read as text.
  - `lib/templates/ipollowork.html-anything.frame-data-chart-nyt/index.html:1` — `<!DOCTYPE html>`
  - `lib/templates/ipollowork.html-anything.frame-flowchart-sticky/index.html:1` — `<!DOCTYPE html>`
  - `lib/templates/ipollowork.html-anything.frame-glitch-title/index.html:1` — `<!DOCTYPE html>`
  - `lib/templates/ipollowork.html-anything.frame-light-leak-cinema/index.html:1` — `<!DOCTYPE html>`
  - ……另有 8 处 / … and 8 more location(s)
  中 修复：删除被隐藏的文本和不可见字符；审查者看不到的东西就不该出现在发布的包里。
  EN Fix: Delete the concealed text and the invisible characters; anything a reviewer cannot see does not belong in a shipped package.
- **中 / MEDIUM** `supply.unscannable-payload-with-network` — 随包携带不可读载荷且存在对外请求 / Unreadable payload shipped alongside outbound requests
  中 该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。
  EN 11 shipped file(s) are 64 KiB or larger and were not read as text, the largest being lib/templates/ipollowork.hyperframes.brand-liquid-sizzle/cover.png at 337 KiB, while this package also makes outbound requests. Whatever those files contain leaves the machine unexamined.
  - `lib/templates/ipollowork.hyperframes.brand-liquid-sizzle/cover.png` — `344614 bytes not decoded as text`
  - `lib/hyperframes/hyperframe-runtime.js:349` — `})();`}var Kf=["data-composition-id","data-composition-file","data-start","data-duration","data-end","data-track-index","data-track","data-composition-src","dat…`
  - `lib/hyperframes/hyperframe-runtime.js:352` — ``);function mt(e){return e instanceof HTMLVideoElement||e instanceof HTMLImageElement}function El(e,t,n){let i=e.createShader(n);return i?(e.shaderSource(i,t),e…`
  中 修复：删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。
  EN Fix: Remove the opaque payload or document what it is; an audit cannot vouch for bytes it could not read.

### 低 / LOW (1)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `lib/hyperframes/studio/assets/react-B__L-SyA.js:1` — `import{t as e}from"./rolldown-runtime-B0Z9INg1.js";var t=e((e=>{var t=Symbol.for(`react.transitional.element`),n=Symbol.for(`react.portal`),r=Symbol.for(`react.…`
  - `lib/hyperframes/studio/assets/react-B__L-SyA.js:1` — `./rolldown-runtime-B0Z9INg1.jsreact.transitional.elementreact.portalreact.fragmentreact.strict_modereact.profilerreact.consumerreact.contextreact.forward_refrea…`
  - `lib/hyperframes/studio/assets/react-B__L-SyA.js:1` — `./rolldown-runtime-B0Z9INg1.js/react.transitional.element/react.portal/react.fragment/react.strict_mode/react.profiler/react.consumer/react.context/react.forwar…`
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.

_按类别 / By category:_ 混淆 / obfuscation 2 · 网络回调 / network callbacks 2 · 数据外传 / exfiltration 1 · 提示注入 / prompt injection 1 · 供应链 / supply chain 1 · 凭据读取 / credential access 1

## 扫描说明 / Scan notes

- scoped to the subdirectory `packages/deepseek-ivideo/`
- stripped the archive's single top-level directory `deepseek-design-HEAD/`
- skipped lib/hyperframes/cli.js: 10621449 bytes exceeds the 524288-byte per-file cap
- skipped lib/hyperframes/studio/assets/SourceEditor-BdxtFwfJ.js: 553608 bytes exceeds the 524288-byte per-file cap
- skipped lib/hyperframes/studio/assets/index-VfW3tSA_.js: 2039287 bytes exceeds the 524288-byte per-file cap
- skipped lib/hyperframes/studio/assets/src-fOK5S08Y.js: 626000 bytes exceeds the 524288-byte per-file cap
- skipped lib/runtime-BDSMUY5d.js: 608005 bytes exceeds the 524288-byte per-file cap
- skipped lib/templates/ipollowork.hyperframes.agent-command-center/cover.png: 2077565 bytes exceeds the 524288-byte per-file cap
- skipped lib/templates/ipollowork.hyperframes.app-device-launch/assets/three.min.js: 607784 bytes exceeds the 524288-byte per-file cap
- skipped lib/templates/ipollowork.hyperframes.app-device-launch/models/iphone.glb: 887328 bytes exceeds the 524288-byte per-file cap
- skipped lib/templates/ipollowork.hyperframes.connector-pulse/cover.png: 2077565 bytes exceeds the 524288-byte per-file cap
- skipped lib/templates/ipollowork.hyperframes.multi-agent-relay/cover.png: 2077565 bytes exceeds the 524288-byte per-file cap
- ……另有 5 项 / … and 5 more

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
