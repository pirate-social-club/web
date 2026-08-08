import { describe, expect, test } from "bun:test";
import type { CommunityHandlePolicy, GatePolicy } from "@pirate/api-contracts";

import {
  buildHandlePolicyDraft,
  buildHandlePolicySavePayload,
  isLabelClaimRuleDraftSavable,
  parseLabelClaimRuleLabels,
} from "./use-community-handle-policy-state";

const expression: GatePolicy = {
  version: 1,
  expression: {
    op: "gate",
    gate: {
      type: "erc721_holding",
      chain_namespace: "eip155:1",
      contract_address: "0x1111111111111111111111111111111111111111",
      min_quantity: "1",
    },
  },
};

describe("community handle claim eligibility policy", () => {
  test("round-trips an explicit namespace gate at claim time", () => {
    const draft = buildHandlePolicyDraft({
      claims_enabled: true,
      claim_gate_mode: "explicit",
      claim_gate_expression_ref: "gate_ref",
      claim_gate_expression: expression,
      eligibility_timing: "claim_time",
      policy_template: "standard",
      pricing_model: "flat_by_length",
      settings: {},
    } as CommunityHandlePolicy);

    expect(buildHandlePolicySavePayload(draft)).toMatchObject({
      claim_gate_mode: "explicit",
      claim_gate_expression: expression,
      eligibility_timing: "claim_time",
    });
  });

  test("clears an explicit expression when community requirements are inherited", () => {
    const draft = buildHandlePolicyDraft(null);
    draft.claimGateMode = "inherit_community";
    draft.claimGateTreeDraft = buildHandlePolicyDraft({
      claim_gate_mode: "explicit",
      claim_gate_expression: expression,
    } as CommunityHandlePolicy).claimGateTreeDraft;

    expect(buildHandlePolicySavePayload(draft)).toMatchObject({
      claim_gate_mode: "inherit_community",
      claim_gate_expression: null,
      eligibility_timing: "claim_time",
    });
  });

  test("round-trips per-label claim rules and serializes selectors from array order", () => {
    const draft = buildHandlePolicyDraft({
      claims_enabled: true,
      claim_gate_mode: "none",
      claim_gate_expression_ref: null,
      claim_gate_expression: null,
      eligibility_timing: "claim_time",
      policy_template: "standard",
      pricing_model: "flat_by_length",
      label_claim_rules: [
        {
          id: "hlcr_1",
          position: 0,
          selector: { type: "exact", labels: ["charizard", "gengar"] },
          claim_gate_expression: expression,
        },
        {
          id: "hlcr_2",
          position: 1,
          selector: { type: "any", labels: null },
          claim_gate_expression: expression,
        },
      ],
      settings: {},
    } as CommunityHandlePolicy);

    expect(draft.labelClaimRules).toHaveLength(2);
    expect(draft.labelClaimRules[0]?.labelsText).toBe("charizard, gengar");
    expect(draft.labelClaimRules[1]?.selectorType).toBe("any");

    const payload = buildHandlePolicySavePayload(draft);
    expect(payload.label_claim_rules).toEqual([
      {
        id: "hlcr_1",
        selector: { type: "exact", labels: ["charizard", "gengar"] },
        claim_gate_expression: expression,
      },
      {
        id: "hlcr_2",
        selector: { type: "any", labels: null },
        claim_gate_expression: expression,
      },
    ]);
  });

  test("normalizes and validates exact selector labels", () => {
    expect(parseLabelClaimRuleLabels("Charizard, @gengar\n charizard ")).toEqual([
      "charizard",
      "gengar",
    ]);
    expect(isLabelClaimRuleDraftSavable({
      key: "k",
      selectorType: "exact",
      labelsText: "Not A Label!",
      gateTreeDraft: buildHandlePolicyDraft(null).claimGateTreeDraft,
    })).toBe(false);
  });
});
