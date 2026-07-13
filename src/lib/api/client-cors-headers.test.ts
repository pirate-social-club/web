import { afterEach, describe, expect, test } from "bun:test";

import { installDomGlobals } from "@/test/setup-dom";
import { ApiClient } from "./client";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("ApiClient public request headers", () => {
  test("keeps anonymous public GETs CORS-safelisted", async () => {
    installDomGlobals();
    let capturedRequest: Request | null = null;
    globalThis.fetch = (async (input, init) => {
      capturedRequest = input instanceof Request ? input : new Request(input, init);
      return Response.json({ items: [], top_communities: [] });
    }) as typeof fetch;
    const client = new ApiClient({
      baseUrl: "https://api.pirate.sc",
      getToken: () => null,
    });

    await client.feed.publicHome({ locale: "en", sort: "best" });

    expect(capturedRequest?.headers.get("x-pirate-anonymous-id")).toBeNull();
    expect(capturedRequest?.headers.get("x-pirate-session-id")).toBeNull();
    expect(capturedRequest?.headers.get("content-type")).toBeNull();
  });

  test("keeps identity headers on writes, which preflight regardless", async () => {
    installDomGlobals();
    let capturedRequest: Request | null = null;
    globalThis.fetch = (async (input, init) => {
      capturedRequest = input instanceof Request ? input : new Request(input, init);
      return Response.json({});
    }) as typeof fetch;
    const client = new ApiClient({
      baseUrl: "https://api.pirate.sc",
      getToken: () => null,
    });

    await client.agents.createPairing();

    // The API reads both headers for server-side event attribution
    // (analytics/track.ts). Dropping them buys no preflight saving here,
    // because the JSON content-type already forces one.
    expect(capturedRequest?.headers.get("x-pirate-anonymous-id")).not.toBeNull();
    expect(capturedRequest?.headers.get("x-pirate-session-id")).not.toBeNull();
  });
});
