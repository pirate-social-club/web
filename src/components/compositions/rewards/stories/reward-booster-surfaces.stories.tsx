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

export const Pay: Story = {
  render: () => <BoostCampaignSheet {...base} state="quote" />,
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
