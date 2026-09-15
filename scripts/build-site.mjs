#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const parts = arg.replace(/^--/, "").split("=");
  return [parts.shift(), parts.length ? parts.join("=") : true];
}));
if (!args.snapshot || !args.catalog) {
  console.error("Usage: node scripts/build-site.mjs --snapshot=... --catalog=... [--local-cache=...] [--output=public/index.html] [--manifest=data/build-manifest.json]");
  process.exit(2);
}

const outputPath = args.output || "public/index.html";
const manifestPath = args.manifest || "data/build-manifest.json";
const templatePath = args.template || join(dirname(new URL(import.meta.url).pathname), "site-template.html");
const localCache = args["local-cache"] || (process.env.CODEX_HOME ? join(process.env.CODEX_HOME, "plugins", "cache") : null);
const snapshotRaw = readFileSync(args.snapshot, "utf8");
const catalogRaw = readFileSync(args.catalog, "utf8");
const snapshot = JSON.parse(snapshotRaw);
const catalog = JSON.parse(catalogRaw);
const sourceRows = snapshot.queries.plugins.rows;
const catalogRows = catalog.plugins || [];
const VIBECODING_SHA = "d0a611e7d86939ba873af2bd5e686e64b07f85ea";
const SHUORENHUA_SHA = "5a9eafefe03807404135f4d2ee4f42fe61d58759";
const BUILD_AT = new Date().toISOString();

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round = (value, digits) => Number(value.toFixed(digits === undefined ? 0 : digits));
const trimText = (value, limit) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > limit ? text.slice(0, limit - 1).trimEnd() + "…" : text;
};
const unique = (values) => [...new Set(values.filter(Boolean))];

const moduleLines = [
  [82, 92], [94, 104], [106, 116], [118, 128], [130, 140], [142, 152], [154, 165],
  [167, 178], [180, 191], [193, 204], [206, 216], [218, 228], [230, 240], [242, 252],
];
const workflowFile = encodeURI("全栈开发Prompt Chain/04-模块化Skills工作流.md");
const workflowBase = "https://github.com/zjgulai/vibecoding_config/blob/" + VIBECODING_SHA + "/" + workflowFile;

