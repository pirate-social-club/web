import type { CreateCommunityRequestBody } from "@/lib/create-community-flow";
import { readPublicRuntimeEnv } from "@/lib/public-runtime-env";

type VerificationProvider = "self" | "very";
type RequestedVerificationCapability = "unique_human" | "age_over_18" | "nationality" | "gender";
type VerificationIntent =
  | "profile_verification"
  | "community_creation"
  | "ucommunity_join"
  | "post_access_18_plus"
  | "commerce_pricing"
  | "qualifier_disclosure";
const PIRATE_ACCESS_TOKEN_STORAGE_KEY = "pirate.access_token";
export const PIRATE_ACCESS_TOKEN_EVENT = "pirate:access-token";

export type OnboardingStatus = {
  generated_handle_assigned: boolean;
  cleanup_rename_available: boolean;
  unique_human_verification_status: "not_started" | "pending" | "verified" | "expired" | "failed";
  namespace_verification_status: "not_started" | "pending" | "verified" | "stale" | "expired" | "disputed" | "failed";
  community_creation_ready: boolean;
  missing_requirements: string[];
  reddit_verification_status: "not_started" | "pending" | "verified" | "failed";
  reddit_import_status: "not_started" | "queued" | "running" | "succeeded" | "failed";
  suggested_community_ids?: string[];
};

export type PirateApiRedditVerification = {
  reddit_username: string;
  status: "pending" | "verified" | "failed" | "expired";
  verification_hint?: string | null;
  code_placement_surface?: "profile" | "bio" | "about" | null;
  last_checked_at?: string | null;
  failure_code?: "code_not_found" | "username_not_found" | "rate_limited" | "source_error" | null;
};

export type PirateApiRedditImportJobResponse = {
  job: {
    job_id: string;
    job_type: string;
    status: "queued" | "running" | "succeeded" | "failed";
    result_ref?: string | null;
  };
};

export type PirateApiRedditImportSummary = {
  reddit_username: string;
  imported_at: string;
  account_age_days?: number | null;
  global_karma?: number | null;
  top_subreddits: Array<{
    subreddit: string;
    karma?: number | null;
    posts?: number | null;
    rank_source?: "karma" | "posts" | "source_order" | null;
  }>;
  moderator_of: string[];
  inferred_interests: string[];
  suggested_communities: Array<{
    community_id: string;
    name: string;
    reason: string;
  }>;
  coverage_note?: string | null;
};

export type PirateApiGlobalHandleAvailability = {
  label: string;
  status: "available" | "taken" | "reserved" | "invalid";
  suggestion?: {
    label: string;
    source: "variation" | "generated";
  };
};

export type SessionExchangeResponse = {
  access_token: string;
  user: {
    user_id: string;
  };
  profile: {
    user_id: string;
    global_handle: {
      label: string;
    };
  };
  onboarding: OnboardingStatus;
  wallet_attachments: Array<{
    wallet_attachment_id: string;
    chain_namespace: string;
    wallet_address: string;
    is_primary: boolean;
  }>;
};

export type VerificationSessionResponse = {
  verification_session_id: string;
  provider: VerificationProvider;
  provider_mode?: "qr_deeplink" | "widget";
  status: "pending" | "verified" | "failed" | "expired";
  launch?: {
    mode: "qr_deeplink" | "widget";
    self_app?: {
      app_name?: string;
      logo_base64?: string | null;
      header?: string | null;
      endpoint?: string;
      endpoint_type?: string;
      scope?: string;
      session_id?: string;
      user_id?: string;
      user_id_type?: string;
      deeplink_callback?: string | null;
      version?: number | null;
      user_defined_data?: string | null;
      chain_id?: number | null;
      dev_mode?: boolean | null;
      disclosures?: {
        nationality?: boolean;
        minimum_age?: number | null;
        gender?: boolean;
      };
    };
    very_widget?: {
      app_id: string;
      context: string;
      type_id: string;
      query: string | Record<string, unknown>;
      verify_url: string;
    };
  } | null;
  callback_path?: string;
  attestation_id?: string | null;
  verified_at?: string | null;
  failure_reason?: string | null;
  expires_at?: string | null;
};

export type VerificationPolicyHint = {
  policy_id?: string | null;
  provider?: VerificationProvider;
  verification_intent?: VerificationIntent | null;
};

type ApiErrorBody = {
  code?: string;
  message?: string;
  details?: Record<string, unknown>;
};

export class PirateApiError extends Error {
  code?: string;
  details?: Record<string, unknown>;
  path: string;
  status: number;

  constructor(input: {
    code?: string;
    details?: Record<string, unknown>;
    message: string;
    path: string;
    status: number;
  }) {
    super(input.message);
    this.name = "PirateApiError";
    this.code = input.code;
    this.details = input.details;
    this.path = input.path;
    this.status = input.status;
  }
}

export type PirateApiCommunity = {
  community_id: string;
  display_name: string;
  description?: string | null;
  membership_mode: "open" | "request" | "gated";
  allow_anonymous_identity?: boolean;
  anonymous_identity_scope?: "community_stable" | "thread_stable" | "post_ephemeral" | null;
  default_age_gate_policy?: "none" | "18_plus";
  member_count?: number | null;
  qualified_member_count?: number | null;
  created_by_user_id?: string | null;
  created_at: string;
  gate_rules?: PirateApiCommunityGateRule[] | null;
  flair_policy?: {
    flair_enabled: boolean;
    definitions: Array<{
      flair_id: string;
      label: string;
      color_token?: string | null;
      status: "active" | "archived";
      position: number;
    }>;
  };
};

export type PirateApiCommunityGateProofRequirement = {
  proof_type?: string | null;
  accepted_providers?: string[] | null;
  accepted_mechanisms?: string[] | null;
  config?: Record<string, unknown> | null;
};

