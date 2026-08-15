import * as React from "react";

import type { AssetAccessResponse } from "@pirate/api-contracts";

import { getErrorMessage } from "@/lib/error-utils";
import type { PirateConnectedEvmWallet } from "@/lib/auth/privy-wallet";
import { toast } from "@/components/primitives/sonner";

import { resolveGenericAssetDownload } from "./generic-asset-download";

export function useGenericAssetDownload(input: {
  accessToken: string | null | undefined;
  connectedWallet?: PirateConnectedEvmWallet;
  connectWallet?: () => void;
  reconnectWallet?: () => void;
  resolveAssetAccess: (communityId: string, assetId: string) => Promise<AssetAccessResponse>;
}) {
  return React.useCallback(async (communityId: string, assetId: string, titleText: string) => {
    try {
      const result = await resolveGenericAssetDownload({
        accessToken: input.accessToken,
        assetId,
        communityId,
        resolveAssetAccess: input.resolveAssetAccess,
        titleText,
        wallet: input.connectedWallet,
      });
      if (result.kind === "blocked") {
        toast.info(result.message);
        return;
      }
      if (result.kind === "wallet_required") {
        input.reconnectWallet?.();
        input.connectWallet?.();
        toast.info("Connect a wallet to unlock this download.");
        return;
      }
      const href = URL.createObjectURL(result.blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = result.filename;
      anchor.click();
      URL.revokeObjectURL(href);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not download this asset."));
    }
  }, [input]);
}
