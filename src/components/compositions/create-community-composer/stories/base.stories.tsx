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
  creatorVerificationState: {
    uniqueHumanVerified: true,
    ageOver18Verified: true,
  },
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
  render: () => <CreateCommunityComposer {...baseComposer} />,
};

export const PublicOnly: Story = {
  name: "Flow / Public Only",
  render: () => (
    <CreateCommunityComposer {...baseComposer} allowAnonymousIdentity={false} />
  ),
};

export const AdultOnly: Story = {
  name: "Flow / Adult Only",
  render: () => <CreateCommunityComposer {...baseComposer} defaultAgeGatePolicy="18_plus" initialStep={2} />,
};

export const AccessStep: Story = {
  name: "Flow / Access Step",
  render: () => <CreateCommunityComposer {...baseComposer} initialStep={2} />,
};

export const AccessStepWithDocumentMarkerGate: Story = {
  name: "Flow / Access Step With Document Marker Gate",
  render: () => (
    <CreateCommunityComposer
      {...baseComposer}
      gateDrafts={[{ gateType: "gender", provider: "self", requiredValue: "F" }]}
      initialStep={2}
      membershipMode="gated"
    />
  ),
};

export const ReviewWithMixedIdentityGates: Story = {
  name: "Flow / Review With Mixed Identity Gates",
  render: () => (
    <CreateCommunityComposer
      {...baseComposer}
      gateDrafts={[
        { gateType: "nationality", provider: "self", requiredValue: "US" },
        { gateType: "gender", provider: "self", requiredValue: "F" },
      ]}
      initialStep={3}
      membershipMode="gated"
    />
  ),
};

export const ReviewStep: Story = {
  name: "Flow / Review",
  render: () => <CreateCommunityComposer {...baseComposer} initialStep={3} />,
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
      initialStep={2}
    />
  ),
};
