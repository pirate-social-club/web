import type {
  Community,
  CommunityMoneyPolicy,
  CommunityPricingPolicy,
  Profile,
} from "@pirate/api-contracts";

export type ApiCreateCommunityRequest = {
  display_name: string;
  database_region?:
    | "auto"
    | "aws-us-east-1"
    | "aws-us-east-2"
    | "aws-us-west-2"
    | "aws-eu-west-1"
    | "aws-ap-south-1"
    | "aws-ap-northeast-1"
    | null;
  description?: string | null;
  avatar_ref?: string | null;
  banner_ref?: string | null;
  community_bootstrap?: {
    rules?: Array<{
      title: string;
      body: string;
      report_reason?: string | null;
    }> | null;
  } | null;
  membership_mode?: "open" | "request" | "gated";
  default_age_gate_policy?: "none" | "18_plus";
  allow_anonymous_identity?: boolean;
  anonymous_identity_scope?: "community_stable" | "thread_stable" | "post_ephemeral" | null;
  handle_policy?: {
    policy_template: "standard";
  };
  governance_mode?: "centralized";
  gate_rules?: Array<{
    scope: "membership" | "viewer" | "posting";
    gate_family: "identity_proof" | "token_holding";
    gate_type:
      | "unique_human"
      | "age_over_18"
      | "minimum_age"
      | "nationality"
      | "gender"
      | "wallet_score"
      | "erc721_holding"
      | "erc721_inventory_match";
    proof_requirements?: Array<{
      proof_type:
        | "unique_human"
        | "biometric_liveness"
        | "wallet_score"
        | "gov_id"
        | "age_over_18"
        | "minimum_age"
        | "nationality"
        | "gender"
        | "phone";
      accepted_providers?: Array<"self" | "very" | "passport"> | null;
      accepted_mechanisms?: Array<string> | null;
      config?: Record<string, unknown> | null;
    }> | null;
    chain_namespace?: string | null;
    gate_config?: Record<string, unknown> | null;
  }> | null;
  namespace?: {
    namespace_verification_id: string;
  } | null;
};

export type ApiCommunityMediaUploadResponse = {
  kind: "avatar" | "banner" | "post_image";
  media_ref: string;
  ipfs_cid?: string;
  mime_type: string;
  size_bytes: number;
  storage_bucket: string;
  storage_object_key: string;
};

export type ApiProfileMediaUploadResponse = {
  kind: "avatar" | "cover";
  media_ref: string;
  ipfs_cid?: string;
  mime_type: string;
  size_bytes: number;
  storage_bucket: string;
  storage_object_key: string;
};

export type ApiPublicProfileResolution = {
  profile: Profile;
  requested_handle_label: string;
  resolved_handle_label: string;
  is_canonical: boolean;
  created_communities: Array<{
    community_id: string;
    display_name: string;
    route_slug: string | null;
    created_at: string;
  }>;
};

export type ApiPublicAgentResolution = {
  is_canonical: boolean;
  requested_handle_label: string;
  resolved_handle_label: string;
  agent: {
    agent_id: string;
    display_name: string | null;
    handle: { label_display: string };
    ownership_provider: string | null;
    created_at: string;
    updated_at: string;
  };
  owner: {
    user_id: string;
    display_name: string | null;
    global_handle: { label: string };
    primary_public_handle: { label: string } | null;
  };
};

export type ApiSongArtifactUploadContentRequest = {
  content_base64: string;
};

export type ApiCommunityRuleInput = {
  rule_id?: string | null;
  title: string;
  body: string;
  report_reason?: string | null;
  position?: number | null;
  status?: "active" | "archived" | null;
};

export type ApiCommunityGatesUpdateRequest = {
  membership_mode: "open" | "request" | "gated";
  default_age_gate_policy?: "none" | "18_plus" | null;
  allow_anonymous_identity: boolean;
  anonymous_identity_scope?: "community_stable" | "thread_stable" | "post_ephemeral" | null;
  gate_rules?: NonNullable<ApiCreateCommunityRequest["gate_rules"]> extends Array<infer T>
    ? Array<T & { gate_rule_id?: string | null }>
    : never;
};

export type ApiUpdateCommunityRequest = {
  display_name?: string | null;
  description?: string | null;
  avatar_ref?: string | null;
  banner_ref?: string | null;
  agent_posting_policy?: Community["agent_posting_policy"] | null;
  agent_posting_scope?: Community["agent_posting_scope"] | null;
  agent_daily_post_cap?: number | null;
  agent_daily_reply_cap?: number | null;
  human_verification_lane?: Community["human_verification_lane"] | null;
  accepted_agent_ownership_providers?: Community["accepted_agent_ownership_providers"] | null;
};

