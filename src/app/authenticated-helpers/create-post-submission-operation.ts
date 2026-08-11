import type { SongArtifactUpload } from "@pirate/api-contracts";

import type { UploadedImageMedia } from "./create-post-submit/image";
import type { UploadedLiveCoverMedia } from "./create-post-submit/live";
import type { PreparedVideoPosterUpload } from "./create-post-submit/video";

export type CreatePostSubmissionOperation = {
  fingerprint: string;
  idempotencyKey: string;
  imageUpload?: UploadedImageMedia;
  liveCoverUpload?: UploadedLiveCoverMedia;
  videoPosterUpload?: PreparedVideoPosterUpload;
  videoUpload?: SongArtifactUpload;
};

const submissionFileIdentities = new WeakMap<File, number>();
let nextSubmissionFileIdentity = 1;

function submissionFileIdentity(file: File): number {
  const existing = submissionFileIdentities.get(file);
  if (existing) return existing;
  const identity = nextSubmissionFileIdentity;
  nextSubmissionFileIdentity += 1;
  submissionFileIdentities.set(file, identity);
  return identity;
}

function stableFingerprintValue(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value == null || typeof value !== "object") return value;
  if (typeof File !== "undefined" && value instanceof File) {
    return {
      identity: submissionFileIdentity(value),
      lastModified: value.lastModified,
      name: value.name,
      size: value.size,
      type: value.type,
    };
  }
  if (Array.isArray(value)) return value.map(stableFingerprintValue);

  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(source).sort()) {
    const next = stableFingerprintValue(source[key]);
    if (next !== undefined) result[key] = next;
  }
  return result;
}

export function createPostSubmissionFingerprint(value: unknown): string {
  return JSON.stringify(stableFingerprintValue(value));
}

export function ensureCreatePostSubmissionOperation(
  current: CreatePostSubmissionOperation | null,
  fingerprint: string,
  createKey: () => string = () => crypto.randomUUID(),
): CreatePostSubmissionOperation {
  if (current?.fingerprint === fingerprint) return current;
  return { fingerprint, idempotencyKey: createKey() };
}
