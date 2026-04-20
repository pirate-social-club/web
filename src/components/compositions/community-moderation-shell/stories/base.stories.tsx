import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { CurrencyDollar, Gavel, Heart, ImageSquare, LinkSimple, Lock, Robot, SealCheck, Shield, Tag } from "@phosphor-icons/react";

import type { CommunityModerationSection } from "@/app/authenticated-routes/moderation-helpers";
import { CommunityAgentPolicyPage } from "@/components/compositions/community-agent-policy/community-agent-policy";
import {
  CommunityDonationsEditorPage,
  type DonationPartnerPreview,
} from "@/components/compositions/community-donations-editor/community-donations-editor-page";
import { CommunityGatesEditorPage } from "@/components/compositions/community-gates-editor/community-gates-editor-page";
import {
  CommunityLabelsEditorPage,
  createEmptyLabelDefinition,
  type LabelEditorDefinition,
} from "@/components/compositions/community-labels-editor/community-labels-editor-page";
import {
  CommunityLinksEditorPage,
  createEmptyCommunityLinkEditorItem,
  type CommunityLinkEditorItem,
} from "@/components/compositions/community-links-editor/community-links-editor-page";
import { CommunityModerationShell } from "@/components/compositions/community-moderation-shell/community-moderation-shell";
import { CommunityProfileEditorPage } from "@/components/compositions/community-profile-editor/community-profile-editor-page";
import { CommunityNamespaceVerificationPage } from "@/components/compositions/community-namespace-verification-page/community-namespace-verification-page";
import { CommunityPricingEditorPage } from "@/components/compositions/community-pricing-editor/community-pricing-editor-page";
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

const SAMPLE_LABELS: LabelEditorDefinition[] = [
  { id: "l1", label: "Discussion", color: "#6377f0", status: "active" },
  { id: "l2", label: "News", color: "#f06377", status: "active" },
  { id: "l3", label: "Media", color: "#63f0a5", status: "active" },
  { id: "l4", label: "Original", color: "#f0d163", status: "active" },
];

type ModerationView = CommunityModerationSection;

