
import type { IdentityGateDraft } from "@/components/compositions/community/create-composer/create-community-composer.types";
import {
  COURTYARD_MAINNET_REGISTRY,
  COURTYARD_POLYGON_REGISTRY,
  isAllowedCourtyardRegistry,
  validateInventoryAssetMatch,
} from "@/lib/gate-inventory-validation";

export {
  COURTYARD_MAINNET_REGISTRY,
  COURTYARD_POLYGON_REGISTRY,

} from "@/lib/gate-inventory-validation";

export type CourtyardWalletInventoryGroup = {
  category: "trading_card" | "watch";
  chainNamespace?: "eip155:1" | "eip155:137";
  contractAddress?: string;
  franchise?: string;
  subject?: string;
  brand?: string;
  model?: string;
  reference?: string;
  set?: string;
  year?: string;
  grader?: string;
  grade?: string;
  condition?: string;
  displayLabel: string;
  displayDetail?: string;
  count: number;
};

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

/**
 * Validates a legacy inventory draft through the same shared rules the tree builder uses.
 *
 * This previously accepted any one of six card fields (so a grade-only filter passed) and any one
 * of four watch fields (so a reference-only filter passed), and skipped the registry allowlist —
 * all of which the API rejects, so those drafts saved from the client and failed server-side.
 */
export function isValidCourtyardInventoryDraft(draft: CourtyardInventoryDraft): boolean {
  if (
    (draft.chainNamespace !== "eip155:1" && draft.chainNamespace !== "eip155:137")
    || draft.inventoryProvider !== "courtyard"
    || !isAllowedCourtyardRegistry(draft.chainNamespace, draft.contractAddress)
    || !Number.isInteger(draft.minQuantity)
    || draft.minQuantity < 1
    || draft.minQuantity > 100
  ) {
    return false;
  }

  return validateInventoryAssetMatch(toInventoryMatch(draft)) == null;
}

/** Drops empty fields so the shared validator sees the same shape the API receives. */
function toInventoryMatch(draft: CourtyardInventoryDraft): Record<string, string> {
  const match: Record<string, string> = { category: draft.assetFilter.category };
  for (const [key, value] of Object.entries(draft.assetFilter)) {
    if (key !== "category" && typeof value === "string" && value.trim().length > 0) {
      match[key] = value;
    }
  }
  return match;
}

export function createCourtyardInventoryDraftFromGroup(
  group: CourtyardWalletInventoryGroup,
): CourtyardInventoryDraft {
  const chainNamespace = group.chainNamespace ?? "eip155:137";
  return createDefaultCourtyardInventoryDraft({
    chainNamespace,
    contractAddress: group.contractAddress ?? (
      chainNamespace === "eip155:1"
        ? COURTYARD_MAINNET_REGISTRY
        : COURTYARD_POLYGON_REGISTRY
    ),
    minQuantity: Math.min(Math.max(group.count, 1), 100),
    assetFilter: {
      category: group.category,
      franchise: group.franchise,
      subject: group.subject,
      brand: group.brand,
      model: group.model,
      reference: group.reference,
      set: group.set,
      year: group.year,
      grader: group.grader,
      grade: group.grade,
      condition: group.condition,
    },
  });
}

export function describeCourtyardInventoryDraft(draft: CourtyardInventoryDraft): string {
  const values = [
    draft.assetFilter.franchise,
    draft.assetFilter.subject,
    draft.assetFilter.brand,
    draft.assetFilter.model,
    draft.assetFilter.reference,
    draft.assetFilter.set,
    draft.assetFilter.year,
    draft.assetFilter.grader,
    draft.assetFilter.grade,
    draft.assetFilter.condition,
  ].reduce<string[]>((result, value) => {
    const trimmed = value?.trim();
    if (trimmed) {
      result.push(trimmed);
    }
    return result;
  }, []);
  const asset = draft.assetFilter.category === "watch" ? "watch" : "card";
  const pluralAsset = draft.minQuantity === 1 ? asset : `${asset}s`;
  const label = values.length > 0 ? values.join(" ") : "Courtyard collectible";
  return `${draft.minQuantity} Courtyard ${label} ${pluralAsset}`;
}
