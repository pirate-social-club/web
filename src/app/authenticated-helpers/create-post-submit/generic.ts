"use client";

import type { CreatePostRequest } from "@pirate/api-contracts";
import type { DownloadFileComposerState } from "@/components/compositions/posts/post-composer/post-composer.types";
import type { BasePostRequestFields, SignAgentAuthoredBody } from "./base";
import type { ApiContentBlob } from "@/lib/api/client-api-types";

type CreatePost = (communityId: string, body: CreatePostRequest, options?: { altchaPayload?: string | null }) => Promise<{ id: string; status?: string; asset?: string | null }>;

export async function submitDownloadableFilePost(input: {
  communityId: string;
  title: string;
  file: DownloadFileComposerState;
  baseRequest: BasePostRequestFields;
  createContentBlob: (communityId: string, body: {
    validation_profile: "download_file_v1";
    declared_filename: string;
    declared_mime_type: string;
    declared_size_bytes: number;
    upload_mode: "proxy";
  }) => Promise<ApiContentBlob>;
  getContentBlob: (communityId: string, blobId: string) => Promise<ApiContentBlob>;
  uploadContentBlob: (communityId: string, blobId: string, content: ArrayBuffer, mimeType: string, onUploadProgress?: (fraction: number) => void) => Promise<ApiContentBlob>;
  createPost: CreatePost;
  contentBlobId?: string;
  onContentBlobCreated?: (blob: ApiContentBlob) => void;
  reportProgress?: (key: "validating" | "uploading_media" | "publishing_post") => void;
  signAgentAuthoredBody?: SignAgentAuthoredBody;
  authorMode?: "human" | "agent";
  altchaPayload?: string | null;
}): Promise<{ id: string; status?: string; asset?: string | null }> {
  const upload = input.file.upload;
  if (!upload) throw new Error("Choose a CSV, TSV, TXT, or JSON file.");
  input.reportProgress?.("validating");
  const contentBlob = input.contentBlobId
    ? await input.getContentBlob(input.communityId, input.contentBlobId)
    : await input.createContentBlob(input.communityId, {
      validation_profile: "download_file_v1",
      declared_filename: upload.name,
      declared_mime_type: upload.type || mimeFromFilename(upload.name),
      declared_size_bytes: upload.size,
      upload_mode: "proxy",
    });
  input.onContentBlobCreated?.(contentBlob);
  if (contentBlob.status === "failed" || contentBlob.status === "rejected" || contentBlob.status === "cancelled") {
    throw new Error("This file upload can no longer be resumed. Remove the file and choose it again before publishing.");
  }
  if (contentBlob.status === "pending_upload") {
    input.reportProgress?.("uploading_media");
    await input.uploadContentBlob(input.communityId, contentBlob.id, await upload.arrayBuffer(), contentBlob.declared_mime_type, (fraction) => {
      input.reportProgress?.(fraction >= 1 ? "publishing_post" : "uploading_media");
    });
  }
  const request = {
    ...input.baseRequest,
    post_type: "file" as const,
    title: input.title.trim(),
    file_upload: contentBlob.id,
    access_mode: "locked" as const,
    rights_basis: "original" as const,
    listing_draft: { price_cents: 100, regional_pricing_enabled: false, status: "active" as const },
  } satisfies Record<string, unknown>;
  const signed = input.authorMode === "agent" && input.signAgentAuthoredBody
    ? await input.signAgentAuthoredBody(`/communities/${input.communityId}/posts`, request)
    : request;
  input.reportProgress?.("publishing_post");
  return input.createPost(input.communityId, signed as CreatePostRequest, { altchaPayload: input.altchaPayload });
}

function mimeFromFilename(filename: string): string {
  const extension = filename.toLowerCase().split(".").pop();
  return extension === "csv"
    ? "text/csv"
    : extension === "tsv"
      ? "text/tab-separated-values"
      : extension === "json"
        ? "application/json"
        : "text/plain";
}
