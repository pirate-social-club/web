import { describe, expect, test } from "bun:test";

import { createApiAssetCapabilitySource } from "./api-asset-capability-source";

describe("createApiAssetCapabilitySource", () => {
  test("maps safe API authoring metadata without embedding an asset registry", async () => {
    const source = createApiAssetCapabilitySource({
      async listAssets() {
        return {
          assets: [{
            asset_id: "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
            label: "USDC on Ethereum",
            chain_namespace: "eip155:1",
            standard: "erc20" as const,
            symbol: "USDC",
            decimals: 6,
          }],
        };
      },
    });

    await expect(source.listAssets()).resolves.toEqual([{
      assetId: "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      label: "USDC on Ethereum",
      chainNamespace: "eip155:1",
      standard: "erc20",
      symbol: "USDC",
      decimals: 6,
    }]);
  });
});
