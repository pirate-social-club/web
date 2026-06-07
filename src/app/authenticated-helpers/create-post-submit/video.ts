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

type CreatePost = (
  communityId: string,
  request: CreatePostRequestWithEvent,
  options?: AltchaRequestOptions,
) => Promise<ApiCreatedPost>;

type CreateListing = (
  communityId: string,
  request: CreateCommunityListingRequest,
) => Promise<CommunityListing>;

type CreateArtifactUpload = (
  communityId: string,
  request: CreateSongArtifactUploadRequest,
) => Promise<SongArtifactUpload>;

type UploadArtifactContent = (
  communityId: string,
  artifactUploadId: string,
  body: ArrayBuffer,
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

type UploadedPosterMedia = {
  media_ref: string;
  mime_type: string;
  size_bytes: number;
};

type UploadPosterMedia = (
  input: { kind: "post_image"; file: File },
) => Promise<UploadedPosterMedia>;

type ExtractPosterFrameFile = (
  file: File,
  frameSeconds: string | undefined,
  options?: { maxWidth?: number },
) => Promise<ExtractedVideoPosterFrame & { file: File }>;

const PROXY_PRIMARY_VIDEO_MAX_BYTES = 64 * 1024 * 1024;
const LOCKED_PRIMARY_VIDEO_MAX_BYTES = 50 * 1024 * 1024;
const PUBLIC_PRIMARY_VIDEO_MAX_BYTES = 2 * 1024 * 1024 * 1024;
const MULTIPART_UPLOAD_CONCURRENCY = 3;

class PermanentPartUploadError extends Error {}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sha256File(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
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
  abortArtifactUploadSession,
  completeArtifactUploadSession,
  communityId,
  createArtifactUpload,
  getArtifactUploadPartSignedUrl,
  monetized = false,
  reportProgress,
  uploadArtifactContent,
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
  const useMultipart = !monetized && file.size > PROXY_PRIMARY_VIDEO_MAX_BYTES;
  if (!useMultipart) {
    const intent = await createArtifactUpload(communityId, {
      artifact_kind: "primary_video",
      mime_type: file.type,
      filename: file.name,
      size_bytes: file.size,
    });
    return await uploadArtifactContent(communityId, intent.id, await file.arrayBuffer());
  }
  if (!getArtifactUploadPartSignedUrl || !completeArtifactUploadSession || !abortArtifactUploadSession) {
    throw new Error("Large video upload support is not configured.");
  }
  const contentHashPromise = sha256File(file);
  const intent = await createArtifactUpload(communityId, {
    artifact_kind: "primary_video",
    mime_type: file.type,
    filename: file.name,
    size_bytes: file.size,
    upload_mode: "direct_multipart",
  });
  return await uploadVideoArtifactMultipart({
    abortArtifactUploadSession,
    communityId,
    completeArtifactUploadSession,
    contentHashPromise,
    file,
    getArtifactUploadPartSignedUrl,
    intent,
    reportProgress,
  });
}

async function uploadVideoArtifactMultipart({
  abortArtifactUploadSession,
  communityId,
  completeArtifactUploadSession,
  contentHashPromise,
  file,
  getArtifactUploadPartSignedUrl,
  intent,
  reportProgress,
}: {
  abortArtifactUploadSession: AbortArtifactUploadSession;
  communityId: string;
  completeArtifactUploadSession: CompleteArtifactUploadSession;
  contentHashPromise: Promise<string>;
  file: File;
  getArtifactUploadPartSignedUrl: GetArtifactUploadPartSignedUrl;
  intent: SongArtifactUpload;
  reportProgress?: SubmitProgressReporter;
}): Promise<SongArtifactUpload> {
  const session = intent.upload_session;
  if (!session) {
    throw new Error("Large video upload did not return a multipart session.");
  }
  const uploadSession = session;
  const parts: Array<{ part_number: number; etag: string }> = [];
  let nextPartNumber = 1;
  let uploadedBytes = 0;

  async function uploadPart(partNumber: number): Promise<void> {
    const start = (partNumber - 1) * uploadSession.part_size_bytes;
    const end = Math.min(file.size, start + uploadSession.part_size_bytes);
    const body = file.slice(start, end, file.type || "application/octet-stream");
    // Keep failed-part retries short; permanent 4xx errors surface immediately.
    const retryDelays = [250, 1000, 4000];
    let lastError: unknown = null;
    for (let attempt = 0; attempt < retryDelays.length; attempt += 1) {
      try {
        const signed = await getArtifactUploadPartSignedUrl(communityId, intent.id, uploadSession.id, partNumber);
        const response = await fetch(signed.url, {
          method: "PUT",
          body,
          headers: file.type ? { "Content-Type": file.type } : undefined,
        });
        if (!response.ok) {
          const message = `Video part ${partNumber} upload failed with ${response.status}`;
          if (response.status >= 400 && response.status < 500) {
            throw new PermanentPartUploadError(message);
          }
          throw new Error(message);
        }
        const etag = response.headers.get("ETag")?.trim();
        if (!etag) {
          throw new Error(`Video part ${partNumber} upload did not return an ETag.`);
        }
        parts.push({ part_number: partNumber, etag });
        uploadedBytes += end - start;
        reportProgress?.("upload_video", `${Math.min(100, Math.round((uploadedBytes / file.size) * 100))}%`);
        return;
      } catch (error) {
        if (error instanceof PermanentPartUploadError) {
          throw error;
        }
        lastError = error;
        if (attempt < retryDelays.length - 1) {
          await delay(retryDelays[attempt]);
        }
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error(`Video part ${partNumber} upload failed.`);
  }

  async function uploadWorker(): Promise<void> {
    while (nextPartNumber <= uploadSession.total_parts) {
      const partNumber = nextPartNumber;
      nextPartNumber += 1;
      await uploadPart(partNumber);
    }
  }

  try {
    const workers = Array.from(
      { length: Math.min(MULTIPART_UPLOAD_CONCURRENCY, uploadSession.total_parts) },
      () => uploadWorker(),
    );
    await Promise.all(workers);
    const contentHash = `0x${await contentHashPromise}`;
    return await completeArtifactUploadSession(communityId, intent.id, uploadSession.id, {
      upload_id: uploadSession.upload_id,
      parts: parts.sort((a, b) => a.part_number - b.part_number),
      content_hash: contentHash,
    });
  } catch (error) {
    try {
      await abortArtifactUploadSession(communityId, intent.id, uploadSession.id);
    } catch {
      // The API reaper is the cleanup backstop for abandoned multipart sessions.
    }
    throw error;
  }
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
  createListing,
  createPost,
  derivativeStep,
  event,
  extractPosterFrameFile,
  getArtifactUploadPartSignedUrl,
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
  abortArtifactUploadSession?: AbortArtifactUploadSession;
  authorMode: AuthorMode;
  baseRequest: BasePostRequestFields;
  caption: string;
  charityContributionPct?: number | null;
  charityPartnerId?: string | null;
  completeArtifactUploadSession?: CompleteArtifactUploadSession;
  communityId: string;
  createArtifactUpload: CreateArtifactUpload;
  createListing: CreateListing;
  createPost: CreatePost;
  derivativeStep?: DerivativeStepState;
  event?: CreatePostEventRequest;
  extractPosterFrameFile: ExtractPosterFrameFile;
  getArtifactUploadPartSignedUrl?: GetArtifactUploadPartSignedUrl;
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
  reportProgress?.("validating");
  const file = requirePrimaryVideoFile(videoState);
  reportProgress?.("upload_video");
  reportProgress?.("extract_poster");
  const [uploadedVideo, posterFrame] = await Promise.all([
    uploadVideoArtifact({
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
    extractPosterFrameFile(
      file,
      videoState.posterFrameSeconds,
      { maxWidth: posterFrameMaxWidth },
    ),
  ]);
  reportProgress?.("upload_poster");
  const uploadedPoster = await uploadMedia({
    kind: "post_image",
    file: posterFrame.file,
  });
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
  const post = await createPost(
    communityId,
    await signIfAgent({
      authorMode,
      path: `/communities/${communityId}/posts`,
      request,
      signAgentAuthoredBody,
    }),
    altchaOptions,
  );

  if (!monetized) {
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
  await createListing(communityId, listingRequest);
  return post;
}
