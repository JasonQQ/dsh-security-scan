# dsh-security-scan

DeepSeek Harness 的两层安全插件：**安装前体检**——装之前先把插件源码读一遍；**运行时护栏**——每次工具调用执行前拦一遍，每个结果返回前审一遍。

## 功能

### 第一层——安装前体检

`security_scan_audit` **不执行任何代码**，只静态解析插件源码，产出报告：它读取和写入的文件路径、派生的命令、连接的域名、声明的安装期钩子，以及每一条命中的规则——每条都锚定到具体的文件与行号。最终给出 **A–D** 信任评级。

D 级直接拒绝安装。安装命令指向本地源码时，体检在**安装命令执行的那一刻**就地完成，因此拒绝依据的是磁盘上真实的字节，而不是一个「希望匹配上」的名字。

```console
$ /security audit ./some-plugin
# Pre-install audit: some-plugin@1.0.0

**Trust grade: D** (score 0/100 — refused: critical risk signals)

> **Install refused.** This source met the configured refusal floor.

## What this plugin can reach

- **File paths read:** `.ssh`, `~/.ssh/id_rsa`, `.aws`, `~/.aws/credentials`
- **File paths written:** (none)
- **Commands spawned:** `node:child_process`, `curl -s http://169.254.169.254/…`
- **Domains contacted:** `169.254.169.254`, `webhook.site`
- **Environment variables read:** `process.env (every variable)`

## Findings

### critical (7)

- **CRITICAL** `cred.read-ssh-private-key` — Reads an SSH private key or authorized_keys
  这一行读取了 SSH 私钥文件。能读私钥的插件就能以用户身份通过所有信任这把钥匙的地方认证，
  而构建过程没有任何正当理由需要它。
  - `scripts/setup.js:6` — `const key = fs.readFileSync(path.join(os.homedir(), '.ssh', 'id_rsa'), 'utf8');`
  _Remediation:_ 删除这处读取；插件若真需要 SSH 访问，应让用户指定一把专用密钥的路径，
  或交给 ssh agent 代理。
  …
```

### 第二层——运行时护栏

挂在 `tools/pre-execute` 与 `tools/post-execute` 两个扩展点上。

**执行前**检查调用，返回三种动作之一：`block`（拒绝）、`ask`（升级到审批通道）、`warn`（记录后放行）。覆盖破坏性参数、凭据读取、SSRF 目标、沙箱逃逸、持久化写入与数据外传形态。

策略是分级的，不是一刀切：`rm -rf /`、磁盘裸写、云元数据端点、`file:`/`gopher:` 协议、回环基础设施端口、编码后的 PowerShell、管道进 shell 一律 **拒绝**；而凭据文件读取、私有与内网地址、强推分支、裸 `DROP DATABASE` 只做 **升级审批**——它们经常是正当操作，但绝不能无人值守地自动发生。

匹配跑在调用文本的多个规范化视图上，而不是原始字符串：

| 写法 | 是否仍能命中 |
| --- | --- |
| `rm${IFS}-rf${IFS}/` | ✅ `$IFS` 已归一 |
| `r\m -rf /` | ✅ 转义已解码 |
| `"rm" "-rf" "/"` | ✅ 引号已剥离 |
| `echo cm0gLXJmIC8= \| base64 -d \| sh` | ✅ base64 已还原 |
| `# rm -rf / is dangerous` | ✅ 先剥注释（注释不是命令） |

**执行后**审查结果中泄露的密钥与内网信息。默认策略是**就地打码后继续**——扣住用户明确要的信息是敌意行为，而且模型往往只是换个方式再问一次。私钥块是唯一例外，整体扣留：部分打码会让活的密钥字节留在原地。

### 防篡改日志

每条决策都追加进 HMAC 哈希链：`hash = HMAC-SHA256(key, canonical(entry))`，且 `entry.prev` 指向前一条的 `hash`。另有一份带 MAC 的锚点文件记录期望的条目数与链头哈希——这正是**截断**可被检测的原因：裸链看不见截断，因为任何合法链的前缀本身也是合法链。

`/security verify` 会报出日志**第一个**不再可信的序号，并区分「条目被改」「链接断裂（删除或重排）」「行损坏」「日志被截断」「锚点被重写」五种情况。

```
$ /security verify
Audit chain verified: 412 entries, head 9f3c1a7e…

$ /security verify          # 有人改过文件之后
Audit chain verification FAILED
  entries: 412
  first untrustworthy sequence: 137
  reason: content of seq 137 does not match its recorded hash — the entry was edited
```

## 清单

由 `npm run inventory` 从代码读出，会随 CI 校验。

