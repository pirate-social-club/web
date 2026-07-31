import { describe, expect, test } from "bun:test";
import type { JoinEligibility } from "@pirate/api-contracts";

import {
  isStudyReadyCommunityPost,
  resolvePublicCommunityJoinActionLabel,
} from "./public-community-route";

describe("resolvePublicCommunityJoinActionLabel", () => {
  test("uses localized default join text before eligibility loads", () => {
    expect(resolvePublicCommunityJoinActionLabel(null, "ar")).toBe("انضم");
  });

  test("uses localized requestable join text", () => {
    const eligibility = { status: "requestable" } as JoinEligibility;

    expect(resolvePublicCommunityJoinActionLabel(eligibility, "ar")).toBe("اطلب الانضمام");
  });

  test("uses localized pending request text", () => {
    const eligibility = { status: "pending_request" } as JoinEligibility;

    expect(resolvePublicCommunityJoinActionLabel(eligibility, "zh")).toBe("申请已提交");
  });
});

describe("isStudyReadyCommunityPost", () => {
  test("selects only songs whose study exercises are ready", () => {
    expect(isStudyReadyCommunityPost({
      post: { post_type: "song" },
      study_capability: { status: "ready" },
    })).toBe(true);
    expect(isStudyReadyCommunityPost({
      post: { post_type: "song" },
      study_capability: { status: "processing" },
    })).toBe(false);
    expect(isStudyReadyCommunityPost({
      post: { post_type: "video" },
      study_capability: { status: "ready" },
    })).toBe(false);
  });
});
