# Agent OPC Full-stack Atlas

一个可离线打开的单页网站，把 4,184 个 Codex 插件和 `Agentic-Tools` GitHub 列表中的 81 个项目，映射到 `vibecoding_config` 的 M00–M13 全栈开发节点。

网站为 [public/index.html](public/index.html)。默认入口是“全栈工作台地图”：先选开发阶段和具体节点，再在“Codex 插件 / Agent 能力”之间切换。插件侧仍给 Top 3；Agent 侧按“主执行、Review、可视化、总结交接”组成节点工作包。完整目录、原始分数与审计证据保留在第二层。

它不加载外部脚本、字体、图片或数据；阶段切换、搜索、筛选和详情弹窗都在单个 HTML 内运行。

全量派生数据以 `gzip + Base64` 内嵌，并由现代浏览器原生 `DecompressionStream` 解压。这样保留单文件与离线能力，同时避免把约 14.5 MB 的明文 JSON 直接塞进首包；不支持该 Web API 的旧浏览器会显示明确错误。

## 它回答什么

每个插件、Skill 或 GitHub 项目固定回答三件事：

1. 能帮你做什么；
2. 使用前要准备什么；
3. 怎样确认真能用。

插件工作台的 42 个候选沿用原有人工编辑层。Agent 能力库从 81 个仓库中选出 96 条去重能力：原始 40 条 `v1-40`、32 条首批角色扩展和 24 条本批工作流扩展；其中 91 条绑定冻结的 `SKILL.md`，5 条是工作流 / wrapper 候选。这些能力在 M00–M13 中形成 149 个角色工作位，并由 14 条显式工作流关系连接输入产物、输出产物和验收方式。直接 Skill、整包依赖、通用补位、组合覆盖、需封装和只作参考分开标记，不为“每个节点看起来都有”伪造专用能力。

原始 40 条候选继续作为固定的 `v1-40` benchmark cohort；32 条首批扩展和本批 24 条扩展只进入候选库，不自动污染既有计划。首轮从 cohort 中取 4 条单文件 Skill 做了 16 次 baseline / Skill A/B 校准。执行器通过了固定 blob、显式读取、结构化输出和工作区零变化检查，但关键词评分器没有通过校准，因此本轮仍是 0 条 `smoke-tested`、0 条 `task-benchmarked`、0 条默认栈晋级。页面会显示这次失败，而不是拿不可靠的 delta 做排行。

节点映射是研究模型的推断，不是插件作者的官方定位。插件只能为 Gate 提供证据，不能替人通过 Gate。`已安装`、`已认证`、`调用通过`和`生产可用`也是四种不同状态。

## 证据基线

