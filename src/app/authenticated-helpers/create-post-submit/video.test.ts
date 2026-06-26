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
      rights_basis: undefined,
      upstream_asset_refs: undefined,
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

  test("buildVideoPostRequest includes derivative song references", () => {
    const request = buildVideoPostRequest({
      baseRequest: createBaseRequest(),
      caption: "Video using a song",
      derivativeStep: {
        visible: true,
        trigger: "uses_song",
        references: [
          { id: "story:asset:ast_source_song", title: "Source song" },
          { id: "story:asset:ast_source_song", title: "Source song duplicate" },
        ],
        sourceTermsAccepted: true,
      },
      monetized: true,
      posterFrame: {
        frameMs: 0,
        height: 720,
        width: 1280,
      },
      title: "Derivative video",
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

    expect(request.rights_basis).toBe("derivative");
    expect(request.upstream_asset_refs).toEqual(["story:asset:ast_source_song"]);
  });

  test("buildVideoPostRequest includes royalty_allocations for monetized video with a valid split", () => {
    const request = buildVideoPostRequest({
      baseRequest: createBaseRequest(),
      caption: "",
      license: { presetId: "commercial-remix", commercialRevSharePct: 10 },
      monetized: true,
      posterFrame: { frameMs: 0, height: 720, width: 1280 },
      royaltySplit: {
        allocations: [
          { id: "c", recipientKind: "creator", walletAddress: "0x1111111111111111111111111111111111111111", sharePct: 90 },
          { id: "p", recipientKind: "collaborator", walletAddress: "0x2222222222222222222222222222222222222222", sharePct: 10 },
        ],
      },
      title: "Royalty video",
      uploadedPoster: { media_ref: "poster_media", mime_type: "image/jpeg", size_bytes: 123 },
      uploadedVideo: { storage_ref: "artifact_video", mime_type: "video/mp4", size_bytes: 456, content_hash: "hash_video" },
    });

    expect(request.royalty_allocations).toEqual([
      { recipient_kind: "creator", wallet_address: "0x1111111111111111111111111111111111111111", share_bps: 9000 },
      { recipient_kind: "collaborator", wallet_address: "0x2222222222222222222222222222222222222222", share_bps: 1000 },
    ]);
  });

  test("buildVideoPostRequest omits royalty_allocations for non-monetized video", () => {
    const request = buildVideoPostRequest({
      baseRequest: createBaseRequest(),
      caption: "",
      monetized: false,
      posterFrame: { frameMs: 0, height: 720, width: 1280 },
      royaltySplit: {
        allocations: [
          { id: "c", recipientKind: "creator", walletAddress: "0x1111111111111111111111111111111111111111", sharePct: 90 },
          { id: "p", recipientKind: "collaborator", walletAddress: "0x2222222222222222222222222222222222222222", sharePct: 10 },
        ],
      },
      title: "Non-monetized video",
      uploadedPoster: { media_ref: "poster_media", mime_type: "image/jpeg", size_bytes: 123 },
      uploadedVideo: { storage_ref: "artifact_video", mime_type: "video/mp4", size_bytes: 456, content_hash: "hash_video" },
    });

    expect(request.royalty_allocations).toBeUndefined();
  });

  test("buildVideoPostRequest rejects active derivative video mode without source refs", () => {
    expect(() => buildVideoPostRequest({
      baseRequest: createBaseRequest(),
      caption: "Video using a song",
      derivativeStep: {
        visible: true,
        trigger: "uses_song",
        references: [],
        sourceTermsAccepted: true,
      },
      monetized: true,
      posterFrame: {
        frameMs: 0,
        height: 720,
        width: 1280,
      },
      title: "Derivative video",
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
    })).toThrow("Attach a source song before publishing this video.");
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

  test("uploadVideoArtifact uses direct multipart for large public videos", async () => {
    const file = createVideoFile();
    Object.defineProperty(file, "size", { value: 65 * 1024 * 1024 });
    const originalFetch = globalThis.fetch;
    const fetchedUrls: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      fetchedUrls.push(String(input));
      expect(init?.method).toBe("PUT");
      return new Response(null, {
        status: 200,
        headers: { ETag: "\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\"" },
      });
    }) as typeof fetch;

    const createArtifactUploadCalls: CreateSongArtifactUploadRequest[] = [];
    const signedPartNumbers: number[] = [];
    const completeCalls: Array<{
      body: {
        upload_id: string;
        parts: Array<{ part_number: number; etag: string }>;
        content_hash?: string | null;
      };
      sessionId: string;
    }> = [];
    const progressDetails: Array<string | undefined> = [];

    try {
      const result = await uploadVideoArtifact({
        abortArtifactUploadSession: async () => {
          throw new Error("abort should not be called");
        },
        communityId: "com_test",
        completeArtifactUploadSession: async (_communityId, _uploadId, sessionId, body) => {
          completeCalls.push({ sessionId, body });
          return createArtifact({ content_hash: body.content_hash ?? "hash_video" });
        },
        createArtifactUpload: async (_communityId, request) => {
          createArtifactUploadCalls.push(request);
          return createArtifact({
            id: "sau_large",
            status: "pending_upload",
            upload_session: {
              id: "saus_large",
              status: "parts_uploading",
              object_key: "song-artifacts/com_test/primary_video/sau_large.mp4",
              upload_id: "filebase-upload-large",
              part_size_bytes: 10 * 1024 * 1024,
              total_parts: 7,
              expires_at: "2026-06-05T13:00:00.000Z",
              sign_part_url: "/parts/{part_number}/signed-url",
              complete: "/complete",
              abort: "/abort",
            },
          });
        },
        getArtifactUploadPartSignedUrl: async (_communityId, _uploadId, _sessionId, partNumber) => {
          signedPartNumbers.push(partNumber);
          return { url: `https://filebase.test/part-${partNumber}` };
        },
        reportProgress: (_key, detail) => progressDetails.push(detail),
        uploadArtifactContent: async () => {
          throw new Error("proxy upload should not be called");
        },
        videoState: {
          primaryVideoUpload: file,
        },
      });

      expect(result.content_hash).toMatch(/^0x[a-f0-9]{64}$/);
      expect(createArtifactUploadCalls).toEqual([{
        artifact_kind: "primary_video",
        mime_type: "video/mp4",
        filename: "video.mp4",
        size_bytes: 65 * 1024 * 1024,
        upload_mode: "direct_multipart",
      }]);
      expect(signedPartNumbers).toEqual([1, 2, 3, 4, 5, 6, 7]);
      expect(fetchedUrls).toEqual([
        "https://filebase.test/part-1",
        "https://filebase.test/part-2",
        "https://filebase.test/part-3",
        "https://filebase.test/part-4",
        "https://filebase.test/part-5",
        "https://filebase.test/part-6",
        "https://filebase.test/part-7",
      ]);
      expect(completeCalls).toEqual([{
        sessionId: "saus_large",
        body: {
          upload_id: "filebase-upload-large",
          parts: [
            { part_number: 1, etag: "\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\"" },
            { part_number: 2, etag: "\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\"" },
            { part_number: 3, etag: "\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\"" },
            { part_number: 4, etag: "\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\"" },
            { part_number: 5, etag: "\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\"" },
            { part_number: 6, etag: "\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\"" },
            { part_number: 7, etag: "\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\"" },
          ],
          content_hash: result.content_hash,
        },
      }]);
      expect(progressDetails.at(-1)).toBe("100%");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("uploadVideoArtifact rejects oversized paid videos before upload", async () => {
    const file = createVideoFile();
    Object.defineProperty(file, "size", { value: 51 * 1024 * 1024 });

    await expect(uploadVideoArtifact({
      communityId: "com_test",
      createArtifactUpload: async () => {
        throw new Error("createArtifactUpload should not be called");
      },
      monetized: true,
      uploadArtifactContent: async () => {
        throw new Error("uploadArtifactContent should not be called");
      },
      videoState: {
        primaryVideoUpload: file,
      },
    })).rejects.toThrow("Paid videos are currently capped at 50 MB");
  });

  test("uploadVideoArtifact rejects public videos above the product cap before upload", async () => {
    const file = createVideoFile();
    Object.defineProperty(file, "size", { value: (2 * 1024 * 1024 * 1024) + 1 });

    await expect(uploadVideoArtifact({
      communityId: "com_test",
      createArtifactUpload: async () => {
        throw new Error("createArtifactUpload should not be called");
      },
      uploadArtifactContent: async () => {
        throw new Error("uploadArtifactContent should not be called");
      },
      videoState: {
        primaryVideoUpload: file,
      },
    })).rejects.toThrow("Public videos are currently capped at 2 GB");
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
    const progressEvents: string[] = [];

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
      reportProgress: (key) => progressEvents.push(key),
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
    expect(progressEvents).toEqual([
      "validating",
      "upload_video",
      "extract_poster",
      "upload_poster",
      "publish_post",
    ]);
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
        rights_basis: undefined,
        upstream_asset_refs: undefined,
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

  test("submitVideoPost extracts the poster concurrently with the video upload", async () => {
    const file = createVideoFile();
    const posterFile = createPosterFile();
    const calls: string[] = [];

    await submitVideoPost({
      authorMode: "human",
      baseRequest: createBaseRequest(),
      caption: "",
      communityId: "com_test",
      createArtifactUpload: async () => createArtifact({ id: "sau_intent" }),
      createListing: async () => createListing(),
      createPost: async () => createPost(),
      extractPosterFrameFile: async () => {
        calls.push("extractPosterFrameFile:start");
        await new Promise((resolve) => setTimeout(resolve, 5));
        calls.push("extractPosterFrameFile:end");
        return {
          dataUrl: "data:image/jpeg;base64,cG9zdGVy",
          file: posterFile,
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
        calls.push("uploadArtifactContent:start");
        await new Promise((resolve) => setTimeout(resolve, 5));
        calls.push("uploadArtifactContent:end");
        return createArtifact();
      },
      uploadMedia: async () => ({
        media_ref: "poster_media",
        mime_type: "image/jpeg",
        size_bytes: 123,
      }),
      videoState: {
        primaryVideoUpload: file,
      },
    });

    const videoStart = calls.indexOf("uploadArtifactContent:start");
    const posterStart = calls.indexOf("extractPosterFrameFile:start");
    const videoEnd = calls.indexOf("uploadArtifactContent:end");
    const posterEnd = calls.indexOf("extractPosterFrameFile:end");
    expect([videoStart, posterStart, videoEnd, posterEnd].every((index) => index >= 0)).toBe(true);
    expect(Math.max(videoStart, posterStart)).toBeLessThan(Math.min(videoEnd, posterEnd));
  });

  test("submitVideoPost sends selected derivative song refs", async () => {
    const file = createVideoFile();
    const createPostCalls: CreatePostRequest[] = [];

    await submitVideoPost({
      authorMode: "human",
      baseRequest: createBaseRequest(),
      caption: "",
      communityId: "com_test",
      createArtifactUpload: async () => createArtifact({ id: "sau_intent" }),
      createListing: async () => createListing(),
      createPost: async (_communityId, request) => {
        createPostCalls.push(request);
        return createPost();
      },
      derivativeStep: {
        visible: true,
        trigger: "uses_song",
        references: [{ id: "story:asset:ast_source_song", title: "Source song" }],
        sourceTermsAccepted: true,
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
      signAgentAuthoredBody: async (_path, request) => request,
      title: "Derivative video",
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

    expect(createPostCalls).toHaveLength(1);
    expect(createPostCalls[0]?.rights_basis).toBe("derivative");
    expect(createPostCalls[0]?.upstream_asset_refs).toEqual(["story:asset:ast_source_song"]);
  });

  test("submitVideoPost creates a paid listing for monetized videos", async () => {
    const file = createVideoFile();
    const createListingCalls: Array<{
      communityId: string;
      request: CreateCommunityListingRequest;
    }> = [];
    const progressEvents: string[] = [];

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
      reportProgress: (key) => progressEvents.push(key),
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

    expect(progressEvents).toEqual([
      "validating",
      "upload_video",
      "extract_poster",
      "upload_poster",
      "publish_post",
      "create_listing",
    ]);
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
      rights_basis: undefined,
      upstream_asset_refs: undefined,
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