export type PirateApiCommunityGateRule = {
  gate_rule_id: string;
  community_id: string;
  scope: "membership" | "viewer" | "posting";
  gate_family: "token_holding" | "identity_proof";
  gate_type: string;
  proof_requirements?: PirateApiCommunityGateProofRequirement[] | null;
  chain_namespace?: string | null;
  gate_config?: Record<string, unknown> | null;
  status: "active" | "disabled";
  created_at: string;
  updated_at: string;
};

export type PirateApiCommunityProfile = {
  rules: Array<{
    rule_id: string;
    title: string;
    body: string;
    position: number;
    status: "active" | "archived";
  }>;
  resource_links: Array<{
    resource_link_id: string;
    label: string;
    url: string;
    resource_kind: "link" | "playlist" | "document" | "discord" | "website" | "other";
    position: number;
    status: "active" | "archived";
  }>;
};

export type PirateApiJoinCommunityResponse = {
  community_id: string;
  status: "joined" | "requested";
};

export type PirateApiCommunityReferenceLinkAdmin = {
  community_reference_link_id: string;
  community_id: string;
  platform:
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
  url: string;
  normalized_url: string;
  external_id: string | null;
  label: string | null;
  link_status: "active" | "archived";
  verification_applicability: "eligible" | "not_applicable";
  verification_state: "unverified" | "pending" | "verified" | "rejected" | "revoked" | null;
  verification_method: "bio_code" | "dns_txt" | "website_meta" | "website_file" | "manual_review" | null;
  verified_at: string | null;
  last_verification_checked_at: string | null;
  active_proof_id: string | null;
  metadata: {
    display_name?: string | null;
    image_url?: string | null;
    [key: string]: unknown;
  };
  position: number;
  created_at: string;
  updated_at: string;
};

export type PirateApiCommunityReferenceLinkListResponse = {
  items: PirateApiCommunityReferenceLinkAdmin[];
};

export type PirateApiCommunityFlairPolicy = {
  flair_enabled: boolean;
  require_flair_on_top_level_posts: boolean;
  definitions: Array<{
    flair_id: string;
    label: string;
    description: string | null;
    color_token: string | null;
    position: number;
    allowed_post_types: Array<"text" | "image" | "video" | "song"> | null;
    status: "active" | "archived";
  }>;
};

export type PirateApiUpdateCommunityRequest = {
  description?: string | null;
  membership_mode?: "open" | "request" | "gated";
  allow_anonymous_identity?: boolean;
  anonymous_identity_scope?: "community_stable" | "thread_stable" | "post_ephemeral" | null;
  default_age_gate_policy?: "none" | "18_plus";
};

export type PirateApiUpdateCommunityProfileRequest = {
  rules?: Array<{
    rule_id?: string;
    title?: string;
    body?: string;
    position?: number;
    status?: "active" | "archived";
  }>;
  resource_links?: Array<{
    resource_link_id?: string;
    label?: string;
    url?: string;
    resource_kind?: "link" | "playlist" | "document" | "discord" | "website" | "other";
    position?: number;
    status?: "active" | "archived";
  }>;
};

export type PirateApiUpdateCommunityFlairPolicyRequest = {
  flair_enabled?: boolean;
  require_flair_on_top_level_posts?: boolean;
  definitions?: Array<{
    flair_id?: string;
    label?: string;
    description?: string | null;
    color_token?: string | null;
    position?: number;
    allowed_post_types?: Array<"text" | "image" | "video" | "song"> | null;
    status?: "active" | "archived";
  }>;
};

export type PirateApiUpdateCommunityGateRuleRequest = {
  gate_rule_id?: string;
  scope?: "membership" | "viewer" | "posting";
  gate_family?: "token_holding" | "identity_proof";
  gate_type?: string;
  proof_requirements?: PirateApiCommunityGateProofRequirement[] | null;
  chain_namespace?: string | null;
  gate_config?: Record<string, unknown> | null;
  status?: "active" | "disabled";
};

export type PirateApiCommunityGateRuleListResponse = {
  gate_rules: PirateApiCommunityGateRule[];
};

export type PirateApiVerificationCapabilityState = {
  state: "unverified" | "pending" | "verified" | "expired";
  provider?: "self" | "very" | "passport" | null;
  proof_type?: string | null;
  mechanism?: string | null;
  verified_at?: string | null;
};

export type PirateApiVerificationCapabilities = {
  unique_human: PirateApiVerificationCapabilityState;
  age_over_18: PirateApiVerificationCapabilityState;
  nationality: PirateApiVerificationCapabilityState & {
    value?: string | null;
  };
  gender: PirateApiVerificationCapabilityState & {
    value?: "M" | "F" | null;
  };
  sanctions_clear: PirateApiVerificationCapabilityState;
  wallet_score: PirateApiVerificationCapabilityState & {
    score?: number | null;
    score_threshold?: number | null;
    passing_score?: boolean | null;
  };
};

export type PirateApiUser = {
  user_id: string;
  primary_wallet_attachment_id?: string | null;
  verification_state: "unverified" | "pending" | "verified" | "reverification_required";
  capability_provider?: "self" | "very" | null;
  verification_capabilities: PirateApiVerificationCapabilities;
  community_posting_state?: {
    community_ref: string;
    community_id: string;
    has_created_text_post: boolean;
  } | null;
  verified_at?: string | null;
  nationality?: string | null;
  created_at: string;
  updated_at: string;
};

