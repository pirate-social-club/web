import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import {
  BoostCampaignSheet,
  SongRewardPolicySheet,
  type BoostCampaignSheetProps,
} from "../reward-booster-surfaces";

const meta = {
  title: "Compositions/Rewards/Booster",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const base: BoostCampaignSheetProps = {
  budgetDisplayLabel: "$10",
  budgetLabel: "10.00",
  dailyRewardDisplayLabel: "$1.00",
  dailyRewardLabel: "1.00",
  eligibleActivity: "either",
  fundingAmountLabel: "$10",
  open: true,
  rewardCountLabel: "10 rewards",
  state: "compose",
};

export const Setup: Story = {
  render: () => <BoostCampaignSheet {...base} />,
};

export const SetupInvalid: Story = {
  render: () => (
    <BoostCampaignSheet
      {...base}
      budgetDisplayLabel="$0.50"
      budgetLabel="0.50"
      planProblem="The budget must cover at least one reward."
      rewardCountLabel="0 rewards"
    />
  ),
};

export const SetupBusy: Story = {
  render: () => <BoostCampaignSheet {...base} busy />,
};

export const Pay: Story = {
  render: () => <BoostCampaignSheet {...base} state="quote" />,
};

export const PayWalletMismatch: Story = {
  render: () => (
    <BoostCampaignSheet
      {...base}
      onConnectWallet={() => undefined}
      state="quote"
      walletMismatch
      walletMismatchReason="different-wallet"
    />
  ),
};

export const PayWalletMissing: Story = {
  render: () => (
    <BoostCampaignSheet
      {...base}
      onConnectWallet={() => undefined}
      state="quote"
      walletMismatch
      walletMismatchReason="no-wallet"
    />
  ),
};

export const Confirming: Story = {
  render: () => <BoostCampaignSheet {...base} state="confirming" />,
};

export const FundingFailed: Story = {
  render: () => (
    <BoostCampaignSheet
      {...base}
      errorMessage="Switch your wallet to Base Sepolia, then try again. No payment was sent."
      state="failed"
    />
  ),
};

export const FundingReview: Story = {
  render: () => (
    <BoostCampaignSheet
      {...base}
      errorMessage="Funds were received, but the campaign was not activated. Refund or support review is required; do not send again."
      explorerTxUrl="https://sepolia.basescan.org/tx/0x1234"
      state="funding-review"
      supportReference="rfq_01JEXAMPLE"
    />
  ),
};

export const Live: Story = {
  render: () => (
    <BoostCampaignSheet
      {...base}
      endsAtLabel="31 Jul"
      fundedLabel="$10"
      remainingLabel="$7"
      rewardsPaidLabel="$3"
      state="active"
    />
  ),
};

export const OwnerPolicy: Story = {
  render: () => <SongRewardPolicySheet allowThirdPartyRewards open />,
};

export const OwnerPolicyBlocked: Story = {
  render: () => <SongRewardPolicySheet allowThirdPartyRewards={false} open />,
};
