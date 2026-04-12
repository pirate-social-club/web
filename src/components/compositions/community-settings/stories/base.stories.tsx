import type { Meta, StoryObj } from "@storybook/react-vite";

import { CommunitySettings } from "../community-settings";
import type {
  CommunitySettingsFlairPolicy,
  CommunitySettingsGateRule,
  CommunitySettingsModerationPolicy,
  CommunitySettingsReferenceLink,
  CommunitySettingsResourceLink,
  CommunitySettingsRule,
} from "../community-settings.types";

const fullRules: CommunitySettingsRule[] = [
  {
    ruleId: "r1",
    title: "No low-effort posts",
    body: "Memes and one-liners belong in the weekly discussion thread.",
    position: 0,
    status: "active",
  },
  {
    ruleId: "r2",
    title: "Flair your posts",
    body: "Use the appropriate flair when posting.",
    position: 1,
    status: "active",
  },
  {
    ruleId: "r3",
    title: "Be respectful",
    body: "Personal attacks and gatekeeping will result in a ban.",
    position: 2,
    status: "active",
  },
];

const fullResourceLinks: CommunitySettingsResourceLink[] = [
  {
    resourceLinkId: "rl1",
    label: "Discord",
    url: "https://discord.gg/tameimpala",
    resourceKind: "discord",
    position: 0,
    status: "active",
  },
  {
    resourceLinkId: "rl2",
    label: "Official site",
    url: "https://tameimpala.com",
    resourceKind: "website",
    position: 1,
    status: "active",
  },
  {
    resourceLinkId: "rl3",
    label: "Essential playlist",
    url: "https://open.spotify.com/playlist/abc123",
    resourceKind: "playlist",
    position: 2,
    status: "active",
  },
];

const fullReferenceLinks: CommunitySettingsReferenceLink[] = [
  {
    communityReferenceLinkId: "ref1",
    platform: "spotify",
    url: "https://open.spotify.com/artist/5INjqkS1d8Yy7I3GdE8c5J",
    label: null,
    linkStatus: "active",
    verified: true,
    verifiedAt: "2024-07-01T00:00:00Z",
    metadata: { displayName: "Spotify", imageUrl: null },
    position: 0,
  },
  {
    communityReferenceLinkId: "ref2",
    platform: "youtube",
    url: "https://youtube.com/@tameimpala",
    label: null,
    linkStatus: "active",
    verified: true,
    verifiedAt: "2024-07-01T00:00:00Z",
    metadata: { displayName: "YouTube", imageUrl: null },
    position: 1,
  },
  {
    communityReferenceLinkId: "ref3",
    platform: "bandcamp",
    url: "https://tameimpala.bandcamp.com",
    label: null,
    linkStatus: "active",
    verified: false,
    metadata: { displayName: null, imageUrl: null },
    position: 2,
  },
];

const fullFlairPolicy: CommunitySettingsFlairPolicy = {
  flairEnabled: true,
  definitions: [
    { flairId: "f1", label: "Discussion", colorToken: "#6377f0", status: "active", position: 0 },
    { flairId: "f2", label: "News", colorToken: "#f06377", status: "active", position: 1 },
    { flairId: "f3", label: "Media", colorToken: "#63f0a5", status: "active", position: 2 },
    { flairId: "f4", label: "Original", colorToken: "#f0d163", status: "active", position: 3 },
  ],
};

