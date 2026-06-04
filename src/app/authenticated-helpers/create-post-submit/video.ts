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
  uploadArtifactContent,
  videoState,
}: {
  communityId: string;
  createArtifactUpload: CreateArtifactUpload;
  uploadArtifactContent: UploadArtifactContent;
  videoState: VideoComposerState;
}): Promise<SongArtifactUpload> {
  const file = requirePrimaryVideoFile(videoState);
  const intent = await createArtifactUpload(communityId, {
    artifact_kind: "primary_video",
    mime_type: file.type,
    filename: file.name,
    size_bytes: file.size,
  });
  return await uploadArtifactContent(communityId, intent.id, await file.arrayBuffer());
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
  reportProgress?.("validating");
  const file = requirePrimaryVideoFile(videoState);
  reportProgress?.("upload_video");
  const uploadedVideo = await uploadVideoArtifact({
    communityId,
    createArtifactUpload,
    uploadArtifactContent,
    videoState,
  });
  reportProgress?.("extract_poster");
  const posterFrame = await extractPosterFrameFile(
    file,
    videoState.posterFrameSeconds,
    { maxWidth: posterFrameMaxWidth },
  );
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
