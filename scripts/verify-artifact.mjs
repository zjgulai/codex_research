#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const htmlPath = process.argv[2] || "public/index.html";
const manifestPath = process.argv[3] || "data/build-manifest.json";
const html = readFileSync(htmlPath, "utf8");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const errors = [];
const startToken = "const APP_DATA = ";
const endToken = ";\n    const entityMap";
const start = html.indexOf(startToken);
const end = html.indexOf(endToken, start);

if (start === -1 || end === -1) {
  errors.push("Embedded data boundary not found");
} else {
  const data = JSON.parse(html.slice(start + startToken.length, end));
  if (data.meta.pluginCount !== 4184 || data.plugins.length !== 4184) errors.push("Plugin count is not 4,184");
  if (data.modules.length !== 14) errors.push("Module count is not 14");
  if (data.skills.length !== data.meta.skillCoverage.evidenceRows) errors.push("Skill evidence count mismatch");
  const pluginIds = new Set(data.plugins.map((item) => item.id));
  if (pluginIds.size !== data.plugins.length) errors.push("Duplicate plugin IDs");
  if (new Set(data.skills.map((item) => item.id)).size !== data.skills.length) errors.push("Duplicate Skill evidence IDs");
  const moduleIds = new Set(data.modules.map((item) => item.id));
  for (const item of data.plugins.concat(data.skills)) {
    if (!moduleIds.has(item.primaryModule)) errors.push("Unknown primary module: " + item.id);
    if (!item.description) errors.push("Missing source description: " + item.id);
    if (item.kind === "skill" && !pluginIds.has(item.parentId)) errors.push("Missing Skill parent: " + item.id);
  }
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
for (const id of ["overview-metrics", "node-list", "node-panel", "search", "result-grid", "detail-dialog"]) {
  if (!html.includes('id="' + id + '"')) errors.push("Required UI target missing: " + id);
}
if (!html.includes("function coreTexts(item)")) errors.push("Runtime core-three generator missing");

const artifactHash = createHash("sha256").update(html).digest("hex");
if (manifest.artifactSha256 !== artifactHash) errors.push("Manifest SHA-256 does not match artifact");
if (manifest.artifactBytes !== Buffer.byteLength(html)) errors.push("Manifest byte size does not match artifact");

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
  modules: manifest.moduleCount,
}, null, 2));
