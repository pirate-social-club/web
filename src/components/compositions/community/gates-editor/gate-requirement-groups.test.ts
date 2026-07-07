import { describe, expect, test } from "bun:test";

import { buildGateRequirementGroupsProjection } from "./gate-requirement-groups";

describe("buildGateRequirementGroupsProjection", () => {
  test("groups normal gate drafts by product requirement", () => {
    const projection = buildGateRequirementGroupsProjection([
      { gateType: "unique_human", provider: "very" },
      { gateType: "altcha_pow", fallbackFor: "unique_human" },
      { gateType: "nationality", provider: "self", acceptedProviders: ["self", "zkpassport"], requiredValues: ["US"] },
      { gateType: "minimum_age", provider: "self", acceptedProviders: ["zkpassport"], minimumAge: 21 },
      { gateType: "gender", provider: "self", acceptedProviders: ["self"], requiredValue: "F" },
      { gateType: "erc721_holding", chainNamespace: "eip155:1", contractAddress: "0x1111111111111111111111111111111111111111" },
      {
        gateType: "erc721_inventory_match",
        chainNamespace: "eip155:137",
        contractAddress: "0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD",
        inventoryProvider: "courtyard",
        minQuantity: 1,
        assetFilter: { category: "trading_card", subject: "Pikachu" },
      },
      { gateType: "wallet_score", provider: "passport", minimumScore: 20 },
    ], "all");

    expect(projection.normalAuthoringSupported).toBe(true);
    expect(projection.advancedReasons).toEqual([]);
    expect(projection.groups).toEqual([
      {
        kind: "humanity",
        uniqueHuman: { gateType: "unique_human", provider: "very" },
        antiBotFallback: { gateType: "altcha_pow", fallbackFor: "unique_human" },
      },
      {
        kind: "document_attributes",
        nationality: { gateType: "nationality", provider: "self", acceptedProviders: ["self", "zkpassport"], requiredValues: ["US"] },
        minimumAge: { gateType: "minimum_age", provider: "self", acceptedProviders: ["zkpassport"], minimumAge: 21 },
        gender: { gateType: "gender", provider: "self", acceptedProviders: ["self"], requiredValue: "F" },
      },
      {
        kind: "token_holdings",
        erc721Holding: { gateType: "erc721_holding", chainNamespace: "eip155:1", contractAddress: "0x1111111111111111111111111111111111111111" },
        courtyardInventory: {
          gateType: "erc721_inventory_match",
          chainNamespace: "eip155:137",
          contractAddress: "0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD",
          inventoryProvider: "courtyard",
          minQuantity: 1,
          assetFilter: { category: "trading_card", subject: "Pikachu" },
        },
      },
      {
        kind: "reputation",
        walletScore: { gateType: "wallet_score", provider: "passport", minimumScore: 20 },
      },
    ]);
  });

  test("keeps standalone anti-bot representable only when it is the whole policy", () => {
    expect(buildGateRequirementGroupsProjection([
      { gateType: "altcha_pow" },
    ], "all")).toEqual({
      advancedReasons: [],
      groups: [
        { antiBot: { gateType: "altcha_pow" }, kind: "standalone_antibot" },
      ],
      normalAuthoringSupported: true,
    });

    expect(buildGateRequirementGroupsProjection([
      { gateType: "altcha_pow" },
      { gateType: "nationality", provider: "self", requiredValues: ["US"] },
    ], "all")).toMatchObject({
      advancedReasons: ["standalone_antibot_with_other_requirements"],
      normalAuthoringSupported: false,
    });
  });

  test("marks cross-group OR as advanced", () => {
    expect(buildGateRequirementGroupsProjection([
      { gateType: "wallet_score", provider: "passport", minimumScore: 20 },
      { gateType: "unique_human", provider: "very" },
    ], "any")).toMatchObject({
      advancedReasons: ["cross_group_or"],
      normalAuthoringSupported: false,
    });
  });

  test("marks anti-bot fallback without unique-human as advanced", () => {
    expect(buildGateRequirementGroupsProjection([
      { gateType: "altcha_pow", fallbackFor: "unique_human" },
    ], "all")).toEqual({
      advancedReasons: ["anti_bot_fallback_without_humanity"],
      groups: [
        {
          antiBotFallback: { gateType: "altcha_pow", fallbackFor: "unique_human" },
          kind: "humanity",
        },
      ],
      normalAuthoringSupported: false,
    });
  });
});
