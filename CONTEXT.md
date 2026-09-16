# 工作流能力词典

这是 Agent OPC Atlas 的领域词典，不是实现规格。后续修改角色工作包或工作流关系前先读本文件。

## 术语

- **工作流节点**：`M00–M13` 中的一步开发工作。节点有一个主要交付物 `A00–A13`，并分别设置主执行、Review、可视化、总结交接四个工作位。
- **Agent 能力**：一条被固定到仓库、HEAD、路径或明确 wrapper 的候选记录。它不是已安装、已调用或已验证的 Skill。
- **工作位分配**：`capability × module × leadRole` 的具体承担关系。`primaryModule` 只表示研究归类，不能替代工作位分配。
- **工作流关系**：上一个节点的产物如何交给下一个节点，以及交接时要检查什么。它表示推荐顺序，不自动表示安装依赖。
- **技术阻断**：只有明确标记为 `blocks` 的能力边，或经证据确认的运行依赖，才可以阻止下一步；普通 `feeds`、`reviews`、`visualizes`、`summarizes` 是协作关系。
- **回流关系**：`feedback` 从 M13 返回 M00，表示经过审阅的经验或缺口可以重新进入上下文；不能把猜测直接写成规则。
- **证据层级**：`source-confirmed → static-reviewed → controlled-smoke → task-benchmarked`。能力收录可以早于验证晋级，`candidate-only` 是默认结论上限。

## 关系边界

每条新增能力必须有至少一个工作位分配和一个 `workflowRefs`；每个关系边必须列出输入产物、输出产物、交接话术、验收方式和候选 slug。`reference-only`、`package-bound-skill` 与 `wrap-candidate` 必须保留许可、依赖或封装限制，不能因为声量变成默认推荐。
