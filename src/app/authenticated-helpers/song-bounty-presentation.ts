import type { RewardCampaign } from "@pirate/api-contracts";

import type {
  BountyObjective,
  LegacyEitherBounty,
  SongBountiesSheetProps,
  SongBountyLifecycleStatus,
  SongBountySlot,
} from "@/components/compositions/rewards/song-bounties-sheet";
import { formatUsdCentsLabel } from "@/lib/formatting/currency";

import { campaignPayoutTiers } from "./boost-campaign-resource";

type CapabilityInput = { eligible_activities: readonly string[] } | null;

interface SongBountyPresentationInput {
  campaign: RewardCampaign | null;
  capabilities: CapabilityInput;
  campaignAcceptsTopUp: boolean;
  campaignResolved: boolean;
  canBrowseBounties: boolean;
  thirdPartyBlocked: boolean;
}

interface SongBountyPresentation {
  capabilities: SongBountiesSheetProps["capabilities"];
  legacyEither?: LegacyEitherBounty;
  slots: SongBountySlot[];
}

function songBountyLifecycleStatus(status: RewardCampaign["status"]): SongBountyLifecycleStatus {
  switch (status) {
    case "draft":
    case "funding_quoted":
    case "funding_confirming":
      return "funding_confirming";
    case "scheduled":
    case "active":
      return "active";
    case "paused":
      return "paused";
    case "operational_hold":
      return "operational_hold";
    case "exhausted":
      return "exhausted";
    case "ended":
    case "canceled":
      return "empty";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

function campaignRewardLabel(campaign: RewardCampaign): string {
  const amounts = [
    campaign.daily_reward_cents,
    ...campaignPayoutTiers(campaign).map((tier) => tier.amount_cents),
  ].filter((amount): amount is number => Number.isFinite(amount) && amount > 0);
  if (amounts.length === 0) return "$0.00 per day";
  const minimum = Math.min(...amounts);
  const maximum = Math.max(...amounts);
  const minimumLabel = formatUsdCentsLabel(minimum) ?? "$0.00";
  const maximumLabel = formatUsdCentsLabel(maximum) ?? minimumLabel;
  return minimum === maximum ? `${minimumLabel} per day` : `${minimumLabel}–${maximumLabel} per day`;
}

export function deriveSongBountyPresentation(input: SongBountyPresentationInput): SongBountyPresentation {
  const { campaign, capabilities } = input;
  const campaignOccupiesSlots = Boolean(campaign && !["ended", "canceled"].includes(campaign.status));
  const campaignStatus = campaign ? songBountyLifecycleStatus(campaign.status) : "empty";
  const canFundCampaign = Boolean(input.canBrowseBounties && input.campaignAcceptsTopUp && !input.thirdPartyBlocked);
  const canCreateObjective = (objective: BountyObjective) => Boolean(
    input.canBrowseBounties
      && !campaignOccupiesSlots
      && capabilities?.eligible_activities.includes(objective),
  );
  const slots = (["study", "karaoke"] as const).map((objective) => {
    if (campaignOccupiesSlots && campaign?.eligible_activity === objective) {
      return {
        canCreate: false,
        canFund: canFundCampaign,
        objective,
        remainingLabel: formatUsdCentsLabel(campaign.remaining_cents) ?? undefined,
        rewardLabel: campaignRewardLabel(campaign),
        status: campaignStatus,
      } satisfies SongBountySlot;
    }
    const canCreate = canCreateObjective(objective);
    const actionDisabledReason = campaignOccupiesSlots && campaign
      ? `A ${campaign.eligible_activity === "either" ? "Study or Karaoke" : campaign.eligible_activity} bounty already occupies this song. A separate ${objective} bounty is not available yet.`
      : !canCreate
        ? `${objective[0].toUpperCase()}${objective.slice(1)} bounties are not eligible for this song right now.`
        : undefined;
    return {
      actionDisabledReason,
      canCreate,
      canFund: false,
      objective,
      status: "empty" as const,
    } satisfies SongBountySlot;
  });
  const legacyEither: LegacyEitherBounty | undefined = campaignOccupiesSlots && campaign?.eligible_activity === "either"
    ? {
        remainingLabel: formatUsdCentsLabel(campaign.remaining_cents) ?? undefined,
        rewardLabel: campaignRewardLabel(campaign),
        status: campaignStatus === "empty" ? "active" : campaignStatus,
      }
    : undefined;
  return {
    capabilities: {
      canCreate: input.canBrowseBounties && !campaignOccupiesSlots,
      canFund: canFundCampaign,
      reason: !input.campaignResolved
        ? "Loading bounties…"
        : !capabilities
          ? "Bounty funding is unavailable right now."
          : input.thirdPartyBlocked
            ? "The song owner is not accepting bounties from other people."
            : undefined,
    },
    legacyEither,
    slots,
  };
}
