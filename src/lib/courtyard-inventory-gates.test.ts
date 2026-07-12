import { describe, expect, test } from "bun:test";

import {
  COURTYARD_MAINNET_REGISTRY,
  COURTYARD_POLYGON_REGISTRY,
  createCourtyardInventoryDraftFromGroup,
  createDefaultCourtyardInventoryDraft,
  isValidCourtyardInventoryDraft,
  type CourtyardInventoryDraft,
} from "./courtyard-inventory-gates";

describe("courtyard-inventory-gates", () => {
  test("accepts mainnet Courtyard inventory drafts with a concrete facet", () => {
    expect(isValidCourtyardInventoryDraft(createDefaultCourtyardInventoryDraft({
      chainNamespace: "eip155:1",
      contractAddress: COURTYARD_MAINNET_REGISTRY,
      assetFilter: {
        category: "watch",
        brand: "Rolex",
      },
    }))).toBe(true);
  });

  test("builds valid drafts from wallet inventory groups", () => {
    const draft = createCourtyardInventoryDraftFromGroup({
      category: "watch",
      chainNamespace: "eip155:1",
      contractAddress: COURTYARD_MAINNET_REGISTRY,
      brand: "Rolex",
      model: "Submariner",
      displayLabel: "Rolex Submariner",
      count: 2,
    });

    expect(draft).toMatchObject({
      gateType: "erc721_inventory_match",
      chainNamespace: "eip155:1",
      contractAddress: COURTYARD_MAINNET_REGISTRY,
      minQuantity: 2,
      assetFilter: {
        category: "watch",
        brand: "Rolex",
        model: "Submariner",
      },
    });
    expect(isValidCourtyardInventoryDraft(draft)).toBe(true);
  });
});

describe("isValidCourtyardInventoryDraft (API parity)", () => {
  const draft = (overrides: Record<string, unknown> = {}) => ({
    gateType: "erc721_inventory_match",
    inventoryProvider: "courtyard",
    chainNamespace: "eip155:137",
    contractAddress: COURTYARD_POLYGON_REGISTRY,
    minQuantity: 1,
    assetFilter: { category: "trading_card", franchise: "Pokemon" },
    ...overrides,
  }) as CourtyardInventoryDraft;

  test("accepts a valid card and watch draft", () => {
    expect(isValidCourtyardInventoryDraft(draft())).toBe(true);
    expect(isValidCourtyardInventoryDraft(draft({
      assetFilter: { category: "watch", brand: "Rolex" },
    }))).toBe(true);
  });

  test("rejects a grade-only card draft", () => {
    // Previously accepted here and rejected by the API.
    expect(isValidCourtyardInventoryDraft(draft({
      assetFilter: { category: "trading_card", grade: "PSA 9" },
    }))).toBe(false);
  });

  test("rejects a reference-only watch draft", () => {
    expect(isValidCourtyardInventoryDraft(draft({
      assetFilter: { category: "watch", reference: "116610LN" },
    }))).toBe(false);
  });

  test("rejects a contract outside the Courtyard registry allowlist", () => {
    expect(isValidCourtyardInventoryDraft(draft({
      contractAddress: "0xBC4CA0EDA7647A8AB7C2061C2E118A18A936F13D",
    }))).toBe(false);
  });

  test("accepts a lowercase registry address", () => {
    expect(isValidCourtyardInventoryDraft(draft({
      contractAddress: COURTYARD_POLYGON_REGISTRY.toLowerCase(),
    }))).toBe(true);
  });
});

