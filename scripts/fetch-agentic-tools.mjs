#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const parts = arg.replace(/^--/, "").split("=");
  return [parts.shift(), parts.length ? parts.join("=") : true];
}));
const listUrl = args["list-url"] || "https://github.com/stars/zjgulai/lists/agentic-tools";
const outputPath = args.output || "data/agentic-tools-source.json";
const concurrency = Math.max(1, Math.min(8, Number(args.concurrency || 4)));
const token = process.env.GITHUB_TOKEN || execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim();
const apiHeaders = {
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${token}`,
  "User-Agent": "codex-research-agentic-tools-audit",
  "X-GitHub-Api-Version": "2022-11-28",
};

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const unique = (values) => [...new Set(values.filter(Boolean))];
const permalink = (fullName, commitSha, path) => `https://github.com/${fullName}/blob/${commitSha}/${path.split("/").map(encodeURIComponent).join("/")}`;

async function fetchWithRetry(url, options = {}, allowed = []) {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (response.ok || allowed.includes(response.status)) return response;
      const body = (await response.text()).slice(0, 500);
      throw new Error(`${response.status} ${response.statusText}: ${body}`);
    } catch (error) {
      lastError = error;
      if (attempt < 4) await sleep(350 * attempt);
    }
  }
  throw lastError;
}

async function githubJson(path, allowed = []) {
  const response = await fetchWithRetry(`https://api.github.com${path}`, { headers: apiHeaders }, allowed);
  if (allowed.includes(response.status) && !response.ok) return null;
  return response.json();
}

async function captureMembership() {
  const members = [];
  let declaredCount = null;
  for (let page = 1; page <= 10; page += 1) {
    const separator = listUrl.includes("?") ? "&" : "?";
    const response = await fetchWithRetry(`${listUrl}${separator}page=${page}`, { headers: { "User-Agent": apiHeaders["User-Agent"] } });
    const html = await response.text();
    if (declaredCount === null) {
      const countMatch = html.match(/([\d,]+) repositories/);
      if (countMatch) declaredCount = Number(countMatch[1].replace(/,/g, ""));
    }
    const pageMembers = [];
    const pattern = /<h2 class="h3">\s*<a href="\/([^"/?#]+\/[^"/?#]+)">/g;
    let match;
    while ((match = pattern.exec(html))) pageMembers.push(match[1]);
    for (const fullName of pageMembers) if (!members.includes(fullName)) members.push(fullName);
    if (!pageMembers.length || (declaredCount !== null && members.length >= declaredCount)) break;
  }
  if (!members.length) throw new Error("No repositories found on the GitHub stars list");
  if (declaredCount !== null && members.length !== declaredCount) {
    throw new Error(`List declared ${declaredCount} repositories but capture found ${members.length}`);
  }
  return { declaredCount: declaredCount ?? members.length, members, sha256: sha256(members.join("\n") + "\n") };
}