function ModerationShellStory({
  initialAllowAnonymousIdentity = true,
  initialAnonymousIdentityScope = "community_stable",
  initialDefaultAgeGatePolicy = "none",
  initialDescription,
  initialCommunityDescription = "A gated space for producers to trade stems, workflows, and hard feedback.",
  initialCommunityDisplayName = "Infinity Mirror",
  initialGateDrafts = [],
  initialLabelsEnabled = true,
  initialLabels = SAMPLE_LABELS,
  initialLinks = [],
  initialEndaomentUrl = "https://app.endaoment.org/orgs/charity-water",
  initialPartnerPreview = {
    donationPartnerId: "endaoment:mock-charity-water",
    displayName: "charity: water",
    imageUrl: "https://placehold.co/96x96/111827/f97316?text=CW",
    provider: "Endaoment",
    providerPartnerRef: "charity-water",
  },
  initialMembershipMode = "open",
  initialReportReason,
  initialRuleName,
  initialView = "rules",
}: {
  initialAllowAnonymousIdentity?: boolean;
  initialAnonymousIdentityScope?: "community_stable" | "thread_stable" | "post_ephemeral";
  initialDefaultAgeGatePolicy?: "none" | "18_plus";
  initialDescription: string;
  initialCommunityDescription?: string;
  initialCommunityDisplayName?: string;
  initialGateDrafts?: IdentityGateDraft[];
  initialLabelsEnabled?: boolean;
  initialLabels?: LabelEditorDefinition[];
  initialLinks?: CommunityLinkEditorItem[];
  initialEndaomentUrl?: string;
  initialPartnerPreview?: DonationPartnerPreview | null;
  initialMembershipMode?: "open" | "request" | "gated";
  initialReportReason: string;
  initialRuleName: string;
  initialView?: ModerationView;
}) {
  const [ruleName, setRuleName] = React.useState(initialRuleName);
  const [description, setDescription] = React.useState(initialDescription);
  const [reportReason, setReportReason] = React.useState(initialReportReason);
  const [communityDisplayName, setCommunityDisplayName] = React.useState(initialCommunityDisplayName);
  const [communityDescription, setCommunityDescription] = React.useState(initialCommunityDescription);
  const [endaomentUrl, setEndaomentUrl] = React.useState(initialEndaomentUrl);
  const [partnerPreview, setPartnerPreview] = React.useState<DonationPartnerPreview | null>(initialPartnerPreview);
  const [membershipMode, setMembershipMode] =
    React.useState<"open" | "request" | "gated">(initialMembershipMode);
  const [defaultAgeGatePolicy, setDefaultAgeGatePolicy] =
    React.useState<"none" | "18_plus">(initialDefaultAgeGatePolicy);
  const [allowAnonymousIdentity, setAllowAnonymousIdentity] =
    React.useState(initialAllowAnonymousIdentity);
  const [anonymousIdentityScope, setAnonymousIdentityScope] =
    React.useState<"community_stable" | "thread_stable" | "post_ephemeral">(initialAnonymousIdentityScope);
  const [gateDrafts, setGateDrafts] = React.useState<IdentityGateDraft[]>(initialGateDrafts);
  const [links, setLinks] = React.useState<CommunityLinkEditorItem[]>(initialLinks);
  const [labelsEnabled, setLabelsEnabled] = React.useState(initialLabelsEnabled);
  const [labels, setLabels] = React.useState<LabelEditorDefinition[]>(initialLabels);
  const [activeView, setActiveView] = React.useState<ModerationView>(initialView);
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
        label: "Community",
        items: [
          { active: activeView === "profile", icon: ImageSquare, label: "Profile", onSelect: () => setActiveView("profile") },
          { active: activeView === "rules", icon: Gavel, label: "Rules", onSelect: () => setActiveView("rules") },
          { active: activeView === "links", icon: LinkSimple, label: "Links", onSelect: () => setActiveView("links") },
          { active: activeView === "labels", icon: Tag, label: "Labels", onSelect: () => setActiveView("labels") },
          { active: activeView === "donations", icon: Heart, label: "Donations", onSelect: () => setActiveView("donations") },
          { active: activeView === "pricing", icon: CurrencyDollar, label: "Pricing", onSelect: () => setActiveView("pricing") },
        ],
      }, {
        label: "Access",
        items: [
          { active: activeView === "gates", icon: Lock, label: "Gates", onSelect: () => setActiveView("gates") },
          { active: activeView === "safety", icon: Shield, label: "Safety", onSelect: () => setActiveView("safety") },
          { active: activeView === "agents", icon: Robot, label: "Agents", onSelect: () => setActiveView("agents") },
        ],
      }, {
        label: "Verification",
        items: [
          { active: activeView === "namespace", icon: SealCheck, label: "Namespace verification", onSelect: () => setActiveView("namespace") },
        ],
      }]}
    >
      {activeView === "profile" ? (
        <CommunityProfileEditorPage
          description={communityDescription}
          displayName={communityDisplayName}
          onDescriptionChange={setCommunityDescription}
          onDisplayNameChange={setCommunityDisplayName}
        />
      ) : activeView === "rules" ? (
        <CommunityRulesEditorPage
          description={description}
          onDescriptionChange={setDescription}
          onReportReasonChange={setReportReason}
          onRuleNameChange={setRuleName}
          reportReason={reportReason}
          ruleName={ruleName}
          saveDisabled={!ruleName.trim() || !description.trim()}
        />
      ) : activeView === "links" ? (
        <CommunityLinksEditorPage
          links={links}
          onAddLink={() => setLinks((current) => [...current, createEmptyCommunityLinkEditorItem()])}
          onLinkChange={(id, patch) => setLinks((current) => current.map((link) => link.id === id ? { ...link, ...patch } : link))}
          onRemoveLink={(id) => setLinks((current) => current.filter((link) => link.id !== id))}
          saveDisabled={links.some((link) => !link.url.trim())}
        />
      ) : activeView === "labels" ? (
        <CommunityLabelsEditorPage
          labels={labels}
          labelsEnabled={labelsEnabled}
          onLabelsChange={setLabels}
          onLabelsEnabledChange={setLabelsEnabled}
          onRequireOnTopLevelPostsChange={() => {}}
          requireOnTopLevelPosts={false}
        />
      ) : activeView === "pricing" ? (
        <CommunityPricingEditorPage
          countryAssignments={[]}
          defaultTierKey={null}
          onCountryAssignmentsChange={() => {}}
          onDefaultTierKeyChange={() => {}}
          onRegionalPricingEnabledChange={() => {}}
          onSave={() => undefined}
          onTiersChange={() => {}}
          onUseStarterTemplate={() => undefined}
          onVerificationProviderRequirementChange={() => {}}
          regionalPricingEnabled={false}
          tiers={[]}
          verificationProviderRequirement={null}
        />
      ) : activeView === "donations" ? (
        <CommunityDonationsEditorPage
          endaomentUrl={endaomentUrl}
          onClearPartner={() => setPartnerPreview(null)}
          onEndaomentUrlChange={setEndaomentUrl}
          onResolve={() => undefined}
          onSave={() => undefined}
          partnerPreview={partnerPreview}
          resolveError={null}
          resolving={false}
          saveDisabled={endaomentUrl.trim().length > 0 && partnerPreview == null}
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
      ) : activeView === "agents" ? (
        <CommunityAgentPolicyPage
          settings={{
            agentPostingPolicy: "allow",
            agentPostingScope: "replies_only",
            acceptedAgentOwnershipProviders: ["clawkey"],
            dailyPostCap: 5,
            dailyReplyCap: 20,
          }}
          submitState={{ kind: "idle" }}
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

export const Profile: Story = {
  render: () => (
    <ModerationShellStory
      initialDescription="No harassment, hate speech, or toxic behavior. Treat all contributors and members with kindness."
      initialReportReason="Respect others and be civil"
      initialRuleName="Respect others and be civil"
      initialView="profile"
    />
  ),
};

export const Labels: Story = {
  render: () => (
    <ModerationShellStory
      initialDescription="No harassment, hate speech, or toxic behavior. Treat all contributors and members with kindness."
      initialReportReason="Respect others and be civil"
      initialRuleName="Respect others and be civil"
      initialView="labels"
    />
  ),
};

export const LabelsEmpty: Story = {
  name: "Labels empty",
  render: () => (
    <ModerationShellStory
      initialDescription="No harassment, hate speech, or toxic behavior. Treat all contributors and members with kindness."
      initialReportReason="Respect others and be civil"
      initialRuleName="Respect others and be civil"
      initialLabels={[]}
      initialView="labels"
    />
  ),
};

export const LabelsDisabled: Story = {
  name: "Labels disabled",
  render: () => (
    <ModerationShellStory
      initialDescription="No harassment, hate speech, or toxic behavior. Treat all contributors and members with kindness."
      initialReportReason="Respect others and be civil"
      initialRuleName="Respect others and be civil"
      initialLabelsEnabled={false}
      initialLabels={[]}
      initialView="labels"
    />
  ),
};

export const Donations: Story = {
  render: () => (
    <ModerationShellStory
      initialDescription="No harassment, hate speech, or toxic behavior. Treat all contributors and members with kindness."
      initialReportReason="Respect others and be civil"
      initialRuleName="Respect others and be civil"
      initialView="donations"
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

export const Links: Story = {
  render: () => (
    <ModerationShellStory
      initialDescription="No harassment, hate speech, or toxic behavior. Treat all contributors and members with kindness."
      initialLinks={[
        {
          id: "link-1",
          label: "Spotify",
          platform: "spotify",
          url: "https://open.spotify.com/artist/example",
          verified: true,
        },
        {
          id: "link-2",
          label: "Official site",
          platform: "official_website",
          url: "https://example.com",
          verified: false,
        },
      ]}
      initialReportReason="Respect others and be civil"
      initialRuleName="Respect others and be civil"
      initialView="links"
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

export const Agents: Story = {
  render: () => (
    <ModerationShellStory
      initialDescription="No harassment, hate speech, or toxic behavior. Treat all contributors and members with kindness."
      initialReportReason="Respect others and be civil"
      initialRuleName="Respect others and be civil"
      initialView="agents"
    />
  ),
};
