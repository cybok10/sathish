#!/usr/bin/env node
/**
 * Validates the tactics content files.
 *
 * Every page in the tactics library is rendered from data, so a missing
 * field is a broken page rather than a cosmetic bug. This checks the
 * shape of every entry and reports what is wrong.
 */
import {
  services,
  tools,
  hardening,
  toolBySlug,
  serviceTags,
  toolsByCategory,
} from "../src/blog/data/tactics.js";

const problems = [];
const fail = (where, message) => problems.push(`${where}: ${message}`);

const RISKS = new Set(["critical", "high", "medium", "low"]);
const SEVERITIES = new Set(["critical", "high", "medium", "low"]);
const CATEGORIES = new Set([
  "recon", "scanning", "exploitation", "post-exploitation", "password", "web",
  "cloud", "network", "forensics", "red-team", "mobile", "api", "wireless",
  "container", "fuzzing", "vulnerability-management",
]);

const seenServiceSlugs = new Set();
const seenToolSlugs = new Set();

for (const service of services) {
  const id = `service "${service.slug || "?"}"`;

  if (!service.slug) fail(id, "missing slug");
  if (seenServiceSlugs.has(service.slug)) fail(id, "duplicate slug");
  seenServiceSlugs.add(service.slug);
  if (!/^[a-z0-9-]+$/.test(service.slug || "")) fail(id, "slug is not kebab-case");
  if (!service.name) fail(id, "missing name");
  if (!RISKS.has(service.risk)) fail(id, `bad risk "${service.risk}"`);
  if (!Array.isArray(service.tags) || service.tags.length < 2) fail(id, "needs 2+ tags");
  if (!service.summary || service.summary.length < 80) fail(id, "summary too short");

  for (const key of ["connect", "recon", "enumeration", "attacks", "postEx", "hardening"]) {
    if (!Array.isArray(service[key]) || service[key].length === 0) {
      fail(id, `"${key}" is empty`);
    }
  }
  for (const key of ["connect", "recon", "enumeration"]) {
    for (const entry of service[key] || []) {
      if (!entry.command) fail(id, `"${key}" entry "${entry.title || entry.label}" has no command`);
      if (!entry.detail) fail(id, `"${key}" entry "${entry.title || entry.label}" has no detail`);
    }
  }
  for (const key of ["attacks", "postEx"]) {
    for (const entry of service[key] || []) {
      if (!SEVERITIES.has(entry.severity)) {
        fail(id, `"${key}" entry "${entry.title}" has bad severity "${entry.severity}"`);
      }
      if (!entry.command) fail(id, `"${key}" entry "${entry.title}" has no command`);
      if (!entry.detection) fail(id, `"${key}" entry "${entry.title}" has no detection`);
      if (!entry.fix) fail(id, `"${key}" entry "${entry.title}" has no fix`);
    }
  }
  if (!Array.isArray(service.commands) || service.commands.length < 4) {
    fail(id, "needs 4+ command reference rows");
  }
  for (const row of service.commands || []) {
    if (!row.command || !row.description) fail(id, "command row missing command/description");
  }
  if (!Array.isArray(service.tools) || service.tools.length === 0) fail(id, "no tools listed");
}

for (const tool of tools) {
  const id = `tool "${tool.slug || "?"}"`;

  if (!tool.slug) fail(id, "missing slug");
  if (seenToolSlugs.has(tool.slug)) fail(id, "duplicate slug");
  seenToolSlugs.add(tool.slug);
  if (!/^[a-z0-9-]+$/.test(tool.slug || "")) fail(id, "slug is not kebab-case");
  if (!tool.name) fail(id, "missing name");
  if (!CATEGORIES.has(tool.category)) fail(id, `bad category "${tool.category}"`);
  if (!tool.summary || tool.summary.length < 80) fail(id, "summary too short");
  if (!Array.isArray(tool.install) || tool.install.length === 0) fail(id, "no install commands");
  if (!Array.isArray(tool.usage) || tool.usage.length < 3) fail(id, "needs 3+ usage entries");
  for (const entry of tool.usage || []) {
    if (!entry.title || !entry.command || !entry.detail) {
      fail(id, `usage entry missing title/command/detail`);
    }
  }
  if (!Array.isArray(tool.useCases) || tool.useCases.length < 3) fail(id, "needs 3+ use cases");
  if (!tool.notes) fail(id, "missing notes");
}

for (const guide of hardening) {
  const id = `hardening "${guide.slug || "?"}"`;
  if (!guide.slug || !guide.title || !guide.summary) fail(id, "missing slug/title/summary");
  if (!Array.isArray(guide.checks) || guide.checks.length < 6) fail(id, "needs 6+ checks");
  for (const check of guide.checks || []) {
    if (!check.title || !check.detail) fail(id, `check "${check.title}" missing title/detail`);
    if (!SEVERITIES.has(check.severity)) fail(id, `check "${check.title}" bad severity`);
    if (!check.command) fail(id, `check "${check.title}" has no verification command`);
  }
}

/* Cross-references: a service pointing at a tool page that does not exist
   would render a broken link. Tools that are commands rather than library
   entries (curl, openssl, ping) are expected and are rendered as plain
   text, so they are counted, not reported. */
let unlinkedMentions = 0;
for (const service of services) {
  for (const slug of service.tools || []) {
    if (!toolBySlug.has(slug)) unlinkedMentions += 1;
  }
}

/* Report */
console.log(`services: ${services.length}`);
console.log(`tools:    ${tools.length}`);
console.log(`hardening:${hardening.length} guides, ${hardening.reduce((n, g) => n + g.checks.length, 0)} checks`);
console.log(`tags:     ${serviceTags.length}`);
console.log(`categories: ${toolsByCategory().map((g) => `${g.id}:${g.tools.length}`).join(" ")}`);
console.log(`command-only tool mentions (rendered as plain text): ${unlinkedMentions}`);

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems.slice(0, 80)) console.error("  -", problem);
  if (problems.length > 80) console.error(`  ...and ${problems.length - 80} more`);
  process.exit(1);
}
console.log("\nAll content files valid.");