const MODULES = [
  { id: "M00", title: "上下文与流程控制", short: "先找对问题和边界", artifact: "A00 Context Pack", gate: ["G0"], macro: 0, color: "#356AE6", core: ["定根目录、任务与数据边界", "选当前模块、模式与风险", "固定下一步安全动作"], done: "目标、范围、授权、证据新鲜度和路由都明确。", help: "盘点上下文、规则、来源和任务状态" },
  { id: "M01", title: "初始化与治理", short: "把地基和规则立稳", artifact: "A01 Project Charter", gate: ["G0"], macro: 0, color: "#356AE6", core: ["识别技术栈与验证入口", "建立权限和指令架构", "固定治理、退出与恢复规则"], done: "目录、CI、测试、数据、权限与责任边界可追溯。", help: "探测环境、配置、依赖、许可与项目规则" },
  { id: "M02", title: "机会与市场", short: "先证明值得做", artifact: "A02 Opportunity Brief", gate: ["G1"], macro: 0, color: "#356AE6", core: ["验证真实需求", "盘点替代与约束", "主动寻找反证"], done: "关键 claim 有日期化来源，替代、反证和缺口可见。", help: "检索市场、论文、竞品、新闻和第一方证据" },
  { id: "M03", title: "用户与问题", short: "看清真实工作流", artifact: "A03 Problem Evidence", gate: ["G1"], macro: 0, color: "#356AE6", core: ["还原用户实际工作流", "分离事实、代理证据与假设", "定义可验证问题"], done: "样本、频率、严重度、反例与问题证据足以支持 G1。", help: "读取访谈、反馈、支持单、CRM 与会议证据" },
  { id: "M04", title: "策略与范围", short: "决定做什么、不做什么", artifact: "A04 Product Strategy", gate: ["G2"], macro: 1, color: "#7B4AE2", core: ["比较 build / no-build 方案", "切清 MVP 与非目标", "定指标、护栏和停止条件"], done: "价值、范围、指标、取舍、责任人与 G2 结论明确。", help: "辅助优先级、路线图、成本、容量和 KPI 决策" },
  { id: "M05", title: "领域模型与规格", short: "把意思写成合同", artifact: "A05 Product Spec", gate: ["G2", "G3"], macro: 1, color: "#7B4AE2", core: ["统一对象、状态与不变量", "定义接口、权限和失败", "串起需求、验收与测试"], done: "产品、数据、API、UI 与 AI 行为可以被一致验收。", help: "建模、写规格、设计 schema / API 与追踪验收" },
  { id: "M06", title: "原型与 UX", short: "先看见，再决定", artifact: "A06 Prototype Evidence", gate: ["G4"], macro: 2, color: "#D85D24", core: ["只提一个可证伪问题", "做隔离且最小的原型", "用测试和消融选方案"], done: "观察、限制、选择与删减依据完整，并明确非生产。", help: "制作 UI / 逻辑 / AI 原型并检查可用性与无障碍" },
  { id: "M07", title: "架构与切片", short: "把大工程切成小闭环", artifact: "A07 Architecture & Tickets", gate: ["G3", "G4"], macro: 2, color: "#D85D24", core: ["比较架构与爆炸半径", "固定 seam、不变量和失败边界", "拆成无环垂直切片"], done: "安全、迁移、回滚、观测和每个 ticket 的验收都齐全。", help: "理解代码图、依赖、架构、迁移与交付切片" },
  { id: "M08", title: "全栈实现与 TDD", short: "一次做完一个切片", artifact: "A08 Implementation Report", gate: ["G4"], macro: 2, color: "#D85D24", core: ["一次只做一个批准的 slice", "从 red 到最小 green", "消融 diff 并跑回归"], done: "代码、测试和新鲜命令证据一致，无 debug 与无关重构。", help: "编辑前后端、数据库、AI 与基础设施代码并验证" },
  { id: "M09", title: "质量与安全", short: "独立证明它没有骗你", artifact: "A09 Quality Evidence", gate: ["G5"], macro: 3, color: "#16966A", core: ["固定审查范围", "分轴验证质量与安全", "记录 blocker 和残余风险"], done: "测试、数据集、模型、阈值、失败样例与未测范围可复现。", help: "Code review、测试、安全扫描、AI Eval、性能与 a11y" },
  { id: "M10", title: "发布 Readiness", short: "能上线，不等于已授权上线", artifact: "A10 Release Readiness", gate: ["G5", "R3"], macro: 3, color: "#16966A", core: ["证明 artifact 来源与质量", "准备迁移、回滚和观测", "过 G5 后停下等待 R3"], done: "CI、兼容、迁移、回滚、owner 与 go / no-go 证据完整。", help: "准备 CI/CD、托管、SBOM、preview、dry-run 与回滚" },
  { id: "M11", title: "运行学习", short: "从真实运行里学", artifact: "A11 Operations Learning", gate: ["G0", "G5", "R3"], macro: 4, color: "#B78A08", core: ["汇总运行与反馈信号", "建立时间线和基线", "提出可证伪假设并路由回上游"], done: "query、版本、时间窗、样本、PII、影响与置信度明确。", help: "读取 metrics、logs、traces、incident 与用户反馈" },
  { id: "M12", title: "增长与实验", short: "让增长可归因", artifact: "A12 Experiment Record", gate: ["G6", "G5", "R3"], macro: 4, color: "#B78A08", core: ["写因果假设", "预注册实验与停止规则", "按数据 keep / iterate / stop"], done: "人群、分配、样本、主指标、护栏和数据质量齐全。", help: "分析 funnel / cohort、A/B、feature flag 与增长信号" },
  { id: "M13", title: "复盘与能力进化", short: "把经验变成可撤回能力", artifact: "A13 Evolution Record", gate: ["G6"], macro: 4, color: "#B78A08", core: ["做证据化复盘", "形成有边界的候选能力", "用 held-out benchmark 人工晋升"], done: "候选能力可试用、可评测、会过期、能撤回，且未自动写入长期规则。", help: "治理 Memory、创建 Skill、跑 benchmark 与沉淀知识" },
].map((item, index) => ({ ...item, sourceUrl: workflowBase + "#L" + moduleLines[index][0] + "-L" + moduleLines[index][1] }));

