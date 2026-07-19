"use client";

import type { SongArtifactUpload } from "@pirate/api-contracts";

const DEFAULT_MULTIPART_UPLOAD_CONCURRENCY = 3;
const DEFAULT_PART_RETRY_DELAYS_MS = [250, 1000, 4000] as const;

class PermanentMultipartPartUploadError extends Error {}

type RetryableMultipartPartUploadError = Error & { retryAfterMs?: number | null };

type MultipartArtifactProgressReporter = (fraction: number) => void;

export type MultipartArtifactUploadInput = {
  abortSession: (
    artifactUploadId: string,
    sessionId: string,
  ) => Promise<void>;
  artifactLabel: string;
  completeSession: (
    artifactUploadId: string,
    sessionId: string,
    body: {
      upload_id: string;
      parts: Array<{ part_number: number; etag: string }>;
      content_hash?: string | null;
    },
  ) => Promise<SongArtifactUpload>;
  concurrency?: number;
  contentHashPromise: Promise<string>;
  file: File;
  getPartSignedUrl: (
    artifactUploadId: string,
    sessionId: string,
    partNumber: number,
  ) => Promise<{ url: string }>;
  intent: SongArtifactUpload;
  onAbortError?: (error: unknown) => void;
  onProgress?: MultipartArtifactProgressReporter;
  partUploadTimeoutMs: number;
  retryDelaysMs?: readonly number[];
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

function uploadBlobWithProgress(input: {
  body: Blob;
  headers?: Record<string, string>;
  method: "PUT";
  onProgress?: (loadedBytes: number) => void;
  timeoutMs: number;
  url: string;
}): Promise<{ etag: string | null; retryAfterMs: number | null; status: number; statusText: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(input.method, input.url);
    xhr.timeout = input.timeoutMs;
    for (const [name, value] of Object.entries(input.headers ?? {})) {
      xhr.setRequestHeader(name, value);
    }
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        input.onProgress?.(event.loaded);
      }
    };
    xhr.onload = () => {
      input.onProgress?.(input.body.size);
      resolve({
        etag: xhr.getResponseHeader("ETag"),
        retryAfterMs: parseRetryAfterMs(xhr.getResponseHeader("Retry-After")),
        status: xhr.status,
        statusText: xhr.statusText,
      });
    };
    xhr.onerror = () => reject(new Error("Multipart part upload failed"));
    xhr.ontimeout = () => reject(new Error("Multipart part upload timed out"));
    xhr.onabort = () => reject(new Error("Multipart part upload was aborted"));
    xhr.send(input.body);
  });
}

function parseRetryAfterMs(value: string | null): number | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const seconds = Number(trimmed);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.round(seconds * 1000);
  }

  const retryAt = Date.parse(trimmed);
  if (!Number.isFinite(retryAt)) {
    return null;
  }
  return Math.max(0, retryAt - Date.now());
}

function getRetryAfterMs(error: unknown): number | null {
  if (!(error instanceof Error)) {
    return null;
  }
  const retryAfterMs = (error as RetryableMultipartPartUploadError).retryAfterMs;
  return typeof retryAfterMs === "number" && Number.isFinite(retryAfterMs) && retryAfterMs >= 0
    ? retryAfterMs
    : null;
}

export async function uploadMultipartSongArtifact(input: MultipartArtifactUploadInput): Promise<SongArtifactUpload> {
  const session = input.intent.upload_session;
  if (!session) {
    throw new Error(`${input.artifactLabel} upload did not return a multipart session.`);
  }

  const uploadSession = session;
  const parts: Array<{ part_number: number; etag: string }> = [];
  const uploadedPartBytes = new Map<number, number>();
  const retryDelays = input.retryDelaysMs ?? DEFAULT_PART_RETRY_DELAYS_MS;
  let nextPartNumber = 1;

  function reportPartProgress(partNumber: number, loadedBytes: number): void {
    const boundedLoadedBytes = Math.min(loadedBytes, input.file.size);
    if (uploadedPartBytes.get(partNumber) === boundedLoadedBytes) {
      return;
    }
    uploadedPartBytes.set(partNumber, boundedLoadedBytes);
    const uploadedBytes = [...uploadedPartBytes.values()].reduce((sum, bytes) => sum + bytes, 0);
    input.onProgress?.(Math.min(1, uploadedBytes / Math.max(input.file.size, 1)));
  }

  async function uploadPart(partNumber: number): Promise<void> {
    const start = (partNumber - 1) * uploadSession.part_size_bytes;
    const end = Math.min(input.file.size, start + uploadSession.part_size_bytes);
    const body = input.file.slice(start, end, input.file.type || "application/octet-stream");
    let lastError: unknown = null;

    for (let attempt = 0; attempt < retryDelays.length; attempt += 1) {
      try {
        const signed = await input.getPartSignedUrl(input.intent.id, uploadSession.id, partNumber);
        const response = await uploadBlobWithProgress({
          url: signed.url,
          method: "PUT",
          body,
          headers: input.file.type ? { "Content-Type": input.file.type } : undefined,
          onProgress: (loadedBytes) => reportPartProgress(partNumber, loadedBytes),
          timeoutMs: input.partUploadTimeoutMs,
        });
        if (response.status < 200 || response.status >= 300) {
          const message = `${input.artifactLabel} part ${partNumber} upload failed with ${response.status}`;
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            throw new PermanentMultipartPartUploadError(message);
          }
          throw Object.assign(new Error(message), { retryAfterMs: response.retryAfterMs });
        }
        const etag = response.etag?.trim();
        if (!etag) {
          throw new Error(`${input.artifactLabel} part ${partNumber} upload did not return an ETag.`);
        }
        reportPartProgress(partNumber, body.size);
        parts.push({ part_number: partNumber, etag });
        return;
      } catch (error) {
        if (error instanceof PermanentMultipartPartUploadError) {
          throw error;
        }
        lastError = error;
        if (attempt < retryDelays.length - 1) {
          await sleep(getRetryAfterMs(error) ?? retryDelays[attempt]);
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(`${input.artifactLabel} part ${partNumber} upload failed.`);
  }

  async function worker(): Promise<void> {
    while (nextPartNumber <= uploadSession.total_parts) {
      const partNumber = nextPartNumber;
      nextPartNumber += 1;
      await uploadPart(partNumber);
    }
  }

  try {
    const workerCount = Math.min(input.concurrency ?? DEFAULT_MULTIPART_UPLOAD_CONCURRENCY, uploadSession.total_parts);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));
    const contentHash = await input.contentHashPromise;
    return await input.completeSession(input.intent.id, uploadSession.id, {
      upload_id: uploadSession.upload_id,
      content_hash: `0x${contentHash}`,
      parts: [...parts].sort((a, b) => a.part_number - b.part_number),
    });
  } catch (error) {
    try {
      await input.abortSession(input.intent.id, uploadSession.id);
    } catch (abortError) {
      input.onAbortError?.(abortError);
    }
    throw error;
  }
}
