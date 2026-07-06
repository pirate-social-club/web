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
});