const MODULE_BY_ID = new Map(MODULES.map((item) => [item.id, item]));
const MODULE_IDS = MODULES.map((item) => item.id);
const PRIORS = {
  P00: { M13: 5, M00: 3, M01: 2 }, P01: { M02: 6, M03: 2 }, P02: { M05: 5, M04: 3, M03: 1 },
  P03: { M07: 6, M05: 2 }, P04: { M08: 6, M09: 3, M07: 2 }, P05: { M06: 6, M08: 2 },
  P06: { M08: 7, M06: 1 }, P07: { M08: 7, M07: 2 }, P08: { M08: 6, M09: 2, M13: 2 },
  P09: { M08: 6, M07: 2 }, P10: { M12: 6, M11: 3, M04: 1 }, P11: { M09: 7, M08: 2 },
  P12: { M09: 7, M01: 2, M07: 2 }, P13: { M10: 7, M07: 2, M11: 1 }, P14: { M11: 7, M09: 1 },
  P15: { M05: 3, M00: 2, M03: 2 }, P16: { M04: 4, M00: 3, M12: 1 },
  P17: { M12: 5, M03: 3, M02: 2 }, P18: { M02: 4, M03: 2, M08: 1 }, P19: { M00: 3, M08: 1 },
};
const STAGE_PRIORS = {
  ST_DISCOVERY: { M02: 3, M03: 1 }, ST_PRD: { M05: 3, M04: 1 }, ST_ARCHITECTURE: { M07: 3 },
  ST_UX_UI: { M06: 3 }, ST_FRONTEND: { M08: 3 }, ST_BACKEND_API: { M08: 3, M07: 1 },
  ST_AI_AGENT: { M08: 3, M13: 1 }, ST_DATA: { M08: 2, M12: 1 }, ST_TESTING: { M09: 3 },
  ST_SECURITY: { M09: 3, M01: 1 }, ST_CI_CD: { M10: 3 }, ST_OBSERVABILITY: { M11: 3 },
  ST_OPERATIONS_GTM: { M12: 2, M03: 1, M00: 1 },
};
const TERMS = {
  M00: [["context",2],["workflow",2],["task management",3],["project management",2],["todo",2],["calendar",1],["orchestration",2],["agent control",4],["plugin management",5],["routing",2],["handoff",3],["workspace management",3]],
  M01: [["setup",3],["bootstrap",4],["initialize",4],["configuration",3],["environment variable",4],["governance",4],["policy",2],["dependency",2],["license",3],["scaffold",3],["template",2],["installation",2],["permission",2],["monorepo",2]],
  M02: [["research",3],["web search",4],["search the web",4],["literature",4],["paper",3],["market research",5],["competitor",4],["patent",4],["news",2],["scientific",3],["citation",3],["evidence",2],["due diligence",4],["discover sources",4]],
  M03: [["user research",5],["interview",4],["survey",4],["customer feedback",5],["feedback",2],["support ticket",4],["customer conversation",5],["crm",2],["transcript",3],["meeting",2],["voice of customer",5],["user behavior",3],["customer support",3]],
  M04: [["strategy",4],["roadmap",4],["prioritization",5],["business case",4],["product management",4],["planning",2],["decision",2],["cost estimate",3],["market sizing",4],["kpi",3],["objective",2],["scope",2],["capacity planning",3],["product strategy",5]],
  M05: [["requirement",4],["prd",5],["specification",4],["acceptance criteria",5],["schema",3],["domain model",5],["api design",4],["data model",4],["contract",3],["documentation",2],["knowledge base",2],["diagram",2],["user story",4],["interface design",3]],
  M06: [["prototype",5],["figma",5],["wireframe",5],["mockup",5],["ux",4],["ui",3],["design system",4],["image to code",4],["browser automation",2],["browser",2.5],["screenshot",2],["accessibility",2],["usability",4],["visual design",4],["creative",2]],
  M07: [["architecture",5],["system design",5],["dependency graph",5],["codebase understanding",4],["migration",3],["terraform",2],["kubernetes",2],["microservice",3],["monorepo",3],["refactor",2],["technical design",5],["c4",4],["adr",4],["blast radius",5]],
  M08: [["source code",4],["coding",3],["coding shift",5],["coding shifts",5],["frontend",4],["react",3],["next.js",3],["backend",4],["api",2],["database",2],["sql",2],["postgres",4],["postgresql",4],["serverless function",3],["table schema",4],["table schemas",4],["database migration",4],["database migrations",4],["structured data",3],["records",2],["create and update records",4],["manage and query databases",5],["crud",3],["implement",4],["build app",4],["sdk",2],["debug",2],["agent runtime",3],["llm",2],["model inference",3],["code generation",4]],
  M09: [["test",3],["quality assurance",5],["code review",5],["review",2],["pull request",4],["ci failure",3],["security",4],["vulnerability",5],["audit",3],["compliance",3],["eval",3],["benchmark",3],["lint",3],["sast",5],["secret scanning",5],["performance test",4],["penetration",5],["verification",3]],
  M10: [["deploy",5],["release",4],["ci/cd",5],["hosting",4],["vercel",3],["cloudflare",3],["github actions",4],["pages",2],["container",2],["docker",2],["rollback",5],["production",3],["artifact provenance",5],["sbom",4],["deployment",5]],
  M11: [["observability",5],["monitoring",4],["logs",3],["traces",4],["telemetry",4],["incident",5],["alert",3],["sentry",4],["datadog",4],["on-call",5],["error tracking",4],["apm",4],["status page",3],["root cause",3]],
  M12: [["analytics",3],["experiment",5],["a/b",5],["funnel",4],["cohort",4],["growth",4],["marketing",2],["sales",2],["seo",3],["attribution",4],["feature flag",4],["campaign",2],["conversion",3],["product analytics",5],["forecast",2]],
  M13: [["skill creator",6],["plugin creator",6],["memory",4],["retrospective",5],["prompt library",4],["agent configuration",4],["evaluation harness",3],["template creator",5],["knowledge governance",5],["skill authoring",6],["agent skill",3],["postmortem",2],["capability",2]],
};

