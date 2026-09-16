# 方法与审计边界

## 1. 对象模型

本项目采用四类互不混淆的对象：

- `M00–M13`：执行模块；每个插件和 Skill 必须且只能有一个主模块。
- `A00–A13`：模块间持久交接的证据产物，不是额外的流程节点。
- `G0–G6`：生命周期的人类决策门；工具只能补证据，不能自行通过。
- `R0–R3`：风险与最低验证等级；真实外部动作仍需对象级、当次、未过期的授权。

`vibecoding_config` 的旧文档还把 G0–G6 用作动作影响等级。它与后来的生命周期 Gate 同名不同义。本网站保留后者，并把动作影响单独命名为 `effectClass`，避免混算。

## 2. M00–M13 匹配

主节点取“该能力最直接改善哪个 Axx 的核心决定或证据”。生成器分别计算：

- 插件名、说明、capabilities、keywords 的直接词项；
- 原有全栈解决方案分类与 stage tag 的弱先验；
- 输出、验证和副作用与节点职责的适配；
- 第一名与第二名的分差。

输出字段包括 `primaryModule`、`secondaryModules`、`fitScore`、`matchConfidence` 与 `matchReasons`。这是可复算的启发式研究分类，不是语义模型实测，也不是作者声明。低分差、版本歧义、说明过少或原分类待复核时进入 `review`。

## 3. “核心三件事”

`shuorenhua` 在这里充当保真编辑器，而不是事实调查器。生成顺序是：来源元数据 → 能力拆解 → 条件与证据标签 → 清晰化 → 保真检查。

每张卡片固定为：

1. **能帮你做什么**：优先呈现插件独有动作与对象；不把目录声明升级为实测能力。
2. **使用前要准备什么**：安装状态、认证策略、能力形态与未知条件；不把 Skill 加载写成外部连接成功。
3. **怎样确认真能用**：给出最小验证、可观察结果、未验证缺口与副作用边界。

插件工作台的 42 个首选候选使用人工精炼的中文能力摘要和最小验证。Agent 能力库的 72 条候选逐条保存独立的“核心能力／使用条件／最低验证”，并额外记录工作角色、覆盖方式和证据入口等级。完整目录的其余长尾项目保留来源说明，并使用同一套保真边界；不把机器生成的通用节点句冒充独有能力。

产品名、plugin ID、版本、数字、否定、条件、情态和完成状态保持不变。资料不足时显示“未知／未说明／未实测”，不改写成“没有／无需／安全”。

## 4. Skill 证据层

冻结插件快照只有 `skillCount`，没有 Skill 名称与逐条说明。当前 remote catalog 提供逐 Skill 元数据，但目录已有漂移。因此网站区分：

- `frozen-exact`：当前目录中仍能找到冻结版本，Skill 元数据可与版本精确绑定；
- `current-version-drift`：只有同名插件的新版本，当前 Skill 可供参考，但不得冒充冻结版本；
- `local-bundle-exact`：本机缓存中存在精确版本的 `SKILL.md` front matter；
- `historical-payload-missing`：冻结版本声明有 Skill，但当前无法恢复逐条载荷。

Skill 记录以 `canonicalPluginId + releaseVersion + skillName` 为键。父插件的功能分与公共声量只作为上下文，不代表该 Skill 本身经过独立评分或获得相同采用量。

## 5. Agentic-Tools 外部能力审计

外部源是用户的 GitHub Star List `agentic-tools`。抓取器在列表成员前后各读取一次页面，只有成员集合稳定时才写入快照。本次固定 81 个唯一仓库和 membership SHA-256；每个仓库再绑定默认分支 HEAD、README、递归 tree、许可证、release、workflow、测试和 `SKILL.md` 证据。空仓库、归档仓库和 API 异常保留为事实，不从列表中静默删除。

这里有两种发布对象，不能与插件内 Skill 混为一谈：

- `agentic-project`：81 个仓库全部保留的项目级审计；
- `agentic-skill`：为兼容现有页面 schema 保留的能力记录类型。当前共有 72 条，其中原始 40 条属于 `v1-40` benchmark cohort，新增 32 条用于补齐角色覆盖；有原生 Skill 时键为 `repo + HEAD + Skill path/blob`，没有原生 Skill 时使用明确的 workflow slug。

`SKILL.md` 的原始路径数会被示例、fixture、复制目录和相同 blob 放大。因此页面同时给出 8,779 条路径、4,326 个仓库内唯一 blob、67 条冻结原生路径和 5 条工作流 / wrapper 候选，并明确这些数字都不是“已安装 Skill 数”。

先过硬门槛，再评分。归档、空仓库、重复、低相关和许可证不清会阻断主推荐；单 Skill 自带许可证时，只能解除该目录的许可疑问。能力形态分为：

- `direct-skill`：有可冻结的 Skill 文件，可作为单项候选；
- `package-bound-skill`：Skill 与 CLI、框架、服务或整包 helper 强耦合；
- `wrap-candidate`：项目有价值，但需要另写 Skill 封装；
- `reference-only`：只作为架构或产品参考；
- `quarantined`：只能在隔离、授权范围内研究。

项目质量分由相关度 25%、能力价值 20%、工作流就绪度 20%、有效性证据 15%、项目健康 10% 和信任 10% 组成。公开声量单列，使用 Stars、forks、subscribers、增长速度和 release 新鲜度的对数归一代理；它最多只占研究优先级 8%，且不能越过硬门槛。Stars 不是安装量、用户数、留存或生产采用。

候选入口和验证结论拆成两条轴。能力形态回答“它以什么方式提供”，证据入口回答“我们目前真正知道到哪一步”：

