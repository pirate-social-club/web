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
  campaigns?: Partial<Record<BountyObjective, RewardCampaign | null>>;
  capabilities: CapabilityInput;
  campaignAcceptsTopUp: boolean;
  campaignAcceptsTopUpByObjective?: Partial<Record<BountyObjective, boolean>>;
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
  const campaignForObjective = (objective: BountyObjective): RewardCampaign | null => {
    const slotCampaign = input.campaigns?.[objective];
    if (slotCampaign !== undefined) return slotCampaign;
    return campaign?.eligible_activity === objective || campaign?.eligible_activity === "either" ? campaign : null;
  };
  const canFundCampaign = Boolean(input.canBrowseBounties && !input.thirdPartyBlocked && (
    input.campaignAcceptsTopUp
      || Object.values(input.campaignAcceptsTopUpByObjective ?? {}).some(Boolean)
  ));
  const canCreateObjective = (objective: BountyObjective) => Boolean(
    input.canBrowseBounties
      && !campaignForObjective(objective)
      && capabilities?.eligible_activities.includes(objective),
  );
  const slots = (["study", "karaoke"] as const).map((objective) => {
    const objectiveCampaign = campaignForObjective(objective);
    const campaignOccupiesSlot = Boolean(objectiveCampaign && !["ended", "canceled"].includes(objectiveCampaign.status));
    const campaignStatus = objectiveCampaign ? songBountyLifecycleStatus(objectiveCampaign.status) : "empty";
    const objectiveCanFund = input.campaignAcceptsTopUpByObjective?.[objective] ?? input.campaignAcceptsTopUp;
    if (campaignOccupiesSlot && objectiveCampaign) {
      return {
        canCreate: false,
        canFund: Boolean(input.canBrowseBounties && objectiveCanFund && !input.thirdPartyBlocked),
        objective,
        remainingLabel: formatUsdCentsLabel(objectiveCampaign.remaining_cents) ?? undefined,
        rewardLabel: campaignRewardLabel(objectiveCampaign),
        status: campaignStatus,
      } satisfies SongBountySlot;
    }
    const canCreate = canCreateObjective(objective);
    const occupiedObjective = (["study", "karaoke"] as const).find((candidate) => {
      const candidateCampaign = campaignForObjective(candidate);
      return Boolean(candidateCampaign && !["ended", "canceled"].includes(candidateCampaign.status));
    });
    const actionDisabledReason = occupiedObjective
      ? `A ${occupiedObjective} bounty already occupies this song. A separate ${objective} bounty is not available yet.`
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
  const legacyCampaign = [input.campaigns?.study, input.campaigns?.karaoke, campaign]
    .find((candidate): candidate is RewardCampaign => Boolean(candidate?.eligible_activity === "either"));
  const legacyEither: LegacyEitherBounty | undefined = legacyCampaign
    ? {
        remainingLabel: formatUsdCentsLabel(legacyCampaign.remaining_cents) ?? undefined,
        rewardLabel: campaignRewardLabel(legacyCampaign),
        status: songBountyLifecycleStatus(legacyCampaign.status) === "empty" ? "active" : songBountyLifecycleStatus(legacyCampaign.status),
      }
    : undefined;
  return {
    capabilities: {
      canCreate: input.canBrowseBounties && slots.some((slot) => slot.canCreate),
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
