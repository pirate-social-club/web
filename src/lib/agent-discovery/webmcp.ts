import { WEB_MCP_TOOL_DEFINITIONS } from "@/lib/webmcp-tools";
import { absoluteUrl, getDiscoveryContext, jsonResponse } from "./shared";

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
        available: WEB_MCP_TOOL_DEFINITIONS,
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
