# 执行计划与 TODO

完成标准：4,184 个插件身份不丢失；插件内 Skill 可追溯到父插件和版本；Agentic-Tools 的 81 个仓库全部有项目级审计，精选能力可追溯到固定 HEAD 与 Skill blob 或明确封装对象；每条记录有唯一主节点与“做什么／怎么用／怎么验”；网站单文件、无外部运行依赖；通过 ELI5、数据、桌面和手机验证；GitHub Pages 公网可访问且与本地文件一致。

## Phase 1 — 冻结真相源

- [x] 固定 `vibecoding_config` commit 并审计 M00–M13、A00–A13、G0–G6、R0–R3。
- [x] 固定 `shuorenhua` commit，并抽取保真编辑边界。
- [x] 固定 4,184 插件快照、公开声量研究结果和当前 Skill catalog 时间点。
- [x] 识别旧版 G0–G6 与生命周期 Gate 的同名冲突。

## Phase 2 — 建模

- [x] 建立插件和 Skill 的版本化证据层。
- [x] 为每条记录计算唯一主节点、次节点、匹配理由与复核状态。
- [x] 生成三件事、使用条件、验证方法、effectClass 与 Gate 证据边界。
- [x] 分离节点适配、功能潜力和公开声量代理。

## Phase 3 — 网站

- [x] 生成 CSP 锁定、数据内嵌的单个 HTML。
- [x] 实现五段全栈地图、14 节点说明、插件/Skill 搜索筛选与详情抽屉。
- [x] 实现键盘、窄屏、深浅色和 reduced-motion 适配。

## Phase 4 — 验证

- [x] 通过生成器数据不变量检查。
- [x] 通过 `codex-eli5` HTML checker。
- [x] 检查 secret、绝对本地路径、外部资源和 Git diff。
- [x] 在桌面与手机视口验证关键交互和控制台。

## Phase 5 — 发布

- [x] 仅提交明确文件到 `main`。
- [x] push 到 `zjgulai/codex_research`。
- [x] 验证 Pages workflow 与 deployment 成功。
- [x] 验证公网 URL 内容、关键标记与本地 SHA-256 一致。

## Phase 6 — 全栈工作台重构

- [x] 将首屏从研究展板改为五阶段工作台，默认直接进入具体开发节点。
- [x] 每个节点只展示三项任务、一个交付结果和 3 个优先候选。
- [x] 为 14 个节点补齐自然语言名称、任务和交付说明。
- [x] 为 42 个首选候选补齐人工精炼的中文能力与最小验证；完整目录排名保持不变。
- [x] 将 M/A/G、分数与完整证据移到可选框架层、目录和详情。
- [x] 完成桌面、390px 窄屏和关键交互的设计 QA。
- [x] 提交、推送并验证新的 Pages workflow、deployment 与公网字节。

### 工作台重构发布收据

- 内容提交：`7464fec6da77b978422d22df9beadc1e5e0ba301`。
- Pages workflow：`35052578651`，结论 `success`。
- Pages deployment：`6473256119`，状态 `success`。
- 公网文件：3,023,235 bytes；SHA-256 `3b78a17efcabae413eafc971c3d737a31c1a6498b3bf51d5944a8a27a109a34f`，与本地一致。
- 公网页面完成解压并显示“全栈工作台地图”，默认候选为 Product Design、Figma 与 Browser；搜索、详情和响应式布局已在同一字节文件上复核。

## Phase 7 — 插件 × Agent Skill 双工作台

- [x] 从 `agentic-tools` Star List 冻结 81 个唯一仓库，并记录稳定 membership SHA-256。
- [x] 对全部仓库采集 HEAD、README、tree、许可证、release、workflow、测试和 Skill 证据；空仓库与异常不静默删除。
- [x] 建立硬门槛、六维质量分、弱声量代理和 `direct / package-bound / wrap / reference / quarantined` 形态。
- [x] 完成 81 个项目级结论和 40 条节点精选；每个节点最多 3 条，M01 与 M10 不为凑数补位。
- [x] 将外部项目和 Skill 作为独立数据类型接入生成器、manifest 与 artifact verifier。
- [x] 在工作台加入“Codex 插件 / Agent 技能”切换，并在完整目录加入四类对象筛选与专用详情。
- [x] 更新方法、生成说明、项目长期规则与执行记录。
- [x] 通过 ELI5 checker、secret / 路径 / diff 检查和独立数据复核。
- [x] 完成桌面与 390px 手机视口的双工作台、目录、详情和控制台 QA。
- [x] 提交、推送并验证 Pages workflow、deployment 与公网字节。

