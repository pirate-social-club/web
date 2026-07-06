import type { GateAtom, GateExpression, GatePolicy } from "@pirate/api-contracts";
import {
  DEFAULT_DOCUMENT_PROOF_PROVIDERS,
  type DocumentProofProvider,
  type IdentityGateDraft,
} from "@/components/compositions/community/create-composer/create-community-composer.types";
import { areStableJsonValuesEqual } from "@/lib/gate-policy-utils";

export type SerializedGatePolicy = GatePolicy;

export type PreserveGatePolicyInput = {
  gateDrafts: IdentityGateDraft[];
  mode: "all" | "any";
  policy: GatePolicy | null | undefined;
};

export function serializeIdentityGateDrafts(
  gateDrafts: IdentityGateDraft[],
  options?: { mode?: "all" | "any"; includeGateRuleIds?: boolean },
): SerializedGatePolicy | null {
  const palmFallbackPolicy = serializePalmScanPowFallbackPolicy(gateDrafts, options);
  if (palmFallbackPolicy) {
    return palmFallbackPolicy;
  }

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

export function serializeIdentityGateDraftsForSave(
  gateDrafts: IdentityGateDraft[],
  options: {
    mode?: "all" | "any";
    preserve?: PreserveGatePolicyInput | null;
  } = {},
): SerializedGatePolicy | null {
  if (
    options.preserve?.policy
    && options.preserve.mode === (options.mode ?? "all")
    && gateDraftsEqual(options.preserve.gateDrafts, gateDrafts)
  ) {
    // Keep this object immutable; unchanged advanced policies are sent back verbatim.
    return options.preserve.policy;
  }

  return serializeIdentityGateDrafts(gateDrafts, { mode: options.mode });
}

function serializePalmScanPowFallbackPolicy(
  gateDrafts: IdentityGateDraft[],
  options?: { mode?: "all" | "any" },
): SerializedGatePolicy | null {
  if (options?.mode === "any") {
    return null;
  }

  const palmScanGate = gateDrafts.find((draft) => draft.gateType === "unique_human" && draft.provider === "very");
  const powFallbackGate = gateDrafts.find((draft) =>
    draft.gateType === "altcha_pow" && draft.fallbackFor === "unique_human"
  );
  if (!palmScanGate || !powFallbackGate) {
    return null;
  }

  const fallbackChildren = [draftToExpression(palmScanGate), draftToExpression(powFallbackGate)]
    .filter((expression): expression is GateExpression => expression != null);
  if (fallbackChildren.length !== 2) {
    return null;
  }

  const children: GateExpression[] = [{
    op: "or",
    children: fallbackChildren,
  }];
  for (const draft of gateDrafts) {
    if (draft === palmScanGate || draft === powFallbackGate) {
      continue;
    }
    const expression = draftToExpression(draft);
    if (expression != null) {
      children.push(expression);
    }
  }

  return {
    version: 1,
    expression: {
      op: "and",
      children,
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
      ...acceptedProvidersField(draft.acceptedProviders),
      allowed: draft.requiredValues,
    };
  }

  if (draft.gateType === "gender") {
    return {
      type: "gender",
      provider: "self",
      ...acceptedProvidersField(draft.acceptedProviders),
      allowed: [draft.requiredValue],
    };
  }

  return null;
}

function acceptedProvidersField(
  providers: readonly DocumentProofProvider[] | null | undefined,
): { accepted_providers?: DocumentProofProvider[] } {
  const selected = DEFAULT_DOCUMENT_PROOF_PROVIDERS.filter((provider) => providers?.includes(provider));
  return selected.length > 0 ? { accepted_providers: selected } : {};
}

function gateDraftsEqual(left: IdentityGateDraft[], right: IdentityGateDraft[]): boolean {
  return areStableJsonValuesEqual(left, right);
}
