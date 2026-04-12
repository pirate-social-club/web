import type {
  PirateApiGlobalHandleAvailability,
  PirateApiRedditVerification,
} from "@/lib/pirate-api";

export function normalizePirateHandleLabel(label: string): string {
  return label.trim().replace(/\.pirate$/u, "");
}

export function getDefaultOnboardingPhase(input: {
  generatedHandleAssigned: boolean;
  redditVerificationStatus: "not_started" | "pending" | "verified" | "failed";
}): "reddit" | "username" | "communities" {
  if (input.redditVerificationStatus !== "verified") {
    return "reddit";
  }

  if (input.generatedHandleAssigned) {
    return "username";
  }

  return "communities";
}

export function describeHandleAvailability(
  status: PirateApiGlobalHandleAvailability["status"] | "manual_review",
): string {
  switch (status) {
    case "available":
      return "is available";
    case "taken":
      return "is taken";
    case "reserved":
      return "is reserved";
    case "invalid":
      return "is not valid";
    case "manual_review":
      return "requires review";
  }
}

export function mapRedditVerificationUiState(input: {
  onboardingStatus: "not_started" | "pending" | "verified" | "failed";
  verification: PirateApiRedditVerification | null;
}): "not_started" | "code_ready" | "checking" | "verified" | "failed" | "rate_limited" {
  if (input.verification?.status === "verified" || input.onboardingStatus === "verified") {
    return "verified";
  }

  if (input.verification?.status === "failed") {
    return input.verification.failure_code === "rate_limited" ? "rate_limited" : "failed";
  }

  if (input.verification?.status === "pending") {
    return input.verification.verification_hint ? "code_ready" : "checking";
  }

  if (input.onboardingStatus === "pending") {
    return "not_started";
  }

  return input.onboardingStatus === "failed" ? "failed" : "not_started";
}

export function describeRedditVerificationFailure(
  verification: PirateApiRedditVerification | null,
): string | undefined {
  switch (verification?.failure_code) {
    case "code_not_found":
      return "Code not found on Reddit yet. Update your profile, then retry.";
    case "username_not_found":
      return "That Reddit username could not be found.";
    case "rate_limited":
      return "Too many Reddit checks. Wait a moment, then retry.";
    case "source_error":
      return "Reddit verification is temporarily unavailable.";
    default:
      return undefined;
  }
}
