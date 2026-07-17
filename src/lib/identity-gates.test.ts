import { describe, expect, test } from "bun:test";
import type { JoinEligibility } from "@pirate/api-contracts";

import {
  isJoinSurfaceGate,
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
});
