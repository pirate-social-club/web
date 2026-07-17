import type { JoinEligibility, MembershipGateSummary } from "@pirate/api-contracts";

import type { CommunityGateRequirementStatus } from "@/components/compositions/community/gate-requirements.types";
import { getRequiredActionCapabilities, type RequiredActionCapability } from "@/lib/identity-gates";

type GateStatusInput = {
  eligibility?: JoinEligibility | null;
  gateMatchMode?: "all" | "any" | null;
  requirements: Array<Pick<MembershipGateSummary, "gate_type">>;
};

function gateTypeToCapability(gateType: string): RequiredActionCapability | null {
  switch (gateType) {
    case "unique_human": return "unique_human";
    case "age_over_18": return "age_over_18";
    case "minimum_age": return "minimum_age";
    case "nationality": return "nationality";
    case "gender": return "gender";
    case "wallet_score": return "wallet_score";
    case "altcha_pow": return "altcha_pow";
    case "erc721_holding": return "erc721_holding";
    case "erc721_inventory_match": return "erc721_inventory_match";
    case "asset_balance": return "asset_balance";
    default: return null;
  }
}

function requirementMatchesRequiredAction(
  requirement: Pick<MembershipGateSummary, "gate_type">,
  requiredCapabilities: RequiredActionCapability[],
): boolean {
  const capability = gateTypeToCapability(requirement.gate_type);
  if (capability === "age_over_18" || capability === "minimum_age") {
    return requiredCapabilities.includes("age_over_18") || requiredCapabilities.includes("minimum_age");
  }
  return capability != null && requiredCapabilities.includes(capability);
}

export function deriveGateStatuses({
  eligibility,
  gateMatchMode,
  requirements,
}: GateStatusInput): CommunityGateRequirementStatus[] {
  if (!eligibility) {
    return requirements.map(() => "unknown");
  }

  switch (eligibility.status) {
    case "already_joined":
    case "joinable":
    case "requestable":
    case "pending_request":
      return requirements.map(() => gateMatchMode === "any" ? "unknown" : "met");
    case "gate_failed":
      if (gateMatchMode === "any" && !eligibility.gate_evaluation) {
        return requirements.map(() => "unknown");
      }
      return requirements.map(() => "unmet");
    case "verification_required": {
      const requiredCapabilities = getRequiredActionCapabilities(eligibility);
      return requirements.map((requirement) => {
        const isRequired = requirementMatchesRequiredAction(requirement, requiredCapabilities);
        if (!isRequired) return "met";
        return gateMatchMode === "any" ? "unknown" : "unmet";
      });
    }
    default:
      return requirements.map(() => "unknown");
  }
}
