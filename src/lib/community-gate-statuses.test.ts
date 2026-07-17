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
});
