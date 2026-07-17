import type { JoinEligibility, MembershipGateSummary } from "@pirate/api-contracts";

import type { CommunityGateRequirementStatus } from "@/components/compositions/community/gate-requirements.types";
import { getRequiredActionCapabilities, type RequiredActionCapability } from "@/lib/identity-gates";

type GateStatusInput = {
  eligibility?: JoinEligibility | null;
  gateMatchMode?: "all" | "any" | null;
  requirements: Array<Pick<MembershipGateSummary, "gate_type"> & { trace_match?: boolean }>;
};

type GateTraceLike = {
  children?: GateTraceLike[];
  gate_type?: string;
  kind?: string;
  op?: "and" | "or";
  passed?: boolean;
  reason?: string;
};

const PROVIDER_UNAVAILABLE_REASONS = new Set([
  "asset_balance_unavailable",
  "ethereum_rpc_not_configured",
  "token_inventory_unavailable",
  "unsupported_chain_namespace",
  "unsupported_gate_config",
]);

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

function traceGateKey(gateType: string): string {
  return gateType === "age_over_18" || gateType === "minimum_age" ? "minimum_age" : gateType;
}

function isProviderUnavailableReason(reason?: string): boolean {
  return reason != null && (
    PROVIDER_UNAVAILABLE_REASONS.has(reason)
    || reason.startsWith("unsupported_gate_type:")
  );
}

function collectStructuralTraceStatuses(root: GateTraceLike): Map<string, CommunityGateRequirementStatus[]> {
  const statuses = new Map<string, CommunityGateRequirementStatus[]>();
  const add = (gateType: string, status: CommunityGateRequirementStatus): void => {
    const key = traceGateKey(gateType);
    statuses.set(key, [...(statuses.get(key) ?? []), status]);
  };
  const visit = (node: GateTraceLike, muted = false): void => {
    if (node.kind === "gate" && node.gate_type) {
      add(
        node.gate_type,
        muted || isProviderUnavailableReason(node.reason)
          ? "unknown"
          : node.passed
            ? "met"
            : "unmet",
      );
      return;
    }
    if (node.kind !== "op") return;
    for (const child of node.children ?? []) {
      // A failed child of a satisfied OR is an unused alternative, not a
      // requirement the member failed. Mute its entire subtree.
      const childMuted = muted || (node.op === "or" && node.passed === true && child.passed !== true);
      visit(child, childMuted);
    }
  };
  visit(root);
  return statuses;
}

function deriveTraceStatuses(
  eligibility: JoinEligibility,
  requirements: GateStatusInput["requirements"],
): Array<CommunityGateRequirementStatus | null> | null {
  const root = eligibility.gate_evaluation?.trace as GateTraceLike | null | undefined;
  if (!root) return null;
  const statuses = collectStructuralTraceStatuses(root);
  return requirements.map((requirement) => {
    if (requirement.trace_match === false) return null;
    return statuses.get(traceGateKey(requirement.gate_type))?.shift() ?? null;
  });
}

function deriveMissingTraceStatuses({
  eligibility,
  gateMatchMode,
  requirements,
}: GateStatusInput & { eligibility: JoinEligibility }): CommunityGateRequirementStatus[] {
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

export function deriveGateStatuses({
  eligibility,
  gateMatchMode,
  requirements,
}: GateStatusInput): CommunityGateRequirementStatus[] {
  if (!eligibility) {
    return requirements.map(() => "unknown");
  }

  const missingTraceStatuses = deriveMissingTraceStatuses({ eligibility, gateMatchMode, requirements });
  const traced = deriveTraceStatuses(eligibility, requirements);
  if (!traced) return missingTraceStatuses;

  // Once a trace exists it is authoritative. A real row with no matching leaf
  // is ambiguous and stays unknown; only explicitly synthetic rows may use the
  // missing-trace compatibility status.
  return traced.map((status, index) => status
    ?? (requirements[index]?.trace_match === false ? missingTraceStatuses[index] ?? "unknown" : "unknown"));
}
