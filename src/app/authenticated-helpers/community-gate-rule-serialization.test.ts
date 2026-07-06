import { describe, expect, test } from "bun:test";
import type { GatePolicy } from "@pirate/api-contracts";

import {
  serializeIdentityGateDrafts,
  serializeIdentityGateDraftsForSave,
} from "@/app/authenticated-helpers/community-gate-rule-serialization";

describe("serializeIdentityGateDrafts", () => {
  test("serializes verified-human drafts with the selected provider", () => {
    expect(serializeIdentityGateDrafts([{
      gateType: "unique_human",
      provider: "very",
    }])).toEqual({
      version: 1,
      expression: {
        op: "and",
        children: [{
          op: "gate",
          gate: { type: "unique_human", provider: "very" },
        }],
      },
    });
  });

  test("serializes Self unique-human drafts with the selected provider", () => {
    expect(serializeIdentityGateDrafts([{
      gateType: "unique_human",
      provider: "self",
    }])).toEqual({
      version: 1,
      expression: {
        op: "and",
        children: [{
          op: "gate",
          gate: { type: "unique_human", provider: "self" },
        }],
      },
    });
  });

  test("serializes proof-of-work drafts as standalone ALTCHA gates", () => {
    expect(serializeIdentityGateDrafts([{
      gateType: "altcha_pow",
    }])).toEqual({
      version: 1,
      expression: {
        op: "and",
        children: [{
          op: "gate",
          gate: { type: "altcha_pow" },
        }],
      },
    });
  });

  test("serializes Courtyard inventory drafts as gate policy", () => {
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
    }])).toEqual({
      version: 1,
      expression: {
        op: "and",
        children: [{
          op: "gate",
          gate: {
            type: "erc721_inventory_match",
            provider: "courtyard",
            chain_namespace: "eip155:137",
            contract_address: "0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD",
            min_quantity: 5,
            match: {
              category: "watch",
              brand: "Rolex",
              model: "Submariner",
              reference: "124060",
            },
          },
        }],
      },
    });
  });

  test("serializes mainnet Courtyard inventory drafts as gate policy", () => {
    expect(serializeIdentityGateDrafts([{
      gateType: "erc721_inventory_match",
      chainNamespace: "eip155:1",
      contractAddress: " 0xd4ac3CE8e1E14CD60666D49AC34Ff2d2937cF6FA ",
      inventoryProvider: "courtyard",
      minQuantity: 2,
      assetFilter: {
        category: "watch",
        brand: "Rolex",
      },
    }])).toEqual({
      version: 1,
      expression: {
        op: "and",
        children: [{
          op: "gate",
          gate: {
            type: "erc721_inventory_match",
            provider: "courtyard",
            chain_namespace: "eip155:1",
            contract_address: "0xd4ac3CE8e1E14CD60666D49AC34Ff2d2937cF6FA",
            min_quantity: 2,
            match: {
              category: "watch",
              brand: "Rolex",
            },
          },
        }],
      },
    });
  });

  test("serializes minimum age drafts as gate policy", () => {
    expect(serializeIdentityGateDrafts([{
      gateType: "minimum_age",
      provider: "self",
      minimumAge: 30,
    }])).toEqual({
      version: 1,
      expression: {
        op: "and",
        children: [{
          op: "gate",
          gate: {
            type: "minimum_age",
            provider: "self",
            minimum_age: 30,
          },
        }],
      },
    });
  });

  test("serializes Passport wallet score gates as gate policy", () => {
    expect(serializeIdentityGateDrafts([{
      gateType: "wallet_score",
      provider: "passport",
      minimumScore: 20,
    }])).toEqual({
      version: 1,
      expression: {
        op: "and",
        children: [{
          op: "gate",
          gate: {
            type: "wallet_score",
            provider: "passport",
            minimum_score: 20,
          },
        }],
      },
    });
  });

  test("serializes empty nationality drafts as any-nationality Self gates", () => {
    expect(serializeIdentityGateDrafts([{
      gateType: "nationality",
      provider: "self",
      requiredValues: [],
    }])).toEqual({
      version: 1,
      expression: {
        op: "and",
        children: [{
          op: "gate",
          gate: {
            type: "nationality",
            provider: "self",
            allowed: [],
          },
        }],
      },
    });
  });

  test("serializes accepted document proof providers", () => {
    expect(serializeIdentityGateDrafts([{
      gateType: "nationality",
      provider: "self",
      acceptedProviders: ["self", "zkpassport"],
      requiredValues: ["US"],
    }])).toEqual({
      version: 1,
      expression: {
        op: "and",
        children: [{
          op: "gate",
          gate: {
            type: "nationality",
            provider: "self",
            accepted_providers: ["self", "zkpassport"],
            allowed: ["US"],
          },
        }],
      },
    });
  });

  test("wraps in or when mode is any", () => {
    const result = serializeIdentityGateDrafts(
      [
        { gateType: "wallet_score", provider: "passport", minimumScore: 20 },
        { gateType: "minimum_age", provider: "self", minimumAge: 18 },
      ],
      { mode: "any" },
    );
    expect(result == null).toBe(false);
    expect(result!.expression.op).toBe("or");
    const children = (result!.expression as { children: unknown[] }).children;
    expect(children).toHaveLength(2);
  });

  test("serializes proof-of-work OR Very palm scan", () => {
    expect(serializeIdentityGateDrafts(
      [
        { gateType: "altcha_pow" },
        { gateType: "unique_human", provider: "very" },
      ],
      { mode: "any" },
    )).toEqual({
      version: 1,
      expression: {
        op: "or",
        children: [
          { op: "gate", gate: { type: "altcha_pow" } },
          { op: "gate", gate: { type: "unique_human", provider: "very" } },
        ],
      },
    });
  });

  test("preserves an unchanged nested policy instead of flattening it", () => {
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

    expect(serializeIdentityGateDraftsForSave(
      [
        { gateType: "altcha_pow" },
        { gateType: "nationality", provider: "self", requiredValues: ["US"] },
        { gateType: "wallet_score", provider: "passport", minimumScore: 20 },
      ],
      {
        mode: "all",
        preserve: {
          gateDrafts: [
            { gateType: "altcha_pow" },
            { gateType: "nationality", provider: "self", requiredValues: ["US"] },
            { gateType: "wallet_score", provider: "passport", minimumScore: 20 },
          ],
          mode: "all",
          policy: originalPolicy,
        },
      },
    )).toBe(originalPolicy);
  });

  test("serializes the flat editor state once gate drafts change", () => {
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

    expect(serializeIdentityGateDraftsForSave(
      [
        { gateType: "altcha_pow" },
        { gateType: "nationality", provider: "self", requiredValues: ["US", "CA"] },
        { gateType: "wallet_score", provider: "passport", minimumScore: 20 },
      ],
      {
        mode: "all",
        preserve: {
          gateDrafts: [
            { gateType: "altcha_pow" },
            { gateType: "nationality", provider: "self", requiredValues: ["US"] },
            { gateType: "wallet_score", provider: "passport", minimumScore: 20 },
          ],
          mode: "all",
          policy: originalPolicy,
        },
      },
    )).toEqual({
      version: 1,
      expression: {
        op: "and",
        children: [
          { op: "gate", gate: { type: "altcha_pow" } },
          { op: "gate", gate: { type: "nationality", provider: "self", allowed: ["US", "CA"] } },
          { op: "gate", gate: { type: "wallet_score", provider: "passport", minimum_score: 20 } },
        ],
      },
    });
  });

  test("returns null for empty drafts", () => {
    expect(serializeIdentityGateDrafts([])).toBeNull();
  });
});