export type PirateApiPost = {
  post_id: string;
  community_id: string;
  author_user_id?: string | null;
  authorship_mode?: "human_direct" | "user_agent";
  agent_id?: string | null;
  identity_mode: "public" | "anonymous";
  anonymous_scope?: "community_stable" | "thread_stable" | "post_ephemeral" | null;
  anonymous_label?: string | null;
  agent_display_name_snapshot?: string | null;
  agent_owner_handle_snapshot?: string | null;
  agent_ownership_provider_snapshot?: string | null;
  post_type: "text" | "image" | "video" | "link" | "song";
  status?: "draft" | "published" | "hidden" | "removed" | "deleted";
  title?: string | null;
  body?: string | null;
  caption?: string | null;
  link_url?: string | null;
  media_refs?: Array<{
    storage_ref?: string | null;
    gateway_url?: string | null;
    mime_type?: string | null;
  }> | null;
  creator_relation?: "captured" | "created" | "subject" | "authorized_repost" | "fan_work" | "found" | null;
  source_language?: string | null;
  translation_policy?: "none" | "machine_allowed" | "human_only" | "hybrid" | null;
  asset_id?: string | null;
  song_artifact_bundle_id?: string | null;
  parent_post_id?: string | null;
  song_mode?: "original" | "remix" | null;
  rights_basis?: "none" | "original" | "derivative" | "attribution_only" | null;
  upstream_asset_refs?: string[] | null;
  analysis_state?: "pending" | "allow" | "allow_with_required_reference" | "review_required" | "blocked";
  analysis_result_ref?: string | null;
  content_safety_state?: "pending" | "safe" | "sensitive" | "adult";
  age_gate_policy?: "none" | "18_plus";
  created_at: string;
  updated_at?: string;
};

export type PirateApiLocalizedPostResponse = {
  post: PirateApiPost;
  upvote_count: number;
  downvote_count: number;
  viewer_vote?: 1 | -1 | null;
  translated_body?: string | null;
};

export type PirateApiPostListResponse = {
  items: PirateApiLocalizedPostResponse[];
  next_cursor: string | null;
};

export type PirateApiCommunityListResponse = {
  items: PirateApiCommunity[];
  next_cursor: string | null;
};

export type PirateApiFeedItem = PirateApiLocalizedPostResponse & {
  like_count?: number;
  viewer_reaction_kinds?: string[];
  resolved_locale?: string;
  translation_state?: "ready" | "pending" | "same_language" | "policy_blocked";
  machine_translated?: boolean;
  translated_caption?: string | null;
  source_hash?: string;
};

export type PirateApiFeedResponse = {
  items: PirateApiFeedItem[];
  next_cursor: string | null;
};

export type PirateApiModerationSignalSeverity = "low" | "medium" | "high";
export type PirateApiModerationCaseStatus = "open" | "resolved";
export type PirateApiModerationQueueScope = "community" | "platform";
export type PirateApiModerationCaseOpenedBy = "platform_analysis" | "user_report" | "mixed";
export type PirateApiUserReportReasonCode =
  | "spam"
  | "harassment"
  | "hate"
  | "sexual_content"
  | "graphic_content"
  | "misleading"
  | "other";
export type PirateApiModerationActionType = "dismiss" | "hide" | "remove" | "restore" | "age_gate";

export type PirateApiCreateUserReportRequest = {
  reason_code: PirateApiUserReportReasonCode;
  note?: string | null;
};

export type PirateApiUserReport = {
  user_report_id: string;
  community_id: string;
  post_id: string;
  reporter_user_id: string;
  reason_code: PirateApiUserReportReasonCode;
  note: string | null;
  created_at: string;
};

export type PirateApiModerationSignal = {
  moderation_signal_id: string;
  community_id: string;
  post_id: string;
  moderation_case_id: string | null;
  analysis_result_ref: string | null;
  source: "platform_analysis";
  signal_type: string;
  severity: PirateApiModerationSignalSeverity;
  provider: string;
  provider_label: string;
  evidence_ref: string | null;
  created_at: string;
};

export type PirateApiModerationAction = {
  moderation_action_id: string;
  moderation_case_id: string;
  community_id: string;
  post_id: string;
  actor_user_id: string;
  action_type: PirateApiModerationActionType;
  note: string | null;
  previous_post_status: PirateApiPost["status"] | null;
  next_post_status: PirateApiPost["status"] | null;
  previous_age_gate_policy: PirateApiPost["age_gate_policy"] | null;
  next_age_gate_policy: PirateApiPost["age_gate_policy"] | null;
  created_at: string;
};

