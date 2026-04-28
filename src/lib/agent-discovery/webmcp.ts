import type { WebMcpToolCard } from "./types";
import { absoluteUrl, getDiscoveryContext, jsonResponse } from "./shared";

const WEB_MCP_TOOLS: WebMcpToolCard[] = [
  {
    name: "open_home_feed",
    description: "Open Pirate's home feed.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "open_community",
    description: "Open a Pirate community page by route slug or community ID.",
    inputSchema: {
      type: "object",
      properties: {
        communityId: { type: "string", description: "Community route slug or community ID." },
      },
      required: ["communityId"],
    },
  },
  {
    name: "open_post",
    description: "Open a Pirate post by post ID.",
    inputSchema: {
      type: "object",
      properties: {
        postId: { type: "string", description: "Pirate post ID." },
      },
      required: ["postId"],
    },
  },
  {
    name: "open_profile",
    description: "Open a Pirate public profile by handle label.",
    inputSchema: {
      type: "object",
      properties: {
        handleLabel: { type: "string", description: "Pirate handle label." },
      },
      required: ["handleLabel"],
    },
  },
  {
    name: "read_home_feed",
    description: "Read structured items from Pirate's public home feed without DOM scraping.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 20 },
        sort: { type: "string", enum: ["best", "new", "top"] },
      },
    },
  },
];

export function buildMcpServerCardResponse(input: URL | string): Response {
  const ctx = getDiscoveryContext(input);

  return jsonResponse({
    serverInfo: {
      name: "Pirate WebMCP",
      version: "2026-04-23",
    },
    transport: {
      type: "webmcp",
      endpoint: ctx.appOrigin,
    },
    capabilities: {
      tools: {
        listChanged: false,
        available: WEB_MCP_TOOLS,
      },
      resources: {
        listChanged: false,
        available: [
          {
            name: "Pirate API catalog",
            uri: absoluteUrl(ctx.appOrigin, "/.well-known/api-catalog"),
            mimeType: "application/linkset+json",
          },
          {
            name: "Pirate OpenAPI description",
            uri: absoluteUrl(ctx.appOrigin, "/openapi.json"),
            mimeType: "application/vnd.oai.openapi+json",
          },
        ],
      },
      prompts: {
        listChanged: false,
        available: [],
      },
    },
  });
}
