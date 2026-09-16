#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const inputPath = process.argv[2] || "data/agentic-tools-evaluations.json";
const outputPath = process.argv[3] || "benchmarks/candidates.json";
const raw = readFileSync(inputPath, "utf8");
const source = JSON.parse(raw);

const matrix = {
  "grill-with-docs": ["B1", "R1", "multi-turn", "skill-chain", false],
  "explore-unknowns": ["B0", "R0", "instruction", "skill-directory", true],
  "gbrain-context-audit": ["B2", "R2", "package-runtime", "package", false],
  "engineering-charter": ["S0", "R0", "wrapper-required", "wrapper", false],
  portless: ["B5", "R3", "vm", "skill-plus-package", false],
  last30days: ["B3", "R3", "replay-live", "skill-directory", false],
  requesthunt: ["B3", "R2", "replay-live", "skill-plus-package", false],
  "scientific-literature-review": ["B3", "R2", "replay-live", "skill-directory", false],
  "interview-script": ["B0", "R0", "instruction", "single-file", false],
  "summarize-interview": ["B0", "R0", "instruction", "single-file", true],
  "customer-journey-map": ["B0", "R0", "instruction", "single-file", false],
  "strategy-red-team": ["B0", "R0", "instruction", "single-file", true, true],
  "pre-mortem": ["B0", "R0", "instruction", "single-file", false],
  "to-spec": ["B0", "R0", "instruction", "skill-plus-integration", true],
  "write-spec": ["B0", "R0", "instruction", "skill-chain", false],
  "domain-modeling": ["B0", "R0", "instruction", "skill-directory", false],
  "test-scenarios": ["B0", "R0", "instruction", "single-file", true, true],
  prototype: ["B1", "R1", "local-workspace", "skill-directory", false],
  "huashu-design": ["B2", "R1", "package-runtime", "repository-package", false],
  "anthropic-frontend-design": ["B1", "R1", "local-workspace", "skill-directory", false],
  "codebase-design": ["B0", "R0", "instruction", "skill-directory", true],
  "to-tickets": ["B0", "R0", "instruction", "skill-plus-integration", false],
  "audit-choices": ["B0", "R0", "instruction", "skill-chain", true],
  tdd: ["B1", "R1", "local-workspace", "skill-chain", false],
  implement: ["B1", "R1", "local-workspace", "skill-chain", false],
  "write-tests": ["B1", "R1", "local-workspace", "single-file", false],
  "code-review": ["B1", "R1", "local-workspace", "skill-plus-integration", true],
  "browser-harness": ["B2", "R2", "package-runtime", "skill-plus-package", false],
  "compare-screenshots": ["B0", "R0", "instruction-visual", "skill-directory", true],
  "shipping-artifacts": ["B0", "R0", "instruction", "single-file", true, true],
  "insforge-backend": ["B4", "R4", "external-sandbox", "repository-package", false],
  "data-quality-check": ["B2", "R1", "package-runtime", "repository-package", false],
  "metrics-dashboard": ["B0", "R0", "instruction", "single-file", true, true],
  "trend-monitor": ["S0", "R2", "wrapper-required", "wrapper", false],
  "experiment-analysis": ["B2", "R1", "package-runtime", "repository-package", false],
  "ab-test-analysis": ["B0", "R0", "instruction", "single-file", false],
  "seo-geo": ["B3", "R3", "replay-live", "skill-directory", false],
  "oil-skill-creator": ["B2", "R1", "package-runtime", "skill-directory", false],
  "anthropic-skill-creator": ["B1", "R1", "agent-eval", "skill-directory", false],
  "delivery-retro": ["B0", "R0", "instruction", "single-file", true]
};

const batchMeaning = {
  B0: "Pure instruction task with read-only inputs and no third-party runtime.",
  B1: "Isolated local workspace; may create files or run the target project's tests.",
  B2: "Candidate-owned CLI, package, scripts, browser, or local service required.",
  B3: "Network read path; offline replay must precede any live check.",
  B4: "Account or credential plus external sandbox write required.",
  B5: "System trust, privileged ports, or production-adjacent effects; VM and explicit authorization required.",
  S0: "Not a runnable Skill yet; a separately reviewed wrapper must be created first."
};

const candidates = source.curatedSkills.map((item, index) => {
  const entry = matrix[item.slug];
  if (!entry) throw new Error(`Missing benchmark matrix entry for ${item.slug}`);
  const [batch, risk, testMode, materialization, firstWave, calibrationSelected = false] = entry;
  return {
    candidateNumber: `C${String(index + 1).padStart(2, "0")}`,
    id: item.id,
    name: item.name,
    slug: item.slug,
    primaryModule: item.primaryModule,
    repoFullName: item.repoFullName,
    headSha: item.headSha,
    path: item.path || null,
    blobSha: item.blobSha || null,
    capabilityForm: item.capabilityForm,
    effectClass: item.effectClass,
    staticVerificationState: item.verificationState,
    batch,
    batchMeaning: batchMeaning[batch],
    risk,
    testMode,
    materialization,
    firstWave: Boolean(firstWave),
    calibrationSelected: Boolean(calibrationSelected),
    runtimeStatus: batch === "S0" ? "blocked-wrapper-required" : "not-run"
  };
});

if (candidates.length !== 40) throw new Error(`Expected 40 candidates, got ${candidates.length}`);
if (Object.keys(matrix).length !== candidates.length) throw new Error("Matrix contains an unused or duplicate entry");
const countBy = (key) => Object.fromEntries([...new Set(candidates.map((item) => item[key]))].sort().map((value) => [value, candidates.filter((item) => item[key] === value).length]));
const output = {
  schemaVersion: "agent-skill-benchmark-candidates.v1",
  generatedFrom: {
    path: inputPath,
    sha256: createHash("sha256").update(raw).digest("hex"),
    evaluatedAt: source.evaluatedAt
  },
  coverage: {
    candidateCount: candidates.length,
    firstWaveCount: candidates.filter((item) => item.firstWave).length,
    calibrationCount: candidates.filter((item) => item.calibrationSelected).length,
    byBatch: countBy("batch"),
    byRisk: countBy("risk"),
    byMaterialization: countBy("materialization")
  },
  evidenceBoundary: "This matrix is a pre-registered execution plan. It does not claim installation, smoke-test, task benchmark, or production readiness.",
  candidates
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output.coverage, null, 2));