function normalize(value) {
  return String(value || "").replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[-_/]+/g, " ").toLowerCase();
}
function hasTerm(text, term) {
  const normalizedTerm = normalize(term).trim();
  if (!normalizedTerm) return false;
  const escaped = normalizedTerm.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp("(^|[^a-z0-9])" + escaped + "([^a-z0-9]|$)", "i").test(text);
}
function addScores(target, additions, multiplier) {
  if (!additions) return;
  for (const [id, value] of Object.entries(additions)) target[id] += value * multiplier;
}
function classifyEntity(entity, parent) {
  const scores = Object.fromEntries(MODULE_IDS.map((id) => [id, 0]));
  const reasons = Object.fromEntries(MODULE_IDS.map((id) => [id, []]));
  const solutionCode = entity.solutionCode || (parent && parent.solutionCode) || "P19";
  const priorMultiplier = entity.kind === "skill" ? 0.36 : 0.55;
  addScores(scores, PRIORS[solutionCode] || PRIORS.P19, priorMultiplier);
  if (PRIORS[solutionCode]) for (const id of Object.keys(PRIORS[solutionCode])) reasons[id].push("解决方案先验 " + solutionCode);
  const stageTags = entity.stageTags || (parent && parent.stageTags) || [];
  for (const stage of stageTags) {
    const strength = Number(stage.strength || 0.5);
    addScores(scores, STAGE_PRIORS[stage.tag], strength * (entity.kind === "skill" ? 0.28 : 0.65));
    if (STAGE_PRIORS[stage.tag]) for (const id of Object.keys(STAGE_PRIORS[stage.tag])) reasons[id].push("阶段信号 " + stage.tag);
  }
  const fields = [
    { text: normalize(entity.name + " " + (entity.displayName || "")), weight: 2.6, label: "名称" },
    { text: normalize(entity.shortDescription || ""), weight: 2.2, label: "短说明" },
    { text: normalize(entity.description || ""), weight: 1, label: "说明" },
    { text: normalize((entity.capabilities || []).join(" ")), weight: 1.8, label: "capability" },
    { text: normalize((entity.keywords || []).join(" ")), weight: 1.45, label: "keyword" },
  ];
  const directHitsByModule = Object.fromEntries(MODULE_IDS.map((id) => [id, 0]));
  for (const id of MODULE_IDS) {
    for (const [term, weight] of TERMS[id]) {
      let hitWeight = 0;
      let hitLabel = "";
      for (const field of fields) {
        if (hasTerm(field.text, term)) {
          hitWeight += weight * field.weight;
          hitLabel = hitLabel || field.label;
        }
      }
      if (hitWeight) {
        scores[id] += hitWeight;
        directHitsByModule[id] += 1;
        reasons[id].push(hitLabel + "命中 “" + term + "”");
      }
    }
  }
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const top = sorted[0];
  const second = sorted[1];
  const gap = top[1] - second[1];
  const topDirectHits = directHitsByModule[top[0]];
  const fitScore = round(clamp(34 + Math.min(43, top[1] * 2.15) + Math.min(15, gap * 1.8) + (topDirectHits ? 5 : 0), 0, 99), 1);
  const oldReview = Boolean(entity.classNeedsReview || (parent && parent.classNeedsReview));
  const versionAmbiguous = Boolean(entity.versionAmbiguous || (parent && parent.versionAmbiguous));
  let matchConfidence = "medium";
  if (!topDirectHits || gap < 1.25 || oldReview || versionAmbiguous || fitScore < 55) matchConfidence = "review";
  else if (topDirectHits >= 2 && gap >= 3 && fitScore >= 72) matchConfidence = "high";
  const secondaryModules = sorted.slice(1).filter((entry) => entry[1] >= Math.max(3, top[1] * 0.44)).slice(0, 3).map((entry) => entry[0]);
  return {
    primaryModule: top[0], secondaryModules, fitScore, fitGap: round(gap, 2), matchConfidence,
    matchNeedsReview: matchConfidence === "review", matchReasons: unique(reasons[top[0]]).slice(0, 4),
  };
}
function inferRoles(text, actionTags) {
  const source = normalize(text + " " + (actionTags || []).join(" "));
  const roles = [];
  if (/(read|search|find|retrieve|list|view|inspect|query|browse|discover)/.test(source)) roles.push("input/read");
  if (/(analy|summari|convert|transform|diagnos|compare|cluster|extract)/.test(source)) roles.push("transform");
  if (/(create|edit|write|generate|draft|design|build|compose|author)/.test(source)) roles.push("author");
  if (/(test|review|audit|check|validat|verify|eval|benchmark|monitor)/.test(source)) roles.push("verify");
  if (/(deploy|send|publish|delete|remove|update|execute|trigger|trade|order|pay|manage)/.test(source)) roles.push("act");
  return roles.length ? unique(roles) : ["input/read"];
}
function inferEffect(entity, roles) {
  const text = normalize([entity.name, entity.description, ...(entity.capabilities || []), ...(entity.interfaceTags || [])].join(" "));
  const writes = roles.includes("author") || roles.includes("act");
  if (writes && /(deploy|deployment|release|dns|firewall|kubernetes|terraform|hosting)/.test(text)) return "production";
  if (/(secret management|manage secrets|credential management|password vault|key vault|api key management)/.test(text) && writes) return "secrets";
  if (writes && /(git|github|gitlab|commit|pull request|merge request|branch)/.test(text)) return "git";
  if (writes && /(mcp|app connector|if mcp tools|if skill and mcp|browser computer)/.test(text)) return "external";
  if (writes && /(send|publish|delete|trade|order|payment|email|calendar|crm|task)/.test(text)) return "external";
  if (writes && /(local cli|workspace|source code|file|terminal)/.test(text)) return "workspace";
  if (writes) return "local-artifact";
  return "read-only";
}
function shapeLabel(interfaceTags, skill) {
  if (skill) return "Skill";
  const tags = interfaceTags || [];
  const shapes = [];
  if (tags.some((tag) => tag.includes("SKILL"))) shapes.push("Skill");
  if (tags.includes("IF_MCP_TOOLS")) shapes.push("MCP");
  if (tags.some((tag) => tag.includes("APP"))) shapes.push("App");
  if (tags.includes("IF_BROWSER_COMPUTER")) shapes.push("Browser");
  if (tags.includes("IF_LOCAL_CLI")) shapes.push("CLI");
  return shapes.length ? unique(shapes).join(" + ") : "Metadata";
}
function runtimeState(row) {
  if (row.installed && row.enabled) return "已安装并启用";
  if (row.installed) return "已安装";
  if (row.inventoryState === "默认关闭") return "默认关闭";
  if (row.inventoryState === "不可用") return "目录标记不可用";
  return "可用未安装";
}
function conditionsFor(row, isSkill) {
  const parts = [];
  if (row.inventoryState === "不可用") parts.push("冻结快照标记为不可用，不能按普通安装路径使用");
  else if (row.installed) parts.push("冻结快照显示" + runtimeState(row) + "，但这不等于认证成功");
  else parts.push("需要先安装或启用" + (isSkill ? "父插件" : "该插件"));
  if (row.authPolicy && row.authPolicy !== "NONE") parts.push("目录认证策略为 " + row.authPolicy + "，实际账号、scope 与凭据状态未实测");
  else if (row.authPolicy === "NONE") parts.push("目录认证策略为 NONE；实际运行环境和下游资源权限仍需确认");
  else parts.push("当前来源未完整说明认证和权限条件，不能据此判断为无需配置");
  if (isSkill) parts.push("Agent 还要实际加载该 Skill；加载规则本身不等于已连接外部系统");
  else parts.push("能力形态为 " + shapeLabel(row.interfaceTags, false) + "；真实输入、依赖和工具 schema 仍要在使用时确认");
  return parts.join("；") + "。";
}
function proofFor(entity, classification, effect, isSkill) {
  const module = MODULE_BY_ID.get(classification.primaryModule);
  const checkByEffect = {
    "read-only": "用固定查询或已知 fixture 做一次代表性读取，并与源记录逐项核对",
    "local-artifact": "用固定输入生成最小产物，检查 before / after diff 并重新打开验收",
    workspace: "在隔离范围内运行相关测试、检查 diff，并确认没有越界文件",
    git: "先检查分支、staged file list 与 diff；外部 push 前另取明确授权并核对远端",
    external: "先用 preview / sandbox 与最小权限测试；明确授权后执行一次并 read-back",
    secrets: "先核对最小 scope、凭据暴露面与审计日志，不把 secret 写入输出",
    production: "先完成 dry-run、回滚、观测和 G5 readiness；对象级 R3 授权后再执行并验证线上",
  };
  const prefix = isSkill ? "先验证该 Skill 的触发、步骤和依赖是否按说明生效" : checkByEffect[effect];
  return prefix + "，再确认它确实改善 " + module.artifact + " 的“" + module.done + "”条件。当前证据只到静态元数据，尚未确认代表性调用、权限范围与生产稳定性。";
}
function doesFor(entity, classification, isSkill) {
  const module = MODULE_BY_ID.get(classification.primaryModule);
  const source = trimText(entity.description || "当前目录没有提供可解释的能力说明", isSkill ? 260 : 220);
  if (isSkill) return "【Skill 说明 + 研究映射】它给 Agent 一套操作规则，主要帮助 " + classification.primaryModule + " 完成“" + module.help + "”。原始说明：" + source;
  return "【目录声明 + 研究映射】在 " + classification.primaryModule + "，它主要帮助“" + module.help + "”。目录原文：" + source;
}
function gatesFor(primaryModule) {
  return MODULE_BY_ID.get(primaryModule).gate.filter((item) => item.startsWith("G"));
}
function weightedPriority(fit, functional, publicProxy, weights) {
  let numerator = fit * weights.fit + Number(functional || 0) * weights.functional;
  let denominator = weights.fit + weights.functional;
  if (publicProxy !== null && publicProxy !== undefined) {
    numerator += Number(publicProxy) * weights.publicProxy;
    denominator += weights.publicProxy;
  }
  return round(numerator / denominator, 1);
}
function splitCanonicalId(id) {
  const at = id.lastIndexOf("@");
  return at === -1 ? [id, ""] : [id.slice(0, at), id.slice(at + 1)];
}
function compareVersion(a, b) {
  const aa = String(a || "").split(/[^0-9]+/).filter(Boolean).map(Number);
  const bb = String(b || "").split(/[^0-9]+/).filter(Boolean).map(Number);
  for (let index = 0; index < Math.max(aa.length, bb.length); index += 1) {
    const delta = (aa[index] || 0) - (bb[index] || 0);
    if (delta) return delta;
  }
  return String(a || "").localeCompare(String(b || ""));
}
function unquote(value) {
  const text = String(value || "").trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    try { return text.startsWith('"') ? JSON.parse(text) : text.slice(1, -1); }
    catch { return text.slice(1, -1); }
  }
  return text;
}
function parseFrontmatter(path) {
  const raw = readFileSync(path, "utf8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const lines = match[1].split(/\r?\n/);
  let name = "";
  let description = "";
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith("name:")) name = unquote(line.slice(5));
    if (line.startsWith("description:")) {
      const first = line.slice(12).trim();
      if (first && !/^[>|]-?$/.test(first)) description = unquote(first);
      else {
        const block = [];
        for (let cursor = index + 1; cursor < lines.length && /^\s+/.test(lines[cursor]); cursor += 1) block.push(lines[cursor].trim());
        description = block.join(" ").trim();
      }
    }
  }
  return name ? { name, description, sourceFile: basename(path) } : null;
}
function localSkillsFor(row) {
  if (!localCache) return [];
  const [name, marketplace] = splitCanonicalId(row.canonicalPluginId);
  const records = [];
  for (const release of row.releaseRecords || []) {
    const skillsRoot = join(localCache, marketplace, name, release.version, "skills");
    if (!existsSync(skillsRoot)) continue;
    for (const directory of readdirSync(skillsRoot, { withFileTypes: true })) {
      if (!directory.isDirectory()) continue;
      const skillPath = join(skillsRoot, directory.name, "SKILL.md");
      if (!existsSync(skillPath)) continue;
      const parsed = parseFrontmatter(skillPath);
      if (parsed) records.push({ ...parsed, version: release.version, versionState: "local-bundle-exact" });
    }
  }
  return records;
}

