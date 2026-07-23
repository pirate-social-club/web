import type { JoinEligibility, MembershipGateSummary } from "@pirate/api-contracts";

import { getMissingCapabilitiesFromGateEvaluation } from "@/lib/identity-gates";

type RequiredActionNode = Omit<
  NonNullable<NonNullable<JoinEligibility["gate_evaluation"]>["required_action_set"]>["items"][number],
  "items"
> & {
  items?: RequiredActionNode[];
};

function actionNodeHasAltchaOnlyPath(action: RequiredActionNode): boolean {
  if (action.kind !== "set") {
    return action.capability === "altcha_pow";
  }

  const items = action.items ?? [];
  if (items.length === 0) return false;
  if (action.mode === "any") return items.some(actionNodeHasAltchaOnlyPath);
  return items.every(actionNodeHasAltchaOnlyPath);
}

export function canSatisfyGateWithAltchaOnly(input: {
  eligibility: JoinEligibility;
  gateMatchMode?: "all" | "any" | null;
  requirements: MembershipGateSummary[];
}): boolean {
  const actionSet = input.eligibility.gate_evaluation
    ?.required_action_set as RequiredActionNode | null | undefined;
  if (actionSet) return actionNodeHasAltchaOnlyPath(actionSet);

  const missingCapabilities = getMissingCapabilitiesFromGateEvaluation(input.eligibility);
  if (missingCapabilities.length > 0) {
    return missingCapabilities.every((capability) => capability === "altcha_pow");
  }

  const hasAltcha = input.requirements.some((summary) => summary.gate_type === "altcha_pow");
  if (!hasAltcha) return false;

  return input.requirements.every((summary) => summary.gate_type === "altcha_pow")
    || input.gateMatchMode === "any";
}
