#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const parts = arg.replace(/^--/, "").split("=");
  return [parts.shift(), parts.length ? parts.join("=") : true];
}));
const sourcePath = args.source || "data/agentic-tools-source.json";
const curationPath = args.curation || "data/agentic-tools-curation.json";
const roleCurationPath = args.roles || "data/agentic-role-curation.json";
const outputPath = args.output || "data/agentic-tools-evaluations.json";
const sourceRaw = readFileSync(sourcePath, "utf8");
const curationRaw = readFileSync(curationPath, "utf8");
const roleCurationRaw = readFileSync(roleCurationPath, "utf8");
const source = JSON.parse(sourceRaw);
const curation = JSON.parse(curationRaw);
const roleCuration = JSON.parse(roleCurationRaw);
const evaluatedAt = new Date().toISOString();

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const round = (value, digits = 1) => Number(value.toFixed(digits));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const unique = (values) => [...new Set(values.filter(Boolean))];
const MODULE_IDS = Array.from({ length: 14 }, (_, index) => `M${String(index).padStart(2, "0")}`);
const OPC_BY_MODULE = {
  M00: "记忆与治理", M01: "记忆与治理", M02: "情报与研究", M03: "增长与客户",
  M04: "产品与策略", M05: "产品与策略", M06: "设计与内容", M07: "工程与自动化",
  M08: "工程与自动化", M09: "质量与安全", M10: "发布与运营", M11: "发布与运营",
  M12: "增长与客户", M13: "记忆与治理",
};
const FORMS = new Set(["direct-skill", "package-bound-skill", "wrap-candidate", "reference-only", "quarantined"]);
const DECISIONS = new Set(["workbench", "watchlist", "excluded"]);
const EFFECTS = new Set(["read-only", "local-artifact", "workspace", "git", "external", "secrets", "production"]);
const HIGH_RISK = new Set(["git", "external", "secrets", "production"]);
const ROLE_IDS = new Set(["core", "review", "visualize", "summarize"]);
const COVERAGE_NOTE_KEYS = new Set(["M01.review", "M06.summarize", "M08.visualize", "M09.summarize", "M10.visualize", "M13.visualize"]);
const ADMISSION_LEVELS = new Set(["source-confirmed", "static-reviewed", "controlled-smoke", "task-benchmarked"]);
const COVERAGE_MODES = new Set(["native", "generalist", "combined", "package-bound", "adapter-required", "wrapper"]);
const WORKFLOW_EDGE_KINDS = new Set(["feeds", "reviews", "visualizes", "summarizes", "composes", "alternative", "blocks", "feedback"]);

