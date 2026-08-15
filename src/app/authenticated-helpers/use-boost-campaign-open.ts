"use client";

import * as React from "react";
import type { RewardCampaign, RewardCampaignFundingQuote } from "@pirate/api-contracts";

import type { BoostEligibleActivity } from "@/components/compositions/rewards/reward-booster-surfaces";

import {
  acceptsCampaignTopUp,
  campaignPayoutTiers,
} from "./boost-campaign-resource";
import type {
  BoostFundingWorkflowEvent,
  BoostFundingWorkflowState,
} from "./boost-funding-workflow";

type BountyObjective = "study" | "karaoke";
type BountyCampaignSlots = Record<BountyObjective, RewardCampaign | null>;

interface UseBoostCampaignOpenInput {
  authenticated: boolean;
  campaign: RewardCampaign | null;
  campaignSlots: BountyCampaignSlots;
  createQuote: (existingCampaign?: RewardCampaign | null) => Promise<void>;
  dispatchFundingWorkflow: React.Dispatch<BoostFundingWorkflowEvent>;
  quote: RewardCampaignFundingQuote | null;
  requestAuth: () => void;
  setCampaign: React.Dispatch<React.SetStateAction<RewardCampaign | null>>;
  setEligibleActivity: React.Dispatch<React.SetStateAction<BoostEligibleActivity>>;
  setQuote: React.Dispatch<React.SetStateAction<RewardCampaignFundingQuote | null>>;
  setSheetOpen: React.Dispatch<React.SetStateAction<boolean>>;
  sheetState: BoostFundingWorkflowState["status"];
  tierFundingEnabled: boolean;
  transactionHash: string | null;
}

export function useBoostCampaignOpen({
  authenticated,
  campaign,
  campaignSlots,
  createQuote,
  dispatchFundingWorkflow,
  quote,
  requestAuth,
  setCampaign,
  setEligibleActivity,
  setQuote,
  setSheetOpen,
  sheetState,
  tierFundingEnabled,
  transactionHash,
}: UseBoostCampaignOpenInput) {
  return React.useCallback((objective?: BountyObjective) => {
    if (!authenticated) {
      requestAuth();
      return;
    }
    const targetCampaign = objective ? campaignSlots[objective] : campaign;
    const targetQuote = targetCampaign && quote?.campaign === targetCampaign.id ? quote : null;
    const targetCampaignAcceptsTopUp = acceptsCampaignTopUp(targetCampaign);
    if (quote && !targetQuote) setQuote(null);
    if (objective) {
      setEligibleActivity(objective);
      setCampaign(targetCampaign);
    }
    if (sheetState === "funding-review") {
      // Terminal review is intentionally sticky until an explicit retry is allowed.
    }
    else if (targetQuote && transactionHash && ["confirming", "awaiting-finality"].includes(sheetState)) {
      dispatchFundingWorkflow({ type: "awaiting-finality", transactionHash });
    }
    else if (targetQuote && sheetState === "quote") {
      if (targetQuote.expires_at <= Math.floor(Date.now() / 1_000)) void createQuote(targetCampaign);
      else dispatchFundingWorkflow({ type: "show", status: "quote" });
    }
    else if (targetCampaignAcceptsTopUp) {
      setQuote(null);
      dispatchFundingWorkflow({ type: "show", status: "top_up" });
    }
    else if (campaignPayoutTiers(targetCampaign).length > 0 && !tierFundingEnabled) {
      dispatchFundingWorkflow({ type: "show", status: "draft-preview" });
    }
    else if (campaignPayoutTiers(targetCampaign).length > 0 && !targetQuote) void createQuote(targetCampaign);
    else if (!targetQuote) {
      dispatchFundingWorkflow({ type: "restart" });
    }
    else if (targetQuote.expires_at <= Math.floor(Date.now() / 1_000)) void createQuote(targetCampaign);
    else dispatchFundingWorkflow({ type: "show", status: "quote" });
    setSheetOpen(true);
  }, [
    authenticated,
    campaign,
    campaignSlots,
    createQuote,
    dispatchFundingWorkflow,
    quote,
    requestAuth,
    setCampaign,
    setEligibleActivity,
    setQuote,
    setSheetOpen,
    sheetState,
    tierFundingEnabled,
    transactionHash,
  ]);
}
