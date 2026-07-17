import { describe, expect, test } from "bun:test";
import type { JoinEligibility, MembershipGateSummary } from "@pirate/api-contracts";

import { deriveGateStatuses } from "./community-gate-statuses";

const requirements = [
  { gate_type: "unique_human" },
  { gate_type: "wallet_score" },
] satisfies Array<Pick<MembershipGateSummary, "gate_type">>;

describe("deriveGateStatuses", () => {
  test("keeps satisfied any-mode gates muted instead of marking every alternative met", () => {
    expect(deriveGateStatuses({
      eligibility: { status: "joinable" } as JoinEligibility,
      gateMatchMode: "any",
      requirements,
    })).toEqual(["unknown", "unknown"]);
  });

  test("marks satisfied all-mode gates as met", () => {
    expect(deriveGateStatuses({
      eligibility: { status: "joinable" } as JoinEligibility,
      gateMatchMode: "all",
      requirements,
    })).toEqual(["met", "met"]);
  });

  test("marks missing all-mode required actions as unmet", () => {
    expect(deriveGateStatuses({
      eligibility: {
        status: "verification_required",
        gate_evaluation: {
          required_action_set: {
            kind: "set",
            mode: "all",
            items: [{ kind: "action", provider: "very", capability: "unique_human" }],
          },
        },
      } as JoinEligibility,
      gateMatchMode: "all",
      requirements,
    })).toEqual(["unmet", "met"]);
  });

  test("uses nested trace leaves instead of flattening mixed AND/OR outcomes", () => {
    expect(deriveGateStatuses({
      eligibility: {
        status: "verification_required",
        gate_evaluation: {
          passed: false,
          trace: {
            kind: "op",
            op: "and",
            passed: false,
            children: [
              { kind: "gate", gate_type: "unique_human", passed: true },
              {
                kind: "op",
                op: "or",
                passed: true,
                children: [
                  { kind: "gate", gate_type: "wallet_score", passed: false },
                  { kind: "gate", gate_type: "asset_balance", passed: true },
                ],
              },
            ],
          },
          required_action_set: null,
        },
      } as JoinEligibility,
      gateMatchMode: "all",
      requirements: [
        { gate_type: "unique_human" },
        { gate_type: "wallet_score" },
        { gate_type: "asset_balance" },
      ],
    })).toEqual(["met", "unmet", "met"]);
  });

  test("matches repeated gate types in trace order", () => {
    expect(deriveGateStatuses({
      eligibility: {
        status: "verification_required",
        gate_evaluation: {
          passed: false,
          trace: {
            kind: "op",
            op: "and",
            passed: false,
            children: [
              { kind: "gate", gate_type: "nationality", passed: true },
              { kind: "gate", gate_type: "nationality", passed: false },
            ],
          },
          required_action_set: null,
        },
      } as JoinEligibility,
      requirements: [{ gate_type: "nationality" }, { gate_type: "nationality" }],
    })).toEqual(["met", "unmet"]);
  });

  test("renders provider outages as unknown rather than unmet", () => {
    expect(deriveGateStatuses({
      eligibility: {
        status: "verification_required",
        gate_evaluation: {
          passed: false,
          trace: {
            kind: "gate",
            gate_type: "asset_balance",
            passed: false,
            reason: "provider_unavailable",
          },
          required_action_set: null,
        },
      } as JoinEligibility,
      requirements: [{ gate_type: "asset_balance" }],
    })).toEqual(["unknown"]);
  });
});
