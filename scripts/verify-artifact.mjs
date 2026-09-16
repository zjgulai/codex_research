#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

const htmlPath = process.argv[2] || "public/index.html";
const manifestPath = process.argv[3] || "data/build-manifest.json";
const benchmarkCandidatesPath = process.argv[4] || "benchmarks/candidates.json";
const html = readFileSync(htmlPath, "utf8");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const errors = [];
let embeddedData = null;
const startToken = "const DATA_GZIP_BASE64 = \"";
const endToken = "\";\n\n    async function loadAppData";
const start = html.indexOf(startToken);
const end = html.indexOf(endToken, start);

if (start === -1 || end === -1) {
  errors.push("Embedded data boundary not found");
} else {
  const encoded = html.slice(start + startToken.length, end);
  const serialized = gunzipSync(Buffer.from(encoded, "base64")).toString("utf8");
  const data = JSON.parse(serialized);
  embeddedData = data;
  if (data.meta.pluginCount !== 4184 || data.plugins.length !== 4184) errors.push("Plugin count is not 4,184");
  if (data.modules.length !== 14) errors.push("Module count is not 14");
  if (data.skills.length !== data.meta.skillCoverage.evidenceRows) errors.push("Skill evidence count mismatch");
  if (data.agenticProjects.length !== 81 || data.meta.agenticCoverage.repositoryCount !== 81) errors.push("Agentic project count is not 81");
  if (data.agenticSkills.length !== 72 || data.meta.agenticCoverage.curatedSkillCount !== 72) errors.push("Curated Agent capability count is not 72");
  if (data.agenticSkills.filter((item) => item.benchmarkTrack?.cohort === "v1-40").length !== 40) errors.push("Frozen benchmark cohort is not 40");
  if (data.meta.agenticCoverage.expandedNativeSkillPathCount !== 29 || data.meta.agenticCoverage.expandedWorkflowCandidateCount !== 3) errors.push("Role expansion is not 29 native paths plus 3 workflow candidates");
  if (data.meta.agenticCoverage.nativeSkillPathCount !== 67 || data.meta.agenticCoverage.workflowCandidateCount !== 5) errors.push("Agent capability form split is not 67 paths plus 5 workflow candidates");
  if (data.meta.agenticCoverage.roleAssignmentCount !== 116) errors.push("Agent workbench assignment count is not 116");
  if (data.meta.agenticCoverage.runtimeVerified !== 0) errors.push("Static release claims runtime-verified Agent Skills");
  if (data.agenticBenchmark?.coverage?.completedRuns !== 16) errors.push("Calibration run count is not 16");
  if (data.agenticBenchmark?.coverage?.taskBenchmarked !== 0 || data.agenticBenchmark?.coverage?.promotedToDefault !== 0) errors.push("Calibration was upgraded into benchmark or default status");
  if (data.agenticBenchmark?.suite?.scorerQualification !== "failed-needs-v2") errors.push("Calibration scorer boundary is missing");
  if (data.agenticBenchmark?.results?.some((item) => item.scoreUsableForRanking !== false || item.benchmarkState !== "calibration-only")) errors.push("Diagnostic calibration score is exposed as ranking evidence");
  const pluginIds = new Set(data.plugins.map((item) => item.id));
  const agenticProjectIds = new Set(data.agenticProjects.map((item) => item.id));
  if (pluginIds.size !== data.plugins.length) errors.push("Duplicate plugin IDs");
  if (new Set(data.skills.map((item) => item.id)).size !== data.skills.length) errors.push("Duplicate Skill evidence IDs");
  if (agenticProjectIds.size !== data.agenticProjects.length) errors.push("Duplicate Agentic project IDs");
  if (new Set(data.agenticSkills.map((item) => item.id)).size !== data.agenticSkills.length) errors.push("Duplicate curated Agent Skill IDs");
  const moduleIds = new Set(data.modules.map((item) => item.id));
  const expectedRoleIds = ["core", "review", "visualize", "summarize"];
  const actualRoleIds = (data.workbenchRoles || []).map((role) => role.id);
  if (new Set(actualRoleIds).size !== expectedRoleIds.length || expectedRoleIds.some((roleId) => !actualRoleIds.includes(roleId))) {
    errors.push("Workbench roles are not exactly core, review, visualize, summarize");
  }
  const roleIds = new Set(expectedRoleIds);
  const roleCoverage = Object.fromEntries([...moduleIds].map((moduleId) => [moduleId, Object.fromEntries(expectedRoleIds.map((roleId) => [roleId, 0]))]));
  const assignmentPairs = new Set();
  let assignmentCount = 0;
  for (const item of data.plugins.concat(data.skills)) {
    if (!moduleIds.has(item.primaryModule)) errors.push("Unknown primary module: " + item.id);
    if (!item.description) errors.push("Missing source description: " + item.id);
    if (item.kind === "skill" && !pluginIds.has(item.parentId)) errors.push("Missing Skill parent: " + item.id);
  }
  for (const item of data.agenticProjects) {
    if (!moduleIds.has(item.primaryModule)) errors.push("Unknown Agentic project module: " + item.id);
    if (!item.coreThree?.does || !item.coreThree?.conditions || !item.coreThree?.proof) errors.push("Missing Agentic project core-three: " + item.id);
    if (item.decision === "workbench" && item.vetoes.length) errors.push("Vetoed Agentic project entered workbench: " + item.id);
  }
  for (const item of data.agenticSkills) {
    if (!moduleIds.has(item.primaryModule)) errors.push("Unknown Agent Skill module: " + item.id);
    if (!agenticProjectIds.has(item.parentId)) errors.push("Missing Agent Skill parent: " + item.id);
    if (!item.coreThree?.does || !item.coreThree?.conditions || !item.coreThree?.proof) errors.push("Missing Agent Skill core-three: " + item.id);
    if (item.path && (!item.blobSha || !item.sourceUrl)) errors.push("Agent Skill path lacks frozen blob evidence: " + item.id);
    if (!item.workbenchAssignments?.length) errors.push("Agent capability lacks workbench assignments: " + item.id);
    if (!item.admissionLevel || item.claimCeiling !== "candidate-only") errors.push("Agent capability claim boundary is missing: " + item.id);
    for (const assignment of item.workbenchAssignments || []) {
      assignmentCount += 1;
      const pair = item.id + "\u0000" + assignment.moduleId;
      if (assignmentPairs.has(pair)) errors.push("Duplicate capability/module workbench assignment: " + item.id + " / " + assignment.moduleId);
      assignmentPairs.add(pair);
      if (!moduleIds.has(assignment.moduleId)) errors.push("Unknown workbench assignment module: " + item.id + " / " + assignment.moduleId);
      if (!roleIds.has(assignment.leadRole)) errors.push("Unknown workbench lead role: " + item.id + " / " + assignment.leadRole);
      if (!Array.isArray(assignment.roles) || !assignment.roles.includes(assignment.leadRole) || assignment.roles.some((roleId) => !roleIds.has(roleId))) {
        errors.push("Invalid workbench role membership: " + item.id + " / " + assignment.moduleId);
      }
      if (!Number.isInteger(assignment.rank) || assignment.rank < 1) errors.push("Invalid workbench assignment rank: " + item.id + " / " + assignment.moduleId);
      if (!assignment.reason?.trim()) errors.push("Missing workbench assignment reason: " + item.id + " / " + assignment.moduleId);
      if (roleCoverage[assignment.moduleId]?.[assignment.leadRole] != null) roleCoverage[assignment.moduleId][assignment.leadRole] += 1;
    }
  }
  if (assignmentCount !== 116 || assignmentCount !== data.meta.agenticCoverage.roleAssignmentCount) errors.push("Recomputed Agent workbench assignment count is not 116");
  for (const moduleId of moduleIds) {
    for (const roleId of expectedRoleIds) {
      if (roleCoverage[moduleId][roleId] !== data.meta.agenticCoverage.roleCoverageByModule?.[moduleId]?.[roleId]) {
        errors.push(`Workbench role coverage mismatch for ${moduleId}.${roleId}`);
      }
    }
  }
  const expectedCoverageNoteKeys = ["M01.review", "M06.summarize", "M08.visualize", "M09.summarize", "M10.visualize", "M13.visualize"];
  const actualCoverageNoteKeys = Object.keys(data.coverageNotes || {}).sort();
  if (actualCoverageNoteKeys.length !== expectedCoverageNoteKeys.length || expectedCoverageNoteKeys.some((key) => !actualCoverageNoteKeys.includes(key))) {
    errors.push("Explicit weak-coverage note set changed");
  }
  for (const key of actualCoverageNoteKeys) {
    const [moduleId, roleId] = key.split(".");
    if (!moduleIds.has(moduleId) || !roleIds.has(roleId) || !data.coverageNotes[key]?.trim()) errors.push("Invalid weak-coverage note: " + key);
  }
  const benchmarkIds = new Set((data.agenticBenchmark?.results || []).map((item) => item.candidateId));
  if (benchmarkIds.size !== 4 || data.agenticSkills.filter((item) => item.benchmark).length !== 4) errors.push("Expected four benchmark calibration candidates");
  if (data.agenticSkills.some((item) => Boolean(item.benchmark) !== benchmarkIds.has(item.id))) errors.push("Embedded benchmark linkage mismatch");
  for (const moduleId of moduleIds) {
    const ranks = data.agenticSkills.filter((item) => item.benchmarkTrack?.cohort === "v1-40" && item.primaryModule === moduleId).map((item) => item.featuredRank).sort((a, b) => a - b);
    if (ranks.length > 3 || ranks.some((rank, index) => rank !== index + 1)) errors.push("Invalid Agent Skill ranks for " + moduleId);
    for (const role of data.workbenchRoles || []) {
      const roleRanks = data.agenticSkills.flatMap((item) => item.workbenchAssignments.filter((assignment) => assignment.moduleId === moduleId && assignment.leadRole === role.id).map((assignment) => assignment.rank)).sort((a, b) => a - b);
      if (!roleRanks.length || roleRanks.some((rank, index) => rank !== index + 1)) errors.push(`Invalid ${role.id} workbench ranks for ${moduleId}`);
    }
  }
  if (manifest.embeddedData?.encoding !== "gzip-base64") errors.push("Manifest embedded data encoding mismatch");
  if (manifest.embeddedData?.jsonBytes !== Buffer.byteLength(serialized)) errors.push("Manifest embedded JSON size mismatch");
  if (manifest.embeddedData?.gzipBytes !== Buffer.from(encoded, "base64").length) errors.push("Manifest embedded gzip size mismatch");
  if (manifest.embeddedData?.encodedBytes !== Buffer.byteLength(encoded)) errors.push("Manifest embedded encoded size mismatch");
  if (manifest.embeddedData?.sha256 !== createHash("sha256").update(serialized).digest("hex")) errors.push("Manifest embedded JSON hash mismatch");
  if (!/^[a-f0-9]{64}$/.test(manifest.sourceHashes?.agenticRoleCuration || "") || manifest.sourceHashes.agenticRoleCuration !== data.meta.sourceHashes?.agenticRoleCuration) errors.push("Agent role curation source hash is missing or mismatched");
}

