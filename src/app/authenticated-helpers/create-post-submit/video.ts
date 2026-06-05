"use client";

import type {
  CommunityListing,
  CreateCommunityListingRequest,
  CreateSongArtifactUploadRequest,
  Post as ApiCreatedPost,
  SongArtifactUpload,
} from "@pirate/api-contracts";

import type {
  AssetLicenseState,
  AuthorMode,
  DerivativeStepState,
  VideoComposerState,
} from "@/components/compositions/posts/post-composer/post-composer.types";
import type { ExtractedVideoPosterFrame } from "@/components/compositions/posts/post-composer/video-poster-frame";
import { buildAssetListingRequest } from "@/app/authenticated-helpers/asset-submit";
import { logger } from "@/lib/logger";
import type { SubmitProgressReporter } from "./progress";

import {
  signIfAgent,
  type BasePostRequestFields,
  type CreatePostEventRequest,
  type CreatePostRequestWithEvent,
  type SignAgentAuthoredBody,
} from "./base";

type AltchaRequestOptions = {
  altchaPayload?: string | null;
};

type SubmitTraceRequestOptions = {
  submitTraceId?: string;
};

type CreatePost = (
  communityId: string,
  request: CreatePostRequestWithEvent,
  options?: AltchaRequestOptions & SubmitTraceRequestOptions,
) => Promise<ApiCreatedPost>;

type CreateListing = (
  communityId: string,
  request: CreateCommunityListingRequest,
) => Promise<CommunityListing>;

type CreateArtifactUpload = (
  communityId: string,
  request: CreateSongArtifactUploadRequest,
  options?: SubmitTraceRequestOptions,
) => Promise<SongArtifactUpload>;

type UploadArtifactContent = (
  communityId: string,
  artifactUploadId: string,
  body: ArrayBuffer,
  options?: SubmitTraceRequestOptions,
) => Promise<SongArtifactUpload>;

type UploadedPosterMedia = {
  media_ref: string;
  mime_type: string;
  size_bytes: number;
};

type UploadPosterMedia = (
  input: { kind: "post_image"; file: File },
  options?: SubmitTraceRequestOptions,
) => Promise<UploadedPosterMedia>;

type ExtractPosterFrameFile = (
  file: File,
  frameSeconds: string | undefined,
  options?: { maxWidth?: number; traceId?: string },
) => Promise<ExtractedVideoPosterFrame & { file: File }>;

type VideoSubmitTrace = {
  readonly startedAtMs: number;
  readonly traceId: string;
};

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function elapsedMs(sinceMs: number): number {
  return Math.round(nowMs() - sinceMs);
}

function createVideoSubmitTrace(): VideoSubmitTrace {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return {
    startedAtMs: nowMs(),
    traceId: `video_submit_${id.replace(/[^a-z0-9]/giu, "").slice(0, 12)}`,
  };
}

function logVideoSubmitTrace(
  trace: VideoSubmitTrace,
  event: string,
  fields: Record<string, unknown> = {},
): void {
  logger.info("[create-post:video-submit]", {
    trace_id: trace.traceId,
    event,
    elapsed_ms: elapsedMs(trace.startedAtMs),
    ...fields,
  });
}

function summarizeFileForTrace(file: File): Record<string, unknown> {
  return {
    mime_type: file.type || "application/octet-stream",
    size_bytes: file.size,
    size_mb: Math.round((file.size / 1024 / 1024) * 10) / 10,
  };
}

