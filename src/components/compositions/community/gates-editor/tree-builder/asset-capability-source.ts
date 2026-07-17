export type AssetCapabilityDescriptor = {
  assetId: string;
  label: string;
  chainNamespace: string;
  standard: "native" | "erc20";
  symbol: string;
  decimals: number;
};

export interface AssetCapabilitySource {
  listAssets(): Promise<AssetCapabilityDescriptor[]>;
}
