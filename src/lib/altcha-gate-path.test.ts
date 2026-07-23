import { describe, expect, test } from "bun:test";
import type { JoinEligibility, MembershipGateSummary } from "@pirate/api-contracts";

import { canSatisfyGateWithAltchaOnly } from "./altcha-gate-path";

const requirements = [
  { gate_type: "altcha_pow" },
  { gate_type: "unique_human" },
] as MembershipGateSummary[];

function eligibility(requiredActionSet: object): JoinEligibility {
  return {
    gate_evaluation: {
      required_action_set: requiredActionSet,
    },
    membership_gate_summaries: requirements,
    status: "verification_required",
  } as JoinEligibility;
}

describe("canSatisfyGateWithAltchaOnly", () => {
  test("accepts a proof-of-work branch in an OR gate", () => {
    expect(canSatisfyGateWithAltchaOnly({
      eligibility: eligibility({
        items: [
          { capability: "altcha_pow", kind: "capability" },
          { capability: "unique_human", kind: "capability" },
        ],
        kind: "set",
        mode: "any",
      }),
      requirements,
    })).toBe(true);
  });

  test("rejects proof-of-work when another capability is also required", () => {
    expect(canSatisfyGateWithAltchaOnly({
      eligibility: eligibility({
        items: [
          { capability: "altcha_pow", kind: "capability" },
          { capability: "unique_human", kind: "capability" },
        ],
        kind: "set",
        mode: "all",
      }),
      requirements,
    })).toBe(false);
  });
});
