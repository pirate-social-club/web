import { describe, expect, test } from "bun:test";

import { ApiError } from "@/lib/api/client";

import { isMembershipRequiredWriteRejection } from "./membership-write-rejection";

describe("isMembershipRequiredWriteRejection", () => {
  test("accepts the canonical membership_required code", () => {
    expect(isMembershipRequiredWriteRejection(new ApiError(
      "membership_required",
      "Join this community to comment",
      403,
      false,
      { reason: "membership_required", community_id: "com_1" },
    ))).toBe(true);
  });

  test("accepts the legacy eligibility_failed discriminator during rollout", () => {
    expect(isMembershipRequiredWriteRejection(new ApiError(
      "eligibility_failed",
      "Join this community to vote",
      403,
      false,
      { reason: "membership_required" },
    ))).toBe(true);
  });

  test("rejects unrelated eligibility failures and non-API errors", () => {
    expect(isMembershipRequiredWriteRejection(new ApiError(
      "eligibility_failed",
      "Verification required",
      403,
      false,
      { reason: "verification_required" },
    ))).toBe(false);
    expect(isMembershipRequiredWriteRejection(new Error("failed"))).toBe(false);
  });
});
