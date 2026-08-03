import { describe, expect, test } from "bun:test";
import type { JoinEligibility } from "@pirate/api-contracts";

import { resolvePublicCommunityJoinActionLabel } from "./public-community-route";

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
