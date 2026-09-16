#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.length ? rest.join("=") : true];
}));
const suitePath = args.suite || "benchmarks/calibration-suite.json";
const candidatesPath = args.candidates || "benchmarks/candidates.json";
const outputDir = resolve(args.output || "benchmarks/.runs/calibration");
const only = args.only ? new Set(String(args.only).split(",").filter(Boolean)) : null;
const concurrency = Math.max(1, Math.min(4, Number(args.concurrency || 2)));
const suiteRaw = readFileSync(suitePath, "utf8");
const suite = JSON.parse(suiteRaw);
const candidatesRaw = readFileSync(candidatesPath, "utf8");
const candidatesData = JSON.parse(candidatesRaw);
const candidates = new Map(candidatesData.candidates.map((item) => [item.slug, item]));
const selectedCases = suite.cases.filter((item) => !only || only.has(item.candidateSlug));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const gitBlobSha = (buffer) => createHash("sha1").update(`blob ${buffer.length}\0`).update(buffer).digest("hex");
const startedAt = new Date().toISOString();

if (!selectedCases.length) throw new Error("No calibration cases selected");
if (!Number.isInteger(suite.replicatesPerArm) || suite.replicatesPerArm < 1) throw new Error("Invalid replicate count");
for (const item of selectedCases) {
  const candidate = candidates.get(item.candidateSlug);
  if (!candidate) throw new Error(`Unknown candidate ${item.candidateSlug}`);
  if (!candidate.path || !candidate.blobSha) throw new Error(`Candidate ${item.candidateSlug} lacks frozen Skill evidence`);
  if (candidate.materialization !== "single-file") throw new Error(`Calibration runner only accepts reviewed single-file Skills: ${item.candidateSlug}`);
}

mkdirSync(outputDir, { recursive: true });
mkdirSync(join(outputDir, "records"), { recursive: true });
mkdirSync(join(outputDir, "finals"), { recursive: true });
const schemaPath = join(outputDir, "answer.schema.json");
writeFileSync(schemaPath, `${JSON.stringify({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  additionalProperties: false,
  required: ["answer"],
  properties: { answer: { type: "string", minLength: 1 } }
}, null, 2)}\n`);

const codexVersion = execFileSync("codex", ["--version"], { encoding: "utf8" }).trim();
const skillCache = new Map();

async function fetchFrozenSkill(candidate) {
  if (skillCache.has(candidate.slug)) return skillCache.get(candidate.slug);
  const url = `https://raw.githubusercontent.com/${candidate.repoFullName}/${candidate.headSha}/${candidate.path}`;
  const response = await fetch(url, { headers: { "User-Agent": "codex-research-benchmark" } });
  if (!response.ok) throw new Error(`Unable to fetch ${candidate.slug}: HTTP ${response.status}`);
  const content = Buffer.from(await response.arrayBuffer());
  const actualBlobSha = gitBlobSha(content);
  if (actualBlobSha !== candidate.blobSha) {
    throw new Error(`Git blob mismatch for ${candidate.slug}: expected ${candidate.blobSha}, got ${actualBlobSha}`);
  }
  const frozen = { content, sourceUrl: url, sha256: sha256(content), blobSha: actualBlobSha };
  skillCache.set(candidate.slug, frozen);
  return frozen;
}

function writeFixture(workspace, item) {
  for (const [path, content] of Object.entries(item.files || {})) {
    const target = join(workspace, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
}

function directoryHash(root) {
  const rows = [];
  function walk(current) {
    for (const name of readdirSync(current).sort()) {
      if (name === ".git") continue;
      const path = join(current, name);
      const item = statSync(path);
      if (item.isDirectory()) walk(path);
      else if (item.isFile()) rows.push(`${relative(root, path)}\0${sha256(readFileSync(path))}`);
    }
  }
  walk(root);
  return sha256(rows.join("\n"));
}

function sanitize(value, workspace) {
  return String(value || "").split(workspace).join("<WORKSPACE>").split(outputDir).join("<RUN_DIR>");
}

function collectStrings(value, keys, out = []) {
  if (!value || typeof value !== "object") return out;
  for (const [key, child] of Object.entries(value)) {
    if (keys.has(key) && typeof child === "string") out.push(child);
    if (child && typeof child === "object") collectStrings(child, keys, out);
  }
  return out;
}

function runCodex(argv, prompt, workspace, timeoutMs = 300000) {
  return new Promise((resolve) => {
    const child = spawn("codex", argv.concat(prompt), {
      cwd: workspace,
      env: process.env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const maxBytes = 20 * 1024 * 1024;
    child.stdout.on("data", (chunk) => { if (stdout.length < maxBytes) stdout += chunk; });
    child.stderr.on("data", (chunk) => { if (stderr.length < maxBytes) stderr += chunk; });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 2000).unref();
    }, timeoutMs);
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, timedOut, stdout, stderr });
    });
  });
}

