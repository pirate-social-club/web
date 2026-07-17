import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { StandardRoutePage } from "@/components/compositions/app/page-shell";
import {
  SongStudySurface,
  type SongStudyMultipleChoiceExercise,
} from "@/components/compositions/song-study/song-study-surface";
import { WalletHub } from "@/components/compositions/wallet/wallet-hub/wallet-hub";
import { fiveChainSections, sharedWalletAddress } from "@/components/compositions/wallet/stories/wallet-flow-fixtures";

import {
  CashoutSheet,
  SongRewardOffer,
  StreakRewardEarned,
  VerifyHumanSheet,
  type CashoutSheetState,
  type VerifyHumanSheetState,
} from "../reward-surfaces";
import { rewardAmounts, rewardWallet } from "./reward-flow-fixtures";

const meta = {
  title: "Compositions/Rewards/In Context",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const walletHubProps = {
  claimableSalesCount: 2,
  claimableWipWei: "12450000000000000000",
  chainSections: fiveChainSections,
  onReceive: () => undefined,
  onSend: () => undefined,
  onViewActivity: () => undefined,
  recentActivity: [
    { id: "act-1", title: "Midnight Waves sold", amount: "+$6.20 WIP", timestamp: "6m" },
    { id: "act-2", title: "Reward claim confirmed", amount: "+$1.00 USDC", timestamp: "1h" },
    { id: "act-3", title: "Basement Session sold", amount: "+$4.00 WIP", timestamp: "2h" },
  ],
  totalBalanceUsd: "$27,912.37",
  walletAddress: sharedWalletAddress,
  walletLabel: "View your money and recent activity.",
};

const studyExercise: SongStudyMultipleChoiceExercise = {
  correctOptionId: "correct",
  id: "line-5-translation-choice",
  lineNumber: 5,
  maxAttempts: 1,
  options: [
    { id: "distractor-1", text: "Corremos antes de que llegue la noche" },
    { id: "correct", text: "Derivamos hacia donde va la corriente" },
    { id: "distractor-2", text: "Esperamos hasta que el viento cambie" },
    { id: "distractor-3", text: "Bailamos mientras sube la marea" },
  ],
  prompt: "We drift where the current goes",
  question: "Choose the best translation.",
};

function RewardsWalletContext({
  cashoutState,
  verifyState,
}: {
  cashoutState?: CashoutSheetState;
  verifyState?: VerifyHumanSheetState;
}) {
  const [cashoutOpen, setCashoutOpen] = React.useState(Boolean(cashoutState));
  const [verifyOpen, setVerifyOpen] = React.useState(Boolean(verifyState));
  const [amount, setAmount] = React.useState(rewardWallet.available);

  return (
    <StandardRoutePage size="rail">
      <div className="flex flex-col gap-5">
        <WalletHub
          {...walletHubProps}
          rewardsSummary={{
            actionLabel: verifyState ? "Verify" : cashoutState === "pending" ? "Pending" : "Claim",
            amountLabel: rewardWallet.balance,
            actionDisabled: cashoutState === "pending",
            onAction: verifyState ? () => setVerifyOpen(true) : () => setCashoutOpen(true),
            pending: cashoutState === "pending",
            supportingLabel: verifyState ? "Verify once to claim." : undefined,
          }}
        />
      </div>
      <CashoutSheet
        amountLabel={amount}
        availableLabel={rewardWallet.available}
        basescanUrl={rewardWallet.basescanUrl}
        minimumCashoutLabel={rewardAmounts.minimumCashout}
        onAmountChange={setAmount}
        onOpenChange={setCashoutOpen}
        open={cashoutOpen}
        recipientLabel={rewardWallet.recipient}
        state={cashoutState ?? "amount-entry"}
        txHashLabel={cashoutState === "pending" || cashoutState === "success" ? rewardWallet.txHash : undefined}
      />
      <VerifyHumanSheet
        onOpenChange={setVerifyOpen}
        onSelectProvider={() => undefined}
        open={verifyOpen}
        state={verifyState ?? "provider-selection"}
      />
    </StandardRoutePage>
  );
}

export const WalletPageClaimReady: Story = {
  name: "Wallet page / Claim ready",
  render: () => <RewardsWalletContext />,
};

export const WalletPageVerifyRequired: Story = {
  name: "Wallet page / Verify required",
  render: () => <RewardsWalletContext verifyState="provider-selection" />,
};

export const WalletPageClaimPending: Story = {
  name: "Wallet page / Claim pending",
  render: () => <RewardsWalletContext cashoutState="pending" />,
};

export const StudyCompletionRewardPending: Story = {
  name: "Study completion / Reward pending",
  render: () => (
    <StandardRoutePage size="rail">
      <div className="flex flex-col gap-4">
        <SongStudySurface
          artistName="The Castaways"
          artworkSrc="https://picsum.photos/seed/pirate-study/160/160"
          onExit={() => undefined}
          onKaraoke={() => undefined}
          onPrimaryAction={() => undefined}
          onStudyAgain={() => undefined}
          rewardSlot={(
            <SongRewardOffer
              amountLabel="$0.40 USDC"
              eligibleActivity="either"
              minScoreBps={7_000}
            />
          )}
          state={{
            correctCount: 3,
            kind: "complete",
            nextReviewLabel: "tomorrow",
            scorePercent: 100,
            streak: {
              currentStreak: 7,
              qualifiedToday: true,
              studyAttemptsToday: 3,
              studyCorrectCount: 3,
              studyTargetCount: 3,
            },
            totalCount: 3,
          }}
          title="Midnight Waves"
        />
        <StreakRewardEarned
          amountLabel={rewardAmounts.daily}
          milestoneLabel="7-day streak"
          state="milestone-bonus"
        />
      </div>
    </StandardRoutePage>
  ),
};

export const StudyQuestionRewardMotivation: Story = {
  name: "Study question / Reward motivation",
  render: () => (
    <StandardRoutePage size="rail">
      <div className="flex flex-col gap-4">
        <StreakRewardEarned amountLabel={rewardAmounts.daily} state="already-earned-today" />
        <SongStudySurface
          artistName="The Castaways"
          artworkSrc="https://picsum.photos/seed/pirate-study/160/160"
          onExit={() => undefined}
          onKaraoke={() => undefined}
          onPrimaryAction={() => undefined}
          onStudyAgain={() => undefined}
          state={{
            attemptNumber: 1,
            exercise: studyExercise,
            kind: "multiple_choice",
          }}
          title="Midnight Waves"
        />
      </div>
    </StandardRoutePage>
  ),
};
