import type {
  CommunityListing as ApiCommunityListing,
  CommunityPurchase as ApiCommunityPurchase,
  LocalizedPostResponse as ApiPost,
} from "@pirate/api-contracts";

import type { PostCardProps, SongContentSpec, SongStorageProof, StoryRegistrationStatus, UpstreamAttribution } from "@/components/compositions/posts/post-card/post-card.types";
import type {
  AssetSourceDescriptor,
  SongPlaybackDescriptor,
} from "@/app/authenticated-helpers/song-commerce";
import type { SongPresentationOptions } from "@/app/authenticated-helpers/post-presentation-types";
import { centsToUsd, formatUsdLabel } from "@/lib/formatting/currency";
import { resolveApiUrl } from "@/lib/api/base-url";
import { getAccessToken } from "@/lib/api/session-store";
import { buildStoryExplorerIpAssetUrl } from "@/lib/story/story-portal";
import { toast } from "@/components/primitives/sonner";
import { normalizeMediaAspectRatio } from "@/components/compositions/posts/video-preview-layout";

type StoryRoyaltyAsset = NonNullable<SongPresentationOptions["asset"]>;
type VinylReleaseCarrier = Pick<ApiCommunityListing | ApiCommunityPurchase, "vinyl_release_provider" | "vinyl_release_url">;
type DownloadableAudioKind = "original" | "instrumental" | "vocals";
type DownloadableAudio = {
  kind?: string | null;
  storage_ref?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  duration_ms?: number | null;
  filename?: string | null;
  decentralized_storage?: unknown;
};
type SongPresentationWithDownloads = NonNullable<ApiPost["song_presentation"]> & {
  downloadable_audio?: DownloadableAudio[] | null;
  instrumental_audio?: DownloadableAudio | null;
  vocal_audio?: DownloadableAudio | null;
};

