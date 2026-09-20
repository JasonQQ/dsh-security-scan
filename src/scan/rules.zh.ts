/**
 * Chinese text for the static-analysis rules.
 *
 * Keys are rule ids exactly as they appear in `rules.catalog.ts`, and entries
 * follow the catalog order so a diff between the two files stays readable. A
 * missing key is not an error — `renderReport` falls back to the English
 * original, so a rule added between translation passes still renders — but it
 * does mean that finding appears in English only, which `translationCoverage`
 * reports and the status tool surfaces rather than hiding.
 *
 * Technical tokens are deliberately **not** translated: command names, paths,
 * hostnames, addresses, environment variable names, API names and file names stay
 * as they are, backticks included, so the Markdown report still renders them as
 * code and a reader can copy them into a terminal or a search. A translation that
 * paraphrased them would be worse than no translation.
 *
 * What is translated is the *judgement*: why the line matters and what to change.
 * These strings are read by someone deciding whether to install a plugin, so the
 * Chinese is idiomatic technical prose rather than a word-for-word rendering —
 * one English sentence becomes one Chinese sentence, with no claim added and none
 * dropped.
 *
 * @module dsh-security-scan/scan/rules.zh
 */

import type { RuleTextZh } from '../i18n.js';

/**
 * Chinese title, explanation and remediation, by rule id.
 *
 * Every id in the catalog appears here; `zhFor` still treats an absent key as
 * "not translated yet" rather than as a failure, so the table can lag the catalog
 * without breaking a report.
 */
