import { describe, expect, test } from "bun:test";

import type { ApiContentBlob } from "@/lib/api/client-api-types";

import { submitDownloadableFilePost } from "./generic";

const baseRequest = {
  idempotency_key: "idem_file_1",
  identity_mode: "public" as const,
  translation_policy: "none" as const,
  visibility: "public" as const,
};

function contentBlob(status: ApiContentBlob["status"], id = "blob_1"): ApiContentBlob {
  return {
    id,
    object: "content_blob",
    community: "com_1",
    uploader_user: "usr_1",
    status,
    validation_profile: "download_file_v1",
    declared_filename: "records.csv",
    declared_mime_type: "text/csv",
    declared_size_bytes: 4,
    declared_content_hash: null,
    detected_mime_type: null,
    verified_size_bytes: null,
    verified_content_hash: null,
    security_scan_state: "pending",
    rejection_code: null,
    plaintext_retention_state: "active",
    upload_url: null,
    upload_session: null,
    created: 1,
  };
}

function fileState() {
  return { upload: new File(["a,b\n"], "records.csv", { type: "text/csv" }) };
}

describe("downloadable file post submission", () => {
  for (const status of ["failed", "rejected", "cancelled"] as const) {
    test(`does not publish against a terminal ${status} content blob`, async () => {
      let postCalls = 0;
      let uploadCalls = 0;

      await expect(submitDownloadableFilePost({
        communityId: "com_1",
        title: "Records",
        file: fileState(),
        baseRequest,
        contentBlobId: "blob_terminal",
        createContentBlob: async () => contentBlob(status, "blob_terminal"),
        getContentBlob: async () => contentBlob(status, "blob_terminal"),
        uploadContentBlob: async () => {
          uploadCalls += 1;
          return contentBlob("uploaded", "blob_terminal");
        },
        createPost: async () => {
          postCalls += 1;
          return { id: "post_terminal" };
        },
      })).rejects.toThrow("can no longer be resumed");

      expect(postCalls).toBe(0);
      expect(uploadCalls).toBe(0);
    });
  }

  test("creates, uploads, and publishes a locked file post", async () => {
    const createdBodies: Array<Record<string, unknown>> = [];
    const progress: string[] = [];

    const result = await submitDownloadableFilePost({
      communityId: "com_1",
      title: "Records",
      file: fileState(),
      baseRequest,
      createContentBlob: async () => contentBlob("pending_upload"),
      getContentBlob: async () => contentBlob("pending_upload"),
      uploadContentBlob: async () => contentBlob("uploaded"),
      createPost: async (_communityId, body) => {
        createdBodies.push(body as unknown as Record<string, unknown>);
        return { id: "post_1" };
      },
      reportProgress: (key) => progress.push(key),
    });

    expect(result.id).toBe("post_1");
    expect(createdBodies[0]).toMatchObject({
      access_mode: "locked",
      file_upload: "blob_1",
      listing_draft: { price_cents: 100, status: "active" },
      post_type: "file",
      title: "Records",
    });
    expect(progress).toEqual(["validating", "uploading_media", "publishing_post"]);
  });

  test("resumes from an existing content blob without recreating or reuploading it", async () => {
    let createBlobCalls = 0;
    let uploadCalls = 0;
    let postCalls = 0;

    const result = await submitDownloadableFilePost({
      communityId: "com_1",
      title: "Records",
      file: fileState(),
      baseRequest,
      contentBlobId: "blob_existing",
      createContentBlob: async () => {
        createBlobCalls += 1;
        return contentBlob("pending_upload");
      },
      getContentBlob: async () => contentBlob("uploaded", "blob_existing"),
      uploadContentBlob: async () => {
        uploadCalls += 1;
        return contentBlob("uploaded", "blob_existing");
      },
      createPost: async () => {
        postCalls += 1;
        return { id: "post_2" };
      },
    });

    expect(result.id).toBe("post_2");
    expect(createBlobCalls).toBe(0);
    expect(uploadCalls).toBe(0);
    expect(postCalls).toBe(1);
  });

  test("rejects a submission without a file before calling the API", async () => {
    let called = false;

    await expect(submitDownloadableFilePost({
      communityId: "com_1",
      title: "Missing",
      file: { upload: null },
      baseRequest,
      createContentBlob: async () => {
        called = true;
        return contentBlob("pending_upload");
      },
      getContentBlob: async () => contentBlob("pending_upload"),
      uploadContentBlob: async () => contentBlob("uploaded"),
      createPost: async () => ({ id: "post_3" }),
    })).rejects.toThrow("Choose a CSV, TSV, TXT, or JSON file.");

    expect(called).toBe(false);
  });
});
