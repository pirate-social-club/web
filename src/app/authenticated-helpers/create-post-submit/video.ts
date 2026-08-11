"use client";

import type {
  CreateSongArtifactUploadRequest,
  Post as ApiCreatedPost,
  SongArtifactUpload,
} from "@pirate/api-contracts";

import type {
  AssetLicenseState,
  AssetRoyaltySplitState,
  AuthorMode,
  DerivativeStepState,
  VideoComposerState,
} from "@/components/compositions/posts/post-composer/post-composer.types";
import type { ExtractedVideoPosterFrame } from "@/components/compositions/posts/post-composer/video-poster-frame";
import { buildAssetListingRequest, buildRoyaltyAllocationRequests } from "@/app/authenticated-helpers/asset-submit";
import { logger } from "@/lib/logger";
import { sha256File } from "./file-hash";
import { assertProgressiveMp4Layout } from "./progressive-mp4";
import type { SubmitProgressReporter } from "./progress";
import { uploadMultipartSongArtifact } from "./multipart-song-artifact-upload";

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

type CreatePost = (
  communityId: string,
  request: CreatePostRequestWithEvent,
  options?: AltchaRequestOptions,
) => Promise<ApiCreatedPost>;

type CreateArtifactUpload = (
  communityId: string,
  request: CreateSongArtifactUploadRequest,
) => Promise<SongArtifactUpload>;

type UploadArtifactContent = (
  communityId: string,
  artifactUploadId: string,
  body: ArrayBuffer,
  onProgress?: (fraction: number) => void,
) => Promise<SongArtifactUpload>;

type GetArtifactUploadPartSignedUrl = (
  communityId: string,
  artifactUploadId: string,
  sessionId: string,
  partNumber: number,
) => Promise<{ url: string }>;

type CompleteArtifactUploadSession = (
  communityId: string,
  artifactUploadId: string,
  sessionId: string,
  body: {
    upload_id: string;
    parts: Array<{ part_number: number; etag: string }>;
    content_hash?: string | null;
  },
) => Promise<SongArtifactUpload>;

type AbortArtifactUploadSession = (
  communityId: string,
  artifactUploadId: string,
  sessionId: string,
) => Promise<void>;

export type UploadedPosterMedia = {
  media_ref: string;
  mime_type: string;
  size_bytes: number;
};

export type PreparedVideoPosterUpload = {
  frame: ExtractedVideoPosterFrame & { file: File };
  uploaded: UploadedPosterMedia;
};

type UploadPosterMedia = (
  input: { kind: "post_image"; file: File; onProgress?: (fraction: number) => void },
) => Promise<UploadedPosterMedia>;

type ExtractPosterFrameFile = (
  file: File,
  frameSeconds: string | undefined,
  options?: { maxWidth?: number },
) => Promise<ExtractedVideoPosterFrame & { file: File }>;

const LOCKED_PRIMARY_VIDEO_MAX_BYTES = 50 * 1024 * 1024;
const PUBLIC_PRIMARY_VIDEO_MAX_BYTES = 2 * 1024 * 1024 * 1024;
const MULTIPART_UPLOAD_CONCURRENCY = 3;
const VIDEO_ARTIFACT_PART_UPLOAD_TIMEOUT_MS = 60_000;

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
  if (!refs.length) {
    throw new Error("Attach a source song before publishing this video.");
  }
  return refs;
}

