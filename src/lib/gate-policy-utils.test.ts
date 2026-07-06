import { describe, expect, test } from "bun:test";
import type { GatePolicy } from "@pirate/api-contracts";

import { isGatePolicyProjectionLossy } from "./gate-policy-utils";

describe("gate-policy-utils", () => {
  test("detects nested policies that cannot be represented by the flat editor projection", () => {
    const originalPolicy: GatePolicy = {
      version: 1,
      expression: {
        op: "and",
        children: [
          { op: "gate", gate: { type: "altcha_pow" } },
          {
            op: "or",
            children: [
              { op: "gate", gate: { type: "nationality", provider: "self", allowed: ["US"] } },
              { op: "gate", gate: { type: "wallet_score", provider: "passport", minimum_score: 20 } },
            ],
          },
        ],
      },
    };
    const projectedPolicy: GatePolicy = {
      version: 1,
      expression: {
        op: "and",
        children: [
          { op: "gate", gate: { type: "altcha_pow" } },
          { op: "gate", gate: { type: "nationality", provider: "self", allowed: ["US"] } },
          { op: "gate", gate: { type: "wallet_score", provider: "passport", minimum_score: 20 } },
        ],
      },
    };

    expect(isGatePolicyProjectionLossy(originalPolicy, projectedPolicy)).toBe(true);
  });

  test("accepts policies that round-trip through the flat editor projection", () => {
    const policy: GatePolicy = {
      version: 1,
      expression: {
        op: "or",
        children: [
          { op: "gate", gate: { type: "altcha_pow" } },
          { op: "gate", gate: { type: "unique_human", provider: "very" } },
        ],
      },
    };

    expect(isGatePolicyProjectionLossy(policy, policy)).toBe(false);
  });

  test("does not treat object key order as policy loss", () => {
    const originalPolicy = {
      version: 1,
      expression: {
        op: "and",
        children: [
          {
            op: "gate",
            gate: {
              type: "erc721_inventory_match",
              chain_namespace: "eip155:1",
              contract_address: "0xd4ac3CE8e1E14CD60666D49AC34Ff2d2937cF6FA",
              inventory_provider: "courtyard",
              min_quantity: 1,
              match: { category: "watch", brand: "rolex" },
            },
          },
        ],
      },
    } as GatePolicy;
    const samePolicyDifferentKeyOrder = {
      expression: {
        children: [
          {
            gate: {
              match: { brand: "rolex", category: "watch" },
              min_quantity: 1,
              inventory_provider: "courtyard",
              contract_address: "0xd4ac3CE8e1E14CD60666D49AC34Ff2d2937cF6FA",
              chain_namespace: "eip155:1",
              type: "erc721_inventory_match",
            },
            op: "gate",
          },
        ],
        op: "and",
      },
      version: 1,
    } as GatePolicy;

    expect(isGatePolicyProjectionLossy(originalPolicy, samePolicyDifferentKeyOrder)).toBe(false);
  });
});
