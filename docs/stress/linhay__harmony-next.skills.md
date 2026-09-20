> 批量压测 / Batch stress test · ★ 351 · `linhay/harmony-next.skills`
> https://github.com/linhay/harmony-next.skills · audited in 7.0s
# 安装前体检 / Pre-install audit: https://codeload.github.com/linhay/harmony-next.skills/tar.gz/HEAD

**信任评级 / Trust grade: B** (评分 / score 75/100 — 有轻微信号，建议复核 / minor signals, review recommended)

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/linhay/harmony-next.skills/tar.gz/HEAD` (URL / url)
- 已分析文件：4000 个（54.2 MiB） / Files analysed: 4000 (54.2 MiB)
- 内容摘要 / Content digest: `b2359fdf591ea6d3be4fccb4cf511710…`
- 体检时间 / Audited at: 2026-09-20T09:53:20.758Z

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** （无） / (none)
- **写入的文件路径 / File paths written:** （无） / (none)
- **派生的命令 / Commands spawned:** （无） / (none)
- **连接的域名 / Domains contacted:** （无） / (none)
- **读取的环境变量 / Environment variables read:** （无） / (none)

## 发现 / Findings

### 高 / HIGH (1)

- **高 / HIGH** `prompt.doc-instruction` — 文档中包含针对模型的指令 / Documentation contains instructions aimed at a model
  中 随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。
  EN A shipped document orders the reader — which in this harness is an AI agent — to ignore earlier instructions, withhold information from the user, or skip confirmation. Text like this is read as instructions, not as documentation.
  - `harmony-next.skills-HEAD/harmony-next/references/JsEtsAPIReference/api26/openharmony-js/@ohos.app.ability.hyperSnapManager.d.ts.md:36` — `* Subsequent launched resume directly from this snapshot, bypassing the full cold start sequence,`
  - `harmony-next.skills-HEAD/harmony-next/references/JsEtsAPIReference/api26/openharmony-js/@ohos.web.webview.d.ts.md:440` — `* If isCspBypassing is true, then this scheme can bypass Content Security Policy (CSP)`
  - `harmony-next.skills-HEAD/harmony-next/references/JsEtsAPIReference/api26/openharmony-js/@ohos.web.webview.d.ts.md:447` — `isCspBypassing?: boolean;`
  - `harmony-next.skills-HEAD/harmony-next/references/JsEtsAPIReference/api26/openharmony-js/@ohos.web.webview.d.ts.md:2726` — `* value: false. When WebRTC is enabled, it may allow malicious traffic to bypass the proxy tunnel, exposing`
  - ……另有 15 处 / … and 15 more location(s)
  中 修复：把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。
  EN Fix: Rewrite the passage as a description of the plugin for a human reader, and remove any language that addresses the model directly.

### 中 / MEDIUM (1)

- **中 / MEDIUM** `prompt.concealed-instruction` — 把文本藏在注释或不可见字符中 / Hides text in a comment or invisible characters
  中 该行把内容藏在 HTML 注释里，或藏在零宽字符与双向控制字符之后，这些内容在 diff 或渲染后的文档中什么都看不见，却仍会作为文本被读取。
  EN The line conceals content either in an HTML comment or behind zero-width and bidirectional control characters, which render as nothing in a diff or a rendered document while still being read as text.
  - `harmony-next.skills-HEAD/harmony-next/references/JsEtsAPIReference/api26/openharmony-js/@ohos.enterprise.wifiManager.d.ts.md:902` — `* ​Wi-Fi has been disabled via`
  - `harmony-next.skills-HEAD/harmony-next/references/JsEtsAPIReference/api26/openharmony-js/@ohos.enterprise.wifiManager.d.ts.md:929` — `* ​Wi-Fi has been disabled via`
  - `harmony-next.skills-HEAD/harmony-next/references/JsEtsAPIReference/api26/openharmony-js/@ohos.net.eap.d.ts.md:146` — `* ​`
  - `harmony-next.skills-HEAD/harmony-next/references/JsEtsAPIReference/api26/openharmony-js/@ohos.net.eap.d.ts.md:177` — `* ​`
  - ……另有 33 处 / … and 33 more location(s)
  中 修复：删除被隐藏的文本和不可见字符；审查者看不到的东西就不该出现在发布的包里。
  EN Fix: Delete the concealed text and the invisible characters; anything a reviewer cannot see does not belong in a shipped package.

## 扫描说明 / Scan notes

- skipped harmony-next.skills-HEAD/harmony-next.skill.zip: 11671818 bytes exceeds the 524288-byte per-file cap
- skipped harmony-next.skills-HEAD/harmony-next/references/JsEtsAPIReference/api26/openharmony-js/@ohos.multimedia.image.d.ts.md: 561400 bytes exceeds the 524288-byte per-file cap
- skipped harmony-next.skills-HEAD/harmony-next/references/JsEtsAPIReference/api26/openharmony-js/@ohos.window.d.ts.md: 553413 bytes exceeds the 524288-byte per-file cap
- skipped harmony-next.skills-HEAD/harmony-next/references/JsEtsAPIReference/modules/ohos/@ohos.security.cert (证书模块).md: 595233 bytes exceeds the 524288-byte per-file cap
- stopped unpacking: file count cap of 4000 reached
- not scanned (binary): harmony-next.skills-HEAD/harmony-next/references/JsEtsAPIReference/public_sys-resources/caution_3.0-zh-cn.webp, harmony-next.skills-HEAD/harmony-next/references/JsEtsAPIReference/public_sys-resources/danger_3.0-zh-cn.webp, harmony-next.skills-HEAD/harmony-next/references/JsEtsAPIReference/public_sys-resources/delta.webp, harmony-next.skills-HEAD/harmony-next/references/JsEtsAPIReference/public_sys-resources/deltaend.webp, harmony-next.skills-HEAD/harmony-next/references/JsEtsAPIReference/public_sys-resources/icon-arrowdn.webp and 16 more
- outbound fetching was permitted for this audit

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
