import { describe, expect, test } from "bun:test";

import {
  COURTYARD_MAINNET_REGISTRY,
  createCourtyardInventoryDraftFromGroup,
  createDefaultCourtyardInventoryDraft,
  isValidCourtyardInventoryDraft,
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
