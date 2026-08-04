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
  resolveAvailableHumanVerificationProviders,
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
    expect(formatGateRequirement(gate, { locale: "ar-SA" })).toBe("إثبات أنك إنسان");
    expect(formatGateRequirement(gate, { locale: "zh-CN" })).toBe("真人证明");
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
    expect(formatGateRequirement(gate)).toBe("Human proof");
  });

  test("formats Self unique human gate with the provider name", () => {
    const gate: MembershipGateSummary = { accepted_providers: ["self"], gate_type: "unique_human" };
    expect(formatGateRequirement(gate)).toBe("Self.xyz ID proof");
  });

  test("formats ZKPassport unique human gate distinctly", () => {
    const gate: MembershipGateSummary = { accepted_providers: ["zkpassport"], gate_type: "unique_human" };
    expect(formatGateRequirement(gate)).toBe("ZKPassport proof");
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
    expect(formatGateRequirement(gate)).toBe("Passport.xyz score 20+");
  });

  test("keeps compact sidebar labels behind the shared formatter", () => {
    expect(formatGateRequirement(
      { gate_type: "altcha_pow" },
      { presentation: "compact" },
    )).toBe("Proof of work");
    expect(formatGateRequirement(
      { gate_type: "erc721_holding", min_quantity: 2, contract_address: "0x1111111111111111111111111111111111111111" },
      { presentation: "compact" },
    )).toBe("2 Ethereum NFTs from 0x1111...1111");
    expect(formatGateRequirement(
      { gate_type: "erc721_inventory_match", min_quantity: 3, asset_category: "trading_card" },
      { presentation: "compact" },
    )).toBe("3 Courtyard cards");
    expect(formatGateRequirement(
      { gate_type: "asset_balance" },
      { presentation: "compact" },
    )).toBe("Token balance required");
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

  test("does not invent an identity provider for ALTCHA-only requirements", () => {
    expect(resolveSuggestedVerificationProvider({
      membership_gate_summaries: [{ gate_type: "altcha_pow" }],
      gate_evaluation: {
        passed: false,
        trace: { kind: "op", op: "and", passed: false, children: [] },
        required_action_set: {
          kind: "set",
          mode: "all",
          items: [{ kind: "action", provider: "altcha", capability: "altcha_pow", scope: "community_join" }],
        },
      },
    })).toBeNull();
  });

  test("does not invent a Very provider for ambiguous unique-human requirements", () => {
    const eligibility = {
      membership_gate_summaries: [{ gate_type: "unique_human", accepted_providers: [] }],
      gate_evaluation: null,
      missing_capabilities: ["unique_human"],
    } as const;
    expect(resolveSuggestedVerificationProvider(eligibility)).toBeNull();
    expect(resolveAvailableHumanVerificationProviders(eligibility))
      .toEqual(["self", "zkpassport", "very"]);
  });

  test("uses an explicit community preference without changing available choices", () => {
    const eligibility = {
      membership_gate_summaries: [{ gate_type: "unique_human", accepted_providers: [] }],
      gate_evaluation: null,
      missing_capabilities: ["unique_human"],
      preferred_verification_provider: "very",
    } as const;
    expect(resolveSuggestedVerificationProvider(eligibility)).toBe("very");
    expect(resolveAvailableHumanVerificationProviders(eligibility))
      .toEqual(["very", "self", "zkpassport"]);
  });

  test("offers both supported document providers instead of silently choosing Self", () => {
    const eligibility = {
      membership_gate_summaries: [{
        gate_type: "nationality",
        accepted_providers: ["self", "zkpassport"],
      }],
      gate_evaluation: null,
      missing_capabilities: ["nationality"],
    } as const;
    expect(resolveSuggestedVerificationProvider(eligibility)).toBeNull();
    expect(resolveAvailableHumanVerificationProviders(eligibility))
      .toEqual(["self", "zkpassport"]);
  });

  test("intersects providers across required capabilities", () => {
    expect(resolveAvailableHumanVerificationProviders({
      membership_gate_summaries: [
        { gate_type: "unique_human", accepted_providers: [] },
        { gate_type: "nationality", accepted_providers: ["self", "zkpassport"] },
      ],
      gate_evaluation: null,
      missing_capabilities: ["unique_human", "nationality"],
    })).toEqual(["self", "zkpassport"]);
  });

  test("uses an explicitly accepted ZKPassport unique-human provider", () => {
    expect(resolveSuggestedVerificationProvider({
      membership_gate_summaries: [{ gate_type: "unique_human", accepted_providers: ["zkpassport"] }],
      gate_evaluation: null,
      missing_capabilities: ["unique_human"],
    })).toBe("zkpassport");
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