const catalogByName = new Map();
for (const item of catalogRows) {
  const values = catalogByName.get(item.name) || [];
  values.push(item);
  catalogByName.set(item.name, values);
}
for (const values of catalogByName.values()) values.sort((a, b) => compareVersion(b.release && b.release.version, a.release && a.release.version));

const pluginMap = new Map();
const plugins = sourceRows.map((row) => {
  const claim = trimText(unique([row.shortDescription, row.description, row.longDescription]).join(" · "), 440);
  const classification = classifyEntity({ ...row, kind: "plugin", description: claim });
  const roles = inferRoles(claim + " " + (row.capabilities || []).join(" "), row.actionTags);
  const effectClass = inferEffect({ ...row, description: claim }, roles);
  const priorityScore = weightedPriority(classification.fitScore, row.functionalScore, row.publicProxyScore, { fit: 0.55, functional: 0.35, publicProxy: 0.1 });
  const [packageName, marketplace] = splitCanonicalId(row.canonicalPluginId);
  const item = {
    id: row.canonicalPluginId, kind: "plugin", name: row.displayName || row.name, packageName, marketplace,
    developer: row.developer || "未说明", description: claim, capabilities: (row.capabilities || []).slice(0, 8),
    keywords: (row.keywords || []).slice(0, 12), solutionCode: row.solutionCode, solutionPrimary: row.solutionPrimary,
    officialCategory: row.officialCategory, stageTags: row.stageTags || [], actionTags: row.actionTags || [],
    riskTags: row.riskTags || [], interfaceTags: row.interfaceTags || [], shape: shapeLabel(row.interfaceTags, false),
    installed: Boolean(row.installed), enabled: Boolean(row.enabled), inventoryState: row.inventoryState,
    runtimeState: runtimeState(row), authPolicy: row.authPolicy || "未说明",
    versions: (row.releaseRecords || []).map((release) => release.version), versionAmbiguous: Boolean(row.versionAmbiguous),
    classNeedsReview: Boolean(row.classNeedsReview), skillCountClaimed: Number(row.skillCount || 0),
    appCount: Number(row.appCount || 0), hasUi: Boolean(row.hasUi), functionalScore: row.functionalScore,
    functionalGlobalRank: row.functionalGlobalRank, publicProxyScore: row.publicProxyScore,
    publicProxyConfidence: row.publicProxyConfidence, brandProxyScore: row.brandProxyScore,
    explorationScore: row.explorationScore, explorationGlobalRank: row.explorationGlobalRank,
    proxyStatus: row.proxyStatus, readiness: row.readiness, readyNow: false, topEligible: Boolean(row.topEligible),
    executionBlockers: row.executionBlockers || [], pageVetoCodes: row.pageVetoCodes || [],
    website: row.website || "", githubUrl: row.github && row.github.url ? row.github.url : "",
    trancoRank: row.tranco && row.tranco.rank ? row.tranco.rank : null, evidenceClasses: row.evidenceClasses || {},
    evidenceLevel: "static-metadata", claimSource: "publisher-directory-metadata", artifactRoles: roles, effectClass,
    gateEvidence: gatesFor(classification.primaryModule), ...classification, priorityScore,
    does: doesFor({ name: row.displayName, description: claim }, classification, false),
    conditions: conditionsFor(row, false), proof: proofFor(row, classification, effectClass, false),
    unverified: ["认证状态", "真实权限范围", "代表性调用", "生产稳定性"],
  };
  pluginMap.set(item.id, item);
  return item;
});

