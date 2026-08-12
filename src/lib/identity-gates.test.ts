import { describe, expect, test } from "bun:test";
import type { JoinEligibility } from "@pirate/api-contracts";

import {
  isJoinSurfaceGate,
  isPowSatisfiableGate,
  formatGateRequirement,
  getGateFailureMessage,
  getHumanVerificationRequestForProvider,
  getJoinCtaLabel,
  getVerificationCapabilitiesForProvider,
  isJoinCtaActionable,
  normalizeRequestedVerificationCapabilities,
  resolveAvailableHumanVerificationProviders,
} from "./identity-gates";

function walletGateEligibility(): JoinEligibility {
  return {
    gate_evaluation: {
      eligible: false,
      mode: "enforce",
      required_action_set: {
        kind: "set",
        mode: "all",
        items: [{
          capability: "erc721_holding",
          kind: "capability",
        }],
      },
    },
    membership_gate_summaries: [{
      contract_address: "0x1111111111111111111111111111111111111111",
      gate_type: "erc721_holding",
    }],
    status: "verification_required",
  } as JoinEligibility;
}

describe("identity gate join CTA helpers", () => {
  test("wallet-only NFT requirements are actionable", () => {
    const eligibility = walletGateEligibility();

    expect(isJoinCtaActionable(eligibility)).toBe(true);
    expect(getJoinCtaLabel(eligibility, { locale: "en" })).toBe("Connect wallet");
  });

  test("wallet-only balance requirements are actionable and display exact amounts", () => {
    const eligibility = walletGateEligibility();
    eligibility.gate_evaluation!.required_action_set!.items = [{
      capability: "asset_balance",
      kind: "capability",
    }];

    expect(getJoinCtaLabel(eligibility, { locale: "en" })).toBe("Connect wallet");
    expect(formatGateRequirement({
      asset_decimals: 18,
      asset_id: "eip155:1/slip44:60",
      asset_symbol: "ETH",
      gate_type: "asset_balance",
      min_amount_atomic: "500000000000000000",
    }, { locale: "en" })).toBe("At least 0.5 ETH");
  });

  test("proof-of-work requirements are visible before the action modal", () => {
    expect(isJoinSurfaceGate({ gate_type: "altcha_pow" })).toBe(true);
  });

  test("requests unique-human verification from ZKPassport-only gates", () => {
    const eligibility = {
      gate_evaluation: {
        required_action_set: {
          items: [{ capability: "unique_human", kind: "capability" }],
          kind: "set",
          mode: "all",
        },
      },
    } as JoinEligibility;

    expect(getVerificationCapabilitiesForProvider(eligibility, "zkpassport"))
      .toEqual(["unique_human"]);
  });

  test("orders supported ZKPassport capabilities and excludes unsupported ones", () => {
    const eligibility = {
      gate_evaluation: {
        required_action_set: {
          items: [
            { capability: "gender", kind: "capability" },
            { capability: "age_over_18", kind: "capability" },
            { capability: "nationality", kind: "capability" },
            { capability: "unique_human", kind: "capability" },
            { capability: "minimum_age", kind: "capability" },
          ],
          kind: "set",
          mode: "all",
        },
      },
    } as JoinEligibility;

    expect(getVerificationCapabilitiesForProvider(eligibility, "zkpassport"))
      .toEqual(["unique_human", "minimum_age", "nationality", "gender"]);
  });

  test("uses one provider vocabulary for planning and launch-boundary normalization", () => {
    const input = ["gender", "minimum_age", "unique_human", "age_over_18", "nationality"];

    expect(normalizeRequestedVerificationCapabilities("self", input))
      .toEqual(["unique_human", "age_over_18", "nationality", "gender"]);
    expect(normalizeRequestedVerificationCapabilities("zkpassport", input))
      .toEqual(["unique_human", "minimum_age", "nationality", "gender"]);
    expect(normalizeRequestedVerificationCapabilities("very", input))
      .toEqual(["unique_human"]);
  });

  test("keeps mixed-provider any branches available", () => {
    const eligibility = {
      gate_evaluation: {
        required_action_set: {
          items: [
            {
              accepted_providers: ["self"],
              allowed_countries: ["USA"],
              capability: "nationality",
              kind: "action",
              provider: "self",
            },
            {
              capability: "unique_human",
              kind: "action",
              provider: "very",
            },
          ],
          kind: "set",
          mode: "any",
        },
      },
    } as JoinEligibility;

    expect(resolveAvailableHumanVerificationProviders(eligibility))
      .toEqual(["self", "very"]);
    expect(getHumanVerificationRequestForProvider(eligibility, "self"))
      .toEqual({
        requestedCapabilities: ["nationality"],
        verificationRequirements: [{ proof_type: "nationality", required_values: ["USA"] }],
      });
    expect(getHumanVerificationRequestForProvider(eligibility, "very"))
      .toEqual({
        requestedCapabilities: ["unique_human"],
        verificationRequirements: [],
      });
  });

  test("keeps heterogeneous all branches sequentially actionable", () => {
    const eligibility = {
      gate_evaluation: {
        required_action_set: {
          items: [
            {
              accepted_providers: ["self"],
              allowed_countries: ["USA"],
              capability: "nationality",
              kind: "action",
              provider: "self",
            },
            {
              capability: "unique_human",
              kind: "action",
              provider: "very",
            },
          ],
          kind: "set",
          mode: "all",
        },
      },
    } as JoinEligibility;

    expect(resolveAvailableHumanVerificationProviders(eligibility))
      .toEqual(["self", "very"]);
    expect(getVerificationCapabilitiesForProvider(eligibility, "self"))
      .toEqual(["nationality"]);
    expect(getVerificationCapabilitiesForProvider(eligibility, "very"))
      .toEqual(["unique_human"]);
  });

  test("selects one any branch without requesting unrelated disclosures", () => {
    const eligibility = {
      gate_evaluation: {
        required_action_set: {
          items: [
            {
              accepted_providers: ["self"],
              allowed_countries: ["USA"],
              capability: "nationality",
              kind: "action",
              provider: "self",
            },
            {
              capability: "unique_human",
              kind: "action",
              provider: "self",
            },
          ],
          kind: "set",
          mode: "any",
        },
      },
    } as JoinEligibility;

    expect(getHumanVerificationRequestForProvider(eligibility, "self"))
      .toEqual({
        requestedCapabilities: ["unique_human"],
        verificationRequirements: [],
      });
  });

  test("prefers a complete nested alternative over a partial branch", () => {
    const eligibility = {
      gate_evaluation: {
        required_action_set: {
          items: [
            {
              items: [
                {
                  accepted_providers: ["self"],
                  allowed_countries: ["USA"],
                  capability: "nationality",
                  kind: "action",
                  provider: "self",
                },
                {
                  capability: "unique_human",
                  kind: "action",
                  provider: "very",
                },
              ],
              kind: "set",
              mode: "all",
            },
            {
              capability: "unique_human",
              kind: "action",
              provider: "self",
            },
          ],
          kind: "set",
          mode: "any",
        },
      },
    } as JoinEligibility;

    expect(getHumanVerificationRequestForProvider(eligibility, "self"))
      .toEqual({
        requestedCapabilities: ["unique_human"],
        verificationRequirements: [],
      });
  });

  test("explains an insufficient balance instead of falling back to generic copy", () => {
    // Before the API reported asset_balance_too_low this reached the default
    // branch and rendered the generic "gate failed" description.
    expect(getGateFailureMessage({ failure_reason: "asset_balance_too_low" }, { locale: "en" }))
      .toBe("Your connected wallets do not hold enough of the required asset to join this community.");
    expect(getGateFailureMessage({ failure_reason: "asset_balance_too_low" }, { locale: "ar" })).toBeTruthy();
    expect(getGateFailureMessage({ failure_reason: "asset_balance_too_low" }, { locale: "zh" })).toBeTruthy();
  });
  test("a browser check alone satisfies an any-mode gate but not an all-mode one", () => {
    const pow = { gate_type: "altcha_pow" } as const;
    const human = { gate_type: "unique_human" } as const;
    // The dankmeme shape: any one branch admits, and anyone clears the check.
    expect(isPowSatisfiableGate([pow, human], "any")).toBe(true);
    expect(isPowSatisfiableGate([pow], "all")).toBe(true);
    expect(isPowSatisfiableGate([pow, human], "all")).toBe(false);
    expect(isPowSatisfiableGate([human], "any")).toBe(false);
    expect(isPowSatisfiableGate([], "any")).toBe(false);
    expect(isPowSatisfiableGate(null)).toBe(false);
  });
});
