import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { installDomGlobals } from "@/test/setup-dom";

installDomGlobals();

const { mock } = await import("bun:test") as unknown as {
  mock: {
    module: (specifier: string, factory: () => unknown) => void;
  };
};

const apiCalls: string[] = [];
const createPostBodies: unknown[] = [];
const songArtifactBundleBodies: unknown[] = [];
const originalFetch = globalThis.fetch;
const OriginalXMLHttpRequest = globalThis.XMLHttpRequest;
const originalAsyncSongPublishFlag = import.meta.env.VITE_ASYNC_SONG_PUBLISH_ENABLED;
let createdSongArtifactBundleResult = songBundle({
  id: "sab_created",
  previewStatus: "completed",
});
let readSongArtifactBundleResult = songBundle({
  id: "sab_existing",
  previewStatus: "completed",
});

const fakeApi = {
  communities: {
    createArtifactUpload: async (_communityId: string, body: { upload_mode?: string }) => {
      apiCalls.push("createArtifactUpload");
      if (body.upload_mode === "direct_multipart") {
        return {
          id: "sau_primary",
          upload_session: {
            id: "saus_primary",
            upload_id: "filebase-upload-1",
            part_size_bytes: 10,
            total_parts: 1,
          },
        };
      }
      return {
        id: "sau_primary",
      };
    },
    uploadArtifactContent: async () => {
      apiCalls.push("uploadArtifactContent");
      return {
        id: "sau_primary",
        content_hash: "hash_audio",
        mime_type: "audio/mpeg",
        size_bytes: 4,
        storage_ref: "filebase://songs/audio.mp3",
      };
    },
    getArtifactUploadPartSignedUrl: async () => {
      apiCalls.push("getArtifactUploadPartSignedUrl");
      return {
        expires_at: "2026-07-01T00:00:00.000Z",
        part_number: 1,
        part_size_bytes: 10,
        url: "https://filebase.test/upload-part",
      };
    },
    completeArtifactUploadSession: async () => {
      apiCalls.push("completeArtifactUploadSession");
      return {
        id: "sau_primary",
        content_hash: "hash_audio",
        mime_type: "audio/mpeg",
        size_bytes: 4,
        storage_ref: "filebase://songs/audio.mp3",
      };
    },
    abortArtifactUploadSession: async () => {
      apiCalls.push("abortArtifactUploadSession");
    },
    createSongArtifactBundle: async (_communityId: string, body: unknown) => {
      apiCalls.push("createSongArtifactBundle");
      songArtifactBundleBodies.push(body);
      return createdSongArtifactBundleResult;
    },
    getSongArtifactBundle: async () => {
      apiCalls.push("getSongArtifactBundle");
      return readSongArtifactBundleResult;
    },
    createPost: async (_communityId: string, body: unknown) => {
      apiCalls.push("createPost");
      createPostBodies.push(body);
      return {
        asset: "ast_song",
        id: "pst_song",
        status: "processing",
      };
    },
    createListing: async () => {
      apiCalls.push("createListing");
      return {
        id: "lst_song",
      };
    },
  },
};

mock.module("@/lib/api", () => ({
  useApi: () => fakeApi,
}));

const { useSongSubmit } = await import("./use-song-submit");

function songBundle(input: {
  id: string;
  previewStatus: "completed" | "pending" | "failed";
  previewError?: string | null;
}) {
  return {
    id: input.id,
    moderation_result: {
      analysis_state: "allow",
    },
    preview_audio: input.previewStatus === "completed"
      ? {
          mime_type: "audio/mpeg",
          storage_ref: "filebase://songs/preview.mp3",
        }
      : null,
    preview_error: input.previewError ?? null,
    preview_status: input.previewStatus,
  };
}

