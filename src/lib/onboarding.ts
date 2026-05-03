import type { OnboardingStatus } from "@pirate/api-contracts";

export function resolveOnboardingPhase(_status: OnboardingStatus): null {
  return null;
}

export function isOnboardingComplete(_status: OnboardingStatus): boolean {
  return true;
}
