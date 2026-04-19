import type {
  HomeFeedResponse,
  HomeFeedSort,
  NamespaceVerification,
  NamespaceVerificationSession,
  OnboardingStatus,
  RedditImportSummary,
  RedditVerification,
  SessionExchangeRequest,
  SessionExchangeResponse,
  StartNamespaceVerificationSessionRequest,
  StartVerificationSessionRequest,
  User,
  VerificationSession,
} from "@pirate/api-contracts";

import type { ApiRequest } from "./client-internal";

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
  };
}

export function createUsersApi(request: ApiRequest) {
  return {
    getMe: (): Promise<User> => request<User>("/users/me"),
  };
}

export function createOnboardingApi(request: ApiRequest) {
  return {
    getStatus: (): Promise<OnboardingStatus> => request<OnboardingStatus>("/onboarding/status"),
    startRedditVerification: (redditUsername: string): Promise<RedditVerification> =>
      request<RedditVerification>("/onboarding/reddit-verification", {
        method: "POST",
        body: JSON.stringify({ reddit_username: redditUsername }),
      }),
    startRedditImport: (redditUsername: string): Promise<{ job_id: string }> =>
      request<{ job_id: string }>("/onboarding/reddit-imports", {
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
      input?: { restart_challenge?: boolean | null; signature_payload?: Record<string, unknown> | null },
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
  return {
    home: (
      opts?: {
        cursor?: string | null;
        locale?: string | null;
        sort?: HomeFeedSort | null;
        timeRange?: string | null;
      },
    ): Promise<HomeFeedResponse> => {
      const params = new URLSearchParams();
      if (opts?.cursor) params.set("cursor", opts.cursor);
      if (opts?.locale) params.set("locale", opts.locale);
      if (opts?.sort) params.set("sort", opts.sort);
      if (opts?.timeRange) params.set("time_range", opts.timeRange);
      const qs = params.toString();
      return request<HomeFeedResponse>(qs ? `/feed/home?${qs}` : "/feed/home");
    },
  };
}