async function execute(run) {
  const item = run.case;
  const candidate = candidates.get(item.candidateSlug);
  const frozen = await fetchFrozenSkill(candidate);
  const workspace = mkdtempSync(join(tmpdir(), "opc-skill-bench-"));
  const runId = `${item.caseId}-${run.arm}-r${run.replicate}`;
  const finalPath = join(outputDir, "finals", `${runId}.json`);
  let cleanupSucceeded = false;
  try {
    execFileSync("git", ["init", "-q", workspace]);
    writeFixture(workspace, item);
    if (run.arm === "skill") {
      const skillPath = join(workspace, ".agents", "skills", candidate.slug, "SKILL.md");
      mkdirSync(dirname(skillPath), { recursive: true });
      writeFileSync(skillPath, frozen.content);
    }
    const workspaceBeforeHash = directoryHash(workspace);
    const prompt = [
      run.arm === "skill" ? `$${candidate.slug}` : null,
      "You are in a controlled benchmark. Follow the user task exactly.",
      run.arm === "skill" ? `Before doing the task, read .agents/skills/${candidate.slug}/SKILL.md completely and follow it. This run measures the method, not automatic trigger recall.` : null,
      "Use only files in this workspace. Do not use network access, do not edit files, and do not infer facts that are absent.",
      "Return JSON matching the supplied schema. Put the complete deliverable in the answer field. Do not mention the benchmark or the scoring rules.",
      item.prompt
    ].filter(Boolean).join("\n\n");
    const argv = [
      "exec",
      "--ephemeral",
      "--ignore-user-config",
      "--ignore-rules",
      "--skip-git-repo-check",
      "--sandbox", "read-only",
      "-m", suite.model,
      "-c", `model_reasoning_effort=\"${suite.reasoningEffort}\"`,
      "-c", "approval_policy=\"never\"",
      "-c", "web_search=\"disabled\"",
      "-c", "skills.include_instructions=false",
      "-c", "skills.bundled.enabled=false",
      "-c", "memories.use_memories=false",
      "-c", "memories.generate_memories=false",
      "-C", workspace,
      "--output-schema", schemaPath,
      "--json",
      "--output-last-message", finalPath,
      "--color", "never"
    ];
    const runStartedAt = new Date().toISOString();
    const clock = Date.now();
    const result = await runCodex(argv, prompt, workspace);
    const durationMs = Date.now() - clock;
    const events = result.stdout.split(/\r?\n/).filter(Boolean).flatMap((line) => {
      try { return [JSON.parse(line)]; } catch { return []; }
    });
    const eventTypes = events.map((event) => event.type).filter(Boolean);
    const skillNames = [...new Set(events.flatMap((event) => collectStrings(event, new Set(["skill_name", "skillName"])) ))];
    const commands = events.flatMap((event) => {
      if (event?.item?.type !== "command_execution") return [];
      return [{
        command: sanitize(event.item.command, workspace),
        status: event.item.status || null,
        exitCode: event.item.exit_code ?? null
      }];
    });
    const skillReadObserved = commands.some((entry) => entry.command.includes(`.agents/skills/${candidate.slug}/SKILL.md`));
    let finalRaw = existsSync(finalPath) ? readFileSync(finalPath, "utf8") : "";
    if (!finalRaw) {
      const messages = events.filter((event) => event?.item?.type === "agent_message").map((event) => event.item.text).filter(Boolean);
      finalRaw = messages.at(-1) || "";
    }
    let finalParsed = null;
    let answer = "";
    try {
      finalParsed = JSON.parse(finalRaw);
      answer = typeof finalParsed?.answer === "string" ? finalParsed.answer : "";
    } catch {}
    const workspaceAfterHash = directoryHash(workspace);
    const usageEvent = [...events].reverse().find((event) => event.usage)?.usage || null;
    const record = {
      schemaVersion: "agent-skill-calibration-run.v1",
      runId,
      suiteId: suite.suiteId,
      suiteSha256: sha256(suiteRaw),
      candidatesSha256: sha256(candidatesRaw),
      caseId: item.caseId,
      candidateId: candidate.id,
      candidateNumber: candidate.candidateNumber,
      candidateSlug: candidate.slug,
      candidateCommit: candidate.headSha,
      skillPath: candidate.path,
      expectedSkillBlobSha: candidate.blobSha,
      actualSkillBlobSha: frozen.blobSha,
      skillContentSha256: frozen.sha256,
      skillBlobVerified: frozen.blobSha === candidate.blobSha,
      arm: run.arm,
      replicate: run.replicate,
      model: suite.model,
      reasoningEffort: suite.reasoningEffort,
      codexVersion,
      sandboxPolicy: suite.sandboxPolicy,
      networkMode: "disabled",
      startedAt: runStartedAt,
      durationMs,
      exitCode: result.code,
      signal: result.signal,
      timedOut: result.timedOut,
      workspaceBeforeHash,
      workspaceAfterHash,
      workspaceUnchanged: workspaceBeforeHash === workspaceAfterHash,
      eventTypes,
      observedSkillNames: skillNames,
      skillReadObserved,
      skillInvocationObserved: run.arm === "skill" && (skillNames.includes(candidate.slug) || skillReadObserved),
      commands,
      usage: usageEvent,
      finalOutputSha256: sha256(finalRaw),
      finalParsed: Boolean(finalParsed && answer),
      answer,
      stderr: sanitize(result.stderr, workspace).slice(0, 4000)
    };
    writeFileSync(join(outputDir, "records", `${runId}.json`), `${JSON.stringify(record, null, 2)}\n`);
    console.log(`${runId}\texit=${record.exitCode}\tparsed=${record.finalParsed}\tunchanged=${record.workspaceUnchanged}\tskill=${record.skillInvocationObserved}`);
    return record;
  } finally {
    rmSync(workspace, { recursive: true, force: true });
    cleanupSucceeded = !existsSync(workspace);
    if (!cleanupSucceeded) console.error(`Cleanup failed for ${runId}`);
  }
}

