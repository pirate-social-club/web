import type { IdentityGateDraft } from "@/components/compositions/community/create-composer/create-community-composer.types";
import type { Community as ApiCommunity } from "@pirate/api-contracts";
import type { ApiCommunityGatesUpdateRequest, ApiCreateCommunityRequest } from "@/lib/api/client-api-types";
import { getAcceptedProvidersForGateType } from "@/lib/community-gate-providers";

export type SerializedGateRule = NonNullable<ApiCreateCommunityRequest["gate_rules"]>[number] & {
  gate_rule_id?: string | null;
};

type ApiCommunityGateRule = NonNullable<ApiCommunity["gate_rules"]>[number];
type UpdateGateRule = NonNullable<ApiCommunityGatesUpdateRequest["gate_rules"]>[number];

export function serializeExistingCommunityGateRuleForUpdate(
  rule: ApiCommunityGateRule,
): SerializedGateRule {
  return {
    scope: rule.scope,
    gate_family: rule.gate_family,
    gate_type: rule.gate_type,
    gate_rule_id: rule.gate_rule_id ?? null,
    proof_requirements: rule.proof_requirements?.map((requirement) => ({
      proof_type: requirement.proof_type,
      accepted_providers: requirement.accepted_providers ?? null,
      config: requirement.config ?? null,
    })) ?? null,
    chain_namespace: rule.chain_namespace ?? null,
    gate_config: rule.gate_config ?? null,
  } as UpdateGateRule;
}

export function serializeIdentityGateDrafts(
  gateDrafts: IdentityGateDraft[],
  options?: { includeGateRuleIds?: boolean },
): SerializedGateRule[] {
  return gateDrafts.map((draft) => {
    const gateRuleId = options?.includeGateRuleIds ? { gate_rule_id: draft.gateRuleId ?? null } : {};

    if (draft.gateType === "erc721_holding") {
      return {
        scope: "membership",
        gate_family: "token_holding",
        gate_type: "erc721_holding",
        ...gateRuleId,
        chain_namespace: draft.chainNamespace,
        gate_config: { contract_address: draft.contractAddress.trim() },
      };
    }

    if (draft.gateType === "erc721_inventory_match") {
      return {
        scope: "membership",
        gate_family: "token_holding",
        gate_type: "erc721_inventory_match",
        ...gateRuleId,
        chain_namespace: draft.chainNamespace,
        gate_config: {
          contract_address: draft.contractAddress.trim(),
          inventory_provider: draft.inventoryProvider,
          min_quantity: draft.minQuantity,
          match: draft.assetFilter,
        },
      };
    }

    if (draft.gateType === "minimum_age") {
      return {
        scope: "membership",
        gate_family: "identity_proof",
        gate_type: "minimum_age",
        ...gateRuleId,
        proof_requirements: [{
          proof_type: "minimum_age",
          accepted_providers: getAcceptedProvidersForGateType(draft.gateType),
          config: { minimum_age: draft.minimumAge },
        }],
      };
    }

    if (draft.gateType === "wallet_score") {
      return {
        scope: "membership",
        gate_family: "identity_proof",
        gate_type: "wallet_score",
        ...gateRuleId,
        proof_requirements: [{
          proof_type: "wallet_score",
          accepted_providers: getAcceptedProvidersForGateType(draft.gateType),
          config: { minimum_score: draft.minimumScore },
        }],
      };
    }

    return {
      scope: "membership",
      gate_family: "identity_proof",
      gate_type: draft.gateType,
      ...gateRuleId,
      proof_requirements: [{
        proof_type: draft.gateType,
        accepted_providers: getAcceptedProvidersForGateType(draft.gateType),
        config: draft.gateType === "nationality"
          ? { required_values: draft.requiredValues }
          : { required_value: draft.requiredValue },
      }],
    };
  });
}