const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if (scripts.length !== 1) errors.push("Expected exactly one inline script");
else {
  try { new Function(scripts[0][1]); }
  catch (error) { errors.push("Embedded JavaScript syntax error: " + error.message); }
}

const csp = "default-src 'none'; base-uri 'none'; form-action 'none'; img-src data:; font-src data:; media-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'";
if (html.indexOf(csp) === -1 || html.indexOf(csp) > html.indexOf("<style>") || html.indexOf(csp) > html.indexOf("<script>")) errors.push("CSP missing or ordered incorrectly");
if (/<script[^>]+src=/i.test(html) || /<link[^>]+stylesheet/i.test(html) || /<(?:img|source)[^>]+src=["']https?:/i.test(html)) errors.push("External runtime resource found");
if (/\/Users\/|file:\/\/\/Users\/|\.codex\/plugins\/cache/i.test(html)) errors.push("Local absolute path leaked");
if (/gh[opusr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(html)) errors.push("Credential-like material found");
for (const id of ["overview-metrics", "node-list", "node-panel", "search", "role-filter", "result-grid", "detail-dialog"]) {
  if (!html.includes('id="' + id + '"')) errors.push("Required UI target missing: " + id);
}
if (!html.includes("function coreTexts(item)")) errors.push("Runtime core-three generator missing");
if (!html.includes('new DecompressionStream("gzip")')) errors.push("Runtime gzip decoder missing");
if (!html.includes("16 次 A/B 校准")) errors.push("Benchmark calibration disclosure missing");
if (!html.includes("本节点能力工作包")) errors.push("Four-role workbench copy missing");

const artifactHash = createHash("sha256").update(html).digest("hex");
if (manifest.artifactSha256 !== artifactHash) errors.push("Manifest SHA-256 does not match artifact");
if (manifest.artifactBytes !== Buffer.byteLength(html)) errors.push("Manifest byte size does not match artifact");
if (existsSync(benchmarkCandidatesPath)) {
  const benchmarkRaw = readFileSync(benchmarkCandidatesPath, "utf8");
  const benchmarkCandidates = JSON.parse(benchmarkRaw);
  if (benchmarkCandidates.candidates?.length !== 40) errors.push("Benchmark candidate plan is not the frozen 40-candidate cohort");
  if (createHash("sha256").update(benchmarkRaw).digest("hex") !== manifest.agenticBenchmark?.suite?.candidatesSha256) errors.push("Benchmark result is not bound to the current frozen candidate plan");
  if (embeddedData) {
    const embeddedCohort = embeddedData.agenticSkills
      .filter((item) => item.benchmarkTrack?.cohort === "v1-40")
      .sort((a, b) => a.benchmarkTrack.order - b.benchmarkTrack.order);
    const candidateFields = ["id", "name", "slug", "primaryModule", "repoFullName", "headSha", "path", "blobSha", "capabilityForm", "effectClass"];
    if (embeddedCohort.length !== benchmarkCandidates.candidates.length) errors.push("Embedded benchmark cohort length does not match frozen candidate plan");
    const rowCount = Math.min(embeddedCohort.length, benchmarkCandidates.candidates.length);
    for (let index = 0; index < rowCount; index += 1) {
      const embedded = embeddedCohort[index];
      const planned = benchmarkCandidates.candidates[index];
      if (embedded.benchmarkTrack.order !== index + 1 || planned.candidateNumber !== "C" + String(index + 1).padStart(2, "0")) {
        errors.push("Benchmark cohort order mismatch at row " + (index + 1));
      }
      for (const field of candidateFields) {
        if ((embedded[field] ?? null) !== (planned[field] ?? null)) errors.push(`Benchmark cohort field mismatch at row ${index + 1}: ${field}`);
      }
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  artifact: htmlPath,
  bytes: Buffer.byteLength(html),
  sha256: artifactHash,
  plugins: manifest.pluginCount,
  skills: manifest.skillCoverage.evidenceRows,
  agenticProjects: manifest.agenticProjectCount,
  agenticSkills: manifest.agenticSkillCount,
  modules: manifest.moduleCount,
}, null, 2));
