# 执行计划与 TODO

完成标准：4,184 个插件身份不丢失；每个可取得证据的 Skill 可追溯到父插件和版本；每条记录有唯一主节点与“做什么／怎么用／怎么验”；网站单文件、无外部运行依赖；通过 ELI5、数据、桌面和手机验证；GitHub Pages 公网可访问且与本地文件一致。

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

- [ ] 仅提交明确文件到 `main`。
- [ ] push 到 `zjgulai/codex_research`。
- [ ] 验证 Pages workflow 与 deployment 成功。
- [ ] 验证公网 URL 内容、关键标记与本地 SHA-256 一致。
