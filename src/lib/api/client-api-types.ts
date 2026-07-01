import type {
  Community,
  CommunityListing,
  CreateCommunityRequest,
  GatePolicy,
  CreateCommunityListingRequest,
  WalletIdentityPublicName,
  WalletIdentityResponse,
} from "@pirate/api-contracts";
import type { AnonymousIdentityScope, CommunityDefaultAgeGatePolicy } from "@/lib/community-access-types";

export type ApiCreateCommunityRequest = CreateCommunityRequest;

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

export type ApiWalletIdentityPublicName = WalletIdentityPublicName;
export type ApiWalletIdentityResponse = WalletIdentityResponse;

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

export type ApiDerivativeSourceKind = "song" | "video";
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
  has_event?: boolean | string | null;
  sort?: "best" | "new" | "top" | null;
};

export type ApiLiveRoomKind = "solo" | "duet";
export type ApiLiveRoomStatus = "scheduled" | "live" | "ended" | "canceled";
export type ApiLiveRoomAccessMode = "free" | "gated" | "paid";
export type ApiLiveRoomVisibility = "public" | "unlisted";
export type ApiLiveRoomSetlistStatus = "draft" | "ready" | "locked";
export type ApiLiveRoomRightsBasis = "original" | "licensed" | "cover" | "public_domain" | "unknown";
export type ApiLiveRoomRightsStatus = "pending" | "ready" | "blocked";
export type ApiLiveRoomGuestInviteStatus = "pending" | "accepted" | "revoked";

export type ApiCreateLiveRoomRequest = {
  title?: string | null;
  description?: string | null;
  room_kind?: ApiLiveRoomKind | null;
  access_mode?: ApiLiveRoomAccessMode | null;
  visibility?: ApiLiveRoomVisibility | null;
  guest_user?: string | null;
  event_start_at?: number | null;
  cover_ref?: string | null;
  store_url?: string | null;
  store_label?: string | null;
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

export type ApiPublishLiveRoomResponse = {
  room: ApiLiveRoom;
  listing: CommunityListing;
};

export type ApiLiveRoomAccessDecisionReason =
  | "not_live"
  | "ended"
  | "canceled"
  | "unlisted"
  | "membership_required"
  | "purchase_required"
  | "allowed";

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

export type ApiTelegramLinkedChatLinkMode = "invite_link" | "join_request";

export type ApiTelegramBotAdminStatus =
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

export type ApiTelegramLinkedChat = {
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

export type ApiAssistantContextMode = "live_sql" | "summary_cache" | "hybrid_vector";
export type ApiAssistantActionMode = "answer_only" | "draft_only" | "confirmed_writes";
export type ApiAssistantVoiceMode = "off" | "transcription_only" | "voice_replies" | "text_and_voice_replies";
export type ApiAssistantSttProvider = "elevenlabs" | "mistral" | "openai" | "none";
export type ApiAssistantTtsProvider = "elevenlabs" | "none";
export type ApiAssistantRetentionMode = "per_user_private" | "community_visible_to_mods" | "ephemeral";

export type ApiAssistantProviderKeyStatus =
  | { kind: "missing" }
  | { kind: "connected"; last4: string; connectedAt?: string }
  | { kind: "invalid"; last4: string; message: string };

export type ApiAssistantOpenRouterKeyStatus = ApiAssistantProviderKeyStatus;
export type ApiAssistantElevenLabsKeyStatus = ApiAssistantProviderKeyStatus;

export type ApiAssistantModelOption = {
  contextLength?: number;
  createdAt?: string;
  id: string;
  label: string;
  description?: string;
  inputCostUsdPerMillionTokens?: number;
  outputCostUsdPerMillionTokens?: number;
};

export type ApiAssistantContextSources = {
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

export type ApiCommunityAssistantPublicPolicy = {
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

export type ApiCommunityAssistantCredentialProvider = "openrouter" | "elevenlabs";

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

export type SongStudyExercise =
  | {
      id: string;
      type: "say_it_back";
      line_id: string;
      line_index: number;
      prompt_text: string;
      reference_text: string;
      translation_text?: string | null;
      max_attempts: number;
    }
  | {
      id: string;
      type: "translation_choice";
      line_id: string;
      line_index: number;
      prompt_text: string;
      question: string;
      options: Array<{ id: string; text: string }>;
      max_attempts: number;
    };

export type SongStudyPayload = {
  object: "song_study_payload";
  post_id: string;
  community_id: string;
  access: "ready" | "locked" | "processing" | "unavailable";
  title: string;
  artist_name?: string | null;
  artwork_src?: string | null;
  source_language?: string | null;
  target_language?: string | null;
  exercise_count: number;
  exercises: SongStudyExercise[];
  study_pack_version?: number;
  generated_at?: number;
  locked_reason?: "purchase_required" | "membership_required" | "age_required";
  unavailable_reason?: "not_song" | "no_lyrics" | "unsupported_language" | "generation_failed";
};

export type SongStudyAttemptRequest =
  | {
      idempotency_key: string;
      exercise_id: string;
      type: "say_it_back";
      attempt_number: number;
      transcript: string;
    }
  | {
      idempotency_key: string;
      exercise_id: string;
      type: "translation_choice";
      attempt_number: number;
      selected_option_id: string;
    };

export type SongStudyAttemptResult = {
  object: "song_study_attempt_result";
  exercise_id: string;
  outcome: "correct" | "incorrect" | "revealed";
  attempts_remaining: number;
  correct_option_id?: string;
  feedback?: {
    matched: string[];
    missing: string[];
    extra: string[];
  };
  next_review_hint?: "again" | "hard" | "good" | "easy";
};

export type SongStudyTranscriptionResponse = {
  object: "song_study_transcription";
  provider: "elevenlabs";
  model: string;
  text: string;
  confidence: number | null;
  language_code: string | null;
  language_probability: number | null;
  duration_seconds: number | null;
};
