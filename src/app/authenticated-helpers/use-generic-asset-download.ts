import * as React from "react";

import type { AssetAccessResponse } from "@pirate/api-contracts";

import { getErrorMessage } from "@/lib/error-utils";
import type { PirateConnectedEvmWallet } from "@/lib/auth/privy-wallet";
import { resolveApiUrl } from "@/lib/api/base-url";
import { logger } from "@/lib/logger";
import { readStoryCdrAsset } from "@/lib/story/cdr-browser";
import { toast } from "@/components/primitives/sonner";

import {
  downloadGenericAsset,
  GenericAssetWalletRequiredError,
  saveBlobToBrowser,
} from "./generic-asset-download";

export function useGenericAssetDownload(input: {
  accessToken: string | null | undefined;
  connectedWallet?: PirateConnectedEvmWallet;
  connectWallet?: () => void;
  reconnectWallet?: () => void;
  resolveAssetAccess: (communityId: string, assetId: string) => Promise<AssetAccessResponse>;
}) {
  return React.useCallback(async (communityId: string, assetId: string, titleText: string) => {
    try {
      const result = await downloadGenericAsset({
        accessToken: input.accessToken ?? null,
        assetId,
        communityId,
        fetchContent: (url, init) => fetch(url, init),
        readStoryCdr: async (storyCdrAccess) => {
          if (!input.connectedWallet) throw new GenericAssetWalletRequiredError();
          return readStoryCdrAsset({
            access: storyCdrAccess,
            accessToken: input.accessToken ?? null,
            wallet: input.connectedWallet,
          });
        },
        reportTelemetry: (event, context) => {
          logger.warn(`[generic-asset-download] ${event}`, context);
        },
        resolveAccess: input.resolveAssetAccess,
        resolveContentUrl: resolveApiUrl,
        saveBlob: saveBlobToBrowser,
        titleText,
      });
      if (result.kind === "access_denied") {
        toast.info(result.decisionReason === "purchase_required"
          ? "Purchase required before downloading this file."
          : "This asset is not ready for delivery yet.");
        return;
      }
    } catch (error) {
      if (error instanceof GenericAssetWalletRequiredError) {
        input.reconnectWallet?.();
        input.connectWallet?.();
        toast.info(error.message);
        return;
      }
      toast.error(getErrorMessage(error, "Could not download this asset."));
    }
  }, [input]);
}
