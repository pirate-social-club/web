import type { CommunityListing as ApiCommunityListing } from "@pirate/api-contracts";

import type { GenericAssetPresentationOptions } from "./post-presentation-types";

type GenericAssetAccessState = NonNullable<GenericAssetPresentationOptions["accessState"]>;

export function buildGenericAssetPresentation(input: {
  listing?: ApiCommunityListing;
  hasEntitlement: boolean;
  listedAccessState?: GenericAssetAccessState;
  unlistedAccessState?: GenericAssetAccessState;
  onBuy?: () => void;
  onDownload?: () => void;
}): GenericAssetPresentationOptions {
  const { listing } = input;
  const accessState = input.hasEntitlement
    ? "available"
    : listing
      ? input.listedAccessState ?? "unknown"
      : input.unlistedAccessState ?? "unknown";

  return {
    accessState,
    hasEntitlement: input.hasEntitlement,
    listingMode: listing ? "listed" : "not_listed",
    listingStatus: listing?.status === "active" || listing?.status === "paused"
      ? listing.status
      : undefined,
    onBuy: input.onBuy,
    onDownload: input.onDownload,
    priceLabel: listing?.price_cents === 100
      ? "1 WIP"
      : listing?.price_cents != null
        ? `${listing.price_cents}¢ WIP`
        : undefined,
  };
}

export function buildCommunityGenericAssetPresentation(input: {
  post: {
    post: {
      id: string;
      post_type: string;
      asset?: string | null;
      title?: string | null;
    };
    viewer_is_author: boolean;
  };
  listingsByAssetId: Record<string, ApiCommunityListing | undefined>;
  purchasesByAssetId: Record<string, unknown>;
  onBuy: (listing: ApiCommunityListing, title: string) => void;
  onDownload: (postId: string) => void;
}): GenericAssetPresentationOptions | undefined {
  if (input.post.post.post_type !== "file") return undefined;
  const listing = input.post.post.asset ? input.listingsByAssetId[input.post.post.asset] : undefined;
  return buildGenericAssetPresentation({
    hasEntitlement: Boolean((input.post.post.asset && input.purchasesByAssetId[input.post.post.asset]) || input.post.viewer_is_author),
    listedAccessState: "unknown",
    listing,
    onBuy: listing ? () => input.onBuy(listing, input.post.post.title ?? "Downloadable file") : undefined,
    onDownload: () => input.onDownload(input.post.post.id),
    unlistedAccessState: "purchase_required",
  });
}
