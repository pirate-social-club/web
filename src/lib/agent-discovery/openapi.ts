import { getDiscoveryContext, jsonResponse } from "./shared";

export function buildOpenApiDocument(input: URL | string): Record<string, unknown> {
  const ctx = getDiscoveryContext(input);

  return {
    openapi: "3.1.0",
    info: {
      title: "Pirate API Discovery Surface",
      version: "2026-04-19",
      description: "Public discovery document for Pirate's current public and session bootstrap API surface.",
    },
    servers: [
      {
        url: ctx.apiOrigin,
        description: ctx.apiOrigin.includes("staging") ? "Staging API" : "Primary API",
      },
    ],
    paths: {
      "/health": {
        get: {
          summary: "Health check",
          operationId: "health",
          responses: {
            "200": {
              description: "Service health",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      ok: { type: "boolean" },
                    },
                    required: ["ok"],
                  },
                },
              },
            },
          },
        },
      },
      "/auth/session/exchange": {
        post: {
          summary: "Exchange an upstream proof for a Pirate session token",
          operationId: "sessionExchange",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    proof: { type: "object" },
                  },
                  required: ["proof"],
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Session created or resumed",
            },
          },
        },
      },
      "/feed/home": {
        get: {
          summary: "Read the public home feed",
          operationId: "homeFeed",
          parameters: [
            { name: "cursor", in: "query", schema: { type: "string" } },
            { name: "limit", in: "query", schema: { type: "integer" } },
            { name: "sort", in: "query", schema: { type: "string", enum: ["best", "new", "top"] } },
          ],
          responses: {
            "200": { description: "Public home feed items" },
          },
        },
      },
      "/public-communities/{communityId}": {
        get: {
          summary: "Read a public community preview",
          operationId: "publicCommunity",
          parameters: [
            { name: "communityId", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "Community preview" },
          },
        },
      },
      "/public-communities/{communityId}/posts": {
        get: {
          summary: "List public posts for a community",
          operationId: "publicCommunityPosts",
          parameters: [
            { name: "communityId", in: "path", required: true, schema: { type: "string" } },
            { name: "cursor", in: "query", schema: { type: "string" } },
            { name: "limit", in: "query", schema: { type: "integer" } },
            { name: "sort", in: "query", schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "Public community feed" },
          },
        },
      },
      "/public-posts/{postId}": {
        get: {
          summary: "Read a public post",
          operationId: "publicPost",
          parameters: [
            { name: "postId", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "Public post" },
          },
        },
      },
      "/public-profiles/{handleLabel}": {
        get: {
          summary: "Read a public profile",
          operationId: "publicProfile",
          parameters: [
            { name: "handleLabel", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "Public profile" },
          },
        },
      },
    },
  };
}

export function buildOpenApiResponse(input: URL | string): Response {
  return jsonResponse(buildOpenApiDocument(input), "application/vnd.oai.openapi+json");
}
