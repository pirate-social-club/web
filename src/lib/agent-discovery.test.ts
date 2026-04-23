import { describe, expect, test } from "bun:test";

import {
  buildMcpServerCardResponse,
  getDiscoveryContext,
  resolveApiOriginFromHostname,
} from "./agent-discovery";

describe("agent discovery origins", () => {
  test("uses HNS API origin for the HNS app host", () => {
    expect(resolveApiOriginFromHostname("app.pirate")).toBe("https://api.pirate");
    expect(getDiscoveryContext("https://app.pirate/c/crew").apiOrigin).toBe("https://api.pirate");
  });

  test("builds an MCP server card for browser-exposed Pirate tools", async () => {
    const response = buildMcpServerCardResponse("https://pirate.sc/");
    const body = await response.json() as {
      capabilities: {
        prompts: { available: unknown[] };
        resources: { available: Array<{ uri: string }> };
        tools: { available: Array<{ name: string }> };
      };
      serverInfo: { name: string; version: string };
      transport: { endpoint: string; type: string };
    };

    expect(response.headers.get("content-type")).toContain("application/json");
    expect(body.serverInfo).toEqual({ name: "Pirate WebMCP", version: "2026-04-23" });
    expect(body.transport).toEqual({ type: "webmcp", endpoint: "https://pirate.sc" });
    expect(body.capabilities.tools.available.map((tool) => tool.name)).toContain("read_home_feed");
    expect(body.capabilities.resources.available.map((resource) => resource.uri)).toContain("https://pirate.sc/.well-known/api-catalog");
    expect(body.capabilities.prompts.available).toEqual([]);
  });
});
