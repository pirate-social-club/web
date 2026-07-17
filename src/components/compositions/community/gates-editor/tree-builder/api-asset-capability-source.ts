import type { AssetBalanceCapabilityListResponse } from "@pirate/api-contracts";

import type { AssetCapabilityDescriptor, AssetCapabilitySource } from "./asset-capability-source";

type GateCapabilitiesApi = {
  listAssets(): Promise<AssetBalanceCapabilityListResponse>;
};

export function createApiAssetCapabilitySource(api: GateCapabilitiesApi): AssetCapabilitySource {
  return {
    async listAssets() {
      const response = await api.listAssets();
      return response.assets.map((asset): AssetCapabilityDescriptor => ({
        assetId: asset.asset_id,
        label: asset.label,
        chainNamespace: asset.chain_namespace,
        standard: asset.standard,
        symbol: asset.symbol,
        decimals: asset.decimals,
      }));
    },
  };
}
