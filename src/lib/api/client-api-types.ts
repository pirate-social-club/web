import type {
  Community,
  GatePolicy,
  CommunityMoneyPolicy,
  CommunityPricingPolicy,
} from "@pirate/api-contracts";
import type { AnonymousIdentityScope, CommunityDefaultAgeGatePolicy } from "@/lib/community-access-types";

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
  default_age_gate_policy?: CommunityDefaultAgeGatePolicy;
  allow_anonymous_identity?: boolean;
  anonymous_identity_scope?: AnonymousIdentityScope | null;
  handle_policy?: {
    policy_template: "standard";
  };
  governance_mode?: "centralized";
  gate_policy?: GatePolicy | null;
  namespace?: {
    namespace_verification: string;
  } | null;
};

export type ApiCommunityMediaUploadResponse = {
  kind: "avatar" | "banner" | "post_image" | "comment_image";
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

export type ApiWalletIdentityPublicName = {
  id: string;
  label: string;
  label_normalized: string;
  status: "active";
  owner_kind: "wallet";
  owner_wallet_address: string;
  chain_ref: string;
  price_paid_cents: number;
  currency: "USD";
  issued_at: number;
  expires_at: number | null;
  pirate_user_id: string | null;
};

export type ApiWalletIdentityResponse =
  | {
    object: "wallet_identity";
    chain_ref: string;
    wallet_address: string;
    display_label: string | null;
    public_names: ApiWalletIdentityPublicName[];
  }
  | {
    object: "wallet_identity_redirect";
    chain_ref: string;
    wallet_address: string;
    profile: string;
    profile_handle: string;
  };

export type ApiSongArtifactUploadContentRequest = {
  content_base64: string;
};

export type ApiDerivativeSourceKind = "song" | "video";
export type ApiDerivativeSourceQueryKind = ApiDerivativeSourceKind | "live";

export type ApiDerivativeSource = {
  id: string;
  object: "derivative_source";
  community: string;
  asset: string;
  title: string;
  kind: ApiDerivativeSourceKind;
  story_ip: string;
  story_license_terms: string;
  license_preset?: "non-commercial" | "commercial-use" | "commercial-remix" | null;
  commercial_rev_share_pct?: number | null;
  creator_user: string;
  creator_handle?: string | null;
  creator_display_name?: string | null;
};

export type ApiDerivativeSourceListResponse = {
  items: ApiDerivativeSource[];
  next_cursor: string | null;
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
  membership_mode: "request" | "gated";
  default_age_gate_policy?: CommunityDefaultAgeGatePolicy | null;
  allow_anonymous_identity: boolean;
  anonymous_identity_scope?: AnonymousIdentityScope | null;
  gate_policy?: GatePolicy | null;
};

export type ApiUpdateCommunityRequest = {
  display_name?: string | null;
  description?: string | null;
  avatar_ref?: string | null;
  banner_ref?: string | null;
  agent_posting_policy?: Community["agent_posting_policy"] | null;
  agent_posting_scope?: Community["agent_posting_scope"] | null;
  guest_comment_policy?: Community["guest_comment_policy"] | null;
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

export type ApiCommunityVisualPolicyUpdateRequest = {
  visual_policy_settings: Omit<Community["visual_policy_settings"], "community" | "policy_origin">;
};

export type ApiDonationPartnerSummaryInput = {
  donation_partner_id: string;
  display_name: string;
  provider: "endaoment";
  provider_partner_ref?: string | null;
  image_url?: string | null;
};

export type ApiCommunityDonationPolicyResponse = {
  community: string;
  donation_policy_mode: Community["donation_policy_mode"];
  donation_partner_status: Community["donation_partner_status"];
  donation_partner: (Community["donation_partner"] & { image_url?: string | null }) | null;
  updated: string;
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

export type ApiLiveRoomKind = "solo" | "duet";
export type ApiLiveRoomStatus = "scheduled" | "live" | "ended" | "canceled";
export type ApiLiveRoomAccessMode = "free" | "gated" | "paid";
export type ApiLiveRoomVisibility = "public" | "unlisted";
export type ApiLiveRoomSetlistStatus = "draft" | "ready" | "locked";
export type ApiLiveRoomRightsBasis = "original" | "licensed" | "cover" | "public_domain" | "unknown";
export type ApiLiveRoomRightsStatus = "pending" | "ready" | "blocked";

export type ApiCreateLiveRoomRequest = {
  title?: string | null;
  description?: string | null;
  room_kind?: ApiLiveRoomKind | null;
  access_mode?: ApiLiveRoomAccessMode | null;
  visibility?: ApiLiveRoomVisibility | null;
  guest_user?: string | null;
  event_start_at?: number | null;
  cover_ref?: string | null;
  performer_allocations?: Array<{
    user?: string | null;
    role?: "host" | "guest" | null;
    share_bps?: number | null;
  }> | null;
  setlist?: {
    status?: ApiLiveRoomSetlistStatus | null;
    items?: Array<{
      song_artifact_bundle?: string | null;
      source_asset_ref?: string | null;
      title?: string | null;
      artist?: string | null;
      rights_basis?: ApiLiveRoomRightsBasis | null;
      license_ref?: string | null;
      rights_status?: ApiLiveRoomRightsStatus | null;
      blocking_rights_failure?: boolean | null;
    }> | null;
  } | null;
};

export type ApiLiveRoom = {
  id: string;
  object: "live_room";
  community: string;
  anchor_post: string;
  host_user: string;
  guest_user: string | null;
  room_kind: ApiLiveRoomKind;
  status: ApiLiveRoomStatus;
  access_mode: ApiLiveRoomAccessMode;
  visibility: ApiLiveRoomVisibility;
  title: string;
  description: string | null;
  cover_ref: string | null;
  event_start_at: number | null;
  live_started_at: number | null;
  ended_at: number | null;
  canceled_at: number | null;
  broadcast_ref: string | null;
  replay_status: string;
  performer_allocations: Array<{
    id: string;
    object: "live_room_performer_allocation";
    user: string;
    role: "host" | "guest";
    share_bps: number;
  }>;
  setlist: {
    id: string;
    object: "live_room_setlist";
    status: ApiLiveRoomSetlistStatus;
    items: Array<{
      id: string;
      object: "live_room_setlist_item";
      position: number;
      song_artifact_bundle: string | null;
      source_asset_ref: string | null;
      title: string;
      artist: string | null;
      rights_basis: ApiLiveRoomRightsBasis;
      license_ref: string | null;
      rights_status: ApiLiveRoomRightsStatus;
      blocking_rights_failure: boolean;
    }>;
  };
  created: number;
};

export type CommunityListCommentsOptions = {
  limit?: string | null;
  cursor?: string | null;
  locale?: string | null;
  sort?: "best" | "new" | "old" | "top" | null;
};

export type CommunityReferenceLinksInput = {
  reference_links: Array<{
    id?: string | null;
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
  community: string;
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
  updated: string;
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
  quote?: string | null;
  desired_label: string;
  tier: string;
  price_cents: number;
  currency?: "USD";
  eligible: boolean;
  reason?: string | null;
  policy_version?: string | null;
  pricing_tier?: string | null;
  quote_ttl_seconds?: number | null;
  quoted_at?: number | null;
  expires_at?: number | null;
  payment_instructions?: {
    chain: {
      chain_namespace: "eip155";
      chain_id: number;
      display_name: string;
    };
    token_address: string;
    recipient_address: string;
    amount_atomic: string;
    amount_display: string;
  } | null;
  benefit_source?: "verified_reddit_username" | "reddit_reputation" | null;
  reputation_discount_cents?: number | null;
  claim_reason?: string | null;
};

export type NotificationFeedOptions = {
  cursor?: string | null;
  limit?: number | null;
};