export type PirateApiModerationCase = {
  moderation_case_id: string;
  community_id: string;
  post_id: string;
  status: PirateApiModerationCaseStatus;
  queue_scope: PirateApiModerationQueueScope;
  priority: PirateApiModerationSignalSeverity;
  opened_by: PirateApiModerationCaseOpenedBy;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

export type PirateApiModerationCaseListResponse = {
  items: PirateApiModerationCase[];
};

export type PirateApiModerationCaseDetail = {
  case: PirateApiModerationCase;
  post: PirateApiPost;
  signals: PirateApiModerationSignal[];
  reports: PirateApiUserReport[];
  actions: PirateApiModerationAction[];
};

export type PirateApiCreateModerationActionRequest = {
  action_type: PirateApiModerationActionType;
  note?: string | null;
};

export type PirateApiProfile = {
  user_id: string;
  display_name?: string | null;
  avatar_ref?: string | null;
  bio?: string | null;
  preferred_locale?: string | null;
  primary_wallet_address?: string | null;
  global_handle: {
    label: string;
    tier: "generated" | "standard" | "premium";
    status: "active" | "redirect" | "retired";
    issuance_source:
      | "generated_signup"
      | "free_cleanup_rename"
      | "reddit_verified_claim"
      | "paid_upgrade"
      | "admin_grant";
    redirect_target_global_handle_id?: string | null;
    price_paid_usd?: number | null;
    free_rename_consumed?: boolean;
    issued_at: string;
    replaced_at?: string | null;
  };
  created_at: string;
  updated_at: string;
};

export type PirateApiCreatePostRequest = {
  idempotency_key: string;
  identity_mode?: "public" | "anonymous";
  anonymous_scope?: "community_stable" | "thread_stable" | "post_ephemeral" | null;
  disclosed_qualifier_ids?: string[] | null;
} & (
  | {
      post_type: "text";
      title?: string | null;
      body?: string | null;
    }
  | {
      post_type: "link";
      title?: string | null;
      body?: string | null;
      link_url: string;
    }
  | {
      post_type: "song";
      title?: string | null;
      caption?: string | null;
      identity_mode: "public";
      access_mode?: "public" | "locked" | null;
      song_artifact_bundle_id: string;
      song_mode?: "original" | "remix" | null;
      rights_basis?: "none" | "original" | "derivative" | "attribution_only" | null;
      upstream_asset_refs?: string[] | null;
    }
);

export type PirateApiSongArtifactUploadRequest = {
  artifact_kind: "primary_audio" | "cover_art" | "preview_audio" | "canvas_video" | "instrumental_audio" | "vocal_audio";
  mime_type: string;
  filename?: string | null;
  size_bytes?: number | null;
  content_hash?: string | null;
};

export type PirateApiSongArtifactUploadRef = {
  storage_ref: string;
  mime_type: string;
  size_bytes?: number | null;
  content_hash?: string | null;
  duration_ms?: number | null;
};

export type PirateApiSongArtifactBundleRequest = {
  primary_audio: PirateApiSongArtifactUploadRef;
  lyrics: string;
  cover_art?: PirateApiSongArtifactUploadRef | null;
  preview_audio?: PirateApiSongArtifactUploadRef | null;
  canvas_video?: PirateApiSongArtifactUploadRef | null;
  instrumental_audio?: PirateApiSongArtifactUploadRef | null;
  vocal_audio?: PirateApiSongArtifactUploadRef | null;
};

export type PirateApiSongArtifactUpload = {
  song_artifact_upload_id: string;
  community_id: string;
  uploader_user_id: string;
  artifact_kind: "primary_audio" | "cover_art" | "preview_audio" | "canvas_video" | "instrumental_audio" | "vocal_audio";
  status: "pending_upload" | "uploaded" | "failed";
  storage_ref: string;
  mime_type: string;
  filename?: string | null;
  size_bytes?: number | null;
  content_hash?: string | null;
  storage_provider?: "filebase" | "local_stub" | null;
  storage_bucket?: string | null;
  storage_object_key?: string | null;
  storage_endpoint?: string | null;
  gateway_url?: string | null;
  upload_url: string;
  created_at: string;
  updated_at: string;
};

export type PirateApiSongArtifactBundle = {
  song_artifact_bundle_id: string;
  community_id: string;
  creator_user_id: string;
  status: "draft" | "validating" | "ready" | "consuming" | "consumed" | "failed";
  primary_audio: PirateApiSongArtifactUploadRef;
  media_refs: Array<{
    storage_ref?: string | null;
    gateway_url?: string | null;
    mime_type?: string | null;
  }>;
  lyrics: string;
  lyrics_sha256: string;
  cover_art?: PirateApiSongArtifactUploadRef | null;
  created_at: string;
  updated_at: string;
};

function resolveApiBaseUrl(): string {
  const configured = readPublicRuntimeEnv().VITE_PIRATE_API_BASE_URL;
  if (configured) {
    return configured.replace(/\/+$/u, "");
  }

  return typeof window !== "undefined" ? window.location.origin : "";
}

export function resolveApiHref(pathOrUrl: string): string {
  if (/^https?:\/\//u.test(pathOrUrl)) {
    return pathOrUrl;
  }

  return `${resolveApiBaseUrl()}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

async function parseJson<T>(response: Response): Promise<T> {
  return await response.json() as T;
}

function buildRequestHeaders(init?: RequestInit): Headers {
  const headers = new Headers(init?.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return headers;
}

function readStoredPirateAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(PIRATE_ACCESS_TOKEN_STORAGE_KEY)?.trim();
  return stored || null;
}

function isRecoverablePirateSessionError(input: {
  error: ApiErrorBody | null;
  headers: Headers;
  path: string;
  status: number;
}): boolean {
  if (!input.headers.get("authorization")?.startsWith("Bearer ")) {
    return false;
  }

  if (input.path === "/auth/session/exchange") {
    return false;
  }

  if (input.status === 401 || input.status === 403) {
    return true;
  }

  if (input.status !== 500) {
    return false;
  }

  const message = String(input.error?.message || "");
  return message.includes("Resolved user row is missing")
    || message.includes("FOREIGN KEY constraint failed");
}

async function waitForPirateAccessTokenRefresh(previousToken: string, timeoutMs = 5000): Promise<string | null> {
  if (typeof window === "undefined") {
    return null;
  }

  const current = readStoredPirateAccessToken();
  if (current && current !== previousToken) {
    return current;
  }

  return await new Promise((resolve) => {
    const finish = (token: string | null) => {
      window.clearTimeout(timeoutId);
      window.removeEventListener(PIRATE_ACCESS_TOKEN_EVENT, checkToken);
      window.removeEventListener("storage", checkToken);
      resolve(token);
    };

    const checkToken = () => {
      const next = readStoredPirateAccessToken();
      if (next && next !== previousToken) {
        finish(next);
      }
    };

    const timeoutId = window.setTimeout(() => {
      finish(null);
    }, timeoutMs);

    window.addEventListener(PIRATE_ACCESS_TOKEN_EVENT, checkToken);
    window.addEventListener("storage", checkToken);
  });
}

async function recoverPirateSession(previousToken: string): Promise<string | null> {
  storePirateAccessToken(null);
  return await waitForPirateAccessTokenRefresh(previousToken);
}

async function request<T>(path: string, init?: RequestInit, allowRecovery = true): Promise<T> {
  const headers = buildRequestHeaders(init);
  const response = await fetch(`${resolveApiBaseUrl()}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const error = await parseJson<ApiErrorBody>(response).catch(() => null);
    const authorization = headers.get("authorization");
    const previousToken = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length).trim()
      : null;

    if (
      allowRecovery
      && previousToken
      && isRecoverablePirateSessionError({
        error,
        headers,
        path,
        status: response.status,
      })
    ) {
      if (import.meta.env.DEV) {
        console.info("[pirate-api] stale-session:recover:start", {
          message: error?.message ?? null,
          path,
          status: response.status,
        });
      }
      const refreshedToken = await recoverPirateSession(previousToken);
      if (refreshedToken) {
        if (import.meta.env.DEV) {
          console.info("[pirate-api] stale-session:recover:success", { path });
        }
        headers.set("authorization", `Bearer ${refreshedToken}`);
        return request<T>(path, {
          ...init,
          headers,
        }, false);
      }
      if (import.meta.env.DEV) {
        console.info("[pirate-api] stale-session:recover:timeout", { path });
      }
    }

    throw new PirateApiError({
      code: error?.code,
      details: error?.details,
      message: error?.message ?? `Request failed with status ${response.status}`,
      path,
      status: response.status,
    });
  }

  return parseJson<T>(response);
}

