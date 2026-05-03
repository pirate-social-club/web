import { describe, expect, test } from "bun:test";

import { isOnboardingComplete, resolveOnboardingPhase } from "./onboarding";

describe("onboarding flow state", () => {
  test("always returns null phase since Reddit flow moved to Domains tab", () => {
    expect(resolveOnboardingPhase({
      community_creation_ready: false,
      cleanup_rename_available: true,
      generated_handle_assigned: true,
      missing_requirements: [],
      namespace_verification_status: "not_started",
      reddit_import_status: "not_started",
      reddit_verification_status: "not_started",
      unique_human_verification_status: "not_started",
    })).toBeNull();

    expect(resolveOnboardingPhase({
      community_creation_ready: false,
      cleanup_rename_available: true,
      generated_handle_assigned: true,
      missing_requirements: [],
      namespace_verification_status: "not_started",
      reddit_import_status: "queued",
      reddit_verification_status: "verified",
      unique_human_verification_status: "not_started",
    })).toBeNull();
  });

  test("marks onboarding complete for all users after Reddit flow moved to Domains tab", () => {
    expect(isOnboardingComplete({
      community_creation_ready: true,
      cleanup_rename_available: true,
      generated_handle_assigned: true,
      missing_requirements: [],
      namespace_verification_status: "not_started",
      reddit_import_status: "succeeded",
      reddit_verification_status: "verified",
      unique_human_verification_status: "verified",
    })).toBe(true);

    expect(isOnboardingComplete({
      community_creation_ready: false,
      cleanup_rename_available: true,
      generated_handle_assigned: true,
      missing_requirements: [],
      namespace_verification_status: "not_started",
      reddit_import_status: "not_started",
      reddit_verification_status: "not_started",
      unique_human_verification_status: "not_started",
    })).toBe(true);

    expect(isOnboardingComplete({
      community_creation_ready: true,
      cleanup_rename_available: false,
      generated_handle_assigned: true,
      missing_requirements: [],
      namespace_verification_status: "not_started",
      reddit_import_status: "not_started",
      reddit_verification_status: "not_started",
      unique_human_verification_status: "verified",
    })).toBe(true);

    expect(isOnboardingComplete({
      community_creation_ready: false,
      cleanup_rename_available: true,
      generated_handle_assigned: true,
      missing_requirements: [],
      namespace_verification_status: "not_started",
      onboarding_dismissed_at: Date.parse("2026-04-24T12:00:00.000Z"),
      reddit_import_status: "not_started",
      reddit_verification_status: "not_started",
      unique_human_verification_status: "pending",
    })).toBe(true);
  });
});
