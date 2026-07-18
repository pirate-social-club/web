export type InventoryFacetValue = string | string[];
export type InventoryFacetMatch = Record<string, InventoryFacetValue>;

export type AssetSourceDescriptor = {
  id: string;
  label: string;
  chainNamespace: string;
  contractAddress: string;
  standard: "erc721" | "erc1155";
  traitFiltersSupported: boolean;
  facetKeys: string[];
  facetLabels?: Record<string, string>;
  maxValuesPerFacet: number;
  inventoryProvider?: "courtyard";
  fixedMatch?: InventoryFacetMatch;
  minQuantitySupported?: boolean;
};

export type FacetValueSuggestion = {
  approximateCount?: number;
  value: string;
};

export interface CollectionCapabilitySource {
  listTrustedSources(): Promise<AssetSourceDescriptor[]>;
  probeContract(chainNamespace: string, contractAddress: string): Promise<AssetSourceDescriptor | null>;
  searchFacetValues(sourceId: string, facetKey: string, query: string): Promise<FacetValueSuggestion[]>;
  estimateMatchCount(sourceId: string, match: InventoryFacetMatch): Promise<number | null>;
}

export function replaceEditableFacet(
  match: InventoryFacetMatch,
  fixedMatch: InventoryFacetMatch | undefined,
  facetKey: string,
  nextKey: string,
): InventoryFacetMatch {
  const nextMatch = { ...fixedMatch, ...match };
  const existingValue = nextMatch[facetKey] ?? "";
  delete nextMatch[facetKey];
  nextMatch[nextKey] = existingValue;
  return nextMatch;
}
