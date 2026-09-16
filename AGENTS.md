# Repository guidance

修改前先读 `README.md`、`METHODOLOGY.md` 与 `PLAN.md`；涉及界面与视觉时还要读 `design-qa.md`。

- 公开站点必须保持为 `public/index.html` 单文件；不得加入外部运行依赖、追踪器或远程资源。
- 重新生成必须使用 `scripts/build-site.mjs`，并保留输入时间点、版本漂移和证据缺口。
- 不得把 publisher claim、安装状态、Skill 加载、认证、一次调用或生产可用性互相升级。
- 外部 GitHub 项目必须与插件内 Skill 分开建模；Stars、README 声明、存在 `SKILL.md`、静态结构检查、安装成功、任务实测和生产可用是七种不同证据，不得互相升级。
- 刷新 `agentic-tools` 时先固定列表成员与 HEAD，再更新人工策展；抓取脚本不得自动把新仓库晋升到工作台。无明确适用许可证、归档、空仓库、重复或低相关对象不能进入主推荐。
- 外部 Skill 的推荐键必须绑定 `repo + HEAD + path/blob`；需封装对象必须显式标为 `wrap-candidate`，不能伪装成可安装 Skill。
- 运行 Agent Skill benchmark 前必须读取 `benchmarks/protocol.json`、`benchmarks/candidates.json` 和对应 suite；baseline / Skill 只能相差候选指令，原始运行记录留在 Git 忽略目录。
- calibration、单 fixture、结构检查、Skill 被读取或一次成功输出都不能升级为 `smoke-tested` / `task-benchmarked`。评分器未校准时，delta 只能诊断，不得用于排名或默认栈晋级。
- M00–M13 是模块，A00–A13 是交接产物，G0–G6 是生命周期的人类决策门；不要复用 G 编号表示动作影响。
- 变更分类规则后，必须重新运行数据不变量、ELI5 checker、桌面/手机浏览器和公开页面验证。
