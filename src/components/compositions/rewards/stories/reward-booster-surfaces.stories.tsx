import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { StandardRoutePage } from "@/components/compositions/app/page-shell";
import { Type } from "@/components/primitives/type";
import {
  boostPlanProblemLabel,
  boostRewardCountLabel,
  resolveDailyAccrualPlan,
  type BoostPlanLimits,
} from "@/lib/rewards/boost-plan";
import {
  BoostCampaignSheet,
  BoostEligibilityNotice,
  CampaignStatusCard,
  SongRewardPolicySheet,
  type BoostCampaignSheetProps,
  type BoostEligibleActivity,
  type CampaignStatusCardProps,
} from "../reward-booster-surfaces";

const limits: BoostPlanLimits = { maxBudgetCents: 10_000, maxRewardCents: 500, minBudgetCents: 100 };

const meta = {
  title: "Compositions/Rewards/Booster",
  parameters: { layout: "fullscreen" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function Frame({ children }: { children: React.ReactNode }) {
  return <StandardRoutePage size="rail"><div className="mx-auto flex w-full max-w-3xl flex-col gap-5 py-6">{children}</div></StandardRoutePage>;
}

function BoostStory({ state, walletMismatch = false }: Pick<BoostCampaignSheetProps, "state" | "walletMismatch">) {
  const [open, setOpen] = React.useState(true);
  const [activity, setActivity] = React.useState<BoostEligibleActivity>("karaoke");
  const [dailyReward, setDailyReward] = React.useState("1.00");
  const [budget, setBudget] = React.useState("10.00");
  const plan = resolveDailyAccrualPlan(dailyReward, budget, limits);
  return (
    <Frame>
      <BoostCampaignSheet
        budgetLabel={budget}
        budgetPresets={["5.00", "10.00", "25.00"]}
        chainLabel="Base Sepolia"
        dailyRewardLabel={dailyReward}
        eligibleActivity={activity}
        explorerTxUrl="https://sepolia.basescan.org/tx/0x1234"
        expiresInLabel="14:32"
        fundingAmountLabel="$10.00"
        onBudgetChange={setBudget}
        onConfirm={() => undefined}
        onDailyRewardChange={setDailyReward}
        onEligibleActivityChange={setActivity}
        onOpenChange={setOpen}
        onRefresh={() => undefined}
        onRetry={() => undefined}
        open={open}
        planProblem={plan.problem ? boostPlanProblemLabel(plan.problem, limits) : undefined}
        rewardCountLabel={plan.rewardCount == null ? "—" : boostRewardCountLabel(plan.rewardCount)}
        senderAddressLabel="0xCc4049…17b928"
        state={state}
        supportReference="rfq_01JZSUPPORT"
        treasuryAddress="0x1234567890abcdef1234567890abcdef12345678"
        walletMismatch={walletMismatch}
      />
    </Frame>
  );
}

function statusProps(state: CampaignStatusCardProps["state"]): CampaignStatusCardProps {
  return {
    budgetLabel: "$10.00",
    dailyRewardLabel: "$1.00",
    endsAtLabel: "August 17, 2026",
    onViewDetails: () => undefined,
    remainingLabel: state === "exhausted" ? "$0.00" : "$7.00",
    rewardsPaidLabel: state === "exhausted" ? "10" : "3",
    spentLabel: state === "exhausted" ? "$10.00" : "$3.00",
    state,
  };
}

export const Compose: Story = { render: () => <BoostStory state="compose" /> };
export const Preparing: Story = { render: () => <BoostStory state="preparing" /> };
export const FundingQuote: Story = { render: () => <BoostStory state="quote" /> };
export const WrongWallet: Story = { render: () => <BoostStory state="quote" walletMismatch /> };
export const Confirming: Story = { render: () => <BoostStory state="confirming" /> };
export const Active: Story = { render: () => <BoostStory state="active" /> };
export const Failed: Story = { render: () => <BoostStory state="failed" /> };
export const FundingReview: Story = { render: () => <BoostStory state="funding-review" /> };

export const Lifecycle: Story = {
  render: () => <Frame>{(["scheduled", "active", "paused", "operational-hold", "exhausted", "ended", "canceled"] as const).map((state) => <CampaignStatusCard key={state} {...statusProps(state)} />)}</Frame>,
};

export const OwnerPolicy: Story = {
  render: () => <Frame><SongRewardPolicySheet allowThirdPartyRewards onAllowThirdPartyRewardsChange={() => undefined} onOpenChange={() => undefined} open /></Frame>,
};

export const BlockedStates: Story = {
  render: () => <Frame>
    <Type as="h2" variant="h3">Boost unavailable</Type>
    <BoostEligibilityNotice reason="owner-opted-out" />
    <BoostEligibilityNotice reason="campaign-exists" />
    <BoostEligibilityNotice onRetry={() => undefined} reason="rate-limited" retryInLabel="5 minutes" />
  </Frame>,
};
