# 批量压测 / Batch stress test — top plugins by stars

对 DSH 插件市场中 **按 stars 排名前 100** 的插件做全量安装前体检，每个插件取 GitHub 的 `tar.gz/HEAD` 源码包。 / Full pre-install audit of the **top 100 plugins by stars** in the DSH marketplace, each fetched as a GitHub `tar.gz/HEAD` source archive.

- 数据集 / Dataset: `https://awesome-dsh-plugin.com/plugins.json (本地副本 / local copy: /tmp/plugins.json)` (updated 2026-09-20)
- 运行时间 / Run at: 2026-09-20
- 体检成功 / Audited: **91** · 跳过 / skipped: 9
- 平均分 / Mean score: **26/100**

> 结论、标定过程与仍然存在的问题见 [`CALIBRATION.md`](./CALIBRATION.md)（手写，不被本脚本覆盖）。 /
> What this run found, what was fixed, and what is still wrong: [`CALIBRATION.md`](./CALIBRATION.md) — authored, never overwritten by this script.

## 评级分布 / Grade distribution

| 评级 Grade | 数量 Count | 占比 Share |
| --- | ---: | ---: |
| A | 9 | 10% |
| B | 4 | 4% |
| C | 11 | 12% |
| D | 67 | 74% |

其中 **D 级（拒绝安装）67 个（74%）**，另有 53 个因大小/文件数上限只完成部分扫描。 / **67 refused (74%)**, 53 partially scanned.

## 结果 / Results