function submitInput(overrides: Partial<Parameters<ReturnType<typeof useSongSubmit>>[0]> = {}) {
  return {
    altchaPayload: null,
    audience: { visibility: "public" as const },
    authorMode: "human" as const,
    caption: "caption",
    charityContribution: { percentagePct: 0 },
    charityPartner: null,
    derivativeStep: undefined,
    license: { presetId: "non-commercial" as const },
    lyrics: "lyrics",
    monetizationState: {
      priceUsd: "",
      regionalPricingEnabled: false,
      visible: false,
    },
    paidSongPriceUsd: null,
    pendingSongBundleId: null,
    pricingPolicyRegionalPricingEnabled: false,
    reportProgress: () => undefined,
    setPendingSongBundleId: () => undefined,
    setSubmitError: () => undefined,
    songMode: "original" as const,
    songState: {
      genre: "Electronic",
      primaryAudioUpload: new File([new Uint8Array([1, 2, 3, 4])], "song.mp3", { type: "audio/mpeg" }),
      previewStartSeconds: "0",
    },
    songTitle: "Song title",
    title: "Post title",
    ...overrides,
  };
}

function renderSubmitHook() {
  return renderHook(() =>
    useSongSubmit({
      communityId: "com_test",
      signAgentAuthoredBody: async (_path, body) => body,
    })
  );
}

class FakeXMLHttpRequest {
  static uploads: Array<{ method: string; url: string; body: BodyInit | null }> = [];

  method = "";
  status = 200;
  statusText = "OK";
  timeout = 0;
  upload = {
    onprogress: null as ((event: ProgressEvent) => void) | null,
  };
  url = "";

  onabort: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onload: (() => void) | null = null;
  ontimeout: (() => void) | null = null;

  getResponseHeader(name: string): string | null {
    return name.toLowerCase() === "etag" ? "\"part-etag\"" : null;
  }

