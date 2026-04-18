import type {
  Asset,
  AssetAccessResponse,
  CommunityListing,
  CommunityListingListResponse,
  CommunityMoneyPolicy,
  CommunityPurchase,
  CommunityPurchaseListResponse,
  CommunityPurchaseQuotePreflightRequest,
  CommunityPurchaseQuoteRequest,
  CommunityPurchaseQuote,
  CommunityPurchaseQuotePreflight,
  CommunityPurchaseSettlementFailureRequest,
  CommunityPurchaseSettlementRequest,
  CommunityPurchaseSettlement,
  CommunityPurchaseSettlementFailure,
  CommunityPricingPolicy,
  CommentContext,
  CommentListResponse,
  CommentVoteResponse,
  CreateCommentRequest,
  CreatePostRequest,
  CreateCommunityListingRequest,
  CreateSongArtifactBundleRequest,
  CreateSongArtifactUploadRequest,
  CommunityPreview,
  GateFailureDetails,
  HomeFeedResponse,
  HomeFeedSort,
  JoinEligibility,
  // keep all existing imports
  Community,
  CommunityCreateAcceptedResponse,
  Job,
  LocalizedPostResponse,
  NamespaceVerification,
  NamespaceVerificationSession,
  OnboardingStatus,
  Post,
  Profile,
  RedditImportSummary,
  RedditVerification,
  SessionExchangeRequest,
  SessionExchangeResponse,
  SongArtifactBundle,
  SongArtifactUpload,
  StartNamespaceVerificationSessionRequest,
  StartVerificationSessionRequest,
  User,
  UpdateCommunityListingRequest,
  UpdateCommunityMoneyPolicyRequest,
  UpdateCommunityPricingPolicyRequest,
  VerificationSession,
} from "@pirate/api-contracts";

type ApiCreateCommunityRequest = {
  display_name: string;
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
    proof_requirements?: Array<{
      proof_type:
        | "unique_human"
        | "biometric_liveness"
        | "wallet_score"
        | "gov_id"
        | "age_over_18"
        | "nationality"
        | "gender"
        | "sanctions_clear"
        | "phone";
      accepted_providers?: Array<"self" | "very" | "passport"> | null;
      config?: Record<string, unknown> | null;
    }> | null;
  }> | null;
  namespace?: {
    namespace_verification_id: string;
  } | null;
};

type ApiCommunityMediaUploadResponse = {
  kind: "avatar" | "banner";
  media_ref: string;
  mime_type: string;
  size_bytes: number;
  storage_bucket: string;
  storage_object_key: string;
};

type ApiProfileMediaUploadResponse = {
  kind: "avatar" | "cover";
  media_ref: string;
  mime_type: string;
  size_bytes: number;
  storage_bucket: string;
  storage_object_key: string;
};

type ApiPublicProfileResolution = {
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

type ApiSongArtifactUploadContentRequest = {
  content_base64: string;
};

type ApiCommunityRuleInput = {
  rule_id?: string | null;
  title: string;
  body: string;
  report_reason?: string | null;
  position?: number | null;
  status?: "active" | "archived" | null;
};

type ApiCommunityGatesUpdateRequest = {
  membership_mode: "open" | "request" | "gated";
  default_age_gate_policy?: "none" | "18_plus" | null;
  allow_anonymous_identity: boolean;
  anonymous_identity_scope?: "community_stable" | "thread_stable" | "post_ephemeral" | null;
  gate_rules?: NonNullable<ApiCreateCommunityRequest["gate_rules"]> extends Array<infer T>
    ? Array<T & { gate_rule_id?: string | null }>
    : never;
};

type ApiCommunitySafetyUpdateRequest = {
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

type ApiDonationPartnerSummaryInput = {
  donation_partner_id: string;
  display_name: string;
  provider: "endaoment";
  provider_partner_ref?: string | null;
  image_url?: string | null;
};

type ApiCommunityDonationPolicyResponse = {
  community_id: string;
  donation_policy_mode: Community["donation_policy_mode"];
  donation_partner_status: Community["donation_partner_status"];
  donation_partner_id: string | null;
  donation_partner: (Community["donation_partner"] & { image_url?: string | null }) | null;
  updated_at: string;
};

type ApiResolveDonationPartnerResponse = {
  donation_partner_id: string;
  display_name: string;
  provider: "endaoment";
  provider_partner_ref?: string | null;
  image_url?: string | null;
};

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryable: boolean;
  readonly details: Record<string, unknown> | null;

  constructor(
    code: string,
    message: string,
    status: number,
    retryable = false,
    details: Record<string, unknown> | null = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
    this.details = details;
  }
}

interface JsonErrorResponse {
  code?: string;
  message?: string;
  retryable?: boolean;
}

type RefreshAuthCallback = () => Promise<boolean>;

export function isApiAuthError(error: unknown): error is ApiError {
  return error instanceof ApiError && (error.status === 401 || error.code === "auth_error");
}

export function isApiNotFoundError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 404;
}