| # | 插件 Plugin | ★ | 评级 | 分数 | 发现 | 最严重的风险 / Most severe risk | 报告 |
| ---: | --- | ---: | :---: | ---: | ---: | --- | --- |
| 1 | [archify#integrations/deepseek-harness](https://github.com/tt-a1i/archify/tree/main/integrations/deepseek-harness) | 67553 | **A** | 98 | 1 | 出现凭据路径但并未读取 `cred.credential-path-mention` | [`tt-a1i__archify.md`](./tt-a1i__archify.md) |
| 2 | [OpenViking#examples/dsh-memory-plugin](https://github.com/volcengine/OpenViking/tree/main/examples/dsh-memory-plugin) | 38104 | **C** | 67 | 6 | 文档中包含针对模型的指令 `prompt.doc-instruction` | [`volcengine__OpenViking.md`](./volcengine__OpenViking.md) |
| 3 | [WeKnora#dsh-weknora](https://github.com/Tencent/WeKnora/tree/main/packages/dsh-weknora) | 27530 | **A** | 94 | 3 | 出现凭据路径但并未读取 `cred.credential-path-mention` | [`Tencent__WeKnora.md`](./Tencent__WeKnora.md) |
| 4 | [hindsight#coding-agents](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/coding-agents) | 23965 | **D** | 38 | 10 | 源码字符串中夹带针对模型的指令 `prompt.embedded-instruction-string` | [`vectorize-io__hindsight.md`](./vectorize-io__hindsight.md) |
| 5 | [dsh-web#packages/dsh-remote-web-ui](https://github.com/zhu1090093659/dsh-web/tree/main/packages/dsh-remote-web-ui) | 7810 | — | — | — | *无法获取 / unavailable: artifact is 553406343 bytes, above the 209715200-byte cap (rejected from its content-length, without downloading it)* | — |
| 6 | [dsh-web#packages/dsh-skill-explorer](https://github.com/zhu1090093659/dsh-web/tree/main/packages/dsh-skill-explorer) | 7810 | — | — | — | *无法获取 / unavailable: artifact is 553406343 bytes, above the 209715200-byte cap (rejected from its content-length, without downloading it)* | — |
| 7 | [dsh-web#packages/dsh-git-graph](https://github.com/zhu1090093659/dsh-web/tree/main/packages/dsh-git-graph) | 7810 | — | — | — | *无法获取 / unavailable: artifact is 553406343 bytes, above the 209715200-byte cap (rejected from its content-length, without downloading it)* | — |
| 8 | [dsh-web-ui#packages/dsh-pet](https://github.com/zhu1090093659/dsh-web-ui/tree/main/packages/dsh-pet) | 7810 | — | — | — | *无法获取 / unavailable: artifact is 553406343 bytes, above the 209715200-byte cap (rejected from its content-length, without downloading it)* | — |
| 9 | [dsh-web-ui#packages/dsh-ssh](https://github.com/zhu1090093659/dsh-web-ui/tree/main/packages/dsh-ssh) | 7810 | — | — | — | *无法获取 / unavailable: artifact is 553406343 bytes, above the 209715200-byte cap (rejected from its content-length, without downloading it)* | — |
| 10 | [dsh-web#packages/dsh-plugin-manager](https://github.com/zhu1090093659/dsh-web/tree/main/packages/dsh-plugin-manager) | 7810 | — | — | — | *无法获取 / unavailable: artifact is 553406343 bytes, above the 209715200-byte cap (rejected from its content-length, without downloading it)* | — |
| 11 | [dsh-web#packages/dsh-task-board](https://github.com/zhu1090093659/dsh-web/tree/main/packages/dsh-task-board) | 7809 | — | — | — | *无法获取 / unavailable: artifact is 553406343 bytes, above the 209715200-byte cap (rejected from its content-length, without downloading it)* | — |
| 12 | [dsh-web#packages/dsh-web-all](https://github.com/zhu1090093659/dsh-web/tree/main/packages/dsh-web-all) | 7809 | — | — | — | *无法获取 / unavailable: artifact is 553406343 bytes, above the 209715200-byte cap (rejected from its content-length, without downloading it)* | — |
| 13 | [dsh-web-ui#packages/dsh-tool-describe-image](https://github.com/zhu1090093659/dsh-web-ui/tree/main/packages/dsh-tool-describe-image) | 7809 | — | — | — | *无法获取 / unavailable: artifact is 553406343 bytes, above the 209715200-byte cap (rejected from its content-length, without downloading it)* | — |
| 14 | [dsh-routing-suite](https://github.com/yjh051108/dsh-routing-suite) | 7199 | **D** | 0 | 18 | 同一个包内既有环境变量收集又有对外请求 `exfil.environment-harvest-then-callback` | [`yjh051108__dsh-routing-suite.md`](./yjh051108__dsh-routing-suite.md) |
| 15 | [ouroboros#integrations/dsh-plugin](https://github.com/Q00/ouroboros/tree/main/integrations/dsh-plugin) | 6036 | **A** | 100 | 0 | — | [`Q00__ouroboros.md`](./Q00__ouroboros.md) |
| 16 | [loopx#dsh-loopx-plugin](https://github.com/huangruiteng/loopx/tree/main/packages/dsh-loopx-plugin) | 5902 | **D** | 0 | 10 | 执行运行时拼装出来的代码 `obf.dynamic-code-eval` | [`huangruiteng__loopx.md`](./huangruiteng__loopx.md) |
| 17 | [BrowserSkill#dsh-plugin-browserskill](https://github.com/Tencent/BrowserSkill/tree/main/packages/dsh-plugin-browserskill) | 5794 | **D** | 0 | 13 | 同一个包内既有环境变量收集又有对外请求 `exfil.environment-harvest-then-callback` | [`Tencent__BrowserSkill.md`](./Tencent__BrowserSkill.md) |
| 18 | [dsh-market](https://github.com/dsh-market/dsh-market) | 4202 | **D** | 0 | 22 | 源码字符串中夹带针对模型的指令 `prompt.embedded-instruction-string` | [`dsh-market__dsh-market.md`](./dsh-market__dsh-market.md) |
| 19 | [modlens](https://github.com/liustack/modlens) | 3996 | **D** | 0 | 20 | 凭据读取、解码步骤与对外请求同时出现 `exfil.credential-read-decode-callback` | [`liustack__modlens.md`](./liustack__modlens.md) |
| 20 | [DSH-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar) | 3680 | **D** | 0 | 23 | 同一个包内既有环境变量收集又有对外请求 `exfil.environment-harvest-then-callback` | [`omdsh-dev__DSH-better-sidebar.md`](./omdsh-dev__DSH-better-sidebar.md) |
| 21 | [mirage#dsh](https://github.com/strukto-ai/mirage/tree/main/typescript/packages/dsh) | 3642 | **C** | 74 | 5 | 依赖解析到 URL、git 引用或文件路径 `supply.url-dependency` | [`strukto-ai__mirage.md`](./strukto-ai__mirage.md) |
| 22 | [ReMe#dsh](https://github.com/agentscope-ai/ReMe/tree/main/integrations/dsh) | 3489 | **C** | 61 | 4 | 向裸 IP 地址发送请求 `net.raw-ip-destination` | [`agentscope-ai__ReMe.md`](./agentscope-ai__ReMe.md) |
| 23 | [dashi-taskboard#deepseek-harness](https://github.com/chuspeeism/dashi-taskboard/tree/main/integrations/deepseek-harness) | 3159 | **A** | 100 | 0 | — | [`chuspeeism__dashi-taskboard.md`](./chuspeeism__dashi-taskboard.md) |
| 24 | [dsh-TUI](https://github.com/ccch1mneyyy/dsh-TUI) | 3110 | **D** | 0 | 40 | 凭据读取、解码步骤与对外请求同时出现 `exfil.credential-read-decode-callback` | [`ccch1mneyyy__dsh-TUI.md`](./ccch1mneyyy__dsh-TUI.md) |
| 25 | [DeepSeek-Balance-Whale-Widget](https://github.com/MeteorNOX/DeepSeek-Balance-Whale-Widget) | 2750 | **D** | 30 | 6 | 包连接的不同主机数量多得不合常理 `net.excessive-distinct-hosts` | [`MeteorNOX__DeepSeek-Balance-Whale-Widget.md`](./MeteorNOX__DeepSeek-Balance-Whale-Widget.md) |
| 26 | [memsearch#MemSearch](https://github.com/zilliztech/memsearch/tree/main/plugins/dsh) | 2626 | **C** | 57 | 6 | require 或 import 了动态计算的模块路径 `obf.dynamic-require` | [`zilliztech__memsearch.md`](./zilliztech__memsearch.md) |
| 27 | [dsh-deep-whale#maid-atelier](https://github.com/Small-tailqwq/dsh-deep-whale/tree/main/maid-atelier) | 2146 | **C** | 60 | 5 | 读取或整体导出进程环境变量 `cred.env-harvest` | [`Small-tailqwq__dsh-deep-whale.md`](./Small-tailqwq__dsh-deep-whale.md) |
| 28 | [dsh-infinite-gen-3](https://github.com/Minglink/dsh-infinite-gen-3) | 1770 | **D** | 0 | 8 | 用 curl 上传本地文件 `exfil.curl-post-body` | [`Minglink__dsh-infinite-gen-3.md`](./Minglink__dsh-infinite-gen-3.md) |
| 29 | [dsh-agent-teams](https://github.com/NanmiCoder/dsh-agent-teams) | 1736 | **D** | 0 | 19 | 同一个包内既有环境变量收集又有对外请求 `exfil.environment-harvest-then-callback` | [`NanmiCoder__dsh-agent-teams.md`](./NanmiCoder__dsh-agent-teams.md) |
| 30 | [treg](https://github.com/superdesigndev/treg) | 1711 | **D** | 0 | 21 | 执行运行时拼装出来的代码 `obf.dynamic-code-eval` | [`superdesigndev__treg.md`](./superdesigndev__treg.md) |
| 31 | [dsh-purge](https://github.com/YuJunZhiXue/dsh-purge) | 1472 | **D** | 0 | 10 | 源码字符串中夹带针对模型的指令 `prompt.embedded-instruction-string` | [`YuJunZhiXue__dsh-purge.md`](./YuJunZhiXue__dsh-purge.md) |
| 32 | [dsh-context](https://github.com/bowenliang123/dsh-context) | 1444 | **D** | 19 | 9 | 源码字符串中夹带针对模型的指令 `prompt.embedded-instruction-string` | [`bowenliang123__dsh-context.md`](./bowenliang123__dsh-context.md) |
| 33 | [dsh-im](https://github.com/xmanrui/dsh-im) | 1408 | **D** | 0 | 21 | 同一个包内既有环境变量收集又有对外请求 `exfil.environment-harvest-then-callback` | [`xmanrui__dsh-im.md`](./xmanrui__dsh-im.md) |
| 34 | [deepseek-design#deepseek-idesign](https://github.com/Devin-AXIS/deepseek-design/tree/main/packages/deepseek-idesign) | 1359 | **D** | 0 | 10 | 混淆代码叠加对外网络访问 `obf.obfuscation-with-network-callback` | [`Devin-AXIS__deepseek-design.md`](./Devin-AXIS__deepseek-design.md) |
| 35 | [deepseek-design#deepseek-ivideo](https://github.com/Devin-AXIS/deepseek-design/tree/main/packages/deepseek-ivideo) | 1359 | **D** | 27 | 8 | 在同一个请求里发送本地文件或环境变量数据 `exfil.local-data-in-request` | [`Devin-AXIS__deepseek-design.md`](./Devin-AXIS__deepseek-design.md) |
| 36 | [dsh-pocket](https://github.com/shaobeichen/dsh-pocket) | 1236 | **D** | 3 | 12 | 文档中包含针对模型的指令 `prompt.doc-instruction` | [`shaobeichen__dsh-pocket.md`](./shaobeichen__dsh-pocket.md) |
| 37 | [Aegis](https://github.com/GanyuanRan/Aegis) | 1216 | **D** | 12 | 9 | 文档中包含针对模型的指令 `prompt.doc-instruction` | [`GanyuanRan__Aegis.md`](./GanyuanRan__Aegis.md) |
| 38 | [openpets#dsh](https://github.com/alvinunreal/openpets/tree/main/packages/dsh) | 1214 | **B** | 78 | 3 | 依赖解析到 URL、git 引用或文件路径 `supply.url-dependency` | [`alvinunreal__openpets.md`](./alvinunreal__openpets.md) |
| 39 | [CloudBase-AI-Toolkit#dsh-plugin](https://github.com/TencentCloudBase/CloudBase-AI-Toolkit/tree/main/dsh-plugin) | 1115 | **D** | 0 | 9 | 凭据读取、解码步骤与对外请求同时出现 `exfil.credential-read-decode-callback` | [`TencentCloudBase__CloudBase-AI-Toolkit.md`](./TencentCloudBase__CloudBase-AI-Toolkit.md) |
| 40 | [dsh-vision-router](https://github.com/ysr666/dsh-vision-router) | 1113 | **D** | 0 | 17 | 源码字符串中夹带针对模型的指令 `prompt.embedded-instruction-string` | [`ysr666__dsh-vision-router.md`](./ysr666__dsh-vision-router.md) |
| 41 | [tongflow#dsh-tongflow](https://github.com/tong-io/tongflow/tree/main/packages/dsh-tongflow) | 1020 | **D** | 36 | 5 | 源码字符串中夹带针对模型的指令 `prompt.embedded-instruction-string` | [`tong-io__tongflow.md`](./tong-io__tongflow.md) |
| 42 | [AI-Novel-Writer#dsh-ai-novel-writer](https://github.com/EthanYoQ/AI-Novel-Writer/tree/master/plugins/dsh-ai-novel-writer) | 1012 | **D** | 17 | 7 | 源码字符串中夹带针对模型的指令 `prompt.embedded-instruction-string` | [`EthanYoQ__AI-Novel-Writer.md`](./EthanYoQ__AI-Novel-Writer.md) |
| 43 | [dsh-vision-toolkit](https://github.com/Anionex/dsh-vision-toolkit) | 883 | **D** | 0 | 16 | 源码字符串中夹带针对模型的指令 `prompt.embedded-instruction-string` | [`Anionex__dsh-vision-toolkit.md`](./Anionex__dsh-vision-toolkit.md) |
| 44 | [deja-vu#extensions/dsh](https://github.com/vshulcz/deja-vu/tree/main/extensions/dsh) | 871 | **D** | 0 | 1 | 把下载内容直接管道给 shell `priv.curl-pipe-shell` | [`vshulcz__deja-vu.md`](./vshulcz__deja-vu.md) |
| 45 | [api-relay-audit](https://github.com/toby-bridges/api-relay-audit) | 839 | **D** | 13 | 6 | 文档中包含针对模型的指令 `prompt.doc-instruction` | [`toby-bridges__api-relay-audit.md`](./toby-bridges__api-relay-audit.md) |
| 46 | [Openwrite](https://github.com/LiPu-jpg/Openwrite) | 742 | **D** | 0 | 25 | 同一个包内既有环境变量收集又有对外请求 `exfil.environment-harvest-then-callback` | [`LiPu-jpg__Openwrite.md`](./LiPu-jpg__Openwrite.md) |
| 47 | [dsh-browser#bridge-browser](https://github.com/Lum1104/dsh-browser/tree/main/packages/browser/bridge-browser) | 698 | **D** | 15 | 9 | 文档中包含针对模型的指令 `prompt.doc-instruction` | [`Lum1104__dsh-browser.md`](./Lum1104__dsh-browser.md) |
| 48 | [dsh-pet#dsh-pet](https://github.com/PC2005-cloud/dsh-pet/tree/main/dsh-pet) | 685 | **D** | 46 | 9 | 向裸 IP 地址发送请求 `net.raw-ip-destination` | [`PC2005-cloud__dsh-pet.md`](./PC2005-cloud__dsh-pet.md) |
| 49 | [sandbase-harness](https://github.com/sandbaseai/sandbase-harness) | 647 | **D** | 0 | 19 | 用 curl 上传本地文件 `exfil.curl-post-body` | [`sandbaseai__sandbase-harness.md`](./sandbaseai__sandbase-harness.md) |
| 50 | [dsh-ads](https://github.com/Nagi-ovo/dsh-ads) | 628 | **D** | 0 | 6 | 同一个包内既有环境变量收集又有对外请求 `exfil.environment-harvest-then-callback` | [`Nagi-ovo__dsh-ads.md`](./Nagi-ovo__dsh-ads.md) |
| 51 | [graph-memory](https://github.com/adoresever/graph-memory) | 626 | **C** | 53 | 8 | 源码字符串中夹带针对模型的指令 `prompt.embedded-instruction-string` | [`adoresever__graph-memory.md`](./adoresever__graph-memory.md) |
| 52 | [superdesign-skill](https://github.com/superdesigndev/superdesign-skill) | 579 | **B** | 82 | 1 | 文档中包含针对模型的指令 `prompt.doc-instruction` | [`superdesigndev__superdesign-skill.md`](./superdesigndev__superdesign-skill.md) |
| 53 | [Avernet#deepseek-harness-channel-bcn](https://github.com/inclusionAI/Avernet/tree/dev/src/bcs/crates/plugins/deepseek-harness-channel-bcn) | 555 | **C** | 52 | 8 | 通过 websocket 或 DNS 查询回连 `net.covert-channel` | [`inclusionAI__Avernet.md`](./inclusionAI__Avernet.md) |
| 54 | [dsh-redteam-model](https://github.com/SeaOf0/dsh-redteam-model) | 524 | **D** | 0 | 32 | 凭据读取、解码步骤与对外请求同时出现 `exfil.credential-read-decode-callback` | [`SeaOf0__dsh-redteam-model.md`](./SeaOf0__dsh-redteam-model.md) |
| 55 | [dsh-pentest](https://github.com/howmp/dsh-pentest) | 513 | **C** | 68 | 3 | 源码字符串中夹带针对模型的指令 `prompt.embedded-instruction-string` | [`howmp__dsh-pentest.md`](./howmp__dsh-pentest.md) |
| 56 | [dsh-at-file](https://github.com/omdsh-dev/dsh-at-file) | 512 | **C** | 66 | 4 | 依赖解析到 URL、git 引用或文件路径 `supply.url-dependency` | [`omdsh-dev__dsh-at-file.md`](./omdsh-dev__dsh-at-file.md) |
| 57 | [modsearch](https://github.com/liustack/modsearch) | 508 | **D** | 0 | 17 | 把下载内容直接管道给 shell `priv.curl-pipe-shell` | [`liustack__modsearch.md`](./liustack__modsearch.md) |
| 58 | [MisakaNet](https://github.com/Ikalus1988/MisakaNet) | 493 | **D** | 0 | 34 | 凭据读取、解码步骤与对外请求同时出现 `exfil.credential-read-decode-callback` | [`Ikalus1988__MisakaNet.md`](./Ikalus1988__MisakaNet.md) |
| 59 | [postiz-agent#dsh-postiz](https://github.com/gitroomhq/postiz-agent/tree/main/plugins/dsh-postiz) | 475 | **A** | 100 | 0 | — | [`gitroomhq__postiz-agent.md`](./gitroomhq__postiz-agent.md) |
| 60 | [thoughtdag#dsh](https://github.com/chenxiachan/thoughtdag/tree/main/dsh) | 469 | **D** | 48 | 5 | 向裸 IP 地址发送请求 `net.raw-ip-destination` | [`chenxiachan__thoughtdag.md`](./chenxiachan__thoughtdag.md) |
| 61 | [dsh-genui](https://github.com/omdsh-dev/dsh-genui) | 466 | **D** | 0 | 18 | 同一个包内既有环境变量收集又有对外请求 `exfil.environment-harvest-then-callback` | [`omdsh-dev__dsh-genui.md`](./omdsh-dev__dsh-genui.md) |
| 62 | [dsh-image-gen](https://github.com/shanliuling/dsh-image-gen) | 439 | **D** | 9 | 9 | 向裸 IP 地址发送请求 `net.raw-ip-destination` | [`shanliuling__dsh-image-gen.md`](./shanliuling__dsh-image-gen.md) |
| 63 | [Invoice-Downloader#dsh-invoice-downloader](https://github.com/EthanYoQ/Invoice-Downloader/tree/main/plugins/dsh-invoice-downloader) | 428 | **A** | 91 | 2 | 用保留名称注册工具 `harness.reserved-tool-name` | [`EthanYoQ__Invoice-Downloader.md`](./EthanYoQ__Invoice-Downloader.md) |
| 64 | [anysearch-dsh](https://github.com/anysearch-team/anysearch-dsh) | 420 | **D** | 19 | 9 | 源码字符串中夹带针对模型的指令 `prompt.embedded-instruction-string` | [`anysearch-team__anysearch-dsh.md`](./anysearch-team__anysearch-dsh.md) |
| 65 | [flowix#dsh-flowix-memory](https://github.com/text2future/flowix/tree/main/dsh-flowix-memory) | 415 | **A** | 100 | 0 | — | [`text2future__flowix.md`](./text2future__flowix.md) |
| 66 | [dsh-synapse](https://github.com/liangmianya/dsh-synapse) | 409 | **C** | 59 | 5 | 文档中包含针对模型的指令 `prompt.doc-instruction` | [`liangmianya__dsh-synapse.md`](./liangmianya__dsh-synapse.md) |
| 67 | [dsh-mnemon](https://github.com/omdsh-dev/dsh-mnemon) | 386 | **D** | 0 | 23 | 同一个包内既有环境变量收集又有对外请求 `exfil.environment-harvest-then-callback` | [`omdsh-dev__dsh-mnemon.md`](./omdsh-dev__dsh-mnemon.md) |
| 68 | [open-sea-skin](https://github.com/d-dev0101/open-sea-skin) | 378 | **D** | 5 | 8 | 向裸 IP 地址发送请求 `net.raw-ip-destination` | [`d-dev0101__open-sea-skin.md`](./d-dev0101__open-sea-skin.md) |
| 69 | [dsh-plugin-subscriptions](https://github.com/V1ki/dsh-plugin-subscriptions) | 373 | **D** | 3 | 12 | 源码字符串中夹带针对模型的指令 `prompt.embedded-instruction-string` | [`V1ki__dsh-plugin-subscriptions.md`](./V1ki__dsh-plugin-subscriptions.md) |
| 70 | [dsh-univer-office](https://github.com/dream-num/dsh-univer-office) | 372 | **D** | 0 | 15 | 同一个包内既有环境变量收集又有对外请求 `exfil.environment-harvest-then-callback` | [`dream-num__dsh-univer-office.md`](./dream-num__dsh-univer-office.md) |
| 71 | [harmony-next.skills](https://github.com/linhay/harmony-next.skills) | 351 | **B** | 75 | 2 | 文档中包含针对模型的指令 `prompt.doc-instruction` | [`linhay__harmony-next.skills.md`](./linhay__harmony-next.skills.md) |
| 72 | [whale-girl](https://github.com/vlln/whale-girl) | 326 | **D** | 25 | 9 | 向裸 IP 地址发送请求 `net.raw-ip-destination` | [`vlln__whale-girl.md`](./vlln__whale-girl.md) |
| 73 | [DSH-taskboard](https://github.com/shengsheng90/DSH-taskboard) | 326 | **D** | 10 | 8 | 文档中包含针对模型的指令 `prompt.doc-instruction` | [`shengsheng90__DSH-taskboard.md`](./shengsheng90__DSH-taskboard.md) |
| 74 | [oh-dsh](https://github.com/hust-open-atom-club/oh-dsh) | 318 | **D** | 0 | 25 | 把下载内容直接管道给 shell `priv.curl-pipe-shell` | [`hust-open-atom-club__oh-dsh.md`](./hust-open-atom-club__oh-dsh.md) |
| 75 | [dsh-cost-meter](https://github.com/Han-1413141/dsh-cost-meter) | 314 | **D** | 0 | 14 | 向裸 IP 地址发送请求 `net.raw-ip-destination` | [`Han-1413141__dsh-cost-meter.md`](./Han-1413141__dsh-cost-meter.md) |
| 76 | [dsh-wallpaper-engine](https://github.com/elysia395/dsh-wallpaper-engine) | 307 | **D** | 0 | 8 | 执行运行时拼装出来的代码 `obf.dynamic-code-eval` | [`elysia395__dsh-wallpaper-engine.md`](./elysia395__dsh-wallpaper-engine.md) |
| 77 | [dsh-ios](https://github.com/ZSeven-W/dsh-ios) | 297 | **D** | 0 | 15 | 混淆代码叠加对外网络访问 `obf.obfuscation-with-network-callback` | [`ZSeven-W__dsh-ios.md`](./ZSeven-W__dsh-ios.md) |
| 78 | [dsh-commandcode-provider](https://github.com/Mars-Sea/dsh-commandcode-provider) | 289 | **D** | 34 | 8 | 文档中包含针对模型的指令 `prompt.doc-instruction` | [`Mars-Sea__dsh-commandcode-provider.md`](./Mars-Sea__dsh-commandcode-provider.md) |
| 79 | [dsh-tianshu-tui](https://github.com/huiliyi37/dsh-tianshu-tui) | 280 | **D** | 0 | 16 | 内置破坏性文件系统命令 `destructive.shipped-command` | [`huiliyi37__dsh-tianshu-tui.md`](./huiliyi37__dsh-tianshu-tui.md) |
| 80 | [dsh-mobile](https://github.com/saya-ch/dsh-mobile) | 276 | **D** | 0 | 24 | 凭据读取、解码步骤与对外请求同时出现 `exfil.credential-read-decode-callback` | [`saya-ch__dsh-mobile.md`](./saya-ch__dsh-mobile.md) |
| 81 | [dsh-visualize](https://github.com/Nagi-ovo/dsh-visualize) | 262 | **D** | 0 | 4 | 同一个包内既有环境变量收集又有对外请求 `exfil.environment-harvest-then-callback` | [`Nagi-ovo__dsh-visualize.md`](./Nagi-ovo__dsh-visualize.md) |
| 82 | [dsh-memory](https://github.com/FuRongJun-1999/dsh-memory) | 225 | **D** | 0 | 18 | 凭据读取、解码步骤与对外请求同时出现 `exfil.credential-read-decode-callback` | [`FuRongJun-1999__dsh-memory.md`](./FuRongJun-1999__dsh-memory.md) |
| 83 | [dsh-free-search](https://github.com/DDDMUC/dsh-free-search) | 210 | **D** | 0 | 8 | 文档中包含针对模型的指令 `prompt.doc-instruction` | [`DDDMUC__dsh-free-search.md`](./DDDMUC__dsh-free-search.md) |
| 84 | [dsh-popout-sidebar](https://github.com/e2mcc/dsh-popout-sidebar) | 210 | **D** | 0 | 3 | 执行运行时拼装出来的代码 `obf.dynamic-code-eval` | [`e2mcc__dsh-popout-sidebar.md`](./e2mcc__dsh-popout-sidebar.md) |
| 85 | [deepseek-harness-remote](https://github.com/liguobao/deepseek-harness-remote) | 207 | **D** | 0 | 21 | 在同一个请求里发送本地文件或环境变量数据 `exfil.local-data-in-request` | [`liguobao__deepseek-harness-remote.md`](./liguobao__deepseek-harness-remote.md) |
| 86 | [dsh-liang-skin](https://github.com/kingOfSoySauce/dsh-liang-skin) | 204 | **B** | 82 | 1 | composition patch 会禁用其他插件 `harness.patch-disable-plugin` | [`kingOfSoySauce__dsh-liang-skin.md`](./kingOfSoySauce__dsh-liang-skin.md) |
| 87 | [TokenLedger](https://github.com/zh667/TokenLedger) | 202 | **D** | 42 | 8 | 文档中包含针对模型的指令 `prompt.doc-instruction` | [`zh667__TokenLedger.md`](./zh667__TokenLedger.md) |
| 88 | [echocat-skill-panel-3.0](https://github.com/VDERR/echocat-skill-panel-3.0) | 201 | **D** | 0 | 10 | 连接已知的数据外传或隧道服务 `net.exfil-service-host` | [`VDERR__echocat-skill-panel-3.0.md`](./VDERR__echocat-skill-panel-3.0.md) |
| 89 | [pi2dsh](https://github.com/weijiafu14/pi2dsh) | 199 | **D** | 0 | 29 | 同一个包内既有环境变量收集又有对外请求 `exfil.environment-harvest-then-callback` | [`weijiafu14__pi2dsh.md`](./weijiafu14__pi2dsh.md) |
| 90 | [seektty](https://github.com/Hilbert-beinghappy/seektty) | 198 | **D** | 0 | 26 | 凭据读取、解码步骤与对外请求同时出现 `exfil.credential-read-decode-callback` | [`Hilbert-beinghappy__seektty.md`](./Hilbert-beinghappy__seektty.md) |
| 91 | [dsh-data-agent](https://github.com/omdsh-dev/dsh-data-agent) | 195 | **D** | 0 | 15 | 同一个包内既有环境变量收集又有对外请求 `exfil.environment-harvest-then-callback` | [`omdsh-dev__dsh-data-agent.md`](./omdsh-dev__dsh-data-agent.md) |
| 92 | [sandbase-skills](https://github.com/sandbaseai/sandbase-skills) | 195 | **A** | 93 | 1 | 包连接的不同主机数量多得不合常理 `net.excessive-distinct-hosts` | [`sandbaseai__sandbase-skills.md`](./sandbaseai__sandbase-skills.md) |
| 93 | [engramory#plugin](https://github.com/tinqiao-oss/engramory/tree/master/adapters/dsh/plugin) | 191 | **A** | 93 | 1 | 用保留名称注册工具 `harness.reserved-tool-name` | [`tinqiao-oss__engramory.md`](./tinqiao-oss__engramory.md) |
| 94 | [dsh-chat-import](https://github.com/Nwflower/dsh-chat-import) | 189 | **D** | 0 | 12 | 源码字符串中夹带针对模型的指令 `prompt.embedded-instruction-string` | [`Nwflower__dsh-chat-import.md`](./Nwflower__dsh-chat-import.md) |
| 95 | [dsh-auto-review](https://github.com/PerryLink/dsh-auto-review) | 187 | **D** | 0 | 17 | 同一个包内既有环境变量收集又有对外请求 `exfil.environment-harvest-then-callback` | [`PerryLink__dsh-auto-review.md`](./PerryLink__dsh-auto-review.md) |
| 96 | [dsh-damage-pulse](https://github.com/wssfk12138/dsh-damage-pulse) | 180 | **D** | 0 | 11 | 同一个包内既有环境变量收集又有对外请求 `exfil.environment-harvest-then-callback` | [`wssfk12138__dsh-damage-pulse.md`](./wssfk12138__dsh-damage-pulse.md) |
| 97 | [dsh-memory](https://github.com/seriousz158/dsh-memory) | 180 | **C** | 70 | 7 | 文档中包含针对模型的指令 `prompt.doc-instruction` | [`seriousz158__dsh-memory.md`](./seriousz158__dsh-memory.md) |
| 98 | [dsh-dream-skin](https://github.com/RevolutionLA/dsh-dream-skin) | 177 | **D** | 43 | 9 | 通过 sudo 提权 `priv.sudo-invocation` | [`RevolutionLA__dsh-dream-skin.md`](./RevolutionLA__dsh-dream-skin.md) |
| 99 | [dsh-agent-team-gui](https://github.com/toolclub/dsh-agent-team-gui) | 176 | **D** | 0 | 15 | 同一个包内既有环境变量收集又有对外请求 `exfil.environment-harvest-then-callback` | [`toolclub__dsh-agent-team-gui.md`](./toolclub__dsh-agent-team-gui.md) |
| 100 | [dsh-openpencil](https://github.com/ZSeven-W/dsh-openpencil) | 174 | **D** | 0 | 10 | 向裸 IP 地址发送请求 `net.raw-ip-destination` | [`ZSeven-W__dsh-openpencil.md`](./ZSeven-W__dsh-openpencil.md) |

## 最常触发的规则 / Most frequently fired rules

| 规则 Rule | 命中次数 Hits | 类别 Category |
| --- | ---: | --- |
| `cred.credential-path-mention` | 66 | cred |
| `net.plaintext-http` | 66 | net |
| `net.raw-ip-destination` | 58 | net |
| `supply.unscannable-payload-with-network` | 56 | supply |
| `obf.dynamic-require` | 49 | obf |
| `net.excessive-distinct-hosts` | 47 | net |
| `harness.reserved-tool-name` | 45 | harness |
| `prompt.doc-instruction` | 42 | prompt |
| `obf.long-minified-line` | 41 | obf |
| `prompt.embedded-instruction-string` | 40 | prompt |
| `persist.global-self-install` | 32 | persist |
| `install.hook-runs-shell-code` | 27 | install |
| `net.token-or-blob-in-url` | 27 | net |
| `cred.many-secret-env-vars` | 26 | cred |
| `obf.decoded-payload-literal` | 25 | obf |
| `prompt.concealed-instruction` | 22 | prompt |
| `cred.env-harvest` | 21 | cred |
| `persist.shell-rc-append` | 19 | persist |
| `obf.dynamic-code-eval` | 18 | obf |
| `exfil.environment-harvest-then-callback` | 17 | exfil |
| `net.covert-channel` | 17 | net |
| `priv.sudo-invocation` | 13 | priv |
| `destructive.recursive-delete-system-path` | 12 | 破坏性 / destructive |
| `supply.url-dependency` | 12 | supply |
| `priv.system-path-modification` | 12 | priv |

## 类别分布 / Findings by category

| 类别 Category | 命中次数 Hits |
| --- | ---: |
| 网络回调 / network callbacks | 223 |
| 凭据读取 / credential access | 147 |
| 混淆 / obfuscation | 143 |
| 提示注入 / prompt injection | 108 |
| 供应链 / supply chain | 99 |
| 持久化 / persistence | 74 |
| 滥用宿主环境 / harness abuse | 62 |
| 数据外传 / exfiltration | 59 |
| 提权 / privilege | 41 |
| 安装脚本 / install scripts | 40 |
| 破坏性 / destructive | 23 |

## 方法 / Method

- 名单来自市场数据集 `plugins.json`（每日刷新），**只用一次 HTTP 请求**拿到 stars——GitHub 未认证 API 每小时只有 60 次，按仓库逐个查星数会超限，也不会更快。
- 源码包取 `codeload.github.com/<owner>/<repo>/tar.gz/HEAD`，走扫描器自身的 URL 路径（等同 `install.fetch: true`），带超时与一次重试。
- 单体仓库条目（列表里写作 `<repo>#<subdir>`）**只扫描该子目录**并剥掉前缀。不这样做会把整个仓库当成插件来判：同一条目未限定范围时是 484 个文件 → D(24 条)，限定到列表真正指向的目录后是 21 个文件 → C(3 条)。
- 体检不执行任何代码，也不写入磁盘。

### 这份报告能说明什么 / What this does and does not show

说明：这套规则在真实、互不相关的代码上是可跑通的，且能给出可读的分级与证据。
不说明：D 级等于恶意。规则命中是**需要人看一眼的问题**，不是判决；这里的 D 级里既有真实的凭据外传形态，也有插件自带的签名表、打包产物和构建脚本。

> A `D` here is not an accusation. It means a rule fired that a human should read — the catalog is calibrated to be read, not to be believed.
