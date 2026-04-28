import type { AgentSkillDefinition } from "./types";
import { jsonResponse, textResponse } from "./shared";

const AGENT_SKILLS: AgentSkillDefinition[] = [
  {
    name: "api-catalog",
    description: "Discover Pirate's public API catalog, OpenAPI description, docs, and health endpoints.",
    markdown: `---
name: api-catalog
description: Discover Pirate's public API catalog, OpenAPI description, docs, and health endpoints.
---

# Pirate API Catalog

Use this skill when you need the authoritative discovery entrypoint for Pirate's public API.

## Workflow

1. Fetch \`/.well-known/api-catalog\`.
2. Read the \`service-desc\` link for the OpenAPI description.
3. Read the \`service-doc\` link for human-oriented API docs.
4. Use the \`status\` link to verify API health before deeper calls.
`,
  },
  {
    name: "link-headers",
    description: "Use HTTP Link headers on Pirate HTML responses to discover API and documentation resources.",
    markdown: `---
name: link-headers
description: Use HTTP Link headers on Pirate HTML responses to discover API and documentation resources.
---

# Pirate Link Headers

Use this skill when you already have an HTML response from Pirate and want to discover machine-readable resources without scraping the DOM.

## Workflow

1. Inspect the response \`Link\` headers.
2. Follow \`rel="api-catalog"\` to Pirate's API catalog.
3. Follow \`rel="service-desc"\` for OpenAPI.
4. Follow \`rel="service-doc"\` for API documentation.
`,
  },
  {
    name: "markdown-negotiation",
    description: "Request Pirate pages as markdown by sending Accept: text/markdown.",
    markdown: `---
name: markdown-negotiation
description: Request Pirate pages as markdown by sending Accept: text/markdown.
---

# Pirate Markdown Negotiation

Use this skill when you want a token-efficient markdown representation of a Pirate page.

## Workflow

1. Send \`Accept: text/markdown\` with the page request.
2. Expect \`Content-Type: text/markdown; charset=utf-8\`.
3. Read the optional \`x-markdown-tokens\` header for a lightweight size estimate.
4. Treat HTML as the default response when markdown is not requested.
`,
  },
  {
    name: "sitemap",
    description: "Use Pirate's sitemap to discover canonical homepage, community, post, and API-doc URLs.",
    markdown: `---
name: sitemap
description: Use Pirate's sitemap to discover canonical homepage, community, post, and API-doc URLs.
---

# Pirate Sitemap

Use this skill when you need canonical Pirate URLs instead of inferred or duplicate paths.

## Workflow

1. Fetch \`/sitemap.xml\`.
2. Prefer URLs listed there over alternate hostnames or querystring variants.
3. Use \`/robots.txt\` to confirm the sitemap location.
4. Re-fetch the sitemap when you need newly published public content.
`,
  },
  {
    name: "webmcp",
    description: "Prefer Pirate's WebMCP tools for structured browser actions when the page exposes them.",
    markdown: `---
name: webmcp
description: Prefer Pirate's WebMCP tools for structured browser actions when the page exposes them.
---

# Pirate WebMCP

Use this skill when browsing Pirate in a WebMCP-capable browser.

## Workflow

1. Check for WebMCP tools on page load.
2. Prefer WebMCP tools over raw DOM clicking when a suitable tool exists.
3. Use the navigation tools to open Pirate feeds, communities, posts, or profiles.
4. Use the feed inspection tool to read public home-feed items in structured form.
`,
  },
];

async function digestFor(value: string): Promise<string> {
  const payload = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", payload);
  const hex = [...new Uint8Array(hash)].map((part) => part.toString(16).padStart(2, "0")).join("");
  return `sha256:${hex}`;
}

function findAgentSkill(name: string): AgentSkillDefinition | null {
  return AGENT_SKILLS.find((skill) => skill.name === name) ?? null;
}

export async function buildAgentSkillsIndexResponse(input: URL | string): Promise<Response> {
  const skills = await Promise.all(AGENT_SKILLS.map(async (skill) => ({
    name: skill.name,
    type: "skill-md",
    description: skill.description,
    url: `/.well-known/agent-skills/${skill.name}/SKILL.md`,
    digest: await digestFor(skill.markdown),
  })));

  return jsonResponse({
    $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
    skills,
  });
}

export function buildAgentSkillResponse(skillName: string): Response {
  const skill = findAgentSkill(skillName);
  if (!skill) {
    return new Response("Not found", { status: 404 });
  }

  return textResponse(skill.markdown, "text/markdown");
}
