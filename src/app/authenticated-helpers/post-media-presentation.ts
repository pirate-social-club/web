import type { LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";

import type { PostCardProps, SongContentSpec, StoryRegistrationStatus } from "@/components/compositions/posts/post-card/post-card.types";
import type {
  AssetSourceDescriptor,
  SongPlaybackDescriptor,
} from "@/app/authenticated-helpers/song-commerce";
import type { SongPresentationOptions } from "@/app/authenticated-helpers/post-presentation-types";
import { centsToUsd, formatUsdLabel } from "@/lib/formatting/currency";
import type { PirateStoryNetwork } from "@/lib/network-config";
import { buildStoryPortalAssetUrl } from "@/lib/story/story-portal";

type StoryRoyaltyAsset = Pick<
  NonNullable<SongPresentationOptions["asset"]>,
  "story_error" | "story_ip" | "story_royalty_registration_status"
>;

function formatStoryRegistrationFailure(error: string | null | undefined): string {
  const normalized = error?.trim() ?? "";
  if (normalized.includes("story_royalty_config_missing")) {
    return "Story royalty configuration is missing. This will not appear as a remix source until registration is retried.";
  }
  if (normalized.includes("story_royalty_registration_unavailable")) {
    return "Story registration is unavailable. This will not appear as a remix source until registration succeeds.";
  }
  if (normalized) {
    const readable = normalized
      .replace(/^royalty_registration_failed:/, "")
      .replace(/_/g, " ");
    return `Story registration failed: ${readable}.`;
  }
  return "This will not appear as a remix source until Story registration succeeds.";
}

function toStoryRegistrationStatus(
  asset: StoryRoyaltyAsset | null | undefined,
  storyNetwork: PirateStoryNetwork | null | undefined,
): StoryRegistrationStatus | undefined {
  switch (asset?.story_royalty_registration_status) {
    case "registered": {
      const portalHref = buildStoryPortalAssetUrl(asset.story_ip, storyNetwork);
      return {
        state: "registered",
        label: "Remix-eligible",
        description: "Story IP registration is complete.",
        portalHref: portalHref ?? undefined,
      };
    }
    case "pending":
      return {
        state: "pending",
        label: "IP registration in progress",
        description: "This will appear as a remix source after Story registration completes.",
      };
    case "failed":
      return {
        state: "failed",
        label: "IP registration failed",
        description: formatStoryRegistrationFailure(asset.story_error),
      };
    case "none":
    default:
      return undefined;
  }
}

function toSongPlaybackDescriptor(
  postResponse: ApiPost,
  input: {
    currentUserId?: string | null;
    purchase?: SongPresentationOptions["purchase"];
  },
): SongPlaybackDescriptor | null {
  const { post } = postResponse;
  const songTitle = postResponse.song_presentation?.title ?? post.song_title ?? post.title ?? "song";
  const mediaRef = post.media_refs?.[0]?.storage_ref ?? null;
  const viewerOwnsPost = Boolean(input.currentUserId && post.author_user === input.currentUserId);
  const isLocked = (post.access_mode ?? "public") === "locked";
  const hasFullAccess = !isLocked || viewerOwnsPost || Boolean(input.purchase);

  if (!isLocked && mediaRef) {
    return {
      key: `public:${post.id}`,
      title: songTitle,
      kind: "source",
      sourcePath: mediaRef,
      requiresAuth: false,
    };
  }

  if (hasFullAccess && post.asset) {
    return {
      key: `asset:${post.asset}`,
      title: songTitle,
      kind: "asset",
      communityId: post.community,
      assetId: post.asset,
    };
  }

  if (mediaRef) {
    return {
      key: `preview:${post.id}`,
      title: songTitle,
      kind: "source",
      sourcePath: mediaRef,
      requiresAuth: false,
    };
  }

  return null;
}

function toVideoAssetSourceDescriptor(
  postResponse: ApiPost,
  input: {
    currentUserId?: string | null;
    purchase?: SongPresentationOptions["purchase"];
  },
): AssetSourceDescriptor | null {
  const { post } = postResponse;
  const viewerOwnsPost = Boolean(input.currentUserId && post.author_user === input.currentUserId);
  const isLocked = (post.access_mode ?? "public") === "locked";
  const hasFullAccess = isLocked && (viewerOwnsPost || Boolean(input.purchase));

  if (!hasFullAccess || !post.asset) {
    return null;
  }

  return {
    key: `video-asset:${post.asset}`,
    title: post.title ?? "video",
    communityId: post.community,
    assetId: post.asset,
  };
}

function toSongVinylRelease(input: {
  listing?: SongPresentationOptions["listing"];
  purchase?: SongPresentationOptions["purchase"];
}): SongContentSpec["vinylRelease"] {
  const provider = input.purchase?.vinyl_release_provider
    ?? input.listing?.vinyl_release_provider
    ?? null;
  const purchaseUrl = input.purchase?.vinyl_release_url?.trim() || null;
  const available = provider === "elasticstage"
    && (input.listing?.vinyl_release_available === true || Boolean(purchaseUrl));

  if (!available) {
    return undefined;
  }

  return purchaseUrl
    ? {
        available: true,
        provider: "elasticstage",
        url: purchaseUrl,
      }
    : {
        available: true,
        provider: "elasticstage",
      };
}

export function toVideoPostContent(
  postResponse: ApiPost,
  songOptions: SongPresentationOptions | undefined,
  input: {
    captionDir?: "rtl";
    captionLang?: string;
    onVerifyAge?: () => void;
    resolvedCaption?: string;
    title: string;
  },
): PostCardProps["content"] {
  const { post } = postResponse;
  const primaryMedia = post.media_refs?.[0];
  const listing = songOptions?.listing;
  const purchase = songOptions?.purchase;
  const accessMode = post.access_mode ?? "public";
  const assetSourceDescriptor = toVideoAssetSourceDescriptor(postResponse, {
    currentUserId: songOptions?.currentUserId,
    purchase,
  });
  const assetSourceState = assetSourceDescriptor && songOptions?.playback
    ? songOptions.playback.getAssetSourceState(assetSourceDescriptor.key)
    : undefined;
  const storyAsset = songOptions?.asset ?? postResponse.asset_story;
  return {
    type: "video",
    accessMode,
    ageGatePolicy: post.age_gate_policy,
    ageGateViewerState: postResponse.age_gate_viewer_state ?? undefined,
    analysisState: post.analysis_state,
    caption: input.resolvedCaption,
    captionDir: input.captionDir,
    captionLang: input.captionLang,
    contentSafetyState: post.content_safety_state,
    durationMs: primaryMedia?.duration_ms ?? undefined,
    hasEntitlement: accessMode === "public"
      || Boolean(purchase)
      || Boolean(songOptions?.currentUserId && post.author_user === songOptions.currentUserId),
    listingMode: listing ? "listed" : "not_listed",
    listingStatus: listing?.status === "active"
      ? "active"
      : listing?.status === "paused"
      ? "paused"
      : undefined,
    onBuy: songOptions?.onBuy,
    onVerifyAge: input.onVerifyAge,
    onPlay: assetSourceDescriptor && songOptions?.playback
      ? () => void songOptions.playback?.loadAssetSource(assetSourceDescriptor)
      : undefined,
    playbackState: assetSourceState?.playbackState ?? "idle",
    posterSrc: primaryMedia?.poster_ref ?? undefined,
    priceLabel: listing ? formatUsdLabel(centsToUsd(listing.price_cents), songOptions?.localeTag) : undefined,
    storyRegistration: toStoryRegistrationStatus(storyAsset, songOptions?.storyNetwork),
    src: assetSourceState?.src ?? primaryMedia?.storage_ref ?? "",
    title: post.song_title ?? input.title,
  };
}

export function toSongPostContent(
  postResponse: ApiPost,
  songOptions: SongPresentationOptions | undefined,
  input: {
    captionDir?: "rtl";
    captionLang?: string;
    onVerifyAge?: () => void;
    resolvedCaption?: string;
    title: string;
  },
): PostCardProps["content"] {
  const { post } = postResponse;
  const songPresentation = postResponse.song_presentation;
  const listing = songOptions?.listing;
  const purchase = songOptions?.purchase;
  const playback = songOptions?.playback;
  const playbackDescriptor = toSongPlaybackDescriptor(postResponse, {
    currentUserId: songOptions?.currentUserId,
    purchase,
  });
  const playbackState: SongContentSpec["playbackState"] = playbackDescriptor && playback
    ? playback.getPlaybackState(playbackDescriptor.key)
    : "idle";
  const upstreamAttributions = post.upstream_asset_refs?.map((assetRef, index) => ({
    assetId: assetRef,
    relationshipType: "remix_of" as const,
    title: `Source ${index + 1}`,
  }));

  const storyAsset = songOptions?.asset ?? postResponse.asset_story;
  return {
    type: "song",
    accessMode: post.access_mode ?? "public",
    ageGatePolicy: post.age_gate_policy,
    ageGateViewerState: postResponse.age_gate_viewer_state ?? undefined,
    analysisState: post.analysis_state,
    contentSafetyState: post.content_safety_state,
    hasEntitlement: (post.access_mode ?? "public") === "public"
      || Boolean(purchase)
      || Boolean(songOptions?.currentUserId && post.author_user === songOptions.currentUserId),
    listingMode: listing ? "listed" : "not_listed",
    listingStatus: listing?.status === "active"
      ? "active"
      : listing?.status === "paused"
      ? "paused"
      : undefined,
    onBuy: songOptions?.onBuy,
    onPause: playbackDescriptor && playback ? () => playback.pauseTrack(playbackDescriptor.key) : undefined,
    onPlay: playbackDescriptor && playback ? () => void playback.playTrack(playbackDescriptor) : undefined,
    onVerifyAge: input.onVerifyAge,
    playbackState,
    annotationsUrl: post.song_annotations_url ?? undefined,
    caption: input.resolvedCaption,
    captionDir: input.captionDir,
    captionLang: input.captionLang,
    priceLabel: listing ? formatUsdLabel(centsToUsd(listing.price_cents), songOptions?.localeTag) : undefined,
    rightsBasis: post.rights_basis ?? undefined,
    songMode: post.song_mode ?? undefined,
    storyRegistration: toStoryRegistrationStatus(storyAsset, songOptions?.storyNetwork),
    storyLicenseNotice: songOptions?.storyLicenseNotice,
    title: songPresentation?.title ?? post.song_title ?? input.title,
    artworkSrc: songPresentation?.cover_art_ref ?? undefined,
    durationMs: songPresentation?.duration_ms ?? undefined,
    upstreamAttributions: upstreamAttributions?.length ? upstreamAttributions : undefined,
    vinylRelease: toSongVinylRelease({ listing, purchase }),
  };
}
