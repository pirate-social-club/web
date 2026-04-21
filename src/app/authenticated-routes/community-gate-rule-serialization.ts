import type { IdentityGateDraft } from "@/components/compositions/create-community-composer/create-community-composer.types";
import type { ApiCreateCommunityRequest } from "@/lib/api/client-api-types";
import { getAcceptedProvidersForGateType } from "@/lib/community-gate-providers";

type SerializedGateRule = NonNullable<ApiCreateCommunityRequest["gate_rules"]>[number] & {
  gate_rule_id?: string | null;
};

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