export const DEFAULT_BASE_URL = "http://127.0.0.1:8787";

export class ApiClient {
  private baseUrl: string;
  private getToken: () => string | null;
  private refreshAuth: RefreshAuthCallback | null = null;
  private refreshInFlight: Promise<boolean> | null = null;

  constructor(options?: {
    baseUrl?: string;
    getToken?: () => string | null;
  }) {
    this.baseUrl = options?.baseUrl ?? DEFAULT_BASE_URL;
    this.getToken = options?.getToken ?? (() => null);
  }

  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  setRefreshAuthCallback(callback: RefreshAuthCallback | null): void {
    this.refreshAuth = callback;
  }

  private async runAuthRefresh(): Promise<boolean> {
    if (!this.refreshAuth) {
      console.info("[auth] refresh skipped: no callback registered");
      return false;
    }

    if (this.refreshInFlight) {
      console.info("[auth] awaiting in-flight refresh");
      return this.refreshInFlight;
    }

    console.info("[auth] refresh start");
    this.refreshInFlight = this.refreshAuth()
      .then((ok) => {
        console.info("[auth] refresh result", { ok });
        return ok;
      })
      .catch((error) => {
        console.info("[auth] refresh failed", {
          message: error instanceof Error ? error.message : String(error),
        });
        throw error;
      })
      .finally(() => {
        this.refreshInFlight = null;
      });

    return this.refreshInFlight;
  }