const queue = [];
for (const item of selectedCases) {
  for (let replicate = 1; replicate <= suite.replicatesPerArm; replicate += 1) {
    const arms = replicate % 2 ? ["baseline", "skill"] : ["skill", "baseline"];
    for (const arm of arms) queue.push({ case: item, arm, replicate });
  }
}

const results = [];
let cursor = 0;
async function worker() {
  while (cursor < queue.length) {
    const index = cursor;
    cursor += 1;
    results[index] = await execute(queue[index]);
  }
}
await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, () => worker()));

const manifest = {
  schemaVersion: "agent-skill-calibration-manifest.v1",
  suiteId: suite.suiteId,
  suiteSha256: sha256(suiteRaw),
  candidatesSha256: sha256(candidatesRaw),
  startedAt,
  completedAt: new Date().toISOString(),
  codexVersion,
  model: suite.model,
  reasoningEffort: suite.reasoningEffort,
  sandboxPolicy: suite.sandboxPolicy,
  requestedRuns: queue.length,
  completedRuns: results.length,
  successfulRuns: results.filter((item) => item.exitCode === 0 && item.finalParsed).length,
  skillInvocationsObserved: results.filter((item) => item.arm === "skill" && item.skillInvocationObserved).length,
  workspacesUnchanged: results.filter((item) => item.workspaceUnchanged).length,
  resultIds: results.map((item) => item.runId)
};
writeFileSync(join(outputDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest, null, 2));
