import type {
  NftGateCapabilitySource,
  NftGateCapabilitySourceListResponse,
  NftGateFacetValuePage,
} from "@pirate/api-contracts";

import type {
  AssetSourceDescriptor,
  CollectionCapabilitySource,
  FacetValueSuggestion,
} from "./collection-capability-source";

type GateCapabilitiesApi = {
  listNftSources(): Promise<NftGateCapabilitySourceListResponse>;
  searchNftFacetValues(
    sourceId: string,
    facetKey: string,
    options?: { cursor?: string | null; limit?: number; query?: string },
  ): Promise<NftGateFacetValuePage>;
};

function descriptor(source: NftGateCapabilitySource): AssetSourceDescriptor {
  return {
    id: source.id,
    label: source.label,
    chainNamespace: source.chain_namespace,
    contractAddress: source.contract_address,
    standard: source.standard,
    traitFiltersSupported: source.trait_filters_supported,
    facetKeys: source.facet_keys,
    facetLabels: source.facet_labels,
    maxValuesPerFacet: source.max_values_per_facet,
    inventoryProvider: source.inventory_provider === "courtyard" ? "courtyard" : undefined,
    fixedMatch: source.fixed_match,
    minQuantitySupported: source.min_quantity_supported,
  };
}

export function createApiCollectionCapabilitySource(
  api: GateCapabilitiesApi,
): CollectionCapabilitySource {
  return {
    async listTrustedSources() {
      const response = await api.listNftSources();
      return response.sources.map(descriptor);
    },
    async probeContract() {
      return null;
    },
    async searchFacetValues(sourceId, facetKey, query) {
      const response = await api.searchNftFacetValues(sourceId, facetKey, {
        limit: 25,
        query,
      });
      return response.values.map((suggestion): FacetValueSuggestion => ({
        value: suggestion.value,
        approximateCount: suggestion.approximate_count,
      }));
    },
    async estimateMatchCount() {
      return null;
    },
  };
}

export function createFallbackCollectionCapabilitySource(
  primary: CollectionCapabilitySource,
  fallback: CollectionCapabilitySource,
): CollectionCapabilitySource {
  const primarySourceIds = new Set<string>();
  const fallbackSourceIds = new Set<string>();

  return {
    async listTrustedSources() {
      try {
        const sources = await primary.listTrustedSources();
        primarySourceIds.clear();
        for (const source of sources) primarySourceIds.add(source.id);
        return sources;
      } catch {
        const sources = await fallback.listTrustedSources();
        fallbackSourceIds.clear();
        for (const source of sources) fallbackSourceIds.add(source.id);
        return sources;
      }
    },
    async probeContract(chainNamespace, contractAddress) {
      try {
        return await primary.probeContract(chainNamespace, contractAddress)
          ?? await fallback.probeContract(chainNamespace, contractAddress);
      } catch {
        return fallback.probeContract(chainNamespace, contractAddress);
      }
    },
    async searchFacetValues(sourceId, facetKey, query) {
      if (fallbackSourceIds.has(sourceId) && !primarySourceIds.has(sourceId)) {
        return fallback.searchFacetValues(sourceId, facetKey, query);
      }
      return primary.searchFacetValues(sourceId, facetKey, query);
    },
    async estimateMatchCount(sourceId, match) {
      if (fallbackSourceIds.has(sourceId) && !primarySourceIds.has(sourceId)) {
        return fallback.estimateMatchCount(sourceId, match);
      }
      return primary.estimateMatchCount(sourceId, match);
    },
  };
}
