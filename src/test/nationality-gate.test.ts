import { describe, expect, test } from "bun:test";
import {
  formatGateRequirement,
  getGateFailureMessage,
  getJoinCtaLabel,
  getSelfVerificationRequestForGates,
  getVerificationPromptCopy,
  hasSelfDocumentFactVerificationRequest,
  isJoinCtaActionable,
  resolveSuggestedVerificationProvider,
} from "../lib/identity-gates";
import type { MembershipGateSummary, JoinEligibility, GateFailureDetails, VerificationCapabilities } from "@pirate/api-contracts";

const unverifiedCapabilities: VerificationCapabilities = {
  unique_human: { state: "unverified" },
  age_over_18: { state: "unverified" },
  minimum_age: { state: "unverified" },
  nationality: { state: "unverified" },
  gender: { state: "unverified" },
  wallet_score: { state: "unverified" },
};

describe("formatGateRequirement", () => {
  test("formats nationality gate with known country code", () => {
    const gate: MembershipGateSummary = { gate_type: "nationality", required_value: "US" };
    expect(formatGateRequirement(gate)).toContain("United States");
  });

  test("formats nationality gate without country values as verification", () => {
    const gate: MembershipGateSummary = { gate_type: "nationality" };
    expect(formatGateRequirement(gate)).toBe("Nationality verification");
  });

  test("formats nationality gate with localized country name", () => {
    const gate: MembershipGateSummary = { gate_type: "nationality", required_value: "PS" };
    expect(formatGateRequirement(gate, { locale: "ar" })).toContain("فلسطين");
  });

  test("formats gate copy with regional locale tags", () => {
    const gate: MembershipGateSummary = { gate_type: "unique_human" };
    expect(formatGateRequirement(gate, { locale: "ar-SA" })).toBe("يتطلب التحقق من أنك إنسان");
    expect(formatGateRequirement(gate, { locale: "zh-CN" })).toBe("需要真人验证");
  });

  test("formats nationality gate with country name and code for admin surfaces", () => {
    const gate: MembershipGateSummary = { gate_type: "nationality", required_value: "US" };
    expect(formatGateRequirement(gate, { audience: "admin" })).toContain("United States (US)");
  });

  test("formats unknown country code as raw code", () => {
    const gate: MembershipGateSummary = { gate_type: "nationality", required_value: "XX" };
    expect(formatGateRequirement(gate)).toContain("XX");
  });

  test("formats unique human gate without provider jargon", () => {
    const gate: MembershipGateSummary = { gate_type: "unique_human" };
    expect(formatGateRequirement(gate)).toBe("Real person check");
  });

  test("formats Very unique human gate as palm scan", () => {
    const gate: MembershipGateSummary = { gate_type: "unique_human" };
    expect(formatGateRequirement(gate, { provider: "very" })).toBe("Palm scan");
  });

  test("formats gender gate generically for public previews", () => {
    const gate: MembershipGateSummary = { gate_type: "gender", required_value: "F" };
    expect(formatGateRequirement(gate)).toBe("ID check");
  });

  test("formats gender gate with exact marker for admin surfaces", () => {
    const gate: MembershipGateSummary = { gate_type: "gender", required_value: "F" };
    expect(formatGateRequirement(gate, { audience: "admin" })).toBe("Requires document sex marker F");
  });

  test("formats Courtyard inventory match gate", () => {
    const gate: MembershipGateSummary = {
      gate_type: "erc721_inventory_match",
      inventory_provider: "courtyard",
      min_quantity: 3,
      asset_filter_label: "Pokemon Charizard",
      asset_category: "trading_card",
    };
    expect(formatGateRequirement(gate)).toBe("3 Courtyard Pokemon Charizard");
  });

  test("formats wallet score gate with threshold", () => {
    const gate: MembershipGateSummary = { gate_type: "wallet_score", minimum_score: 20 };
    expect(formatGateRequirement(gate)).toBe("Passport Score 20+");
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

  test("returns Request submitted for pending_request", () => {
    const e = { status: "pending_request" } as JoinEligibility;
    expect(getJoinCtaLabel(e)).toBe("Request submitted");
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

  test("not actionable for pending_request", () => {
    const e = { status: "pending_request" } as JoinEligibility;
    expect(isJoinCtaActionable(e)).toBe(false);
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

  test("localizes verification prompt copy", () => {
    expect(getVerificationPromptCopy("self", ["nationality"], { locale: "ar" }).title).toBe("تحقق بالهوية");
  });

  test("localizes verification prompt copy with regional locale tags", () => {
    expect(getVerificationPromptCopy("self", ["nationality"], { locale: "ar-SA" }).title).toBe("تحقق بالهوية");
    expect(getVerificationPromptCopy("self", ["nationality"], { locale: "zh-CN" }).title).toBe("使用身份证件验证");
  });

  test("collapses unique human when a richer self capability is present", () => {
    const description = getVerificationPromptCopy("self", ["unique_human", "nationality"]).description;
    expect(description.includes("unique human")).toBe(false);
  });

  test("describes Passport score remediation", () => {
    expect(getVerificationPromptCopy("passport", ["wallet_score"]).title).toBe("Score Too Low");
  });

});

describe("resolveSuggestedVerificationProvider", () => {
  test("defaults unique human remediation to Very when the API does not suggest a provider", () => {
    expect(resolveSuggestedVerificationProvider({
      membership_gate_summaries: [],
      gate_evaluation: {
        passed: false,
        trace: { kind: "op", op: "and", passed: false, children: [] },
        required_action_set: {
          kind: "set",
          mode: "all",
          items: [{ kind: "action", provider: "very", capability: "unique_human" }],
        },
      },
    })).toBe("very");
  });

  test("keeps document fact remediation on Self", () => {
    expect(resolveSuggestedVerificationProvider({
      membership_gate_summaries: [{ gate_type: "nationality", accepted_providers: ["self"] }],
      gate_evaluation: {
        passed: false,
        trace: { kind: "op", op: "and", passed: false, children: [] },
        required_action_set: {
          kind: "set",
          mode: "all",
          items: [{ kind: "action", provider: "self", capability: "nationality", allowed_countries: ["US"] }],
        },
      },
    })).toBe("self");
  });
});

describe("getSelfVerificationRequestForGates", () => {
  test("requests nationality disclosure for nationality-gated posting when nationality is not verified", () => {
    const request = getSelfVerificationRequestForGates({
      gates: [{ gate_type: "nationality", required_value: "US" }],
      includeUniqueHuman: true,
      verificationCapabilities: {
        ...unverifiedCapabilities,
        unique_human: { state: "verified", provider: "self", proof_type: "unique_human" },
      },
    });

    expect(request).toEqual({
      requestedCapabilities: ["nationality"],
      verificationRequirements: [{ proof_type: "nationality", required_values: ["USA"] }],
    });
  });

  test("does not request nationality disclosure when the verified nationality satisfies the gate", () => {
    const request = getSelfVerificationRequestForGates({
      gates: [{ gate_type: "nationality", required_values: ["US", "CA"] }],
      includeUniqueHuman: true,
      verificationCapabilities: {
        ...unverifiedCapabilities,
        unique_human: { state: "verified", provider: "self", proof_type: "unique_human" },
        nationality: { state: "verified", provider: "self", proof_type: "nationality", value: "US" },
      },
    });

    expect(request).toEqual({
      requestedCapabilities: [],
      verificationRequirements: [],
    });
  });

  test("matches verified ISO-3 nationality against an ISO-2 gate", () => {
    const request = getSelfVerificationRequestForGates({
      gates: [{ gate_type: "nationality", required_value: "US" }],
      includeUniqueHuman: true,
      verificationCapabilities: {
        ...unverifiedCapabilities,
        unique_human: { state: "verified", provider: "self", proof_type: "unique_human" },
        nationality: { state: "verified", provider: "self", proof_type: "nationality", value: "USA" },
      },
    });

    expect(request).toEqual({
      requestedCapabilities: [],
      verificationRequirements: [],
    });
  });

  test("combines unique human, nationality, and minimum age requirements for Self", () => {
    const request = getSelfVerificationRequestForGates({
      gates: [
        { gate_type: "nationality", required_value: "US" },
        { gate_type: "minimum_age", required_minimum_age: 21 },
      ],
      includeUniqueHuman: true,
      verificationCapabilities: unverifiedCapabilities,
    });

    expect(request).toEqual({
      requestedCapabilities: ["unique_human", "nationality"],
      verificationRequirements: [
        { proof_type: "minimum_age", minimum_age: 21 },
        { proof_type: "nationality", required_values: ["USA"] },
      ],
    });
  });
});

describe("hasSelfDocumentFactVerificationRequest", () => {
  test("uses Self before Very when a nationality gate also needs unique human", () => {
    expect(hasSelfDocumentFactVerificationRequest({
      requestedCapabilities: ["unique_human", "nationality"],
      verificationRequirements: [],
    })).toBe(true);
  });

  test("leaves unique-human-only posting verification on the Very path", () => {
    expect(hasSelfDocumentFactVerificationRequest({
      requestedCapabilities: ["unique_human"],
      verificationRequirements: [],
    })).toBe(false);
  });
});

describe("getGateFailureMessage", () => {
  test("formats gender mismatch copy", () => {
    const details = { failure_reason: "gender_mismatch" } as GateFailureDetails;
    expect(getGateFailureMessage(details)).toContain("ID check");
  });

  test("formats Courtyard provider outage copy", () => {
    const details = { failure_reason: "token_inventory_unavailable" } as GateFailureDetails;
    expect(getGateFailureMessage(details)).toContain("could not be checked");
  });

  test("formats wallet score mismatch copy", () => {
    const details = { failure_reason: "wallet_score_too_low" } as GateFailureDetails;
    expect(getGateFailureMessage(details)).toContain("Passport score");
  });
});
