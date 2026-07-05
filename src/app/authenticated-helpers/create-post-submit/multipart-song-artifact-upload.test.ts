import { afterEach, describe, expect, test } from "bun:test";
import type { SongArtifactUpload } from "@pirate/api-contracts";

import { uploadMultipartSongArtifact } from "./multipart-song-artifact-upload";

type ProgressHandler = (event: ProgressEvent) => void;

const originalSetTimeout = globalThis.setTimeout;
const originalXMLHttpRequest = globalThis.XMLHttpRequest;

let xhrStatuses: number[] = [];
let xhrRetryAfter: string | null = null;
let xhrEtagPrefix = "etag";
const xhrRequests: Array<{ bodySize: number; headers: Record<string, string>; url: string }> = [];

class FakeXMLHttpRequest {
  status = 200;
  statusText = "OK";
  timeout = 0;
  upload = {
    onprogress: null as ProgressHandler | null,
  };
  private headers: Record<string, string> = {};
  private responseEtag: string | null = null;
  private responseStatus = 200;
  private url = "";

  onabort: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onload: (() => void) | null = null;
  ontimeout: (() => void) | null = null;

  getResponseHeader(name: string): string | null {
    const lowerName = name.toLowerCase();
    if (lowerName === "etag") {
      return this.responseEtag;
    }
    if (lowerName === "retry-after") {
      return xhrRetryAfter;
    }
    return null;
  }

  open(_method: string, url: string): void {
    this.url = url;
  }

  setRequestHeader(name: string, value: string): void {
    this.headers[name] = value;
  }

  send(body: BodyInit | null): void {
    this.responseStatus = xhrStatuses.shift() ?? 200;
    this.status = this.responseStatus;
    const bodySize = body instanceof Blob ? body.size : 0;
    this.responseEtag = this.responseStatus >= 200 && this.responseStatus < 300
      ? `"${xhrEtagPrefix}-${xhrRequests.length + 1}"`
      : null;
    xhrRequests.push({
      bodySize,
      headers: this.headers,
      url: this.url,
    });
    this.upload.onprogress?.({
      lengthComputable: true,
      loaded: bodySize,
      total: bodySize,
    } as ProgressEvent);
    queueMicrotask(() => this.onload?.());
  }
}

function createIntent(input: {
  partSizeBytes?: number;
  totalParts?: number;
} = {}): SongArtifactUpload {
  return {
    id: "sau_test",
    object: "song_artifact_upload",
    artifact_kind: "primary_audio",
    community: "cmt_test",
    content_hash: null,
    filename: "song.mp3",
    mime_type: "audio/mpeg",
    size_bytes: 12,
    status: "pending_upload",
    storage_ref: "r2://pending/song.mp3",
    upload_session: {
      id: "saus_test",
      object: "song_artifact_upload_session",
      part_size_bytes: input.partSizeBytes ?? 5,
      total_parts: input.totalParts ?? 3,
      upload_id: "filebase-upload-test",
    },
  } as unknown as SongArtifactUpload;
}

function createUploadedArtifact(): SongArtifactUpload {
  return {
    ...createIntent(),
    content_hash: "0xabc",
    status: "uploaded",
    storage_ref: "r2://uploaded/song.mp3",
    upload_session: null,
  } as unknown as SongArtifactUpload;
}

function createFile(size = 12): File {
  return new File(["x".repeat(size)], "song.mp3", { type: "audio/mpeg" });
}

afterEach(() => {
  globalThis.setTimeout = originalSetTimeout;
  globalThis.XMLHttpRequest = originalXMLHttpRequest;
  xhrEtagPrefix = "etag";
  xhrRequests.length = 0;
  xhrRetryAfter = null;
  xhrStatuses = [];
});