- `source-confirmed`：冻结来源、HEAD、载体和许可边界，只证明对象存在；
- `static-reviewed`：读过说明并标明依赖、副作用与适用边界，不等于能运行；
- `controlled-smoke`：完整 materialize 后在受控范围完成代表性最小任务；
- `task-benchmarked`：通过预注册任务、对照组、重复运行和合格评分器。

本版 72 条能力只使用前两级，`runtimeVerified` 继续固定为 0。第一轮另有 4 条 `v1-40` 单文件 Skill 进入“执行器校准”：只把固定 blob 放进一次性工作区，让同一模型在 baseline / Skill 两个 arm 上各运行两次。它验证的是 runner，不是候选效果，因此不会把候选升级为 `controlled-smoke` 或 `task-benchmarked`。

## 6. Benchmark 门槛

最小实验单位是 `candidate × fixture × arm × replicate`。baseline 与 Skill arm 的模型、reasoning effort、输入、输出合同和权限保持一致；Skill arm 只多出固定到 `repo + HEAD + path/blob` 的候选指令。自动触发另做 smoke suite，不能与“指令本身有没有价值”混为一项。

证据等级严格分开：

- `static-reviewed`：只核对静态结构、来源、依赖与边界；旧版 `structure-checked` 语义并未更强；
- `isolated-materialized`：固定文件被放入一次性目录并实际读取，但没有证明完整安装或 OS 级网络隔离；
- `smoke-tested`：显式调用、正负触发、缺依赖和失败边界全部过门；
- `task-benchmarked`：至少 8 个独立 fixture × 2 arm × 3 次重复，且通过效果、安全、依赖、可撤回四轴硬门；
- 默认 OPC 栈：只能由 `task-benchmarked` 候选经人工审查晋级。

第一版校准覆盖 4 条 B0 单文件 Skill、16 次运行。执行器结果为：16/16 完成、8/8 Skill arm 实际读取固定 `SKILL.md`、8/8 baseline 没有读取、16/16 工作区前后哈希一致。它没有运行第三方脚本，也没有真实账号、外部写入或生产动作。

评分器没有过门：关键词匹配对中英文和 `3 / three` 等写法敏感；两条候选的重复分差超过 20；发布证据 fixture 的 baseline 与 Skill 都达到 100，出现天花板效应。全部 delta 只作诊断，`scoreUsableForRanking` 固定为 false；`smokeTested`、`taskBenchmarked` 和 `promotedToDefault` 均为 0。下一轮必须先冻结 v2 多语言断言、增加对抗样例并校准独立盲评。

## 7. 排序

网站保留三种可切换视角，不把它们伪装成一个“真排名”：

- **节点适配**：本项目的 M00–M13 启发式适配度；
- **功能潜力**：插件页面元数据经证据折扣后的 Agent 全栈潜力，不是 runtime benchmark；
- **公开声量代理**：直接关联 GitHub 仓库或品牌域名的公开代理，不是安装量、活跃用户或留存。

“研究优先级”只用于发现候选：节点适配 55%，功能潜力 35%，有可归因声量时最多 10%；缺失声量不会当成零。页面始终并列展示原始分项和证据置信度。

工作台不是第四种自动分数。插件侧在每个节点的完整排名上增加一层显式编辑选择：优先考虑 Agent 全栈开发的通用性、当前是否已安装，以及是否能给出清楚的最小验证。

Agent 侧不再用“每节点最多 3 个”压平不同职责，而是把每个节点拆成四个独立工作位：

- `core`：主执行，把本节点的核心事情做出来；
- `review`：独立找错、找漏并挑战承重假设；
- `visualize`：把关系、状态、差异与证据画清楚；
- `summarize`：保留事实、来源、决定、缺口、负责人和下一步。

72 条去重能力形成 116 个 `capability × module × leadRole` 分配。页面默认展示该角色内的有序候选，目录的节点与角色筛选必须命中同一条分配，不能把 `primaryModule` 和角色标签拼成不存在的适配。M06 总结、M08 通用可视化、M09 质量裁决总结、M10 发布状态图与 M13 能力谱系图仍缺少强专用 Skill，因此显式显示 `generalist`、`combined` 或 `wrapper`，不伪装成完整覆盖。

原始研究主节点与工作位分配是两回事：`primaryModule` 用于说明主要研究归类，`workbenchAssignments` 用于说明能力在哪个节点承担什么角色。原始排名不被改写，用户可回到完整目录复核。这个编辑层用于缩小候选，不代表作者背书、运行通过或生产可用。

## 8. 状态与风险

`installed` 仅表示快照中的安装状态。网站没有逐个完成认证、工具调用、写入、安全或生产稳定性测试，因此不会把任何项目标为 `Ready Now`。

动作影响被分为：

`read-only`、`local-artifact`、`workspace`、`git`、`external`、`secrets`、`production`。

它是根据说明和接口形态推断的审计提示，不是正式权限清单。写入、删除、发信、付费、发布、交易或生产动作仍需查看真实工具 schema、最小权限、预览或 dry-run、read-back 与明确授权。

## 9. 公开发布边界

单页只内嵌派生后的必要字段，不发布本地配置、认证信息、原始缓存路径、原始 Agent 事件流或研究临时文件。Benchmark 原始回答和事件记录位于 Git 忽略目录；页面只发布冻结版本、运行条件、聚合断言、哈希和限制。派生数据以 `gzip + Base64` 内嵌，页面使用浏览器原生 `DecompressionStream` 解压；不依赖 CDN、外部脚本或数据请求。第三方网站不会被自动加载；外链只在用户点击时导航。

发布验证分开记录：本地 HTML 检查、Git commit、远端 push、Actions workflow、Pages deployment 与公开页面字节验证，任何一项都不能替代下一项。
