import { describe, expect, test } from "bun:test";
import type {
  CommunityListing,
  CreateCommunityListingRequest,
  CreatePostRequest,
  CreateSongArtifactUploadRequest,
  Post as ApiCreatedPost,
  SongArtifactUpload,
} from "@pirate/api-contracts";

import { buildBasePostRequest } from "./base";
import { buildVideoPostRequest, submitVideoPost, uploadVideoArtifact } from "./video";

function createBaseRequest() {
  return buildBasePostRequest({
    anonymousScope: "community_stable",
    disclosedQualifierIds: ["qual_video"],
    idempotencyKey: "idem_video",
    identityMode: "anonymous",
    visibility: "public",
  });
}

function createVideoFile() {
  return new File(["fake video"], "video.mp4", { type: "video/mp4" });
}

function createPosterFile() {
  return new File(["fake poster"], "video-cover-frame.jpg", { type: "image/jpeg" });
}

function createArtifact(overrides: Partial<SongArtifactUpload> = {}): SongArtifactUpload {
  return {
    id: "sau_video",
    object: "song_artifact_upload",
    community: "com_test",
    uploader_user: "usr_test",
    artifact_kind: "primary_video",
    status: "uploaded",
    storage_ref: "artifact_video",
    mime_type: "video/mp4",
    filename: "video.mp4",
    size_bytes: 10,
    content_hash: "hash_video",
    upload_url: "https://uploads.test/video",
    created: 1,
    ...overrides,
  };
}

function createPost(overrides: Partial<ApiCreatedPost> = {}): ApiCreatedPost {
  return {
    id: "pst_video",
    object: "post",
    community: "com_test",
    authorship_mode: "human_direct",
    identity_mode: "public",
    post_type: "video",
    status: "published",
    visibility: "public",
    ...overrides,
  } as ApiCreatedPost;
}

function createListing(overrides: Partial<CommunityListing> = {}): CommunityListing {
  return {
    id: "lst_video",
    object: "community_listing",
    community: "com_test",
    asset: "ast_video",
    live_room: null,
    listing_mode: "fixed_price",
    status: "active",
    price_cents: 500,
    regional_pricing_enabled: true,
    created_by_user: "usr_test",
    created: 1,
    ...overrides,
  };
}