export type ApiCommunitySafetyUpdateRequest = {
  adult_content_policy: {
    suggestive: Community["adult_content_policy"]["suggestive"];
    artistic_nudity: Community["adult_content_policy"]["artistic_nudity"];
    explicit_nudity: Community["adult_content_policy"]["explicit_nudity"];
    explicit_sexual_content: Community["adult_content_policy"]["explicit_sexual_content"];
    fetish_content: Community["adult_content_policy"]["fetish_content"];
  };
  graphic_content_policy: {
    injury_medical: Community["graphic_content_policy"]["injury_medical"];
    gore: Community["graphic_content_policy"]["gore"];
    extreme_gore: Community["graphic_content_policy"]["extreme_gore"];
    body_horror_disturbing: Community["graphic_content_policy"]["body_horror_disturbing"];
    animal_harm: Community["graphic_content_policy"]["animal_harm"];
  };
  civility_policy: {
    group_directed_demeaning_language: Community["civility_policy"]["group_directed_demeaning_language"];
    targeted_insults: Community["civility_policy"]["targeted_insults"];
    targeted_harassment: Community["civility_policy"]["targeted_harassment"];
    threatening_language: Community["civility_policy"]["threatening_language"];
  };
  openai_moderation_settings: NonNullable<Community["openai_moderation_settings"]>;
};

export type ApiDonationPartnerSummaryInput = {
  donation_partner_id: string;
  display_name: string;
  provider: "endaoment";
  provider_partner_ref?: string | null;
  image_url?: string | null;
};

export type ApiCommunityDonationPolicyResponse = {
  community_id: string;
  donation_policy_mode: Community["donation_policy_mode"];
  donation_partner_status: Community["donation_partner_status"];
  donation_partner_id: string | null;
  donation_partner: (Community["donation_partner"] & { image_url?: string | null }) | null;
  updated_at: string;
};

export type ApiResolveDonationPartnerResponse = {
  donation_partner_id: string;
  display_name: string;
  provider: "endaoment";
  provider_partner_ref?: string | null;
  image_url?: string | null;
};

export type CommunityListPostsOptions = {
  limit?: string | null;
  cursor?: string | null;
  locale?: string | null;
  flair_id?: string | null;
  sort?: "best" | "new" | "top" | null;
};

export type CommunityListCommentsOptions = {
  limit?: string | null;
  cursor?: string | null;
  locale?: string | null;
  sort?: "best" | "new" | "old" | "top" | null;
};

export type CommunityReferenceLinksInput = {
  reference_links: Array<{
    community_reference_link_id?: string | null;
    platform: NonNullable<Community["reference_links"]>[number]["platform"];
    url: string;
    label?: string | null;
    position?: number | null;
  }>;
};

export type CommunityLabelPolicyInput = {
  label_enabled: boolean;
  require_label_on_top_level_posts: boolean;
  definitions: Array<{
    label_id?: string | null;
    label: string;
    color_token?: string | null;
    status: "active" | "archived";
    position?: number | null;
  }>;
};

export type DonationPolicyUpdateInput = {
  donation_policy_mode: Community["donation_policy_mode"];
  donation_partner_id?: string | null;
  donation_partner?: ApiDonationPartnerSummaryInput | null;
};

export type ApiCommunityMachineAccessPolicy = {
  community_id: string;
  policy_origin: "default" | "explicit";
  access_mode: "structured_api" | "structured_api_enhanced";
  included_surfaces: {
    community_identity: true;
    community_stats: boolean;
    thread_cards: boolean;
    thread_bodies: boolean;
    top_comments: boolean;
    events: boolean;
  };
  allowed_uses: {
    summarization: true;
    analytics: true;
    ai_training: "prohibited";
  };
  operational_limits: {
    anonymous_rate_tier: "low";
    authenticated_rate_tier: "standard";
    top_comments_limit: number;
    max_lookback_window: string;
  };
  updated_at: string;
};

export type ApiCommunityMachineAccessPolicyUpdate = {
  included_surfaces?: Partial<ApiCommunityMachineAccessPolicy["included_surfaces"]>;
};

export type ProfileUpdateInput = {
  display_name?: string | null;
  avatar_ref?: string | null;
  avatar_source?: "ens" | "upload" | "none" | null;
  cover_ref?: string | null;
  cover_source?: "ens" | "upload" | "none" | null;
  bio?: string | null;
  bio_source?: "ens" | "manual" | "none" | null;
  preferred_locale?: string | null;
  display_verified_nationality_badge?: boolean | null;
};

export type HandleUpgradeQuoteResponse = {
  desired_label: string;
  tier: string;
  price_usd: number;
  eligible: boolean;
  reason?: string | null;
  benefit_source?: "verified_reddit_username" | "reddit_reputation" | null;
  reputation_discount_usd?: number | null;
  claim_reason?: string | null;
};

export type RenameHandleResponse = {
  global_handle_id: string;
  label: string;
  tier: string;
  status: string;
};

export type NotificationFeedOptions = {
  cursor?: string | null;
  limit?: number | null;
};
