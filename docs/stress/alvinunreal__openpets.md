> 批量压测 / Batch stress test · ★ 1214 · `alvinunreal/openpets#packages/dsh`
> https://github.com/alvinunreal/openpets/tree/main/packages/dsh · audited in 17.5s
# 安装前体检 / Pre-install audit: @open-pets/dsh@3.5.0

**信任评级 / Trust grade: B** (评分 / score 78/100 — 有轻微信号，建议复核 / minor signals, review recommended)

- 来源 / Source: `https://codeload.github.com/alvinunreal/openpets/tar.gz/HEAD` (URL / url)
- 已分析文件：7 个（14.4 KiB） / Files analysed: 7 (14.4 KiB)
- 内容摘要 / Content digest: `21c7453e997294289c3d98ccad32acb1…`
- 体检时间 / Audited at: 2026-09-20T09:52:31.394Z

## 安装期脚本 / Install-time scripts

未声明。该包不会在安装它的机器上自动执行任何东西。 / None declared. Nothing in this package runs automatically on the machine that installs it.

## 该插件能触及什么 / What this plugin can reach

- **读取的文件路径 / File paths read:** `package.json`
- **写入的文件路径 / File paths written:** （无） / (none)
- **派生的命令 / Commands spawned:** （无） / (none)
- **连接的域名 / Domains contacted:** `github.com`, `private.example.test`, `8.8.8.8`
- **读取的环境变量 / Environment variables read:** `OPENPETS_REMOTE_ENDPOINT`, `OPENPETS_REMOTE_TOKEN`

## 发现 / Findings

### 高 / HIGH (1)

- **高 / HIGH** `supply.url-dependency` — 依赖解析到 URL、git 引用或文件路径 / Dependency resolves to a URL, git ref or file path
  中 依赖不是从仓库解析，而是来自 URL、git 引用、本地路径或 patch，因此其内容不受仓库锁文件和任何完整性元数据约束，可以在版本号不变的情况下被替换。
  EN A dependency is resolved from a URL, a git reference, a local path or a patch instead of the registry, so its contents are not covered by the registry lockfile or by any integrity metadata and can change without a version bump.
  - `package.json:49` — `"@open-pets/agent-events": "workspace:*",`
  - `package.json:50` — `"@open-pets/client": "workspace:*"`
  中 修复：改为依赖仓库中已发布的版本，并用锁文件固定；如果确实必须用 fork，就把它发布到自己名下的 scope。
  EN Fix: Depend on a published version from the registry, pinned by a lockfile; if a fork is unavoidable, publish it under your own scope.

### 低 / LOW (2)

- **低 / LOW** `cred.many-secret-env-vars` — 读取多个不同名称的密钥类环境变量 / Reads several differently-named secret environment variables
  中 这里的一行、或整个包里的若干行，读取了名称看起来像凭据的环境变量。只读一个文档中声明的 key 是插件本该有的认证方式；枚举多个不同名称的密钥，则是在收集凭据而不是在使用凭据。
  EN One line here, or several across the package, read environment variables whose names look like credentials. Reading a single documented key is how a plugin is meant to authenticate; enumerating many differently-named ones is how credentials are gathered rather than used.
  - `src/runtime.test.ts:99` — `process.env.OPENPETS_REMOTE_TOKEN`
  - `src/runtime.test.ts:101` — `process.env.OPENPETS_REMOTE_TOKEN`
  中 修复：只保留插件确实需要且有文档说明的变量，删掉与任何功能无关的密钥读取。
  EN Fix: Keep to the variables this plugin documents and needs, and delete reads of keys it has no feature for.
- **低 / LOW** `net.raw-ip-destination` — 向裸 IP 地址发送请求 / Sends a request to a bare IP address
  中 目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。
  EN The destination is written as a numeric address rather than a hostname, so it bypasses DNS, cannot be attributed to a domain, and usually points at a private range or a host that is not the service the plugin claims to talk to.
  - `src/runtime.test.ts:100` — `process.env.OPENPETS_REMOTE_ENDPOINT = "tcp://8.8.8.8:37645";`
  中 修复：使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。
  EN Fix: Use the documented hostname over HTTPS, and remove any code that can be pointed at a raw address.

_按类别 / By category:_ 供应链 / supply chain 1 · 凭据读取 / credential access 1 · 网络回调 / network callbacks 1

## 扫描说明 / Scan notes

- scoped to the subdirectory `packages/dsh/`
- stripped the archive's single top-level directory `openpets-HEAD/`
- outbound fetching was permitted for this audit

---

高评级表示这份规则目录中没有命中，并不等于该包安全。静态分析看不到运行期才拼装出来的行为；部分扫描已在上方标注。 / A high grade means no rule in this catalog fired, not that the package is safe. Static analysis cannot see behavior assembled at runtime, and a partial scan is marked as such above.