export function getApiBaseUrl() {
  return resolveApiBaseUrl();
}

function readTokenFromQuery(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const token = new URLSearchParams(window.location.search).get("pirate_access_token")?.trim();
  return token || null;
}

export function storePirateAccessToken(token: string | null | undefined) {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = token?.trim();
  if (!normalized) {
    window.localStorage.removeItem(PIRATE_ACCESS_TOKEN_STORAGE_KEY);
    window.dispatchEvent(new Event(PIRATE_ACCESS_TOKEN_EVENT));
    return;
  }

  window.localStorage.setItem(PIRATE_ACCESS_TOKEN_STORAGE_KEY, normalized);
  window.dispatchEvent(new Event(PIRATE_ACCESS_TOKEN_EVENT));
}

export function readPirateAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const queryToken = readTokenFromQuery();
  if (queryToken) {
    storePirateAccessToken(queryToken);
    return queryToken;
  }

  const stored = window.localStorage.getItem(PIRATE_ACCESS_TOKEN_STORAGE_KEY)?.trim();
  return stored || null;
}

function requirePirateAccessToken(accessToken?: string | null): string {
  const resolved = accessToken?.trim() || readPirateAccessToken();
  if (!resolved) {
    throw new Error("No Pirate session");
  }
  return resolved;
}

export async function exchangePrivySession(input: {
  accessToken: string;
  identityToken: string | null;
}): Promise<SessionExchangeResponse> {
  return request<SessionExchangeResponse>("/auth/session/exchange", {
    method: "POST",
    body: JSON.stringify({
      proof: {
        type: "privy_access_token",
        privy_access_token: input.accessToken,
        privy_identity_token: input.identityToken,
      },
    }),
  });
}

export async function getOnboardingStatus(accessToken: string): Promise<OnboardingStatus> {
  return request<OnboardingStatus>("/onboarding/status", {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function startOrCheckRedditVerification(input: {
  accessToken?: string | null;
  redditUsername: string;
}): Promise<PirateApiRedditVerification> {
  return request<PirateApiRedditVerification>("/onboarding/reddit-verification", {
    method: "POST",
    headers: {
      authorization: `Bearer ${requirePirateAccessToken(input.accessToken)}`,
    },
    body: JSON.stringify({
      reddit_username: input.redditUsername,
    }),
  });
}

export async function startRedditImport(input: {
  accessToken?: string | null;
  redditUsername: string;
}): Promise<PirateApiRedditImportJobResponse> {
  return request<PirateApiRedditImportJobResponse>("/onboarding/reddit-imports", {
    method: "POST",
    headers: {
      authorization: `Bearer ${requirePirateAccessToken(input.accessToken)}`,
    },
    body: JSON.stringify({
      reddit_username: input.redditUsername,
    }),
  });
}

export async function getLatestRedditImportSummary(input?: {
  accessToken?: string | null;
}): Promise<PirateApiRedditImportSummary> {
  return request<PirateApiRedditImportSummary>("/onboarding/reddit-imports/latest", {
    headers: {
      authorization: `Bearer ${requirePirateAccessToken(input?.accessToken)}`,
    },
  });
}

export async function getGlobalHandleAvailability(input: {
  accessToken?: string | null;
  label: string;
}): Promise<PirateApiGlobalHandleAvailability> {
  const query = new URLSearchParams({
    label: input.label,
  }).toString();
  return request<PirateApiGlobalHandleAvailability>(`/onboarding/global-handle-availability?${query}`, {
    headers: {
      authorization: `Bearer ${requirePirateAccessToken(input.accessToken)}`,
    },
  });
}

export async function renameGlobalHandle(input: {
  accessToken?: string | null;
  desiredLabel: string;
}): Promise<PirateApiProfile["global_handle"]> {
  return request<PirateApiProfile["global_handle"]>("/profiles/me/global-handle/rename", {
    method: "POST",
    headers: {
      authorization: `Bearer ${requirePirateAccessToken(input.accessToken)}`,
    },
    body: JSON.stringify({
      desired_label: input.desiredLabel,
    }),
  });
}

export async function authorizeDeviceSession(input: {
  deviceSessionId: string;
  userCode: string;
  accessToken: string;
}) {
  return request<{ status: string; device_session_id: string }>(`/auth/device-sessions/${encodeURIComponent(input.deviceSessionId)}/authorize`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.accessToken}`,
    },
    body: JSON.stringify({
      user_code: input.userCode,
    }),
  });
}

export async function startVerificationSession(input: {
  provider: VerificationProvider;
  accessToken: string;
  verificationIntent?: VerificationIntent;
  requestedCapabilities?: RequestedVerificationCapability[];
  policyId?: string | null;
}): Promise<VerificationSessionResponse> {
  return request<VerificationSessionResponse>("/verification-sessions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.accessToken}`,
    },
    body: JSON.stringify({
      provider: input.provider,
      verification_intent: input.verificationIntent ?? "profile_verification",
      requested_capabilities: input.requestedCapabilities ?? ["unique_human"],
      policy_id: input.policyId ?? null,
    }),
  });
}

export async function getVerificationSession(input: {
  verificationSessionId: string;
  accessToken: string;
}): Promise<VerificationSessionResponse> {
  return request<VerificationSessionResponse>(`/verification-sessions/${encodeURIComponent(input.verificationSessionId)}`, {
    headers: {
      authorization: `Bearer ${input.accessToken}`,
    },
  });
}

