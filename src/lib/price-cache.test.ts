import { afterEach, describe, expect, test } from "bun:test";

import { clearPriceCache, fetchCachedPrices } from "./price-cache";

const originalFetch = globalThis.fetch;

afterEach(() => {
  clearPriceCache();
  globalThis.fetch = originalFetch;
});

describe("price cache", () => {
  test("fetches only IDs missing from the per-asset cache", async () => {
    const requestedIdSets: string[][] = [];
    globalThis.fetch = (async (input) => {
      const url = new URL(String(input));
      const ids = url.searchParams.get("ids")?.split(",") ?? [];
      requestedIdSets.push(ids);
      return Response.json(Object.fromEntries(ids.map((id) => [id, { usd: id === "ethereum" ? 3_000 : 1 }])));
    }) as typeof fetch;

    await expect(fetchCachedPrices(["ethereum"])).resolves.toEqual({ ethereum: 3_000 });
    await expect(fetchCachedPrices(["ethereum", "usd-coin"])).resolves.toEqual({
      ethereum: 3_000,
      "usd-coin": 1,
    });
    expect(requestedIdSets).toEqual([["ethereum"], ["usd-coin"]]);
  });
});
