import { describe, expect, test } from "bun:test";

import { serializeIdentityGateDrafts } from "./community-gate-rule-serialization";

describe("serializeIdentityGateDrafts", () => {
  test("serializes Courtyard inventory drafts for community creation", () => {
    expect(serializeIdentityGateDrafts([{
      gateType: "erc721_inventory_match",
      chainNamespace: "eip155:137",
      contractAddress: " 0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD ",
      inventoryProvider: "courtyard",
      minQuantity: 5,
      assetFilter: {
        category: "watch",
        brand: "Rolex",
        model: "Submariner",
        reference: "124060",
      },
    }])).toEqual([{
      scope: "membership",
      gate_family: "token_holding",
      gate_type: "erc721_inventory_match",
      chain_namespace: "eip155:137",
      gate_config: {
        contract_address: "0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD",
        inventory_provider: "courtyard",
        min_quantity: 5,
        match: {
          category: "watch",
          brand: "Rolex",
          model: "Submariner",
          reference: "124060",
        },
      },
    }]);
  });

  test("includes gate_rule_id only when serializing editor updates", () => {
    expect(serializeIdentityGateDrafts([{
      gateType: "minimum_age",
      provider: "self",
      minimumAge: 30,
      gateRuleId: "gate-1",
    }], { includeGateRuleIds: true })[0]).toEqual({
      scope: "membership",
      gate_family: "identity_proof",
      gate_type: "minimum_age",
      gate_rule_id: "gate-1",
      proof_requirements: [{
        proof_type: "minimum_age",
        accepted_providers: ["self"],
        config: { minimum_age: 30 },
      }],
    });
  });

  test("serializes Passport wallet score gates", () => {
    expect(serializeIdentityGateDrafts([{
      gateType: "wallet_score",
      provider: "passport",
      minimumScore: 20,
    }])).toEqual([{
      scope: "membership",
      gate_family: "identity_proof",
      gate_type: "wallet_score",
      proof_requirements: [{
        proof_type: "wallet_score",
        accepted_providers: ["passport"],
        config: { minimum_score: 20 },
      }],
    }]);
  });
});
