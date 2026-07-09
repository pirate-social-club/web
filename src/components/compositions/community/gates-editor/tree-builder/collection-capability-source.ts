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
  provenanceLabel?: string;
  inventoryProvider?: "courtyard";
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