function readmeSignals(text) {
  const source = String(text || "");
  const lower = source.toLowerCase();
  const has = (pattern) => pattern.test(lower);
  return {
    bytes: Buffer.byteLength(source),
    headingCount: (source.match(/^#{1,6}\s+/gm) || []).length,
    codeFenceCount: Math.floor((source.match(/```/g) || []).length / 2),
    install: has(/\b(install|installation|setup|quick\s*start|getting started)\b/),
    usage: has(/\b(usage|example|examples|how to use)\b|使用方法|用法/),
    documentation: has(/\b(documentation|docs)\b|文档/),
    tests: has(/\b(test|tests|testing|pytest|vitest|jest)\b/),
    security: has(/\b(security|threat model|permissions?)\b|安全|权限/),
    license: has(/\blicen[cs]e\b|许可证|开源协议/),
    codex: has(/\bcodex\b/),
    claude: has(/\bclaude(?: code)?\b/),
    cursor: has(/\bcursor\b/),
    openclaw: has(/\bopenclaw\b/),
    agentSkill: has(/\bagent skill(?:s)?\b|\bskill\.md\b/),
    mcp: has(/\bmcp\b|model context protocol/),
    cli: has(/\bcli\b|command[- ]line/),
    api: has(/\bapi\b/),
    docker: has(/\bdocker\b|docker compose/),
    selfHosted: has(/self[- ]host/),
    warning: has(/\b(alpha|beta|experimental|warning|caution|deprecated)\b|实验性|警告|弃用/),
  };
}

function fileEvidence(tree, fullName, commitSha) {
  const blobs = (tree && tree.tree ? tree.tree : []).filter((entry) => entry.type === "blob");
  const skillEntries = blobs.filter((entry) => /(^|\/)SKILL\.md$/i.test(entry.path));
  const likelyFixture = (entry) => /(^|\/)(tests?|fixtures?|examples?|samples?|demos?|vendor|node_modules|dist|build)(\/|$)/i.test(entry.path);
  const candidateSkillEntries = skillEntries.filter((entry) => !likelyFixture(entry));
  const uniqueByBlob = (entries) => {
    const seen = new Set();
    return entries.filter((entry) => {
      if (seen.has(entry.sha)) return false;
      seen.add(entry.sha);
      return true;
    });
  };
  const workflows = blobs.filter((entry) => entry.path.startsWith(".github/workflows/") && /\.ya?ml$/i.test(entry.path));
  const tests = blobs.filter((entry) => /(^|\/)(tests?|__tests__)(\/|$)|(^|\/)(test|spec)\.[^/]+$/i.test(entry.path));
  const installDocs = blobs.filter((entry) => /(^|\/)(install(?:ation)?|setup|quickstart|getting-started)(\.[^/]+|\/|$)/i.test(entry.path));
  const security = blobs.filter((entry) => /(^|\/)(SECURITY\.md|CODEOWNERS|dependabot\.ya?ml)$/i.test(entry.path));
  const licenses = blobs.filter((entry) => /(^|\/)(LICENSE|LICENCE|COPYING)(\.[^/]+)?$/i.test(entry.path));
  const instructions = blobs.filter((entry) => /(^|\/)(AGENTS|CLAUDE|GEMINI)\.md$/i.test(entry.path));
  const manifests = blobs.filter((entry) => /(^|\/)(package\.json|pyproject\.toml|Cargo\.toml|go\.mod|requirements[^/]*\.txt|plugin\.json|marketplace\.json|\.mcp\.json|mcp\.json)$/i.test(entry.path));
  const compact = (entry) => ({
    path: entry.path,
    blobSha: entry.sha,
    url: permalink(fullName, commitSha, entry.path),
  });
  return {
    treeTruncated: Boolean(tree && tree.truncated),
    blobCount: blobs.length,
    skillCount: skillEntries.length,
    skillUniqueBlobCount: uniqueByBlob(skillEntries).length,
    skillLikelyFixtureCount: skillEntries.filter(likelyFixture).length,
    skillCandidateCount: candidateSkillEntries.length,
    skillCandidateUniqueBlobCount: uniqueByBlob(candidateSkillEntries).length,
    skillFiles: uniqueByBlob(candidateSkillEntries).map(compact),
    workflowCount: workflows.length,
    workflowFiles: workflows.slice(0, 8).map(compact),
    testPathCount: tests.length,
    testFiles: tests.slice(0, 8).map(compact),
    installDocCount: installDocs.length,
    installDocs: installDocs.slice(0, 8).map(compact),
    securityFileCount: security.length,
    securityFiles: security.slice(0, 8).map(compact),
    licenseFileCount: licenses.length,
    licenseFiles: licenses.slice(0, 20).map(compact),
    agentInstructionFileCount: instructions.length,
    agentInstructionFiles: instructions.slice(0, 12).map(compact),
    manifestCount: manifests.length,
    manifests: manifests.slice(0, 12).map(compact),
  };
}

function parseSkillFrontmatter(text) {
  const match = String(text || "").match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { valid: false, hasName: false, hasDescription: false };
  const hasName = /^name:\s*\S+/m.test(match[1]);
  const hasDescription = /^description:\s*(?:\S|[>|]-?\s*$)/m.test(match[1]);
  return { valid: hasName && hasDescription, hasName, hasDescription };
}

async function contentAt(fullName, commitSha, path) {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const item = await githubJson(`/repos/${fullName}/contents/${encodedPath}?ref=${encodeURIComponent(commitSha)}`);
  if (!item || item.type !== "file" || item.encoding !== "base64") return "";
  return Buffer.from(String(item.content || "").replace(/\n/g, ""), "base64").toString("utf8");
}

async function auditRepository(fullName, listPosition) {
  const repo = await githubJson(`/repos/${fullName}`);
  const branch = repo.default_branch
    ? await githubJson(`/repos/${fullName}/branches/${encodeURIComponent(repo.default_branch)}`, [404, 409])
    : null;
  const commitSha = branch && branch.commit ? branch.commit.sha : null;
  const [tree, readmeInfo, latestRelease] = await Promise.all([
    commitSha ? githubJson(`/repos/${fullName}/git/trees/${commitSha}?recursive=1`) : null,
    commitSha ? githubJson(`/repos/${fullName}/readme?ref=${commitSha}`, [404]) : null,
    githubJson(`/repos/${fullName}/releases/latest`, [404]),
  ]);
  const files = fileEvidence(tree, fullName, commitSha);
  let readme = "";
  if (readmeInfo && readmeInfo.type === "file" && readmeInfo.encoding === "base64") {
    readme = Buffer.from(String(readmeInfo.content || "").replace(/\n/g, ""), "base64").toString("utf8");
  }
  const sampledSkills = [];
  for (const item of files.skillFiles.slice(0, 5)) {
    const contents = await contentAt(fullName, commitSha, item.path);
    sampledSkills.push({ ...item, ...parseSkillFrontmatter(contents), bytes: Buffer.byteLength(contents) });
  }
  return {
    listPosition,
    fullName: repo.full_name,
    ownerType: repo.owner && repo.owner.type,
    url: repo.html_url,
    description: repo.description || "",
    homepage: repo.homepage || "",
    topics: repo.topics || [],
    language: repo.language || null,
    license: repo.license ? { key: repo.license.key, name: repo.license.name, spdxId: repo.license.spdx_id } : null,
    visibility: repo.visibility,
    archived: Boolean(repo.archived),
    disabled: Boolean(repo.disabled),
    fork: Boolean(repo.fork),
    parent: repo.parent ? repo.parent.full_name : null,
    isTemplate: Boolean(repo.is_template),
    createdAt: repo.created_at,
    pushedAt: repo.pushed_at,
    updatedAt: repo.updated_at,
    defaultBranch: repo.default_branch,
    headSha: commitSha,
    headCommittedAt: branch && branch.commit && branch.commit.commit && branch.commit.commit.committer
      ? branch.commit.commit.committer.date
      : null,
    emptyRepository: !commitSha,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    subscribers: repo.subscribers_count,
    openIssues: repo.open_issues_count,
    sizeKb: repo.size,
    hasIssues: Boolean(repo.has_issues),
    hasDiscussions: Boolean(repo.has_discussions),
    latestRelease: latestRelease ? {
      tag: latestRelease.tag_name,
      publishedAt: latestRelease.published_at,
      prerelease: Boolean(latestRelease.prerelease),
      draft: Boolean(latestRelease.draft),
      url: latestRelease.html_url,
    } : null,
    readme: readmeInfo ? {
      path: readmeInfo.path,
      blobSha: readmeInfo.sha,
      url: permalink(repo.full_name, commitSha, readmeInfo.path),
      ...readmeSignals(readme),
    } : null,
    files,
    sampledSkills,
  };
}

async function mapConcurrent(values, limit, mapper) {
  const results = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(values[index], index);
      process.stderr.write(`[${index + 1}/${values.length}] ${values[index]}\n`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return results;
}

const captureStartedAt = new Date().toISOString();
const before = await captureMembership();
const repositories = await mapConcurrent(before.members, concurrency, (fullName, index) => auditRepository(fullName, index + 1));
const after = await captureMembership();
if (before.sha256 !== after.sha256) throw new Error("GitHub stars list changed during capture; retry for a stable snapshot");

const output = {
  schemaVersion: 1,
  sourceType: "github-stars-list",
  listUrl,
  captureStartedAt,
  capturedAt: new Date().toISOString(),
  captureMethod: "public list HTML membership + authenticated GitHub REST repository evidence",
  declaredCount: before.declaredCount,
  membershipSha256: before.sha256,
  members: before.members,
  repositories,
  evidenceBoundary: [
    "Repository metadata and files are frozen to each recorded HEAD SHA.",
    "README claims are publisher claims, not runtime verification.",
    "SKILL.md presence and sampled front matter do not prove Codex compatibility or safe execution.",
    "No repository code was installed or executed during this capture.",
  ],
};

if (unique(repositories.map((repo) => repo.fullName)).length !== before.members.length) throw new Error("Repository identities are not unique");
if (repositories.some((repo, index) => repo.fullName.toLowerCase() !== before.members[index].toLowerCase())) throw new Error("Repository order drifted during capture");
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n");
console.log(JSON.stringify({
  output: outputPath,
  repositories: repositories.length,
  membershipSha256: before.sha256,
  directSkillStructure: repositories.filter((repo) => repo.files.skillCount > 0).length,
  archived: repositories.filter((repo) => repo.archived).length,
  missingLicense: repositories.filter((repo) => !repo.license || ["NOASSERTION", "OTHER"].includes(repo.license.spdxId)).length,
}, null, 2));
