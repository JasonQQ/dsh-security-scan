/**
 * Chinese text for the runtime-guard rules.
 *
 * Keys are rule ids exactly as they appear in `rules.catalog.ts`, covering both
 * the input rules and the output rules, in catalog order. A missing key is not an
 * error — the rendering falls back to the English original — but it does mean
 * that detection is reported in English only, which `translationCoverage` reports
 * and the status tool surfaces rather than hiding.
 *
 * Technical tokens are deliberately **not** translated: command names, paths,
 * hostnames, addresses, environment variable names, API names and tool names stay
 * as they are, backticks included. A developer whose call was just refused needs
 * to be able to copy the quoted match into a shell or a search, and paraphrasing
 * it would defeat the fix advice entirely.
 *
 * Register matches the English: an input-rule `title` is a short phrase naming
 * what was seen, an output-rule `title` is a noun phrase naming what leaked,
 * `detail` says why it matters and `remediation` says what to change instead.
 *
 * @module dsh-security-scan/guard/rules.zh
 */

import type { RuleTextZh } from '../i18n.js';

/**
 * Chinese title, explanation and remediation, by rule id.
 *
 * Entries are grouped as the catalog is: the sixty-one input rules first, then
 * the twenty output rules.
 */
export const GUARD_RULE_TEXT_ZH: Readonly<Record<string, RuleTextZh>> = {
  // -------------------------------------------------------------------------
  // Input rules — run before a tool executes.
  // -------------------------------------------------------------------------

  'destructive.rm-root': {
    title: '递归删除指向文件系统根目录或主目录',
    detail:
      '该调用对 `/`、`/*`、`~`、`$HOME` 或 `${HOME}` 使用 `-r`/`-f`。shell 也可能在命令执行前把未设置的变量展开成 `/`，而 `--no-preserve-root` 会移除最后一道防线，因此这无法恢复。',
    remediation:
      '只写你真正拥有的那个目录（`rm -rf ./build` 或明确的绝对路径），不要让可能未设置的变量承载删除目标。',
  },

  'destructive.rm-broad-target': {
    title: '删除目标是 shell 展开结果或通配符',
    detail:
      '目标是 `*`、`.`、`..`，或是 `$DIR` 这类变量——一次笔误或一个未导出的变量就会让它为空，此时命令变成删除工作目录或 `/`。',
    remediation:
      '为变量加引号并设置默认值（`rm -rf -- "${DIR:?}"`），或直接列出具体路径；执行前先用 `echo` 跑一遍，看清楚 shell 会展开成什么。',
  },

  'destructive.rm-system-directory': {
    title: '递归删除顶层系统目录',
    detail:
      '该调用对 `/etc`、`/usr`、`/var`、`/bin`、`/sbin`、`/lib`、`/boot`、`/opt`、`/System`、`/Library` 或 `C:\\Windows` 使用 `-r`/`-f`。这些目录无法靠重装那个恰好挡路的软件包恢复；在 macOS 上，`/usr` 和 `/System` 只受 SIP 保护——直到该调用补上关闭 SIP 的那个标志为止。',
    remediation:
      '只删除系统目录树中属于你的那个具体目录（`rm -rf /usr/local/lib/myapp`），并先用 `--dry-run` 或 `echo` 确认 shell 的展开结果。',
  },

  'destructive.disk-overwrite': {
    title: '直接写入块设备',
    detail:
      '该调用通过 `dd of=`、重定向、`tee` 或 `truncate` 直接写入 `/dev/sd*`、`/dev/disk*`、`/dev/nvme*` 等设备。这会摧毁文件系统和设备上的每个分区，包括本会话所在的那个。',
    remediation:
      '把数据写入工作区内的文件；如果确实必须刷写镜像，请在会话之外的可交互 shell 中操作，并反复核对设备名。',
  },

  'destructive.disk-erase': {
    title: '创建文件系统或擦除磁盘的工具',
    detail:
      '`mkfs`、`newfs`、`wipefs`、`blkdiscard` 和 `shred` 会覆盖元数据或数据，且无法恢复。它们在编码会话里没有任何安全用法，而把 `shred` 指向 `/etc`、`/usr` 或主目录本身就是蓄意破坏。',
    remediation:
      '用 `rm` 删除你确实想删掉的文件，或者卸载设备后在维护环境中重新刷写镜像。',
  },

  'destructive.fork-bomb': {
    title: 'fork 炸弹',
    detail:
      '递归定义 `:(){ :|:& };:` 会不断派生进程直到进程表耗尽，使机器对所有用户卡死，通常只能硬重启。',
    remediation:
      '删掉这个定义。如果你是在测资源上限，请在容器里用 `ulimit -u`，而不是在宿主机 shell 里。',
  },

  'destructive.permission-root': {
    title: '对整个文件系统施加全局可写权限或 root 属主',
    detail:
      '`chmod -R 777 /` 和 `chown -R root /` 会重写卷上每个文件的权限位或属主，这会破坏 `sshd`、`sudo` 和 setuid 程序，同时让每个凭据文件变成全局可读。',
    remediation:
      '把改动限制在确实需要的那一个目录，并使用能满足需求的最小权限（`chmod -R u+rwX ./dir`）。',
  },

  'destructive.etc-critical-write': {
    title: '写入 /etc 下的关键文件',
    detail:
      '该调用重定向写入、覆盖或编辑 `/etc/passwd`、`/etc/shadow`、`/etc/sudoers` 或 `/etc/hosts`。一条格式错误的记录会把所有账号锁在机器之外，而一条恶意记录会授予 root 或改道所有名称解析。',
    remediation:
      '用 `vipw`、`visudo` 或该平台会校验文件的工具来修改账号和名称解析状态，并保留一份无需登录即可恢复的备份。',
  },

  'destructive.git-force-push': {
    title: '向 main 或 master 强制推送',
    detail:
      '`git push --force`（或 `-f`、`--mirror`、`+main`/`+master`）会重写受保护分支，丢掉别人已经在它之上开展工作的提交。`--force-with-lease` 不受本规则影响。',
    remediation:
      '常规推送即可；或者在本地 rebase 之后，用 `--force-with-lease` 推到一个不是 `main`/`master` 的分支。',
  },

  'destructive.git-history-rewrite': {
    title: '丢弃或重写本地历史与工作区状态的命令',
    detail:
      '`git filter-branch`、`git filter-repo`、`git reset --hard` 和 `git clean -fdx` 会丢弃未提交的工作和不可达的提交。事后恢复要靠 reflog 和运气，而 `-x` 还会删掉从未被跟踪的文件。',
    remediation:
      '先提交或 stash（`git stash push -u`），并在使用 `-f` 之前用 `git clean -n` 列出会被删掉的内容。',
  },

  'destructive.sql-statement': {
    title: '破坏性 SQL 语句',
    detail:
      '`DROP DATABASE`/`DROP SCHEMA` 会删除整个数据库；`DROP TABLE` 和 `TRUNCATE TABLE` 在多数引擎中会清空表且没有回滚路径。仅凭语句本身无法判断目标是临时库还是生产库。',
    remediation:
      '先确认目标连接串和 schema；对生产数据，请使用在版本控制中评审过的迁移文件，而不是临时语句。',
  },

  'destructive.sql-delete-without-where': {
    title: '没有 WHERE 子句的 DELETE FROM',
    detail:
      '该语句会删除表中的每一行。本想写却漏掉的 `WHERE` 看起来正是这样，而数据在结果返回之前就已经没了。',
    remediation:
      '补上 `WHERE` 条件，先跑一遍等价的 `SELECT count(*)`，并把改动包在可以回滚的事务里。',
  },

  'destructive.infra-teardown': {
    title: '容器、集群或云资源拆除',
    detail:
      '该命令会清理容器卷、删除 Kubernetes 命名空间或持久卷声明、销毁 Terraform state，或强制删除存储桶。持久卷和存储桶里的数据不是一次 `apply` 能带回来的。',
    remediation:
      '先列出受影响的资源（`docker system df`、`kubectl get pvc -A`、`terraform plan -destroy`），确认账号和上下文之后再执行拆除。',
  },

  'destructive.npm-publish-shadow': {
    title: '发布与其他包同名的遮蔽包',
    detail:
      '该调用执行 `npm publish`，同时引用了一个被广泛使用的包名。发布遮蔽同名包正是 typosquat 和 slopsquat 进入他人安装依赖的途径，而误发布无法撤回。',
    remediation:
      '检查 `package.json` 里的 `name` 字段，并先用 `--dry-run` 发布。如果这个名字确实是有意为之，请在发布前确认 scope（`@your-org/name`）。',
  },

  'destructive.history-clear': {
    title: 'shell 历史被清除',
    detail:
      '`history -c`、`unset HISTFILE` 或删除历史文件会抹掉本会话执行过的命令的本地记录，而这恰恰是事后复盘事件所需的证据。',
    remediation:
      '保留历史记录；如果其中有凭据，请轮换该凭据，而不是删掉那一行日志。',
  },

  'destructive.kill-everything': {
    title: '向该用户拥有的所有进程发送信号',
    detail:
      '`kill -9 -1` 会向整个进程组发信号，`kill -9 1` 针对 init，而 `killall`/`pkill` 形式则按用户或模式横扫。一次调用就会杀掉 harness、编辑器和未保存的工作。',
    remediation:
      '只针对你想停止的那个具体 PID（先 `pgrep -fl name`，再 `kill <pid>`），不要用能匹配一切的模式。',
  },

  'destructive.known-fragment': {
    title: '已知的破坏性命令片段',
    detail:
      '该调用包含共享 `DESTRUCTIVE_COMMANDS` 表中的一个条目，而它没有专属规则。安装前审计也使用这张表，因此在那里新增的片段会在这里生效，无需改动本文件。',
    remediation:
      '运行前先按原样读懂这条命令，并尽量采用该操作最窄的形式。',
  },

  'cred.read-credential-file': {
    title: '文件工具指向凭据存储',
    detail:
      '路径参数指向私钥、云凭据文件、dotenv 文件、registry token、浏览器 cookie 存储或 DSH 凭据文件。读取它会把密钥带进对话记录，而脱敏只能移除它认得的那一份副本。',
    remediation:
      '改为读取脱敏示例（`.env.example`、`*.pub`、profile 名称），或者请用户粘贴任务所需的那一个值。',
  },

  'cred.shell-credential-reference': {
    title: '读取或外送凭据存储的 shell 命令',
    detail:
      '该命令会读取、复制或上传私钥、云凭据文件、浏览器存储、shell 历史或系统账号数据库。其内容最终会出现在对话记录里、某份副本里，或者网络上。',
    remediation:
      '使用拥有该凭据的工具（`aws configure`、`gh auth login`、`ssh-keygen -y`），而不要搬运文件；也绝不要把该值提交进会话。',
  },

  'cred.keychain-extraction': {
    title: '钥匙串密码提取',
    detail:
      '`security find-generic-password -w`、`security dump-keychain` 和 `security find-internet-password` 会以明文打印已存储的密钥，而 `keychain-dumper`/`chainbreaker` 能从钥匙串文件中把它们提取出来。输出的是可直接使用的凭据，而不是凭据的指纹。',
    remediation:
      '用 `security find-generic-password -s <service>`（不带 `-w`）读取任务所需的那个条目以确认它存在，或者让拥有该密钥的工具在使用时自行读取。',
  },

  'cred.memory-scrape': {
    title: '抓取进程内存或环境变量',
    detail:
      '该调用读取 `/proc/<pid>/environ`、用 `gcore`/`lldb` 转储进程，或调用 `mimikatz`、`LaZagne` 这类凭据抓取工具。这些工具会收割进程持有的全部凭据，属于在构建流程中没有任何正当用途的凭据窃取原语。',
    remediation:
      '去掉这次抓取。如果你在排查环境变量传递问题，用 `printenv NAME` 打印你需要的那个变量。',
  },

  'cred.environment-dump': {
    title: '环境变量被转储到文件或管道',
    detail:
      '`printenv`、`env` 或 `set` 被重定向到文件里或通过管道传走。会话环境通常包含 registry token、云凭据和 DSH 配置，它们会随之躺在一个明文文件里。',
    remediation:
      '按名称读取一个变量（`printenv AWS_PROFILE`），其余的留在环境里，让需要它的进程自己读取。',
  },

  'ssrf.cloud-metadata': {
    title: '请求云实例元数据端点',
    detail:
      '目标是 IMDS 地址（`169.254.169.254`、`169.254.170.2`、`100.100.100.200`、`fd00:ec2::254`）或元数据主机名，或者该调用请求了 IMDS 路径。在多数实例上，该端点会返回角色凭据，一次请求就足以把它们交出去。',
    remediation:
      '改用携带明确凭据的云厂商 API 获取数据；如果你只是用 curl 测自己的元数据服务，请针对本地 mock 运行。',
  },

  'ssrf.private-address': {
    title: '请求回环、私有或链路本地地址',
    detail:
      'URL 主机解析到不可全局路由的地址（RFC1918、CGNAT、回环、链路本地、IPv6 ULA）。`2130706433`、`0x7f000001`、`0177.0.0.1` 这类混淆写法会在本检查之前就被解析，因此同样会命中这里。',
    remediation:
      '如果目标是内部服务，请说明情况并使用文档中的服务名和任务已有的凭据；如果只是本地开发服务器，请让用户在他自己控制的 shell 里发起请求。',
  },

  'ssrf.loopback-service-port': {
    title: '连接回环上的基础设施服务端口',
    detail:
      '目标是 localhost 上属于 SSH、Docker 守护进程、数据库、Redis、Elasticsearch、memcached 或 MongoDB 的端口。Docker socket 端口尤其等同于远程代码执行：谁能访问它，谁就能启动一个挂载了宿主机文件系统的容器。',
    remediation:
      '用该服务的客户端和已配置好的凭据与之通信（`docker`、`psql`、`redis-cli`），不要在工具调用里开一条裸连接。',
  },

  'ssrf.dangerous-scheme': {
    title: '模型不会发出的 URL scheme',
    detail:
      '`file:`、`gopher:`、`dict:`、`ldap:`、`tftp:`、`data:` 以及守卫表中的其他 scheme 会读取本地文件，或向内网服务说二进制协议。会跟随它们的抓取工具，等于把一次文本请求变成一次文件系统读取。',
    remediation:
      '用 `read` 工具读取本地文件，它会经过工作区策略；访问内部服务请使用其自带的协议客户端。',
  },

  'ssrf.internal-hostname': {
    title: '内部或攻击者可解析的主机名',
    detail:
      '目标是按惯例只在私有网络内解析的名称（`.internal`、`.corp`、`.local`、`.svc.cluster.local`）、未指定地址 `0.0.0.0`、`nip.io`/`sslip.io` 这类可指向攻击者任意地址的通配 DNS 主机，或者 userinfo 被伪装成主机名以掩盖真实目标的 URL。',
    remediation:
      '使用任务真正关心的、可从外部解析的名称；对任何含 userinfo 的 URL，请先检查 `@` 之后的真实 authority，再相信它表面上的主机名。',
  },

  'ssrf.known-drop-host': {
    title: '请求已知的数据投放或隧道服务',
    detail:
      '目标是 `EXFIL_HOSTS` 中的粘贴、webhook 捕获或隧道主机（webhook.site、ngrok、oastify、transfer.sh、pinggy 类隧道）。它们存在的目的就是从某台机器接收数据并让别处可读，这正是数据外传的形态。',
    remediation:
      '改用 `read` 工具把数据带进会话，不要经由公网接收端转发；如果确实需要隧道，请让用户在会话之外启动。',
  },

  'priv.escalation-command': {
    title: '提权命令',
    detail:
      '`sudo`、`doas`、`pkexec`、`runas`、`su -c` 或 setuid 权限改动会以另一个用户的身份运行命令的其余部分。该命令之后的一切也会带着这些权限运行，包括守卫本来会拦下的部分。',
    remediation:
      '以当前用户身份运行该命令；或者说明你需要的具体特权命令，请用户自己执行。',
  },

  'priv.admin-prompt-script': {
    title: '脚本化提权到管理员 shell',
    detail:
      '`osascript … do shell script … with administrator privileges`、编码后的 PowerShell 命令，或 `Start-Process -Verb RunAs` 会在无人阅读载荷的情况下向操作系统索取管理员 shell，而编码后的命令按设计就是不可读的。',
    remediation:
      '以当前用户身份执行该操作。如果它确实需要管理员权限，应由用户在他自己的终端里运行可见的命令。',
  },

  'priv.powershell-encoded': {
    title: '以编码命令调用 PowerShell',
    detail:
      '`-EncodedCommand`（以及 `-enc`）携带 base64 UTF-16LE 载荷，`[Convert]::FromBase64String` 是同一手法的展开写法。载荷在决策点不可读，而这正是它被编码的全部原因；该载荷能以调用者的身份做任何事。',
    remediation:
      '先解码载荷，再运行可见的命令：`[Text.Encoding]::Unicode.GetString([Convert]::FromBase64String("…"))`。如果编码来自厂商工具，请索取可读的形式。',
  },

  'priv.remote-pipe-to-shell': {
    title: '远程内容被管道送进 shell',
    detail:
      '`curl … | sh`、`wget -O- … | bash` 和 `sh <(curl …)` 会执行服务器返回的任何内容。这些内容未签名、未经评审，而且读取的那一刻与执行的那一刻可能并不相同。',
    remediation:
      '先下载到文件、读一遍，再执行；或者从包仓库安装该工具，那里的制品摘要是被固定的。',
  },

  'priv.reverse-shell': {
    title: '反向 shell',
    detail:
      '该命令通过 `nc -e`、`ncat --exec`、`/dev/tcp`、`socat exec:`、`mkfifo` 反向管道，或某个建立连接并派生 `/bin/sh` 的语言单行命令，把套接字接到交互式 shell 上。这等于把一个交互式会话交给远端。',
    remediation:
      '删掉 shell 载荷。如果你在测试某个不可达的服务，请改用在用户终端中建立 SSH 端口转发。',
  },

  'priv.network-scan': {
    title: '网络或端口扫描',
    detail:
      '`nmap`、`masscan`、`zmap` 以及凭据爆破工具会扫描与本次任务无关的主机。即便是扫描，也是对第三方系统的活动，对方一侧会有日志。',
    remediation:
      '只扫描被问及的那个地址，使用单一主机目标和你已确认相关的端口。',
  },

  'priv.sudoers-edit': {
    title: '直接编辑 sudo 策略',
    detail:
      '写入 `/etc/sudoers` 或 `/etc/sudoers.d/`（通过 `visudo`、`sed -i`、重定向或 `tee`）会改变谁可以成为 root。其中一处语法错误就会导致管理访问被锁死，而新增的 `NOPASSWD` 规则会移除最后一道确认。',
    remediation:
      '让用户在可交互 shell 里用 `visudo` 做这个改动，这样文件会被校验；并评审将要添加的具体规则。',
  },

  'persist.persistence-fragment-write': {
    title: '写入持久化位置',
    detail:
      '写入落在了系统日后会执行的位置：crontab 目录、launch agent 或 daemon、systemd unit、`rc.local`、`authorized_keys` 或 Windows Run 键。放在那里的代码会在会话结束后、每次登录或每次启动时再次运行。',
    remediation:
      '把脚本留在仓库里，需要时显式运行。如果确实需要定时任务，请让用户读懂它要运行的命令之后，用平台工具添加。',
  },

  'persist.crontab-stdin': {
    title: '从标准输入或文件安装 crontab',
    detail:
      '`crontab -` 配合 heredoc 或管道，以及 `crontab <file>`，会用会话中无人评审过的内容替换用户的计划任务。替换 crontab 是让代码在会话结束后继续运行的最廉价方式。',
    remediation:
      '先打印当前计划（`crontab -l`），让用户看过之后自己安装新的，不要直接管道写入。',
  },

  'persist.service-enable': {
    title: '启用服务或计划任务',
    detail:
      '`launchctl load`/`bootstrap`/`submit`、`systemctl enable`、`sc create`、`schtasks /create`、`reg add …\\Run` 和 `at now` 会注册在登录、启动或定时触发时运行的东西。这个注册会比创建它的 shell 活得更久。',
    remediation:
      '眼前的工作直接运行该程序即可。如果用户希望它永久启用，应由他自己安装该 unit 并先阅读其内容。',
  },

  'persist.shell-rc-append': {
    title: '追加写入 shell 启动文件',
    detail:
      '写入落在了 `.bashrc`、`.zshrc`、`.profile` 或类似的启动文件上，因此追加的内容会在今后每一个交互式 shell 中运行。其值通常是 `alias` 或 `export`，但同一次写入也可以注入命令。',
    remediation:
      '把改动放进用户显式 source 的项目内脚本，或者把具体的那一行展示出来，让用户自己添加。',
  },

  'persist.git-hook-install': {
    title: '安装 git hook',
    detail:
      '写入 `.git/hooks/` 或改动 `core.hooksPath`，会让 git 在下一次 commit、checkout 或 push 时运行该文件。`pre-commit` 和 `pre-push` hook 在 diff 中不可见，默认也不与远端共享。',
    remediation:
      '如果该 hook 属于项目，请把它提交到团队会评审的受跟踪 hooks 目录（例如设置 `core.hooksPath .githooks`），并展示它的内容。',
  },

  'persist.npm-scripts-widen': {
    title: '放宽 npm 脚本执行策略',
    detail:
      '设置 `ignore-scripts false` 或 `unsafe-perm true`，会为此后解析的每个包重新启用 `preinstall`/`postinstall` 执行。这些 hook 以开发者的权限运行，是依赖攻击的标准投递方式。',
    remediation:
      '保持 `ignore-scripts=true`，并在读过 `package.json` 中的脚本之后，显式运行你确实需要的那一个生命周期步骤。',
  },

  'persist.dsh-policy-widen': {
    title: '编辑 DSH 设置以放宽权限或审批',
    detail:
      '该调用同时触及 DSH 的 `settings.yaml` 和某个权限或审批键，例如 `sandbox_permissions`、`danger-full-access` 或自动批准策略。这个改动会移除本插件为今后所有会话提供的护栏，而不只是这一次调用。',
    remediation:
      '不要动设置文件，让用户有意识地决定沙箱模式；如果只是某一条命令需要更大权限，审批提示才是授予它的正确位置。',
  },

  'exfil.curl-upload-file': {
    title: '上传本地文件的 HTTP 请求',
    detail:
      '`curl --data-binary @file`、`-d @file`、`-T file` 或 `-F name=@file` 会把本地文件的内容发送到远端端点。该调用没有说明文件里是什么，也没有说明谁在接收。',
    remediation:
      '把数据发往用户指定的目标，并在命令里把字段内容写全；绝不上传凭据或配置文件。',
  },

  'exfil.netcat-file': {
    title: '通过裸套接字发送文件',
    detail:
      '`nc host port < file` 或 `cat file | nc host port` 绕过所有协议层控制，把文件原样发给对端任何在监听的东西。',
    remediation:
      '使用目标端期望的服务协议，这样传输才有认证和日志；并且只发送任务所需的那部分具体数据。',
  },

  'exfil.archive-and-send': {
    title: '归档主目录并准备外传',
    detail:
      '归档包由主目录、`/etc` 或整棵目录树打包而成，并且同一条命令把它管道送进网络工具。先压缩既规避了内容检查，又把载荷压得足够小以便快速带走。',
    remediation:
      '只归档任务涉及的那个项目目录，输出保留在本地文件；绝不要把主目录的归档管道发往远端。',
  },

  'exfil.credential-encode-and-post': {
    title: '凭据文件被编码后发往网络',
    detail:
      '同一条命令读取凭据存储、对它编码（base64、hex、gzip 或 openssl 加密），再交给网络工具。这里的编码是为了绕过过滤器，而这正是分阶段数据外传的特征。',
    remediation:
      '停下来并上报这条命令。如果凭据必须在机器之间迁移，请轮换它，并通过目标端自己的密钥存储下发新值。',
  },

  'exfil.dns-tunnel': {
    title: '携带编码标签的 DNS 查询',
    detail:
      '`dig`、`nslookup` 或 `host` 查询携带了一个长到足以承载编码数据的标签。即便 HTTP 出站被封锁，DNS 仍会经解析器发出，因此它是数据外传常用的备用通道。',
    remediation:
      '只查询你真正需要的名称。如果你在排查解析器，请使用普通主机名和 `+short`，不要在标签里放数据。',
  },

  'exfil.env-var-upload': {
    title: '凭据环境变量被发往网络',
    detail:
      '该命令把凭据变量（`$AWS_SECRET_ACCESS_KEY`、`$GITHUB_TOKEN`、`$*_SECRET`、`$*_API_KEY`、`$DATABASE_URL` 等）插值进请求或套接字。该值是有效凭据，而目标在本机之外。',
    remediation:
      '绝不把凭据变量插值进网络命令。按名称引用 profile 或身份，让客户端库自己去解析密钥。',
  },

  'exfil.remote-copy': {
    title: 'scp 或 rsync 到不在允许列表中的主机',
    detail:
      '该命令把文件复制到不是已知代码托管平台的远端主机。这里没有可评审的 diff、没有 commit、也没有服务端记录，因此复制到未经审查的主机是一次无法挽回的泄露。',
    remediation:
      '通过仓库远端推送；或者在复制之前与用户确认目标主机和确切的文件清单。',
  },

  'secret-leak.live-credential': {
    title: '工具参数中存在有效凭据',
    detail:
      '该调用携带了一个符合共享 `SECRET_PATTERNS` 表中有效凭据形态的值。把密钥粘贴进命令有时确实是有意的配置步骤，因此这里只告警并记录而不拦截——但该值现在已经存在于对话记录和审计记录中。',
    remediation:
      '以引用方式传递凭据（`--profile`、进程已有的环境变量、仓库之外的密钥文件）；如果那是真实密钥，请轮换该值。',
  },

  'secret-leak.private-key-destination': {
    title: '工具参数中存在私钥材料',
    detail:
      '该调用包含完整的 PEM 或 OpenSSH 私钥块。把密钥材料写入本地文件是正当的下发步骤，因此那种情况只告警；当同一次调用还出现了网络目标时，说明密钥正在被传输，此时会被拦截——因为该密钥可以认证所有信任它的主机。',
    remediation:
      '绝不传输私钥。用 `cp` 复制文件、用平台的密钥工具安装它，或者在目标端生成新密钥并只共享公钥那一半。',
  },

  'sandbox-escape.permission-escalation': {
    title: '在调用中放宽沙箱或审批策略',
    detail:
      '参数里带有 `sandbox_permissions: "danger-full-access"`、`--dangerously-skip-permissions`、`--no-sandbox`，或者一个禁用提示的审批策略。这些设置是用户的决定，工具调用无权自行授予，而且它们会移除此刻正在执行的检查。',
    remediation:
      '去掉这个覆盖项，在当前沙箱下运行命令。如果它确实无法在沙箱内工作，请说明是哪个操作失败，由用户来修改模式。',
  },

  'sandbox-escape.container-privilege': {
    title: '以宿主机特权启动容器',
    detail:
      '`--privileged`、`--cap-add SYS_ADMIN`、`--pid=host`、`--net=host`、挂载 `/` 或 `/etc`，以及绑定 `/var/run/docker.sock`，都会把宿主机交给容器。挂载 Docker socket 等同于在机器上拿到 root。',
    remediation:
      '使用默认能力集，只挂载项目目录，避免使用宿主机命名空间。如果这项工作需要特权容器，那它需要一台由用户控制的虚拟机。',
  },

  'sandbox-escape.namespace-escape': {
    title: '命名空间、chroot 或跟踪逃逸',
    detail:
      '`nsenter`、`chroot`、`unshare --user --map-root-user` 以及裸的 `ptrace`/`process_vm_readv` 会踏出沙箱设定的命名空间或进程边界。`LD_PRELOAD` 通过替换库调用，可以从内部达到同样的效果。',
    remediation:
      '留在沙箱内，并描述那个需要宿主机访问的操作，让用户有意识地执行它。',
  },

  'sandbox-escape.kernel-and-mount': {
    title: '跨越内核、挂载或设备边界',
    detail:
      '把 `/` 绑定到新位置、`pivot_root`、加载内核模块，或改写 `/proc/sys/kernel/core_pattern`，都是从容器内部改动宿主机：最后一项是经典的容器逃逸，因为 core dump 随后会被管道送进攻击者选定的程序。',
    remediation:
      '只挂载任务需要的目录，绝不要在会话内触碰 `/proc/sys`、内核模块或 `core_pattern`。',
  },

  'sandbox-escape.hardening-disable': {
    title: '平台加固控制被关闭',
    detail:
      '不受限的 seccomp 或 AppArmor 配置、`setenforce 0`、`spctl --master-disable`、`csrutil disable` 和 `codesign --remove-signature` 会关掉那些本可阻止下一步动作的控制。关闭它们是准备工作，不是任务本身。',
    remediation:
      '保持安全控制开启。如果某个具体程序被策略拦住，请上报确切的拒绝信息，而不是关闭策略。',
  },

  'harness.dsh-state-write': {
    title: '写入 DSH 状态或凭据',
    detail:
      '该调用写入 DSH 自身的状态：`settings.yaml`、`credentials.yaml`、sessions 目录、profiles 或 storages。这些文件保存着会话记录、模型凭据以及本守卫所读取的策略，因此写入它们等于改动 harness 本身。',
    remediation:
      '请用户来做这个改动，或者修改真正的源头（仓库里的配置文件），而不是实时状态目录。',
  },

  'harness.plugin-install': {
    title: '未经安装前审计就安装的包',
    detail:
      '包管理器正在添加依赖或 DSH 插件，而安装生命周期脚本以开发者的权限运行，且这次调用没有经过本插件的安装前审计——还没有任何东西检查过那个 tarball。本规则只记录这次安装；是否拒绝或升级为提示由安装策略（`guard.requireAuditForInstall`）决定，它可以查询审计注册表，而本规则不能。',
    remediation:
      '先对这个包运行安装前审计（`security_scan_audit`，或 `/security audit <source>`），读完报告，再让安装继续。设置 `guard.requireAuditForInstall: true` 可让插件自动强制这一点。',
  },

  'harness.plugin-patch-edit': {
    title: '编辑插件 patch 文件或其他插件的已安装文件',
    detail:
      '该调用写入 `cordis.patch.yml` 或已安装插件的目录树。编辑 patch 文件正是移除某个插件条目的方式，而移除守卫插件的条目会在代码毫无改动的情况下，让此后每个会话都失去守卫。',
    remediation:
      '在插件的源码仓库里做改动并重新安装，这样 diff 可以被评审。不要从工具调用中编辑已安装的文件或 patch 文件。',
  },

  'harness.audit-tamper': {
    title: '审计日志或审计密钥被篡改',
    detail:
      '该调用写入或截断插件的审计日志、删除审计密钥，或改写 `DSH_SECURITY_SCAN_KEY`。日志是哈希链式的，因此删掉一行或替换密钥都会让其后每一条记录的校验失败——而伪造的密钥能让攻击者签出可以通过校验的新记录。',
    remediation:
      '把审计目录视为仅追加、且在模型侧只读。轮换密钥是运维操作，应在会话之外进行，并先轮换和重新锚定日志。',
  },

  'harness.process-kill': {
    title: 'harness 进程正在被杀死',
    detail:
      '针对 `dsh` 或运行本会话的 node 进程的 `pkill`/`killall`/`kill`/`taskkill`，会在调用中途停掉守卫、审计写入器和会话本身。磁盘上留下的只是恰好已经刷写的那部分状态。',
    remediation:
      '不要向 harness 发信号。如果进程卡住了，请上报，并让用户在他自己的终端里停止它。',
  },

  // -------------------------------------------------------------------------
  // Output rules — run after a tool returns, over the result text.
  // -------------------------------------------------------------------------

  'leak.private-key': {
    title: '工具结果中的私钥块',
    detail:
      '结果中包含完整的 PEM 私钥块。守卫选择扣下整个结果而不是就地脱敏，因为主体被部分替换的密钥仍然是密钥：周围的字节仍留在对话记录里，而它的任何一份副本都会危及所有信任它的主机。',
    remediation:
      '只读取公钥那一半（`*.pub`、`ssh-keygen -y -f key`），或以引用方式传递密钥让它永不进入模型上下文；如果该结果已经被存储，请轮换密钥。',
  },

  'leak.ssh-private-key': {
    title: '工具结果中的 OpenSSH 私钥',
    detail:
      '结果中包含 `-----BEGIN OPENSSH PRIVATE KEY-----` 块。它能授权对每个持有匹配公钥的主机的 SSH 访问，因此整个结果被扣下，而不是就地脱敏。',
    remediation:
      '使用对应的 `.pub` 文件，或者在会话之外用 `ssh-add` 把密钥加进 agent。如果该块已被读取，请轮换这对密钥。',
  },

  'leak.aws-access-key': {
    title: '工具结果中的 AWS access key id',
    detail:
      '结果中包含 AWS access key id。仅凭 id 无法签署请求，但与 secret key 配对后就可以，而在本项目里它通常就出现在 secret key 旁边。',
    remediation:
      '把凭据从输出路径上移除，改用具名 profile；如果它是有效凭据，请轮换这一对。',
  },

  'leak.github-token': {
    title: '工具结果中的 GitHub token',
    detail:
      '结果中包含 GitHub 个人访问令牌或应用令牌。对话记录里的令牌，就是该记录每一份备份里的令牌，而它的权限范围就是签发时赋予的那些。',
    remediation:
      '使用 `gh auth` 和已存储的凭据，优先选用短期 installation token；如果该 token 是真实的，请吊销它。',
  },

  'leak.anthropic-key': {
    title: '工具结果中的 Anthropic API key',
    detail:
      '结果中包含 `sk-ant-…` API key。它会计费到拥有它的账号，而且如果没有支出上限，它的可用量没有天然限制。',
    remediation:
      '把密钥放在客户端读取的环境里，而不是工具输出中；如果它已暴露，请轮换。',
  },

  'leak.deepseek-key': {
    title: '工具结果中的 API key',
    detail:
      '结果中包含 DeepSeek 及若干兼容厂商使用的通用 `sk-…` 形式令牌。它能认证请求，并计费到所属账号。',
    remediation:
      '在调用时从环境里读取该密钥，而不要打印它；如果该值进过日志，请轮换。',
  },

  'leak.google-api-key': {
    title: '工具结果中的 Google API key',
    detail:
      '结果中包含 `AIza…` Google API key。除非该密钥受 referrer 或 IP 限制，否则它可以被从任何地方用于项目已启用的每一个 API。',
    remediation:
      '为该密钥设置 API 和 referrer 限制，并停止打印它——改为从环境里读取。',
  },

  'leak.slack-credential': {
    title: '工具结果中的 Slack 凭据',
    detail:
      '结果中包含 Slack bot、user 或 app token，或者一个 incoming-webhook URL。任何一项都让持有者能向该工作区发消息，而 bot token 通常还能读取历史记录。',
    remediation:
      '把令牌存放在集成自身的存储里；如果它已暴露，请在 Slack 管理控制台轮换。',
  },

  'leak.stripe-key': {
    title: '工具结果中的 Stripe 生产 secret key',
    detail:
      '结果中包含 live 模式的 Stripe secret key。它能动用真实资金并读取客户记录，因此暴露是一次支付事故，而不是测试数据泄露。',
    remediation:
      '在 Stripe 控制台吊销该密钥，开发时使用受限的测试模式密钥，并且绝不打印生产密钥。',
  },

  'leak.gitlab-token': {
    title: '工具结果中的 GitLab token',
    detail:
      '结果中包含 `glpat-…` 个人访问令牌。它携带创建者用户的权限范围，通常是其项目的读写权限。',
    remediation:
      '改用权限范围最窄的项目或群组访问令牌，把它存在 CI 变量里，并吊销已泄露的令牌。',
  },

  'leak.npm-token': {
    title: '工具结果中的 npm token',
    detail:
      '结果中包含 `npm_…` registry token。具备发布权限的令牌能让持有者以你的包名推送版本，对所有安装者而言这是一次供应链事故。',
    remediation:
      '在 npmjs.com 上轮换该令牌，改用限定到单个包的 granular token，并让它远离工具输出。',
  },

  'leak.azure-account-key': {
    title: '工具结果中的 Azure 存储账号密钥',
    detail:
      '结果中包含 `AccountKey=…` 连接字符串。这个密钥授权对存储账号的完全访问，包括删除它的容器。',
    remediation:
      '把代码切换到 managed identity 或短期 SAS 令牌；如果该连接字符串已暴露，请轮换账号密钥。',
  },

  'leak.huggingface-token': {
    title: '工具结果中的 Hugging Face token',
    detail:
      '结果中包含 `hf_…` 访问令牌。它能读取私有仓库，并且在带写权限时可以以该账号发布模型和数据集。',
    remediation:
      '推理类工作请使用只读 token；如果该值进过日志，请轮换。',
  },

  'leak.sendgrid-key': {
    title: '工具结果中的 SendGrid API key',
    detail:
      '结果中包含 `SG.…` API key。具备发信权限的密钥可以从你已验证的域名发信，这既是送达率和声誉问题，也是一次泄露。',
    remediation:
      '把该密钥限制在它所需的发信权限上，并在任何暴露之后轮换它。',
  },

  'leak.twilio-key': {
    title: '工具结果中的 Twilio API key',
    detail:
      '结果中包含一个 32 位十六进制的 `SK…` 密钥，形态与 Twilio 用于 API key 的形式一致。它能认证账号操作，并在被使用时产生费用。',
    remediation:
      '把密钥存放在平台自己的环境变量里；如果它被打印过，请轮换。',
  },

  'leak.internal-topology': {
    title: '工具结果中的内网拓扑',
    detail:
      '结果透露了内网所在的位置：RFC1918、CGNAT、链路本地或唯一本地地址、元数据地址、内部主机名后缀（`.internal`、`.corp`、`.svc.cluster.local`），或者一行带这类地址的 forwarded header。用户主动要的配置文件里出现这些是合理的，因此只就地脱敏该值，而不扣下结果。',
    remediation:
      '不要把内网地址放进共享输出，改用调用方使用的服务名；如果任务确实需要某个具体地址，请显式重述那一个值。',
  },

  'leak.generic-credential': {
    title: '工具结果中形似凭据的赋值',
    detail:
      '结果中包含名称表明它是密钥的赋值（`password = "…"`、`api_key: \'…\'`）、URL 里内嵌的凭据，或 bearer header。被赋值的那种形态出现在大量可以安全读取的配置文件里，因此只就地脱敏，而不扣下结果。',
    remediation:
      '把字面值替换为对服务启动时读取的密钥存储的引用；如果该结果已被存到任何地方，请轮换该值。',
  },

  'leak.environment-dump': {
    title: '工具结果中的批量环境变量转储',
    detail:
      '结果是一份环境变量转储：六行及以上 `NAME=value`，且名称表明它们是凭据。单个变量的转储不会被报告；一次出现这么多，意味着整个进程环境都进了对话记录，包括任务根本不需要的值。',
    remediation:
      '只打印任务需要的那一个变量（`printenv NAME`），而不是整个环境，并轮换出现在转储中的任何凭据。',
  },

  'leak.session-material': {
    title: '工具结果中的会话或授权材料',
    detail:
      '结果中包含 JSON Web Token、带签名的 URL、OAuth 授权码，或很长的 cookie 值。这些在其有效期内都是持有者凭据，因此只就地脱敏它们，结果其余部分予以保留。',
    remediation:
      '把令牌留在使用它的客户端里，授权码要立即兑换，并避免打印携带签名的 URL——签名 URL 在日志写入之后依然有效。',
  },

  'leak.audit-key': {
    title: '工具结果中本插件的审计密钥',
    detail:
      '结果中包含 `DSH_SECURITY_SCAN_KEY`，或一个以审计密钥形式出现的 64 位十六进制值。该密钥是用于串联审计日志的 HMAC：持有它的人可以追加能通过校验的记录，或者重写现有链条并重新签名——而这恰恰是这条链存在的目的所在。',
    remediation:
      '把密钥只保留在 harness 进程的环境里。如果它出现在某个结果中，请轮换它，并从你仍能担保其哈希的最后一条记录起重新锚定日志。',
  },
};
