import type { LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";

import type { PostCardProps, SongContentSpec, StoryRegistrationStatus, UpstreamAttribution } from "@/components/compositions/posts/post-card/post-card.types";
import type {
  AssetSourceDescriptor,
  SongPlaybackDescriptor,
} from "@/app/authenticated-helpers/song-commerce";
import type { SongPresentationOptions } from "@/app/authenticated-helpers/post-presentation-types";
import { centsToUsd, formatUsdLabel } from "@/lib/formatting/currency";
import { resolveApiUrl } from "@/lib/api/base-url";
import { buildStoryExplorerIpAssetUrl } from "@/lib/story/story-portal";

type StoryRoyaltyAsset = NonNullable<SongPresentationOptions["asset"]>;
type DownloadableAudioKind = "original" | "instrumental" | "vocals";
type DownloadableAudio = {
  kind?: string | null;
  storage_ref?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  duration_ms?: number | null;
  filename?: string | null;
};

function openDownloadUrl(path: string): void {
  if (typeof window === "undefined") {
    return;
  }
  const opened = window.open(resolveApiUrl(path), "_blank", "noopener,noreferrer");
  if (opened) {
    opened.opener = null;
  }
}

function normalizeDownloadableAudio(postResponse: ApiPost): Map<DownloadableAudioKind, DownloadableAudio> {
  const items = (postResponse.song_presentation as { downloadable_audio?: DownloadableAudio[] | null } | null | undefined)
    ?.downloadable_audio;
  const normalized = new Map<DownloadableAudioKind, DownloadableAudio>();
  if (!Array.isArray(items)) {
    return normalized;
  }

  for (const item of items) {
    if (
      (item.kind === "original" || item.kind === "instrumental" || item.kind === "vocals")
      && typeof item.storage_ref === "string"
      && item.storage_ref.trim()
    ) {
      normalized.set(item.kind, item);
    }
  }

  return normalized;
}

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

function toStoryRegistrationStatus(asset: StoryRoyaltyAsset | null | undefined): StoryRegistrationStatus | undefined {
  switch (asset?.story_royalty_registration_status) {
    case "registered":
      return undefined;
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

function toUpstreamAttributions(
  postResponse: ApiPost,
  songOptions: SongPresentationOptions | undefined,
): UpstreamAttribution[] | undefined {
  const sources = postResponse.derivative_sources;
  if (!sources || sources.length === 0) {
    return undefined;
  }

  return sources.map((source) => ({
    assetId: source.asset ?? source.source_ref,
    relationshipType: source.relationship_type,
    title: source.title,
    artist: source.creator_handle ?? source.creator_display_name ?? undefined,
    href: source.source_post
      ? `/p/${source.source_post}`
      : buildStoryExplorerIpAssetUrl(source.story_ip, songOptions?.storyNetwork) ?? undefined,
  }));
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
    storyRegistration: toStoryRegistrationStatus(songOptions?.asset),
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
  const playbackProgress = playbackDescriptor && playback
    ? playback.getPlaybackProgress(playbackDescriptor.key)
    : undefined;
  const downloadableAudio = normalizeDownloadableAudio(postResponse);
  const downloadableOriginal = downloadableAudio.get("original");
  const downloadableStems: SongContentSpec["stems"] = [];
  const instrumental = downloadableAudio.get("instrumental");
  if (instrumental?.storage_ref) {
    downloadableStems.push({
      kind: "instrumental",
      accessPolicy: "free",
      durationMs: instrumental.duration_ms ?? undefined,
      onDownload: () => openDownloadUrl(instrumental.storage_ref ?? ""),
    });
  }
  const vocals = downloadableAudio.get("vocals");
  if (vocals?.storage_ref) {
    downloadableStems.push({
      kind: "vocals",
      accessPolicy: "free",
      durationMs: vocals.duration_ms ?? undefined,
      onDownload: () => openDownloadUrl(vocals.storage_ref ?? ""),
    });
  }
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
    downloadPolicy: downloadableOriginal ? "free_download" : undefined,
    onDownload: downloadableOriginal?.storage_ref ? () => openDownloadUrl(downloadableOriginal.storage_ref ?? "") : undefined,
    stems: downloadableStems.length ? downloadableStems : undefined,
    entitledStems: downloadableStems.map((stem) => stem.kind),
    onPause: playbackDescriptor && playback ? () => playback.pauseTrack(playbackDescriptor.key) : undefined,
    onPlay: playbackDescriptor && playback ? () => void playback.playTrack(playbackDescriptor) : undefined,
    onSeek: playbackDescriptor && playback ? (progressMs) => void playback.seekTrack(playbackDescriptor, progressMs) : undefined,
    onVerifyAge: input.onVerifyAge,
    playbackState,
    progressMs: playbackProgress?.progressMs,
    annotationsUrl: post.song_annotations_url ?? undefined,
    caption: input.resolvedCaption,
    captionDir: input.captionDir,
    captionLang: input.captionLang,
    priceLabel: listing ? formatUsdLabel(centsToUsd(listing.price_cents), songOptions?.localeTag) : undefined,
    rightsBasis: post.rights_basis ?? undefined,
    songMode: post.song_mode ?? undefined,
    storyRegistration: toStoryRegistrationStatus(songOptions?.asset),
    storyLicenseNotice: songOptions?.storyLicenseNotice,
    title: songPresentation?.title ?? post.song_title ?? input.title,
    artworkSrc: songPresentation?.cover_art_ref ?? undefined,
    durationMs: songPresentation?.duration_ms ?? playbackProgress?.durationMs ?? undefined,
    upstreamAttributions: toUpstreamAttributions(postResponse, songOptions),
  };
}
