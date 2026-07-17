import { describe, expect, test } from "bun:test";
import type { CommunityHandlePolicy, GatePolicy } from "@pirate/api-contracts";

import {
  buildHandlePolicyDraft,
  buildHandlePolicySavePayload,
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
});
