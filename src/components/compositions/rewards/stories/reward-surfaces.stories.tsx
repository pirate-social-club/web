import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { StandardRoutePage } from "@/components/compositions/app/page-shell";
import { Button } from "@/components/primitives/button";

import {
  CashoutSheet,
  SongRewardBadge,
  SongRewardOffer,
  StreakRewardEarned,
  VerifyHumanSheet,
  WalletRewardsCard,
  type CashoutSheetProps,
  type VerifyHumanSheetProps,
  type WalletRewardsCardProps,
} from "../reward-surfaces";
import { rewardAmounts, rewardWallet } from "./reward-flow-fixtures";

const meta = {
  title: "Compositions/Rewards/Surfaces",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function SurfaceFrame({ children }: { children: React.ReactNode }) {
  return (
    <StandardRoutePage size="rail">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 py-6">
        {children}
      </div>
    </StandardRoutePage>
  );
}

function baseWalletCardArgs(state: WalletRewardsCardProps["state"]): WalletRewardsCardProps {
  return {
    availableLabel: state === "zero" ? "$0.00" : rewardWallet.available,
    balanceLabel: state === "zero" ? "$0.00" : rewardWallet.balance,
    earnedTodayLabel: state === "zero" ? "$0.00" : rewardWallet.earnedToday,
    minimumCashoutLabel: rewardAmounts.minimumCashout,
    pendingAmountLabel: state === "payout-pending" ? rewardWallet.pending : undefined,
    state,
    onCashout: () => {},
    onRetry: () => {},
    onVerify: () => {},
  };
}

function VerifyStory(props: Pick<VerifyHumanSheetProps, "forceMobile" | "state">) {
  const [open, setOpen] = React.useState(true);
  return (
    <SurfaceFrame>
      {!open ? <Button onClick={() => setOpen(true)}>Open verification</Button> : null}
      <VerifyHumanSheet
        forceMobile={props.forceMobile}
        onOpenChange={setOpen}
        onSelectProvider={() => {}}
        open={open}
        state={props.state}
      />
    </SurfaceFrame>
  );
}

function CashoutStory(props: Pick<CashoutSheetProps, "forceMobile" | "state">) {
  const [open, setOpen] = React.useState(true);
  const [amount, setAmount] = React.useState(props.state === "success" ? "$1.00" : rewardWallet.available);

  return (
    <SurfaceFrame>
      {!open ? <Button onClick={() => setOpen(true)}>Open transfer</Button> : null}
      <CashoutSheet
        amountLabel={amount}
        availableLabel={rewardWallet.available}
        basescanUrl={rewardWallet.basescanUrl}
        forceMobile={props.forceMobile}
        minimumCashoutLabel={rewardAmounts.minimumCashout}
        onAmountChange={setAmount}
        onConfirm={() => {}}
        onOpenChange={setOpen}
        open={open}
        recipientLabel={rewardWallet.recipient}
        state={props.state}
        txHashLabel={props.state === "success" || props.state === "pending" ? rewardWallet.txHash : undefined}
      />
    </SurfaceFrame>
  );
}

export const SongRewardBadgeDefault: Story = {
  name: "SongRewardBadge / Earn daily",
  render: () => (
    <SurfaceFrame>
      <div>
        <SongRewardBadge amountLabel={rewardAmounts.daily} />
      </div>
    </SurfaceFrame>
  ),
};

export const SongRewardOfferEither: Story = {
  name: "SongRewardOffer / Study or karaoke",
  render: () => (
    <SurfaceFrame>
      <SongRewardOffer amountLabel="$0.40 USDC" eligibleActivity="either" minScoreBps={7_000} />
    </SurfaceFrame>
  ),
};

export const SongRewardOfferStudy: Story = {
  name: "SongRewardOffer / Study only",
  render: () => (
    <SurfaceFrame>
      <SongRewardOffer amountLabel="$0.40 USDC" eligibleActivity="study" minScoreBps={7_000} />
    </SurfaceFrame>
  ),
};

export const SongRewardOfferKaraoke: Story = {
  name: "SongRewardOffer / Karaoke only",
  render: () => (
    <SurfaceFrame>
      <SongRewardOffer amountLabel="$0.40 USDC" eligibleActivity="karaoke" minScoreBps={8_500} />
    </SurfaceFrame>
  ),
};

export const SongRewardOfferMobile: Story = {
  name: "SongRewardOffer / Mobile",
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <SurfaceFrame>
      <SongRewardOffer amountLabel="$0.40 USDC" eligibleActivity="either" minScoreBps={7_000} />
    </SurfaceFrame>
  ),
};

export const StreakRewardEarnedToday: Story = {
  name: "StreakRewardEarned / Earned today",
  render: () => (
    <SurfaceFrame>
      <StreakRewardEarned amountLabel={rewardAmounts.daily} state="earned-today" />
    </SurfaceFrame>
  ),
};

export const StreakRewardKaraokeEarnedToday: Story = {
  name: "StreakRewardEarned / Karaoke earned today",
  render: () => (
    <SurfaceFrame>
      <StreakRewardEarned activityKind="karaoke" amountLabel={rewardAmounts.daily} state="earned-today" />
    </SurfaceFrame>
  ),
};