const skills = [];
const skillIds = new Set();
function addSkill(parent, skill, version, versionState) {
  const baseId = parent.id + "::" + version + "::" + skill.name;
  let id = baseId;
  let suffix = 2;
  while (skillIds.has(id)) { id = baseId + "::" + suffix; suffix += 1; }
  skillIds.add(id);
  const description = trimText(skill.description || (skill.interface && skill.interface.short_description) || "当前 Skill 元数据没有说明具体能力。", 720);
  const classification = classifyEntity({
    kind: "skill", name: skill.name, displayName: skill.interface && skill.interface.display_name, description,
    solutionCode: parent.solutionCode, stageTags: parent.stageTags, classNeedsReview: parent.classNeedsReview,
    versionAmbiguous: parent.versionAmbiguous,
  }, parent);
  const roles = inferRoles(description, []);
  const effectClass = inferEffect({ name: skill.name, description, interfaceTags: parent.interfaceTags, capabilities: parent.capabilities, riskTags: parent.riskTags }, roles);
  const priorityScore = weightedPriority(classification.fitScore, parent.functionalScore, parent.publicProxyScore, { fit: 0.65, functional: 0.28, publicProxy: 0.07 });
  skills.push({
    id, kind: "skill", name: (skill.interface && skill.interface.display_name) || skill.name, skillName: skill.name,
    parentId: parent.id, parentName: parent.name, developer: parent.developer, description, shape: "Skill",
    installed: parent.installed, enabled: parent.enabled, inventoryState: parent.inventoryState,
    runtimeState: parent.runtimeState, authPolicy: parent.authPolicy, interfaceTags: parent.interfaceTags,
    version, frozenVersions: parent.versions, versionState,
    evidenceLevel: versionState === "local-bundle-exact" ? "static-local-manifest" : "static-catalog-metadata",
    claimSource: versionState === "current-version-drift" ? "current-catalog-version-drift" : versionState,
    artifactRoles: roles, effectClass, gateEvidence: gatesFor(classification.primaryModule),
    functionalScore: parent.functionalScore, publicProxyScore: parent.publicProxyScore,
    publicProxyConfidence: parent.publicProxyConfidence, brandProxyScore: parent.brandProxyScore,
    website: parent.website, solutionCode: parent.solutionCode, solutionPrimary: parent.solutionPrimary,
    ...classification, priorityScore, does: doesFor({ name: skill.name, description }, classification, true),
    conditions: conditionsFor(parent, true), proof: proofFor(parent, classification, effectClass, true),
    unverified: ["Skill 正文逐条执行效果", "父插件认证", "真实工具依赖", "生产稳定性"],
  });
}

