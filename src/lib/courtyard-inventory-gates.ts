import { isAddress } from "viem";

import type { IdentityGateDraft } from "@/components/compositions/create-community-composer/create-community-composer.types";

export const COURTYARD_POLYGON_REGISTRY = "0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD";
export const COURTYARD_CATALOG_AUTHORING_ENABLED = false;

export type CourtyardInventoryDraft = Extract<IdentityGateDraft, { gateType: "erc721_inventory_match" }>;

export function createDefaultCourtyardInventoryDraft(
  overrides?: Partial<CourtyardInventoryDraft>,
): CourtyardInventoryDraft {
  return {
    gateType: "erc721_inventory_match",
    chainNamespace: "eip155:137",
    contractAddress: COURTYARD_POLYGON_REGISTRY,
    inventoryProvider: "courtyard",
    minQuantity: 1,
    assetFilter: {
      category: "trading_card",
    },
    ...overrides,
  };
}

export function isValidCourtyardInventoryDraft(draft: CourtyardInventoryDraft): boolean {
  if (
    draft.chainNamespace !== "eip155:137"
    || draft.inventoryProvider !== "courtyard"
    || !isAddress(draft.contractAddress.trim())
    || !Number.isInteger(draft.minQuantity)
    || draft.minQuantity < 1
    || draft.minQuantity > 100
  ) {
    return false;
  }

  if (draft.assetFilter.category === "trading_card") {
    return Boolean(draft.assetFilter.franchise?.trim() || draft.assetFilter.subject?.trim());
  }
  return Boolean(draft.assetFilter.brand?.trim() || draft.assetFilter.model?.trim());
}

export function describeCourtyardInventoryDraft(draft: CourtyardInventoryDraft): string {
  const values = [
    draft.assetFilter.franchise,
    draft.assetFilter.subject,
    draft.assetFilter.brand,
    draft.assetFilter.model,
  ].map((value) => value?.trim()).filter((value): value is string => Boolean(value));
  const asset = draft.assetFilter.category === "watch" ? "watch" : "card";
  const pluralAsset = draft.minQuantity === 1 ? asset : `${asset}s`;
  const label = values.length > 0 ? values.join(" ") : "Courtyard collectible";
  return `${draft.minQuantity} Courtyard ${label} ${pluralAsset}`;
}