describe("video create-post submit helpers", () => {
  test("buildVideoPostRequest returns base fields and video media fields", () => {
    expect(buildVideoPostRequest({
      baseRequest: createBaseRequest(),
      caption: " Video caption ",
      monetized: false,
      posterFrame: {
        frameMs: 1200,
        height: 720,
        width: 1280,
      },
      title: " Video title ",
      uploadedPoster: {
        media_ref: "poster_media",
        mime_type: "image/jpeg",
        size_bytes: 123,
      },
      uploadedVideo: {
        storage_ref: "artifact_video",
        mime_type: "video/mp4",
        size_bytes: 456,
        content_hash: "hash_video",
      },
    })).toEqual({
      anonymous_scope: "community_stable",
      disclosed_qualifier_ids: ["qual_video"],
      identity_mode: "anonymous",
      idempotency_key: "idem_video",
      translation_policy: "machine_allowed",
      visibility: "public",
      post_type: "video",
      title: "Video title",
      caption: "Video caption",
      access_mode: undefined,
      commercial_rev_share_pct: undefined,
      license_preset: undefined,
      media_refs: [{
        storage_ref: "artifact_video",
        mime_type: "video/mp4",
        size_bytes: 456,
        content_hash: "hash_video",
        poster_ref: "poster_media",
        poster_mime_type: "image/jpeg",
        poster_size_bytes: 123,
        poster_width: 1280,
        poster_height: 720,
        poster_frame_ms: 1200,
      }],
    });
  });

  test("buildVideoPostRequest includes paid license fields", () => {
    const request = buildVideoPostRequest({
      baseRequest: createBaseRequest(),
      caption: " ",
      license: {
        presetId: "commercial-remix",
        commercialRevSharePct: 25,
      },
      monetized: true,
      posterFrame: {
        frameMs: 0,
        height: 720,
        width: 1280,
      },
      title: " Video title ",
      uploadedPoster: {
        media_ref: "poster_media",
        mime_type: "image/jpeg",
        size_bytes: 123,
      },
      uploadedVideo: {
        storage_ref: "artifact_video",
        mime_type: "video/mp4",
        size_bytes: 456,
        content_hash: "hash_video",
      },
    });

    expect(request.access_mode).toBe("locked");
    expect(request.caption).toBeUndefined();
    expect(request.license_preset).toBe("commercial-remix");
    expect(request.commercial_rev_share_pct).toBe(25);
  });

  test("uploadVideoArtifact creates an artifact upload and uploads file content", async () => {
    const file = createVideoFile();
    const createArtifactUploadCalls: Array<{
      communityId: string;
      request: CreateSongArtifactUploadRequest;
    }> = [];
    const uploadArtifactContentCalls: Array<{
      artifactUploadId: string;
      byteLength: number;
      communityId: string;
    }> = [];

    const result = await uploadVideoArtifact({
      communityId: "com_test",
      createArtifactUpload: async (communityId, request) => {
        createArtifactUploadCalls.push({ communityId, request });
        return createArtifact({ id: "sau_intent", status: "pending_upload" });
      },
      uploadArtifactContent: async (communityId, artifactUploadId, body) => {
        uploadArtifactContentCalls.push({
          artifactUploadId,
          byteLength: body.byteLength,
          communityId,
        });
        return createArtifact();
      },
      videoState: {
        primaryVideoUpload: file,
      },
    });

    expect(result.storage_ref).toBe("artifact_video");
    expect(createArtifactUploadCalls).toEqual([{
      communityId: "com_test",
      request: {
        artifact_kind: "primary_video",
        mime_type: "video/mp4",
        filename: "video.mp4",
        size_bytes: file.size,
      },
    }]);
    expect(uploadArtifactContentCalls).toEqual([{
      artifactUploadId: "sau_intent",
      byteLength: file.size,
      communityId: "com_test",
    }]);
  });

  test("submitVideoPost uploads video and poster before creating the post", async () => {
    const file = createVideoFile();
    const posterFile = createPosterFile();
    const createPostCalls: Array<{
      communityId: string;
      options: unknown;
      request: CreatePostRequest;
    }> = [];
    const createListingCalls: CreateCommunityListingRequest[] = [];
    const posterExtractCalls: Array<{
      file: File;
      frameSeconds: string | undefined;
      maxWidth: number | undefined;
    }> = [];

    const result = await submitVideoPost({
      altchaOptions: { altchaPayload: "altcha_video" },
      authorMode: "human",
      baseRequest: createBaseRequest(),
      caption: "Video caption",
      communityId: "com_test",
      createArtifactUpload: async () => createArtifact({ id: "sau_intent" }),
      createListing: async (_communityId, request) => {
        createListingCalls.push(request);
        return createListing();
      },
      createPost: async (communityId, request, options) => {
        createPostCalls.push({ communityId, options, request });
        return createPost({ id: "pst_uploaded_video" });
      },
      extractPosterFrameFile: async (inputFile, frameSeconds, options) => {
        posterExtractCalls.push({
          file: inputFile,
          frameSeconds,
          maxWidth: options?.maxWidth,
        });
        return {
          dataUrl: "data:image/jpeg;base64,cG9zdGVy",
          file: posterFile,
          frameMs: 1300,
          height: 720,
          width: 1280,
        };
      },
      monetized: false,
      paidAssetPriceUsd: null,
      posterFrameMaxWidth: 1920,
      pricingPolicyRegionalPricingEnabled: false,
      regionalPricingEnabled: false,
      signAgentAuthoredBody: async (_path, request) => request,
      title: "Video post",
      uploadArtifactContent: async () => createArtifact(),
      uploadMedia: async (input) => {
        expect(input).toEqual({ kind: "post_image", file: posterFile });
        return {
          media_ref: "poster_media",
          mime_type: "image/jpeg",
          size_bytes: posterFile.size,
        };
      },
      videoState: {
        posterFrameSeconds: "1.3",
        primaryVideoUpload: file,
      },
    });

    expect(result.id).toBe("pst_uploaded_video");
    expect(posterExtractCalls).toEqual([{
      file,
      frameSeconds: "1.3",
      maxWidth: 1920,
    }]);
    expect(createPostCalls).toEqual([{
      communityId: "com_test",
      options: { altchaPayload: "altcha_video" },
      request: {
        anonymous_scope: "community_stable",
        disclosed_qualifier_ids: ["qual_video"],
        identity_mode: "anonymous",
        idempotency_key: "idem_video",
        translation_policy: "machine_allowed",
        visibility: "public",
        post_type: "video",
        title: "Video post",
        caption: "Video caption",
        access_mode: undefined,
        commercial_rev_share_pct: undefined,
        license_preset: undefined,
        media_refs: [{
          storage_ref: "artifact_video",
          mime_type: "video/mp4",
          size_bytes: 10,
          content_hash: "hash_video",
          poster_ref: "poster_media",
          poster_mime_type: "image/jpeg",
          poster_size_bytes: posterFile.size,
          poster_width: 1280,
          poster_height: 720,
          poster_frame_ms: 1300,
        }],
      },
    }]);
    expect(createListingCalls).toEqual([]);
  });

  test("submitVideoPost creates a paid listing for monetized videos", async () => {
    const file = createVideoFile();
    const createListingCalls: Array<{
      communityId: string;
      request: CreateCommunityListingRequest;
    }> = [];

    await submitVideoPost({
      authorMode: "human",
      baseRequest: createBaseRequest(),
      caption: "",
      charityContributionPct: 10,
      charityPartnerId: "charity_test",
      communityId: "com_test",
      createArtifactUpload: async () => createArtifact({ id: "sau_intent" }),
      createListing: async (communityId, request) => {
        createListingCalls.push({ communityId, request });
        return createListing();
      },
      createPost: async () => createPost({ asset: "ast_video" }),
      extractPosterFrameFile: async () => ({
        dataUrl: "data:image/jpeg;base64,cG9zdGVy",
        file: createPosterFile(),
        frameMs: 0,
        height: 720,
        width: 1280,
      }),
      license: {
        presetId: "commercial-use",
      },
      monetized: true,
      paidAssetPriceUsd: 5,
      pricingPolicyRegionalPricingEnabled: true,
      regionalPricingEnabled: true,
      signAgentAuthoredBody: async (_path, request) => request,
      title: "Paid video",
      uploadArtifactContent: async () => createArtifact(),
      uploadMedia: async () => ({
        media_ref: "poster_media",
        mime_type: "image/jpeg",
        size_bytes: 123,
      }),
      videoState: {
        primaryVideoUpload: file,
      },
    });

    expect(createListingCalls).toEqual([{
      communityId: "com_test",
      request: {
        asset: "ast_video",
        price_cents: 500,
        regional_pricing_enabled: true,
        donation_partner: "charity_test",
        donation_share_bps: 1000,
        status: "active",
      },
    }]);
  });

  test("submitVideoPost rejects missing video files before side effects", async () => {
    const calls: string[] = [];

    await expect(submitVideoPost({
      authorMode: "human",
      baseRequest: createBaseRequest(),
      caption: "",
      communityId: "com_test",
      createArtifactUpload: async () => {
        calls.push("createArtifactUpload");
        return createArtifact();
      },
      createListing: async () => {
        calls.push("createListing");
        return createListing();
      },
      createPost: async () => {
        calls.push("createPost");
        return createPost();
      },
      extractPosterFrameFile: async () => {
        calls.push("extractPosterFrameFile");
        return {
          dataUrl: "data:image/jpeg;base64,cG9zdGVy",
          file: createPosterFile(),
          frameMs: 0,
          height: 720,
          width: 1280,
        };
      },
      monetized: false,
      paidAssetPriceUsd: null,
      pricingPolicyRegionalPricingEnabled: false,
      regionalPricingEnabled: false,
      signAgentAuthoredBody: async (_path, request) => request,
      title: "Video post",
      uploadArtifactContent: async () => {
        calls.push("uploadArtifactContent");
        return createArtifact();
      },
      uploadMedia: async () => {
        calls.push("uploadMedia");
        return {
          media_ref: "poster_media",
          mime_type: "image/jpeg",
          size_bytes: 123,
        };
      },
      videoState: {},
    })).rejects.toThrow("Choose a video before creating this post.");

    expect(calls).toEqual([]);
  });

  test("submitVideoPost rejects monetized posts without an asset", async () => {
    const createListingCalls: CreateCommunityListingRequest[] = [];

    await expect(submitVideoPost({
      authorMode: "human",
      baseRequest: createBaseRequest(),
      caption: "",
      communityId: "com_test",
      createArtifactUpload: async () => createArtifact({ id: "sau_intent" }),
      createListing: async (_communityId, request) => {
        createListingCalls.push(request);
        return createListing();
      },
      createPost: async () => createPost({ asset: null }),
      extractPosterFrameFile: async () => ({
        dataUrl: "data:image/jpeg;base64,cG9zdGVy",
        file: createPosterFile(),
        frameMs: 0,
        height: 720,
        width: 1280,
      }),
      monetized: true,
      paidAssetPriceUsd: 5,
      pricingPolicyRegionalPricingEnabled: true,
      regionalPricingEnabled: true,
      signAgentAuthoredBody: async (_path, request) => request,
      title: "Paid video",
      uploadArtifactContent: async () => createArtifact(),
      uploadMedia: async () => ({
        media_ref: "poster_media",
        mime_type: "image/jpeg",
        size_bytes: 123,
      }),
      videoState: {
        primaryVideoUpload: createVideoFile(),
      },
    })).rejects.toThrow("The video published, but the paid asset was not created.");

    expect(createListingCalls).toEqual([]);
  });

  test("submitVideoPost signs agent-authored video posts", async () => {
    const createPostRequests: CreatePostRequest[] = [];
    const signedPaths: string[] = [];

    await submitVideoPost({
      authorMode: "agent",
      baseRequest: createBaseRequest(),
      caption: "",
      communityId: "com_test",
      createArtifactUpload: async () => createArtifact({ id: "sau_intent" }),
      createListing: async () => createListing(),
      createPost: async (_communityId, request) => {
        createPostRequests.push(request);
        return createPost({ id: "pst_agent_video" });
      },
      extractPosterFrameFile: async () => ({
        dataUrl: "data:image/jpeg;base64,cG9zdGVy",
        file: createPosterFile(),
        frameMs: 0,
        height: 720,
        width: 1280,
      }),
      monetized: false,
      paidAssetPriceUsd: null,
      pricingPolicyRegionalPricingEnabled: false,
      regionalPricingEnabled: false,
      signAgentAuthoredBody: async (path, request) => {
        signedPaths.push(path);
        return {
          ...request,
          agent_id: "agent_test",
          authorship_mode: "user_agent",
        };
      },
      title: "Agent video",
      uploadArtifactContent: async () => createArtifact(),
      uploadMedia: async () => ({
        media_ref: "poster_media",
        mime_type: "image/jpeg",
        size_bytes: 123,
      }),
      videoState: {
        primaryVideoUpload: createVideoFile(),
      },
    });

    expect(signedPaths).toEqual(["/communities/com_test/posts"]);
    expect(createPostRequests).toEqual([{
      anonymous_scope: "community_stable",
      disclosed_qualifier_ids: ["qual_video"],
      identity_mode: "anonymous",
      idempotency_key: "idem_video",
      translation_policy: "machine_allowed",
      visibility: "public",
      post_type: "video",
      title: "Agent video",
      caption: undefined,
      access_mode: undefined,
      commercial_rev_share_pct: undefined,
      license_preset: undefined,
      media_refs: [{
        storage_ref: "artifact_video",
        mime_type: "video/mp4",
        size_bytes: 10,
        content_hash: "hash_video",
        poster_ref: "poster_media",
        poster_mime_type: "image/jpeg",
        poster_size_bytes: 123,
        poster_width: 1280,
        poster_height: 720,
        poster_frame_ms: 0,
      }],
      agent_id: "agent_test",
      authorship_mode: "user_agent",
    }]);
  });
});
