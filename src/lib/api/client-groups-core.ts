import type {
  AssetBalanceCapabilityListResponse,
  NftGateCapabilitySourceListResponse,
  NftGateFacetValuePage,
  HomeFeedResponse,
  HomeFeedSort,
  NamespaceVerification,
  NamespaceVerificationSession,
  OnboardingStatus,
	  RedditImportSummary,
	  RedditVerification,
	  RefreshPassportWalletScoreRequest,
	  RefreshPassportWalletScoreResponse,
	  SessionExchangeRequest,
  SessionExchangeResponse,
  StartNamespaceVerificationSessionRequest,
  StartVerificationSessionRequest,
  User,
  VerificationSession,
  Job,
} from "@pirate/api-contracts";
import type { PostCardEventPlace } from "@/components/compositions/posts/post-card/post-card.types";

import { buildQueryPath, type ApiRequest } from "./client-internal";

type OAuthDeviceVerifyResponse = {
  client_id: string;
  scope: string;
  status: "authorized";
  user_code: string;
};

export type AltchaScope =
  | "community_join"
  | "post_create"
  | "comment_create"
  | "vote"
  | "namespace_handle_claim";

export type AltchaChallenge = Record<string, unknown>;

export function createAuthApi(request: ApiRequest) {
  return {
    sessionExchange: (
      proof: SessionExchangeRequest["proof"],
    ): Promise<SessionExchangeResponse> =>
      request<SessionExchangeResponse>("/auth/session/exchange", {
        method: "POST",
        body: JSON.stringify({ proof }),
        tokenRequired: false,
      }),
    verifyDevice: (userCode: string): Promise<OAuthDeviceVerifyResponse> =>
      request<OAuthDeviceVerifyResponse>("/oauth/device/verify", {
        method: "POST",
        body: JSON.stringify({ user_code: userCode }),
      }),
  };
}

export function createUsersApi(request: ApiRequest) {
  return {
    getMe: (): Promise<User> => request<User>("/users/me"),
    createTelegramAccountLinkIntent: (
      communityId: string,
    ): Promise<{ expires_at: string; link_url: string }> =>
      request<{ expires_at: string; link_url: string }>(
        "/users/me/telegram-account-link-intents",
        {
          method: "POST",
          body: JSON.stringify({ community_id: communityId }),
        },
      ),
    consumeTelegramAccountLinkIntent: (
      token: string,
    ): Promise<{ linked: true }> =>
      request<{ linked: true }>("/users/me/telegram-account-link-intents/consume", {
        method: "POST",
        body: JSON.stringify({ token }),
      }),
    setIdentityWallet: (walletAttachmentId: string): Promise<User> =>
      request<User>("/users/me/identity-wallet", {
        method: "PUT",
        body: JSON.stringify({ wallet_attachment_id: walletAttachmentId }),
      }),
  };
}

export type GeoPlace = Extract<PostCardEventPlace, { source: "geoapify" }>;

export function createGeoApi(request: ApiRequest) {
  return {
    searchPlaces: (input: {
      biasLat?: number;
      biasLon?: number;
      country?: string;
      limit?: number;
      text: string;
    }): Promise<{ places: GeoPlace[] }> =>
      request<{ places: GeoPlace[] }>(buildQueryPath("/geo/search", {
        biasLat: input.biasLat,
        biasLon: input.biasLon,
        country: input.country,
        limit: input.limit,
        text: input.text,
      })),
  };
}

export function createGateCapabilitiesApi(request: ApiRequest) {
  return {
    listAssets: (): Promise<AssetBalanceCapabilityListResponse> =>
      request<AssetBalanceCapabilityListResponse>("/gate-capabilities/assets"),
    listNftSources: (): Promise<NftGateCapabilitySourceListResponse> =>
      request<NftGateCapabilitySourceListResponse>("/gate-capabilities/nft/sources"),
    searchNftFacetValues: (
      sourceId: string,
      facetKey: string,
      options?: { cursor?: string | null; limit?: number; query?: string },
    ): Promise<NftGateFacetValuePage> =>
      request<NftGateFacetValuePage>(buildQueryPath(
        `/gate-capabilities/nft/sources/${encodeURIComponent(sourceId)}/facets/${encodeURIComponent(facetKey)}/values`,
        {
          cursor: options?.cursor,
          limit: options?.limit,
          q: options?.query,
        },
      )),
  };
}

export function createOnboardingApi(request: ApiRequest) {
  return {
    getStatus: (): Promise<OnboardingStatus> => request<OnboardingStatus>("/onboarding/status"),
    dismiss: (): Promise<OnboardingStatus> =>
      request<OnboardingStatus>("/onboarding/dismiss", {
        method: "POST",
      }),
    startRedditVerification: (redditUsername: string): Promise<RedditVerification> =>
      request<RedditVerification>("/onboarding/reddit-verification", {
        method: "POST",
        body: JSON.stringify({ reddit_username: redditUsername }),
      }),
    startRedditImport: (redditUsername: string): Promise<{ job: Job }> =>
      request<{ job: Job }>("/onboarding/reddit-imports", {
        method: "POST",
        body: JSON.stringify({ reddit_username: redditUsername }),
      }),
    getLatestRedditImport: (): Promise<RedditImportSummary> =>
      request<RedditImportSummary>("/onboarding/reddit-imports/latest"),
  };
}