export function buildVideoPostRequest({
  baseRequest,
  caption,
  derivativeStep,
  event,
  license,
  monetized,
  posterFrame,
  royaltySplit,
  charityContributionPct,
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
  royaltySplit?: AssetRoyaltySplitState;
  charityContributionPct?: number | null;
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
    access_mode: monetized ? "locked" : "public",
    commercial_rev_share_pct: monetized && license?.presetId === "commercial-remix"
      ? license.commercialRevSharePct
      : undefined,
    license_preset: monetized ? license?.presetId : undefined,
    royalty_allocations: monetized
      ? buildRoyaltyAllocationRequests(royaltySplit, {
          charityContributionPct,
          contentLabel: "video",
          license,
        })
      : undefined,
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
  abortArtifactUploadSession,
  completeArtifactUploadSession,
  communityId,
  createArtifactUpload,
  getArtifactUploadPartSignedUrl,
  monetized = false,
  reportProgress,
  videoState,
}: {
  abortArtifactUploadSession?: AbortArtifactUploadSession;
  completeArtifactUploadSession?: CompleteArtifactUploadSession;
  communityId: string;
  createArtifactUpload: CreateArtifactUpload;
  getArtifactUploadPartSignedUrl?: GetArtifactUploadPartSignedUrl;
  monetized?: boolean;
  reportProgress?: SubmitProgressReporter;
  uploadArtifactContent: UploadArtifactContent;
  videoState: VideoComposerState;
}): Promise<SongArtifactUpload> {
  const file = requirePrimaryVideoFile(videoState);
  if (monetized && file.size > LOCKED_PRIMARY_VIDEO_MAX_BYTES) {
    throw new Error("Paid videos are currently capped at 50 MB while encrypted delivery is being upgraded.");
  }
  if (!monetized && file.size > PUBLIC_PRIMARY_VIDEO_MAX_BYTES) {
    throw new Error("Public videos are currently capped at 2 GB.");
  }
  if (!getArtifactUploadPartSignedUrl || !completeArtifactUploadSession || !abortArtifactUploadSession) {
    throw new Error("Video upload support is not configured.");
  }
  await assertProgressiveMp4Layout(file);
  const contentHashPromise = sha256File(file);
  const createIntent = () => createArtifactUpload(communityId, {
    artifact_kind: "primary_video",
    mime_type: file.type,
    filename: file.name,
    size_bytes: file.size,
    upload_mode: "direct_multipart",
  });
  const intent = await createIntent();
  return await uploadMultipartSongArtifact({
    abortSession: (artifactUploadId, sessionId) => abortArtifactUploadSession(
      communityId,
      artifactUploadId,
      sessionId,
    ),
    artifactLabel: "Video",
    completeSession: (artifactUploadId, sessionId, body) => completeArtifactUploadSession(
      communityId,
      artifactUploadId,
      sessionId,
      body,
    ),
    concurrency: MULTIPART_UPLOAD_CONCURRENCY,
    contentHashPromise,
    createIntent,
    file,
    getPartSignedUrl: (artifactUploadId, sessionId, partNumber) => getArtifactUploadPartSignedUrl(
      communityId,
      artifactUploadId,
      sessionId,
      partNumber,
    ),
    intent,
    onAbortError: () => {
      // The API reaper is the cleanup backstop for abandoned multipart sessions.
    },
    onProgress: (fraction) => reportProgress?.("upload_video", `${Math.round(fraction * 100)}%`),
    onSessionRestart: ({ error, previousIntent, providerCode }) => {
      logger.warn("[video-submit] restarting missing multipart session", {
        error,
        intentId: previousIntent.id,
        providerCode,
      });
    },
    partUploadTimeoutMs: VIDEO_ARTIFACT_PART_UPLOAD_TIMEOUT_MS,
  });
}

