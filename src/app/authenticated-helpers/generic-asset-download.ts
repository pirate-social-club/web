"use client";

import type { AssetAccessResponse } from "@pirate/api-contracts";
import { browserCanUseCredentials } from "@/lib/browser-security";

type StoryCdrAccess = NonNullable<AssetAccessResponse["story_cdr_access"]>;

export type GenericAssetDownloadTelemetryEvent =
  | "generic_asset_download_hash_mismatch"
  | "generic_asset_download_missing_hash";

export class GenericAssetDownloadIntegrityError extends Error {
  readonly code: "hash_mismatch" | "missing_hash";

  constructor(code: "hash_mismatch" | "missing_hash", message: string) {
    super(message);
    this.name = "GenericAssetDownloadIntegrityError";
    this.code = code;
  }
}

export class GenericAssetWalletRequiredError extends Error {
  constructor() {
    super("Connect a wallet to unlock this download.");
    this.name = "GenericAssetWalletRequiredError";
  }
}

export type GenericAssetDownloadResult =
  | { kind: "access_denied"; decisionReason: AssetAccessResponse["decision_reason"] }
  | { kind: "downloaded" };

export async function downloadGenericAsset(input: {
  accessToken: string | null;
  assetId: string;
  communityId: string;
  fetchContent: (url: string, init?: RequestInit) => Promise<Response>;
  readStoryCdr: (access: StoryCdrAccess) => Promise<Blob>;
  reportTelemetry: (event: GenericAssetDownloadTelemetryEvent, context: {
    assetId: string;
    communityId: string;
    expectedHash?: string;
    actualHash?: string;
  }) => void;
  resolveAccess: (communityId: string, assetId: string) => Promise<AssetAccessResponse>;
  resolveContentUrl: (deliveryRef: string) => string;
  saveBlob: (blob: Blob, filename: string) => void;
  titleText: string;
}): Promise<GenericAssetDownloadResult> {
  const access = await input.resolveAccess(input.communityId, input.assetId);
  if (!access.access_granted) {
    return { kind: "access_denied", decisionReason: access.decision_reason };
  }

  const expectedHash = access.payload?.content_hash?.trim().toLowerCase();
  if (!expectedHash) {
    input.reportTelemetry("generic_asset_download_missing_hash", {
      assetId: input.assetId,
      communityId: input.communityId,
    });
    throw new GenericAssetDownloadIntegrityError(
      "missing_hash",
      "Downloaded asset is missing integrity metadata.",
    );
  }

  let blob: Blob;
  if (access.delivery_kind === "story_cdr_ref" && access.story_cdr_access) {
    blob = await input.readStoryCdr(access.story_cdr_access);
  } else if (access.delivery_kind === "primary_content_ref" && access.delivery_ref) {
    const response = await input.fetchContent(input.resolveContentUrl(access.delivery_ref), {
      headers: input.accessToken && browserCanUseCredentials()
        ? { Authorization: `Bearer ${input.accessToken}` }
        : undefined,
    });
    if (!response.ok) throw new Error("Could not download this asset.");
    blob = await response.blob();
  } else {
    throw new Error("Could not download this asset.");
  }

  const bytes = await blob.arrayBuffer();
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  const actualHash = `0x${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  if (actualHash.toLowerCase() !== expectedHash) {
    input.reportTelemetry("generic_asset_download_hash_mismatch", {
      actualHash,
      assetId: input.assetId,
      communityId: input.communityId,
      expectedHash,
    });
    throw new GenericAssetDownloadIntegrityError(
      "hash_mismatch",
      "Downloaded asset integrity check failed.",
    );
  }

  const verifiedBlob = new Blob([bytes], {
    type: blob.type || access.payload?.mime_type || "application/octet-stream",
  });
  input.saveBlob(
    verifiedBlob,
    access.payload?.display_filename?.trim() || input.titleText,
  );
  return { kind: "downloaded" };
}

export function saveBlobToBrowser(blob: Blob, filename: string): void {
  const href = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = filename;
    anchor.click();
  } finally {
    URL.revokeObjectURL(href);
  }
}
