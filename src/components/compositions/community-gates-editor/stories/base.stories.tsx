import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { CommunityGatesEditorPage } from "@/components/compositions/community-gates-editor/community-gates-editor-page";
import type {
  AnonymousIdentityScope,
  CommunityDefaultAgeGatePolicy,
  CommunityMembershipMode,
  CommunityReadAccessMode,
  IdentityGateDraft,
} from "@/components/compositions/create-community-composer/create-community-composer.types";

// Note: CommunityGatesEditorPage supports nationality, Passport score,
// Ethereum ERC-721, and Courtyard inventory-match gates. unique_human and
// age_over_18 gates are valid in v0 but not yet configurable through this UI.
const meta = {
  title: "Compositions/Moderation/Gates",
  component: CommunityGatesEditorPage,
  args: {
    allowAnonymousIdentity: true,
    anonymousIdentityScope: "community_stable",
    defaultAgeGatePolicy: "18_plus",
    gateDrafts: [],
    membershipMode: "open",
    readAccessMode: "public",
  },
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof CommunityGatesEditorPage>;

export default meta;

type Story = StoryObj<typeof meta>;

function InteractiveCommunityGatesEditorPage({
  allowAnonymousIdentity: initialAllowAnonymousIdentity,
  anonymousIdentityScope: initialAnonymousIdentityScope,
  defaultAgeGatePolicy: initialDefaultAgeGatePolicy,
  gateDrafts: initialGateDrafts,
  membershipMode: initialMembershipMode,
  readAccessMode: initialReadAccessMode,
}: {
  allowAnonymousIdentity: boolean;
  anonymousIdentityScope: AnonymousIdentityScope;
  defaultAgeGatePolicy: CommunityDefaultAgeGatePolicy;
  gateDrafts: IdentityGateDraft[];
  membershipMode: CommunityMembershipMode;
  readAccessMode: CommunityReadAccessMode;
}) {
  const [allowAnonymousIdentity, setAllowAnonymousIdentity] = React.useState(initialAllowAnonymousIdentity);
  const [anonymousIdentityScope, setAnonymousIdentityScope] = React.useState(initialAnonymousIdentityScope);
  const [defaultAgeGatePolicy, setDefaultAgeGatePolicy] = React.useState(initialDefaultAgeGatePolicy);
  const [gateDrafts, setGateDrafts] = React.useState(initialGateDrafts);
  const [membershipMode, setMembershipMode] = React.useState(initialMembershipMode);
  const [readAccessMode, setReadAccessMode] = React.useState(initialReadAccessMode);

  return (
    <CommunityGatesEditorPage
      allowAnonymousIdentity={allowAnonymousIdentity}
      anonymousIdentityScope={anonymousIdentityScope}
      defaultAgeGatePolicy={defaultAgeGatePolicy}
      gateDrafts={gateDrafts}
      membershipMode={membershipMode}
      onAllowAnonymousIdentityChange={setAllowAnonymousIdentity}
      onAnonymousIdentityScopeChange={setAnonymousIdentityScope}
      onDefaultAgeGatePolicyChange={setDefaultAgeGatePolicy}
      onGateDraftsChange={setGateDrafts}
      onMembershipModeChange={setMembershipMode}
      onReadAccessModeChange={setReadAccessMode}
      onSave={() => undefined}
      readAccessMode={readAccessMode}
    />
  );
}

export const Default: Story = {
  render: () => (
    <InteractiveCommunityGatesEditorPage
      allowAnonymousIdentity
      anonymousIdentityScope="community_stable"
      defaultAgeGatePolicy="18_plus"
      gateDrafts={[]}
      membershipMode="gated"
      readAccessMode="public"
    />
  ),
};

export const MembersOnly: Story = {
  render: () => (
    <InteractiveCommunityGatesEditorPage
      allowAnonymousIdentity
      anonymousIdentityScope="community_stable"
      defaultAgeGatePolicy="none"
      gateDrafts={[]}
      membershipMode="request"
      readAccessMode="members_only"
    />
  ),
};

export const RestrictedReading: Story = {
  render: () => (
    <InteractiveCommunityGatesEditorPage
      allowAnonymousIdentity
      anonymousIdentityScope="thread_stable"
      defaultAgeGatePolicy="18_plus"
      gateDrafts={[
        { gateType: "nationality", provider: "self", requiredValues: ["USA"] },
      ]}
      membershipMode="gated"
      readAccessMode="members_only"
    />
  ),
};

export const EthereumNftGate: Story = {
  render: () => (
    <InteractiveCommunityGatesEditorPage
      allowAnonymousIdentity
      anonymousIdentityScope="community_stable"
      defaultAgeGatePolicy="none"
      gateDrafts={[{
        gateType: "erc721_holding",
        chainNamespace: "eip155:1",
        contractAddress: "0x1111111111111111111111111111111111111111",
      }]}
      membershipMode="gated"
      readAccessMode="public"
    />
  ),
};