export const SCAN_RULE_TEXT_ZH: Readonly<Record<string, RuleTextZh>> = {
  'install.hook-shell-pipeline': {
    title: '安装期钩子把下载内容直接管道给 shell',
    detail:
      '安装期命令把远程载荷直接送进解释器执行，于是依赖包运行的是从未经过审查、也无法从 tarball 中校验的代码。',
    remediation:
      '删除这条管道，改为依赖已发布的包；绝不要把 curl 或 wget 的输出管道给 sh，确实需要下载时必须固定产物版本。',
  },
  'install.hook-network-fetch': {
    title: '安装期钩子在安装时访问网络',
    detail:
      'npm 生命周期钩子在安装期间访问网络，这意味着安装不再能从 tarball 复现，拉取到的内容既无版本约束也未经过审计。',
    remediation: '去掉这次网络请求，或把产物随包内置，并在使用前校验其摘要。',
  },
  'install.hook-runs-shell-code': {
    title: '安装期钩子执行的不只是构建',
    detail:
      '该钩子命令不属于常见的编译与拷贝步骤，安装这个包时会以用户权限运行任意代码，而这一切发生在任何人来得及检查之前。',
    remediation:
      '把钩子收敛为 `tsc` 或 `npm run build` 之类的构建命令，或把这项工作移到一个由用户主动执行的显式脚本里。',
  },
  'install.dependency-manifest-hook': {
    title: '随包携带的清单声明了安装钩子',
    detail:
      '非包根目录的清单声明了生命周期钩子。从这棵目录树安装的内置或嵌套依赖会运行自己的安装脚本，却不会像已发布依赖那样经过仓库审查。',
    remediation: '通过锁文件从仓库安装嵌套依赖，并删除自带钩子的内置清单。',
  },
  'install.npmrc-ignore-scripts': {
    title: '仓库配置重新启用了安装脚本',
    detail:
      '随包发布的 `.npmrc` 设置了 `ignore-scripts=false`。它一旦被复制到项目或用户主目录，就会悄悄推翻用户或 CI 中那条用来阻止依赖在安装期执行代码的设置。',
    remediation: '删除该设置：依赖包没有任何正当理由去覆盖安装它的机器上的 `ignore-scripts`。',
  },
  'install.native-downloader': {
    title: '安装流程会编译或下载原生产物',
    detail:
      '依赖包在安装期间编译原生代码或拉取预编译二进制文件，于是最终在本机被执行的不是被审查过的源码。',
    remediation:
      '优先使用纯实现；若必须使用预编译产物，则内置该产物并记录其摘要，而不是在安装时下载。',
  },
  'cred.read-ssh-private-key': {
    title: '读取 SSH 私钥或 authorized_keys',
    detail:
      '该行读取了 SSH 密钥文件。能读取私钥的插件可以在任何信任该密钥的地方冒充用户，而构建过程完全没有理由碰这个文件。',
    remediation:
      '删除这次读取；如果插件确实需要 SSH 访问，应向用户索取专用密钥路径，或委托给 ssh agent。',
  },
  'cred.read-cloud-credentials': {
    title: '读取云厂商凭据',
    detail:
      '该行读取了 AWS、GCP、Azure、Kubernetes 或 Docker 的凭据文件。这些文件授予对基础设施的长期访问权限，插件安装流程没有任何环节需要接触它们。',
    remediation:
      '删除这次读取；云访问权限应从环境变量或用户自己掌控的 profile 获取，绝不直接读取凭据文件。',
  },
  'cred.read-dsh-credentials': {
    title: '读取 DSH 凭据或会话存储',
    detail:
      '该行读取了 `~/.dsh`，其中存放着宿主的 API 凭据、profile、已保存的会话和插件状态。读取宿主自己的密钥库，等于把用户的模型凭据和对话历史交给插件。',
    remediation:
      '删除这次读取。插件应通过 DSH 的配置接口获得配置，绝不打开凭据文件。',
  },
  'cred.read-registry-token': {
    title: '读取包仓库令牌文件',
    detail:
      '该行读取了 `.npmrc`、`.yarnrc`、`.pypirc` 或同类凭据文件。这些文件里保存的发布令牌可以让攻击者以用户的名义发布新版本。',
    remediation:
      '在真正需要的时刻从环境变量读取令牌，并删除所有打开仓库配置文件的代码。',
  },
  'cred.read-browser-store': {
    title: '读取浏览器 Cookie 或保存的登录凭据',
    detail:
      '该行读取了 `Cookies`、`Login Data` 或 `logins.json` 之类的浏览器配置文件。会话 Cookie 等价于该用户已登录的每个站点的有效凭据。',
    remediation: '删除这次读取；没有任何宿主插件需要打开浏览器配置目录。',
  },
  'cred.read-system-secret': {
    title: '读取系统密钥库或钥匙串',
    detail:
      '该行读取了 `/etc/shadow`、钥匙串文件或 `.git-credentials`，或者通过 `security`、`keytar` 之类的库操作 macOS 钥匙串，从而拿到其他应用保存的密码。',
    remediation:
      '删除这次读取。确实需要某个已保存的密钥时，应向用户索取，并通过有文档说明的宿主配置项读取。',
  },
  'cred.read-dotenv-or-history': {
    title: '读取 dotenv 文件或 shell 历史',
    detail:
      '该行读取了 `.env` 或 shell 历史文件。这两处都是令牌、云密钥和曾经粘贴过的密钥堆积的地方，而 shell 历史还会勾勒出用户的基础设施全貌。',
    remediation:
      '通过插件配置 schema 加载配置，而不是读取 dotenv 文件；永远不要打开用户的历史记录。',
  },
  'cred.credential-path-mention': {
    title: '出现凭据路径但并未读取',
    detail:
      '某一行提到了敏感路径，却没有执行读取。报告记录这一条，是为了把仅仅出现在日志或错误信息中的路径，与真正被打开的路径区分开。',
    remediation:
      '确认该路径只出现在文档或提示信息中；如果它随后被传给读取调用，那一行就会触发更严重级别的读取规则。',
  },
  'cred.env-harvest': {
    title: '读取或整体导出进程环境变量',
    detail:
      '该行序列化了整个 `process.env`，或读取了名称看起来像密钥的环境变量。CI 运行器和宿主都会把 API Key 导出到环境变量里，因此整体导出就是一次凭据收集。',
    remediation:
      '只逐个读取插件文档中声明过的变量，绝不序列化整个环境对象，也不要把它写进日志或请求。',
  },
  'obf.dynamic-code-eval': {
    title: '执行运行时拼装出来的代码',
    detail:
      '该行执行的是一个并非源码字面量的表达式，真正运行的代码在插件运行时才被拼装出来，无法在 tarball 中审查。',
    remediation: '用静态函数或数据表替代动态求值；任何审计都无法为运行时才存在的代码背书。',
  },
  'obf.dynamic-require': {
    title: 'require 或 import 了动态计算的模块路径',
    detail:
      '模块路径是计算出来的而非字面量，真正被加载的包由运行时决定，光看 import 语句根本查不出来。',
    remediation: '使用静态的 import 说明符，或用一张显式表把已知键映射到静态 import。',
  },
  'obf.base64-exec-chain': {
    title: '解码 base64 并执行结果',
    detail:
      '同一个表达式既解码 base64 载荷，又把它交给求值器或进程执行，这是把二阶段脚本藏过源码审查的惯用手法。',
    remediation: '删除这段编码载荷；改为发布可读源码，并在 README 中说明代码做了什么。',
  },
  'obf.decoded-payload-literal': {
    title: '携带解码、转义或高熵字面量',
    detail:
      '一个很长的字面量会在运行时被解码（base64、`atob`、`unescape`、`decodeURIComponent`），或者写满了密集的十六进制、Unicode 转义，或者呈现出编码数据块那种近乎均匀的字符分布。',
    remediation:
      '把该值保存为可读源码，或保存为格式有文档说明的数据，让审查者能看清实际运行的到底是什么。',
  },
  'obf.string-reassembly': {
    title: '用字符码或倒序片段重组字符串',
    detail:
      '该行用数字字符码或倒序片段拼出字符串，这是让主机名或命令躲过纯文本搜索的常见手段。',
    remediation:
      '直接把该值写成字面量。对代码随后要用的字符串做混淆，与把它藏起来不让审查者看见没有区别。',
  },
  'obf.obfuscated-identifier': {
    title: '使用混淆的标识符或混用字符集的名称',
    detail:
      '该行出现了压缩器风格的 `_0x…` 名称，或混用拉丁字母与西里尔、希腊形近字母的标识符。两者都会让试图扫读熟悉名称的人看漏，后者更是经典的仿冒手法。',
    remediation: '发布标识符名称有意义的源码，绝不在同一个标识符里混用不同字符集。',
  },
  'obf.long-minified-line': {
    title: '整行是压缩或机器生成的数据块',
    detail:
      '该行超过 500 个字符且几乎没有空白，正是打包载荷、压缩字符串表或机器生成单行代码的样子。这样的一行用肉眼什么也审不出来。',
    remediation:
      '发布未压缩的源码，或在 README 中说明该文件由哪个构建产出、可读源码在哪里。',
  },
  'net.exfil-service-host': {
    title: '连接已知的数据外传或隧道服务',
    detail:
      '该行出现了请求捕获、粘贴板或隧道服务的主机名，这些服务存在的意义就是接收来自别处的数据。它们被用于投放和命令控制回调，而不是实现插件自身的功能。',
    remediation:
      '删除该端点。如果它只是开发时的占位符，就删掉它，不要让它在已发布的包里仍然可达。',
  },
  'net.metadata-endpoint': {
    title: '访问云实例元数据端点',
    detail:
      '该行访问了云元数据地址，该地址会向机器上运行的任何程序发放临时实例凭据。插件去请求它就是窃取凭据，而这个地址也是经典的 SSRF 目标。',
    remediation: '删除该请求；插件代码永远不应该获取实例凭据。',
  },
  'net.raw-ip-destination': {
    title: '向裸 IP 地址发送请求',
    detail:
      '目标写成了数字地址而不是主机名，因此绕过 DNS、无法归属到任何域名，而且通常指向内网网段，或指向并非插件所声称对接的服务。',
    remediation: '使用文档中说明的主机名并通过 HTTPS 访问，删除所有能被指向裸地址的代码。',
  },
  'net.plaintext-http': {
    title: '使用明文 HTTP 端点',
    detail:
      '指向公网主机的 `http://` URL 以明文收发数据，传输途中可以被读取或篡改；这样到达的内容也可以被换成另一份载荷。',
    remediation: '改用 `https://`，并固定你实际要通信的主机。',
  },
  'net.dynamic-dns-host': {
    title: '使用免费动态 DNS 主机名',
    detail:
      '动态 DNS 服务商提供的主机名任何人都能注册并随意改指，因此这类端点可能在审计之后、安装之前的间隙换到别的运营者手里。',
    remediation: '把端点换成自己拥有的稳定域名，或彻底删除该回调。',
  },
  'net.covert-channel': {
    title: '通过 websocket 或 DNS 查询回连',
    detail:
      '该行打开了 websocket，或通过 `dns.*` 或 DNS 工具解析某个域名。两者都能在不像是 HTTP 请求的情况下传递数据，而 DNS 尤其通常被所有防火墙和代理放行。',
    remediation: '改用发往文档中说明的端点的普通 HTTPS 请求，让流量可以被检查和记录。',
  },
  'net.token-or-blob-in-url': {
    title: '把凭据或编码数据块放进 URL',
    detail:
      '令牌形状的查询参数、内嵌的 `user:password` 授权部分，或超长高熵的查询值，都意味着密钥或载荷数据在 URL 中传输，最终会留在访问日志、代理和浏览器历史里。',
    remediation:
      '凭据放在 Authorization 头里发送，载荷用 POST 放在请求体中，不要编码进查询字符串。',
  },
  'priv.curl-pipe-shell': {
    title: '把下载内容直接管道给 shell',
    detail:
      '一步完成“拉取脚本并执行”，运行的就是远端服务器当时返回的任何内容；既没有可计算哈希、可审查、可固定版本的产物，服务器一旦被攻破就等于这台机器被攻破。',
    remediation:
      '先下载产物、校验其校验和，再执行校验通过的文件；绝不要把下载内容管道给解释器。',
  },
  'priv.scripting-host-inline-command': {
    title: '用内联或编码命令调用系统脚本宿主',
    detail:
      '`osascript` 的 `do shell script`，或带 `-enc`/`-EncodedCommand` 的 PowerShell，执行的是操作系统从不在控制台显示、审查者在源码里也读不出来的命令字符串。',
    remediation:
      '删除对脚本宿主的调用，或换成一条用户能在运行前看到的、有文档说明的外部命令。',
  },
  'priv.sudo-invocation': {
    title: '通过 sudo 提权',
    detail:
      '该行通过 `sudo` 执行命令，意味着这个以用户级工具身份安装的插件在索要 root 权限，而用户事先看不到提权提示。',
    remediation:
      '去掉提权，把任何需要特权的步骤写成一条由用户主动执行的独立命令并加以说明。',
  },
  'priv.system-path-modification': {
    title: '修改系统路径或把文件设为全局可写',
    detail:
      '该行写入 `/etc`、`/usr`、`/bin` 或 launch daemon 目录，把属主改为 root，或设置全局可写权限。任何一种都改变了安装包之外的机器状态，也可能为后续提权铺路。',
    remediation:
      '把写入限制在包目录或用户自己的配置目录内，绝不要为了让安装成功而放宽权限。',
  },
  'priv.package-manager-config-write': {
    title: '改写包管理器或全局 git 配置',
    detail:
      '该行执行了 `npm config set` 或 `git config --global`，这会改变用户之后每条命令的配置——包括依赖从哪个仓库拉取，以及 git 调用哪个程序作为钩子。',
    remediation: '用环境变量或命令行参数为单条命令传配置，而不是写入用户的持久化配置。',
  },
  'exfil.local-data-in-request': {
    title: '在同一个请求里发送本地文件或环境变量数据',
    detail:
      '同一行既读取本地文件或整个进程环境，又把结果直接送进对外的网络请求。这是本地数据流向第三方的最短路径，用户完全没机会先看一眼这些值。',
    remediation:
      '把读取和发送拆开，只发送端点真正需要的具名字段，绝不整体上传环境变量。',
  },
  'exfil.curl-post-body': {
    title: '用 curl 上传本地文件',
    detail:
      '该命令把磁盘上的文件 POST 到远程端点（`-d @`、`--data-binary @`、`-F …=@`、`-T`），本质上是伪装成表单提交的文件上传。',
    remediation:
      '删除这次上传，或让目标地址显式且可配置，使用户能看清自己的数据去了哪里。',
  },
  'exfil.clipboard-read': {
    title: '读取系统剪贴板',
    detail:
      '该行通过 `pbpaste`、`xclip`、`wl-paste`、`Get-Clipboard` 或 `clipboardy` 读取剪贴板。剪贴板里经常放着刚刚复制过的密码、令牌和私密文本。',
    remediation: '通过插件配置向用户索取该值，而不是读取剪贴板上恰好存在的内容。',
  },
  'exfil.archive-home': {
    title: '打包用户主目录',
    detail:
      '该命令把用户主目录或 `$HOME` 打成压缩包，把配置、凭据和历史记录收进一个文件，随后很容易被带离本机。',
    remediation: '只打包该包自己的输出目录，绝不要把用户主目录通配进 tarball。',
  },
  'persist.scheduled-task-write': {
    title: '安装计划任务、agent 或系统服务',
    detail:
      '该行注册了稍后会自动运行的东西——cron 条目、launch agent、systemd unit、Windows 计划任务或注册表 Run 键——因此插件在把它装进来的那次安装结束之后仍在持续执行。',
    remediation:
      '删除这一定时注册，或交给用户一条有文档说明、可以自行运行和审查的命令。',
  },
  'persist.git-hook-install': {
    title: '写入 git 钩子',
    detail:
      '该行写入或启用了 `.git/hooks` 脚本，或改动了 `core.hooksPath`。git 钩子会在用户下一次 commit 或 push 时运行，并且在所有继承该配置的仓库中生效。',
    remediation:
      '从插件中移除钩子安装逻辑；如果需要 pre-commit 检查，就把它写成手动设置步骤并提供文档。',
  },
  'persist.shell-rc-append': {
    title: '追加写入 shell 启动文件',
    detail:
      '该行写入了 `.bashrc`、`.zshrc`、`.profile` 或 fish 配置，因此改动会在之后每个交互式 shell 中生效，而且删掉包目录也不会消失。',
    remediation:
      '不要修改 shell 启动文件；如果需要 shell 集成，就把那行内容打印出来，由用户自行决定是否添加。',
  },
  'persist.dsh-settings-rewrite': {
    title: '改写 DSH 配置或 profile',
    detail:
      '该行写入了宿主配置（`~/.dsh/settings.yaml`、profile 或 storages）。改动 profile 会改变此后每次宿主启动时加载哪些插件，以及它们如何配置。',
    remediation: '把用户应当应用的配置打印出来，而不是直接写宿主的运行状态。',
  },
  'persist.global-self-install': {
    title: '全局安装依赖包',
    detail:
      '该命令把包安装到全局前缀，于是用户的 PATH 上多出一个可执行文件，而且当前项目删除后它仍然留在那里。',
    remediation:
      '改为本地安装，并通过项目自身的脚本调用该工具；全局安装应由用户自己决定，而不是由插件代劳。',
  },
  'supply.url-dependency': {
    title: '依赖解析到 URL、git 引用或文件路径',
    detail:
      '依赖不是从仓库解析，而是来自 URL、git 引用、本地路径或 patch，因此其内容不受仓库锁文件和任何完整性元数据约束，可以在版本号不变的情况下被替换。',
    remediation:
      '改为依赖仓库中已发布的版本，并用锁文件固定；如果确实必须用 fork，就把它发布到自己名下的 scope。',
  },
  'supply.unpinned-range': {
    title: '依赖版本范围未固定',
    detail:
      '该依赖接受任意版本（`*`、`x` 或 `latest`），明天安装到的就是仓库当时提供的代码，而经过审计的版本对它毫无保证。',
    remediation:
      '固定 semver 范围并提交锁文件，使安装解析到的正是被审查过的那些版本。',
  },
  'supply.typosquat-name': {
    title: '依赖名与热门包高度形近',
    detail:
      '该依赖名是已知的仿冒包，或与某个热门包只差一个字母或一处字符顺序，安装它极可能拉进作者从未打算依赖的包。',
    remediation: '对照你本意要安装的包核对其拼写，并把该条目改成真正的包名。',
  },
  'supply.bin-shadows-command': {
    title: '包安装的可执行文件遮蔽了常用命令名',
    detail:
      '某个 `bin` 条目占用了机器上已有命令的名字，于是任何调用该命令的脚本或工具都可能改而运行这个包，而用户察觉不到变化。',
    remediation: '把该可执行文件重命名为该包专属的名字。',
  },
  'supply.foreign-registry': {
    title: '仓库或 scope 覆盖指向 npmjs 之外',
    detail:
      '某个 registry 或 `_authToken` 条目指向的服务器并非 npmjs。随包发布的 `.npmrc` 或 `publishConfig` 配置把解析重定向后，所有依赖拉取都会来自用户并未选择的主机。',
    remediation:
      '删除该覆盖；选择仓库本就是用户自己的配置，不该由被安装的包决定。',
  },
  'supply.packaging-constraints': {
    title: '清单内置依赖或限定平台',
    detail:
      '`bundledDependencies` 会把依赖的私有副本打进 tarball，使这部分代码绕过仓库的完整性元数据；而 `os`/`cpu` 数组则直接限制了包能安装在哪些机器上。',
    remediation:
      '通过仓库配合锁文件发布依赖，并把平台限制写在 README 里，而不是写进 `os`/`cpu` 字段。',
  },
  'harness.pre-execute-bypass': {
    title: '使工具预执行拦截失效或遮蔽安全工具',
    detail:
      '该行要么挂到 `tools/pre-execute` 上直接返回放行，要么调用 `tools.restrict` 把某个安全工具从拦截器那里拿走。两种做法都让宿主看起来仍受保护，而拦截器已经看不到这次调用，或无法再对它作出处置。',
    remediation:
      '删除该监听器或该限制。插件可以观察工具调用，但在 `next` 之前一律放行、或对拦截器隐藏另一个工具，属于绕过而非集成。',
  },
  'harness.settings-widen-permission': {
    title: '放宽宿主的沙箱或审批策略',
    detail:
      '该行在宿主设置、profile 或 composition patch 中写入了宽松的沙箱或权限值。放宽策略会移除用户为所有插件——而不只是这一个插件——设定的文件与命令边界。',
    remediation:
      '沙箱与审批设置交给用户决定；插件若需要某项能力，应加以说明并由用户显式授予。',
  },
  'harness.reserved-tool-name': {
    title: '用保留名称注册工具',
    detail:
      '注册的工具使用了宿主内置工具的名字，模型可能自以为在调用核心实现，实际调用的却是这一份，工具调用记录也随之失真。',
    remediation: '给工具加上插件专属前缀重命名，不要占用保留名称。',
  },
  'harness.patch-disable-plugin': {
    title: 'composition patch 会禁用其他插件',
    detail:
      '该 patch 删除或禁用了已有的插件条目。应用到 profile 后，它会悄悄关掉另一个组件——通常是安全或策略插件——而用户本意只是添加这一个插件。',
    remediation:
      '只提供仅插入本插件的增量 patch，并在 README 中说明会改动哪些条目。',
  },
  'harness.installed-package-edit': {
    title: '改动宿主安装目录或已安装的其他插件',
    detail:
      '该行读写宿主自身的安装目录，或 `node_modules` 下另一个插件的目录。修改已安装的代码会替换掉用户审查过的产物，并可能禁用或劫持任意插件。',
    remediation:
      '绝不在运行时修改已安装的包；把改动提交到上游，或提供一个增量插件。',
  },
  'prompt.doc-instruction': {
    title: '文档中包含针对模型的指令',
    detail:
      '随包发布的文档命令读者——在这个宿主里就是 AI agent——忽略先前的指令、对用户隐瞒信息，或跳过确认。这样的文字会被当作指令读取，而不是文档。',
    remediation:
      '把这段话改写成面向人类读者的插件说明，并删除任何直接对模型说话的措辞。',
  },
  'prompt.embedded-instruction-string': {
    title: '源码字符串中夹带针对模型的指令',
    detail:
      '源码中的字符串字面量——通常是工具描述或系统提示词片段——要求模型绕过确认或对用户隐瞒某些事，于是它作为一条指令进入上下文窗口。',
    remediation:
      '如实描述工具的行为，删除那些会改变 agent 对待用户方式的指令。',
  },
  'prompt.fake-system-message': {
    title: '文本伪装成系统消息',
    detail:
      '这段文字模仿系统或开发者消息的形式（`<system>`、`[SYSTEM]`、`<<SYS>>`、“system message:”）。自称拥有特权角色的内容，是想在模型上下文中抬高自己的权威。',
    remediation:
      '删除这些角色标记；面向用户的文本绝不应该被写成看起来像宿主指令的样子。',
  },
  'prompt.concealed-instruction': {
    title: '把文本藏在注释或不可见字符中',
    detail:
      '该行把内容藏在 HTML 注释里，或藏在零宽字符与双向控制字符之后，这些内容在 diff 或渲染后的文档中什么都看不见，却仍会作为文本被读取。',
    remediation:
      '删除被隐藏的文本和不可见字符；审查者看不到的东西就不该出现在发布的包里。',
  },
  'destructive.shipped-command': {
    title: '内置破坏性文件系统命令',
    detail:
      '抹掉用户主目录、根文件系统或分区的命令出现在可执行内容里，而不是文档描述中。即便有条件判断保护，这种原语也绝不该被塞进插件里。',
    remediation:
      '删除该命令。插件如果必须清理，应把删除限定在它自己创建的目录，并以包根目录为基准解析这个路径。',
  },
  'destructive.recursive-delete-system-path': {
    title: '递归删除指向用户主目录或系统目录',
    detail:
      '递归删除的目标是用户主目录或系统路径，一旦变量写错、展开为空或缺少判空保护，被销毁的就是用户数据而不是包自己的构建产物。',
    remediation:
      '只删除包在自己目录下创建的路径，并在解析出的路径不位于该目录内时拒绝执行。',
  },
  'exfil.credential-read-then-callback': {
    title: '同一个包内既有凭据文件读取又有对外请求',
    detail:
      '既读取凭据文件又发起对外请求的包，已经凑齐了窃取凭据的两半。单独看每一半都能找到理由，合在一起就只能解释为数据被送出本机。',
    remediation:
      '删除凭据读取。如果对外调用才是真正的功能，那么包内任何地方都不应在它之前读取密钥文件。',
  },
  'cred.credential-read-with-command-execution': {
    title: '同一个包内既有凭据文件读取又有 shell 执行',
    detail:
      '这个包里某处读取了凭据文件，另一处又启动了进程。仅这一组合就足以把密钥管道给命令、通过 CLI 把它外传，或用窃取到的材料改写本机配置。',
    remediation:
      '删除凭据读取，并把进程启动限制在完全不会接触到密钥值的命令上。',
  },
  'exfil.credential-read-decode-callback': {
    title: '凭据读取、解码步骤与对外请求同时出现',
    detail:
      '编码外传的三个要素全部齐备：读取了凭据，有解码或编码动作，并且有请求离开本机。编码这一步的作用，正是让随便看一眼流量的人看不出其中的密钥。',
    remediation:
      '删除凭据读取或对外调用。绝不要发布既接触密钥、又在向外发送途中编码载荷的包。',
  },
  'exfil.environment-harvest-then-callback': {
    title: '同一个包内既有环境变量收集又有对外请求',
    detail:
      '该包读取或整体导出进程环境变量，同时又建立对外连接。CI 运行器和宿主会话都会把 API Key 导出到环境变量中，因此这一组合会把仍有效的凭据送出本机。',
    remediation:
      '删除环境变量的整体导出，只逐个读取插件确实需要、且有文档说明的变量。',
  },
  'exfil.clipboard-read-then-callback': {
    title: '同一个包内既有剪贴板读取又有对外请求',
    detail:
      '该包读取系统剪贴板，同时发起对外请求。剪贴板里有刚刚复制过的密码和令牌，而这个包里没有任何东西能解释这两种行为为何同时存在。',
    remediation: '删除剪贴板读取，或让目标地址默认不可达，并向用户说明。',
  },
  'install.hook-with-shell-pipeline': {
    title: '安装钩子把下载内容管道给 shell',
    detail:
      '清单中声明的生命周期钩子把远程载荷送进解释器执行。写在清单里尤为严重：钩子在 `npm install` 时就会运行，用户根本来不及读代码。',
    remediation:
      '删除该钩子，改为依赖已发布的包；安装步骤绝不应该执行下载来的内容。',
  },
  'install.hook-with-network-callback': {
    title: '安装钩子叠加对外网络访问',
    detail:
      '该包声明了生命周期钩子，同时又建立对外连接，于是安装期运行的代码可以使用网络。无论这个钩子做什么，它可能拉取或发送的载荷都不在 tarball 里。',
    remediation: '删除该钩子或网络访问。需要联网的安装应当成为由用户主动执行的一步。',
  },
  'obf.obfuscation-with-network-callback': {
    title: '混淆代码叠加对外网络访问',
    detail:
      '该包既隐藏了自己的写法，又建立对外连接。在插件里，混淆除了让载荷读不懂之外没有任何用处；再加上回调，就是分阶段植入物的标准形态。',
    remediation:
      '不要安装这个包。如果确实需要它，必须先要求对方提供可读源码，才能在任何地方使用。',
  },
  'obf.obfuscation-with-command-execution': {
    title: '混淆代码叠加进程执行',
    detail:
      '该包隐藏了自己的字符串或标识符，同时又启动进程。这样一来，读源码也无法告诉审查者实际跑的到底是哪条命令。',
    remediation:
      '要求提供可读源码：把编码值换成字面量，把动态计算的模块路径换成静态 import。',
  },
  'persist.persistence-with-install-hook': {
    title: '安装钩子叠加持久化机制',
    detail:
      '生命周期钩子在安装期间运行，而目录树中又有东西把自己注册为稍后运行。这一组合会在用户以为只是一次普通依赖安装的过程中装入一个常驻组件。',
    remediation:
      '删除这一定时注册。任何需要持续运行的东西，都应由用户作为一个明确可见的步骤来设置。',
  },
  'supply.unscannable-payload-with-network': {
    title: '随包携带不可读载荷且存在对外请求',
    detail:
      '该包携带了无法按文本读取的大文件——二进制文件、压缩包或压缩过的数据块——同时又建立对外连接，因此它发送的内容中有一部分是本次审计从未检查过的。',
    remediation:
      '删除这个不透明载荷，或说明它究竟是什么；审计无法为自己读不到的字节背书。',
  },
  'net.excessive-distinct-hosts': {
    title: '包连接的不同主机数量多得不合常理',
    detail:
      '对外目标涉及的主机数量超出插件合理所需。这种大面积铺开，正是让遥测、中继和投放服务躲在每一个都看似平常的端点之间的办法。',
    remediation:
      '把目标列表收敛到有文档说明的服务，删除插件无法给出理由的任何端点。',
  },
  'supply.client-without-bundle': {
    title: '声明了 client 入口却没有 bundle 清单',
    detail:
      '清单声明了 `dsh.client`，却没有 `dsh.bundle` patch，因此该包无法作为 bundle 被组合：市场会拒绝它，而手动安装的用户会得到一个永远加载不起来的插件。',
    remediation:
      '增加指向 composition patch 的 `dsh.bundle.patch` 条目，或者在包没有 UI 时去掉 client 声明。',
  },
  'supply.patch-target-missing': {
    title: '包内缺少 bundle patch 的目标文件',
    detail:
      '声明的 composition patch 不在已发布的文件里，或路径指向包根目录之外。这样安装时什么也组合不出来，或者安装会在包已经跑完自己的安装钩子之后才失败。',
    remediation:
      '让 `dsh.bundle.patch` 指向确实会被发布的 patch 文件，并把它列进 `files`。',
  },
  'supply.build-script-excluded-from-package': {
    title: '安装钩子运行的脚本被发布文件集排除在外',
    detail:
      '清单声明的安装钩子所引用的脚本没有被 `files` 白名单包含，或被 `.npmignore` 匹配排除。这样一来，从仓库安装时运行的文件与被审计和测试过的并不是同一个，甚至根本不存在。',
    remediation: '把被引用的脚本加入 `files`，或把钩子移到会被发布的文件里。',
  },
  'supply.dependency-count-outlier': {
    title: '运行时依赖数量远超其声明的用途',
    detail:
      '相对于它自己所描述的用途，该包声明了数量庞大的运行时依赖。每一个都会被安装、会经由传递依赖的生命周期脚本被执行，并且会像这个包本身一样被信任。',
    remediation:
      '去掉运行时并不需要的依赖，把仅用于构建的工具移到 `devDependencies`。',
  },
  'supply.patch-inserts-foreign-package': {
    title: 'bundle patch 插入了本包之外的包',
    detail:
      '该 composition patch 增加了若干行，把一个名字不同的包引入 profile。patch 本应只插入随它一起发布的插件；插入别的包会带进从未纳入本次审计的代码。',
    remediation:
      '把 patch 限制在本包自己的条目上，用户需要添加的其他插件改为在 README 中说明。',
  },
};