export async function completeVerificationSession(input: {
  verificationSessionId: string;
  accessToken: string;
  proof?: string | null;
}) {
  return request<VerificationSessionResponse>(`/verification-sessions/${encodeURIComponent(input.verificationSessionId)}/complete`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.accessToken}`,
    },
    body: JSON.stringify({
      proof: input.proof ?? null,
    }),
  });
}

export async function getCommunityById(input: {
  communityId: string;
  accessToken?: string | null;
  signal?: AbortSignal;
}): Promise<PirateApiCommunity> {
  const token = input.accessToken?.trim() || readPirateAccessToken();
  return request<PirateApiCommunity>(`/communities/${encodeURIComponent(input.communityId)}`, {
    signal: input.signal,
    headers: token ? {
      authorization: `Bearer ${token}`,
    } : undefined,
  });
}

export async function joinCommunity(input: {
  communityId: string;
  accessToken?: string | null;
  signal?: AbortSignal;
}): Promise<PirateApiJoinCommunityResponse> {
  return request<PirateApiJoinCommunityResponse>(`/communities/${encodeURIComponent(input.communityId)}/join`, {
    method: "POST",
    signal: input.signal,
    headers: {
      authorization: `Bearer ${requirePirateAccessToken(input.accessToken)}`,
    },
  });
}

export async function listCommunities(input?: {
  accessToken?: string | null;
  signal?: AbortSignal;
}): Promise<PirateApiCommunityListResponse> {
  return request<PirateApiCommunityListResponse>("/communities", {
    signal: input?.signal,
    headers: {
      authorization: `Bearer ${requirePirateAccessToken(input?.accessToken)}`,
    },
  });
}

export async function listDiscoverableCommunities(input?: {
  accessToken?: string | null;
  signal?: AbortSignal;
}): Promise<PirateApiCommunityListResponse> {
  const token = input?.accessToken?.trim() || readPirateAccessToken();

  return request<PirateApiCommunityListResponse>("/communities/discover", {
    signal: input?.signal,
    headers: token
      ? {
          authorization: `Bearer ${token}`,
        }
      : undefined,
  });
}

export async function updateCommunity(input: {
  communityId: string;
  body: PirateApiUpdateCommunityRequest;
  accessToken?: string | null;
  signal?: AbortSignal;
}): Promise<PirateApiCommunity> {
  return request<PirateApiCommunity>(`/communities/${encodeURIComponent(input.communityId)}`, {
    method: "PATCH",
    signal: input.signal,
    headers: {
      authorization: `Bearer ${requirePirateAccessToken(input.accessToken)}`,
    },
    body: JSON.stringify(input.body),
  });
}

export async function getCommunityByNamespaceLabel(input: {
  namespaceLabel: string;
  accessToken?: string | null;
  signal?: AbortSignal;
}): Promise<PirateApiCommunity> {
  const token = input.accessToken?.trim() || readPirateAccessToken();
  return request<PirateApiCommunity>(`/communities/by-namespace/${encodeURIComponent(input.namespaceLabel)}`, {
    signal: input.signal,
    headers: token ? {
      authorization: `Bearer ${token}`,
    } : undefined,
  });
}

export async function getCommunityPosts(input: {
  communityId: string;
  accessToken?: string | null;
  signal?: AbortSignal;
}): Promise<PirateApiPostListResponse> {
  const token = input.accessToken?.trim() || readPirateAccessToken();
  return request<PirateApiPostListResponse>(`/communities/${encodeURIComponent(input.communityId)}/posts`, {
    signal: input.signal,
    headers: token ? {
      authorization: `Bearer ${token}`,
    } : undefined,
  });
}

export async function getHomeFeed(input?: {
  accessToken?: string | null;
  signal?: AbortSignal;
}): Promise<PirateApiFeedResponse> {
  const token = input?.accessToken?.trim() || readPirateAccessToken();

  return request<PirateApiFeedResponse>("/feeds/home", {
    signal: input?.signal,
    headers: token
      ? {
          authorization: `Bearer ${token}`,
        }
      : undefined,
  });
}

export async function getYourCommunitiesFeed(input?: {
  accessToken?: string | null;
  signal?: AbortSignal;
}): Promise<PirateApiFeedResponse> {
  return request<PirateApiFeedResponse>("/feeds/your-communities", {
    signal: input?.signal,
    headers: {
      authorization: `Bearer ${requirePirateAccessToken(input?.accessToken)}`,
    },
  });
}

export async function getCommunityProfile(input: {
  communityId: string;
  accessToken?: string | null;
  signal?: AbortSignal;
}): Promise<PirateApiCommunityProfile> {
  return request<PirateApiCommunityProfile>(
    `/communities/${encodeURIComponent(input.communityId)}/community-profile`,
    {
      signal: input.signal,
      headers: {
        authorization: `Bearer ${requirePirateAccessToken(input.accessToken)}`,
      },
    },
  );
}

export async function updateCommunityProfile(input: {
  communityId: string;
  body: PirateApiUpdateCommunityProfileRequest;
  accessToken?: string | null;
  signal?: AbortSignal;
}): Promise<PirateApiCommunityProfile> {
  return request<PirateApiCommunityProfile>(
    `/communities/${encodeURIComponent(input.communityId)}/community-profile`,
    {
      method: "PATCH",
      signal: input.signal,
      headers: {
        authorization: `Bearer ${requirePirateAccessToken(input.accessToken)}`,
      },
      body: JSON.stringify(input.body),
    },
  );
}

export async function listCommunityReferenceLinks(input: {
  communityId: string;
  accessToken?: string | null;
  signal?: AbortSignal;
}): Promise<PirateApiCommunityReferenceLinkListResponse> {
  return request<PirateApiCommunityReferenceLinkListResponse>(
    `/communities/${encodeURIComponent(input.communityId)}/reference-links`,
    {
      signal: input.signal,
      headers: {
        authorization: `Bearer ${requirePirateAccessToken(input.accessToken)}`,
      },
    },
  );
}

export async function getCommunityFlairPolicy(input: {
  communityId: string;
  accessToken?: string | null;
  signal?: AbortSignal;
}): Promise<PirateApiCommunityFlairPolicy> {
  return request<PirateApiCommunityFlairPolicy>(
    `/communities/${encodeURIComponent(input.communityId)}/flairs`,
    {
      signal: input.signal,
      headers: {
        authorization: `Bearer ${requirePirateAccessToken(input.accessToken)}`,
      },
    },
  );
}

export async function updateCommunityFlairPolicy(input: {
  communityId: string;
  body: PirateApiUpdateCommunityFlairPolicyRequest;
  accessToken?: string | null;
  signal?: AbortSignal;
}): Promise<PirateApiCommunityFlairPolicy> {
  return request<PirateApiCommunityFlairPolicy>(
    `/communities/${encodeURIComponent(input.communityId)}/flairs`,
    {
      method: "PATCH",
      signal: input.signal,
      headers: {
        authorization: `Bearer ${requirePirateAccessToken(input.accessToken)}`,
      },
      body: JSON.stringify(input.body),
    },
  );
}

export async function listCommunityGateRules(input: {
  communityId: string;
  accessToken?: string | null;
  signal?: AbortSignal;
}): Promise<PirateApiCommunityGateRuleListResponse> {
  return request<PirateApiCommunityGateRuleListResponse>(
    `/communities/${encodeURIComponent(input.communityId)}/gate-rules`,
    {
      signal: input.signal,
      headers: {
        authorization: `Bearer ${requirePirateAccessToken(input.accessToken)}`,
      },
    },
  );
}

export async function upsertCommunityGateRule(input: {
  communityId: string;
  body: PirateApiUpdateCommunityGateRuleRequest;
  accessToken?: string | null;
  signal?: AbortSignal;
}): Promise<PirateApiCommunityGateRule> {
  return request<PirateApiCommunityGateRule>(
    `/communities/${encodeURIComponent(input.communityId)}/gate-rules`,
    {
      method: "POST",
      signal: input.signal,
      headers: {
        authorization: `Bearer ${requirePirateAccessToken(input.accessToken)}`,
      },
      body: JSON.stringify(input.body),
    },
  );
}

export async function getPostById(input: {
  postId: string;
  accessToken?: string | null;
  signal?: AbortSignal;
}): Promise<PirateApiLocalizedPostResponse> {
  return request<PirateApiLocalizedPostResponse>(`/posts/${encodeURIComponent(input.postId)}`, {
    signal: input.signal,
    headers: {
      authorization: `Bearer ${requirePirateAccessToken(input.accessToken)}`,
    },
  });
}

export async function getCurrentUser(input?: {
  accessToken?: string | null;
  communityRef?: string | null;
  signal?: AbortSignal;
}): Promise<PirateApiUser> {
  const params = input?.communityRef
    ? `?community_ref=${encodeURIComponent(input.communityRef)}`
    : "";

  return request<PirateApiUser>(`/users/me${params}`, {
    signal: input?.signal,
    headers: {
      authorization: `Bearer ${requirePirateAccessToken(input?.accessToken)}`,
    },
  });
}

export async function getCurrentProfile(input?: {
  accessToken?: string | null;
}): Promise<PirateApiProfile> {
  return request<PirateApiProfile>("/profiles/me", {
    headers: {
      authorization: `Bearer ${requirePirateAccessToken(input?.accessToken)}`,
    },
  });
}

export async function getProfileById(input: {
  userId: string;
  accessToken?: string | null;
  signal?: AbortSignal;
}): Promise<PirateApiProfile> {
  return request<PirateApiProfile>(`/profiles/${encodeURIComponent(input.userId)}`, {
    signal: input.signal,
    headers: {
      authorization: `Bearer ${requirePirateAccessToken(input.accessToken)}`,
    },
  });
}

export type NamespaceVerificationSessionResponse = {
  namespace_verification_session_id: string;
  namespace_verification_id: string | null;
  user_id: string;
  family: "hns" | "spaces";
  submitted_root_label: string;
  normalized_root_label: string;
  status:
    | "draft"
    | "inspecting"
    | "dns_setup_required"
    | "challenge_required"
    | "challenge_pending"
    | "verified"
    | "failed"
    | "expired";
  challenge_kind: string | null;
  challenge_payload: Record<string, unknown> | null;
  challenge_host: string | null;
  challenge_txt_value: string | null;
  challenge_expires_at: string | null;
  assertions: {
    root_exists: boolean | null;
    root_control_verified: boolean | null;
    expiry_horizon_sufficient: boolean | null;
    routing_enabled: boolean | null;
    pirate_dns_authority_verified: boolean | null;
  };
  capabilities: {
    club_attach_allowed: boolean | null;
    pirate_web_routing_allowed: boolean | null;
    pirate_subdomain_issuance_allowed: boolean | null;
  };
  control_class: string | null;
  operation_class: string | null;
  failure_reason: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
};

export async function startNamespaceVerificationSession(input: {
  accessToken: string;
  family?: "hns" | "spaces";
  rootLabel: string;
}): Promise<NamespaceVerificationSessionResponse> {
  return request<NamespaceVerificationSessionResponse>("/namespace-verification-sessions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.accessToken}`,
    },
    body: JSON.stringify({
      family: input.family ?? "hns",
      root_label: input.rootLabel,
    }),
  });
}

