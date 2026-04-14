import type {
  Community,
  CommunityCreateAcceptedResponse,
  CreateCommunityRequest,
  Job,
  LocalizedPostResponse,
  NamespaceVerification,
  NamespaceVerificationSession,
  OnboardingStatus,
  Profile,
  RedditImportSummary,
  RedditVerification,
  SessionExchangeRequest,
  SessionExchangeResponse,
  StartNamespaceVerificationSessionRequest,
  StartVerificationSessionRequest,
  User,
  VerificationSession,
} from "@pirate/api-contracts";

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryable: boolean;

  constructor(code: string, message: string, status: number, retryable = false) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

interface JsonErrorResponse {
  code?: string;
  message?: string;
  retryable?: boolean;
}

const DEFAULT_BASE_URL = "http://127.0.0.1:8787";

export class ApiClient {
  private baseUrl: string;
  private getToken: () => string | null;

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

  private async request<T>(
    path: string,
    init?: RequestInit & { tokenRequired?: boolean },
  ): Promise<T> {
    const tokenRequired = init?.tokenRequired ?? true;
    const headers: Record<string, string> = {
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

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { ...headers, ...(init?.headers as Record<string, string>) },
    });

    console.info("[api-client] response", { method, path, status: res.status, ok: res.ok });

    if (!res.ok) {
      let code = "internal_error";
      let message = `Request failed with status ${res.status}`;
      let retryable = false;

      try {
        const body: JsonErrorResponse = await res.json();
        if (body.code) code = body.code;
        if (body.message) message = body.message;
        if (body.retryable) retryable = body.retryable;
      } catch {}

      console.error("[api-client] request failed", { method, path, status: res.status, code, message, retryable });
      throw new ApiError(code, message, res.status, retryable);
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
      input?: { restart_challenge?: boolean | null },
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

  communities = {
    create: (
      body: Omit<CreateCommunityRequest, "namespace"> & {
        description?: string | null;
        membership_mode?: "open" | "request" | "gated";
        allow_anonymous_identity?: boolean;
        anonymous_identity_scope?: string | null;
        default_age_gate_policy?: "none" | "18_plus";
        gate_rules?: unknown[] | null;
        namespace?: { namespace_verification_id: string } | null;
      },
    ): Promise<CommunityCreateAcceptedResponse> => {
      return this.request<CommunityCreateAcceptedResponse>("/communities", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },

    get: (communityId: string): Promise<Community> => {
      return this.request<Community>(
        `/communities/${encodeURIComponent(communityId)}`,
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

    listPosts: (
      communityId: string,
      opts?: {
        limit?: string | null;
        cursor?: string | null;
        locale?: string | null;
        flair_id?: string | null;
      },
    ): Promise<{ items: LocalizedPostResponse[] }> => {
      const params = new URLSearchParams();
      if (opts?.limit) params.set("limit", opts.limit);
      if (opts?.cursor) params.set("cursor", opts.cursor);
      if (opts?.locale) params.set("locale", opts.locale);
      if (opts?.flair_id) params.set("flair_id", opts.flair_id);
      const qs = params.toString();
      const path = `/communities/${encodeURIComponent(communityId)}/posts`;
      return this.request<{ items: LocalizedPostResponse[] }>(
        qs ? `${path}?${qs}` : path,
      );
    },
  };

  posts = {
    get: (postId: string): Promise<LocalizedPostResponse> => {
      return this.request<LocalizedPostResponse>(
        `/posts/${encodeURIComponent(postId)}`,
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
        bio?: string | null;
        preferred_locale?: string | null;
      },
    ): Promise<Profile> => {
      return this.request<Profile>("/profiles/me", {
        method: "PATCH",
        body: JSON.stringify(input),
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
  };

  jobs = {
    get: (jobId: string): Promise<Job> => {
      return this.request<Job>(`/jobs/${encodeURIComponent(jobId)}`);
    },
  };
}
