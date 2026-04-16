import { describe, expect, test } from "bun:test";
import { formatGateRequirement, getJoinCtaLabel, isJoinCtaActionable } from "../lib/nationality-gate";
import type { MembershipGateSummary, JoinEligibility } from "@pirate/api-contracts";

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
    expect(formatGateRequirement(gate)).toContain("unique_human");
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
