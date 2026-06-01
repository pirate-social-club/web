import type { GateExpression } from "@pirate/api-contracts";

import {
  DEFAULT_DOCUMENT_PROOF_PROVIDERS,
  type DocumentProofProvider,
  type IdentityGateDraft,
} from "./create-community-composer.types";

export type IdentityGateType = IdentityGateDraft["gateType"];
type IdentityGateDraftFor<TGateType extends IdentityGateType> = Extract<IdentityGateDraft, { gateType: TGateType }>;

type IdentityGateDefinition<TGateType extends IdentityGateType> = {
  powExclusiveInAllMode: boolean;
  serialize: (draft: IdentityGateDraftFor<TGateType>) => GateExpression | null;
};

type IdentityGateDefinitionMap = {
  [TGateType in IdentityGateType]: IdentityGateDefinition<TGateType>;
};

function gateExpression(gate: NonNullable<GateExpression["gate"]>): GateExpression {
  return { op: "gate", gate };
}

function acceptedProvidersField(
  providers: readonly DocumentProofProvider[] | null | undefined,
): { accepted_providers?: DocumentProofProvider[] } {
  const selected = DEFAULT_DOCUMENT_PROOF_PROVIDERS.filter((provider) => providers?.includes(provider));
  return selected.length > 0 ? { accepted_providers: selected } : {};
}

export const GATE_TYPE_DEFINITIONS = {
  altcha_pow: {
    powExclusiveInAllMode: false,
    serialize: (_draft) => gateExpression({ type: "altcha_pow" }),
  },
  unique_human: {
    powExclusiveInAllMode: true,
    serialize: (draft) => gateExpression({ type: "unique_human", provider: draft.provider }),
  },
  nationality: {
    powExclusiveInAllMode: true,
    serialize: (draft) => gateExpression({
      type: "nationality",
      provider: "self",
      ...acceptedProvidersField(draft.acceptedProviders),
      allowed: draft.requiredValues,
    }),
  },
  minimum_age: {
    powExclusiveInAllMode: true,
    serialize: (draft) => gateExpression({
      type: "minimum_age",
      provider: "self",
      ...acceptedProvidersField(draft.acceptedProviders),
      minimum_age: draft.minimumAge,
    }),
  },
  wallet_score: {
    powExclusiveInAllMode: true,
    serialize: (draft) => gateExpression({
      type: "wallet_score",
      provider: "passport",
      minimum_score: draft.minimumScore,
    }),
  },
  gender: {
    powExclusiveInAllMode: true,
    serialize: (draft) => gateExpression({
      type: "gender",
      provider: "self",
      ...acceptedProvidersField(draft.acceptedProviders),
      allowed: [draft.requiredValue],
    }),
  },
  erc721_holding: {
    powExclusiveInAllMode: false,
    serialize: (draft) => gateExpression({
      type: "erc721_holding",
      chain_namespace: draft.chainNamespace,
      contract_address: draft.contractAddress.trim(),
    }),
  },
  erc721_inventory_match: {
    powExclusiveInAllMode: false,
    serialize: (draft) => gateExpression({
      type: "erc721_inventory_match",
      provider: draft.inventoryProvider,
      chain_namespace: draft.chainNamespace,
      contract_address: draft.contractAddress.trim(),
      min_quantity: draft.minQuantity,
      match: draft.assetFilter,
    }),
  },
} satisfies IdentityGateDefinitionMap;

type PowExclusiveGateType = {
  [TGateType in IdentityGateType]: typeof GATE_TYPE_DEFINITIONS[TGateType]["powExclusiveInAllMode"] extends true
    ? TGateType
    : never;
}[IdentityGateType];

export const POW_EXCLUSIVE_GATE_TYPES = (Object.keys(GATE_TYPE_DEFINITIONS) as IdentityGateType[])
  .filter((gateType): gateType is PowExclusiveGateType =>
    GATE_TYPE_DEFINITIONS[gateType].powExclusiveInAllMode,
  );

export function isPowExclusiveGateType(gateType: IdentityGateType): gateType is PowExclusiveGateType {
  return POW_EXCLUSIVE_GATE_TYPES.some((candidate) => candidate === gateType);
}

export function serializeIdentityGateDraftToExpression(
  draft: IdentityGateDraft,
): GateExpression | null {
  switch (draft.gateType) {
    case "altcha_pow":
      return GATE_TYPE_DEFINITIONS.altcha_pow.serialize(draft);
    case "unique_human":
      return GATE_TYPE_DEFINITIONS.unique_human.serialize(draft);
    case "nationality":
      return GATE_TYPE_DEFINITIONS.nationality.serialize(draft);
    case "minimum_age":
      return GATE_TYPE_DEFINITIONS.minimum_age.serialize(draft);
    case "wallet_score":
      return GATE_TYPE_DEFINITIONS.wallet_score.serialize(draft);
    case "gender":
      return GATE_TYPE_DEFINITIONS.gender.serialize(draft);
    case "erc721_holding":
      return GATE_TYPE_DEFINITIONS.erc721_holding.serialize(draft);
    case "erc721_inventory_match":
      return GATE_TYPE_DEFINITIONS.erc721_inventory_match.serialize(draft);
  }
}