for (const row of sourceRows) {
  const parent = pluginMap.get(row.canonicalPluginId);
  const [name, marketplace] = splitCanonicalId(row.canonicalPluginId);
  let evidenceState = "historical-payload-missing";
  let evidenceCount = 0;
  let evidenceVersion = null;
  if (marketplace === "openai-curated-remote") {
    const candidates = catalogByName.get(name) || [];
    const frozenVersions = new Set((row.releaseRecords || []).map((release) => release.version));
    const exact = candidates.find((candidate) => candidate.release && frozenVersions.has(candidate.release.version));
    const selected = exact || candidates[0];
    if (selected && selected.release) {
      evidenceState = exact ? "frozen-exact" : "current-version-drift";
      evidenceVersion = selected.release.version;
      for (const skill of selected.release.skills || []) addSkill(parent, skill, evidenceVersion, evidenceState);
      evidenceCount = (selected.release.skills || []).length;
    }
  } else {
    const localSkills = localSkillsFor(row);
    if (localSkills.length) {
      evidenceState = "local-bundle-exact";
      evidenceVersion = unique(localSkills.map((skill) => skill.version)).join(", ");
      for (const skill of localSkills) addSkill(parent, skill, skill.version, skill.versionState);
      evidenceCount = localSkills.length;
    } else if (Number(row.skillCount || 0) === 0) evidenceState = "not-declared";
  }
  parent.skillEvidence = {
    state: evidenceState, evidenceCount, claimedCount: Number(row.skillCount || 0), evidenceVersion,
    frozenVersions: (row.releaseRecords || []).map((release) => release.version),
    gap: evidenceState === "current-version-drift" || (evidenceState === "historical-payload-missing" && Number(row.skillCount || 0) > 0),
  };
}

function addModuleRanks(rows) {
  for (const module of MODULES) {
    const selected = rows.filter((item) => item.primaryModule === module.id)
      .sort((a, b) => b.priorityScore - a.priorityScore || b.fitScore - a.fitScore || a.name.localeCompare(b.name));
    selected.forEach((item, index) => { item.moduleRank = index + 1; });
  }
}
addModuleRanks(plugins);
addModuleRanks(skills);

