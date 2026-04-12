import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  describeHandleAvailability,
  describeRedditVerificationFailure,
  getDefaultOnboardingPhase,
  mapRedditVerificationUiState,
  normalizePirateHandleLabel,
} from "./onboarding-flow";

describe("onboarding-flow", () => {
  test("routes verified users with generated handles to username", () => {
    assert.equal(getDefaultOnboardingPhase({
      generatedHandleAssigned: true,
      redditVerificationStatus: "verified",
    }), "username");
  });

  test("routes verified users with claimed handles to communities", () => {
    assert.equal(getDefaultOnboardingPhase({
      generatedHandleAssigned: false,
      redditVerificationStatus: "verified",
    }), "communities");
  });

  test("keeps unverified users on reddit", () => {
    assert.equal(getDefaultOnboardingPhase({
      generatedHandleAssigned: true,
      redditVerificationStatus: "pending",
    }), "reddit");
  });

  test("maps pending verification with a hint to code_ready", () => {
    assert.equal(mapRedditVerificationUiState({
      onboardingStatus: "pending",
      verification: {
        reddit_username: "technohippie",
        status: "pending",
        verification_hint: "Add `pirate-verification=abc` to your profile.",
      },
    }), "code_ready");
  });

  test("maps rate limited verification to rate_limited", () => {
    assert.equal(mapRedditVerificationUiState({
      onboardingStatus: "failed",
      verification: {
        reddit_username: "technohippie",
        status: "failed",
        failure_code: "rate_limited",
      },
    }), "rate_limited");
  });

  test("treats summary-only pending state as not_started for a fresh session", () => {
    assert.equal(mapRedditVerificationUiState({
      onboardingStatus: "pending",
      verification: null,
    }), "not_started");
  });

  test("normalizes pirate handles", () => {
    assert.equal(normalizePirateHandleLabel(" TechnoHippie.pirate "), "TechnoHippie");
  });

  test("describes handle availability states", () => {
    assert.equal(describeHandleAvailability("taken"), "is taken");
    assert.equal(describeHandleAvailability("manual_review"), "requires review");
  });

  test("describes reddit verification failures", () => {
    assert.equal(describeRedditVerificationFailure({
      reddit_username: "technohippie",
      status: "failed",
      failure_code: "code_not_found",
    }), "Code not found on Reddit yet. Update your profile, then retry.");
  });
});
