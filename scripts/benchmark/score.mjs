#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const runDir = process.argv[2] || "benchmarks/.runs/calibration";
const suitePath = process.argv[3] || "benchmarks/calibration-suite.json";
const candidatesPath = process.argv[4] || "benchmarks/candidates.json";
const outputPath = process.argv[5] || "data/agentic-benchmark-results.json";
const suiteRaw = readFileSync(suitePath, "utf8");
const suite = JSON.parse(suiteRaw);
const candidatesRaw = readFileSync(candidatesPath, "utf8");
const candidates = JSON.parse(candidatesRaw);
const protocolRaw = readFileSync("benchmarks/protocol.json", "utf8");
const manifest = JSON.parse(readFileSync(join(runDir, "manifest.json"), "utf8"));
const records = readdirSync(join(runDir, "records")).filter((name) => name.endsWith(".json")).sort().map((name) => JSON.parse(readFileSync(join(runDir, "records", name), "utf8")));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const normalize = (value) => String(value || "").toLowerCase().replace(/\s+/g, " ");
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

function evaluateAssertion(answer, assertion) {
  const text = normalize(answer);
  if (assertion.type === "forbidden-regex") {
    const expression = new RegExp(assertion.pattern.replace(/^\(\?i\)/, ""), assertion.pattern.startsWith("(?i)") ? "i" : "");
    return { passed: !expression.test(answer), evidence: expression.test(answer) ? "forbidden pattern matched" : "forbidden pattern absent" };
  }
  if (assertion.type !== "terms") throw new Error(`Unknown assertion type ${assertion.type}`);
  const all = (assertion.all || []).map(normalize);
  const any = (assertion.any || []).map(normalize);
  const missingAll = all.filter((term) => !text.includes(term));
  const anyMatched = !any.length || any.some((term) => text.includes(term));
  return {
    passed: missingAll.length === 0 && anyMatched,
    evidence: missingAll.length ? `missing required terms: ${missingAll.join(", ")}` : anyMatched ? "term condition met" : `none matched: ${any.join(", ")}`
  };
}

const caseById = new Map(suite.cases.map((item) => [item.caseId, item]));
if (manifest.suiteSha256 !== sha256(suiteRaw)) throw new Error("Suite changed after execution");
if (manifest.candidatesSha256 !== sha256(candidatesRaw)) throw new Error("Candidate plan changed after execution");
if (records.some((record) => record.suiteSha256 !== manifest.suiteSha256 || record.candidatesSha256 !== manifest.candidatesSha256)) {
  throw new Error("Run record provenance does not match the execution manifest");
}
const scoredRuns = records.map((record) => {
  const item = caseById.get(record.caseId);
  if (!item) throw new Error(`Run references unknown case ${record.caseId}`);
  const assertions = item.assertions.map((assertion) => ({ ...assertion, ...evaluateAssertion(record.answer, assertion) }));
  const deterministicScore = assertions.filter((assertion) => assertion.passed).reduce((sum, assertion) => sum + assertion.weight, 0);
  const infrastructurePass = record.exitCode === 0 && record.finalParsed && record.workspaceUnchanged && record.skillBlobVerified;
  const invocationPass = record.arm === "baseline" || record.skillInvocationObserved;
  return {
    runId: record.runId,
    caseId: record.caseId,
    candidateSlug: record.candidateSlug,
    arm: record.arm,
    replicate: record.replicate,
    deterministicScore,
    infrastructurePass,
    invocationPass,
    passed: infrastructurePass && invocationPass && deterministicScore >= 75,
    assertions,
    durationMs: record.durationMs,
    finalOutputSha256: record.finalOutputSha256
  };
});

const expectedRunCount = suite.cases.length * suite.replicatesPerArm * 2;
if (scoredRuns.length !== expectedRunCount) throw new Error(`Expected ${expectedRunCount} runs, got ${scoredRuns.length}`);

