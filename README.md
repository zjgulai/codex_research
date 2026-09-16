# Agent OPC Full-stack Atlas

一个可离线打开的单页网站，把 4,184 个 Codex 插件和 `Agentic-Tools` GitHub 列表中的 81 个项目，映射到 `vibecoding_config` 的 M00–M13 全栈开发节点。

网站为 [public/index.html](public/index.html)。默认入口是“全栈工作台地图”：先选开发阶段和具体节点，再在“Codex 插件 / Agent 技能”之间切换。每个节点显示三项任务、交付结果和最多 3 个候选；完整目录、原始分数与审计证据保留在第二层。

它不加载外部脚本、字体、图片或数据；阶段切换、搜索、筛选和详情弹窗都在单个 HTML 内运行。

全量派生数据以 `gzip + Base64` 内嵌，并由现代浏览器原生 `DecompressionStream` 解压。这样保留单文件与离线能力，同时避免把约 14.5 MB 的明文 JSON 直接塞进首包；不支持该 Web API 的旧浏览器会显示明确错误。

## 它回答什么

每个插件、Skill 或 GitHub 项目固定回答三件事：

1. 能帮你做什么；
2. 使用前要准备什么；
3. 怎样确认真能用。

插件工作台的 42 个候选沿用原有人工编辑层。Agent 技能工作台从 81 个仓库中选出 40 条节点候选：M01 与 M10 只保留 2 条，其余节点各 3 条，不为凑数补位。直接 Skill、整包依赖 Skill 与需封装工具分开标记；本轮没有安装、调用或 benchmark 第三方代码。

节点映射是研究模型的推断，不是插件作者的官方定位。插件只能为 Gate 提供证据，不能替人通过 Gate。`已安装`、`已认证`、`调用通过`和`生产可用`也是四种不同状态。

## 证据基线

- 插件身份与状态：4,184 个 canonical plugin IDs，冻结于 2026-09-16 01:29:11 +08:00。
- 插件丰富元数据与公共声量代理：研究快照生成于 2026-09-15T18:01:19.457Z。
- 当前 remote catalog Skill 证据：5,420 条，目录时间标记为 2026-09-15T20:05:45.943690Z；本次构建另固定其 SHA-256。
- 外部 Agent 能力：[Agentic-Tools 列表](https://github.com/stars/zjgulai/lists/agentic-tools)于 2026-09-16T05:19:10.149Z 冻结为 81 个唯一仓库，membership SHA-256 为 `912d4f33a5e1cdf38e1312bd6687d6cf6f8d4331552dc732b7ba96eed57e5bc9`。
- 81 个仓库包含 8,779 条 `SKILL.md` 路径、4,326 个仓库内唯一 blob；这些是审计漏斗，不是 4,326 个可安装 Skill。最终工作台只保留 40 条静态候选。
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
  --output=public/index.html \
  --manifest=data/build-manifest.json
```

生成器会验证 canonical ID 唯一性、总数、单一主节点、技能父子关系、Agentic-Tools 列表成员与冻结 SHA、每节点精选名次、HTML CSP、压缩数据的大小与 SHA-256、内嵌数据一致性和敏感路径泄漏。

若需刷新 GitHub 列表证据，先运行 `scripts/fetch-agentic-tools.mjs`，再人工更新 `data/agentic-tools-curation.json`，最后用 `scripts/evaluate-agentic-tools.mjs` 重算。抓取、策展、评分和网站生成是四个独立步骤；自动抓取不会自动晋升推荐。

生成后再运行独立 artifact 检查：

```bash
node scripts/verify-artifact.mjs public/index.html data/build-manifest.json
```

## 发布

推送 `main` 后，GitHub Actions 直接把 `public/` 部署到 GitHub Pages。没有构建步骤，也不会把本地研究原始文件发布出去。

## 许可与来源

本仓库未替外部插件说明、上游 Skill 仓库或第三方数据声明新的许可。原始描述仍归各自权利人；本项目只发布必要的短元数据、研究映射和证据边界。无明确适用许可证的可执行能力不会进入主推荐；存在单 Skill 许可证时只按该目录标注，不外推到整个仓库。
