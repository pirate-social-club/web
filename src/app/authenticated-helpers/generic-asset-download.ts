import type { AssetAccessResponse } from "@pirate/api-contracts";

import { resolveApiUrl } from "@/lib/api/base-url";
import type { PirateConnectedEvmWallet } from "@/lib/auth/privy-wallet";
import { readStoryCdrAsset } from "@/lib/story/cdr-browser";

export type GenericAssetDownloadResult =
  | { kind: "blocked"; message: string }
  | { kind: "wallet_required" }
  | { kind: "ready"; blob: Blob; filename: string };

export async function resolveGenericAssetDownload(input: {
  resolveAssetAccess: (communityId: string, assetId: string) => Promise<AssetAccessResponse>;
  communityId: string;
  assetId: string;
  titleText: string;
  accessToken: string | null | undefined;
  wallet?: PirateConnectedEvmWallet;
}): Promise<GenericAssetDownloadResult> {
  const access = await input.resolveAssetAccess(input.communityId, input.assetId);
  if (!access.access_granted) {
    return {
      kind: "blocked",
      message: access.decision_reason === "purchase_required"
        ? "Purchase required before downloading this file."
        : "This asset is not ready for delivery yet.",
    };
  }

  let blob: Blob;
  if (access.delivery_kind === "story_cdr_ref" && access.story_cdr_access) {
    if (!input.wallet) return { kind: "wallet_required" };
    blob = await readStoryCdrAsset({
      access: access.story_cdr_access,
      accessToken: input.accessToken ?? null,
      wallet: input.wallet,
    });
  } else if (access.delivery_kind === "primary_content_ref" && access.delivery_ref) {
    const response = await fetch(resolveApiUrl(access.delivery_ref), {
      headers: input.accessToken ? { Authorization: `Bearer ${input.accessToken}` } : undefined,
    });
    if (!response.ok) throw new Error("Could not download this asset.");
    blob = await response.blob();
  } else {
    throw new Error("Could not download this asset.");
  }

  const expectedHash = access.payload?.content_hash?.trim().toLowerCase();
  if (expectedHash) {
    const bytes = await blob.arrayBuffer();
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    const actualHash = `0x${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
    if (actualHash !== expectedHash) throw new Error("Downloaded asset integrity check failed.");
    blob = new Blob([bytes], { type: blob.type || access.payload?.mime_type || "application/octet-stream" });
  }

  return {
    kind: "ready",
    blob,
    filename: access.payload?.display_filename?.trim() || input.titleText,
  };
}
