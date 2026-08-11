import { describe, expect, test } from "bun:test";
import type {
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

function multipartVideoUploadStubs() {
  return {
    abortArtifactUploadSession: async () => {},
    completeArtifactUploadSession: async () => createArtifact(),
    createArtifactUpload: async () => createArtifact({
      id: "sau_intent",
      status: "pending_upload",
      upload_session: {
        abort: "abort",
        complete: "complete",
        expires_at: "2026-07-02T00:00:00.000Z",
        id: "saus_video",
        part_size_bytes: 10 * 1024 * 1024,
        sign_part_url: "sign",
        total_parts: 0,
        upload_id: "filebase-upload-video",
      },
    }),
    getArtifactUploadPartSignedUrl: async () => {
      throw new Error("zero-part test upload should not request a signed URL");
    },
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
      age_gate_policy: undefined,
      identity_mode: "anonymous",
      idempotency_key: "idem_video",
      translation_policy: "machine_allowed",
      visibility: "public",
      post_type: "video",
      title: "Video title",
      caption: "Video caption",
      access_mode: "public",
      commercial_rev_share_pct: undefined,
      license_preset: undefined,
      royalty_allocations: undefined,
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

  test("buildVideoPostRequest carries author-declared 18+ content policy", () => {
    const request = buildVideoPostRequest({
      baseRequest: buildBasePostRequest({
        ageGatePolicy: "18_plus",
        idempotencyKey: "idem_video_adult",
        identityMode: "public",
        visibility: "public",
      }),
      caption: "Video caption",
      monetized: false,
      posterFrame: {
        frameMs: 1200,
        height: 720,
        width: 1280,
      },
      title: "Video title",
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

    expect(request.age_gate_policy).toBe("18_plus");
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

  test("buildVideoPostRequest includes paid royalty allocations", () => {
    const request = buildVideoPostRequest({
      baseRequest: createBaseRequest(),
      caption: "Video split",
      license: {
        presetId: "commercial-use",
      },
      monetized: true,
      posterFrame: {
        frameMs: 0,
        height: 720,
        width: 1280,
      },
      royaltySplit: {
        allocations: [
          {
            id: "creator",
            recipientKind: "creator",
            walletAddress: "0x3333333333333333333333333333333333333333",
            sharePct: 80,
          },
          {
            id: "collaborator",
            recipientKind: "collaborator",
            walletAddress: "0x4444444444444444444444444444444444444444",
            sharePct: 20,
          },
        ],
      },
      title: "Split video",
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

    expect(request.royalty_allocations).toEqual([
      {
        recipient_kind: "creator",
        wallet_address: "0x3333333333333333333333333333333333333333",
        share_bps: 8000,
      },
      {
        recipient_kind: "collaborator",
        wallet_address: "0x4444444444444444444444444444444444444444",
        share_bps: 2000,
      },
    ]);
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

  test("uploadVideoArtifact does not fall back to a proxy upload for small public videos", async () => {
    const file = createVideoFile();

    await expect(uploadVideoArtifact({
      communityId: "com_test",
      createArtifactUpload: async () => {
        throw new Error("createArtifactUpload should not be called without multipart support");
      },
      uploadArtifactContent: async () => {
        throw new Error("proxy upload should not be called for primary_video");
      },
      videoState: {
        primaryVideoUpload: file,
      },
    })).rejects.toThrow("Video upload support is not configured");
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

  test("uploadVideoArtifact uses direct multipart for small public videos and retries 429 part uploads", async () => {
    const originalXHR = globalThis.XMLHttpRequest;
    const originalSetTimeout = globalThis.setTimeout;
    const file = createVideoFile();
    const createArtifactUploadCalls: CreateSongArtifactUploadRequest[] = [];
    const signedUrlCalls: Array<{ artifactUploadId: string; partNumber: number; sessionId: string }> = [];
    const completedBodies: Array<{
      content_hash?: string | null;
      parts: Array<{ part_number: number; etag: string }>;
      upload_id: string;
    }> = [];
    const abortCalls: string[] = [];
    const progressEvents: string[] = [];
    const xhrStatuses = [429, 200, 200];
    const retryDelays: number[] = [];

    class FakeXHR {
      status = 200;
      statusText = "OK";
      private responseStatus = 200;
      timeout = 0;
      upload = {
        onprogress: null as ((event: ProgressEvent) => void) | null,
      };

      onabort: (() => void) | null = null;
      onerror: (() => void) | null = null;
      onload: (() => void) | null = null;
      ontimeout: (() => void) | null = null;

      getResponseHeader(name: string): string | null {
        if (name.toLowerCase() === "etag") {
          return this.responseStatus === 429 ? null : "\"part-etag\"";
        }
        if (name.toLowerCase() === "retry-after" && this.responseStatus === 429) {
          return "2";
        }
        return null;
      }

      open(): void {}

      setRequestHeader(): void {}

      send(body: BodyInit | null): void {
        this.responseStatus = xhrStatuses.shift() ?? 200;
        this.status = this.responseStatus;
        const size = body instanceof Blob ? body.size : 0;
        this.upload.onprogress?.({
          lengthComputable: true,
          loaded: size,
          total: size,
        } as ProgressEvent);
        queueMicrotask(() => this.onload?.());
      }
    }

    globalThis.XMLHttpRequest = FakeXHR as unknown as typeof XMLHttpRequest;
    globalThis.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
      retryDelays.push(timeout ?? 0);
      queueMicrotask(() => {
        if (typeof handler === "function") {
          handler(...args);
        }
      });
      return 0;
    }) as typeof setTimeout;
    try {
      const result = await uploadVideoArtifact({
        abortArtifactUploadSession: async (_communityId, artifactUploadId) => {
          abortCalls.push(artifactUploadId);
        },
        communityId: "com_test",
        completeArtifactUploadSession: async (_communityId, _artifactUploadId, _sessionId, body) => {
          completedBodies.push(body);
          return createArtifact({ storage_ref: "artifact_video_multipart" });
        },
        createArtifactUpload: async (_communityId, request) => {
          createArtifactUploadCalls.push(request);
          return createArtifact({
            id: "sau_large_video",
            status: "pending_upload",
            upload_session: {
              abort: "abort",
              complete: "complete",
              expires_at: "2026-07-02T00:00:00.000Z",
              id: "saus_large_video",
              part_size_bytes: 10,
              sign_part_url: "sign",
              total_parts: 2,
              upload_id: "filebase-upload-large-video",
            },
          });
        },
        getArtifactUploadPartSignedUrl: async (_communityId, artifactUploadId, sessionId, partNumber) => {
          signedUrlCalls.push({ artifactUploadId, sessionId, partNumber });
          return { url: `https://filebase.test/large-video/part-${partNumber}/${signedUrlCalls.length}` };
        },
        reportProgress: (key, detail) => progressEvents.push(`${key}:${detail ?? ""}`),
        uploadArtifactContent: async () => {
          throw new Error("proxy upload should not be called for large public video");
        },
        videoState: {
          primaryVideoUpload: file,
        },
      });

      expect(result.storage_ref).toBe("artifact_video_multipart");
      expect(createArtifactUploadCalls).toEqual([{
        artifact_kind: "primary_video",
        mime_type: "video/mp4",
        filename: "video.mp4",
        size_bytes: file.size,
        upload_mode: "direct_multipart",
      }]);
      expect(signedUrlCalls).toEqual([
        { artifactUploadId: "sau_large_video", sessionId: "saus_large_video", partNumber: 1 },
        { artifactUploadId: "sau_large_video", sessionId: "saus_large_video", partNumber: 2 },
        { artifactUploadId: "sau_large_video", sessionId: "saus_large_video", partNumber: 1 },
      ]);
      expect(completedBodies).toHaveLength(1);
      expect(completedBodies[0]?.upload_id).toBe("filebase-upload-large-video");
      expect(completedBodies[0]?.content_hash).toMatch(/^0x[0-9a-f]{64}$/);
      expect(completedBodies[0]?.parts).toEqual([
        { part_number: 1, etag: "\"part-etag\"" },
        { part_number: 2, etag: "\"part-etag\"" },
      ]);
      expect(abortCalls).toEqual([]);
      expect(retryDelays).toContain(2000);
      expect(progressEvents.some((event) => event.startsWith("upload_video:"))).toBe(true);
    } finally {
      globalThis.XMLHttpRequest = originalXHR;
      globalThis.setTimeout = originalSetTimeout;
    }
  });

  test("submitVideoPost uploads video and poster before creating the post", async () => {
    const file = createVideoFile();
    const posterFile = createPosterFile();
    const createPostCalls: Array<{
      communityId: string;
      options: unknown;
      request: CreatePostRequest;
    }> = [];
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
      ...multipartVideoUploadStubs(),
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
        expect({ kind: input.kind, file: input.file }).toEqual({ kind: "post_image", file: posterFile });
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
        access_mode: "public",
        commercial_rev_share_pct: undefined,
        event: undefined,
        license_preset: undefined,
        rights_basis: undefined,
        royalty_allocations: undefined,
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
  });

  test("submitVideoPost sends selected derivative song refs", async () => {
    const file = createVideoFile();
    const createPostCalls: CreatePostRequest[] = [];

    await submitVideoPost({
      authorMode: "human",
      baseRequest: createBaseRequest(),
      caption: "",
      communityId: "com_test",
      ...multipartVideoUploadStubs(),
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

  test("submitVideoPost sends a server-owned listing draft for monetized videos", async () => {
    const file = createVideoFile();
    const createPostCalls: CreatePostRequest[] = [];
    const progressEvents: string[] = [];

    await submitVideoPost({
      authorMode: "human",
      baseRequest: createBaseRequest(),
      caption: "",
      charityContributionPct: 10,
      charityPartnerId: "charity_test",
      communityId: "com_test",
      ...multipartVideoUploadStubs(),
      createPost: async (_communityId, request) => {
        createPostCalls.push(request);
        return createPost({ asset: "ast_video" });
      },
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
      "create_listing",
      "publish_post",
    ]);
    expect(createPostCalls[0]?.listing_draft).toEqual({
      price_cents: 500,
      regional_pricing_enabled: true,
      donation_partner: "charity_test",
      donation_share_bps: 1000,
      status: "active",
    });
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

  test("submitVideoPost leaves paid asset and listing creation to the post endpoint", async () => {
    const createPostCalls: CreatePostRequest[] = [];

    await submitVideoPost({
      authorMode: "human",
      baseRequest: createBaseRequest(),
      caption: "",
      communityId: "com_test",
      ...multipartVideoUploadStubs(),
      createPost: async (_communityId, request) => {
        createPostCalls.push(request);
        return createPost({ asset: null });
      },
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
    });

    expect(createPostCalls[0]?.listing_draft?.price_cents).toBe(500);
  });

  test("submitVideoPost signs agent-authored video posts", async () => {
    const createPostRequests: CreatePostRequest[] = [];
    const signedPaths: string[] = [];

    await submitVideoPost({
      authorMode: "agent",
      baseRequest: createBaseRequest(),
      caption: "",
      communityId: "com_test",
      ...multipartVideoUploadStubs(),
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
      access_mode: "public",
      commercial_rev_share_pct: undefined,
      event: undefined,
      license_preset: undefined,
      rights_basis: undefined,
      royalty_allocations: undefined,
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

  test("submitVideoPost reuses uploaded video and poster outputs on retry", async () => {
    const uploadedVideo = createArtifact();
    const posterFrame = {
      dataUrl: "data:image/jpeg;base64,cG9zdGVy",
      file: createPosterFile(),
      frameMs: 0,
      height: 720,
      width: 1280,
    };
    const uploadedPoster = {
      media_ref: "poster_cached",
      mime_type: "image/jpeg",
      size_bytes: posterFrame.file.size,
    };

    await submitVideoPost({
      authorMode: "human",
      baseRequest: createBaseRequest(),
      caption: "",
      communityId: "com_test",
      ...multipartVideoUploadStubs(),
      createPost: async () => createPost(),
      extractPosterFrameFile: async () => {
        throw new Error("poster extraction should not run");
      },
      monetized: false,
      paidAssetPriceUsd: null,
      preparedPoster: { frame: posterFrame, uploaded: uploadedPoster },
      pricingPolicyRegionalPricingEnabled: false,
      regionalPricingEnabled: false,
      signAgentAuthoredBody: async (_path, request) => request,
      title: "Video",
      uploadedVideo,
      uploadArtifactContent: async () => {
        throw new Error("artifact upload should not run");
      },
      uploadMedia: async () => {
        throw new Error("poster upload should not run");
      },
      videoState: { primaryVideoUpload: createVideoFile() },
    });
  });
});
