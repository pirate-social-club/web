import { describe, expect, test } from "bun:test";
import type { JoinEligibility, MembershipGateSummary } from "@pirate/api-contracts";

import { deriveGateStatuses } from "./community-gate-statuses";

const requirements = [
  { gate_type: "unique_human" },
  { gate_type: "wallet_score" },
] satisfies Array<Pick<MembershipGateSummary, "gate_type">>;

type GateTrace = NonNullable<NonNullable<JoinEligibility["gate_evaluation"]>["trace"]>;

function eligibilityWithTrace(
  trace: GateTrace,
  status: JoinEligibility["status"] = "verification_required",
): JoinEligibility {
  return {
    community: "cmt_trace_fixture",
    membership_mode: "gated",
    human_verification_lane: "self",
    joinable_now: status === "joinable",
    status,
    membership_gate_summaries: [],
    gate_evaluation: {
      passed: trace.passed,
      trace,
      required_action_set: null,
    },
  };
}

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

  test("mutes unused alternatives inside a satisfied OR", () => {
    expect(deriveGateStatuses({
      eligibility: eligibilityWithTrace({
        kind: "op",
        op: "or",
        passed: true,
        children: [
          { kind: "gate", gate_type: "wallet_score", passed: false },
          { kind: "gate", gate_type: "asset_balance", passed: true },
        ],
      }, "joinable"),
      requirements: [{ gate_type: "wallet_score" }, { gate_type: "asset_balance" }],
    })).toEqual(["unknown", "met"]);
  });

  test("marks alternatives unmet when the OR itself failed", () => {
    expect(deriveGateStatuses({
      eligibility: eligibilityWithTrace({
        kind: "op",
        op: "or",
        passed: false,
        children: [
          { kind: "gate", gate_type: "wallet_score", passed: false },
          { kind: "gate", gate_type: "asset_balance", passed: false },
        ],
      }),
      requirements: [{ gate_type: "wallet_score" }, { gate_type: "asset_balance" }],
    })).toEqual(["unmet", "unmet"]);
  });

  test("derives nested AND/OR leaves structurally", () => {
    expect(deriveGateStatuses({
      eligibility: eligibilityWithTrace({
        kind: "op",
        op: "and",
        passed: true,
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
      }, "joinable"),
      requirements: [
        { gate_type: "unique_human" },
        { gate_type: "wallet_score" },
        { gate_type: "asset_balance" },
      ],
    })).toEqual(["met", "unknown", "met"]);
  });

  test("keeps unmatched real rows unknown once a trace exists", () => {
    expect(deriveGateStatuses({
      eligibility: eligibilityWithTrace({ kind: "gate", gate_type: "unique_human", passed: true }, "joinable"),
      requirements: [{ gate_type: "unique_human" }, { gate_type: "wallet_score" }],
    })).toEqual(["met", "unknown"]);
  });

  test("does not let a synthetic age row consume a policy minimum-age leaf", () => {
    expect(deriveGateStatuses({
      eligibility: eligibilityWithTrace({ kind: "gate", gate_type: "minimum_age", passed: false }),
      requirements: [
        { gate_type: "age_over_18", trace_match: false },
        { gate_type: "minimum_age" },
      ],
    })).toEqual(["met", "unmet"]);
  });

  test("classifies enumerated provider and evaluator outages as unknown", () => {
    for (const reason of [
      "ethereum_rpc_not_configured",
      "token_inventory_unavailable",
      "unsupported_gate_config",
      "unsupported_chain_namespace",
      "unsupported_gate_type:future_gate",
      "asset_balance_unavailable",
    ]) {
      expect(deriveGateStatuses({
        eligibility: eligibilityWithTrace({ kind: "gate", gate_type: "asset_balance", passed: false, reason }),
        requirements: [{ gate_type: "asset_balance" }],
      })).toEqual(["unknown"]);
    }
  });
});