### 双工作台发布收据

- 内容提交：`d6fc82f9271891ac0d81b4adc27dcf449dc0b9a3`。
- Pages workflow：`35061465035`，结论 `success`。
- Pages deployment：`6474716398`，状态 `success`。
- 公网文件：3,109,539 bytes；SHA-256 `f3c86f12baf2e37e45ca967c20b49e3f5680628fe62cf01ad79d126dd09af86e`，与本地逐字节一致。
- 公网页面已解压并显示 `Agent OPC Atlas`；双工作台切换、M06 三个 Agent Skill、研究范围文案和浏览器控制台均通过复核。

## Phase 8 — Agent Skill 可复现 Benchmark

- [x] 将 40 条候选分成 B0–B5 与 S0；记录风险、测试模式、最小物料和首批 12 条。
- [x] 冻结 baseline / Skill 双 arm、fixture、重复次数、四轴门槛、停止条件和不晋级边界。
- [x] 实现固定 Git blob 校验、一次性工作区、Codex ephemeral runner、只读哈希、结构化输出、事件摘要和可复算 scorer。
- [x] 对 4 条 B0 单文件 Skill 完成 16 次 A/B 校准；16 次执行成功，8 个 Skill arm 全部读取目标 Skill，工作区零变化。
- [x] 对第一版 scorer 做反向审计；确认语言敏感、高重复方差和天花板效应，明确判定 `failed-needs-v2`，0 条晋级。
- [x] 把校准事实、失败原因和 0 晋级边界接回网站、manifest 与独立 artifact verifier。
- [ ] 冻结 v2 多语言语义断言，加入对抗 fixture，并用独立盲评样本校准 Judge。
- [ ] 对 12 条首批候选各跑 4 fixture × 2 arm × 2 replicate 的淘汰型 pilot。
- [ ] 对 pilot 过门者运行正式 8 fixture × 2 arm × 3 replicate benchmark，再由人工决定默认 OPC 栈。

### Phase 8A 校准结论

- 校准不是能力排名。诊断 delta 不得用于重排 40 条候选。
- `isolatedMaterialized = 4`；`isolatedInstalled = 0`；`smokeTested = 0`；`taskBenchmarked = 0`；`promotedToDefault = 0`。
- web search 已禁用，事件中未发现网络命令；本轮没有独立证明 OS 级 egress 阻断，因此不使用“安全沙箱已验证”措辞。
- 原始运行目录不提交、不发布；公开结果只保留 provenance、断言、聚合和失败边界。

### Phase 8A 发布收据

- 内容提交：`808bca315d7f2bf6cd0c74dae6bd6c0b54d4a745`。
- Pages workflow：`35071246938`，结论 `success`。
- Pages deployment：`6476373616`，状态 `success`。
- 公网文件：3,116,151 bytes；SHA-256 `2d4ebdb06d04f4315df68d4fb1f001e22f5e5468ac0dbe28142a91052050780c`，与本地逐字节一致。
- 公网页面包含 16 次 A/B 校准、评分器失败和 0 晋级披露；4 条候选详情、桌面与约 390 CSS px 窄屏、浏览器控制台均通过复核。

## Phase 9 — 四角色 Agent 能力工作包

- [x] 将“是否收录”与“是否已验证”分开：`source-confirmed → static-reviewed → controlled-smoke → task-benchmarked`。
- [x] 从冻结的 81 仓库中新增 29 条原生 Skill 与 3 条 workflow / wrapper 候选；能力库从 40 扩到 72。
- [x] 保持原始 `v1-40` benchmark cohort、顺序和 16 次校准结果不变；扩展候选不自动进入既有计划。
- [x] 将 M00–M13 每个节点拆为主执行、Review、可视化、总结交接四个工作位，形成 116 条有序分配。
- [x] 对专用能力不足的 M01 / M06 / M08 / M09 / M10 / M13 显式标记组合覆盖、通用补位或需封装。
- [x] 完整目录增加“Agent 工作位”筛选，并确保节点与角色在同一 assignment 上联合匹配。
- [x] 生成器与 artifact verifier 固定检查 72 条能力、67 条原生路径、5 条 workflow 候选、40 条 benchmark cohort 和 14 × 4 角色覆盖。
- [x] 完成桌面、窄屏、深色模式、角色联动筛选、wrapper 详情和控制台 QA。
- [x] 提交、推送并验证 Pages workflow、deployment 与公网字节。

### Phase 9 当前边界

