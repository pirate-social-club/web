import type { RewardCampaignCapabilities } from "@pirate/api-contracts";

import type { BoostRewardIdentityProvider } from "@/components/compositions/rewards/reward-booster-surfaces";
import { readViteEnv } from "@/lib/vite-env";

export type RewardCampaignCapabilitiesWithProviderChoices = RewardCampaignCapabilities & {
  nationality_payout_tiers?: unknown;
  flat_identity_providers?: unknown;
  nationality_tier_identity_providers?: unknown;
};

export function nationalityTiersPreviewEnabled(): boolean {
  return readViteEnv("VITE_REWARD_NATIONALITY_TIERS_PREVIEW") === "true";
}

export function supportsNationalityTierDraftPreview(capability: unknown): boolean {
  return capability === "draft_only" || capability === "binding_preview" || capability === "enabled";
}

export function rewardIdentityProviderChoices(
  value: unknown,
  fallback: BoostRewardIdentityProvider,
): BoostRewardIdentityProvider[] {
  if (!Array.isArray(value)) return [fallback];
  const providers = value.filter((provider): provider is BoostRewardIdentityProvider => (
    provider === "self" || provider === "zkpassport" || provider === "very"
  ));
  return providers.length > 0 ? [...new Set(providers)] : [fallback];
}
