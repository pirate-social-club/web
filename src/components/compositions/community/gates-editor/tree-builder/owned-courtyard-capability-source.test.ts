import { describe, expect, test } from "bun:test";

import { createOwnedCourtyardCapabilitySource } from "./owned-courtyard-capability-source";

describe("createOwnedCourtyardCapabilitySource", () => {
  const groups = [
    {
      category: "trading_card" as const,
      chainNamespace: "eip155:137" as const,
      displayLabel: "Charizard",
      franchise: "Pokémon",
      subject: "Charizard",
      count: 2,
    },
    {
      category: "trading_card" as const,
      chainNamespace: "eip155:137" as const,
      displayLabel: "Gengar",
      franchise: " Pokemon ",
      subject: "Gengar",
      count: 3,
    },
  ];

  test("exposes only owned chain and category combinations", async () => {
    const sources = await createOwnedCourtyardCapabilitySource(groups).listTrustedSources();
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({
      id: "courtyard-owned-eip155-137-trading_card",
      chainNamespace: "eip155:137",
      fixedMatch: { category: "trading_card" },
      inventoryProvider: "courtyard",
    });
  });

  test("derives normalized, counted facet suggestions from owned assets", async () => {
    const source = createOwnedCourtyardCapabilitySource(groups);
    const suggestions = await source.searchFacetValues(
      "courtyard-owned-eip155-137-trading_card",
      "franchise",
      "poke",
    );
    expect(suggestions).toEqual([{ value: "Pokémon", approximateCount: 5 }]);
  });

  test("returns no catalog sources without owned inventory", async () => {
    expect(await createOwnedCourtyardCapabilitySource([]).listTrustedSources()).toEqual([]);
  });
});
