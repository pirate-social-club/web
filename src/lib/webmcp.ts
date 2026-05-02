"use client";

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

export function registerWebMcpTools(): void {
  const modelContext = (navigator as Navigator & { modelContext?: WebMcpContext }).modelContext;
  if (!modelContext) {
    return;
  }

  const apiOrigin = resolveApiOrigin();
  const tools: WebMcpTool[] = [
    {
      name: "open_home_feed",
      description: "Open Pirate's home feed.",
      inputSchema: {
        type: "object",
        properties: {},
      },
      execute: async () => navigate("/"),
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
      execute: async (input) => {
        const value = String(parseObjectInput(input).communityId ?? "").trim();
        if (!value) {
          throw new Error("communityId is required");
        }
        return navigate(`/c/${encodeURIComponent(value)}`);
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
      execute: async (input) => {
        const value = String(parseObjectInput(input).postId ?? "").trim();
        if (!value) {
          throw new Error("postId is required");
        }
        return navigate(`/p/${encodeURIComponent(value)}`);
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
      execute: async (input) => {
        const value = String(parseObjectInput(input).handleLabel ?? "").trim();
        if (!value) {
          throw new Error("handleLabel is required");
        }
        return navigate(`/u/${encodeURIComponent(value)}`);
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
      execute: async (input) => {
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
      },
    },
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
