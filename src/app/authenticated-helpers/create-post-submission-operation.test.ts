import { describe, expect, test } from "bun:test";

import {
  createPostSubmissionFingerprint,
  ensureCreatePostSubmissionOperation,
} from "./create-post-submission-operation";

describe("create post submission operations", () => {
  test("reuses the operation for an unchanged draft", () => {
    const fingerprint = createPostSubmissionFingerprint({ mode: "text", title: "Same" });
    const first = ensureCreatePostSubmissionOperation(null, fingerprint, () => "op_1");
    const retry = ensureCreatePostSubmissionOperation(first, fingerprint, () => "op_2");

    expect(retry).toBe(first);
    expect(retry.idempotencyKey).toBe("op_1");
  });

  test("starts a new operation when submitted inputs change", () => {
    const first = ensureCreatePostSubmissionOperation(
      null,
      createPostSubmissionFingerprint({ title: "Before" }),
      () => "op_1",
    );
    const edited = ensureCreatePostSubmissionOperation(
      first,
      createPostSubmissionFingerprint({ title: "After" }),
      () => "op_2",
    );

    expect(edited.idempotencyKey).toBe("op_2");
  });

  test("distinguishes replacement files even when their metadata matches", () => {
    const firstFile = new File(["first"], "upload.mp4", {
      lastModified: 1,
      type: "video/mp4",
    });
    const replacementFile = new File(["other"], "upload.mp4", {
      lastModified: 1,
      type: "video/mp4",
    });

    expect(createPostSubmissionFingerprint({ file: firstFile }))
      .not.toBe(createPostSubmissionFingerprint({ file: replacementFile }));
    expect(createPostSubmissionFingerprint({ file: firstFile }))
      .toBe(createPostSubmissionFingerprint({ file: firstFile }));
  });
});
