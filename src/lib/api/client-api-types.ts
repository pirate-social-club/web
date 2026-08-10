import type {
  Community,
  CommunityListing,
  CreateCommunityRequest,
  CreateCommunityListingRequest,
  GatePolicy,
  RewardCampaignFundingQuote as ContractRewardCampaignFundingQuote,
  RewardQualificationSummary as ContractRewardQualificationSummary,
  SongStudyAttemptRequest as ContractSongStudyAttemptRequest,
  SongStudyAttemptResult as ContractSongStudyAttemptResult,
  SongStudyExercise as ContractSongStudyExercise,
  SongStudyPayload as ContractSongStudyPayload,
  SongStudyTranscriptionResponse,
} from "@pirate/api-contracts";
import type { AnonymousIdentityScope, CommunityDefaultAgeGatePolicy } from "@/lib/community-access-types";

export type ApiCreateCommunityRequest = CreateCommunityRequest;
export type {
  SongStudyTranscriptionResponse,
};

// Transitional additive contract used while the coordinated API contract PR is
// landing. Keep this structurally identical to the generated session schema so
// web CI remains independently typecheckable against the current package.
export type SongStudySessionSummary = {
  completed_exercise_count: number;
  due_count: number;
  first_pass_correct_count: number;
  id: string | null;
  mastered_exercise_count: number;
  max_presentations: number;
  next_due_at?: number;
  presentation_count: number;
  qualified: boolean;
  required_correct_count: number;
  served_count: number;
  status: "active" | "completed" | "caught_up" | "expired";
  total_units: number;
};

export type SongStudyExercise = ContractSongStudyExercise & {
  first_outcome: "correct" | "incorrect" | "revealed" | null;
  mastered: boolean;
  presentation_count: number;
};

export type SongStudyAttemptRequest = ContractSongStudyAttemptRequest & {
  session_id: string;
  transcription_language_code?: string;
  transcription_language_probability?: number;
};

export type SongStudyAttemptResult = ContractSongStudyAttemptResult & {
  session?: SongStudySessionSummary;
};

export type SongStudyPayload = Omit<ContractSongStudyPayload, "exercises" | "session"> & {
  exercises: SongStudyExercise[];
  session?: SongStudySessionSummary;
};