- 72 条能力仍是候选库，不是“72 条已验证 Skill”；`runtimeVerified = 0`。
- 116 是节点角色分配数，不是独立能力数或安装数。
- 3 条新增 wrapper（AntV Chart、DrawDB、GraphRAG Workbench）没有原生 Codex Skill，只能作为封装候选或参考。
- 本轮使用 2026-09-16T08:03:00.433482Z 的更新 catalog；插件总数和 Skill 证据总数不变，但 `frozen-exact` 从 5,314 降到 5,312，`current-version-drift` 从 93 增到 95，插件证据缺口从 21 增到 25。

### Phase 9 发布收据

- 内容提交：`794e10b0a62a225ca6edc28247d7d74c68247d20`。
- Pages workflow：`35076293090`，结论 `success`。
- Pages deployment：`6477267424`，状态 `success`。
- 公网文件：3,149,364 bytes；SHA-256 `ac1b675226e056991ca118fc320becadd6b2494f4bb93abe75b31dfc2fa91923`，与本地逐字节一致。
- 公网页面已解压并显示 72 条能力、116 个工作位和固定 40 条 benchmark 队列；M13 可视化详情、assignment 深链、响应式布局与浏览器控制台均通过复核。

## Phase 10 — 工作流关系扩展（本批）

- [x] 从冻结的 81 个仓库中再筛选 24 条与 M00–M13 全栈接力强相关的能力；记录仓库 HEAD、Skill 路径 / blob、载体形态、许可证边界和静态审计结论。
- [x] 将能力分成 `role-expansion-v2-2026-09`，与原始 `v1-40` 和首批 32 条扩展隔离；不改写旧 benchmark 顺序、输入或结果。
- [x] 为每条新增能力补齐“能做什么／使用前准备／怎样确认”，并至少绑定一个 `workflowRef`；不把工作流关系写成安装依赖或运行成功证明。
- [x] 建立 `workflowGraph`：14 条模块接力边（`WR01`–`WR14`）和 6 条能力关系边，显式记录输入产物、输出产物、交接话术、验收条件、角色和关系类型。
- [x] 将工作台扩展为 149 个节点 × 角色工作位；重点补强 Review、可视化、总结交接等稀疏位置，并保留 M03 核心单一来源提示。
- [x] 让 evaluator、site builder、artifact verifier 动态读取 96 条能力、149 条分配和关系图；继续逐行保护 `v1-40` 的 40 条候选与冻结 hash。
- [x] 在 HTML 中增加“工作流接力”关系卡、能力反查和详情中的关系上下文；搜索同时命中能力的 workflow refs。
- [x] 完成本地 evaluator、build、artifact verifier、ELI5 checker 和浏览器桌面 / 窄屏回归；未将任何 v2 能力升级为 runtime-verified 或 task-benchmarked。
- [ ] 为 v2 候选另行冻结多语言语义断言、对抗 fixture 和独立盲评；在此之前不得把候选纳入默认 OPC 栈或效果排行。
- [ ] 处理遗留的 11 条跨节点 `secondaryModules` 声明不完整项；这是数据治理清理，不在本批关系图中静默修正。

### Phase 10 当前边界

- 能力库为 96 条（40 条 v1 + 32 条首批扩展 + 24 条本批扩展），其中 91 条冻结原生路径、5 条工作流 / wrapper 候选；`runtimeVerified = 0`、`taskBenchmarked = 0`。
- 149 是工作位分配数，14 是模块关系边数，6 是能力关系边数；它们都不是安装量、调用量或生产采用量。
- Vercel 的 5 条新增路径保持 `reference-only`，原因是许可证边界尚未独立确认；InsForge 等整包路径保持 `package-bound`，需要在目标仓库按其依赖条件部署后再验证。
- 本批关系说明“交付如何接力”，不替代真实 API schema、权限、网络、OS 隔离、CI 或生产验收。

## 初版目录发布收据

- 内容提交：`4783fdd3ce7d704418efe77aced5a00ad9b2c61f`。
- Pages workflow：`35045542362`，结论 `success`。
- Pages deployment：`6472078287`，状态 `success`。
- 公网文件：2,997,191 bytes；SHA-256 `e7f8e9a2afcaee98bbc79ef0eb52cbebb9ff0496c9d5498746d05eda93ccdc40`，与本地一致。
- 公网首屏完成解压并显示 4,184 个插件、5,418 条 Skill 证据、14 个节点和 0 个 `Ready Now`；浏览器控制台无 warning/error。搜索、筛选、分页和详情已对同一字节文件在本地浏览器完成回归。
