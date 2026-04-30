import type { IdentityGateDraft } from "@/components/compositions/community/create-composer/create-community-composer.types";
import type { ApiGateAtom, ApiGatePolicy } from "@/lib/api/client-api-types";

export type SerializedGatePolicy = ApiGatePolicy;

export function serializeIdentityGateDrafts(
  gateDrafts: IdentityGateDraft[],
  options?: { mode?: "all" | "any"; includeGateRuleIds?: boolean },
): SerializedGatePolicy | null {
  const atoms = gateDrafts.map(draftToAtom).filter((atom): atom is ApiGateAtom => atom != null);
  if (atoms.length === 0) {
    return null;
  }
  return {
    version: 1,
    expression: {
      op: options?.mode === "any" ? "or" : "and",
      children: atoms.map((gate) => ({ op: "gate", gate })),
    },
  };
}

function draftToAtom(draft: IdentityGateDraft): ApiGateAtom | null {
  if (draft.gateType === "erc721_holding") {
    return {
      type: "erc721_holding",
      chain_namespace: draft.chainNamespace,
      contract_address: draft.contractAddress.trim(),
    };
  }

  if (draft.gateType === "erc721_inventory_match") {
    return {
      type: "erc721_inventory_match",
      provider: draft.inventoryProvider,
      chain_namespace: draft.chainNamespace,
      contract_address: draft.contractAddress.trim(),
      min_quantity: draft.minQuantity,
      match: draft.assetFilter,
    };
  }

  if (draft.gateType === "minimum_age") {
    return {
      type: "minimum_age",
      provider: "self",
      minimum_age: draft.minimumAge,
    };
  }

  if (draft.gateType === "wallet_score") {
    return {
      type: "wallet_score",
      provider: "passport",
      minimum_score: draft.minimumScore,
    };
  }

  if (draft.gateType === "nationality") {
    return {
      type: "nationality",
      provider: "self",
      allowed: draft.requiredValues,
    };
  }

  return {
    type: "gender",
    provider: "self",
    allowed: [draft.requiredValue],
  };
}