export async function submitVideoPost({
  altchaOptions,
  abortArtifactUploadSession,
  authorMode,
  baseRequest,
  caption,
  charityContributionPct,
  charityPartnerId,
  completeArtifactUploadSession,
  communityId,
  createArtifactUpload,
  createPost,
  derivativeStep,
  event,
  extractPosterFrameFile,
  getArtifactUploadPartSignedUrl,
  license,
  monetized,
  onPosterUploaded,
  onVideoUploaded,
  paidAssetPriceUsd,
  posterFrameMaxWidth,
  pricingPolicyRegionalPricingEnabled,
  reportProgress,
  regionalPricingEnabled,
  royaltySplit,
  signAgentAuthoredBody,
  title,
  preparedPoster: existingPreparedPoster,
  uploadedVideo: existingUploadedVideo,
  uploadArtifactContent,
  uploadMedia,
  videoState,
}: {
  altchaOptions?: AltchaRequestOptions;
  abortArtifactUploadSession?: AbortArtifactUploadSession;
  authorMode: AuthorMode;
  baseRequest: BasePostRequestFields;
  caption: string;
  charityContributionPct?: number | null;
  charityPartnerId?: string | null;
  completeArtifactUploadSession?: CompleteArtifactUploadSession;
  communityId: string;
  createArtifactUpload: CreateArtifactUpload;
  createPost: CreatePost;
  derivativeStep?: DerivativeStepState;
  event?: CreatePostEventRequest;
  extractPosterFrameFile: ExtractPosterFrameFile;
  getArtifactUploadPartSignedUrl?: GetArtifactUploadPartSignedUrl;
  license?: AssetLicenseState;
  monetized: boolean;
  onPosterUploaded?: (preparedPoster: PreparedVideoPosterUpload) => void;
  onVideoUploaded?: (uploadedVideo: SongArtifactUpload) => void;
  paidAssetPriceUsd: number | null;
  posterFrameMaxWidth?: number;
  pricingPolicyRegionalPricingEnabled: boolean;
  reportProgress?: SubmitProgressReporter;
  regionalPricingEnabled: boolean;
  royaltySplit?: AssetRoyaltySplitState;
  signAgentAuthoredBody: SignAgentAuthoredBody;
  title: string;
  preparedPoster?: PreparedVideoPosterUpload | null;
  uploadedVideo?: SongArtifactUpload | null;
  uploadArtifactContent: UploadArtifactContent;
  uploadMedia: UploadPosterMedia;
  videoState: VideoComposerState;
}): Promise<ApiCreatedPost> {
  reportProgress?.("validating");
  const file = requirePrimaryVideoFile(videoState);
  // Seed upload_video at the start of its band (0%) so the first real byte report
  // can't precede it. extract_poster is reported AFTER the parallel work below,
  // never up-front — otherwise it would advance the bar past upload_video and the
  // upload's byte reports would then snap it backward.
  reportProgress?.("upload_video", "0%");
  const [uploadedVideo, posterFrame] = await Promise.all([
    existingUploadedVideo ?? uploadVideoArtifact({
      abortArtifactUploadSession,
      communityId,
      completeArtifactUploadSession,
      createArtifactUpload,
      getArtifactUploadPartSignedUrl,
      monetized,
      reportProgress,
      uploadArtifactContent,
      videoState,
    }),
    existingPreparedPoster?.frame ?? extractPosterFrameFile(
      file,
      videoState.posterFrameSeconds,
      { maxWidth: posterFrameMaxWidth },
    ),
  ]);
  if (!existingUploadedVideo) {
    onVideoUploaded?.(uploadedVideo);
  }
  reportProgress?.("extract_poster");
  let uploadedPoster = existingPreparedPoster?.uploaded ?? null;
  if (!uploadedPoster) {
    reportProgress?.("upload_poster", "0%");
    uploadedPoster = await uploadMedia({
      kind: "post_image",
      file: posterFrame.file,
      onProgress: (fraction) => {
        reportProgress?.("upload_poster", `${Math.round(fraction * 100)}%`);
      },
    });
    onPosterUploaded?.({ frame: posterFrame, uploaded: uploadedPoster });
  }
  if (monetized) {
    reportProgress?.("create_listing");
  }
  const listingDraftWithPlaceholder = monetized
    ? buildAssetListingRequest({
        assetId: "asset_pending",
        paidSongPriceUsd: paidAssetPriceUsd,
        pricingPolicyRegionalPricingEnabled,
        regionalPricingEnabled,
        charityContributionPct,
        charityPartnerId,
      })
    : null;
  if (monetized && !listingDraftWithPlaceholder) {
    throw new Error("The paid video listing payload could not be created.");
  }
  const listingDraft = (() => {
    if (!listingDraftWithPlaceholder) return undefined;
    const { asset: _asset, ...draft } = listingDraftWithPlaceholder;
    return draft;
  })();
  const request = buildVideoPostRequest({
    baseRequest,
    caption,
    derivativeStep,
    event,
    license,
    monetized,
    posterFrame,
    royaltySplit,
    charityContributionPct,
    title,
    uploadedPoster,
    uploadedVideo,
  });
  request.listing_draft = listingDraft;
  reportProgress?.("publish_post");
  return await createPost(
    communityId,
    await signIfAgent({
      authorMode,
      path: `/communities/${communityId}/posts`,
      request,
      signAgentAuthoredBody,
    }),
    altchaOptions,
  );

}
