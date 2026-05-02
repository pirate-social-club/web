import { describe, expect, test } from "bun:test";

import {
  buildOAuthAuthorizationServerResponse,
  buildOAuthProtectedResourceResponse,
  buildOpenIdConfigurationResponse,
  buildMcpServerCardResponse,
  buildWebBotAuthDirectoryResponse,
  getDiscoveryContext,
  resolveApiOriginFromHostname,
} from "./agent-discovery";

const WEB_BOT_AUTH_PRIVATE_JWK = JSON.stringify({
  crv: "Ed25519",
  d: "W52UMk2oBHInCW2yEdg-UaUd56cRtguXsfuhhPX_qW4",
  ext: true,
  key_ops: ["sign"],
  kty: "OKP",
  x: "5sRanjm7SJEYVtzky0vOKzx_j-BngNB-VuylOmctACI",
});

function base64ToArrayBuffer(value: string): ArrayBuffer {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0)).buffer as ArrayBuffer;
}

describe("agent discovery origins", () => {
  test("uses production API origin for the HNS app host", () => {
    expect(resolveApiOriginFromHostname("app.pirate")).toBe("https://api.pirate.sc");
    expect(getDiscoveryContext("https://app.pirate/c/crew").apiOrigin).toBe("https://api.pirate.sc");
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

  test("publishes OAuth authorization server discovery from the app origin", async () => {
    const response = buildOAuthAuthorizationServerResponse("https://pirate.sc/");
    const body = await response.json() as {
      authorization_endpoint: string;
      grant_types_supported: string[];
      issuer: string;
      jwks_uri: string;
      protected_resources: string[];
      service_documentation: string;
      token_endpoint: string;
    };

    expect(response.headers.get("content-type")).toContain("application/json");
    expect(body.issuer).toBe("https://pirate.sc");
    expect(body.authorization_endpoint).toBe("https://api.pirate.sc/auth/session/exchange");
    expect(body.token_endpoint).toBe("https://api.pirate.sc/auth/session/exchange");
    expect(body.jwks_uri).toBe("https://api.pirate.sc/.well-known/jwks.json");
    expect(body.grant_types_supported).toEqual(["urn:pirate:params:oauth:grant-type:session-exchange"]);
    expect(body.protected_resources).toEqual(["https://api.pirate.sc"]);
    expect(body.service_documentation).toBe("https://pirate.sc/docs/api");
  });

  test("publishes OIDC discovery metadata from the app origin", async () => {
    const response = buildOpenIdConfigurationResponse("https://pirate.sc/");
    const body = await response.json() as {
      issuer: string;
      jwks_uri: string;
      subject_types_supported: string[];
    };

    expect(body.issuer).toBe("https://pirate.sc");
    expect(body.jwks_uri).toBe("https://api.pirate.sc/.well-known/jwks.json");
    expect(body.subject_types_supported).toEqual(["public"]);
  });

  test("publishes OAuth protected resource metadata for the API", async () => {
    const response = buildOAuthProtectedResourceResponse("https://pirate.sc/");
    const body = await response.json() as {
      authorization_servers: string[];
      jwks_uri: string;
      resource: string;
      resource_documentation: string;
      scopes_supported: string[];
    };

    expect(body.resource).toBe("https://pirate.sc");
    expect(body.authorization_servers).toEqual(["https://pirate.sc"]);
    expect(body.jwks_uri).toBe("https://api.pirate.sc/.well-known/jwks.json");
    expect(body.resource_documentation).toBe("https://pirate.sc/docs/api");
    expect(body.scopes_supported).toEqual(["pirate_app_session"]);
  });

  test("hides Web Bot Auth directory until signing key is configured", async () => {
    const response = await buildWebBotAuthDirectoryResponse(
      new Request("https://pirate.sc/.well-known/http-message-signatures-directory"),
      {},
    );

    expect(response.status).toBe(404);
  });

  test("publishes a signed Web Bot Auth key directory", async () => {
    const request = new Request("https://pirate.sc/.well-known/http-message-signatures-directory", {
      headers: { host: "pirate.sc" },
    });
    const response = await buildWebBotAuthDirectoryResponse(request, {
      WEB_BOT_AUTH_PRIVATE_JWK,
    });
    const body = await response.json() as {
      keys: Array<JsonWebKey & { d?: string; kid: string }>;
    };
    const signatureInput = response.headers.get("signature-input") ?? "";
    const signatureHeader = response.headers.get("signature") ?? "";
    const signatureParams = signatureInput.replace(/^sig1=/u, "");
    const signature = signatureHeader.match(/^sig1=:([^:]+):$/u)?.[1];
    const publicKey = await crypto.subtle.importKey(
      "jwk",
      body.keys[0] ?? {},
      { name: "Ed25519" },
      false,
      ["verify"],
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/http-message-signatures-directory+json");
    expect(body.keys).toHaveLength(1);
    expect(body.keys[0]?.kty).toBe("OKP");
    expect(body.keys[0]?.crv).toBe("Ed25519");
    expect(body.keys[0]?.x).toBe("5sRanjm7SJEYVtzky0vOKzx_j-BngNB-VuylOmctACI");
    expect(body.keys[0]?.d).toBe(undefined);
    expect(Boolean(signature)).toBe(true);
    expect(signatureInput).toContain('tag="http-message-signatures-directory"');
    expect(signatureInput).toContain(`keyid="${body.keys[0]?.kid}"`);

    const verified = await crypto.subtle.verify(
      { name: "Ed25519" },
      publicKey,
      base64ToArrayBuffer(signature ?? ""),
      new TextEncoder().encode(`"@authority";req: pirate.sc\n"@signature-params": ${signatureParams}`),
    );
    expect(verified).toBe(true);
  });
});
