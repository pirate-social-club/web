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
  /** Small provenance copy, e.g. "Traits verified via Courtyard" (gate-builder spec). */
  provenanceLabel?: string;
  fixedMatch?: Record<string, string>;
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
  estimateMatchCount(sourceId: string, match: Record<string, string>): Promise<number | null>;
}

export function replaceEditableFacet(
  match: Record<string, string>,
  fixedMatch: Record<string, string> | undefined,
  facetKey: string,
  nextKey: string,
): Record<string, string> {
  const nextMatch = { ...fixedMatch, ...match };
  const existingValue = nextMatch[facetKey] ?? "";
  delete nextMatch[facetKey];
  nextMatch[nextKey] = existingValue;
  return nextMatch;
}