export async function completeNamespaceVerificationSession(input: {
  namespaceVerificationSessionId: string;
  accessToken: string;
  restartChallenge?: boolean;
  signaturePayload?: {
    signature: string;
    algorithm?: string | null;
    signer_pubkey?: string | null;
    digest?: string | null;
  };
}): Promise<NamespaceVerificationSessionResponse> {
  return request<NamespaceVerificationSessionResponse>(
    `/namespace-verification-sessions/${encodeURIComponent(input.namespaceVerificationSessionId)}/complete`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${input.accessToken}`,
      },
      body: JSON.stringify({
        restart_challenge: input.restartChallenge ?? false,
        signature_payload: input.signaturePayload ?? null,
      }),
    },
  );
}

export async function getNamespaceVerificationSession(input: {
  namespaceVerificationSessionId: string;
  accessToken: string;
}): Promise<NamespaceVerificationSessionResponse> {
  return request<NamespaceVerificationSessionResponse>(
    `/namespace-verification-sessions/${encodeURIComponent(input.namespaceVerificationSessionId)}`,
    {
      headers: {
        authorization: `Bearer ${input.accessToken}`,
      },
    },
  );
}

export type CreateCommunityResponse = {
  community: PirateApiCommunity;
  job: {
    job_id: string;
    job_type: string;
    status: string;
  };
};

export async function createCommunity(input: {
  accessToken: string;
  body: CreateCommunityRequestBody;
}): Promise<CreateCommunityResponse> {
  return request<CreateCommunityResponse>("/communities", {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.accessToken}`,
    },
    body: JSON.stringify(input.body),
  });
}

