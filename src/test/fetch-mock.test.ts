import { describe, expect, test } from "bun:test";

import { withFetchMockGlobal } from "./fetch-mock";

describe("fetch mock global", () => {
  test("installs a callable mock while preserving the platform preconnect member", async () => {
    const originalFetch = globalThis.fetch;
    withFetchMockGlobal((testGlobal) => {
      testGlobal.fetch = async () => Response.json({ mocked: true });
    });

    try {
      expect(globalThis.fetch.preconnect).toBe(originalFetch.preconnect);
      await expect(globalThis.fetch("https://pirate.test").then((response) => response.json()))
        .resolves.toEqual({ mocked: true });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