const moduleCounts = MODULES.map((module) => ({
  id: module.id,
  plugins: plugins.filter((item) => item.primaryModule === module.id).length,
  skills: skills.filter((item) => item.primaryModule === module.id).length,
  review: plugins.filter((item) => item.primaryModule === module.id && item.matchNeedsReview).length,
}));
const skillCoverage = {
  frozenSkillCountClaims: plugins.reduce((sum, item) => sum + item.skillCountClaimed, 0),
  evidenceRows: skills.length,
  frozenExact: skills.filter((item) => item.versionState === "frozen-exact").length,
  localBundleExact: skills.filter((item) => item.versionState === "local-bundle-exact").length,
  currentVersionDrift: skills.filter((item) => item.versionState === "current-version-drift").length,
  pluginExact: plugins.filter((item) => item.skillEvidence.state === "frozen-exact").length,
  pluginLocalExact: plugins.filter((item) => item.skillEvidence.state === "local-bundle-exact").length,
  pluginDrift: plugins.filter((item) => item.skillEvidence.state === "current-version-drift").length,
  pluginHistoricalMissing: plugins.filter((item) => item.skillEvidence.state === "historical-payload-missing").length,
  pluginsWithGap: plugins.filter((item) => item.skillEvidence.gap).length,
};
const data = {
  meta: {
    title: "Codex Plugin Full-stack Atlas", generatedAt: BUILD_AT,
    frozenAt: snapshot.queries.methodology.rows[0].snapshotAt, researchAt: snapshot.generatedAt,
    catalogFetchedAt: catalog.fetched_at, pluginCount: plugins.length,
    installedCount: plugins.filter((item) => item.installed).length,
    availableCount: plugins.filter((item) => item.inventoryState === "可用未安装").length,
    readyNowCount: plugins.filter((item) => item.readyNow).length,
    reviewCount: plugins.filter((item) => item.matchNeedsReview).length,
    skillCoverage, sourceCommits: { vibecoding: VIBECODING_SHA, shuorenhua: SHUORENHUA_SHA },
    sourceHashes: { snapshot: sha256(snapshotRaw), catalog: sha256(catalogRaw) },
    caveats: snapshot.queries.coverage.source.caveats,
  },
  modules: MODULES, moduleCounts, plugins, skills,
};

function validateData() {
  const errors = [];
  if (plugins.length !== 4184) errors.push("Expected 4,184 plugins, received " + plugins.length);
  if (new Set(plugins.map((item) => item.id)).size !== plugins.length) errors.push("Plugin IDs are not unique");
  if (new Set(skills.map((item) => item.id)).size !== skills.length) errors.push("Skill IDs are not unique");
  for (const item of [...plugins, ...skills]) {
    if (!MODULE_BY_ID.has(item.primaryModule)) errors.push("Invalid primary module for " + item.id);
    if (!item.does || !item.conditions || !item.proof) errors.push("Missing core-three text for " + item.id);
    if (item.kind === "skill" && !pluginMap.has(item.parentId)) errors.push("Missing parent for " + item.id);
    if (item.readyNow) errors.push("Unexpected Ready Now claim for " + item.id);
  }
  if (errors.length) throw new Error("Data validation failed:\n" + errors.slice(0, 30).join("\n"));
}
validateData();
const serialized = JSON.stringify(data).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
const template = readFileSync(templatePath, "utf8");
if (!template.includes("__APP_DATA__")) throw new Error("Template is missing __APP_DATA__ placeholder");
const html = template.replace("__APP_DATA__", serialized);
const csp = "default-src 'none'; base-uri 'none'; form-action 'none'; img-src data:; font-src data:; media-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'";
const cspIndex = html.indexOf(csp);
const styleIndex = html.indexOf("<style>");
const scriptIndex = html.indexOf("<script>");
const htmlErrors = [];
if (cspIndex === -1 || cspIndex > styleIndex || cspIndex > scriptIndex) htmlErrors.push("Exact CSP must appear before style and script");
if (/<script[^>]+src=/i.test(html)) htmlErrors.push("External script detected");
if (/<link[^>]+stylesheet/i.test(html)) htmlErrors.push("External stylesheet detected");
if (/<(?:img|source)[^>]+src=["']https?:/i.test(html)) htmlErrors.push("Remote media detected");
if (/\/Users\/|file:\/\/\/Users\/|\.codex\/plugins\/cache/i.test(html)) htmlErrors.push("Local absolute path leaked into public HTML");
if (htmlErrors.length) throw new Error("HTML validation failed:\n" + htmlErrors.join("\n"));
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, html);
const manifest = {
  schemaVersion: 1, generatedAt: BUILD_AT, artifact: outputPath, artifactBytes: Buffer.byteLength(html),
  artifactSha256: sha256(html), pluginCount: plugins.length, moduleCount: MODULES.length,
  skillCoverage, moduleCounts, sourceCommits: data.meta.sourceCommits, sourceHashes: data.meta.sourceHashes,
  checks: {
    canonicalPluginIdsUnique: true, exactlyOnePrimaryModule: true, skillParentsResolved: true,
    coreThreePresent: true, cspBeforeStyleAndScript: true, noExternalRuntimeResources: true,
    noLocalAbsolutePaths: true, readyNowClaims: 0,
  },
};
mkdirSync(dirname(manifestPath), { recursive: true });
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify(manifest, null, 2));
