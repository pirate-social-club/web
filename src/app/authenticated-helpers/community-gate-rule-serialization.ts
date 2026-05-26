import type { GateAtom, GateExpression, GatePolicy } from "@pirate/api-contracts";
import {
  DEFAULT_DOCUMENT_PROOF_PROVIDERS,
  type DocumentProofProvider,
  type IdentityGateDraft,
} from "@/components/compositions/community/create-composer/create-community-composer.types";

export type SerializedGatePolicy = GatePolicy;

export function serializeIdentityGateDrafts(
  gateDrafts: IdentityGateDraft[],
  options?: { mode?: "all" | "any"; includeGateRuleIds?: boolean },
): SerializedGatePolicy | null {
  const expressions = gateDrafts.reduce<GateExpression[]>((result, draft) => {
    const expression = draftToExpression(draft);
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

function draftToExpression(draft: IdentityGateDraft): GateExpression | null {
  if (draft.gateType === "unique_human") {
    return {
      op: "gate",
      gate: { type: "unique_human", provider: draft.provider },
    };
  }

  const gate = draftToAtom(draft);
  return gate ? { op: "gate", gate } : null;
}

function draftToAtom(draft: IdentityGateDraft): GateAtom | null {
  if (draft.gateType === "unique_human") {
    return null;
  }

  if (draft.gateType === "altcha_pow") {
    return { type: "altcha_pow" };
  }

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
      ...acceptedProvidersField(draft.acceptedProviders),
      minimum_age: draft.minimumAge,
    } as GateAtom;
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
      ...acceptedProvidersField(draft.acceptedProviders),
      allowed: draft.requiredValues,
    } as GateAtom;
  }

  if (draft.gateType === "gender") {
    return {
      type: "gender",
      provider: "self",
      ...acceptedProvidersField(draft.acceptedProviders),
      allowed: [draft.requiredValue],
    } as GateAtom;
  }

  return null;
}

function acceptedProvidersField(
  providers: readonly DocumentProofProvider[] | null | undefined,
): { accepted_providers?: DocumentProofProvider[] } {
  const selected = DEFAULT_DOCUMENT_PROOF_PROVIDERS.filter((provider) => providers?.includes(provider));
  return selected.length > 0 ? { accepted_providers: selected } : {};
}
