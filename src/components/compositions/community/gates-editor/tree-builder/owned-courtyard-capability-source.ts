import type { CourtyardWalletInventoryGroup } from "@/lib/courtyard-inventory-gates";
import {
  COURTYARD_MAINNET_REGISTRY,
  COURTYARD_POLYGON_REGISTRY,
  normalizeInventoryText,
} from "@/lib/gate-inventory-validation";

import type {
  AssetSourceDescriptor,
  CollectionCapabilitySource,
  FacetValueSuggestion,
} from "./collection-capability-source";

const CARD_FACETS = ["franchise", "subject", "set", "year", "grader", "grade"];
const WATCH_FACETS = ["brand", "model", "reference", "year", "condition"];

type SupportedChain = "eip155:1" | "eip155:137";
type SupportedCategory = CourtyardWalletInventoryGroup["category"];

function sourceId(chainNamespace: SupportedChain, category: SupportedCategory): string {
  return `courtyard-owned-${chainNamespace.replace(":", "-")}-${category}`;
}

function descriptor(chainNamespace: SupportedChain, category: SupportedCategory): AssetSourceDescriptor {
  const assetLabel = category === "trading_card" ? "cards" : "watches";
  const chainLabel = chainNamespace === "eip155:1" ? "Ethereum" : "Polygon";
  return {
    id: sourceId(chainNamespace, category),
    label: `My Courtyard ${assetLabel} on ${chainLabel}`,
    chainNamespace,
    contractAddress: chainNamespace === "eip155:1"
      ? COURTYARD_MAINNET_REGISTRY
      : COURTYARD_POLYGON_REGISTRY,
    standard: "erc721",
    traitFiltersSupported: true,
    facetKeys: category === "trading_card" ? CARD_FACETS : WATCH_FACETS,
    maxValuesPerFacet: 10,
    inventoryProvider: "courtyard",
    fixedMatch: { category },
    minQuantitySupported: true,
  };
}

function groupChain(group: CourtyardWalletInventoryGroup): SupportedChain {
  return group.chainNamespace ?? "eip155:137";
}

export function createOwnedCourtyardCapabilitySource(
  groups: CourtyardWalletInventoryGroup[],
): CollectionCapabilitySource {
  const descriptors = Array.from(new Map(groups.map((group) => {
    const source = descriptor(groupChain(group), group.category);
    return [source.id, source];
  })).values());

  const sourceById = new Map(descriptors.map((source) => [source.id, source]));

  return {
    async listTrustedSources() {
      return descriptors;
    },
    async probeContract(chainNamespace, contractAddress) {
      const normalizedAddress = contractAddress.trim().toLowerCase();
      return descriptors.find((source) => (
        source.chainNamespace === chainNamespace
        && source.contractAddress.toLowerCase() === normalizedAddress
      )) ?? null;
    },
    async searchFacetValues(id, facetKey, query) {
      const source = sourceById.get(id);
      if (!source || !source.facetKeys.includes(facetKey)) return [];
      const normalizedQuery = normalizeInventoryText(query) ?? "";
      const counts = new Map<string, FacetValueSuggestion>();
      for (const group of groups) {
        if (groupChain(group) !== source.chainNamespace || group.category !== source.fixedMatch?.category) continue;
        const rawValue = group[facetKey as keyof CourtyardWalletInventoryGroup];
        const normalizedValue = normalizeInventoryText(rawValue);
        if (!normalizedValue || !normalizedValue.includes(normalizedQuery) || typeof rawValue !== "string") continue;
        const existing = counts.get(normalizedValue);
        counts.set(normalizedValue, {
          value: existing?.value ?? rawValue.trim(),
          approximateCount: (existing?.approximateCount ?? 0) + group.count,
        });
      }
      return Array.from(counts.values())
        .sort((left, right) => right.approximateCount! - left.approximateCount! || left.value.localeCompare(right.value))
        .slice(0, 25);
    },
    async estimateMatchCount() {
      return null;
    },
  };
}