describe("uploadMultipartSongArtifact", () => {
  test("uploads all parts, reports progress, sorts completed parts, and sends the content hash", async () => {
    globalThis.XMLHttpRequest = FakeXMLHttpRequest as unknown as typeof XMLHttpRequest;
    const completedBodies: Array<{
      content_hash?: string | null;
      parts: Array<{ etag: string; part_number: number }>;
      upload_id: string;
    }> = [];
    const progress: number[] = [];

    const result = await uploadMultipartSongArtifact({
      abortSession: async () => {
        throw new Error("abort should not run");
      },
      artifactLabel: "primary_audio",
      completeSession: async (_artifactUploadId, _sessionId, body) => {
        completedBodies.push(body);
        return createUploadedArtifact();
      },
      concurrency: 2,
      contentHashPromise: Promise.resolve("a".repeat(64)),
      file: createFile(),
      getPartSignedUrl: async (_artifactUploadId, _sessionId, partNumber) => ({
        url: `https://upload.test/song/part-${partNumber}`,
      }),
      intent: createIntent(),
      onProgress: (fraction) => progress.push(fraction),
      partUploadTimeoutMs: 30_000,
      retryDelaysMs: [0, 0],
    });

    expect(result.storage_ref).toBe("r2://uploaded/song.mp3");
    expect(xhrRequests.map((request) => request.url)).toEqual([
      "https://upload.test/song/part-1",
      "https://upload.test/song/part-2",
      "https://upload.test/song/part-3",
    ]);
    expect(xhrRequests.map((request) => request.bodySize)).toEqual([5, 5, 2]);
    expect(xhrRequests.every((request) => request.headers["Content-Type"] === "audio/mpeg")).toBe(true);
    expect(progress.at(-1)).toBe(1);
    expect(completedBodies).toEqual([{
      upload_id: "filebase-upload-test",
      content_hash: `0x${"a".repeat(64)}`,
      parts: [
        { part_number: 1, etag: "\"etag-1\"" },
        { part_number: 2, etag: "\"etag-2\"" },
        { part_number: 3, etag: "\"etag-3\"" },
      ],
    }]);
  });

  test("retries retryable part failures before completing the session", async () => {
    globalThis.XMLHttpRequest = FakeXMLHttpRequest as unknown as typeof XMLHttpRequest;
    xhrStatuses = [429, 200];
    xhrRetryAfter = "2";
    const retryDelays: number[] = [];
    globalThis.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
      retryDelays.push(timeout ?? 0);
      queueMicrotask(() => {
        if (typeof handler === "function") {
          handler(...args);
        }
      });
      return 0;
    }) as typeof setTimeout;
    const signedUrlCalls: number[] = [];

    await uploadMultipartSongArtifact({
      abortSession: async () => {
        throw new Error("abort should not run");
      },
      artifactLabel: "primary_audio",
      completeSession: async () => createUploadedArtifact(),
      contentHashPromise: Promise.resolve("b".repeat(64)),
      file: createFile(5),
      getPartSignedUrl: async (_artifactUploadId, _sessionId, partNumber) => {
        signedUrlCalls.push(partNumber);
        return { url: `https://upload.test/song/retry-${signedUrlCalls.length}` };
      },
      intent: createIntent({ partSizeBytes: 5, totalParts: 1 }),
      partUploadTimeoutMs: 30_000,
      retryDelaysMs: [0, 0],
    });

    expect(signedUrlCalls).toEqual([1, 1]);
    expect(retryDelays).toContain(2000);
    expect(xhrRequests.map((request) => request.url)).toEqual([
      "https://upload.test/song/retry-1",
      "https://upload.test/song/retry-2",
    ]);
  });

  test("aborts the multipart session when a permanent part failure occurs", async () => {
    globalThis.XMLHttpRequest = FakeXMLHttpRequest as unknown as typeof XMLHttpRequest;
    xhrStatuses = [403];
    const abortCalls: Array<{ artifactUploadId: string; sessionId: string }> = [];

    let thrown: unknown = null;
    try {
      await uploadMultipartSongArtifact({
        abortSession: async (artifactUploadId, sessionId) => {
          abortCalls.push({ artifactUploadId, sessionId });
        },
        artifactLabel: "primary_audio",
        completeSession: async () => {
          throw new Error("complete should not run");
        },
        contentHashPromise: Promise.resolve("c".repeat(64)),
        file: createFile(5),
        getPartSignedUrl: async () => ({ url: "https://upload.test/song/forbidden" }),
        intent: createIntent({ partSizeBytes: 5, totalParts: 1 }),
        partUploadTimeoutMs: 30_000,
        retryDelaysMs: [0],
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect(String((thrown as Error).message)).toContain("failed with 403");
    expect(abortCalls).toEqual([{ artifactUploadId: "sau_test", sessionId: "saus_test" }]);
  });
});