export type TelegramStudyVoiceIntent = {
  created: number;
  expires_at: number;
  id: string;
  object: "telegram_study_voice_intent";
  status: "pending";
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

type ApiRewardVerificationState = "unverified" | "verified" | "conflict";

export type ApiPublicRewardOffer = {
  campaign: string;
  chain_id: number;
  eligible_activity: "study" | "karaoke" | "either";
  daily_reward_cents: number;
  ends_at: number;
  min_score_bps: number;
};

// Transitional additive status used while the coordinated Core/API contract
// change lands. The API already returns operator_incident from confirmation.
export type ApiRewardCampaignFundingConfirmation = Omit<ContractRewardCampaignFundingQuote, "status"> & {
  status: ContractRewardCampaignFundingQuote["status"] | "operator_incident";
};

type ApiRewardEventKind =
  | "study_streak_day"
  | "study_streak_milestone_7"
  | "study_streak_milestone_30";

type ApiRewardEventSummary = {
  id: string;
  user_id: string;
  community_id: string;
  post_id: string;
  activity_date: string;
  reward_kind: ApiRewardEventKind;
  amount_cents: number;
  created_at: number;
};

export type ApiRewardQualificationSummary = ContractRewardQualificationSummary;

export type ApiRewardsSummaryResponse = {
  chain_id: number;
  balance_cents: number;
  today_earned_cents: number;
  recent_events: ApiRewardEventSummary[];
  recent_qualifications: ApiRewardQualificationSummary[];
  pending_verification: {
    count: number;
    conditional_cents: number;
    earliest_expires_at: number | null;
  };
  cashout: {
    eligible: boolean;
    min_cents: number;
    verification_state: ApiRewardVerificationState;
    verification_provider: "self" | "very" | null;
  };
  latest_in_flight_cashout: ApiRewardCashoutResponse["payout"] | null;
};

export type ApiRewardCashoutRequest = {
  amount_cents: number;
  idempotency_key: string;
  wallet_proof?: {
    type: "privy_access_token";
    privy_access_token: string;
    wallet_address?: string | null;
  } | null;
};

export type ApiRewardCashoutResponse = {
  chain_id: number;
  payout: {
    id: string;
    chain_id: number;
    amount_cents: number;
    recipient_address: string;
    status: "submitted" | "confirmed" | "failed";
    settlement_stage: "reserved" | "signed" | "broadcast" | "needs_review" | "confirmed" | "failed";
    settlement_ref: string | null;
    failure_reason: string | null;
  };
  balance_cents: number;
};

export type ApiSongArtifactUploadContentRequest = {
  content_base64: string;
};

export type ApiSongArtifactUploadPartSignedUrlResponse = {
  url: string;
  expires_at: string;
  part_number: number;
  part_size_bytes: number;
};

export type ApiSongArtifactUploadCompleteRequest = {
  upload_id: string;
  parts: Array<{ part_number: number; etag: string }>;
  content_hash?: string | null;
};

type ApiDerivativeSourceKind = "song" | "video";
export type ApiDerivativeSourceQueryKind = ApiDerivativeSourceKind | "live";
export type ApiDerivativeSourceScope = "community" | "global";

export type ApiDerivativeSource = {
  id: string;
  object: "derivative_source";
  community: string;
  asset: string;
  source_ref: string;
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
  store_url?: string | null;
  store_label?: string | null;
  country_code?: string | null;
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

type ApiDonationPartnerSummaryInput = {
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
  has_event?: boolean | string | null;
  sort?: "best" | "new" | "top" | null;
};

type ApiLiveRoomKind = "solo" | "duet";
type ApiLiveRoomStatus = "scheduled" | "live" | "ended" | "canceled";
type ApiLiveRoomAccessMode = "free" | "gated" | "paid";
type ApiLiveRoomVisibility = "public" | "unlisted";
type ApiLiveRoomSetlistStatus = "draft" | "ready" | "locked";
export type ApiLiveRoomRightsBasis = "original" | "licensed" | "cover" | "public_domain" | "unknown";
type ApiLiveRoomRightsStatus = "pending" | "ready" | "blocked";
type ApiLiveRoomGuestInviteStatus = "pending" | "accepted" | "revoked";
type ApiLiveRoomReplayDraftStatus = "not_recorded" | "processing" | "ready" | "review_pending" | "published" | "failed";
type ApiLiveRoomReplayAssetAccessMode = "free" | "included_with_ticket" | "paid";
type ApiLiveRoomReplayAssetPublicationStatus = "draft" | "published" | "failed";

type ApiLiveRoomAudienceGateSegment =
  | { type: "community_members" }
  | {
    type: "purchase_entitlement";
    entitlement_kind: "asset_access";
    target_refs: string[];
  };

type ApiLiveRoomAudienceGate = {
  version: 1;
  segments: ApiLiveRoomAudienceGateSegment[];
  match: "any";
};

export type ApiCreateLiveRoomRequest = {
  title?: string | null;
  description?: string | null;
  identity_mode?: "public" | "anonymous" | null;
  anonymous_scope?: "community_stable" | "thread_stable" | "post_ephemeral" | null;
  disclosed_qualifier_ids?: string[] | null;
  room_kind?: ApiLiveRoomKind | null;
  access_mode?: ApiLiveRoomAccessMode | null;
  visibility?: ApiLiveRoomVisibility | null;
  guest_user?: string | null;
  event_start_at?: number | null;
  cover_ref?: string | null;
  store_url?: string | null;
  store_label?: string | null;
  audience_gate?: ApiLiveRoomAudienceGate | null;
  recording_enabled?: boolean | null;
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

export type ApiPublishLiveRoomRequest = {
  room: ApiCreateLiveRoomRequest;
  listing: CreateCommunityListingRequest;
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
  audience_gate: ApiLiveRoomAudienceGate | null;
  title: string;
  description: string | null;
  cover_ref: string | null;
  store_url: string | null;
  store_label: string | null;
  event_start_at: number | null;
  live_started_at: number | null;
  ended_at: number | null;
  canceled_at: number | null;
  broadcast_ref: string | null;
  recording_enabled: boolean;
  replay_status: string;
  replay_asset_id?: string | null;
  replay_listing_id?: string | null;
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

export type ApiPublishLiveRoomResponse = {
  room: ApiLiveRoom;
  listing: CommunityListing;
};

export type ApiLiveRoomReplayDraft = {
  object: "live_room_replay_draft";
  live_room: string;
  recording_enabled: boolean;
  replay_status: string;
  status: ApiLiveRoomReplayDraftStatus;
  replay_asset: null | {
    id: string;
    object: "live_room_replay_asset";
    publication_status: ApiLiveRoomReplayAssetPublicationStatus | string;
    title: string;
    caption: string | null;
    duration_ms: number | null;
    preview_ref: string | null;
    access_mode: ApiLiveRoomReplayAssetAccessMode | string;
    locked_delivery_status: "none" | "requested" | "ready" | "failed" | string;
    published_at: string | null;
    allocations: Array<{
      id: string;
      participant_user: string | null;
      external_party_ref: string | null;
      role: string;
      share_bps: number;
      rights_basis: string;
      approval_status: "pending" | "approved" | "rejected" | string;
    }>;
  };
  recording: null | {
    id: string;
    provider: "agora" | string;
    status: string;
    failure_reason: string | null;
    raw_artifact: null | {
      provider: "filebase";
      ipfs_cid: string;
      mime_type: string;
      size_bytes: number;
    };
  };
};

export type ApiPublishLiveRoomReplayDraftRequest = {
  access_mode?: ApiLiveRoomReplayAssetAccessMode;
  listing?: CreateCommunityListingRequest | null;
};

export type ApiLiveRoomReplayAccessResponse = {
  live_room: string;
  replay_asset: string | null;
  replay_listing: CommunityListing | null;
  replay_status: string;
  access_mode: ApiLiveRoomReplayAssetAccessMode | null;
  locked_delivery_status: "none" | "requested" | "ready" | "failed" | string | null;
  access_granted: boolean;
  decision_reason:
    | "free"
    | "creator"
    | "moderator"
    | "purchase_entitlement"
    | "purchase_required"
    | "delivery_pending"
    | "not_published"
    | "not_available"
    | string;
  delivery_kind: "primary_content_ref" | "story_cdr_ref" | string | null;
  delivery_ref: string | null;
  story_cdr_access: null | {
    chain_id: number;
    rpc_url: string;
    cdr_contract_address: string;
    read_condition_address: string;
    ciphertext_ref: string;
    cipher_algorithm: string;
    cipher_iv_b64: string;
    mime_type: string;
    vault_uuid: number;
    namespace: string;
    access_scope: "asset.owner" | "asset.share" | string;
    access_ref: string;
    access_aux_data_hex?: string;
    access_proof: Record<string, unknown>;
  };
};

export type ApiUpdateLiveRoomReplayDraftRequest = {
  title?: string | null;
  caption?: string | null;
  preview_ref?: string | null;
  access_mode?: ApiLiveRoomReplayAssetAccessMode | null;
  allocations?: Array<{
    participant_user?: string | null;
    external_party_ref?: string | null;
    role?: string | null;
    share_bps?: number | null;
  }> | null;
};

type ApiLiveRoomAccessDecisionReason =
  | "not_live"
  | "ended"
  | "canceled"
  | "unlisted"
  | "membership_required"
  | "purchase_required"
  | "gate_unsatisfied"
  | "allowed";

type ApiLiveRoomGateAccessPayload = {
  failed_segments: Array<
    | { type: "community_members" }
    | {
      type: "purchase_entitlement";
      entitlement_kind: "asset_access";
      required_target_refs: string[];
      purchasable_listings?: Array<{
        listing: string;
        asset: string;
        price_cents: number;
        status: string;
      }>;
    }
  >;
} | null;

export type ApiLiveRoomAccessResponse = {
  room: ApiLiveRoom;
  access: {
    allowed: boolean;
    decision_reason: ApiLiveRoomAccessDecisionReason | null;
    access_mode: ApiLiveRoomAccessMode;
    visibility: ApiLiveRoomVisibility;
    listing: string | null;
    purchase_entitlement: string | null;
    guest_invite_status: ApiLiveRoomGuestInviteStatus | null;
    gate: ApiLiveRoomGateAccessPayload;
  };
};

export type ApiLiveRoomViewerAttachResponse = ApiLiveRoomAccessResponse & {
  runtime: {
    status: "attached";
    seat: "viewer";
    room_runtime_id: string;
  };
  agora: {
    app_id: string | null;
    channel: string;
    uid: number;
    token: string | null;
    token_expires_at: number | null;
    configured: boolean;
  };
};

export type ApiLiveRoomViewerRenewRequest = {
  uid: number;
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
    video_feed: boolean;
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

type ApiTelegramLinkedChatLinkMode = "invite_link" | "join_request";

type ApiTelegramBotAdminStatus =
  | "unknown"
  | "ready"
  | "missing"
  | "insufficient_permissions"
  | "left_chat";

export type ApiTelegramSetupIntent = {
  id: string;
  object: "telegram_setup_intent";
  community: string;
  status: "pending" | "completed" | "expired" | "canceled";
  expires_at: number;
  bot_start_parameter: string;
  bot_deep_link: string | null;
};

export type ApiTelegramCommunityBot = {
  id: string;
  object: "telegram_community_bot";
  community: string;
  status: "missing" | "connected" | "invalid";
  bot_username: string | null;
  bot_display_name: string | null;
  token_last4: string | null;
  webhook_status: "pending" | "active" | "failed" | "disabled" | null;
  connected_at: number | null;
};

type ApiTelegramLinkedChat = {
  id: string;
  object: "telegram_linked_chat";
  community: string;
  title: string;
  username: string | null;
  link_mode: ApiTelegramLinkedChatLinkMode;
  bot_admin_status: ApiTelegramBotAdminStatus;
  directory_visible: boolean;
  linked_at: number;
};

export type ApiCommunityTelegramChatSettings = {
  id: string;
  object: "community_telegram_chat_settings";
  community: string;
  linked_chat: ApiTelegramLinkedChat | null;
};

export type ApiCommunityTelegramChatSettingsUpdate = {
  link_mode?: ApiTelegramLinkedChatLinkMode;
  directory_visible?: boolean;
};

export type ApiTelegramChannelPublicationMode = "off" | "from_now" | "recent_backfill";

export type ApiTelegramChannelDestination = {
  id: string;
  object: "telegram_channel_destination";
  community: string;
  title: string;
  username: string | null;
  bot_admin_status: "ready";
  publication_mode: ApiTelegramChannelPublicationMode;
  linked_at: number;
};

export type ApiTelegramChannelUnlinkResponse = {
  id: string;
  object: "telegram_channel_destination";
  unlinked: true;
};

export type ApiTelegramChannelBackfillResponse = {
  enqueued: number;
};

type ApiAssistantContextMode = "live_sql" | "summary_cache" | "hybrid_vector";
type ApiAssistantActionMode = "answer_only" | "draft_only" | "confirmed_writes";
type ApiAssistantVoiceMode = "off" | "transcription_only" | "voice_replies" | "text_and_voice_replies";
type ApiAssistantSttProvider = "elevenlabs" | "mistral" | "openai" | "none";
type ApiAssistantTtsProvider = "elevenlabs" | "none";
type ApiAssistantRetentionMode = "per_user_private" | "community_visible_to_mods" | "ephemeral";

type ApiAssistantProviderKeyStatus =
  | { kind: "missing" }
  | { kind: "connected"; last4: string; connectedAt?: string }
  | { kind: "invalid"; last4: string; message: string };

export type ApiAssistantOpenRouterKeyStatus = ApiAssistantProviderKeyStatus;
export type ApiAssistantElevenLabsKeyStatus = ApiAssistantProviderKeyStatus;

type ApiAssistantModelOption = {
  contextLength?: number;
  createdAt?: string;
  id: string;
  label: string;
  description?: string;
  inputCostUsdPerMillionTokens?: number;
  outputCostUsdPerMillionTokens?: number;
};

type ApiAssistantContextSources = {
  communityProfile: boolean;
  rules: boolean;
  referenceLinks: boolean;
  recentThreads: boolean;
  threadBodies: boolean;
  topComments: boolean;
  membershipState: boolean;
  moderationQueue: boolean;
  pinnedKnowledge: boolean;
};

export type ApiCommunityAssistantPolicy = {
  object: "community_assistant_policy";
  community: string;
  policyOrigin: "default" | "explicit";
  enabled: boolean;
  displayName: string;
  shortBio: string;
  avatarRef: string | null;
  systemPrompt: string;
  defaultPrompt: string;
  starterPrompts: string[];
  openRouterKeyStatus: ApiAssistantOpenRouterKeyStatus;
  elevenLabsKeyStatus: ApiAssistantElevenLabsKeyStatus;
  selectedModelId: string;
  availableModels: ApiAssistantModelOption[];
  contextMode: ApiAssistantContextMode;
  contextSources: ApiAssistantContextSources;
  maxContextThreads: number;
  maxLookbackDays: number | null;
  memoryEnabled: boolean;
  retentionMode: ApiAssistantRetentionMode;
  retentionDays: number;
  saveChatsToCommunityDb: boolean;
  actionMode: ApiAssistantActionMode;
  requireModeratorApprovalForWrites: boolean;
  perUserDailyMessageCap: number | null;
  telegramPrivateAssistantEnabled: boolean;
  telegramPreviewEnabled: boolean;
  telegramPreviewDailyCap: number;
  voiceMode: ApiAssistantVoiceMode;
  sttProvider: ApiAssistantSttProvider;
  sttModel: string;
  ttsProvider: ApiAssistantTtsProvider;
  ttsVoice: string;
  includeInSovereignExport: boolean;
  createdAt: string;
  updatedAt: string;
};

type ApiCommunityAssistantPublicPolicy = {
  object: "community_assistant_policy_public";
  community: string;
  enabled: boolean;
  displayName: string;
  shortBio: string;
  avatarRef: string | null;
  defaultPrompt: string;
  starterPrompts: string[];
  voiceMode: ApiAssistantVoiceMode;
  sttProvider: ApiAssistantSttProvider;
  ttsProvider: ApiAssistantTtsProvider;
  ttsVoiceConfigured: boolean;
  elevenLabsKeyConfigured: boolean;
  voiceTranscriptionConfigured: boolean;
  voiceRepliesConfigured: boolean;
};

export type ApiCommunityAssistantPolicyResponse =
  | ApiCommunityAssistantPolicy
  | ApiCommunityAssistantPublicPolicy;

export type ApiCommunityAssistantPolicyUpdate = Partial<{
  enabled: boolean;
  displayName: string;
  shortBio: string;
  avatarRef: string | null;
  systemPrompt: string;
  defaultPrompt: string;
  starterPrompts: string[];
  selectedModelId: string;
  contextMode: ApiAssistantContextMode;
  contextSources: ApiAssistantContextSources;
  maxContextThreads: number;
  maxLookbackDays: number | null;
  memoryEnabled: boolean;
  retentionMode: ApiAssistantRetentionMode;
  retentionDays: number;
  saveChatsToCommunityDb: boolean;
  actionMode: ApiAssistantActionMode;
  requireModeratorApprovalForWrites: boolean;
  perUserDailyMessageCap: number | null;
  telegramPrivateAssistantEnabled: boolean;
  telegramPreviewEnabled: boolean;
  telegramPreviewDailyCap: number;
  voiceMode: ApiAssistantVoiceMode;
  sttProvider: ApiAssistantSttProvider;
  sttModel: string;
  ttsProvider: ApiAssistantTtsProvider;
  ttsVoice: string;
  includeInSovereignExport: boolean;
}>;

export type ApiCommunityKaraokePolicy = {
  community_id: string;
  karaoke_enabled: boolean;
  karaoke_scoring_enabled: boolean;
  karaoke_stt_provider: "assistant" | "elevenlabs" | "mistral" | "none" | "openai";
  karaoke_stt_model: string | null;
  karaoke_voice_coach_enabled: boolean;
  karaoke_audio_retention: "not_stored";
  updated_at: string | null;
};

export type ApiCommunityKaraokePolicyUpdate = Partial<{
  karaoke_enabled: boolean;
  karaoke_scoring_enabled: boolean;
  karaoke_stt_provider: "assistant" | "elevenlabs" | "mistral" | "none" | "openai";
  karaoke_stt_model: string | null;
  karaoke_voice_coach_enabled: boolean;
  karaoke_audio_retention: "not_stored";
}>;

export type ApiCommunityStudyPolicy = {
  community_id: string;
  study_enabled: boolean;
  updated_at: string | null;
};

export type ApiCommunityStudyPolicyUpdate = {
  study_enabled: boolean;
};

export type ApiCommunityAssistantCredentialResponse =
  | {
    object: "community_assistant_credential";
    provider: "openrouter";
    keyStatus: ApiAssistantOpenRouterKeyStatus;
    openRouterKeyStatus: ApiAssistantOpenRouterKeyStatus;
  }
  | {
    object: "community_assistant_credential";
    provider: "elevenlabs";
    keyStatus: ApiAssistantElevenLabsKeyStatus;
    elevenLabsKeyStatus: ApiAssistantElevenLabsKeyStatus;
  };

export type ApiCommunityAssistantModelList = {
  object: "list";
  data: ApiAssistantModelOption[];
};

export type ApiCommunityAssistantChat = {
  id: string;
  object: "community_assistant_chat";
  community: string;
  user: string;
  title: string | null;
  status: "active" | "archived" | "deleted";
  created_at: string;
  updated_at: string;
};

export type ApiCommunityAssistantMessage = {
  id: string;
  object: "community_assistant_message";
  chat: string;
  community: string;
  user: string;
  role: "user" | "assistant" | "system";
  content: string;
  model_id: string | null;
  provider_message_id: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  source: {
    kind: "voice";
    provider: "elevenlabs";
    model: string;
    confidence: number | null;
    language_code: string | null;
    language_probability: number | null;
    duration_seconds: number | null;
    audio_mime_type: string | null;
    audio_size_bytes: number | null;
    audio_retention: "not_stored";
  } | null;
  created_at: string;
};

export type ApiCommunityAssistantChatResponse = {
  object: "community_assistant_chat_response";
  chat: ApiCommunityAssistantChat;
  user_message: ApiCommunityAssistantMessage;
  assistant_message: ApiCommunityAssistantMessage;
};

export type ApiCommunityAssistantChatListResponse = {
  object: "list";
  data: ApiCommunityAssistantChat[];
};

export type ApiCommunityAssistantChatDetailResponse = {
  object: "community_assistant_chat_detail";
  chat: ApiCommunityAssistantChat;
  messages: ApiCommunityAssistantMessage[];
};

export type ApiCommunityAssistantTranscriptionResponse = {
  object: "community_assistant_transcription";
  provider: "elevenlabs";
  model: string;
  text: string;
  confidence: number | null;
  language_code: string | null;
  language_probability: number | null;
  duration_seconds: number | null;
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

export type KaraokeSessionCreateApiResponse = {
  id: string;
  object: "karaoke_session";
  attempt: string;
  protocol_version: number;
  websocket_url: string;
  token_expires_at: number;
  session_expires_at: number;
  scoring_policy: unknown;
};

type KaraokeLeaderboardIdentity = {
  visibility: "visible" | "anonymized";
  display_name: string | null;
  handle: string | null;
  avatar_ref: string | null;
};

export type KaraokeLeaderboardEntry = {
  rank: number;
  top_percent: number;
  score: number;
  reached_at: string;
  identity: KaraokeLeaderboardIdentity;
  is_viewer: boolean;
};

export type KaraokeSongLeaderboard = {
  object: "karaoke_song_leaderboard";
  post_id: string;
  community_id: string;
  scope: "all_time";
  period_start?: string | null;
  period_end?: string | null;
  karaoke_revision_id: string;
  scoring_version: number;
  scoring_provider: string;
  scoring_model: string;
  total_ranked: number;
  entries: KaraokeLeaderboardEntry[];
  viewer_rank: number | null;
  viewer_top_percent: number | null;
  viewer_best_score: number | null;
  viewer_best_reached_at: string | null;
  viewer_eligible_attempt_count: number;
};

export type ApiCommunityNamespaceAttachment = {
  namespace_verification: string;
  namespace_role: "primary" | "mirror";
  family: "hns" | "spaces";
  root_label: string;
  route_slug: string;
  verification_status: "verified" | "stale" | "expired" | "disputed";
  hns_setup_status?: "legacy_import_required" | "setup_complete" | "import_complete" | null;
  delegation?: {
    pirate_web_routing_allowed: boolean;
    pirate_subdomain_issuance_allowed: boolean;
    delegation_security: "unknown" | "unsecured" | "pending" | "secure" | "bogus" | "drifted";
    observation_fresh: boolean;
    routing_withheld_reason: string | null;
    signature_expiry_warning: boolean;
    canonical_routing_eligible?: boolean;
    routing_hard_denied?: boolean;
  } | null;
};

export type ApiCommunityNamespaceListResponse = {
  namespaces: ApiCommunityNamespaceAttachment[];
};
