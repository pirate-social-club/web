import { describe, expect, test } from "bun:test";

import { isOnboardingComplete, resolveOnboardingPhase } from "./onboarding";

describe("onboarding flow state", () => {
  test("stays on import karma until Reddit verification and import succeed", () => {
    expect(resolveOnboardingPhase({
      community_creation_ready: false,
      cleanup_rename_available: true,
      generated_handle_assigned: true,
      missing_requirements: [],
      namespace_verification_status: "not_started",
      reddit_import_status: "not_started",
      reddit_verification_status: "not_started",
      unique_human_verification_status: "not_started",
    })).toBe("import_karma");

    expect(resolveOnboardingPhase({
      community_creation_ready: false,
      cleanup_rename_available: true,
      generated_handle_assigned: true,
      missing_requirements: [],
      namespace_verification_status: "not_started",
      reddit_import_status: "queued",
      reddit_verification_status: "verified",
      unique_human_verification_status: "not_started",
    })).toBe("import_karma");
  });

  test("stays on choose name while cleanup rename is still available", () => {
    expect(resolveOnboardingPhase({
      community_creation_ready: true,
      cleanup_rename_available: true,
      generated_handle_assigned: true,
      missing_requirements: [],
      namespace_verification_status: "not_started",
      reddit_import_status: "succeeded",
      reddit_verification_status: "verified",
      unique_human_verification_status: "verified",
    })).toBe("choose_name");
  });

  test("marks onboarding complete after rename is consumed even if Reddit import was skipped", () => {
    const status = {
      community_creation_ready: true,
      cleanup_rename_available: false,
      generated_handle_assigned: true,
      missing_requirements: [],
      namespace_verification_status: "not_started" as const,
      reddit_import_status: "not_started" as const,
      reddit_verification_status: "not_started" as const,
      unique_human_verification_status: "verified" as const,
    };

    expect(resolveOnboardingPhase(status)).toBeNull();
    expect(isOnboardingComplete(status)).toBe(true);
  });

  test("marks onboarding complete when the user dismisses without consuming cleanup rename", () => {
    const status = {
      community_creation_ready: true,
      cleanup_rename_available: true,
      generated_handle_assigned: true,
      missing_requirements: [],
      namespace_verification_status: "not_started" as const,
      onboarding_dismissed_at: "2026-04-24T12:00:00.000Z",
      reddit_import_status: "not_started" as const,
      reddit_verification_status: "not_started" as const,
      unique_human_verification_status: "verified" as const,
    };

    expect(resolveOnboardingPhase(status)).toBeNull();
    expect(isOnboardingComplete(status)).toBe(true);
  });
});