export async function createCommunityPost(input: {
  communityId: string;
  body: PirateApiCreatePostRequest;
  accessToken?: string | null;
}): Promise<PirateApiPost> {
  return request<PirateApiPost>(`/communities/${encodeURIComponent(input.communityId)}/posts`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${requirePirateAccessToken(input.accessToken)}`,
    },
    body: JSON.stringify(input.body),
  });
}

export async function createCommunitySongArtifactUpload(input: {
  communityId: string;
  body: PirateApiSongArtifactUploadRequest;
  accessToken?: string | null;
}): Promise<PirateApiSongArtifactUpload> {
  return request<PirateApiSongArtifactUpload>(
    `/communities/${encodeURIComponent(input.communityId)}/song-artifact-uploads`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${requirePirateAccessToken(input.accessToken)}`,
      },
      body: JSON.stringify(input.body),
    },
  );
}

export async function uploadCommunitySongArtifactContent(input: {
  communityId: string;
  songArtifactUploadId: string;
  file: Blob;
  contentType: string;
  accessToken?: string | null;
}): Promise<PirateApiSongArtifactUpload> {
  return request<PirateApiSongArtifactUpload>(
    `/communities/${encodeURIComponent(input.communityId)}/song-artifact-uploads/${encodeURIComponent(input.songArtifactUploadId)}/content`,
    {
      method: "PUT",
      headers: {
        authorization: `Bearer ${requirePirateAccessToken(input.accessToken)}`,
        "content-type": input.contentType,
      },
      body: input.file,
    },
  );
}

export async function createCommunitySongArtifactBundle(input: {
  communityId: string;
  body: PirateApiSongArtifactBundleRequest;
  accessToken?: string | null;
}): Promise<PirateApiSongArtifactBundle> {
  return request<PirateApiSongArtifactBundle>(
    `/communities/${encodeURIComponent(input.communityId)}/song-artifacts`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${requirePirateAccessToken(input.accessToken)}`,
      },
      body: JSON.stringify(input.body),
    },
  );
}

export async function getCommunitySongArtifactBundle(input: {
  communityId: string;
  songArtifactBundleId: string;
  accessToken?: string | null;
  signal?: AbortSignal;
}): Promise<PirateApiSongArtifactBundle> {
  return request<PirateApiSongArtifactBundle>(
    `/communities/${encodeURIComponent(input.communityId)}/song-artifacts/${encodeURIComponent(input.songArtifactBundleId)}`,
    {
      signal: input.signal,
      headers: {
        authorization: `Bearer ${requirePirateAccessToken(input.accessToken)}`,
      },
    },
  );
}

export async function createUserReport(input: {
  communityId: string;
  postId: string;
  body: PirateApiCreateUserReportRequest;
  accessToken?: string | null;
  signal?: AbortSignal;
}): Promise<PirateApiUserReport> {
  return request<PirateApiUserReport>(
    `/communities/${encodeURIComponent(input.communityId)}/posts/${encodeURIComponent(input.postId)}/reports`,
    {
      method: "POST",
      signal: input.signal,
      headers: {
        authorization: `Bearer ${requirePirateAccessToken(input.accessToken)}`,
      },
      body: JSON.stringify(input.body),
    },
  );
}

export async function listModerationCases(input: {
  communityId: string;
  status?: PirateApiModerationCaseStatus;
  accessToken?: string | null;
  signal?: AbortSignal;
}): Promise<PirateApiModerationCaseListResponse> {
  const query = input.status ? `?status=${encodeURIComponent(input.status)}` : "";

  return request<PirateApiModerationCaseListResponse>(
    `/communities/${encodeURIComponent(input.communityId)}/moderation-cases${query}`,
    {
      signal: input.signal,
      headers: {
        authorization: `Bearer ${requirePirateAccessToken(input.accessToken)}`,
      },
    },
  );
}

export async function getModerationCaseDetail(input: {
  communityId: string;
  moderationCaseId: string;
  accessToken?: string | null;
  signal?: AbortSignal;
}): Promise<PirateApiModerationCaseDetail> {
  return request<PirateApiModerationCaseDetail>(
    `/communities/${encodeURIComponent(input.communityId)}/moderation-cases/${encodeURIComponent(input.moderationCaseId)}`,
    {
      signal: input.signal,
      headers: {
        authorization: `Bearer ${requirePirateAccessToken(input.accessToken)}`,
      },
    },
  );
}

export async function createModerationAction(input: {
  communityId: string;
  moderationCaseId: string;
  body: PirateApiCreateModerationActionRequest;
  accessToken?: string | null;
  signal?: AbortSignal;
}): Promise<PirateApiModerationCaseDetail> {
  return request<PirateApiModerationCaseDetail>(
    `/communities/${encodeURIComponent(input.communityId)}/moderation-cases/${encodeURIComponent(input.moderationCaseId)}/actions`,
    {
      method: "POST",
      signal: input.signal,
      headers: {
        authorization: `Bearer ${requirePirateAccessToken(input.accessToken)}`,
      },
      body: JSON.stringify(input.body),
    },
  );
}
