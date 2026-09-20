> 批量压测 / Batch stress test · ★ 2146 · `Small-tailqwq/dsh-deep-whale#maid-atelier`
> https://github.com/Small-tailqwq/dsh-deep-whale/tree/main/maid-atelier · audited in 12.8s
# 安装前体检 / Pre-install audit: @smalltailqwq/dsh-client-ui-skin-maid-atelier@0.1.3

**信任评级 / Trust grade: C** (评分 / score 60/100 — 有值得注意的风险信号，确认后再安装 / notable risk signals, install only with intent)

> **部分扫描。** 大小或文件数上限使分析提前结束，因此该评级只覆盖已读取的部分。 / **Partial scan.** A size or file-count cap stopped the analysis early, so this grade covers only the part that was read.

- 来源 / Source: `https://codeload.github.com/Small-tailqwq/dsh-deep-whale/tar.gz/HEAD` (URL / url)
- 已分析文件：74 个（5.5 MiB） / Files analysed: 74 (5.5 MiB)
- 内容摘要 / Content digest: `3ce89bcdc9562e5585d8b202d3d07446…`
- 体检时间 / Audited at: 2026-09-20T09:52:04.517Z

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `characters-magenta.png`, `node:fs/promises`, `src/client/maid-atelier.module.css`, `package.json`, `../src/client/maid-atelier.module.css`
- **写入的文件路径 / File paths written:** （无） / (none)
- **派生的命令 / Commands spawned:** （无） / (none)
- **连接的域名 / Domains contacted:** `www.pixiv.net`, `github.com`, `registry.npmjs.org`, `www.w3.org`
- **读取的环境变量 / Environment variables read:** `NODE_ENV`

## 发现 / Findings

### 高 / HIGH (2)

- **高 / HIGH** `cred.env-harvest` — 读取或整体导出进程环境变量 / Reads or dumps the process environment
  中 该行把整个环境当成一个值取走——序列化、遍历或打印它，而不是只取自己需要的那一个变量。CI 运行器和宿主都会把 API Key 导出到环境变量里，因此整体导出就是一次凭据收集。
  EN The line takes the whole environment as a value — serializing it, iterating it, or printing it — rather than the one variable it needs. CI runners and the harness export API keys into the environment, so a dump is a credential harvest.
  - `build/tsdown.client.ts:172` — `JSON.stringify(process.env`
  - `build/tsdown.client.ts:173` — `JSON.stringify(process.env`
  中 修复：只逐个读取插件文档中声明过的变量，绝不序列化整个环境对象，也不要把它写进日志或请求。
  EN Fix: Read only the variables the plugin documents, one at a time, and never serialize the environment object or forward it into a log or request.
- **高 / HIGH** `prompt.embedded-instruction-string` — 源码字符串中夹带针对模型的指令 / Source string carries instructions aimed at a model
  中 源码中的字符串字面量——通常是工具描述或系统提示词片段——要求模型绕过确认或对用户隐瞒某些事，于是它作为一条指令进入上下文窗口。
  EN A string literal in the source — typically a tool description or system prompt fragment — tells the model to bypass confirmation or to hide something from the user, so it lands in the context window as a directive.
  - `tests/apply.spec.ts:981` — `'re-asserts the frameless frame rows through CSSOM env(), bypassing the module pipeline'`
  中 修复：如实描述工具的行为，删除那些会改变 agent 对待用户方式的指令。
  EN Fix: Describe the tool's behavior factually and remove directives that change how the agent treats the user.

### 低 / LOW (2)

- **低 / LOW** `cred.credential-path-mention` — 出现凭据路径但并未读取 / Credential path appears without being read
  中 某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。
  EN A sensitive path is named on a line that performs no read. This is reported so the report can distinguish a path that is merely echoed in a log or error message from one that is actually opened.
  - `build/tsdown.client.ts:173` — `'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV ?? 'production'),`
  - `build/tsdown.client.ts:174` — `'import.meta.env': JSON.stringify({ MODE: process.env.NODE_ENV ?? 'production' }),`
  中 修复：确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。
  EN Fix: Confirm the path is only used in documentation or messaging; if it is later passed to a read call, expect the higher-severity read rules to fire on that line.
