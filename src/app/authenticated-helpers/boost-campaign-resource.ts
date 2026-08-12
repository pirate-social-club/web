import type { RewardCampaign } from "@pirate/api-contracts";

export function blocksNewCampaign(campaign: RewardCampaign | null): boolean {
  return campaign != null && [
    "scheduled",
    "active",
    "paused",
    "operational_hold",
    "exhausted",
  ].includes(campaign.status);
}

export function acceptsCampaignTopUp(campaign: RewardCampaign | null): campaign is RewardCampaign {
  return campaign != null && [
    "funding_quoted",
    "funding_confirming",
    "scheduled",
    "active",
    "exhausted",
  ].includes(campaign.status);
}

export function campaignContributionProblem(campaign: RewardCampaign | null): string {
  if (campaign?.status === "paused") {
    return "This bounty is paused and cannot accept new funding.";
  }
  if (campaign?.status === "operational_hold") {
    return "This bounty is under review and cannot accept new funding.";
  }
  return "This bounty cannot accept new funding in its current state.";
}

export function campaignFundingTxHash(campaign: RewardCampaign | null): string | null {
  return (campaign as (RewardCampaign & { funding_tx_hash?: string | null }) | null)
    ?.funding_tx_hash ?? null;
}

export function campaignPayoutTiers(campaign: RewardCampaign | null): Array<{
  amount_cents: number;
  nationalities: string[];
}> {
  return (campaign as (RewardCampaign & {
    payout_tiers?: Array<{ amount_cents: number; nationalities: string[] }>;
  }) | null)?.payout_tiers ?? [];
}
