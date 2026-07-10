import { afterEach, describe, expect, test } from "bun:test";

import worker from "./worker-public";

const originalFetch = globalThis.fetch;
const originalConsoleError = console.error;

afterEach(() => {
  globalThis.fetch = originalFetch;
  console.error = originalConsoleError;
});

describe("public profile worker", () => {
  test("returns a protected 502 page when the API payload is malformed", async () => {
    globalThis.fetch = (async () => new Response("not-json", {
      headers: { "content-type": "application/json" },
    })) as typeof fetch;
    console.error = () => {};

    const response = await worker.fetch(
      new Request("https://ada.pirate/"),
      {
        HNS_PUBLIC_API_ORIGIN: "https://api.pirate.sc",
        HNS_PUBLIC_APP_ORIGIN: "https://pirate.sc",
      },
    );

    expect(response.status).toBe(502);
    expect(response.headers.get("content-security-policy")).toContain("default-src 'none'");
  });
});
