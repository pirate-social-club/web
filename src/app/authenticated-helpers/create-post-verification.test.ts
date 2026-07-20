import { describe, expect, test } from "bun:test";

import {
  canSubmitPostWithProofOfWork,
  shouldPromptUniqueHumanForPost,
} from "./create-post-verification";

describe("create post verification decisions", () => {
  test("treats a solved post proof-of-work as enough to submit for a posting member", () => {
    expect(canSubmitPostWithProofOfWork({
      hasPostingAccess: true,
      postAltchaPayload: "pow-proof",
      postAltchaRequired: true,
    })).toBe(true);
  });

  test("does not request Very when proof-of-work is the active post check", () => {
    expect(shouldPromptUniqueHumanForPost({
      needsSelfDocumentFactVerification: false,
      postAltchaRequired: true,
      uniqueHumanVerified: false,
    })).toBe(false);
  });

  test("keeps unique-human verification for communities without proof-of-work", () => {
    expect(shouldPromptUniqueHumanForPost({
      needsSelfDocumentFactVerification: false,
      postAltchaRequired: false,
      uniqueHumanVerified: false,
    })).toBe(true);
  });
});