function percentile(values, ratio) {
  const sorted = values.slice().sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const index = (sorted.length - 1) * ratio;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function robustNormalizer(values) {
  const logs = values.map((value) => Math.log1p(Math.max(0, Number(value || 0))));
  const low = percentile(logs, 0.05);
  const high = percentile(logs, 0.95);
  return (value) => high === low ? 50 : round(clamp(100 * (Math.log1p(Math.max(0, Number(value || 0))) - low) / (high - low)), 1);
}

const normalizeStars = robustNormalizer(source.repositories.map((repo) => repo.stars));
const normalizeForks = robustNormalizer(source.repositories.map((repo) => repo.forks));
const normalizeSubscribers = robustNormalizer(source.repositories.map((repo) => repo.subscribers));
const velocities = source.repositories.map((repo) => {
  const ageDays = Math.max(30, (Date.parse(source.capturedAt) - Date.parse(repo.createdAt)) / 86400000);
  return Number(repo.stars || 0) / ageDays;
});
const normalizeVelocity = robustNormalizer(velocities);
const profileByRepo = new Map(curation.projects.map((profile) => [profile.fullName.toLowerCase(), profile]));
const repoByName = new Map(source.repositories.map((repo) => [repo.fullName.toLowerCase(), repo]));

function recencyScore(repo) {
  if (!repo.pushedAt) return 20;
  const days = Math.max(0, (Date.parse(source.capturedAt) - Date.parse(repo.pushedAt)) / 86400000);
  if (days <= 45) return 95;
  if (days <= 120) return 82;
  if (days <= 365) return 68;
  if (days <= 730) return 48;
  return 25;
}

function licenseFacts(repo, profile) {
  const apiSpdx = repo.license && repo.license.spdxId && !["NOASSERTION", "OTHER"].includes(repo.license.spdxId)
    ? repo.license.spdxId
    : null;
  if (profile.licenseException === "per-skill") return { status: "per-skill", label: profile.licenseLabel || "逐 Skill 判定", clear: true };
  if (apiSpdx) return { status: "clear", label: apiSpdx, clear: true };
  if (repo.files.licenseFileCount > 0 && profile.licenseLabel) return { status: "file-review", label: profile.licenseLabel, clear: true };
  if (profile.capabilityForm === "reference-only") return { status: "reference-only", label: "只链接，不复制", clear: false };
  return { status: "blocked", label: "未确认可适用许可证", clear: false };
}

function publicSignal(repo) {
  const ageDays = Math.max(30, (Date.parse(source.capturedAt) - Date.parse(repo.createdAt)) / 86400000);
  const release = repo.latestRelease
    ? clamp(100 - Math.max(0, (Date.parse(source.capturedAt) - Date.parse(repo.latestRelease.publishedAt)) / 86400000) / 3)
    : 25;
  const score = normalizeStars(repo.stars) * 0.35
    + normalizeForks(repo.forks) * 0.2
    + normalizeSubscribers(repo.subscribers) * 0.15
    + normalizeVelocity(Number(repo.stars || 0) / ageDays) * 0.15
    + release * 0.15;
  return {
    score: round(score, 1),
    coverage: 0.68,
    facts: { stars: repo.stars, forks: repo.forks, subscribers: repo.subscribers, latestReleaseAt: repo.latestRelease?.publishedAt || null },
    boundary: "GitHub stars、forks、subscribers、增长速度与 release 新鲜度的对数归一代理；不是安装量、用户数或生产采用。",
  };
}

function evaluateProject(repo, profile) {
  const license = licenseFacts(repo, profile);
  const readme = repo.readme || {};
  const validSamples = repo.sampledSkills.filter((sample) => sample.valid).length;
  const sampleRatio = repo.sampledSkills.length ? validSamples / repo.sampledSkills.length : 0;
  let workflowReadiness;
  if (profile.capabilityForm === "direct-skill") workflowReadiness = 55 + sampleRatio * 14 + (readme.install ? 6 : 0) + (readme.usage ? 5 : 0) + (repo.files.manifestCount ? 4 : 0);
  else if (profile.capabilityForm === "package-bound-skill") workflowReadiness = 52 + sampleRatio * 10 + (readme.install ? 6 : 0) + (repo.files.manifestCount ? 5 : 0);
  else if (profile.capabilityForm === "wrap-candidate") workflowReadiness = 43 + (readme.install ? 7 : 0) + (readme.usage ? 7 : 0) + ((readme.cli || readme.api || readme.mcp) ? 8 : 0) + (repo.files.manifestCount ? 4 : 0);
  else if (profile.capabilityForm === "reference-only") workflowReadiness = 34 + (readme.usage ? 5 : 0) + (repo.files.testPathCount ? 4 : 0);
  else workflowReadiness = 15;
  workflowReadiness = clamp(workflowReadiness + Number(profile.workflowAdjustment || 0));

  const effectivenessEvidence = clamp(32
    + (repo.files.workflowCount ? Math.min(13, 5 + Math.log2(repo.files.workflowCount + 1) * 2.2) : 0)
    + (repo.files.testPathCount ? Math.min(22, 5 + Math.log2(repo.files.testPathCount + 1) * 2.6) : 0)
    + (repo.latestRelease ? 7 : 0)
    + (readme.tests ? 4 : 0)
    + Number(profile.evidenceAdjustment || 0), 0, 82);
  const projectHealth = clamp(recencyScore(repo) * 0.55
    + (repo.latestRelease ? 78 : 42) * 0.2
    + (repo.files.workflowCount ? 78 : 45) * 0.15
    + (repo.archived || repo.disabled ? 0 : 85) * 0.1);
  let trust = (license.clear ? 66 : 34)
    + (repo.files.securityFileCount ? 8 : 0)
    + (repo.files.workflowCount ? 6 : 0)
    + (repo.files.testPathCount ? 5 : 0)
    + (readme.security ? 5 : 0)
    + Number(profile.trustAdjustment || 0);
  if (HIGH_RISK.has(profile.effectClass)) trust -= 7;
  if (repo.archived || repo.disabled) trust -= 18;
  trust = clamp(trust);
  const relevance = Number(profile.relevance);
  const capabilityValue = Number(profile.capabilityValue);
  const qualityScore = round(relevance * 0.25 + capabilityValue * 0.2 + workflowReadiness * 0.2 + effectivenessEvidence * 0.15 + projectHealth * 0.1 + trust * 0.1, 1);
  const evidenceCoverage = round(clamp(
    0.26
    + (repo.readme ? 0.11 : 0)
    + (repo.headSha ? 0.1 : 0)
    + (license.clear ? 0.1 : 0)
    + (repo.files.workflowCount ? 0.07 : 0)
    + (repo.files.testPathCount ? 0.08 : 0)
    + (repo.latestRelease ? 0.06 : 0)
    + (sampleRatio ? 0.08 : 0)
    + Number(profile.coverageAdjustment || 0), 0, 0.9), 2);
  const uncertainty = round(2 + 10 * (1 - evidenceCoverage), 1);
  const publicProxy = publicSignal(repo);
  const researchPriority = round(qualityScore * 0.92 + publicProxy.score * 0.08, 1);
  const vetoes = [];
  if (repo.archived) vetoes.push("archived");
  if (repo.disabled) vetoes.push("disabled");
  if (repo.emptyRepository) vetoes.push("empty-repository");
  if (!license.clear && !["reference-only", "quarantined"].includes(profile.capabilityForm)) vetoes.push("license-unresolved");
  if (profile.duplicateOf) vetoes.push("duplicate-or-derived");
  for (const code of profile.vetoes || []) vetoes.push(code);
  if (profile.decision === "workbench" && vetoes.length) {
    throw new Error(`${repo.fullName} cannot enter workbench with vetoes: ${unique(vetoes).join(", ")}`);
  }
  let tier;
  if (profile.capabilityForm === "quarantined") tier = "Q";
  else if (vetoes.length || qualityScore < 50) tier = "D";
  else if (qualityScore >= 75 && evidenceCoverage >= 0.7 && workflowReadiness >= 68) tier = "A";
  else if (qualityScore >= 65 && evidenceCoverage >= 0.6) tier = "B";
  else tier = "C";
  const verificationState = repo.files.skillCount && sampleRatio ? "structure-checked" : "docs-only";
  const conditions = unique([
    profile.conditions,
    profile.capabilityForm === "direct-skill" ? "只按具体 Skill 路径固定 commit 安装；仓库级发现不等于整库可装。" : null,
    profile.capabilityForm === "package-bound-skill" ? "Skill 与仓库 helper、agent 或配置耦合，不能只复制一个 SKILL.md。" : null,
    profile.capabilityForm === "wrap-candidate" ? "它当前不是独立 Codex Skill；先做薄封装并把输入、输出、权限和停止条件写清。" : null,
    !license.clear ? "许可证或复用边界没有确认，只能链接研究，不能复制进正式能力库。" : null,
    repo.archived ? "仓库已归档，只保留历史参考。" : null,
    "本轮没有安装或运行第三方代码。",
  ]).join(" ");
  const proof = profile.proof || (
    profile.capabilityForm === "direct-skill" || profile.capabilityForm === "package-bound-skill"
      ? "先做静态校验，再在隔离项目触发一个固定任务；核对输入、产物、改动清单、失败提示与清理结果。"
      : profile.capabilityForm === "wrap-candidate"
        ? "在沙盒用固定输入跑通最小接口，确认输出可观察、失败可恢复，再决定是否写 Skill 包装。"
        : "只核对方法、架构与来源；不要把阅读过的项目写成已安装或已验证能力。"
  );
  return {
    id: `github:${repo.fullName.toLowerCase()}@${repo.headSha || "empty"}`,
    kind: "agentic-project",
    fullName: repo.fullName,
    name: repo.fullName.split("/").pop(),
    owner: repo.fullName.split("/")[0],
    url: repo.url,
    headSha: repo.headSha,
    headCommittedAt: repo.headCommittedAt,
    listPosition: repo.listPosition,
    description: repo.description,
    primaryModule: profile.primaryModule,
    secondaryModules: profile.secondaryModules || [],
    opcDimensions: unique(profile.opcDimensions || [OPC_BY_MODULE[profile.primaryModule]]),
    capabilityForm: profile.capabilityForm,
    wrapEffort: profile.wrapEffort || null,
    decision: profile.decision,
    effectClass: profile.effectClass,
    coreThree: { does: profile.does, conditions, proof },
    selectedReason: profile.selectedReason,
    limitations: unique(profile.limitations || []),
    reasonCodes: unique(profile.reasonCodes || []),
    vetoes: unique(vetoes),
    duplicateOf: profile.duplicateOf || null,
    verificationState,
    license,
    archived: repo.archived,
    emptyRepository: repo.emptyRepository,
    pushedAt: repo.pushedAt,
    latestRelease: repo.latestRelease,
    skillEvidence: {
      paths: repo.files.skillCount,
      uniqueBlobs: repo.files.skillUniqueBlobCount,
      likelyCandidateUniqueBlobs: repo.files.skillCandidateUniqueBlobCount,
      sampled: repo.sampledSkills.length,
      sampledFrontmatterValid: validSamples,
      treeTruncated: repo.files.treeTruncated,
    },
    engineeringEvidence: {
      workflows: repo.files.workflowCount,
      testPaths: repo.files.testPathCount,
      manifests: repo.files.manifestCount,
      securityFiles: repo.files.securityFileCount,
      agentInstructionFiles: repo.files.agentInstructionFileCount,
    },
    sourceEvidence: unique([
      repo.readme?.url,
      repo.files.skillFiles[0]?.url,
      repo.files.licenseFiles[0]?.url,
      repo.latestRelease?.url,
    ]),
    scores: {
      relevance, capabilityValue,
      workflowReadiness: round(workflowReadiness, 1),
      effectivenessEvidence: round(effectivenessEvidence, 1),
      projectHealth: round(projectHealth, 1), trust: round(trust, 1),
      qualityScore, evidenceCoverage, uncertainty,
      publicSignalScore: publicProxy.score, publicSignalCoverage: publicProxy.coverage,
      researchPriority,
    },
    publicSignal: publicProxy,
    tier,
  };
}

function validateInputs() {
  const errors = [];
  if (source.declaredCount !== 81 || source.repositories.length !== 81) errors.push("Source must contain all 81 repositories");
  if (profileByRepo.size !== curation.projects.length) errors.push("Duplicate curation project names");
  for (const repo of source.repositories) {
    const profile = profileByRepo.get(repo.fullName.toLowerCase());
    if (!profile) errors.push(`Missing curation for ${repo.fullName}`);
  }
  for (const profile of curation.projects) {
    if (!repoByName.has(profile.fullName.toLowerCase())) errors.push(`Curation has unknown repository ${profile.fullName}`);
    if (!MODULE_IDS.includes(profile.primaryModule)) errors.push(`Invalid module for ${profile.fullName}`);
    if (!FORMS.has(profile.capabilityForm)) errors.push(`Invalid capability form for ${profile.fullName}`);
    if (!DECISIONS.has(profile.decision)) errors.push(`Invalid decision for ${profile.fullName}`);
    if (!EFFECTS.has(profile.effectClass)) errors.push(`Invalid effect class for ${profile.fullName}`);
    if (!profile.does || !profile.conditions || !profile.selectedReason) errors.push(`Incomplete plain-language curation for ${profile.fullName}`);
  }
  if (roleCuration.roles.length !== ROLE_IDS.size) errors.push("Role curation must define four workbench roles");
  const roleIds = roleCuration.roles.map((role) => role.id);
  if (new Set(roleIds).size !== ROLE_IDS.size || [...ROLE_IDS].some((roleId) => !roleIds.includes(roleId))) errors.push("Role curation must define each required workbench role exactly once");
  for (const role of roleCuration.roles) {
    if (!ROLE_IDS.has(role.id) || !role.label || !role.question || !role.validation) errors.push(`Invalid workbench role ${role.id}`);
  }
  const coverageNoteKeys = Object.keys(roleCuration.coverageNotes || {});
  if (coverageNoteKeys.length !== COVERAGE_NOTE_KEYS.size || [...COVERAGE_NOTE_KEYS].some((key) => !coverageNoteKeys.includes(key))) errors.push("Role curation weak-coverage note set changed");
  for (const key of coverageNoteKeys) {
    const [moduleId, roleId] = key.split(".");
    if (!MODULE_IDS.includes(moduleId) || !ROLE_IDS.has(roleId) || !roleCuration.coverageNotes[key]?.trim()) errors.push(`Invalid weak-coverage note ${key}`);
  }
  for (const skill of roleCuration.additionalCapabilities) {
    if (!repoByName.has(skill.repo.toLowerCase())) errors.push(`Expanded capability has unknown repository ${skill.repo}`);
    if (!MODULE_IDS.includes(skill.primaryModule)) errors.push(`Expanded capability has invalid module ${skill.slug}`);
    if (!ADMISSION_LEVELS.has(skill.admissionLevel)) errors.push(`Expanded capability has invalid admission level ${skill.slug}`);
    if (!skill.coreThree?.does || !skill.coreThree?.conditions || !skill.coreThree?.proof) errors.push(`Expanded capability is missing coreThree ${skill.slug}`);
    if (skill.expansionBatch && typeof skill.expansionBatch !== "string") errors.push(`Expanded capability has invalid batch ${skill.slug}`);
    if (skill.workflowRefs && (!Array.isArray(skill.workflowRefs) || skill.workflowRefs.some((ref) => typeof ref !== "string"))) errors.push(`Expanded capability has invalid workflow refs ${skill.slug}`);
  }
  const workflowGraph = roleCuration.workflowGraph;
  if (!workflowGraph || workflowGraph.schemaVersion !== "agentic-workflow-graph.v1" || !Array.isArray(workflowGraph.moduleEdges) || !Array.isArray(workflowGraph.capabilityEdges)) errors.push("Workflow graph schema is missing");
  const edgeIds = (workflowGraph?.moduleEdges || []).map((edge) => edge.id);
  if (new Set(edgeIds).size !== edgeIds.length) errors.push("Workflow module edge IDs are not unique");
  for (const edge of workflowGraph?.moduleEdges || []) {
    if (!edge.id || !MODULE_IDS.includes(edge.fromModule) || !MODULE_IDS.includes(edge.toModule)) errors.push(`Invalid workflow module edge ${edge.id || "(missing id)"}`);
    if (!ROLE_IDS.has(edge.fromRole) || !ROLE_IDS.has(edge.toRole)) errors.push(`Invalid workflow edge roles ${edge.id || "(missing id)"}`);
    if (!edge.inputArtifact || !edge.outputArtifact || !edge.handoff || !edge.validation) errors.push(`Incomplete workflow module edge ${edge.id || "(missing id)"}`);
    if (edge.kind && !WORKFLOW_EDGE_KINDS.has(edge.kind)) errors.push(`Invalid workflow edge kind ${edge.id || "(missing id)"}`);
    if (!Array.isArray(edge.candidateSlugs) || !edge.candidateSlugs.length) errors.push(`Workflow edge has no candidate mapping ${edge.id || "(missing id)"}`);
  }
  for (const edge of workflowGraph?.capabilityEdges || []) {
    if (!edge.from || !edge.to || !WORKFLOW_EDGE_KINDS.has(edge.kind)) errors.push("Invalid workflow capability edge");
  }
  for (const moduleId of MODULE_IDS) {
    const moduleRoles = roleCuration.moduleRoleAssignments[moduleId];
    if (!moduleRoles) errors.push(`Missing role assignments for ${moduleId}`);
    for (const roleId of ROLE_IDS) {
      if (!Array.isArray(moduleRoles?.[roleId]) || moduleRoles[roleId].length === 0) errors.push(`Missing ${roleId} role candidates for ${moduleId}`);
    }
  }
  if (errors.length) throw new Error(errors.slice(0, 40).join("\n"));
}
validateInputs();

const projects = source.repositories.map((repo) => evaluateProject(repo, profileByRepo.get(repo.fullName.toLowerCase())));
const projectMap = new Map(projects.map((project) => [project.fullName.toLowerCase(), project]));

function skillEvidence(repo, path) {
  if (!path) return null;
  return repo.files.skillFiles.find((entry) => entry.path === path) || null;
}

const skillDefinitions = [
  ...curation.curatedSkills.map((skill, index) => ({
    ...skill,
    origin: "benchmark-v1",
    admissionLevel: skill.path ? "static-reviewed" : "source-confirmed",
    benchmarkTrack: { cohort: "v1-40", order: index + 1 },
  })),
  ...roleCuration.additionalCapabilities.map((skill) => ({
    ...skill,
    origin: skill.expansionBatch ? "role-expansion-v2" : "role-expansion-v1",
    selection: skill.selection || "expanded",
    featuredRank: null,
    benchmarkTrack: null,
  })),
];
const slugSet = new Set();
const pathSet = new Set();
for (const skill of skillDefinitions) {
  if (slugSet.has(skill.slug)) throw new Error(`Duplicate capability slug: ${skill.slug}`);
  slugSet.add(skill.slug);
  if (skill.path) {
    const key = `${skill.repo.toLowerCase()}#${skill.path}`;
    if (pathSet.has(key)) throw new Error(`Duplicate capability path: ${key}`);
    pathSet.add(key);
  }
}

const roleLabelById = new Map(roleCuration.roles.map((role) => [role.id, role.label]));
const assignmentsBySlug = new Map(skillDefinitions.map((skill) => [skill.slug, []]));
const moduleRoleCoverage = {};
const assignmentPairs = new Set();
for (const moduleId of MODULE_IDS) {
  moduleRoleCoverage[moduleId] = {};
  const moduleRoles = roleCuration.moduleRoleAssignments[moduleId];
  for (const roleId of ROLE_IDS) {
    const entries = moduleRoles[roleId];
    moduleRoleCoverage[moduleId][roleId] = entries.length;
    entries.forEach((rawEntry, index) => {
      const entry = typeof rawEntry === "string" ? { slug: rawEntry } : rawEntry;
      if (!assignmentsBySlug.has(entry.slug)) throw new Error(`Unknown role capability ${moduleId}.${roleId}: ${entry.slug}`);
      const coverageMode = entry.coverageMode || "native";
      if (!COVERAGE_MODES.has(coverageMode)) throw new Error(`Invalid coverage mode ${moduleId}.${roleId}: ${coverageMode}`);
      const pairKey = `${entry.slug}#${moduleId}`;
      if (assignmentPairs.has(pairKey)) throw new Error(`Capability assigned twice inside ${moduleId}: ${entry.slug}`);
      assignmentPairs.add(pairKey);
      assignmentsBySlug.get(entry.slug).push({
        moduleId,
        leadRole: roleId,
        roles: [roleId],
        rank: index + 1,
        coverageMode,
        reason: `${moduleId} 的${roleLabelById.get(roleId)}候选；按冻结说明评估角色适配，尚未据此晋级。`,
      });
    });
  }
}

const curatedSkills = skillDefinitions.map((skill) => {
  const repo = repoByName.get(skill.repo.toLowerCase());
  const parent = projectMap.get(skill.repo.toLowerCase());
  if (!repo || !parent) throw new Error(`Curated Skill has unknown repo: ${skill.repo}`);
  const file = skillEvidence(repo, skill.path);
  if (skill.path && !file) throw new Error(`Curated Skill path not frozen: ${skill.repo} ${skill.path}`);
  if (!MODULE_IDS.includes(skill.primaryModule)) throw new Error(`Curated Skill has invalid module: ${skill.name}`);
  if (!skill.coreThree?.does || !skill.coreThree?.conditions || !skill.coreThree?.proof) throw new Error(`Curated Skill is missing coreThree: ${skill.name}`);
  const identifier = skill.path || `workflow:${skill.slug}`;
  return {
    id: `github:${repo.fullName.toLowerCase()}@${repo.headSha || "empty"}#${identifier}`,
    kind: "agentic-skill",
    name: skill.name,
    slug: skill.slug,
    repoFullName: repo.fullName,
    repoName: repo.fullName.split("/").pop(),
    repoUrl: repo.url,
    headSha: repo.headSha,
    path: skill.path || null,
    sourceUrl: file ? file.url : repo.url,
    blobSha: file ? file.blobSha : null,
    primaryModule: skill.primaryModule,
    secondaryModules: skill.secondaryModules || [],
    opcDimensions: unique(skill.opcDimensions || [OPC_BY_MODULE[skill.primaryModule]]),
    capabilityForm: skill.capabilityForm || parent.capabilityForm,
    selection: skill.selection || "expanded",
    featuredRank: Number.isInteger(skill.featuredRank) ? skill.featuredRank : null,
    effectClass: skill.effectClass || parent.effectClass,
    coreThree: skill.coreThree,
    limitations: unique(skill.limitations || []),
    selectedReason: skill.selectedReason,
    requirements: unique(skill.requirements || []),
    license: skill.license || { ...parent.license, scope: parent.license.status === "per-skill" ? "skill-directory" : "repository" },
    verificationState: skill.admissionLevel || (file ? "static-reviewed" : "source-confirmed"),
    admissionLevel: skill.admissionLevel || (file ? "static-reviewed" : "source-confirmed"),
    claimCeiling: "candidate-only",
    origin: skill.origin,
    capabilityCluster: skill.capabilityCluster || "core",
    workflowRefs: unique(skill.workflowRefs || []),
    benchmarkTrack: skill.benchmarkTrack,
    workbenchAssignments: assignmentsBySlug.get(skill.slug),
    roleTags: unique(assignmentsBySlug.get(skill.slug).flatMap((assignment) => assignment.roles)),
    parentDecision: parent.decision,
    scores: {
      fitScore: skill.fitScore,
      qualityScore: parent.scores.qualityScore,
      evidenceCoverage: parent.scores.evidenceCoverage,
      publicSignalScore: parent.scores.publicSignalScore,
      researchPriority: round(skill.fitScore * 0.55 + parent.scores.qualityScore * 0.37 + parent.scores.publicSignalScore * 0.08, 1),
    },
  };
});

const workflowGraph = roleCuration.workflowGraph;
const workflowEdgeById = new Map((workflowGraph?.moduleEdges || []).map((edge) => [edge.id, edge]));
const curatedSlugSet = new Set(curatedSkills.map((skill) => skill.slug));
for (const edge of workflowGraph?.moduleEdges || []) {
  for (const slug of edge.candidateSlugs || []) if (!curatedSlugSet.has(slug)) throw new Error(`Workflow edge ${edge.id} references unknown capability ${slug}`);
}
for (const edge of workflowGraph?.capabilityEdges || []) {
  if (!curatedSlugSet.has(edge.from) || !curatedSlugSet.has(edge.to)) throw new Error(`Workflow capability edge references unknown capability: ${edge.from} -> ${edge.to}`);
}
for (const skill of curatedSkills) {
  for (const ref of skill.workflowRefs || []) if (!workflowEdgeById.has(ref)) throw new Error(`Capability ${skill.slug} references unknown workflow edge ${ref}`);
}

const benchmarkCohort = curatedSkills.filter((skill) => skill.benchmarkTrack?.cohort === "v1-40")
  .sort((a, b) => a.benchmarkTrack.order - b.benchmarkTrack.order);
if (benchmarkCohort.length !== 40) throw new Error(`Expected 40 benchmark-v1 candidates, got ${benchmarkCohort.length}`);
for (const moduleId of MODULE_IDS) {
  const featured = benchmarkCohort.filter((skill) => skill.primaryModule === moduleId && Number.isInteger(skill.featuredRank));
  if (featured.length > 3) throw new Error(`${moduleId} has more than three featured Agent Skills`);
  const ranks = featured.map((skill) => skill.featuredRank).sort((a, b) => a - b);
  if (ranks.some((rank, index) => rank !== index + 1)) throw new Error(`${moduleId} featured ranks must be contiguous from 1`);
}

function assignRanks(rows, field, outputField) {
  rows.slice().sort((a, b) => b.scores[field] - a.scores[field] || a.fullName.localeCompare(b.fullName))
    .forEach((row, index) => { row[outputField] = index + 1; });
}
assignRanks(projects, "qualityScore", "qualityRank");
assignRanks(projects, "publicSignalScore", "publicSignalRank");
assignRanks(projects, "researchPriority", "researchRank");
for (const moduleId of MODULE_IDS) {
  projects.filter((project) => project.primaryModule === moduleId)
    .sort((a, b) => b.scores.researchPriority - a.scores.researchPriority || a.fullName.localeCompare(b.fullName))
    .forEach((project, index) => { project.moduleRank = index + 1; });
}

const output = {
  schemaVersion: 2,
  evaluatedAt,
  source: {
    listUrl: source.listUrl,
    capturedAt: source.capturedAt,
    membershipSha256: source.membershipSha256,
    repositoryCount: source.repositories.length,
    sourceSha256: sha256(sourceRaw),
    curationSha256: sha256(curationRaw),
    roleCurationSha256: sha256(roleCurationRaw),
  },
  policy: { ...curation.policy, roleWorkbench: roleCuration.policy },
  opcDimensions: curation.opcDimensions,
  workbenchRoles: roleCuration.roles,
  coverageNotes: roleCuration.coverageNotes,
  capabilityChains: roleCuration.capabilityChains,
  workflowGraph,
  projects,
  curatedSkills,
  coverage: {
    repositoryCount: projects.length,
    workbenchProjects: projects.filter((project) => project.decision === "workbench").length,
    watchlistProjects: projects.filter((project) => project.decision === "watchlist").length,
    excludedProjects: projects.filter((project) => project.decision === "excluded").length,
    directSkillProjects: projects.filter((project) => project.capabilityForm === "direct-skill").length,
    packageBoundProjects: projects.filter((project) => project.capabilityForm === "package-bound-skill").length,
    wrapCandidates: projects.filter((project) => project.capabilityForm === "wrap-candidate").length,
    referenceOnly: projects.filter((project) => project.capabilityForm === "reference-only").length,
    quarantined: projects.filter((project) => project.capabilityForm === "quarantined").length,
    rawSkillPaths: source.repositories.reduce((sum, repo) => sum + repo.files.skillCount, 0),
    repoUniqueSkillBlobs: source.repositories.reduce((sum, repo) => sum + repo.files.skillUniqueBlobCount, 0),
    curatedSkillCount: curatedSkills.length,
    featuredSkillCount: benchmarkCohort.length,
    benchmarkCohortCount: benchmarkCohort.length,
    expandedCapabilityCount: curatedSkills.filter((skill) => skill.origin?.startsWith("role-expansion-")).length,
    expandedNativeSkillPathCount: curatedSkills.filter((skill) => skill.origin?.startsWith("role-expansion-") && Boolean(skill.path)).length,
    expandedWorkflowCandidateCount: curatedSkills.filter((skill) => skill.origin?.startsWith("role-expansion-") && !skill.path).length,
    expansionBatchCounts: Object.fromEntries([...new Set(curatedSkills.filter((skill) => skill.origin?.startsWith("role-expansion-")).map((skill) => skill.origin))].sort().map((origin) => [origin, curatedSkills.filter((skill) => skill.origin === origin).length])),
    workflowRelationCount: workflowGraph.moduleEdges.length,
    workflowBoundSkillCount: curatedSkills.filter((skill) => skill.workflowRefs?.length).length,
    nativeSkillPathCount: curatedSkills.filter((skill) => Boolean(skill.path)).length,
    workflowCandidateCount: curatedSkills.filter((skill) => !skill.path).length,
    roleAssignmentCount: curatedSkills.reduce((sum, skill) => sum + skill.workbenchAssignments.length, 0),
    roleCoverageByModule: moduleRoleCoverage,
    runtimeVerified: 0,
  },
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n");
console.log(JSON.stringify({
  output: outputPath,
  repositories: projects.length,
  workbenchProjects: output.coverage.workbenchProjects,
  curatedSkills: curatedSkills.length,
  benchmarkCohort: benchmarkCohort.length,
  roleAssignments: output.coverage.roleAssignmentCount,
  featuredSkills: output.coverage.featuredSkillCount,
  runtimeVerified: 0,
}, null, 2));