const results = suite.cases.map((item) => {
  const candidate = candidates.candidates.find((entry) => entry.slug === item.candidateSlug);
  const rows = scoredRuns.filter((entry) => entry.caseId === item.caseId);
  const baseline = rows.filter((entry) => entry.arm === "baseline");
  const skill = rows.filter((entry) => entry.arm === "skill");
  const baselineMedian = median(baseline.map((entry) => entry.deterministicScore));
  const skillMedian = median(skill.map((entry) => entry.deterministicScore));
  return {
    candidateId: candidate.id,
    candidateNumber: candidate.candidateNumber,
    candidateSlug: candidate.slug,
    candidateName: candidate.name,
    primaryModule: candidate.primaryModule,
    caseId: item.caseId,
    benchmarkState: "calibration-only",
    baselineScores: baseline.map((entry) => entry.deterministicScore),
    skillScores: skill.map((entry) => entry.deterministicScore),
    baselineMedian,
    skillMedian,
    deterministicDelta: skillMedian - baselineMedian,
    skillPassRate: skill.filter((entry) => entry.passed).length / skill.length,
    infrastructurePass: rows.every((entry) => entry.infrastructurePass),
    invocationObserved: skill.every((entry) => entry.invocationPass),
    hardGatePass: rows.every((entry) => entry.infrastructurePass && entry.invocationPass),
    failedAssertions: [...new Set(skill.flatMap((entry) => entry.assertions.filter((assertion) => !assertion.passed).map((assertion) => assertion.id)))],
    diagnosticFlags: [
      Math.max(...skill.map((entry) => entry.deterministicScore)) - Math.min(...skill.map((entry) => entry.deterministicScore)) >= 20 ? "high-replicate-variance" : null,
      baselineMedian >= 95 && skillMedian >= 95 ? "ceiling-saturation" : null
    ].filter(Boolean),
    scoreUsableForRanking: false,
    runIds: rows.map((entry) => entry.runId)
  };
});

const output = {
  schemaVersion: "agent-skill-benchmark-results.v1",
  generatedAt: manifest.completedAt,
  suite: {
    id: suite.suiteId,
    status: "harness-calibration-only",
    suiteSha256: sha256(suiteRaw),
    protocolSha256: sha256(protocolRaw),
    candidatesSha256: sha256(candidatesRaw),
    model: manifest.model,
    reasoningEffort: manifest.reasoningEffort,
    codexVersion: manifest.codexVersion,
    sandboxPolicy: manifest.sandboxPolicy,
    fixtureCountPerCandidate: 1,
    replicatesPerArm: suite.replicatesPerArm,
    semanticJudge: "not-run",
    promotionAllowed: false,
    executorQualification: "passed",
    scorerQualification: "failed-needs-v2"
  },
  coverage: {
    plannedCandidateCount: candidates.coverage.candidateCount,
    firstWaveCandidateCount: candidates.coverage.firstWaveCount,
    calibrationCandidateCount: results.length,
    completedRuns: scoredRuns.length,
    baselineRuns: scoredRuns.filter((item) => item.arm === "baseline").length,
    skillRuns: scoredRuns.filter((item) => item.arm === "skill").length,
    isolatedMaterialized: results.filter((item) => item.hardGatePass).length,
    isolatedInstalled: 0,
    smokeTested: 0,
    taskBenchmarked: 0,
    promotedToDefault: 0
  },
  calibrationReview: {
    executor: "All 16 runs completed, all eight Skill arms read the frozen SKILL.md, baseline arms did not, and all workspaces were unchanged.",
    scorer: "Not qualified. The term matcher was sensitive to language and numeric variants, two candidates showed high replicate variance, and one fixture saturated at 100 in both arms.",
    network: "Web search was disabled and no network command was observed; OS-level egress denial was not independently proven.",
    nextAction: "Freeze a v2 multilingual semantic assertion format, add adversarial fixtures, calibrate an independent blind judge, then rerun the 12-candidate first wave."
  },
  boundary: "One deterministic calibration fixture per candidate is insufficient for ranking or promotion. Delta values are diagnostic only and must not be used to rank candidates.",
  results,
  runs: scoredRuns
};

writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ coverage: output.coverage, results: output.results }, null, 2));