function stringField(input: unknown, key: string): string | undefined {
  if (!input || typeof input !== "object") return undefined;

  const value = (input as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberField(input: unknown, key: string): number | undefined {
  if (!input || typeof input !== "object") return undefined;

  const value = (input as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function videoMediaAspectRatio(input: unknown): number | undefined {
  const width = numberField(input, "width") ?? numberField(input, "poster_width");
  const height = numberField(input, "height") ?? numberField(input, "poster_height");
  return normalizeMediaAspectRatio(width ?? 0, height ?? 0);
}

function ipfsGatewayUrl(cid: string): string {
  return `https://dweb.link/ipfs/${encodeURIComponent(cid)}`;
}

function cidFromStorageRef(storageRef: string | undefined): string | undefined {
  if (!storageRef) return undefined;

  if (storageRef.startsWith("ipfs://")) {
    return storageRef.slice("ipfs://".length).split(/[/?#]/u)[0] || undefined;
  }

  try {
    const parsed = new URL(storageRef);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const ipfsIndex = parts.findIndex((part) => part.toLowerCase() === "ipfs");
    return ipfsIndex >= 0 ? parts[ipfsIndex + 1] : undefined;
  } catch {
    return undefined;
  }
}

function toSongStorageProof(input: unknown): SongStorageProof | undefined {
  if (!input || typeof input !== "object") return undefined;

  const proof = (input as Record<string, unknown>).decentralized_storage;
  const storageRef = stringField(input, "storage_ref");
  const cid = stringField(proof, "cid") ?? stringField(input, "ipfs_cid") ?? cidFromStorageRef(storageRef);
  const gatewayUrl = stringField(proof, "gateway_url")
    ?? stringField(input, "gateway_url")
    ?? (storageRef?.startsWith("http") && cid ? storageRef : undefined)
    ?? (cid ? ipfsGatewayUrl(cid) : undefined);
  if (!cid || !gatewayUrl) return undefined;

  return {
    cid,
    gatewayUrl,
    encrypted: proof && typeof proof === "object" && (proof as Record<string, unknown>).encrypted === true ? true : undefined,
  };
}

function audioKindLabel(kind: DownloadableAudioKind): string {
  switch (kind) {
    case "instrumental":
      return "instrumental";
    case "vocals":
      return "vocals";
    case "original":
    default:
      return "original";
  }
}

function extensionFromMimeType(mimeType: string | null | undefined): string | null {
  switch (mimeType?.toLowerCase()) {
    case "audio/aac":
      return "aac";
    case "audio/flac":
      return "flac";
    case "audio/m4a":
    case "audio/x-m4a":
      return "m4a";
    case "audio/mp4":
      return "mp4";
    case "audio/ogg":
      return "ogg";
    case "audio/wav":
    case "audio/x-wav":
      return "wav";
    case "audio/webm":
      return "webm";
    case "audio/mp3":
    case "audio/mpeg":
      return "mp3";
    default:
      return null;
  }
}

function extensionFromPath(path: string | null | undefined): string | null {
  const match = path?.split(/[?#]/u)[0]?.match(/\.([a-z0-9]{2,5})$/iu);
  return match?.[1]?.toLowerCase() ?? null;
}

function slugForFilename(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
  return slug || "song";
}

function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;

  const encoded = header.match(/filename\*=UTF-8''([^;]+)/iu)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded);
    } catch {
      return encoded;
    }
  }

  return header.match(/filename="?([^";]+)"?/iu)?.[1] ?? null;
}

function audioDownloadFilename(input: {
  item: DownloadableAudio;
  kind: DownloadableAudioKind;
  title: string;
}): string {
  const explicit = input.item.filename?.trim();
  if (explicit) return explicit;

  const extension = extensionFromMimeType(input.item.mime_type) ?? extensionFromPath(input.item.storage_ref);
  const base = `${slugForFilename(input.title)}-${audioKindLabel(input.kind)}`;
  return extension ? `${base}.${extension}` : base;
}

function triggerBrowserDownload(blob: Blob, filename: string): void {
  if (typeof document === "undefined" || typeof URL === "undefined") return;

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
}

async function downloadAudioFile(input: {
  filename: string;
  path: string;
}): Promise<void> {
  try {
    const token = getAccessToken();
    const response = await fetch(resolveApiUrl(input.path), {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`);
    }

    const blob = await response.blob();
    triggerBrowserDownload(
      blob,
      filenameFromContentDisposition(response.headers.get("content-disposition")) ?? input.filename,
    );
  } catch {
    toast.error("Could not download this audio.");
  }
}

function isDownloadableAudioKind(value: unknown): value is DownloadableAudioKind {
  return value === "original" || value === "instrumental" || value === "vocals";
}

function addDownloadableAudio(
  normalized: Map<DownloadableAudioKind, DownloadableAudio>,
  kind: DownloadableAudioKind,
  item: DownloadableAudio | null | undefined,
): void {
  if (normalized.has(kind) || !item?.storage_ref?.trim()) return;
  normalized.set(kind, item);
}

function normalizeDownloadableAudio(postResponse: ApiPost): Map<DownloadableAudioKind, DownloadableAudio> {
  const presentation = postResponse.song_presentation as SongPresentationWithDownloads | null | undefined;
  const normalized = new Map<DownloadableAudioKind, DownloadableAudio>();

  for (const item of presentation?.downloadable_audio ?? []) {
    if (isDownloadableAudioKind(item.kind)) {
      addDownloadableAudio(normalized, item.kind, item);
    }
  }

  addDownloadableAudio(normalized, "instrumental", presentation?.instrumental_audio);
  addDownloadableAudio(normalized, "vocals", presentation?.vocal_audio);

  if ((postResponse.post.access_mode ?? "public") === "public") {
    addDownloadableAudio(normalized, "original", postResponse.post.media_refs?.[0] as DownloadableAudio | undefined);
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

function toVinylReleaseSpec(input: {
  listing?: VinylReleaseCarrier | null;
  purchase?: VinylReleaseCarrier | null;
}): SongContentSpec["vinylRelease"] | undefined {
  const provider = input.purchase?.vinyl_release_provider ?? input.listing?.vinyl_release_provider ?? null;
  const url = input.purchase?.vinyl_release_url ?? input.listing?.vinyl_release_url ?? null;

  if (provider !== "elasticstage") {
    return undefined;
  }

  const normalizedUrl = url?.trim();
  return {
    available: true,
    provider,
    url: normalizedUrl || undefined,
  };
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
    aspectRatio: videoMediaAspectRatio(primaryMedia),
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
  const accessMode = post.access_mode ?? "public";
  const hasEntitlement = accessMode === "public"
    || Boolean(purchase)
    || Boolean(songOptions?.currentUserId && post.author_user === songOptions.currentUserId);
  const downloadableAudio = normalizeDownloadableAudio(postResponse);
  const downloadableOriginal = downloadableAudio.get("original");
  const downloadableStems: SongContentSpec["stems"] = [];
  const instrumental = downloadableAudio.get("instrumental");
  if (instrumental?.storage_ref) {
    downloadableStems.push({
      kind: "instrumental",
      accessPolicy: "free",
      durationMs: instrumental.duration_ms ?? undefined,
      onDownload: () => void downloadAudioFile({
        filename: audioDownloadFilename({
          item: instrumental,
          kind: "instrumental",
          title: songPresentation?.title ?? post.song_title ?? input.title,
        }),
        path: instrumental.storage_ref ?? "",
      }),
    });
  }
  const vocals = downloadableAudio.get("vocals");
  if (vocals?.storage_ref) {
    downloadableStems.push({
      kind: "vocals",
      accessPolicy: "free",
      durationMs: vocals.duration_ms ?? undefined,
      onDownload: () => void downloadAudioFile({
        filename: audioDownloadFilename({
          item: vocals,
          kind: "vocals",
          title: songPresentation?.title ?? post.song_title ?? input.title,
        }),
        path: vocals.storage_ref ?? "",
      }),
    });
  }
  const primaryProof = toSongStorageProof(post.media_refs?.[0]);
  const originalProof = toSongStorageProof(downloadableOriginal) ?? (accessMode === "public" ? primaryProof : undefined);
  const storageProofs: SongContentSpec["storageProofs"] = {};
  if (originalProof && (accessMode === "public" || hasEntitlement)) {
    storageProofs.original = originalProof;
  }
  if (primaryProof && accessMode === "locked" && !hasEntitlement) {
    storageProofs.preview = primaryProof;
  }
  return {
    type: "song",
    accessMode,
    ageGatePolicy: post.age_gate_policy,
    ageGateViewerState: postResponse.age_gate_viewer_state ?? undefined,
    analysisState: post.analysis_state,
    contentSafetyState: post.content_safety_state,
    hasEntitlement,
    listingMode: listing ? "listed" : "not_listed",
    listingStatus: listing?.status === "active"
      ? "active"
      : listing?.status === "paused"
      ? "paused"
      : undefined,
    onBuy: songOptions?.onBuy,
    downloadPolicy: downloadableOriginal ? "free_download" : undefined,
    onDownload: downloadableOriginal?.storage_ref ? () => void downloadAudioFile({
      filename: audioDownloadFilename({
        item: downloadableOriginal,
        kind: "original",
        title: songPresentation?.title ?? post.song_title ?? input.title,
      }),
      path: downloadableOriginal.storage_ref ?? "",
    }) : undefined,
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
    vinylRelease: toVinylReleaseSpec({ listing, purchase }),
    artworkSrc: songPresentation?.cover_art_ref ?? undefined,
    durationMs: songPresentation?.duration_ms ?? playbackProgress?.durationMs ?? undefined,
    storageProofs: Object.keys(storageProofs).length > 0 ? storageProofs : undefined,
    upstreamAttributions: toUpstreamAttributions(postResponse, songOptions),
  };
}