  private async request<T>(
    path: string,
    init?: RequestInit & { tokenRequired?: boolean; replayedAfterRefresh?: boolean },
  ): Promise<T> {
    const tokenRequired = init?.tokenRequired ?? true;
    const replayedAfterRefresh = init?.replayedAfterRefresh ?? false;
    const {
      tokenRequired: _tokenRequired,
      replayedAfterRefresh: _replayedAfterRefresh,
      ...fetchInit
    } = init ?? {};
    const body = fetchInit.body;
    const usesFormData = typeof FormData !== "undefined" && body instanceof FormData;
    const headers: Record<string, string> = usesFormData
      ? {}
      : {
        "Content-Type": "application/json",
      };

    if (tokenRequired) {
      const token = this.getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    const method = init?.method ?? "GET";
    console.info("[api-client] request", { method, path, tokenRequired });

    let res: Response;

    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        ...fetchInit,
        headers: { ...headers, ...(fetchInit.headers as Record<string, string>) },
      });
    } catch (error) {
      console.error("[api-client] network request failed", {
        method,
        path,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    console.info("[api-client] response", { method, path, status: res.status, ok: res.ok });

    if (!res.ok) {
      let code = "internal_error";
      let message = `Request failed with status ${res.status}`;
      let retryable = false;

      try {
        const body: JsonErrorResponse & { details?: unknown } = await res.json();
        if (body.code) code = body.code;
        if (body.message) message = body.message;
        if (body.retryable) retryable = body.retryable;
        const parsedDetails = body.details && typeof body.details === "object"
          ? body.details as Record<string, unknown>
          : null;

        if (
          tokenRequired
          && !replayedAfterRefresh
          && res.status === 401
          && body.code === "auth_error"
        ) {
          console.info("[auth] request received 401", { method, path });
          const refreshed = await this.runAuthRefresh().catch(() => false);

          if (refreshed) {
            console.info("[auth] replaying request after refresh", { method, path });
            return this.request<T>(path, {
              ...init,
              replayedAfterRefresh: true,
            });
          }
        }

        console.error("[api-client] request failed", { method, path, status: res.status, code, message, retryable });
        throw new ApiError(code, message, res.status, retryable, parsedDetails);
      } catch (e) {
        if (e instanceof ApiError) throw e;
        console.error("[api-client] request failed", { method, path, status: res.status, code, message, retryable });
        throw new ApiError(code, message, res.status, retryable);
      }
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  auth = {
    sessionExchange: (
      proof: SessionExchangeRequest["proof"],
    ): Promise<SessionExchangeResponse> => {
      return this.request<SessionExchangeResponse>("/auth/session/exchange", {
        method: "POST",
        body: JSON.stringify({ proof }),
        tokenRequired: false,
      });
    },
  };

  users = {
    getMe: (): Promise<User> => {
      return this.request<User>("/users/me");
    },
  };

  onboarding = {
    getStatus: (): Promise<OnboardingStatus> => {
      return this.request<OnboardingStatus>("/onboarding/status");
    },

    startRedditVerification: (
      redditUsername: string,
    ): Promise<RedditVerification> => {
      return this.request<RedditVerification>("/onboarding/reddit-verification", {
        method: "POST",
        body: JSON.stringify({ reddit_username: redditUsername }),
      });
    },

    startRedditImport: (
      redditUsername: string,
    ): Promise<{ job_id: string }> => {
      return this.request<{ job_id: string }>("/onboarding/reddit-imports", {
        method: "POST",
        body: JSON.stringify({ reddit_username: redditUsername }),
      });
    },

    getLatestRedditImport: (): Promise<RedditImportSummary> => {
      return this.request<RedditImportSummary>("/onboarding/reddit-imports/latest");
    },
  };

  verification = {
    startSession: (
      input: StartVerificationSessionRequest,
    ): Promise<VerificationSession> => {
      return this.request<VerificationSession>("/verification-sessions", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },

    getSession: (
      verificationSessionId: string,
    ): Promise<VerificationSession> => {
      return this.request<VerificationSession>(
        `/verification-sessions/${encodeURIComponent(verificationSessionId)}`,
      );
    },

    completeSession: (
      verificationSessionId: string,
      input?: {
        attestation_id?: string | null;
        proof?: string | null;
        proof_hash?: string | null;
        provider_payload_ref?: string | null;
      },
    ): Promise<VerificationSession> => {
      return this.request<VerificationSession>(
        `/verification-sessions/${encodeURIComponent(verificationSessionId)}/complete`,
        {
          method: "POST",
          body: JSON.stringify(input ?? {}),
        },
      );
    },

    startNamespaceSession: (
      input: StartNamespaceVerificationSessionRequest,
    ): Promise<NamespaceVerificationSession> => {
      return this.request<NamespaceVerificationSession>("/namespace-verification-sessions", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },

    getNamespaceSession: (
      namespaceVerificationSessionId: string,
    ): Promise<NamespaceVerificationSession> => {
      return this.request<NamespaceVerificationSession>(
        `/namespace-verification-sessions/${encodeURIComponent(namespaceVerificationSessionId)}`,
      );
    },

    completeNamespaceSession: (
      namespaceVerificationSessionId: string,
      input?: { restart_challenge?: boolean | null; signature_payload?: Record<string, unknown> | null },
    ): Promise<NamespaceVerificationSession> => {
      return this.request<NamespaceVerificationSession>(
        `/namespace-verification-sessions/${encodeURIComponent(namespaceVerificationSessionId)}/complete`,
        {
          method: "POST",
          body: JSON.stringify(input ?? {}),
        },
      );
    },

    getNamespaceVerification: (
      namespaceVerificationId: string,
    ): Promise<NamespaceVerification> => {
      return this.request<NamespaceVerification>(
        `/namespace-verifications/${encodeURIComponent(namespaceVerificationId)}`,
      );
    },
  };

  feed = {
    home: (
      opts?: {
        cursor?: string | null;
        locale?: string | null;
        sort?: HomeFeedSort | null;
      },
    ): Promise<HomeFeedResponse> => {
      const params = new URLSearchParams();
      if (opts?.cursor) params.set("cursor", opts.cursor);
      if (opts?.locale) params.set("locale", opts.locale);
      if (opts?.sort) params.set("sort", opts.sort);
      const qs = params.toString();
      return this.request<HomeFeedResponse>(qs ? `/feed/home?${qs}` : "/feed/home");
    },
  };

  communities = {
    create: (
      body: ApiCreateCommunityRequest,
    ): Promise<CommunityCreateAcceptedResponse> => {
      return this.request<CommunityCreateAcceptedResponse>("/communities", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },

    uploadMedia: (
      input: {
        kind: "avatar" | "banner";
        file: File;
      },
    ): Promise<ApiCommunityMediaUploadResponse> => {
      const body = new FormData();
      body.set("kind", input.kind);
      body.set("file", input.file);

      return this.request<ApiCommunityMediaUploadResponse>("/community-media", {
        method: "POST",
        body,
      });
    },

    get: (communityId: string): Promise<Community> => {
      return this.request<Community>(
        `/communities/${encodeURIComponent(communityId)}`,
      );
    },

    attachNamespace: (
      communityId: string,
      namespaceVerificationId: string,
    ): Promise<Community> => {
      return this.request<Community>(
        `/communities/${encodeURIComponent(communityId)}/namespace`,
        {
          method: "POST",
          body: JSON.stringify({
            namespace_verification_id: namespaceVerificationId,
          }),
        },
      );
    },

    setPendingNamespaceSession: (
      communityId: string,
      namespaceVerificationSessionId: string | null,
    ): Promise<Community> => {
      return this.request<Community>(
        `/communities/${encodeURIComponent(communityId)}/pending-namespace-session`,
        {
          method: "PUT",
          body: JSON.stringify({
            namespace_verification_session_id: namespaceVerificationSessionId,
          }),
        },
      );
    },

    updateRules: (
      communityId: string,
      body: { rules: ApiCommunityRuleInput[] },
    ): Promise<Community> => {
      return this.request<Community>(
        `/communities/${encodeURIComponent(communityId)}/rules`,
        {
          method: "PUT",
          body: JSON.stringify(body),
        },
      );
    },

    updateReferenceLinks: (
      communityId: string,
      body: {
        reference_links: Array<{
          community_reference_link_id?: string | null;
          platform: NonNullable<Community["reference_links"]>[number]["platform"];
          url: string;
          label?: string | null;
          position?: number | null;
        }>;
      },
    ): Promise<Community> => {
      return this.request<Community>(
        `/communities/${encodeURIComponent(communityId)}/reference-links`,
        {
          method: "PUT",
          body: JSON.stringify(body),
        },
      );
    },

    getDonationPolicy: (
      communityId: string,
    ): Promise<ApiCommunityDonationPolicyResponse> => {
      return this.request<ApiCommunityDonationPolicyResponse>(
        `/communities/${encodeURIComponent(communityId)}/donation-policy`,
      );
    },

    resolveDonationPartner: (
      communityId: string,
      body: { endaoment_url: string },
    ): Promise<ApiResolveDonationPartnerResponse> => {
      return this.request<ApiResolveDonationPartnerResponse>(
        `/communities/${encodeURIComponent(communityId)}/donation-policy/resolve`,
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      );
    },

    updateDonationPolicy: (
      communityId: string,
      body: {
        donation_policy_mode: Community["donation_policy_mode"];
        donation_partner_id?: string | null;
        donation_partner?: ApiDonationPartnerSummaryInput | null;
      },
    ): Promise<Community> => {
      return this.request<Community>(
        `/communities/${encodeURIComponent(communityId)}/donation-policy`,
        {
          method: "PATCH",
          body: JSON.stringify(body),
        },
      );
    },

    updateGates: (
      communityId: string,
      body: ApiCommunityGatesUpdateRequest,
    ): Promise<Community> => {
      return this.request<Community>(
        `/communities/${encodeURIComponent(communityId)}/gates`,
        {
          method: "PUT",
          body: JSON.stringify(body),
        },
      );
    },

    updateSafety: (
      communityId: string,
      body: ApiCommunitySafetyUpdateRequest,
    ): Promise<Community> => {
      return this.request<Community>(
        `/communities/${encodeURIComponent(communityId)}/safety`,
        {
          method: "PUT",
          body: JSON.stringify(body),
        },
      );
    },

    join: (
      communityId: string,
    ): Promise<{ community_id: string; status: string }> => {
      return this.request<{ community_id: string; status: string }>(
        `/communities/${encodeURIComponent(communityId)}/join`,
        { method: "POST", body: JSON.stringify({}) },
      );
    },

    preview: (communityId: string): Promise<CommunityPreview> => {
      return this.request<CommunityPreview>(
        `/communities/${encodeURIComponent(communityId)}/preview`,
      );
    },

    getJoinEligibility: (communityId: string): Promise<JoinEligibility> => {
      return this.request<JoinEligibility>(
        `/communities/${encodeURIComponent(communityId)}/join-eligibility`,
      );
    },

    getMoneyPolicy: (communityId: string): Promise<CommunityMoneyPolicy> => {
      return this.request<CommunityMoneyPolicy>(
        `/communities/${encodeURIComponent(communityId)}/money-policy`,
      );
    },

    updateMoneyPolicy: (
      communityId: string,
      body: UpdateCommunityMoneyPolicyRequest,
    ): Promise<CommunityMoneyPolicy> => {
      return this.request<CommunityMoneyPolicy>(
        `/communities/${encodeURIComponent(communityId)}/money-policy`,
        {
          method: "PUT",
          body: JSON.stringify(body),
        },
      );
    },

    getPricingPolicy: (communityId: string): Promise<CommunityPricingPolicy> => {
      return this.request<CommunityPricingPolicy>(
        `/communities/${encodeURIComponent(communityId)}/pricing-policy`,
      );
    },

    updatePricingPolicy: (
      communityId: string,
      body: UpdateCommunityPricingPolicyRequest,
    ): Promise<CommunityPricingPolicy> => {
      return this.request<CommunityPricingPolicy>(
        `/communities/${encodeURIComponent(communityId)}/pricing-policy`,
        {
          method: "PUT",
          body: JSON.stringify(body),
        },
      );
    },

    getAsset: (
      communityId: string,
      assetId: string,
    ): Promise<Asset> => {
      return this.request<Asset>(
        `/communities/${encodeURIComponent(communityId)}/assets/${encodeURIComponent(assetId)}`,
      );
    },

    resolveAssetAccess: (
      communityId: string,
      assetId: string,
    ): Promise<AssetAccessResponse> => {
      return this.request<AssetAccessResponse>(
        `/communities/${encodeURIComponent(communityId)}/assets/${encodeURIComponent(assetId)}/access`,
      );
    },

    listListings: (
      communityId: string,
    ): Promise<CommunityListingListResponse> => {
      return this.request<CommunityListingListResponse>(
        `/communities/${encodeURIComponent(communityId)}/listings`,
      );
    },

    createListing: (
      communityId: string,
      body: CreateCommunityListingRequest,
    ): Promise<CommunityListing> => {
      return this.request<CommunityListing>(
        `/communities/${encodeURIComponent(communityId)}/listings`,
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      );
    },

    getListing: (
      communityId: string,
      listingId: string,
    ): Promise<CommunityListing> => {
      return this.request<CommunityListing>(
        `/communities/${encodeURIComponent(communityId)}/listings/${encodeURIComponent(listingId)}`,
      );
    },

    updateListing: (
      communityId: string,
      listingId: string,
      body: UpdateCommunityListingRequest,
    ): Promise<CommunityListing> => {
      return this.request<CommunityListing>(
        `/communities/${encodeURIComponent(communityId)}/listings/${encodeURIComponent(listingId)}`,
        {
          method: "PATCH",
          body: JSON.stringify(body),
        },
      );
    },

    listPurchases: (
      communityId: string,
    ): Promise<CommunityPurchaseListResponse> => {
      return this.request<CommunityPurchaseListResponse>(
        `/communities/${encodeURIComponent(communityId)}/purchases`,
      );
    },

    getPurchase: (
      communityId: string,
      purchaseId: string,
    ): Promise<CommunityPurchase> => {
      return this.request<CommunityPurchase>(
        `/communities/${encodeURIComponent(communityId)}/purchases/${encodeURIComponent(purchaseId)}`,
      );
    },

    preflightPurchaseQuote: (
      communityId: string,
      body: CommunityPurchaseQuotePreflightRequest,
    ): Promise<CommunityPurchaseQuotePreflight> => {
      return this.request<CommunityPurchaseQuotePreflight>(
        `/communities/${encodeURIComponent(communityId)}/purchase-quote-preflight`,
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      );
    },

    createPurchaseQuote: (
      communityId: string,
      body: CommunityPurchaseQuoteRequest,
    ): Promise<CommunityPurchaseQuote> => {
      return this.request<CommunityPurchaseQuote>(
        `/communities/${encodeURIComponent(communityId)}/purchase-quotes`,
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      );
    },

    settlePurchase: (
      communityId: string,
      body: CommunityPurchaseSettlementRequest,
    ): Promise<CommunityPurchaseSettlement> => {
      return this.request<CommunityPurchaseSettlement>(
        `/communities/${encodeURIComponent(communityId)}/purchase-settlements`,
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      );
    },

    failPurchase: (
      communityId: string,
      body: CommunityPurchaseSettlementFailureRequest,
    ): Promise<CommunityPurchaseSettlementFailure> => {
      return this.request<CommunityPurchaseSettlementFailure>(
        `/communities/${encodeURIComponent(communityId)}/purchase-settlements/fail`,
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      );
    },

    listPosts: (
      communityId: string,
      opts?: {
        limit?: string | null;
        cursor?: string | null;
        locale?: string | null;
        flair_id?: string | null;
        sort?: "best" | "new" | "top" | null;
      },
    ): Promise<{ items: LocalizedPostResponse[] }> => {
      const params = new URLSearchParams();
      if (opts?.limit) params.set("limit", opts.limit);
      if (opts?.cursor) params.set("cursor", opts.cursor);
      if (opts?.locale) params.set("locale", opts.locale);
      if (opts?.flair_id) params.set("flair_id", opts.flair_id);
      if (opts?.sort) params.set("sort", opts.sort);
      const qs = params.toString();
      const path = `/communities/${encodeURIComponent(communityId)}/posts`;
      return this.request<{ items: LocalizedPostResponse[] }>(
        qs ? `${path}?${qs}` : path,
      );
    },

    createPost: (
      communityId: string,
      body: CreatePostRequest,
    ): Promise<Post> => {
      return this.request<Post>(
        `/communities/${encodeURIComponent(communityId)}/posts`,
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      );
    },

    listComments: (
      communityId: string,
      postId: string,
      opts?: {
        limit?: string | null;
        cursor?: string | null;
        locale?: string | null;
        sort?: "best" | "new" | "old" | "top" | null;
      },
    ): Promise<CommentListResponse> => {
      const params = new URLSearchParams();
      if (opts?.limit) params.set("limit", opts.limit);
      if (opts?.cursor) params.set("cursor", opts.cursor);
      if (opts?.locale) params.set("locale", opts.locale);
      if (opts?.sort) params.set("sort", opts.sort);
      const qs = params.toString();
      const path =
        `/communities/${encodeURIComponent(communityId)}/posts/${encodeURIComponent(postId)}/comments`;
      return this.request<CommentListResponse>(qs ? `${path}?${qs}` : path);
    },

    createComment: (
      communityId: string,
      postId: string,
      body: CreateCommentRequest,
    ): Promise<void> => {
      return this.request(
        `/communities/${encodeURIComponent(communityId)}/posts/${encodeURIComponent(postId)}/comments`,
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      );
    },

    createSongArtifactUpload: (
      communityId: string,
      body: CreateSongArtifactUploadRequest,
    ): Promise<SongArtifactUpload> => {
      return this.request<SongArtifactUpload>(
        `/communities/${encodeURIComponent(communityId)}/song-artifact-uploads`,
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      );
    },

    uploadSongArtifactContent: (
      communityId: string,
      songArtifactUploadId: string,
      body: ArrayBuffer | ApiSongArtifactUploadContentRequest,
    ): Promise<SongArtifactUpload> => {
      const isBinary = body instanceof ArrayBuffer;
      return this.request<SongArtifactUpload>(
        `/communities/${encodeURIComponent(communityId)}/song-artifact-uploads/${encodeURIComponent(songArtifactUploadId)}/content`,
        {
          method: "PUT",
          body: isBinary ? body : JSON.stringify(body),
          headers: isBinary ? { "Content-Type": "application/octet-stream" } : undefined,
        },
      );
    },

    createSongArtifactBundle: (
      communityId: string,
      body: CreateSongArtifactBundleRequest,
    ): Promise<SongArtifactBundle> => {
      return this.request<SongArtifactBundle>(
        `/communities/${encodeURIComponent(communityId)}/song-artifacts`,
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      );
    },

    getSongArtifactBundle: (
      communityId: string,
      songArtifactBundleId: string,
    ): Promise<SongArtifactBundle> => {
      return this.request<SongArtifactBundle>(
        `/communities/${encodeURIComponent(communityId)}/song-artifacts/${encodeURIComponent(songArtifactBundleId)}`,
      );
    },
  };

  posts = {
    get: (
      postId: string,
      opts?: {
        locale?: string | null;
      },
    ): Promise<LocalizedPostResponse> => {
      const params = new URLSearchParams();
      if (opts?.locale) params.set("locale", opts.locale);
      const qs = params.toString();
      return this.request<LocalizedPostResponse>(
        qs
          ? `/posts/${encodeURIComponent(postId)}?${qs}`
          : `/posts/${encodeURIComponent(postId)}`,
      );
    },
  };

  comments = {
    listReplies: (
      commentId: string,
      opts?: {
        limit?: string | null;
        cursor?: string | null;
        locale?: string | null;
        sort?: "best" | "new" | "old" | "top" | null;
      },
    ): Promise<CommentListResponse> => {
      const params = new URLSearchParams();
      if (opts?.limit) params.set("limit", opts.limit);
      if (opts?.cursor) params.set("cursor", opts.cursor);
      if (opts?.locale) params.set("locale", opts.locale);
      if (opts?.sort) params.set("sort", opts.sort);
      const qs = params.toString();
      const path = `/comments/${encodeURIComponent(commentId)}/replies`;
      return this.request<CommentListResponse>(qs ? `${path}?${qs}` : path);
    },

    getContext: (
      commentId: string,
      opts?: {
        limit?: string | null;
        cursor?: string | null;
        locale?: string | null;
      },
    ): Promise<CommentContext> => {
      const params = new URLSearchParams();
      if (opts?.limit) params.set("limit", opts.limit);
      if (opts?.cursor) params.set("cursor", opts.cursor);
      if (opts?.locale) params.set("locale", opts.locale);
      const qs = params.toString();
      const path = `/comments/${encodeURIComponent(commentId)}/context`;
      return this.request<CommentContext>(qs ? `${path}?${qs}` : path);
    },

    createReply: (
      commentId: string,
      body: CreateCommentRequest,
    ): Promise<void> => {
      return this.request(
        `/comments/${encodeURIComponent(commentId)}/replies`,
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      );
    },

    vote: (
      commentId: string,
      value: -1 | 1,
    ): Promise<CommentVoteResponse> => {
      return this.request<CommentVoteResponse>(
        `/comments/${encodeURIComponent(commentId)}/vote`,
        {
          method: "POST",
          body: JSON.stringify({ value }),
        },
      );
    },
  };

  profiles = {
    getMe: (): Promise<Profile> => {
      return this.request<Profile>("/profiles/me");
    },

    getByUserId: (userId: string): Promise<Profile> => {
      return this.request<Profile>(
        `/profiles/${encodeURIComponent(userId)}`,
      );
    },

    updateMe: (
      input: {
        display_name?: string | null;
        avatar_ref?: string | null;
        cover_ref?: string | null;
        bio?: string | null;
        preferred_locale?: string | null;
      },
    ): Promise<Profile> => {
      return this.request<Profile>("/profiles/me", {
        method: "PATCH",
        body: JSON.stringify(input),
      });
    },

    syncLinkedHandles: (): Promise<Profile> => {
      return this.request<Profile>("/profiles/me/linked-handles/sync", {
        method: "POST",
        body: JSON.stringify({}),
      });
    },

    setPrimaryPublicHandle: (
      linkedHandleId: string | null,
    ): Promise<Profile> => {
      return this.request<Profile>("/profiles/me/primary-public-handle", {
        method: "POST",
        body: JSON.stringify({ linked_handle_id: linkedHandleId }),
      });
    },

    uploadMedia: (
      input: {
        kind: "avatar" | "cover";
        file: File;
      },
    ): Promise<ApiProfileMediaUploadResponse> => {
      const formData = new FormData();
      formData.set("kind", input.kind);
      formData.set("file", input.file);
      return this.request<ApiProfileMediaUploadResponse>("/profile-media", {
        method: "POST",
        body: formData,
      });
    },

    renameHandle: (
      desiredLabel: string,
    ): Promise<{ global_handle_id: string; label: string; tier: string; status: string }> => {
      return this.request("/profiles/me/global-handle/rename", {
        method: "POST",
        body: JSON.stringify({ desired_label: desiredLabel }),
      });
    },

    quoteHandleUpgrade: (
      desiredLabel: string,
    ): Promise<{
      desired_label: string;
      tier: string;
      price_usd: number;
      eligible: boolean;
      reason?: string | null;
    }> => {
      return this.request("/profiles/me/global-handle/upgrade-quote", {
        method: "POST",
        body: JSON.stringify({ desired_label: desiredLabel }),
      });
    },
  };

  publicProfiles = {
    getByHandle: (
      handleLabel: string,
    ): Promise<ApiPublicProfileResolution> => {
      return this.request<ApiPublicProfileResolution>(
        `/public-profiles/${encodeURIComponent(handleLabel)}`,
        {
          tokenRequired: false,
        },
      );
    },
  };

  publicCommunities = {
    get: (
      communityId: string,
    ): Promise<CommunityPreview> => {
      return this.request<CommunityPreview>(
        `/public-communities/${encodeURIComponent(communityId)}`,
        {
          tokenRequired: false,
        },
      );
    },

    listPosts: (
      communityId: string,
      opts?: {
        limit?: string | null;
        cursor?: string | null;
        locale?: string | null;
        flair_id?: string | null;
        sort?: "best" | "new" | "top" | null;
      },
    ): Promise<{ items: LocalizedPostResponse[] }> => {
      const params = new URLSearchParams();
      if (opts?.limit) params.set("limit", opts.limit);
      if (opts?.cursor) params.set("cursor", opts.cursor);
      if (opts?.locale) params.set("locale", opts.locale);
      if (opts?.flair_id) params.set("flair_id", opts.flair_id);
      if (opts?.sort) params.set("sort", opts.sort);
      const qs = params.toString();
      const path = `/public-communities/${encodeURIComponent(communityId)}/posts`;
      return this.request<{ items: LocalizedPostResponse[] }>(
        qs ? `${path}?${qs}` : path,
        {
          tokenRequired: false,
        },
      );
    },
  };

  publicPosts = {
    get: (
      postId: string,
      opts?: {
        locale?: string | null;
      },
    ): Promise<LocalizedPostResponse> => {
      const params = new URLSearchParams();
      if (opts?.locale) params.set("locale", opts.locale);
      const qs = params.toString();
      const path = `/public-posts/${encodeURIComponent(postId)}`;
      return this.request<LocalizedPostResponse>(
        qs ? `${path}?${qs}` : path,
        {
          tokenRequired: false,
        },
      );
    },
  };

  publicComments = {
    listPostComments: (
      postId: string,
      opts?: {
        limit?: string | null;
        cursor?: string | null;
        locale?: string | null;
        sort?: "best" | "new" | "old" | "top" | null;
      },
    ): Promise<CommentListResponse> => {
      const params = new URLSearchParams();
      if (opts?.limit) params.set("limit", opts.limit);
      if (opts?.cursor) params.set("cursor", opts.cursor);
      if (opts?.locale) params.set("locale", opts.locale);
      if (opts?.sort) params.set("sort", opts.sort);
      const qs = params.toString();
      const path = `/public-comments/posts/${encodeURIComponent(postId)}/comments`;
      return this.request<CommentListResponse>(
        qs ? `${path}?${qs}` : path,
        {
          tokenRequired: false,
        },
      );
    },

    listReplies: (
      commentId: string,
      opts?: {
        limit?: string | null;
        cursor?: string | null;
        locale?: string | null;
        sort?: "best" | "new" | "old" | "top" | null;
      },
    ): Promise<CommentListResponse> => {
      const params = new URLSearchParams();
      if (opts?.limit) params.set("limit", opts.limit);
      if (opts?.cursor) params.set("cursor", opts.cursor);
      if (opts?.locale) params.set("locale", opts.locale);
      if (opts?.sort) params.set("sort", opts.sort);
      const qs = params.toString();
      const path = `/public-comments/${encodeURIComponent(commentId)}/replies`;
      return this.request<CommentListResponse>(
        qs ? `${path}?${qs}` : path,
        {
          tokenRequired: false,
        },
      );
    },
  };

  jobs = {
    get: (jobId: string): Promise<Job> => {
      return this.request<Job>(`/jobs/${encodeURIComponent(jobId)}`);
    },
  };
}
