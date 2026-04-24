import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import type { MembershipGateSummary } from "@pirate/api-contracts";

import { Button } from "@/components/primitives/button";

import { CommunityInteractionGateModal, type CommunityInteractionGateModalProps } from "../community-interaction-gate-modal";

const selfRequirements: MembershipGateSummary[] = [
  { gate_type: "age_over_18" },
];

const veryRequirements: MembershipGateSummary[] = [
  { gate_type: "unique_human" },
];

const passportRequirements: MembershipGateSummary[] = [
  { gate_type: "wallet_score", minimum_score: 20 },
];

const failedRequirements: MembershipGateSummary[] = [
  { gate_type: "nationality", required_value: "ET" },
  { gate_type: "unique_human" },
];

const meta = {
  title: "Compositions/CommunityInteractionGateModal",
  component: CommunityInteractionGateModal,
  args: {
    description: "Join in Verified Citizens before you vote.",
    onOpenChange: () => {},
    open: true,
    title: "Join to vote",
  },
  decorators: [
    (Story: () => React.ReactNode) => (
      <div className="min-h-[720px] bg-background p-6 text-foreground">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CommunityInteractionGateModal>;

export default meta;

type Story = StoryObj<typeof meta>;

function GateModalStory(props: Omit<CommunityInteractionGateModalProps, "onOpenChange" | "open">) {
  const [open, setOpen] = React.useState(true);

  return (
    <>
      {!open ? <Button onClick={() => setOpen(true)}>Reopen gate</Button> : null}
      <CommunityInteractionGateModal
        {...props}
        onOpenChange={setOpen}
        open={open}
      />
    </>
  );
}

export const JoinableToVote: Story = {
  name: "States / Joinable to vote",
  render: () => (
    <GateModalStory
      description="Join in Verified Citizens before you vote."
      primaryAction={{
        label: "Join in Verified Citizens",
        onClick: () => {},
      }}
      secondaryAction={{
        label: "Close",
        onClick: () => {},
      }}
      title="Join to vote"
    />
  ),
};

export const RequestableToReply: Story = {
  name: "States / Requestable to reply",
  render: () => (
    <GateModalStory
      description="Request to Join in Mods Only before you reply."
      primaryAction={{
        label: "Request to Join in Mods Only",
        onClick: () => {},
      }}
      requirements={[]}
      secondaryAction={{
        label: "Close",
        onClick: () => {},
      }}
      title="Request to Join to reply"
    />
  ),
};

export const VerificationRequiredSelf: Story = {
  name: "States / Verification required Self",
  render: () => (
    <GateModalStory
      description="Self.xyz lets you prove you are over 18 without sharing your name, photo, or document details with anyone."
      hideCloseButtonOnMobile
      hideSecondaryActionOnMobile
      icon="self"
      primaryAction={{
        label: "Verify with ID",
        onClick: () => {},
      }}
      requirements={selfRequirements}
      secondaryAction={{
        label: "Close",
        onClick: () => {},
      }}
      title="Verify to vote"
    />
  ),
};

export const VerificationRequiredVery: Story = {
  name: "States / Verification required Very",
  render: () => (
    <GateModalStory
      description="Use the VeryAI app to scan your palm, then return to Pirate to continue."
      hideCloseButtonOnMobile
      hideSecondaryActionOnMobile
      icon="very"
      primaryAction={{
        label: "Verify with palm scan",
        onClick: () => {},
      }}
      requirements={veryRequirements}
      secondaryAction={{
        label: "Close",
        onClick: () => {},
      }}
      title="Verify to vote"
    />
  ),
};

export const VerificationRequiredPassport: Story = {
  name: "States / Verification required Passport",
  render: () => (
    <GateModalStory
      description="Improve your Passport score, then come back to join."
      hideCloseButtonOnMobile
      hideSecondaryActionOnMobile
      primaryAction={{
        label: "Open Passport",
        onClick: () => {},
      }}
      requirements={passportRequirements}
      secondaryAction={{
        label: "Close",
        onClick: () => {},
      }}
      title="Passport score required"
    />
  ),
};

export const PendingRequest: Story = {
  name: "States / Pending request",
  render: () => (
    <GateModalStory
      description="The moderators will review your request."
      secondaryAction={{
        label: "Close",
        onClick: () => {},
      }}
      title="Request pending"
    />
  ),
};

export const GateFailed: Story = {
  name: "States / Gate failed",
  render: () => (
    <GateModalStory
      description="This community's requirements block you from voting right now."
      primaryAction={{
        label: "Open Verified Citizens",
        onClick: () => {},
      }}
      requirements={failedRequirements}
      secondaryAction={{
        label: "Close",
        onClick: () => {},
      }}
      title="You can't vote here"
    />
  ),
};

export const ReadyAfterVerification: Story = {
  name: "States / Ready after verification",
  render: () => (
    <GateModalStory
      description="You can now vote in Verified Citizens."
      primaryAction={{
        label: "Vote now",
        onClick: () => {},
      }}
      title="Ready"
    />
  ),
};

export const MobileVerificationRequiredSelf: Story = {
  name: "Mobile / Verification required Self",
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <GateModalStory
      description="Self.xyz lets you prove you are over 18 without sharing your name, photo, or document details with anyone."
      hideCloseButtonOnMobile
      hideSecondaryActionOnMobile
      icon="self"
      primaryAction={{
        label: "Verify with ID",
        onClick: () => {},
      }}
      requirements={selfRequirements}
      secondaryAction={{
        label: "Close",
        onClick: () => {},
      }}
      title="Verify to vote"
    />
  ),
};
