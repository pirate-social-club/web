import type { CommunityMembershipMode } from "@/lib/community-membership";

export type { CommunityMembershipMode };

export type AnonymousIdentityScope = "community_stable" | "thread_stable";

export type AgeGatePolicy = "none" | "18_plus";

export type GateRuleScope = "membership" | "viewer" | "posting";

export type GateRuleFamily = "token_holding" | "identity_proof";

export type GateRuleType =
  | "erc721_holding"
  | "erc1155_holding"
  | "erc20_balance"
  | "solana_nft_holding"
  | "unique_human"
  | "age_over_18"
  | "nationality"
  | "gender"
  | "sanctions_clear"
  | "wallet_score";

export interface CommunitySettingsRule {
  ruleId: string;
  title: string;
  body: string;
  position: number;
  status: "active" | "archived";
}

export type ResourceLinkKind =
  | "link"
  | "playlist"
  | "document"
  | "discord"
  | "website"
  | "other";

export interface CommunitySettingsResourceLink {
  resourceLinkId: string;
  label: string;
  url: string;
  resourceKind: ResourceLinkKind;
  position: number;
  status: "active" | "archived";
}

export type ReferenceLinkPlatform =
  | "musicbrainz"
  | "genius"
  | "spotify"
  | "apple_music"
  | "wikipedia"
  | "instagram"
  | "tiktok"
  | "x"
  | "official_website"
  | "youtube"
  | "bandcamp"
  | "soundcloud"
  | "other";

export interface CommunitySettingsReferenceLink {
  communityReferenceLinkId: string;
  platform: ReferenceLinkPlatform;
  url: string;
  externalId?: string | null;
  label?: string | null;
  linkStatus: "active" | "archived";
  verified: boolean;
  verifiedAt?: string | null;
  metadata: {
    displayName?: string | null;
    imageUrl?: string | null;
  };
  position: number;
}

export interface CommunitySettingsFlairDefinition {
  flairId: string;
  label: string;
  colorToken?: string | null;
  status: "active" | "archived";
  position: number;
}

export interface CommunitySettingsFlairPolicy {
  flairEnabled: boolean;
  definitions: CommunitySettingsFlairDefinition[];
}

export type SupportedChainNamespace = "eip155:1" | "eip155:137";

export interface CommunitySettingsGateRule {
  gateRuleId: string;
  scope: GateRuleScope;
  gateFamily: GateRuleFamily;
  gateType: GateRuleType;
  status: "active" | "disabled";
  position: number;
  chainNamespace?: SupportedChainNamespace | null;
  proofRequirements?: unknown[] | null;
  gateConfig?: Record<string, unknown> | null;
}

export interface CommunitySettingsAboutProps {
  className?: string;
  displayName: string;
  displayNameReadOnly?: boolean;
  description: string;
  membershipMode: CommunityMembershipMode;
  defaultAgeGatePolicy: AgeGatePolicy;
  allowAnonymousIdentity: boolean;
  anonymousIdentityScope: AnonymousIdentityScope;
  onDisplayNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onMembershipModeChange: (value: CommunityMembershipMode) => void;
  onDefaultAgeGatePolicyChange: (value: AgeGatePolicy) => void;
  onAllowAnonymousIdentityChange: (value: boolean) => void;
  onAnonymousIdentityScopeChange: (value: AnonymousIdentityScope) => void;
  readOnly?: boolean;
}

export interface CommunitySettingsRulesProps {
  className?: string;
  rules: CommunitySettingsRule[];
  onRulesChange: (rules: CommunitySettingsRule[]) => void;
  readOnly?: boolean;
}

export interface CommunitySettingsLinksProps {
  className?: string;
  resourceLinks: CommunitySettingsResourceLink[];
  referenceLinks: CommunitySettingsReferenceLink[];
  onResourceLinksChange: (links: CommunitySettingsResourceLink[]) => void;
  readOnly?: boolean;
}

export interface CommunitySettingsAccessProps {
  className?: string;
  gateRules: CommunitySettingsGateRule[];
  onGateRulesChange: (rules: CommunitySettingsGateRule[]) => void;
  gateRuleErrors?: Record<string, string[]>;
  readOnly?: boolean;
}

export interface CommunitySettingsPostingProps {
  className?: string;
  flairPolicy: CommunitySettingsFlairPolicy | null;
  onFlairPolicyChange: (policy: CommunitySettingsFlairPolicy | null) => void;
  readOnly?: boolean;
}

export type ModerationAction = "allow" | "review" | "disallow";

export type ModerationAdultCategory =
  | "suggestive"
  | "artistic_nudity"
  | "explicit_nudity"
  | "explicit_sexual_content"
  | "fetish_content";

export type ModerationGraphicCategory =
  | "injury_medical"
  | "gore"
  | "extreme_gore"
  | "body_horror_disturbing"
  | "animal_harm";

export type ModerationLanguageCategory =
  | "profanity"
  | "slurs";

export type ModerationCivilityCategory =
  | "group_directed_demeaning_language"
  | "targeted_insults"
  | "targeted_harassment"
  | "threatening_language";

export type ModerationPresetKey =
  | "anything_legal"
  | "general_interest"
  | "civil_discussion"
  | "adult_creators"
  | "no_hate_no_slurs"
  | "private_high_trust";

export interface ModerationAdultPolicy {
  suggestive: ModerationAction;
  artistic_nudity: ModerationAction;
  explicit_nudity: ModerationAction;
  explicit_sexual_content: ModerationAction;
  fetish_content: ModerationAction;
}

export interface ModerationGraphicPolicy {
  injury_medical: ModerationAction;
  gore: ModerationAction;
  extreme_gore: ModerationAction;
  body_horror_disturbing: ModerationAction;
  animal_harm: ModerationAction;
}

export interface ModerationLanguagePolicy {
  profanity: ModerationAction;
  slurs: ModerationAction;
}

export interface ModerationCivilityPolicy {
  group_directed_demeaning_language: ModerationAction;
  targeted_insults: ModerationAction;
  targeted_harassment: ModerationAction;
  threatening_language: "review" | "disallow";
}

export interface CommunitySettingsModerationPolicy {
  preset: ModerationPresetKey | "custom";
  adult: ModerationAdultPolicy;
  graphic: ModerationGraphicPolicy;
  language: ModerationLanguagePolicy;
  civility: ModerationCivilityPolicy;
}

export interface CommunitySettingsModerationProps {
  className?: string;
  policy: CommunitySettingsModerationPolicy;
  onPolicyChange: (policy: CommunitySettingsModerationPolicy) => void;
  readOnly?: boolean;
}

export interface CommunitySettingsProps {
  className?: string;
  communityId?: string;
  accessToken?: string | null;
  displayName?: string;
  description?: string | null;
  membershipMode?: CommunityMembershipMode;
  defaultAgeGatePolicy?: AgeGatePolicy;
  allowAnonymousIdentity?: boolean;
  anonymousIdentityScope?: AnonymousIdentityScope;
  rules?: CommunitySettingsRule[];
  resourceLinks?: CommunitySettingsResourceLink[];
  referenceLinks?: CommunitySettingsReferenceLink[];
  flairPolicy?: CommunitySettingsFlairPolicy | null;
  gateRules?: CommunitySettingsGateRule[];
  moderationPolicy?: CommunitySettingsModerationPolicy;
  readOnly?: boolean;
}
