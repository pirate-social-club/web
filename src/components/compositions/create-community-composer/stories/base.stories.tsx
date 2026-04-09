import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { CreateCommunityComposer } from "../create-community-composer";
import type { CreateCommunityComposerProps } from "../create-community-composer.types";

const baseComposer: CreateCommunityComposerProps = {
  displayName: "American Voices",
  description:
    "A national-interest community where verified context matters, but moderation still needs a safe anonymous layer.",
  membershipMode: "open",
  defaultAgeGatePolicy: "none",
  allowAnonymousIdentity: true,
  namespace: {
    family: "hns",
    externalRoot: ".american",
    importStatus: "verified",
    ownerLabel: "0x83c4...f91a",
    hnsDelegationMode: "pirate_managed",
    expiryDaysRemaining: 247,
    pirateDnsDetected: true,
  },
  handlePolicy: {
    policyTemplate: "standard",
    pricingModel: "free",
    membershipRequiredForClaim: true,
  },
  creatorVerificationState: {
    uniqueHumanVerified: true,
    ageOver18Verified: true,
  },
};

const emptyNamespace: CreateCommunityComposerProps["namespace"] = {
  family: "hns",
  externalRoot: "",
  importStatus: "not_imported",
  ownerLabel: "",
  hnsDelegationMode: "owner_managed",
  spacesHandleMode: "owner_managed",
};

const meta = {
  title: "Compositions/CreateCommunityComposer",
  component: CreateCommunityComposer,
  args: baseComposer,
  decorators: [
    (Story: () => React.ReactNode) => (
      <div style={{ width: "min(100vw - 32px, 980px)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CreateCommunityComposer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "Flow / Default",
  render: () => <CreateCommunityComposer {...baseComposer} namespace={emptyNamespace} />,
};

export const PublicOnly: Story = {
  name: "Flow / Public Only",
  render: () => (
    <CreateCommunityComposer {...baseComposer} allowAnonymousIdentity={false} namespace={emptyNamespace} />
  ),
};

export const SpacesInspected: Story = {
  name: "Coming Soon / Spaces Root",
  render: () => (
    <CreateCommunityComposer
      {...baseComposer}
      namespace={{
        family: "spaces",
        externalRoot: "@american",
        importStatus: "inspected",
        ownerLabel: "anchor proof found",
        signatureChallenge: "pirate-verify-space @american 7f3c21",
      }}
    />
  ),
};

export const SpacesVerificationPending: Story = {
  name: "Coming Soon / Spaces Handles",
  render: () => (
    <CreateCommunityComposer
      {...baseComposer}
      namespace={{
        family: "spaces",
        externalRoot: "@american",
        importStatus: "pending",
        ownerLabel: "live signature pending",
        signatureChallenge: "pirate-verify-space @american 7f3c21",
      }}
    />
  ),
};

export const HnsTxtChallenge: Story = {
  name: "Flow / HNS Record",
  render: () => (
    <CreateCommunityComposer
      {...baseComposer}
      namespace={{
        family: "hns",
        externalRoot: ".american",
        importStatus: "txt_challenge_ready",
        ownerLabel: "",
        expiryDaysRemaining: 247,
        txtChallenge: "pirate-verify=a3f7c9e2",
      }}
    />
  ),
};

export const HnsNearExpiry: Story = {
  name: "Flow / HNS Near Expiry",
  render: () => (
    <CreateCommunityComposer
      {...baseComposer}
      namespace={{
        family: "hns",
        externalRoot: ".american",
        importStatus: "txt_challenge_ready",
        ownerLabel: "",
        expiryDaysRemaining: 45,
        txtChallenge: "pirate-verify=a3f7c9e2",
      }}
    />
  ),
};

export const AdultOnly: Story = {
  name: "Flow / Adult Only",
  render: () => <CreateCommunityComposer {...baseComposer} defaultAgeGatePolicy="18_plus" initialStep={4} />,
};

export const HandlePolicyStep: Story = {
  name: "Flow / Handle Policy Step",
  render: () => <CreateCommunityComposer {...baseComposer} initialStep={3} />,
};

export const ReviewStep: Story = {
  name: "Flow / Review",
  render: () => <CreateCommunityComposer {...baseComposer} initialStep={5} />,
};

export const CreatorNotEligible: Story = {
  name: "Flow / Creator Not Eligible",
  render: () => (
    <CreateCommunityComposer
      {...baseComposer}
      creatorVerificationState={{
        uniqueHumanVerified: false,
        ageOver18Verified: false,
      }}
      namespace={emptyNamespace}
    />
  ),
};

export const AdultOnlyMissingAgeProof: Story = {
  name: "Flow / Adult Only Missing Age Proof",
  render: () => (
    <CreateCommunityComposer
      {...baseComposer}
      defaultAgeGatePolicy="18_plus"
      creatorVerificationState={{
        uniqueHumanVerified: true,
        ageOver18Verified: false,
      }}
      initialStep={4}
    />
  ),
};