- **低 / LOW** `obf.decoded-payload-literal` — 携带解码、转义或高熵字面量 / Carries a decoded, escaped or high-entropy literal
  中 一个很长的字面量会在运行时被解码（base64、`atob`、`unescape`、`decodeURIComponent`），或者写满了密集的十六进制、Unicode 转义，或者呈现出编码数据块那种近乎均匀的字符分布。
  EN A long literal is decoded at runtime (base64, `atob`, `unescape`, `decodeURIComponent`), written with dense hex or unicode escapes, or has the near-uniform character distribution of an encoded blob.
  - `src/client/art.ts:8` — `'data:image/webp;base64,UklGRh6oAABXRUJQVlA4WAoAAAAQAAAAsQIAYgAAQUxQSPNFAAANGUZtI0lSqueX4k94jl0IEf2fAIkKATTMMODaHtPWjlYEBZSj8q95ELRtG4c/7G0/hYiYAAiCNH1n9nd/nF7c…`
  - `src/client/art.ts:12` — `'data:image/webp;base64,UklGRpYqAABXRUJQVlA4WAoAAAAQAAAACwEAeAAAQUxQSGgKAAABwEZb27FJkq77ft6MjFRURhbS2Sjbtm3b7J4p27Zt27aRKtvtziw79d7Pff0Ifd/zPm/Uv5mImAA0XAAMWmjD…`
  - `src/client/art.ts:15` — `'data:image/webp;base64,UklGRq4dAQBXRUJQVlA4WAoAAAAQAAAAdwUAMwEAQUxQSA8dAAABGTNt2yhZv5U/6CKI6P8EsNv2uBWIuqO/ox2KyU5bdz4OYcjKcaErAfUobts2EvdfPD3fETEBpUEN+sV2yq0O…`
  - `src/client/art.ts:25` — `'data:image/webp;base64,UklGRrqYAABXRUJQVlA4WAoAAAAQAAAAgQEAQAEAQUxQSJciAAABR6aobSRnk99SWf4MrxcAEZGRzKXJ77IrV2VqGUdB2zZME/64dwlExATkP1JWBFGsp7YqubZtt234Aapmt+Ei…`
  - ……另有 15 处 / … and 15 more location(s)
  中 修复：把该值保存为可读源码，或保存为格式有文档说明的数据，让审查者能看清实际运行的到底是什么。
  EN Fix: Store the value as readable source or as data with a documented format, so a reviewer can see what is actually being run.

### 提示 / INFO (1)

- **提示 / INFO** `obf.long-minified-line` — 整行是压缩或机器生成的数据块 / Line is a single minified or machine-generated blob
  中 该行超过 500 个字符且几乎没有空白，正是打包载荷、压缩字符串表或机器生成单行代码的样子。这样的一行用肉眼什么也审不出来。
  EN The line is over 500 characters with almost no whitespace, which is what a bundled payload, a packed string table or a machine-generated one-liner looks like. Nothing on such a line is reviewable by eye.
  - `src/client/art.ts:8` — `export const MAID_ATELIER_BRAND = 'data:image/webp;base64,UklGRh6oAABXRUJQVlA4WAoAAAAQAAAAsQIAYgAAQUxQSPNFAAANGUZtI0lSqueX4k94jl0IEf2fAIkKATTMMODaHtPWjlYEBZSj8q…`
  - `src/client/art.ts:12` — `export const MAID_ATELIER_BOW_CLEAN = 'data:image/webp;base64,UklGRpYqAABXRUJQVlA4WAoAAAAQAAAACwEAeAAAQUxQSGgKAAABwEZb27FJkq77ft6MjFRURhbS2Sjbtm3b7J4p27Zt27aRKt…`
  - `src/client/chrome-art.generated.ts:5` — `export const MAID_ATELIER_BOTTOM_TRIM_TILE = 'data:image/webp;base64,UklGRsQDAABXRUJQVlA4ILgDAACQFgCdASqCAR4APikQhkIhoQwCAAwBQlla/Jz9P7WeVCJ9kAagve9ttTP3pQ/+RX7…`
  - `src/client/chrome-art.generated.ts:6` — `export const MAID_ATELIER_BOTTOM_CREST = 'data:image/webp;base64,UklGRk6xAABXRUJQVlA4WAoAAAAQAAAAzwIAmwEAQUxQSL87AAAB/yckSPD/eGtEpO7hj///xVay7Xt/vt9Zm+4GCRUUsVB…`
  - ……另有 6 处 / … and 6 more location(s)
  中 修复：发布未压缩的源码，或在 README 中说明该文件由哪个构建产出、可读源码在哪里。
  EN Fix: Ship unminified source, or state in the README which build produced the file and where the readable source lives.

_按类别 / By category:_ 凭据读取 / credential access 2 · 混淆 / obfuscation 2 · 提示注入 / prompt injection 1

## 扫描说明 / Scan notes

- scoped to the subdirectory `maid-atelier/`
- stripped the archive's single top-level directory `dsh-deep-whale-HEAD/`
- skipped assets/boot-error/characters-magenta.png: 1721224 bytes exceeds the 524288-byte per-file cap
- skipped assets/icons/delighted-cutout.png: 1669896 bytes exceeds the 524288-byte per-file cap
- skipped assets/icons/determined-cutout.png: 700815 bytes exceeds the 524288-byte per-file cap
- skipped assets/icons/sleepy-cutout.png: 1542451 bytes exceeds the 524288-byte per-file cap
- skipped assets/icons/source/delighted.png: 1998317 bytes exceeds the 524288-byte per-file cap
- skipped assets/icons/source/determined.png: 727947 bytes exceeds the 524288-byte per-file cap
- skipped assets/icons/source/sleepy.png: 1899092 bytes exceeds the 524288-byte per-file cap
- skipped assets/maid-atelier-maid-left-v5.webp: 1034470 bytes exceeds the 524288-byte per-file cap
- skipped assets/maid-atelier-maid-right-v7.webp: 1209838 bytes exceeds the 524288-byte per-file cap
- skipped assets/maid-atelier-maid-right-vision-v1.webp: 1863474 bytes exceeds the 524288-byte per-file cap
- ……另有 5 项 / … and 5 more

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