| | 规则数 | 覆盖方向 |
| --- | ---: | --- |
| 静态体检——行规则 | 60 | 凭据读取、网络回调、混淆、安装脚本、供应链、滥用宿主机、持久化、提权、外传、提示注入、破坏性 |
| 静态体检——关联规则 | 17 | 包级关联：凭据读取 **且** 有出站、混淆 **且** 有回调、安装钩子 **且** 有网络 |
| 运行时护栏——入站规则 | 61 | 破坏性、外传、持久化、提权、SSRF、凭据读取、滥用宿主机、沙箱逃逸、密钥泄露 |
| 运行时护栏——出站规则 | 20 | 密钥泄露、SSRF、滥用宿主机 |
| **合计** | **158** | |

护栏动作分布：**34 条拒绝**、**23 条升级审批**、**4 条仅记录**。

对外面：**4 个工具**（`security_scan_audit`、`security_scan_status`、`security_scan_log`、`security_scan_verify`）与 **1 个命令**（`/security audit|status|log|verify|rules`）。

## 安装

npm 上的 `dsh-security-scan` 已确认未被占用，是计划中的发布名。在正式发布之前，请从仓库地址安装：

```sh
dsh plugin add https://github.com/JasonQQ/dsh-security-scan
```

仓库地址是 [JasonQQ/dsh-security-scan](https://github.com/JasonQQ/dsh-security-scan)。[`docs/publishing.md`](docs/publishing.md) 写清了 npm 发布，以及市场投稿清单的其余部分。

## 配置

所有键都可选，默认值即为强制模式。**未知键会被拒绝**，并在错误信息里列出可接受取值——`guard.mode` 写错却让护栏静默停在默认状态，是这里最糟糕的失败方式。

```yaml
- insert:
    - id: security-scan
      name: dsh-security-scan
      config:
        guard:
          mode: enforce            # enforce | monitor | off
          rules:                   # 按规则覆盖；以 '*' 结尾的键按前缀匹配
            net.excessive-distinct-hosts: warn
            'persist.*': off
          allowedHosts: []         # 「不是新闻」的目标，例如 ['localhost']
          allowedPaths: []         # 豁免路径前缀
          requireAuditForInstall: false
        output:
          mode: enforce            # enforce | monitor | off
          rules:
            'leak.internal-ip': off
        install:
          blockAtOrBelow: D        # D | C | B | A —— 评级等于或低于此值即拒绝
          allow: []                # 允许放行的包名或 sha256 摘要（即便评级不合格）
          fetch: false             # 是否允许下载 https .tgz 进行体检
          autoAudit: []            # 插件加载时自动体检的路径
        log:
          dir: ~/.dsh/security-scan
          maxBytes: 4194304
          ttlMs: 86400000          # 体检记录的有效期
        report:
          locale: bilingual        # bilingual | en | zh —— 人类可读报告的语言
```

### D 级报告说清楚什么

D 是一个判决，所以报告要先给出判决的理由：**最严重的风险** 章节会点出决定该评级的那一条发现、用大白话说明它的后果，以及让它更糟的事实——它由安装期钩子触发、执行它的代码被混淆过、它还安排了持久化、它会访问实例元数据端点、本次扫描不完整。这些只在结果确实支持时才出现；而「最严重」的判定是确定性的（先看严重度，再看类别影响，再看证据锚点数，最后按 rule id），所以同一次扫描跑两遍会给出同一个风险。

每一句都由扫描结果里已有的事实拼出来，不推断、不生成。

C 级刻意不给这一节：C 的意思是「你来复核一下」，D 的意思是「就是这件事」。

### 语言

报告默认**中英双语**——中文在前。短字段用 ` / ` 连接，较长的说明每种语言各占一行，所以双语报告依然能扫读，而不是变成两倍长。想只要一种语言就把 `report.locale` 设成 `en` 或 `zh`。

有两处**刻意保留英文**：**JSON 报告与审计日志**——它们的字段名就是日志的词汇表，跟着配置走会让已存下来的日志无法 grep；以及**工具描述与系统提示栏区**——它们是给模型的指令，而 harness 自身的提示词就是英文。

**158 条规则**全部带中文文案，按 rule id 分别放在两份 `rules.zh.ts` 里。之后新增而尚未翻译的规则会回退成英文而不是被省略，覆盖率由 `/security status` 报出——缺口表现为一个数字，而不是半份悄悄少了一种语言的报告。

**请从 `monitor` 模式开始。** 它记录每一条决策但不拒绝任何调用，你可以先读 `/security status`，看清自己的日常工作流会撞上哪些规则，再开始拦。第一天就拦人的护栏，第一天就会被关掉。

### allowlist 只回答一个问题

`guard.allowedHosts` 豁免 SSRF 与凭据读取两类的目标——它回答的是「这个主机对我来说不是新闻」，这也是让 `localhost` 上的开发服务器不再每次都弹审批的原因。

但它**刻意不**压制「信号不在主机上」的那些规则。`ssrf.loopback-service-port` 仍然会命中：把 `localhost` 加进白名单的意思是「我的开发服务器」，而不是「共用这个地址的那些服务」——2375 是未鉴权的 Docker daemon（在那台机器上等价于 root），6379 是 Redis。`ssrf.dangerous-scheme`、`ssrf.cloud-metadata`、`ssrf.known-drop-host` 同样永不被豁免，而 `harness.*` 与 `destructive.*` 完全不受这个键影响。

### 如何推翻一次拒绝

拒绝不是终局。`install.allow` 接受包名或内容摘要，命中后会把被拦下的安装放行——并作为独立的 `install-allowed-override` 事件记录在案，带上被它推翻的那个评级。于是这个决定在事后可查，而不是仅仅「可能」。

```yaml
install:
  allow:
    - dsh-security-scan                      # 按包名
    - sha256:3b039178431e4875eb942ce7babc…   # 或按被体检内容的确切字节
```

摘要形式是更强的声明：它放行的是某一个制品，而不是某一个名字。没有这个键，D 级判定就永远无法被接受——`blockAtOrBelow` 是下限，而 D 已经是最差的等级——而一个无法与之讲理的闸门，最终会被卸载。

只有一个环境变量有意义：

- `DSH_SECURITY_SCAN_KEY` —— 64 个十六进制字符，用它替代磁盘上的 `audit.key` 作为审计日志的 HMAC 密钥。把密钥移出日志目录能显著抬高篡改门槛。

## 零运行时依赖

编译产物**只 import `node:` 内置模块**——每次 CI 都会校验，`npm run inventory` 也会打印：

```console
$ npm run inventory
Built output imports
  37 distinct module specifiers
  0 non-builtin: none
```

`dependencies` 为空，`peerDependencies` **完全没有**——连官方的 `@deepseek-ai/*` 包都没有声明为 peer（按惯例本该声明）。本插件消费的 harness 接口以结构化类型写在 [`src/dsh.ts`](src/dsh.ts) 里，而不是 import 进来。

本包也不声明任何安装期生命周期脚本，CI 会在这些性质发生变化时直接让构建失败。

一个以缩小供应链攻击面为职责的插件，如果自己带一棵依赖树，既会自我否定，也会让这道闸门本身变成它要度量的那种风险。[`docs/design.md`](docs/design.md) 老老实实写了这么做的代价。

## 边界

依赖它之前请先读 [`SECURITY.md`](SECURITY.md)。简要版：

- **评分为 A 不等于安全。** 它只说明「读过的那些字节里没有规则命中」。部分扫描或二进制载荷会在报告里明确标注。
- **扫描器不把注释当作行为。** 多数规则会跳过没有可执行内容的行，因为文档不是能力；混淆与提示注入两类则明确 opt-in，因为对它们来说注释**本身就是证据**。两个方向的后果都是真的：JSDoc 示例里的凭据路径不是发现，而注释里的隐藏字符仍然是。
- **它会标记签名库。** 一个安全插件必然携带它要抓的那些模式，所以本插件给自己的源码判 **D**，也会拒绝安装自己。这是「言行一致」而不是坏掉了，`install.allow` 就是用来明确接受这一点的。
- **从 registry 安装时，体检绑定的是名字而非内容。** 闸门看不到 npm 或 git 实际会送来的字节。审计记录因此有有效期，拒绝文案也会直说这一点，而不是暗示一个它给不出的保证。
- **哈希链证明的是「被改过」，不是「没被改」。** 同时拿到日志和密钥的人可以重建一条自洽的链。它保证的是：静默修改不可能。
- **`monitor` 模式不提供任何保护。** 它只记录。这就是它的用途。

## 开发

```sh
npm ci --ignore-scripts
npm run typecheck
npm run build
npm test              # 164 个单元 + 集成测试，之后跑对抗性冒烟检查
npm run smoke         # 只跑护栏规则：正常调用必须干净，危险调用必须命中
npm run inventory     # 打印上面引用的那些数字，直接从代码读
```

`npm run smoke` 是对抗性检查，刻意与单元测试分开：它把整份运行时规则目录跑在一批「必须命中」和一批「必须不命中」的调用上，任何误报都会让它失败——会乱叫的护栏，最终会被关掉。

## 许可证

MIT