const fullGateRules: CommunitySettingsGateRule[] = [
  {
    gateRuleId: "g1",
    scope: "membership",
    gateFamily: "identity_proof",
    gateType: "unique_human",
    status: "active",
    position: 0,
  },
  {
    gateRuleId: "g2",
    scope: "membership",
    gateFamily: "identity_proof",
    gateType: "age_over_18",
    status: "active",
    position: 1,
  },
  {
    gateRuleId: "g3",
    scope: "posting",
    gateFamily: "identity_proof",
    gateType: "sanctions_clear",
    status: "active",
    position: 0,
  },
  {
    gateRuleId: "g4",
    scope: "membership",
    gateFamily: "token_holding",
    gateType: "erc721_holding",
    status: "active",
    position: 2,
    chainNamespace: "eip155:1",
    gateConfig: { contract_address: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D" },
  },
  {
    gateRuleId: "g5",
    scope: "membership",
    gateFamily: "identity_proof",
    gateType: "nationality",
    status: "active",
    position: 3,
    proofRequirements: [
      {
        proof_type: "nationality",
        accepted_providers: ["self"],
      },
    ],
    gateConfig: { required_value: "US" },
  },
];

const generalInterestPolicy: CommunitySettingsModerationPolicy = {
  preset: "general_interest",
  adult: {
    suggestive: "allow",
    artistic_nudity: "allow",
    explicit_nudity: "review",
    explicit_sexual_content: "disallow",
    fetish_content: "disallow",
  },
  graphic: {
    injury_medical: "allow",
    gore: "review",
    extreme_gore: "disallow",
    body_horror_disturbing: "review",
    animal_harm: "review",
  },
  language: {
    profanity: "allow",
    slurs: "review",
  },
  civility: {
    group_directed_demeaning_language: "allow",
    targeted_insults: "allow",
    targeted_harassment: "review",
    threatening_language: "review",
  },
};

const anythingLegalPolicy: CommunitySettingsModerationPolicy = {
  preset: "anything_legal",
  adult: {
    suggestive: "allow",
    artistic_nudity: "allow",
    explicit_nudity: "allow",
    explicit_sexual_content: "allow",
    fetish_content: "allow",
  },
  graphic: {
    injury_medical: "allow",
    gore: "allow",
    extreme_gore: "allow",
    body_horror_disturbing: "allow",
    animal_harm: "allow",
  },
  language: {
    profanity: "allow",
    slurs: "allow",
  },
  civility: {
    group_directed_demeaning_language: "allow",
    targeted_insults: "allow",
    targeted_harassment: "allow",
    threatening_language: "review",
  },
};

const civilDiscussionPolicy: CommunitySettingsModerationPolicy = {
  preset: "civil_discussion",
  adult: {
    suggestive: "allow",
    artistic_nudity: "allow",
    explicit_nudity: "disallow",
    explicit_sexual_content: "disallow",
    fetish_content: "disallow",
  },
  graphic: {
    injury_medical: "allow",
    gore: "disallow",
    extreme_gore: "disallow",
    body_horror_disturbing: "disallow",
    animal_harm: "review",
  },
  language: {
    profanity: "allow",
    slurs: "disallow",
  },
  civility: {
    group_directed_demeaning_language: "disallow",
    targeted_insults: "review",
    targeted_harassment: "disallow",
    threatening_language: "disallow",
  },
};

const adultCreatorsPolicy: CommunitySettingsModerationPolicy = {
  preset: "adult_creators",
  adult: {
    suggestive: "allow",
    artistic_nudity: "allow",
    explicit_nudity: "allow",
    explicit_sexual_content: "allow",
    fetish_content: "review",
  },
  graphic: {
    injury_medical: "allow",
    gore: "review",
    extreme_gore: "review",
    body_horror_disturbing: "review",
    animal_harm: "review",
  },
  language: {
    profanity: "allow",
    slurs: "allow",
  },
  civility: {
    group_directed_demeaning_language: "allow",
    targeted_insults: "allow",
    targeted_harassment: "review",
    threatening_language: "review",
  },
};

const customEditedPolicy: CommunitySettingsModerationPolicy = {
  preset: "custom",
  adult: {
    suggestive: "allow",
    artistic_nudity: "allow",
    explicit_nudity: "review",
    explicit_sexual_content: "disallow",
    fetish_content: "disallow",
  },
  graphic: {
    injury_medical: "allow",
    gore: "allow",
    extreme_gore: "disallow",
    body_horror_disturbing: "review",
    animal_harm: "disallow",
  },
  language: {
    profanity: "allow",
    slurs: "disallow",
  },
  civility: {
    group_directed_demeaning_language: "review",
    targeted_insults: "allow",
    targeted_harassment: "disallow",
    threatening_language: "review",
  },
};

const meta = {
  title: "Compositions/CommunitySettings",
  component: CommunitySettings,
  args: {},
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof CommunitySettings>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Full: Story = {
  name: "Full settings",
  render: () => (
    <CommunitySettings
      anonymousIdentityScope="community_stable"
      allowAnonymousIdentity
      defaultAgeGatePolicy="none"
      description="Everything about Tame Impala — albums, deep cuts, live sessions, and production talk."
      displayName="Tame Impala"
      flairPolicy={fullFlairPolicy}
      gateRules={fullGateRules}
      membershipMode="open"
      moderationPolicy={generalInterestPolicy}
      referenceLinks={fullReferenceLinks}
      resourceLinks={fullResourceLinks}
      rules={fullRules}
    />
  ),
};

export const Empty: Story = {
  name: "Empty community",
  render: () => (
    <CommunitySettings
      description=""
      displayName="New Community"
      membershipMode="open"
    />
  ),
};

export const Gated: Story = {
  name: "Gated community",
  render: () => (
    <CommunitySettings
      allowAnonymousIdentity={false}
      defaultAgeGatePolicy="18_plus"
      description="A gated space for working producers to share techniques, stems, and feedback."
      displayName="Producers Only"
      flairPolicy={{
        flairEnabled: true,
        definitions: [
          { flairId: "f1", label: "Feedback", colorToken: "#f0a040", status: "active", position: 0 },
          { flairId: "f2", label: "Stems", colorToken: "#40a0f0", status: "active", position: 1 },
        ],
      }}
      gateRules={[
        { gateRuleId: "g1", scope: "membership", gateFamily: "identity_proof", gateType: "unique_human", status: "active", position: 0 },
        { gateRuleId: "g2", scope: "membership", gateFamily: "identity_proof", gateType: "age_over_18", status: "active", position: 1 },
        { gateRuleId: "g3", scope: "posting", gateFamily: "token_holding", gateType: "erc1155_holding", status: "active", position: 0, chainNamespace: "eip155:137", gateConfig: { contract_address: "0x3a224C06a634e7BC56d1D71DAc2bBD2D9387F7d4", token_id: "42", min_balance: "3" } },
      ]}
      membershipMode="gated"
      resourceLinks={[
        { resourceLinkId: "rl1", label: "Discord", url: "https://discord.gg/producers", resourceKind: "discord", position: 0, status: "active" },
      ]}
      rules={[
        { ruleId: "r1", title: "Verified producers only", body: "You must complete identity verification before posting.", position: 0, status: "active" },
        { ruleId: "r2", title: "No leaked stems", body: "Only share stems you have the rights to distribute.", position: 1, status: "active" },
      ]}
    />
  ),
};

export const ReadOnly: Story = {
  name: "Read-only",
  render: () => (
    <CommunitySettings
      allowAnonymousIdentity
      anonymousIdentityScope="community_stable"
      description="Everything about Tame Impala."
      displayName="Tame Impala"
      flairPolicy={fullFlairPolicy}
      gateRules={fullGateRules}
      membershipMode="open"
      moderationPolicy={generalInterestPolicy}
      readOnly
      referenceLinks={fullReferenceLinks}
      resourceLinks={fullResourceLinks}
      rules={fullRules}
    />
  ),
};

export const Mobile: Story = {
  name: "Mobile layout",
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <div className="px-4 py-8">
      <CommunitySettings
        allowAnonymousIdentity
        anonymousIdentityScope="community_stable"
        description="Everything about Tame Impala."
        displayName="Tame Impala"
        flairPolicy={fullFlairPolicy}
        gateRules={fullGateRules}
        membershipMode="open"
        moderationPolicy={generalInterestPolicy}
        referenceLinks={fullReferenceLinks}
        resourceLinks={fullResourceLinks}
        rules={fullRules}
      />
    </div>
  ),
};

export const ModerationDefault: Story = {
  name: "Moderation / General Interest",
  render: () => (
    <CommunitySettings
      description="A general music discussion community."
      displayName="Indie Heads"
      membershipMode="open"
      moderationPolicy={generalInterestPolicy}
    />
  ),
};

export const ModerationAnythingLegal: Story = {
  name: "Moderation / Anything Legal",
  render: () => (
    <CommunitySettings
      description="Unfiltered discussion. If it's legal, it flies."
      displayName="Free Talk Zone"
      membershipMode="open"
      moderationPolicy={anythingLegalPolicy}
    />
  ),
};

export const ModerationCivilDiscussion: Story = {
  name: "Moderation / Civil Discussion",
  render: () => (
    <CommunitySettings
      description="A community that enforces civil discourse."
      displayName="Civic Debate"
      membershipMode="gated"
      moderationPolicy={civilDiscussionPolicy}
    />
  ),
};

export const ModerationAdultCreators: Story = {
  name: "Moderation / Adult Creators",
  render: () => (
    <CommunitySettings
      defaultAgeGatePolicy="18_plus"
      description="Adult creator community with explicit content."
      displayName="Creators 18+"
      membershipMode="open"
      moderationPolicy={adultCreatorsPolicy}
    />
  ),
};

export const ModerationCustomEdited: Story = {
  name: "Moderation / Custom edited",
  render: () => (
    <CommunitySettings
      description="A community with hand-tuned moderation rules."
      displayName="Mixed Signals"
      membershipMode="open"
      moderationPolicy={customEditedPolicy}
    />
  ),
};

export const ModerationReadOnly: Story = {
  name: "Moderation / Read-only",
  render: () => (
    <CommunitySettings
      description="A general community with read-only moderation settings."
      displayName="Indie Heads"
      membershipMode="open"
      moderationPolicy={civilDiscussionPolicy}
      readOnly
    />
  ),
};

export const ModerationMobile: Story = {
  name: "Moderation / Mobile",
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <div className="px-4 py-8">
      <CommunitySettings
        description="A general music discussion community."
        displayName="Indie Heads"
        membershipMode="open"
        moderationPolicy={generalInterestPolicy}
      />
    </div>
  ),
};
