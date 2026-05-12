"use client";

import { WEB_MCP_TOOL_DEFINITIONS, type WebMcpToolName } from "@/lib/webmcp-tools";

type WebMcpTool = {
  description: string;
  execute: (input: unknown) => Promise<unknown> | unknown;
  inputSchema: Record<string, unknown>;
  name: string;
};

type WebMcpContext = {
  provideContext?: (value: { tools: WebMcpTool[] }) => void;
  registerTool?: (tool: WebMcpTool) => void;
};

function resolveApiOrigin(): string {
  const hostname = window.location.hostname.toLowerCase();

  if (
    hostname === "localhost"
    || hostname === "127.0.0.1"
    || hostname.startsWith("127.")
    || hostname.endsWith(".localhost")
  ) {
    return "http://127.0.0.1:8787";
  }

  if (hostname === "staging.pirate.sc" || hostname.endsWith(".staging.pirate.sc")) {
    return "https://api-staging.pirate.sc";
  }

  return "https://api.pirate.sc";
}

function navigate(path: string): { navigatedTo: string } {
  window.location.assign(path);
  return { navigatedTo: new URL(path, window.location.origin).toString() };
}

function parseObjectInput(input: unknown): Record<string, unknown> {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    return input as Record<string, unknown>;
  }

  return {};
}

function withToolDefinition(
  name: WebMcpToolName,
  execute: WebMcpTool["execute"],
): WebMcpTool {
  const definition = WEB_MCP_TOOL_DEFINITIONS.find((tool) => tool.name === name);
  if (!definition) {
    throw new Error(`Unknown WebMCP tool (${name}).`);
  }

  return { ...definition, execute };
}

export function registerWebMcpTools(): void {
  const modelContext = (navigator as Navigator & { modelContext?: WebMcpContext }).modelContext;
  if (!modelContext) {
    return;
  }

  const apiOrigin = resolveApiOrigin();
  const tools: WebMcpTool[] = [
    withToolDefinition("open_home_feed", async () => navigate("/")),
    withToolDefinition("open_community", async (input) => {
      const value = String(parseObjectInput(input).communityId ?? "").trim();
      if (!value) {
        throw new Error("communityId is required");
      }
      return navigate(`/c/${encodeURIComponent(value)}`);
    }),
    withToolDefinition("open_post", async (input) => {
      const value = String(parseObjectInput(input).postId ?? "").trim();
      if (!value) {
        throw new Error("postId is required");
      }
      return navigate(`/p/${encodeURIComponent(value)}`);
    }),
    withToolDefinition("open_profile", async (input) => {
      const value = String(parseObjectInput(input).handleLabel ?? "").trim();
      if (!value) {
        throw new Error("handleLabel is required");
      }
      return navigate(`/u/${encodeURIComponent(value)}`);
    }),
    withToolDefinition("read_home_feed", async (input) => {
      const parsed = parseObjectInput(input);
      const endpoint = new URL("/feed/home", apiOrigin);
      const limit = Number(parsed.limit ?? 10);
      const sort = typeof parsed.sort === "string" ? parsed.sort : "new";
      endpoint.searchParams.set("limit", String(Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 20) : 10));
      endpoint.searchParams.set("sort", sort);

      const response = await fetch(endpoint.toString(), {
        headers: { accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error(`home feed request failed: ${response.status}`);
      }

      const payload = await response.json() as {
        items?: Array<{
          community?: { id?: string; community_id?: string; display_name?: string; route_slug?: string | null };
          post?: { post?: { id?: string; post_id?: string; title?: string | null; body?: string | null; post_type?: string } | null };
        }>;
      };

      return {
        items: (payload.items ?? []).map((item) => {
          const postId = item.post?.post?.id ?? item.post?.post?.post_id ?? null;
          return {
            communityId: item.community?.id ?? item.community?.community_id ?? null,
            communityLabel: item.community?.route_slug ?? item.community?.display_name ?? null,
            postId,
            title: item.post?.post?.title ?? null,
            body: item.post?.post?.body ?? null,
            postType: item.post?.post?.post_type ?? null,
            url: postId ? new URL(`/p/${encodeURIComponent(postId)}`, window.location.origin).toString() : null,
          };
        }),
      };
    }),
  ];

  if (typeof modelContext.provideContext === "function") {
    modelContext.provideContext({ tools });
    return;
  }

  if (typeof modelContext.registerTool === "function") {
    for (const tool of tools) {
      modelContext.registerTool(tool);
    }
  }
}
