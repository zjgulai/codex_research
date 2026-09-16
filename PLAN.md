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
- [ ] 提交、推送并验证 Pages workflow、deployment 与公网字节。

### 双工作台发布收据

- 内容提交：待发布。
- Pages workflow：待发布。
- Pages deployment：待发布。
- 公网文件：待发布。

## 发布收据

- 内容提交：`4783fdd3ce7d704418efe77aced5a00ad9b2c61f`。
- Pages workflow：`35045542362`，结论 `success`。
- Pages deployment：`6472078287`，状态 `success`。
- 公网文件：2,997,191 bytes；SHA-256 `e7f8e9a2afcaee98bbc79ef0eb52cbebb9ff0496c9d5498746d05eda93ccdc40`，与本地一致。
- 公网首屏完成解压并显示 4,184 个插件、5,418 条 Skill 证据、14 个节点和 0 个 `Ready Now`；浏览器控制台无 warning/error。搜索、筛选、分页和详情已对同一字节文件在本地浏览器完成回归。
