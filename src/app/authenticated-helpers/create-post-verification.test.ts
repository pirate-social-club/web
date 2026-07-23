import { describe, expect, test } from "bun:test";
import type { JoinEligibility } from "@pirate/api-contracts";

import {
  canSendCreatePostRequest,
  canSubmitPostWithProofOfWork,
  requiresPostAltchaProofForNonMember,
  shouldPromptUniqueHumanForPost,
} from "./create-post-verification";

describe("create post verification decisions", () => {
  test("opens PoW posting only when that branch can satisfy the gate", () => {
    const eligibility = {
      gate_evaluation: {
        required_action_set: {
          items: [
            { capability: "altcha_pow", kind: "capability" },
            { capability: "unique_human", kind: "capability" },
          ],
          kind: "set",
          mode: "any",
        },
      },
      status: "verification_required",
    } as JoinEligibility;
    expect(requiresPostAltchaProofForNonMember({
      eligibility,
      hasCommunityPostingRole: false,
      requirements: [{ gate_type: "altcha_pow" }, { gate_type: "unique_human" }],
    })).toBe(true);
  });

  test("allows the create request with either membership or a solved open PoW path", () => {
    expect(canSendCreatePostRequest({
      canPost: true,
      hasCommunityPostingRole: false,
      hasOpenPowPostingAccess: true,
      isAlreadyJoined: false,
    })).toBe(true);
  });

  test("treats a solved post proof-of-work as enough to submit without membership", () => {
    expect(canSubmitPostWithProofOfWork({
      postAltchaPayload: "pow-proof",
      postAltchaRequired: true,
    })).toBe(true);
  });

  test("does not submit before the required post proof-of-work is solved", () => {
    expect(canSubmitPostWithProofOfWork({
      postAltchaPayload: null,
      postAltchaRequired: true,
    })).toBe(false);
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