export const StreakRewardAlreadyEarned: Story = {
  name: "StreakRewardEarned / Already earned today",
  render: () => (
    <SurfaceFrame>
      <StreakRewardEarned amountLabel={rewardAmounts.daily} state="already-earned-today" />
    </SurfaceFrame>
  ),
};

export const StreakRewardDailyCapReached: Story = {
  name: "StreakRewardEarned / Daily cap reached",
  render: () => (
    <SurfaceFrame>
      <StreakRewardEarned amountLabel={rewardAmounts.dailyCap} state="daily-cap-reached" />
    </SurfaceFrame>
  ),
};

export const StreakRewardMilestoneBonus: Story = {
  name: "StreakRewardEarned / Milestone bonus",
  render: () => (
    <SurfaceFrame>
      <StreakRewardEarned
        amountLabel={rewardAmounts.milestone7}
        milestoneLabel="7-day streak"
        state="milestone-bonus"
      />
    </SurfaceFrame>
  ),
};

export const WalletRewardsZero: Story = {
  name: "WalletRewardsCard / Zero state",
  render: () => (
    <SurfaceFrame>
      <WalletRewardsCard {...baseWalletCardArgs("zero")} />
    </SurfaceFrame>
  ),
};

export const WalletRewardsAccruing: Story = {
  name: "WalletRewardsCard / Accruing",
  render: () => (
    <SurfaceFrame>
      <WalletRewardsCard {...baseWalletCardArgs("accruing")} />
    </SurfaceFrame>
  ),
};

export const WalletRewardsCashoutReady: Story = {
  name: "WalletRewardsCard / Claim ready",
  render: () => (
    <SurfaceFrame>
      <WalletRewardsCard {...baseWalletCardArgs("cashout-ready")} />
    </SurfaceFrame>
  ),
};

export const WalletRewardsVerifyRequired: Story = {
  name: "WalletRewardsCard / Verify required",
  render: () => (
    <SurfaceFrame>
      <WalletRewardsCard {...baseWalletCardArgs("verify-required")} />
    </SurfaceFrame>
  ),
};

export const WalletRewardsPayoutPending: Story = {
  name: "WalletRewardsCard / Payout pending",
  render: () => (
    <SurfaceFrame>
      <WalletRewardsCard {...baseWalletCardArgs("payout-pending")} />
    </SurfaceFrame>
  ),
};

export const WalletRewardsPayoutComplete: Story = {
  name: "WalletRewardsCard / Payout complete",
  render: () => (
    <SurfaceFrame>
      <WalletRewardsCard {...baseWalletCardArgs("payout-complete")} />
    </SurfaceFrame>
  ),
};

export const WalletRewardsError: Story = {
  name: "WalletRewardsCard / Error",
  render: () => (
    <SurfaceFrame>
      <WalletRewardsCard
        {...baseWalletCardArgs("error")}
        errorMessage="The transfer was not confirmed."
      />
    </SurfaceFrame>
  ),
};

export const WalletRewardsMobileCashoutReady: Story = {
  name: "WalletRewardsCard / Mobile claim ready",
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <SurfaceFrame>
      <WalletRewardsCard {...baseWalletCardArgs("cashout-ready")} />
    </SurfaceFrame>
  ),
};

export const VerifyHumanIntro: Story = {
  name: "VerifyHumanSheet / Intro",
  render: () => <VerifyStory state="intro" />,
};

export const VerifyHumanProviders: Story = {
  name: "VerifyHumanSheet / Provider selection",
  render: () => <VerifyStory state="provider-selection" />,
};

export const VerifyHumanPending: Story = {
  name: "VerifyHumanSheet / Pending",
  render: () => <VerifyStory state="pending" />,
};

export const VerifyHumanSuccess: Story = {
  name: "VerifyHumanSheet / Success",
  render: () => <VerifyStory state="success" />,
};

export const VerifyHumanFailure: Story = {
  name: "VerifyHumanSheet / Failure",
  render: () => <VerifyStory state="failure" />,
};

export const VerifyHumanConflict: Story = {
  name: "VerifyHumanSheet / Identity conflict",
  render: () => <VerifyStory state="conflict" />,
};

export const VerifyHumanConflictMobile: Story = {
  name: "VerifyHumanSheet / Mobile identity conflict",
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => <VerifyStory forceMobile state="conflict" />,
};

export const CashoutAmountEntry: Story = {
  name: "RewardClaimSheet / Amount entry",
  render: () => <CashoutStory state="amount-entry" />,
};

export const CashoutConfirm: Story = {
  name: "RewardClaimSheet / Confirm",
  render: () => <CashoutStory state="confirm" />,
};

export const CashoutPending: Story = {
  name: "RewardClaimSheet / Pending",
  render: () => <CashoutStory state="pending" />,
};

export const CashoutSuccess: Story = {
  name: "RewardClaimSheet / Success",
  render: () => <CashoutStory state="success" />,
};

export const CashoutFailure: Story = {
  name: "RewardClaimSheet / Failure",
  render: () => <CashoutStory state="failure" />,
};

export const CashoutMobileAmountEntry: Story = {
  name: "RewardClaimSheet / Mobile amount entry",
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => <CashoutStory forceMobile state="amount-entry" />,
};

export const VerifyAndCashoutMobile: Story = {
  name: "Sheets / Mobile claim verification",
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <VerifyStory forceMobile state="provider-selection" />
  ),
};
