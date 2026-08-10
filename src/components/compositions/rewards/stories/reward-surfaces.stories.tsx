import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { StandardRoutePage } from "@/components/compositions/app/page-shell";
import {
  CashoutSheet,
  RewardQualificationNotice,
  SongRewardOffer,
  VerifyHumanSheet,
} from "../reward-surfaces";

const meta = {
  title: "Compositions/Rewards/Surfaces",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <StandardRoutePage size="rail">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 py-8">{children}</div>
    </StandardRoutePage>
  );
}

export const Offer: Story = {
  render: () => (
    <Frame>
      <SongRewardOffer amountLabel="$1" eligibleActivity="either" minScoreBps={7000} />
    </Frame>
  ),
};

export const QualificationStates: Story = {
  render: () => (
    <Frame>
      <RewardQualificationNotice amountLabel="$1" status="checking" />
      <RewardQualificationNotice amountLabel="$1" expiresAt={Math.floor(Date.now() / 1000) + 6 * 86_400} status="pending_verification" />
      <RewardQualificationNotice amountLabel="$1" status="credited" />
      <RewardQualificationNotice amountLabel="$1" outcomeReason="budget_unavailable" status="unavailable" />
    </Frame>
  ),
};

export const VerificationPending: Story = {
  render: () => (
    <VerifyHumanSheet forceMobile open providers={["self"]} state="pending" />
  ),
};

export const CashoutPending: Story = {
  render: () => (
    <CashoutSheet
      amountLabel="$1"
      forceMobile
      open
      state="signed"
    />
  ),
};
