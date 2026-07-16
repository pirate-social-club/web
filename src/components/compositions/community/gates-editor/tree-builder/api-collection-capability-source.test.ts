import { describe, expect, test } from "bun:test";

import type { CollectionCapabilitySource } from "./collection-capability-source";
import {
  createApiCollectionCapabilitySource,
  createFallbackCollectionCapabilitySource,
} from "./api-collection-capability-source";

describe("API collection capability source", () => {
  test("maps contract source and facet responses into the builder model", async () => {
    const source = createApiCollectionCapabilitySource({
      async listNftSources() {
        return { sources: [{
          id: "cards",
          label: "Cards",
          chain_namespace: "eip155:137",
          contract_address: "0x123",
          standard: "erc721",
          trait_filters_supported: true,
          facet_keys: ["subject"],
          facet_labels: { subject: "Subject" },
          max_values_per_facet: 10,
          inventory_provider: "courtyard",
          fixed_match: { category: "trading_card" },
          min_quantity_supported: true,
        }] };
      },
      async searchNftFacetValues(sourceId, facetKey, options) {
        expect([sourceId, facetKey, options]).toEqual(["cards", "subject", { limit: 25, query: "char" }]);
        return {
          values: [{ value: "Charizard", approximate_count: 42 }],
          next_cursor: null,
          catalog_fetched_at: "2026-07-16T00:00:00.000Z",
        };
      },
    });

    expect(await source.listTrustedSources()).toEqual([expect.objectContaining({
      id: "cards",
      chainNamespace: "eip155:137",
      inventoryProvider: "courtyard",
      fixedMatch: { category: "trading_card" },
    })]);
    expect(await source.searchFacetValues("cards", "subject", "char")).toEqual([
      { value: "Charizard", approximateCount: 42 },
    ]);
  });

  test("falls back to owned inventory when the remote catalog cannot list", async () => {
    const calls: string[] = [];
    const primary = {
      listTrustedSources: async () => Promise.reject(new Error("offline")),
      probeContract: async () => null,
      searchFacetValues: async () => { calls.push("primary"); return []; },
      estimateMatchCount: async () => null,
    } satisfies CollectionCapabilitySource;
    const fallback = {
      listTrustedSources: async () => [{
        id: "owned",
        label: "Owned",
        chainNamespace: "eip155:137",
        contractAddress: "0x123",
        standard: "erc721" as const,
        traitFiltersSupported: true,
        facetKeys: ["subject"],
        maxValuesPerFacet: 10,
      }],
      probeContract: async () => null,
      searchFacetValues: async () => { calls.push("fallback"); return [{ value: "Charizard" }]; },
      estimateMatchCount: async () => null,
    } satisfies CollectionCapabilitySource;

    const resilient = createFallbackCollectionCapabilitySource(primary, fallback);
    expect((await resilient.listTrustedSources())[0]?.id).toBe("owned");
    expect(await resilient.searchFacetValues("owned", "subject", "char")).toEqual([{ value: "Charizard" }]);
    expect(calls).toEqual(["fallback"]);
  });
});
