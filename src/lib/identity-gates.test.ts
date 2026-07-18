import { describe, expect, test } from "bun:test";
import type { JoinEligibility } from "@pirate/api-contracts";

import {
  isJoinSurfaceGate,
  isPowSatisfiableGate,
  formatGateRequirement,
  getGateFailureMessage,
  getJoinCtaLabel,
  isJoinCtaActionable,
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