  open(method: string, url: string): void {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(): void {}

  send(body: BodyInit | null): void {
    FakeXMLHttpRequest.uploads.push({ method: this.method, url: this.url, body });
    const size = body instanceof Blob ? body.size : 0;
    this.upload.onprogress?.({
      lengthComputable: true,
      loaded: size,
      total: size,
    } as ProgressEvent);
    queueMicrotask(() => this.onload?.());
  }
}

beforeEach(() => {
  apiCalls.length = 0;
  createPostBodies.length = 0;
  songArtifactBundleBodies.length = 0;
  FakeXMLHttpRequest.uploads.length = 0;
  globalThis.fetch = async () => new Response(null, {
    status: 200,
    headers: { ETag: "\"part-etag\"" },
  });
  globalThis.XMLHttpRequest = FakeXMLHttpRequest as unknown as typeof XMLHttpRequest;
  createdSongArtifactBundleResult = songBundle({
    id: "sab_created",
    previewStatus: "completed",
  });
  readSongArtifactBundleResult = songBundle({
    id: "sab_existing",
    previewStatus: "completed",
  });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.XMLHttpRequest = OriginalXMLHttpRequest;
  if (originalAsyncSongPublishFlag == null) {
    delete import.meta.env.VITE_ASYNC_SONG_PUBLISH_ENABLED;
  } else {
    import.meta.env.VITE_ASYNC_SONG_PUBLISH_ENABLED = originalAsyncSongPublishFlag;
  }
});

describe("useSongSubmit", () => {
  test("persists a newly created song bundle until async post create succeeds", async () => {
    const pendingBundleIds: Array<string | null> = [];
    const progressEvents: string[] = [];
    const { result } = renderSubmitHook();

    await act(async () => {
      await result.current(submitInput({
        reportProgress: (key) => progressEvents.push(key),
        setPendingSongBundleId: (bundleId) => pendingBundleIds.push(bundleId),
      }));
    });

    expect(pendingBundleIds).toEqual(["sab_created", null]);
    expect(apiCalls).toEqual([
      "createArtifactUpload",
      "getArtifactUploadPartSignedUrl",
      "completeArtifactUploadSession",
      "createSongArtifactBundle",
      "createPost",
    ]);
    expect(songArtifactBundleBodies).toHaveLength(1);
    expect((songArtifactBundleBodies[0] as { analysis_mode?: unknown }).analysis_mode).toBe("deferred");
    expect(createPostBodies).toHaveLength(1);
    expect((createPostBodies[0] as { publish_mode?: unknown }).publish_mode).toBe("async");
    expect((createPostBodies[0] as { listing_draft?: unknown }).listing_draft).toBeUndefined();
    expect(progressEvents).toEqual([
      "validating",
      "upload_primary_audio",
      "upload_primary_audio",
      "create_bundle",
      "publish_post",
    ]);
  });

  test("resumes locked song retry from a pending bundle without re-uploading", async () => {
    const pendingBundleIds: Array<string | null> = [];
    const progressEvents: string[] = [];
    const { result } = renderSubmitHook();

    await act(async () => {
      await result.current(submitInput({
        monetizationState: {
          priceUsd: "3.99",
          regionalPricingEnabled: false,
          visible: true,
        },
        paidSongPriceUsd: 3.99,
        pendingSongBundleId: "sab_existing",
        pricingPolicyRegionalPricingEnabled: true,
        reportProgress: (key) => progressEvents.push(key),
        setPendingSongBundleId: (bundleId) => pendingBundleIds.push(bundleId),
      }));
    });

    expect(pendingBundleIds).toEqual([null]);
    expect(apiCalls).toEqual([
      "getSongArtifactBundle",
      "createPost",
    ]);
    expect(createPostBodies).toHaveLength(1);
    expect((createPostBodies[0] as {
      listing_draft?: { asset?: unknown; price_cents?: unknown };
      publish_mode?: unknown;
    }).publish_mode).toBe("async");
    expect((createPostBodies[0] as {
      listing_draft?: { asset?: unknown; price_cents?: unknown };
    }).listing_draft).toMatchObject({ price_cents: 399 });
    expect((createPostBodies[0] as {
      listing_draft?: { asset?: unknown };
    }).listing_draft?.asset).toBeUndefined();
    expect(progressEvents).toEqual([
      "validating",
      "publish_post",
    ]);
  });

  test("can roll back to sync publish while still sending server-side listing draft", async () => {
    import.meta.env.VITE_ASYNC_SONG_PUBLISH_ENABLED = "false";
    const { result } = renderSubmitHook();

    await act(async () => {
      await result.current(submitInput({
        monetizationState: {
          priceUsd: "3.99",
          regionalPricingEnabled: false,
          visible: true,
        },
        paidSongPriceUsd: 3.99,
        pricingPolicyRegionalPricingEnabled: true,
      }));
    });

    expect(songArtifactBundleBodies).toHaveLength(1);
    expect((songArtifactBundleBodies[0] as { analysis_mode?: unknown }).analysis_mode).toBeUndefined();
    expect(createPostBodies).toHaveLength(1);
    expect((createPostBodies[0] as {
      listing_draft?: { asset?: unknown; price_cents?: unknown };
      publish_mode?: unknown;
    }).publish_mode).toBeUndefined();
    expect((createPostBodies[0] as {
      listing_draft?: { asset?: unknown; price_cents?: unknown };
    }).listing_draft).toMatchObject({ price_cents: 399 });
    expect((createPostBodies[0] as {
      listing_draft?: { asset?: unknown };
    }).listing_draft?.asset).toBeUndefined();
  });

  test("reuses a locked song bundle after a legacy preview worker failure", async () => {
    readSongArtifactBundleResult = songBundle({
      id: "sab_existing",
      previewStatus: "failed",
      previewError: "Song preview cropping requires a Node-only ffmpeg worker",
    });
    const pendingBundleIds: Array<string | null> = [];
    const progressEvents: string[] = [];
    const { result } = renderSubmitHook();

    await act(async () => {
      await result.current(submitInput({
        monetizationState: {
          priceUsd: "3.99",
          regionalPricingEnabled: false,
          visible: true,
        },
        paidSongPriceUsd: 3.99,
        pendingSongBundleId: "sab_existing",
        pricingPolicyRegionalPricingEnabled: true,
        reportProgress: (key) => progressEvents.push(key),
        setPendingSongBundleId: (bundleId) => pendingBundleIds.push(bundleId),
      }));
    });

    expect(pendingBundleIds).toEqual([null]);
    expect(apiCalls).toEqual([
      "getSongArtifactBundle",
      "createPost",
    ]);
    expect(progressEvents).toEqual([
      "validating",
      "publish_post",
    ]);
  });
});
