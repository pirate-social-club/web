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
  CampaignDailyProgressChip,
  CampaignFundingPanel,
  CampaignPracticeCallout,
  CampaignVerificationSheet,
  RewarderCampaignDashboard,
  RewarderCampaignForm,
  SongCampaignRewardBadge,
  type CampaignFundingState,
  type CampaignVerificationState,
} from "../reward-campaign-surfaces";

const meta = {
  title: "Compositions/Rewards/Campaigns",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const communityAdjustedLevels = [
  {
    countriesHint: "Brazil, Mexico, Turkey +38",
    countriesTitle: "Brazil, Mexico, Turkey, Thailand, Colombia, Argentina, Chile, Peru, South Africa, Malaysia, Vietnam, Egypt, Morocco, and 29 more",
    dailyLabel: "$0.08",
    milestone30Label: "$0.80",
    milestone7Label: "$0.30",
  },
  {
    countriesHint: "India, Philippines, Nigeria +64",
    countriesTitle: "India, Philippines, Nigeria, Indonesia, Pakistan, Bangladesh, Kenya, Ghana, Nepal, Sri Lanka, Uganda, Tanzania, and 55 more",
    dailyLabel: "$0.03",
    milestone30Label: "$0.30",
    milestone7Label: "$0.10",
  },
];

const studyExercise: SongStudyMultipleChoiceExercise = {
  correctOptionId: "correct",
  id: "rewarded-line-choice",
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

function CampaignFrame({ children }: { children: React.ReactNode }) {
  return (
    <StandardRoutePage size="rail">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 py-6">
        {children}
      </div>
    </StandardRoutePage>
  );
}

function VerificationStory({ state }: { state: CampaignVerificationState }) {
  const [open, setOpen] = React.useState(true);
  return (
    <CampaignFrame>
      <CampaignVerificationSheet onOpenChange={setOpen} open={open} state={state} />
    </CampaignFrame>
  );
}

function FundingStory({ state }: { state: CampaignFundingState }) {
  const [open, setOpen] = React.useState(true);
  return (
    <CampaignFrame>
      <CampaignFundingPanel
        amountLabel="$500.00 USDC"
        onOpenChange={setOpen}
        open={open}
        paymentAddressLabel="0x7d9b...42f0"
        state={state}
      />
    </CampaignFrame>
  );
}

export const SongBadgeNoCampaign: Story = {
  name: "Song badge / No campaign",
  render: () => (
    <CampaignFrame>
      <SongCampaignRewardBadge floorRateLabel="$0.10" rangeLabel="$0.10-$1.00" state="no-campaign" />
    </CampaignFrame>
  ),
};

export const SongBadgeUnverifiedRange: Story = {
  name: "Song badge / Unverified range",
  render: () => (
    <CampaignFrame>
      <SongCampaignRewardBadge floorRateLabel="$0.10" rangeLabel="$0.10-$1.00" state="unverified" />
    </CampaignFrame>
  ),
};

export const SongBadgeVerifiedExact: Story = {
  name: "Song badge / Verified exact rate",
  render: () => (
    <CampaignFrame>
      <SongCampaignRewardBadge
        exactRateLabel="$0.40"
        floorRateLabel="$0.10"
        rangeLabel="$0.10-$1.00"
        state="verified"
      />
    </CampaignFrame>
  ),
};

export const SongBadgeBudgetLow: Story = {
  name: "Song badge / Budget nearly exhausted",
  render: () => (
    <CampaignFrame>
      <SongCampaignRewardBadge
        exactRateLabel="$0.40"
        floorRateLabel="$0.10"
        rangeLabel="$0.10-$1.00"
        remainingLabel="$18"
        state="nearly-exhausted"
      />
    </CampaignFrame>
  ),
};

export const SongPracticeContextUnverified: Story = {
  name: "In context / Song practice unverified",
  render: () => (
    <SongStudySurface
      artistName="The Castaways"
      artworkSrc="https://picsum.photos/seed/pirate-rewarded-study/160/160"
      headerAccessory={
        <CampaignDailyProgressChip attemptsToday={6} targetCount={10} />
      }
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
  ),
};

export const SongPracticeContextVerified: Story = {
  name: "In context / Song practice verified",
  render: () => (
    <SongStudySurface
      artistName="The Castaways"
      artworkSrc="https://picsum.photos/seed/pirate-rewarded-study-complete/160/160"
      headerAccessory={
        <CampaignDailyProgressChip attemptsToday={10} qualified targetCount={10} />
      }
      onExit={() => undefined}
      onKaraoke={() => undefined}
      onPrimaryAction={() => undefined}
      onStudyAgain={() => undefined}
      state={{
        correctCount: 3,
        kind: "complete",
        nextReviewLabel: "tomorrow",
        reward: {
          amountLabel: "$1.90",
          detailLabel: "$0.40 today's practice + $1.50 one-time 7-day streak bonus",
          kind: "earned",
        },
        scorePercent: 67,
        streak: {
          currentStreak: 7,
          qualifiedToday: true,
          studyAttemptsToday: 3,
          studyCorrectCount: 2,
          studyTargetCount: 3,
        },
        totalCount: 3,
      }}
      title="Midnight Waves"
    />
  ),
};

export const WalletContextUnverifiedSavedDays: Story = {
  name: "In context / Wallet unverified saved days",
  render: () => (
    <StandardRoutePage size="rail">
      <WalletHub
        chainSections={fiveChainSections}
        claimableSalesCount={2}
        claimableWipWei="12450000000000000000"
        onReceive={() => undefined}
        onSend={() => undefined}
        onViewActivity={() => undefined}
        recentActivity={[
          { id: "act-1", title: "Basement Session sold", amount: "+$4.00 WIP", timestamp: "2h" },
        ]}
        rewardsSummary={{
          actionLabel: "Verify",
          amountLabel: "5 days saved",
          onAction: () => undefined,
          supportingLabel: "Worth $0.50-$5.00 depending on your region — verify to collect",
        }}
        totalBalanceUsd="$27,912.37"
        walletAddress={sharedWalletAddress}
        walletLabel="View your money and recent activity."
      />
    </StandardRoutePage>
  ),
};

export const WalletContextCampaignRewards: Story = {
  name: "In context / Wallet verified rewards",
  render: () => (
    <StandardRoutePage size="rail">
      <WalletHub
        chainSections={fiveChainSections}
        claimableSalesCount={2}
        claimableWipWei="12450000000000000000"
        onReceive={() => undefined}
        onSend={() => undefined}
        onViewActivity={() => undefined}
        recentActivity={[
          { id: "act-1", title: "Midnight Waves practice reward", amount: "+$0.40 USDC", timestamp: "6m" },
          { id: "act-2", title: "Midnight Waves 7-day bonus", amount: "+$1.50 USDC", timestamp: "1h" },
          { id: "act-3", title: "Basement Session sold", amount: "+$4.00 WIP", timestamp: "2h" },
        ]}
        rewardsSummary={{
          actionLabel: "Claim",
          amountLabel: "$3.10",
          onAction: () => undefined,
          supportingLabel: "From 4 practice days and a 7-day bonus",
        }}
        totalBalanceUsd="$27,912.37"
        walletAddress={sharedWalletAddress}
        walletLabel="View your money and recent activity."
      />
    </StandardRoutePage>
  ),
};

export const PracticeVerifyToEarn: Story = {
  name: "Practice / Verify to earn",
  render: () => (
    <CampaignFrame>
      <CampaignPracticeCallout state="verify-to-earn" />
    </CampaignFrame>
  ),
};

export const PracticeRewardPending: Story = {
  name: "Practice / Reward pending",
  render: () => (
    <CampaignFrame>
      <CampaignPracticeCallout amountLabel="$0.40" state="pending-credit" />
    </CampaignFrame>
  ),
};

export const PracticeRewardCredited: Story = {
  name: "Practice / Reward credited",
  render: () => (
    <CampaignFrame>
      <CampaignPracticeCallout amountLabel="$0.40" state="credited" />
    </CampaignFrame>
  ),
};

export const PracticeCapReached: Story = {
  name: "Practice / Cap reached",
  render: () => (
    <CampaignFrame>
      <CampaignPracticeCallout state="cap-reached" />
    </CampaignFrame>
  ),
};

export const PracticeCampaignExhausted: Story = {
  name: "Practice / Campaign exhausted",
  render: () => (
    <CampaignFrame>
      <CampaignPracticeCallout retroDaysLabel="5 saved days" state="exhausted" />
    </CampaignFrame>
  ),
};

export const VerificationProviders: Story = {
  name: "Verification / Providers",
  render: () => <VerificationStory state="providers" />,
};

export const VerificationMissingNationality: Story = {
  name: "Verification / Missing nationality",
  render: () => <VerificationStory state="missing-nationality" />,
};

export const VerificationRetroCredit: Story = {
  name: "Verification / Retro-credit",
  render: () => <VerificationStory state="retro-credit" />,
};

export const VerificationConflict: Story = {
  name: "Verification / Conflict",
  render: () => <VerificationStory state="conflict" />,
};

export const RewarderCreateCampaign: Story = {
  name: "Rewarder / Create campaign",
  render: () => (
    <CampaignFrame>
      <RewarderCampaignForm
        adjustedLevels={communityAdjustedLevels}
        baseDailyValue="$0.20"
        baseMilestone30Value="$2.00"
        baseMilestone7Value="$0.75"
        budgetValue="$500.00"
        durationValue="30 days"
        fundLabel="Fund $500.00 with USDC"
        summaryHint="2,500+ bonuses"
      />
    </CampaignFrame>
  ),
};

export const RewarderCreateCampaignNoRegionalPricing: Story = {
  name: "Rewarder / Create campaign no regional pricing",
  render: () => (
    <CampaignFrame>
      <RewarderCampaignForm
        adjustedLevels={[]}
        baseDailyValue="$0.20"
        baseMilestone30Value="$2.00"
        baseMilestone7Value="$0.75"
        budgetValue="$500.00"
        durationValue="30 days"
        fundLabel="Fund $500.00 with USDC"
        summaryHint="2,500 bonuses"
      />
    </CampaignFrame>
  ),
};

export const FundingQuote: Story = {
  name: "Funding / Quote",
  render: () => <FundingStory state="quote" />,
};

export const FundingWaitingConfirmation: Story = {
  name: "Funding / Waiting confirmation",
  render: () => <FundingStory state="confirming" />,
};

export const FundingConfirmed: Story = {
  name: "Funding / Confirmed",
  render: () => <FundingStory state="confirmed" />,
};

export const RewarderDashboardActive: Story = {
  name: "Rewarder / Dashboard active",
  render: () => (
    <CampaignFrame>
      <RewarderCampaignDashboard creditedLabel="$184.20" remainingLabel="$315.80" statusLabel="Midnight Waves" />
    </CampaignFrame>
  ),
};
