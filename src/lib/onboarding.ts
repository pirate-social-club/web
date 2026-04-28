import type { OnboardingStatus } from "@pirate/api-contracts";

import type { OnboardingPhase } from "@/components/compositions/onboarding/reddit-bootstrap/onboarding-reddit-bootstrap.types";

export function resolveOnboardingPhase(status: OnboardingStatus): OnboardingPhase | null {
  if (status.onboarding_dismissed_at) return null;
  if (!status.cleanup_rename_available) return null;
  if (status.reddit_verification_status !== "verified") return "import_karma";
  if (status.reddit_import_status !== "succeeded") return "import_karma";
  return "choose_name";
}

export function isOnboardingComplete(status: OnboardingStatus): boolean {
  return resolveOnboardingPhase(status) === null;
}
