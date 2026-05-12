export type WebMcpToolDefinition = {
  description: string;
  inputSchema: Record<string, unknown>;
  name: string;
};

export const WEB_MCP_TOOL_DEFINITIONS = [
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
] as const satisfies readonly WebMcpToolDefinition[];

export type WebMcpToolName = typeof WEB_MCP_TOOL_DEFINITIONS[number]["name"];