- 插件身份与状态：4,184 个 canonical plugin IDs，冻结于 2026-09-16 01:29:11 +08:00。
- 插件丰富元数据与公共声量代理：研究快照生成于 2026-09-15T18:01:19.457Z。
- 当前 remote catalog Skill 证据：5,425 条（其中冻结插件声明合计 5,405 条），目录抓取时间为 2026-09-16T18:35:21.164413Z；本次构建另固定其 SHA-256。当前 `frozen-exact` 5,202 条、`current-version-drift` 210 条、受影响插件缺口 54 个，未静默沿用旧结论。
- 外部 Agent 能力：[Agentic-Tools 列表](https://github.com/stars/zjgulai/lists/agentic-tools)于 2026-09-16T05:19:10.149Z 冻结为 81 个唯一仓库，membership SHA-256 为 `912d4f33a5e1cdf38e1312bd6687d6cf6f8d4331552dc732b7ba96eed57e5bc9`。
- 81 个仓库包含 8,779 条 `SKILL.md` 路径、4,326 个仓库内唯一 blob；这些是审计漏斗，不是 4,326 个可安装 Skill。最终能力库保留 96 条去重能力：91 条原生路径、5 条工作流 / wrapper 候选，共 149 个节点角色分配和 14 条工作流关系。Vercel 路径因许可证未确认只作参考，不进入可复制安装结论。
- Benchmark 计划覆盖 40/40 条候选：B0 18、B1 8、B2 6、B3 4、B4 1、B5 1、尚需封装 2；第一轮只校准 4 条 B0 候选。
- 校准使用 `gpt-5.6-luna`、low reasoning、Codex CLI 0.145.0、只读工作区、禁用 web search、每 arm 两次重复。16/16 次运行完成，8/8 个 Skill arm 读取固定 blob，8/8 个 baseline 未读取，16/16 个工作区哈希不变。
- 校准不等于正式 benchmark：只有一个 fixture、没有独立盲评、没有 trigger smoke suite，且确定性评分出现语言敏感、高方差和天花板效应。
- 全栈节点：[vibecoding_config@d0a611e](https://github.com/zjgulai/vibecoding_config/commit/d0a611e7d86939ba873af2bd5e686e64b07f85ea)。
- 保真改写方法：[shuorenhua@5a9eafe](https://github.com/MrGeDiao/shuorenhua/commit/5a9eafefe03807404135f4d2ee4f42fe61d58759)。

完整方法、已知缺口与排序边界见 [METHODOLOGY.md](METHODOLOGY.md)，执行状态见 [PLAN.md](PLAN.md)，当前视觉验收见 [design-qa.md](design-qa.md)。

## 本地再生成

无需安装 npm dependency。准备冻结的研究快照与 Codex remote catalog 后运行：

```bash
node scripts/build-site.mjs \
  --snapshot=/absolute/path/plugin-research-snapshot.json \
  --catalog=/absolute/path/remote-plugin-catalog.json \
  --local-cache=/absolute/path/plugin-cache \
  --agentic-source=data/agentic-tools-source.json \
  --agentic-evaluations=data/agentic-tools-evaluations.json \
  --agentic-benchmarks=data/agentic-benchmark-results.json \
  --output=public/index.html \
  --manifest=data/build-manifest.json
```

生成器会验证 canonical ID 唯一性、总数、单一研究主节点、技能父子关系、Agentic-Tools 列表成员与冻结 SHA、96 条能力、40 条 benchmark cohort、14 × 4 角色覆盖与连续名次、工作流关系端点与能力引用、HTML CSP、压缩数据的大小与 SHA-256、内嵌数据一致性和敏感路径泄漏。

若需刷新 GitHub 列表证据，先运行 `scripts/fetch-agentic-tools.mjs`，再人工更新项目策展 `data/agentic-tools-curation.json` 与角色策展 `data/agentic-role-curation.json`，最后用 `scripts/evaluate-agentic-tools.mjs` 重算。抓取、策展、角色分配、评分和网站生成是独立步骤；自动抓取不会自动晋升推荐。

生成后再运行独立 artifact 检查：

```bash
node scripts/verify-artifact.mjs public/index.html data/build-manifest.json
```

## Benchmark

协议在 [benchmarks/protocol.json](benchmarks/protocol.json)，40 条执行矩阵在 [benchmarks/candidates.json](benchmarks/candidates.json)，第一版校准 fixture 在 [benchmarks/calibration-suite.json](benchmarks/calibration-suite.json)。原始输出与事件记录只保存在被 Git 忽略的 `benchmarks/.runs/`，公开数据只发布哈希、断言、边界和聚合结果，不保存私有推理。

```bash
node scripts/benchmark/plan.mjs
node scripts/benchmark/run.mjs --output=benchmarks/.runs/calibration --concurrency=2
node scripts/benchmark/score.mjs \
  benchmarks/.runs/calibration \
  benchmarks/calibration-suite.json \
  benchmarks/candidates.json \
  data/agentic-benchmark-results.json
```

第一版 scorer 明确标为 `failed-needs-v2`。下一版必须先固定多语言语义断言、加入对抗 fixture，并用独立盲评校准；在此之前不得用校准分数重排候选。

## 发布

推送 `main` 后，GitHub Actions 直接把 `public/` 部署到 GitHub Pages。没有构建步骤，也不会把本地研究原始文件发布出去。

## 许可与来源

本仓库未替外部插件说明、上游 Skill 仓库或第三方数据声明新的许可。原始描述仍归各自权利人；本项目只发布必要的短元数据、研究映射和证据边界。无明确适用许可证的可执行能力不会进入主推荐；存在单 Skill 许可证时只按该目录标注，不外推到整个仓库。