export function createVerificationApi(request: ApiRequest) {
  return {
    startSession: (input: StartVerificationSessionRequest): Promise<VerificationSession> =>
      request<VerificationSession>("/verification-sessions", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    getSession: (verificationSessionId: string): Promise<VerificationSession> =>
      request<VerificationSession>(
        `/verification-sessions/${encodeURIComponent(verificationSessionId)}`,
      ),
	    completeSession: (
      verificationSessionId: string,
      input?: {
        attestation_id?: string | null;
        proof?: string | null;
        proof_hash?: string | null;
        provider_payload_ref?: string | null;
      },
    ): Promise<VerificationSession> =>
      request<VerificationSession>(
        `/verification-sessions/${encodeURIComponent(verificationSessionId)}/complete`,
        {
          method: "POST",
          body: JSON.stringify(input ?? {}),
        },
	      ),
	    refreshPassportWalletScore: (
	      input: RefreshPassportWalletScoreRequest = {},
	    ): Promise<RefreshPassportWalletScoreResponse> =>
	      request<RefreshPassportWalletScoreResponse>("/verification/passport-wallet-score", {
	        method: "POST",
	        body: JSON.stringify(input),
	      }),
    createAltchaChallenge: (
      input: { scope: AltchaScope; action: string },
    ): Promise<AltchaChallenge> =>
      request<AltchaChallenge>(buildQueryPath("/verification/altcha/challenge", {
        scope: input.scope,
        action: input.action,
      })),
	    startNamespaceSession: (
      input: StartNamespaceVerificationSessionRequest,
    ): Promise<NamespaceVerificationSession> =>
      request<NamespaceVerificationSession>("/namespace-verification-sessions", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    getNamespaceSession: (
      namespaceVerificationSessionId: string,
    ): Promise<NamespaceVerificationSession> =>
      request<NamespaceVerificationSession>(
        `/namespace-verification-sessions/${encodeURIComponent(namespaceVerificationSessionId)}`,
      ),
    completeNamespaceSession: (
      namespaceVerificationSessionId: string,
      input?: {
        restart_challenge?: boolean | null;
        acknowledged_resource_replacement?: boolean | null;
      },
    ): Promise<NamespaceVerificationSession> =>
      request<NamespaceVerificationSession>(
        `/namespace-verification-sessions/${encodeURIComponent(namespaceVerificationSessionId)}/complete`,
        {
          method: "POST",
          body: JSON.stringify(input ?? {}),
        },
      ),
    getNamespaceVerification: (
      namespaceVerificationId: string,
    ): Promise<NamespaceVerification> =>
      request<NamespaceVerification>(
        `/namespace-verifications/${encodeURIComponent(namespaceVerificationId)}`,
      ),
  };
}

export function createFeedApi(request: ApiRequest) {
  const videoFeed = (
    path: string,
    opts?: {
      cursor?: string | null;
      locale?: string | null;
      sort?: HomeFeedSort | null;
      timeRange?: string | null;
    },
    tokenRequired?: boolean,
  ): Promise<HomeFeedResponse> => request<HomeFeedResponse>(buildQueryPath(path, {
    cursor: opts?.cursor,
    locale: opts?.locale,
    sort: opts?.sort,
    time_range: opts?.timeRange,
  }), tokenRequired === false ? { tokenRequired: false } : { tokenOptional: true });

  return {
    home: (
      opts?: {
        cursor?: string | null;
        locale?: string | null;
        sort?: HomeFeedSort | null;
        timeRange?: string | null;
      },
    ): Promise<HomeFeedResponse> => {
      return request<HomeFeedResponse>(buildQueryPath("/feed/home", {
        cursor: opts?.cursor,
        locale: opts?.locale,
        sort: opts?.sort,
        time_range: opts?.timeRange,
      }), { tokenOptional: true });
    },
    publicHome: (
      opts?: {
        cursor?: string | null;
        locale?: string | null;
        sort?: HomeFeedSort | null;
        timeRange?: string | null;
      },
    ): Promise<HomeFeedResponse> => {
      return request<HomeFeedResponse>(buildQueryPath("/feed/home/public", {
        cursor: opts?.cursor,
        locale: opts?.locale,
        sort: opts?.sort,
        time_range: opts?.timeRange,
      }), { tokenRequired: false });
    },
    videos: (opts?: Parameters<typeof videoFeed>[1]): Promise<HomeFeedResponse> =>
      videoFeed("/feed/home/videos", opts),
    publicVideos: (opts?: Parameters<typeof videoFeed>[1]): Promise<HomeFeedResponse> =>
      videoFeed("/feed/home/videos/public", opts, false),
  };
}