async function withVideoSubmitTiming<T>(
  trace: VideoSubmitTrace,
  event: string,
  fields: Record<string, unknown>,
  run: () => Promise<T>,
): Promise<T> {
  const startedAtMs = nowMs();
  logVideoSubmitTrace(trace, `${event}:start`, fields);
  try {
    const result = await run();
    logVideoSubmitTrace(trace, `${event}:done`, {
      ...fields,
      duration_ms: elapsedMs(startedAtMs),
    });
    return result;
  } catch (error) {
    logVideoSubmitTrace(trace, `${event}:failed`, {
      ...fields,
      duration_ms: elapsedMs(startedAtMs),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

function requirePrimaryVideoFile(videoState: VideoComposerState): File {
  const file = videoState.primaryVideoUpload;
  if (!file) {
    throw new Error("Choose a video before creating this post.");
  }
  return file;
}

function deriveVideoUpstreamAssetRefs(derivativeStep?: DerivativeStepState): string[] | undefined {
  if (derivativeStep?.visible !== true || derivativeStep.trigger !== "uses_song") {
    return undefined;
  }
  const refs = Array.from(new Set(
    (derivativeStep.references ?? [])
      .map((reference) => reference.id.trim())
      .filter(Boolean),
  ));
  return refs.length ? refs : undefined;
}

export function buildVideoPostRequest({
  baseRequest,
  caption,
  derivativeStep,
  event,
  license,
  monetized,
  posterFrame,
  title,
  uploadedPoster,
  uploadedVideo,
}: {
  baseRequest: BasePostRequestFields;
  caption: string;
  derivativeStep?: DerivativeStepState;
  event?: CreatePostEventRequest;
  license?: AssetLicenseState;
  monetized: boolean;
  posterFrame: Pick<ExtractedVideoPosterFrame, "frameMs" | "height" | "width">;
  title: string;
  uploadedPoster: UploadedPosterMedia;
  uploadedVideo: Pick<SongArtifactUpload, "content_hash" | "mime_type" | "size_bytes" | "storage_ref">;
}): CreatePostRequestWithEvent {
  const upstreamAssetRefs = deriveVideoUpstreamAssetRefs(derivativeStep);
  return {
    ...baseRequest,
    event,
    post_type: "video",
    title: title.trim(),
    caption: caption.trim() || undefined,
    access_mode: monetized ? "locked" : undefined,
    commercial_rev_share_pct: monetized && license?.presetId === "commercial-remix"
      ? license.commercialRevSharePct
      : undefined,
    license_preset: monetized ? license?.presetId : undefined,
    rights_basis: upstreamAssetRefs?.length ? "derivative" : undefined,
    upstream_asset_refs: upstreamAssetRefs,
    media_refs: [{
      storage_ref: uploadedVideo.storage_ref,
      mime_type: uploadedVideo.mime_type,
      size_bytes: uploadedVideo.size_bytes,
      content_hash: uploadedVideo.content_hash,
      poster_ref: uploadedPoster.media_ref,
      poster_mime_type: uploadedPoster.mime_type,
      poster_size_bytes: uploadedPoster.size_bytes,
      poster_width: posterFrame.width,
      poster_height: posterFrame.height,
      poster_frame_ms: posterFrame.frameMs,
    }],
  };
}

export async function uploadVideoArtifact({
  communityId,
  createArtifactUpload,
  trace,
  uploadArtifactContent,
  videoState,
}: {
  communityId: string;
  createArtifactUpload: CreateArtifactUpload;
  trace?: VideoSubmitTrace;
  uploadArtifactContent: UploadArtifactContent;
  videoState: VideoComposerState;
}): Promise<SongArtifactUpload> {
  const file = requirePrimaryVideoFile(videoState);
  const uploadFields = summarizeFileForTrace(file);
  const intent = trace
    ? await withVideoSubmitTiming(trace, "video_upload_intent", uploadFields, () => createArtifactUpload(communityId, {
        artifact_kind: "primary_video",
        mime_type: file.type,
        filename: file.name,
        size_bytes: file.size,
      }, { submitTraceId: trace.traceId }))
    : await createArtifactUpload(communityId, {
        artifact_kind: "primary_video",
        mime_type: file.type,
        filename: file.name,
        size_bytes: file.size,
      });
  const content = trace
    ? await withVideoSubmitTiming(trace, "video_file_read", uploadFields, () => file.arrayBuffer())
    : await file.arrayBuffer();
  const contentFields = { ...uploadFields, artifact_upload_id: intent.id };
  return trace
    ? await withVideoSubmitTiming(trace, "video_content_upload", contentFields, () => uploadArtifactContent(communityId, intent.id, content, { submitTraceId: trace.traceId }))
    : await uploadArtifactContent(communityId, intent.id, content);
}

export async function submitVideoPost({
  altchaOptions,
  authorMode,
  baseRequest,
  caption,
  charityContributionPct,
  charityPartnerId,
  communityId,
  createArtifactUpload,
  createListing,
  createPost,
  derivativeStep,
  event,
  extractPosterFrameFile,
  license,
  monetized,
  paidAssetPriceUsd,
  posterFrameMaxWidth,
  pricingPolicyRegionalPricingEnabled,
  reportProgress,
  regionalPricingEnabled,
  signAgentAuthoredBody,
  title,
  uploadArtifactContent,
  uploadMedia,
  videoState,
}: {
  altchaOptions?: AltchaRequestOptions;
  authorMode: AuthorMode;
  baseRequest: BasePostRequestFields;
  caption: string;
  charityContributionPct?: number | null;
  charityPartnerId?: string | null;
  communityId: string;
  createArtifactUpload: CreateArtifactUpload;
  createListing: CreateListing;
  createPost: CreatePost;
  derivativeStep?: DerivativeStepState;
  event?: CreatePostEventRequest;
  extractPosterFrameFile: ExtractPosterFrameFile;
  license?: AssetLicenseState;
  monetized: boolean;
  paidAssetPriceUsd: number | null;
  posterFrameMaxWidth?: number;
  pricingPolicyRegionalPricingEnabled: boolean;
  reportProgress?: SubmitProgressReporter;
  regionalPricingEnabled: boolean;
  signAgentAuthoredBody: SignAgentAuthoredBody;
  title: string;
  uploadArtifactContent: UploadArtifactContent;
  uploadMedia: UploadPosterMedia;
  videoState: VideoComposerState;
}): Promise<ApiCreatedPost> {
  const trace = createVideoSubmitTrace();
  reportProgress?.("validating");
  const file = requirePrimaryVideoFile(videoState);
  const upstreamAssetRefs = deriveVideoUpstreamAssetRefs(derivativeStep);
  logVideoSubmitTrace(trace, "start", {
    ...summarizeFileForTrace(file),
    access_mode: monetized ? "locked" : "public",
    derivative_source_count: upstreamAssetRefs?.length ?? 0,
    poster_frame_seconds: videoState.posterFrameSeconds ?? null,
  });
  reportProgress?.("upload_video");
  const uploadedVideo = await uploadVideoArtifact({
    communityId,
    createArtifactUpload,
    trace,
    uploadArtifactContent,
    videoState,
  });
  reportProgress?.("extract_poster");
  const posterFrame = await withVideoSubmitTiming(trace, "poster_extract", {
    poster_frame_seconds: videoState.posterFrameSeconds ?? null,
    poster_frame_max_width: posterFrameMaxWidth ?? null,
  }, () => extractPosterFrameFile(
    file,
    videoState.posterFrameSeconds,
    { maxWidth: posterFrameMaxWidth, traceId: trace.traceId },
  ));
  logVideoSubmitTrace(trace, "poster_extract:frame", {
    frame_ms: posterFrame.frameMs,
    poster_height: posterFrame.height,
    poster_width: posterFrame.width,
    poster_size_bytes: posterFrame.file.size,
  });
  reportProgress?.("upload_poster");
  const uploadedPoster = await withVideoSubmitTiming(trace, "poster_upload", {
    poster_mime_type: posterFrame.file.type,
    poster_size_bytes: posterFrame.file.size,
  }, () => uploadMedia({
    kind: "post_image",
    file: posterFrame.file,
  }, { submitTraceId: trace.traceId }));
  const request = buildVideoPostRequest({
    baseRequest,
    caption,
    derivativeStep,
    event,
    license,
    monetized,
    posterFrame,
    title,
    uploadedPoster,
    uploadedVideo,
  });
  reportProgress?.("publish_post");
  const post = await withVideoSubmitTiming(trace, "post_publish", {
    access_mode: request.access_mode ?? "public",
    rights_basis: request.rights_basis ?? null,
    upstream_asset_ref_count: request.upstream_asset_refs?.length ?? 0,
  }, async () => createPost(
    communityId,
    await withVideoSubmitTiming(trace, "post_sign", {
      author_mode: authorMode,
    }, () => signIfAgent({
      authorMode,
      path: `/communities/${communityId}/posts`,
      request,
      signAgentAuthoredBody,
    })),
    {
      ...altchaOptions,
      submitTraceId: trace.traceId,
    },
  ));
  logVideoSubmitTrace(trace, "post_publish:result", {
    post_id: post.id,
    asset_id: post.asset ?? null,
    status: post.status,
  });

  if (!monetized) {
    logVideoSubmitTrace(trace, "done", {
      post_id: post.id,
      duration_ms: elapsedMs(trace.startedAtMs),
    });
    return post;
  }

  if (!post.asset) {
    throw new Error("The video published, but the paid asset was not created.");
  }
  const listingRequest = buildAssetListingRequest({
    assetId: post.asset,
    paidSongPriceUsd: paidAssetPriceUsd,
    pricingPolicyRegionalPricingEnabled,
    regionalPricingEnabled,
    charityContributionPct,
    charityPartnerId,
  });
  if (!listingRequest) {
    throw new Error("The video published, but the paid listing payload was not created.");
  }
  reportProgress?.("create_listing");
  await withVideoSubmitTiming(trace, "listing_create", {
    asset_id: post.asset,
  }, () => createListing(communityId, listingRequest));
  logVideoSubmitTrace(trace, "done", {
    post_id: post.id,
    asset_id: post.asset,
    duration_ms: elapsedMs(trace.startedAtMs),
  });
  return post;
}
