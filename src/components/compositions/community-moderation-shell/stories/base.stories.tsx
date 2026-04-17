import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { Gavel, Lock, SealCheck, Shield } from "@phosphor-icons/react";

import { CommunityGatesEditorPage } from "@/components/compositions/community-gates-editor/community-gates-editor-page";
import { CommunityModerationShell } from "@/components/compositions/community-moderation-shell/community-moderation-shell";
import { CommunityNamespaceVerificationPage } from "@/components/compositions/community-namespace-verification-page/community-namespace-verification-page";
import {
  CommunitySafetyPage,
  createDefaultCommunitySafetyAdultContentPolicy,
  createDefaultCommunitySafetyCivilityPolicy,
  createDefaultCommunitySafetyGraphicContentPolicy,
  createDefaultCommunitySafetyProviderSettings,
} from "@/components/compositions/community-safety-page/community-safety-page";
import type { IdentityGateDraft } from "@/components/compositions/create-community-composer/create-community-composer.types";
import { CommunityRulesEditorPage } from "@/components/compositions/community-rules-editor/community-rules-editor-page";
import {
  mockNamespaceCallbacks,
  moderationStoryCommunityAvatar,
  moderationStoryCommunityLabel,
} from "./story-fixtures";

function ModerationShellStory({
  initialAllowAnonymousIdentity = true,
  initialAnonymousIdentityScope = "community_stable",
  initialDefaultAgeGatePolicy = "none",
  initialDescription,
  initialGateDrafts = [],
  initialMembershipMode = "open",
  initialReportReason,
  initialRuleName,
  initialView = "rules",
}: {
  initialAllowAnonymousIdentity?: boolean;
  initialAnonymousIdentityScope?: "community_stable" | "thread_stable" | "post_ephemeral";
  initialDefaultAgeGatePolicy?: "none" | "18_plus";
  initialDescription: string;
  initialGateDrafts?: IdentityGateDraft[];
  initialMembershipMode?: "open" | "request" | "gated";
  initialReportReason: string;
  initialRuleName: string;
  initialView?: "rules" | "gates" | "safety" | "namespace";
}) {
  const [ruleName, setRuleName] = React.useState(initialRuleName);
  const [description, setDescription] = React.useState(initialDescription);
  const [reportReason, setReportReason] = React.useState(initialReportReason);
  const [membershipMode, setMembershipMode] =
    React.useState<"open" | "request" | "gated">(initialMembershipMode);
  const [defaultAgeGatePolicy, setDefaultAgeGatePolicy] =
    React.useState<"none" | "18_plus">(initialDefaultAgeGatePolicy);
  const [allowAnonymousIdentity, setAllowAnonymousIdentity] =
    React.useState(initialAllowAnonymousIdentity);
  const [anonymousIdentityScope, setAnonymousIdentityScope] =
    React.useState<"community_stable" | "thread_stable" | "post_ephemeral">(initialAnonymousIdentityScope);
  const [gateDrafts, setGateDrafts] = React.useState<IdentityGateDraft[]>(initialGateDrafts);
  const [activeView, setActiveView] =
    React.useState<"rules" | "gates" | "safety" | "namespace">(initialView);
  const [providerSettings, setProviderSettings] = React.useState(
    createDefaultCommunitySafetyProviderSettings(),
  );
  const [adultContentPolicy, setAdultContentPolicy] = React.useState(
    createDefaultCommunitySafetyAdultContentPolicy(),
  );
  const [graphicContentPolicy, setGraphicContentPolicy] = React.useState(
    createDefaultCommunitySafetyGraphicContentPolicy(),
  );
  const [civilityPolicy, setCivilityPolicy] = React.useState(
    createDefaultCommunitySafetyCivilityPolicy(),
  );

  return (
    <CommunityModerationShell
      communityAvatarSrc={moderationStoryCommunityAvatar}
      communityLabel={moderationStoryCommunityLabel}
      sections={[{
        label: "Moderation",
        items: [
          { active: activeView === "rules", icon: Gavel, label: "Rules", onSelect: () => setActiveView("rules") },
          { active: activeView === "gates", icon: Lock, label: "Gates", onSelect: () => setActiveView("gates") },
          { active: activeView === "safety", icon: Shield, label: "Safety", onSelect: () => setActiveView("safety") },
          { active: activeView === "namespace", icon: SealCheck, label: "Namespace", onSelect: () => setActiveView("namespace") },
        ],
      }]}
    >
      {activeView === "rules" ? (
        <CommunityRulesEditorPage
          description={description}
          onDescriptionChange={setDescription}
          onReportReasonChange={setReportReason}
          onRuleNameChange={setRuleName}
          reportReason={reportReason}
          ruleName={ruleName}
          saveDisabled={!ruleName.trim() || !description.trim()}
        />
      ) : activeView === "gates" ? (
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
          saveDisabled={membershipMode === "gated" && gateDrafts.length === 0}
        />
      ) : activeView === "safety" ? (
        <CommunitySafetyPage
          adultContentPolicy={adultContentPolicy}
          civilityPolicy={civilityPolicy}
          graphicContentPolicy={graphicContentPolicy}
          onAdultContentPolicyChange={setAdultContentPolicy}
          onCivilityPolicyChange={setCivilityPolicy}
          onGraphicContentPolicyChange={setGraphicContentPolicy}
          onProviderSettingsChange={setProviderSettings}
          providerSettings={providerSettings}
        />
      ) : (
        <CommunityNamespaceVerificationPage
          callbacks={mockNamespaceCallbacks}
          initialRootLabel="infinity"
        />
      )}
    </CommunityModerationShell>
  );
}

const meta = {
  title: "Compositions/Moderation/Shell",
  component: CommunityModerationShell,
  args: {
    children: null,
    communityLabel: moderationStoryCommunityLabel,
  },
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof CommunityModerationShell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Rules: Story = {
  render: () => (
    <ModerationShellStory
      initialDescription="No harassment, hate speech, or toxic behavior. Treat all contributors and members with kindness."
      initialReportReason="Respect others and be civil"
      initialRuleName="Respect others and be civil"
    />
  ),
};

export const Blank: Story = {
  render: () => (
    <ModerationShellStory
      initialDescription=""
      initialReportReason=""
      initialRuleName=""
    />
  ),
};

export const Gates: Story = {
  render: () => (
    <ModerationShellStory
      initialAllowAnonymousIdentity
      initialAnonymousIdentityScope="community_stable"
      initialDefaultAgeGatePolicy="18_plus"
      initialDescription="No harassment, hate speech, or toxic behavior. Treat all contributors and members with kindness."
      initialGateDrafts={[{ gateType: "gender", provider: "self", requiredValue: "F" }]}
      initialMembershipMode="gated"
      initialReportReason="Respect others and be civil"
      initialRuleName="Respect others and be civil"
      initialView="gates"
    />
  ),
};

export const Safety: Story = {
  render: () => (
    <ModerationShellStory
      initialDescription="No harassment, hate speech, or toxic behavior. Treat all contributors and members with kindness."
      initialReportReason="Respect others and be civil"
      initialRuleName="Respect others and be civil"
      initialView="safety"
    />
  ),
};

export const Namespace: Story = {
  render: () => (
    <ModerationShellStory
      initialDescription="No harassment, hate speech, or toxic behavior. Treat all contributors and members with kindness."
      initialReportReason="Respect others and be civil"
      initialRuleName="Respect others and be civil"
      initialView="namespace"
    />
  ),
};
