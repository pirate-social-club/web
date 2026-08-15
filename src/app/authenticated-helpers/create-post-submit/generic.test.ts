import { describe, expect, test } from "bun:test";

import type { ApiContentBlob } from "@/lib/api/client-api-types";

import { submitDownloadableFilePost, submitLearningDeckPost } from "./generic";

const baseRequest = {
  idempotency_key: "idem_deck_retry",
  identity_mode: "public" as const,
  translation_policy: "none" as const,
  visibility: "public" as const,
};

function draft(cards: Array<{ cardId: string; ordinal: number }>) {
  return {
    deck: { learning_deck_id: "ldk_1", title: "Deck", description: null, status: "draft" as const },
    version: { learning_deck_version_id: "ldv_1", version: 1, status: "draft" },
    cards: cards.map((card) => ({
      ...card,
      cardType: "basic" as const,
      retiredAt: null,
      prompt: "Question",
      answer: "Answer",
      tags: [],
    })),
  };
}

function contentBlob(status: ApiContentBlob["status"]): ApiContentBlob {
  return {
    community: "com_1",
    created: 1,
    declared_content_hash: null,
    declared_filename: "notes.txt",
    declared_mime_type: "text/plain",
    declared_size_bytes: 5,
    detected_mime_type: null,
    id: "cbl_1",
    object: "content_blob",
    plaintext_retention_state: "active",
    rejection_code: status === "rejected" ? "content_rejected" : null,
    security_scan_state: "pending",
    status,
    upload_session: null,
    upload_url: null,
    uploader_user: "usr_1",
    validation_profile: "download_file_v1",
    verified_content_hash: null,
    verified_size_bytes: null,
  };
}

function downloadableFileInput(overrides: {
  blobStatus?: ApiContentBlob["status"];
  createPost?: () => Promise<{ id: string }>;
  uploadContentBlob?: () => Promise<ApiContentBlob>;
} = {}) {
  const blobStatus = overrides.blobStatus ?? "pending_upload";
  return {
    baseRequest,
    communityId: "com_1",
    contentBlobId: "cbl_1",
    createContentBlob: async () => contentBlob(blobStatus),
    createPost: overrides.createPost ?? (async () => ({ id: "pst_1" })),
    file: { upload: new File(["notes"], "notes.txt", { type: "text/plain" }) },
    getContentBlob: async () => contentBlob(blobStatus),
    title: "Notes",
    uploadContentBlob: overrides.uploadContentBlob ?? (async () => contentBlob("uploaded")),
  };
}

describe("generic post submission", () => {
  for (const status of ["failed", "rejected", "cancelled"] as const) {
    test(`does not publish against a terminal ${status} content blob`, async () => {
      let createPostCalls = 0;
      let uploadCalls = 0;

      await expect(submitDownloadableFilePost(downloadableFileInput({
        blobStatus: status,
        createPost: async () => {
          createPostCalls += 1;
          return { id: "pst_1" };
        },
        uploadContentBlob: async () => {
          uploadCalls += 1;
          return contentBlob("uploaded");
        },
      }))).rejects.toThrow("can no longer be resumed");
      expect(createPostCalls).toBe(0);
      expect(uploadCalls).toBe(0);
    });
  }

  test("resumes a pending content blob by uploading before publication", async () => {
    const calls: string[] = [];

    const result = await submitDownloadableFilePost(downloadableFileInput({
      createPost: async () => {
        calls.push("createPost");
        return { id: "pst_1" };
      },
      uploadContentBlob: async () => {
        calls.push("uploadContentBlob");
        return contentBlob("uploaded");
      },
    }));

    expect(result.id).toBe("pst_1");
    expect(calls).toEqual(["uploadContentBlob", "createPost"]);
  });

  test("reuses a server card ID when a deck retry resumes an existing draft", async () => {
    const calls: Array<{ card_id?: string }> = [];
    const result = await submitLearningDeckPost({
      communityId: "com_1",
      title: "Deck",
      deck: {
        description: "Practice",
        cards: [{ id: "client-uuid", cardType: "basic", prompt: "Question", answer: "Answer", tags: [] }],
      },
      baseRequest,
      learningDeckId: "ldk_1",
      getLearningDeck: async () => draft([{ cardId: "lcd_existing", ordinal: 0 }]),
      createLearningDeck: async () => draft([]),
      upsertLearningDeckCard: async (_communityId, _deckId, body) => {
        calls.push(body);
        return draft([{ cardId: body.card_id ?? "lcd_new", ordinal: 0 }]);
      },
      validateLearningDeck: async () => ({ issues: [], canonical: null }),
      createPost: async () => ({ id: "pst_1" }),
    });

    expect(result.id).toBe("pst_1");
    expect(calls.map((call) => call.card_id)).toEqual(["lcd_existing"]);
  });
});
