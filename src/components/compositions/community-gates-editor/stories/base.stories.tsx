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

// Note: CommunityGatesEditorPage only supports nationality and gender gate drafts.
// unique_human, age_over_18, and wallet_score gates are valid in v0 but not yet
// configurable through this UI. Add stories for them after extending IdentityGateDraft.
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
      gateDrafts={[{ gateType: "gender", provider: "self", requiredValue: "F" }]}
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
        { gateType: "nationality", provider: "self", requiredValue: "US" },
        { gateType: "gender", provider: "self", requiredValue: "F" },
      ]}
      membershipMode="gated"
      readAccessMode="members_only"
    />
  ),
};
