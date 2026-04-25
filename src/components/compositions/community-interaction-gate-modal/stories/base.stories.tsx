import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import type { MembershipGateSummary } from "@pirate/api-contracts";

import { Button } from "@/components/primitives/button";
import { CommunityJoinRequestModal } from "@/components/compositions/community-join-request-modal/community-join-request-modal";

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
];

const meta = {
  title: "Compositions/CommunityInteractionGateModal",
  component: CommunityInteractionGateModal,
  args: {
    description: "Join Local Transit before you vote.",
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

function RequestableToReplyStory() {
  const [requestOpen, setRequestOpen] = React.useState(true);

  return (
    <>
      {!requestOpen ? <Button onClick={() => setRequestOpen(true)}>Request to Join</Button> : null}
      <CommunityJoinRequestModal
        communityName="Neighborhood Planning"
        onOpenChange={setRequestOpen}
        onSubmit={() => {}}
        open={requestOpen}
      />
    </>
  );
}

export const JoinableToVote: Story = {
  name: "States / Joinable to vote",
  render: () => (
    <GateModalStory
      description="You meet this community's requirements. Join to vote."
      icon="join"
      primaryAction={{
        label: "Join",
        onClick: () => {},
      }}
      requirements={selfRequirements}
      requirementStatuses={["met"]}
      title="Join to Vote"
    />
  ),
};

export const RequestableToReply: Story = {
  name: "States / Requestable to reply",
  render: () => <RequestableToReplyStory />,
};

export const VerificationRequiredSelf: Story = {
  name: "States / Verification required Self",
  render: () => (
    <GateModalStory
      description="Self.xyz lets you prove you are over 18 without sharing your name, photo, or document details with anyone."
      icon="self"
      primaryAction={{
        label: "Verify with ID",
        onClick: () => {},
      }}
      requirements={selfRequirements}
      requirementStatuses={["unmet"]}
      title="Verify to vote"
    />
  ),
};

export const VerificationRequiredVery: Story = {
  name: "States / Verification required Very",
  render: () => (
    <GateModalStory
      description="Scan your palm once with VeryAI to join any community that requires it. The photo is not saved anywhere."
      icon="very"
      primaryAction={{
        label: "Verify with palm scan",
        onClick: () => {},
      }}
      requirements={veryRequirements}
      requirementStatuses={["unmet"]}
      title="Verify to vote"
    />
  ),
};

export const VerificationRequiredPassport: Story = {
  name: "States / Verification required Passport",
  render: () => (
    <GateModalStory
      description="Your wallet needs a score of 20+ to enter this community. Visit app.passport.xyz to improve it."
      icon="passport"
      primaryAction={{
        label: "Open Passport",
        onClick: () => {},
      }}
      requirements={passportRequirements}
      requirementStatuses={["unmet"]}
      title="Passport score required"
    />
  ),
};

export const PendingRequest: Story = {
  name: "States / Pending request",
  render: () => (
    <GateModalStory
      description="The moderators will review your request."
      icon="pending"
      title="Request pending"
    />
  ),
};

export const GateFailed: Story = {
  name: "States / Gate failed",
  render: () => (
    <GateModalStory
      description="Your verified ID does not match this community's requirements."
      icon="blocked"
      requirements={failedRequirements}
      requirementStatuses={["unmet"]}
      title="You can't vote here"
    />
  ),
};

export const ReadyAfterVerification: Story = {
  name: "States / Ready after verification",
  render: () => (
    <GateModalStory
      description="You can now vote in Local Transit."
      icon="ready"
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
      icon="self"
      primaryAction={{
        label: "Verify with ID",
        onClick: () => {},
      }}
      requirements={selfRequirements}
      requirementStatuses={["unmet"]}
      title="Verify to vote"
    />
  ),
};
