import * as React from "react";

import type { RewardCampaign } from "@pirate/api-contracts";

import type { BoostEligibleActivity } from "@/components/compositions/rewards/reward-booster-surfaces";
import type {
  SongBountiesSheetProps,
  BountyObjective,
} from "@/components/compositions/rewards/song-bounties-sheet";

import { deriveSongBountyPresentation } from "./song-bounty-presentation";

interface UseSongBountiesControllerInput {
  authenticated: boolean;
  campaign: RewardCampaign | null;
  campaignAcceptsTopUp: boolean;
  campaignResolved: boolean;
  canBrowseBounties: boolean;
  capabilities: { eligible_activities: readonly string[] } | null;
  openBoost: () => void;
  requestAuth: () => void;
  setEligibleActivity: React.Dispatch<React.SetStateAction<BoostEligibleActivity>>;
  thirdPartyBlocked: boolean;
}

export function useSongBountiesController(input: UseSongBountiesControllerInput): {
  bountiesSheetProps: SongBountiesSheetProps;
  openBounties: () => void;
} {
  const [open, setOpen] = React.useState(false);
  const presentation = deriveSongBountyPresentation(input);
  const openBounties = React.useCallback(() => {
    if (!input.authenticated) {
      input.requestAuth();
      return;
    }
    setOpen(true);
  }, [input.authenticated, input.requestAuth]);
  const onSlotAction = React.useCallback((objective: BountyObjective | "either", action: "create" | "fund" | "view") => {
    if (action === "view") return;
    if (objective !== "either" && action === "create") input.setEligibleActivity(objective);
    setOpen(false);
    input.openBoost();
  }, [input.openBoost, input.setEligibleActivity]);
  return {
    bountiesSheetProps: {
      capabilities: presentation.capabilities,
      legacyEither: presentation.legacyEither,
      onOpenChange: setOpen,
      onSlotAction,
      open,
      showTicketPool: false,
      slots: presentation.slots,
    },
    openBounties,
  };
}
