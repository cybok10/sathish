/**
 * Tactics content aggregator.
 *
 * The page data lives in several files so it stays reviewable in pieces.
 * This module stitches them together and exposes the lookups the pages
 * need. Everything here is static content — no network calls.
 */
import { services as servicesA } from "./services-01.js";
import { services as servicesB } from "./services-02.js";
import { services as servicesC } from "./services-03.js";
import { services as servicesD } from "./services-04.js";
import { tools as toolsA } from "./tools-01.js";
import { tools as toolsB } from "./tools-02.js";
import { hardening } from "./hardening.js";

export const services = [...servicesA, ...servicesB, ...servicesC, ...servicesD].sort(
  (a, b) => a.name.localeCompare(b.name)
);

export const tools = [...toolsA, ...toolsB].sort((a, b) => a.name.localeCompare(b.name));

export { hardening };

export const serviceBySlug = new Map(services.map((item) => [item.slug, item]));
export const toolBySlug = new Map(tools.map((item) => [item.slug, item]));
export const hardeningBySlug = new Map(hardening.map((item) => [item.slug, item]));

/** Every distinct tag across the service pages, with a count. */
export const serviceTags = (() => {
  const counts = new Map();
  for (const service of services) {
    for (const tag of service.tags || []) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag, count]) => ({ tag, count }));
})();

/** Tool categories with their tools, in a stable display order. */
export const TOOL_CATEGORIES = [
  { id: "recon", label: "Reconnaissance" },
  { id: "scanning", label: "Scanning" },
  { id: "web", label: "Web" },
  { id: "api", label: "API" },
  { id: "password", label: "Passwords" },
  { id: "exploitation", label: "Exploitation" },
  { id: "post-exploitation", label: "Post-exploitation" },
  { id: "red-team", label: "Red team" },
  { id: "network", label: "Network" },
  { id: "wireless", label: "Wireless" },
  { id: "mobile", label: "Mobile" },
  { id: "cloud", label: "Cloud" },
  { id: "container", label: "Containers" },
  { id: "forensics", label: "Forensics" },
  { id: "vulnerability-management", label: "Vulnerability management" },
  { id: "fuzzing", label: "Fuzzing" },
];

export function toolsByCategory() {
  return TOOL_CATEGORIES.map((category) => ({
    ...category,
    tools: tools.filter((tool) => tool.category === category.id),
  })).filter((group) => group.tools.length > 0);
}

/** Case-insensitive substring match across the fields a reader would search. */
export function searchServices(query) {
  const q = query.trim().toLowerCase();
  if (!q) return services;
  return services.filter((service) => {
    const haystack = [
      service.name,
      service.summary,
      service.slug,
      service.port,
      ...(service.tags || []),
      ...(service.tools || []),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function searchTools(query) {
  const q = query.trim().toLowerCase();
  if (!q) return tools;
  return tools.filter((tool) => {
    const haystack = [tool.name, tool.summary, tool.slug, tool.category, ...(tool.useCases || [])]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

/** Services that mention a given tool, used on the tool pages. */
export function servicesUsingTool(slug) {
  return services.filter((service) => (service.tools || []).includes(slug));
}
/**
 * Tool pages referenced by a service's body, used on the service pages.
 * Only tools that actually have a page are returned — a service may
 * mention `curl` or `openssl`, which are commands rather than entries
 * in the tool library.
 */
export function toolsForService(service) {
  return (service.tools || [])
    .map((slug) => toolBySlug.get(slug))
    .filter(Boolean);
}

/** Tools a service mentions that have no page of their own. */
export function mentionedToolsForService(service) {
  return (service.tools || []).filter((slug) => !toolBySlug.has(slug));
}
