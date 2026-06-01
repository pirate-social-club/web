import type { GateExpression, GatePolicy } from "@pirate/api-contracts";
import { type IdentityGateDraft } from "@/components/compositions/community/create-composer/create-community-composer.types";
import { serializeIdentityGateDraftToExpression } from "@/components/compositions/community/create-composer/identity-gate-definitions";

export type SerializedGatePolicy = GatePolicy;

export function serializeIdentityGateDrafts(
  gateDrafts: IdentityGateDraft[],
  options?: { mode?: "all" | "any"; includeGateRuleIds?: boolean },
): SerializedGatePolicy | null {
  const expressions = gateDrafts.reduce<GateExpression[]>((result, draft) => {
    const expression = serializeIdentityGateDraftToExpression(draft);
    if (expression != null) {
      result.push(expression);
    }
    return result;
  }, []);
  if (expressions.length === 0) {
    return null;
  }
  return {
    version: 1,
    expression: {
      op: options?.mode === "any" ? "or" : "and",
      children: expressions,
    },
  };
}
