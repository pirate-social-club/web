import type { MembershipGateSummary } from "@pirate/api-contracts";

export type CommunityGateRequirementStatus = "met" | "unmet" | "unknown";

export interface CommunityGateRequirementGroup {
  mode: "all" | "any";
  requirements: MembershipGateSummary[];
  requirementStatuses?: CommunityGateRequirementStatus[];
}
