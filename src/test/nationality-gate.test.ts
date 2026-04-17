import { describe, expect, test } from "bun:test";
import {
  formatGateRequirement,
  getGateFailureMessage,
  getJoinCtaLabel,
  getVerificationPromptCopy,
  isJoinCtaActionable,
} from "../lib/identity-gates";
import type { MembershipGateSummary, JoinEligibility, GateFailureDetails } from "@pirate/api-contracts";

describe("formatGateRequirement", () => {
  test("formats nationality gate with known country code", () => {
    const gate: MembershipGateSummary = { gate_type: "nationality", required_value: "US" };
    expect(formatGateRequirement(gate)).toContain("United States");
  });

  test("formats unknown country code as raw code", () => {
    const gate: MembershipGateSummary = { gate_type: "nationality", required_value: "XX" };
    expect(formatGateRequirement(gate)).toContain("XX");
  });

  test("formats non-nationality gate generically", () => {
    const gate: MembershipGateSummary = { gate_type: "unique_human" };
    expect(formatGateRequirement(gate)).toBe("Requires unique human verification");
  });

  test("formats gender gate generically for public previews", () => {
    const gate: MembershipGateSummary = { gate_type: "gender", required_value: "F" };
    expect(formatGateRequirement(gate)).toBe("Verify with ID");
  });

  test("formats gender gate with exact marker for admin surfaces", () => {
    const gate: MembershipGateSummary = { gate_type: "gender", required_value: "F" };
    expect(formatGateRequirement(gate, { audience: "admin" })).toBe("Requires Self document marker F");
  });
});

describe("getJoinCtaLabel", () => {
  test("returns Join for joinable", () => {
    const e = { status: "joinable" } as JoinEligibility;
    expect(getJoinCtaLabel(e)).toBe("Join");
  });

  test("returns Request to Join for requestable", () => {
    const e = { status: "requestable" } as JoinEligibility;
    expect(getJoinCtaLabel(e)).toBe("Request to Join");
  });

  test("returns Verify to Join for verification_required", () => {
    const e = { status: "verification_required" } as JoinEligibility;
    expect(getJoinCtaLabel(e)).toBe("Verify to Join");
  });

  test("returns Not eligible for gate_failed", () => {
    const e = { status: "gate_failed" } as JoinEligibility;
    expect(getJoinCtaLabel(e)).toBe("Not eligible");
  });
});

describe("isJoinCtaActionable", () => {
  test("actionable for joinable", () => {
    const e = { status: "joinable" } as JoinEligibility;
    expect(isJoinCtaActionable(e)).toBe(true);
  });

  test("actionable for requestable", () => {
    const e = { status: "requestable" } as JoinEligibility;
    expect(isJoinCtaActionable(e)).toBe(true);
  });

  test("actionable for verification_required", () => {
    const e = { status: "verification_required" } as JoinEligibility;
    expect(isJoinCtaActionable(e)).toBe(true);
  });

  test("not actionable for gate_failed", () => {
    const e = { status: "gate_failed" } as JoinEligibility;
    expect(isJoinCtaActionable(e)).toBe(false);
  });

  test("not actionable for already_joined", () => {
    const e = { status: "already_joined" } as JoinEligibility;
    expect(isJoinCtaActionable(e)).toBe(false);
  });
});

describe("getVerificationPromptCopy", () => {
  test("describes self document marker verification clearly", () => {
    expect(getVerificationPromptCopy("self", ["gender"]).title).toBe("Verify with ID");
  });

  test("collapses unique human when a richer self capability is present", () => {
    const description = getVerificationPromptCopy("self", ["unique_human", "nationality"]).description;
    expect(description.includes("unique human")).toBe(false);
  });
});

describe("getGateFailureMessage", () => {
  test("formats gender mismatch copy", () => {
    const details = { failure_reason: "gender_mismatch" } as GateFailureDetails;
    expect(getGateFailureMessage(details)).toContain("ID check");
  });
});
