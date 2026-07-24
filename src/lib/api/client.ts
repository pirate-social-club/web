import {
  createAuthApi,
  createFeedApi,
  createGateCapabilitiesApi,
  createGeoApi,
  createOnboardingApi,
  createUsersApi,
  createVerificationApi,
} from "./client-groups-core";
import { createAgentsApi } from "./client-groups-agents";
import {
  createCommentsApi,
  createCommunityContentApi,
  createPostsApi,
} from "./client-groups-content";
import { createCommunitiesApi } from "./client-groups-communities";
import { createCommunityCommerceApi } from "./client-groups-community-commerce";
import { createBookingsApi } from "./client-groups-bookings";
import { createHostBookingsApi } from "./client-groups-host-bookings";
import {
  createProfilesApi,
  createPublicAgentsApi,
  createPublicCommentsApi,
  createPublicCommunitiesApi,
  createPublicPostsApi,
  createPublicProfilesApi,
} from "./client-groups-public";
import {
  createJobsApi,
  createNotificationsApi,
  createRewardsApi,
  createRoyaltiesApi,
} from "./client-groups-system";
import type {
  ApiRequestInit,
  JsonErrorResponse,
  RefreshAuthCallback,
} from "./client-internal";
import { xhrUploadFetch } from "./client-xhr-upload";
import { getAnalyticsIdentity } from "../analytics-identity";
import { logger } from "../logger";

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryable: boolean;
  readonly retryableExplicit: boolean;
  readonly details: Record<string, unknown> | null;
  readonly requestId: string | null;

  constructor(
    code: string,
    message: string,
    status: number,
    retryable?: boolean,
    details: Record<string, unknown> | null = null,
    requestId: string | null = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.retryable = retryable ?? false;
    this.retryableExplicit = retryable !== undefined;
    this.details = details;
    this.requestId = requestId;
  }
}

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
  private refreshAuthWaiters = new Set<(callback: RefreshAuthCallback | null) => void>();

  readonly auth = createAuthApi(this.request.bind(this));
  readonly agents = createAgentsApi(this.request.bind(this));
  readonly users = createUsersApi(this.request.bind(this));
  readonly onboarding = createOnboardingApi(this.request.bind(this));
  readonly verification = createVerificationApi(this.request.bind(this));
  readonly feed = createFeedApi(this.request.bind(this));
  readonly geo = createGeoApi(this.request.bind(this));
  readonly gateCapabilities = createGateCapabilitiesApi(this.request.bind(this));
  readonly communities = {
    ...createCommunitiesApi(this.request.bind(this)),
    ...createCommunityContentApi(this.request.bind(this)),
    ...createCommunityCommerceApi(this.request.bind(this)),
  };
  readonly bookings = createBookingsApi(this.request.bind(this));
  readonly hostBookings = createHostBookingsApi(this.request.bind(this));
  readonly posts = createPostsApi(this.request.bind(this));
  readonly comments = createCommentsApi(this.request.bind(this));
  readonly profiles = createProfilesApi(this.request.bind(this));
  readonly publicProfiles = createPublicProfilesApi(this.request.bind(this));
  readonly publicAgents = createPublicAgentsApi(this.request.bind(this));
  readonly publicCommunities = createPublicCommunitiesApi(this.request.bind(this));
  readonly publicPosts = createPublicPostsApi(this.request.bind(this));
  readonly publicComments = createPublicCommentsApi(this.request.bind(this));
  readonly jobs = createJobsApi(this.request.bind(this));
  readonly notifications = createNotificationsApi(this.request.bind(this));
  readonly rewards = createRewardsApi(this.request.bind(this));
  readonly royalties = createRoyaltiesApi(this.request.bind(this));

  constructor(options?: { baseUrl?: string; getToken?: () => string | null }) {
    this.baseUrl = options?.baseUrl ?? DEFAULT_BASE_URL;
    this.getToken = options?.getToken ?? (() => null);
  }

  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  setRefreshAuthCallback(callback: RefreshAuthCallback | null): void {
    this.refreshAuth = callback;
    for (const waiter of this.refreshAuthWaiters) {
      waiter(callback);
    }
    this.refreshAuthWaiters.clear();
  }

  private async waitForRefreshAuthCallback(timeoutMs = 1_500): Promise<RefreshAuthCallback | null> {
    if (this.refreshAuth) {
      return this.refreshAuth;
    }

    return await new Promise<RefreshAuthCallback | null>((resolve) => {
      const timeoutId = globalThis.setTimeout(() => {
        this.refreshAuthWaiters.delete(handleReady);
        resolve(this.refreshAuth);
      }, timeoutMs);

      const handleReady = (callback: RefreshAuthCallback | null) => {
        globalThis.clearTimeout(timeoutId);
        this.refreshAuthWaiters.delete(handleReady);
        resolve(callback);
      };

      this.refreshAuthWaiters.add(handleReady);
    });
  }

  private async runAuthRefresh(): Promise<boolean> {
    const refreshAuth = this.refreshAuth ?? await this.waitForRefreshAuthCallback();

    if (!refreshAuth) {
      logger.info("[auth] refresh skipped: no callback registered");
      return false;
    }

    if (this.refreshInFlight) {
      logger.info("[auth] awaiting in-flight refresh");
      return this.refreshInFlight;
    }

    logger.info("[auth] refresh start");
    this.refreshInFlight = refreshAuth()
      .then((ok) => {
        logger.info("[auth] refresh result", { ok });
        return ok;
      })
      .catch((error) => {
        logger.info("[auth] refresh failed", {
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
    init?: ApiRequestInit,
  ): Promise<T> {
    const tokenOptional = init?.tokenOptional ?? false;
    const tokenRequired = init?.tokenRequired ?? !tokenOptional;
    const replayedAfterRefresh = init?.replayedAfterRefresh ?? false;
    const replayedWithoutOptionalToken = init?.replayedWithoutOptionalToken ?? false;
    const {
      tokenRequired: _tokenRequired,
      tokenOptional: _tokenOptional,
      replayedAfterRefresh: _replayedAfterRefresh,
      replayedWithoutOptionalToken: _replayedWithoutOptionalToken,
      responseType = "json",
      onUploadProgress,
      timeoutMs,
      ...fetchInit
    } = init ?? {};
    const body = fetchInit.body;
    const method = init?.method ?? "GET";
    const usesFormData = typeof FormData !== "undefined" && body instanceof FormData;
    const hasBody = body !== undefined && body !== null;
    const headers = new Headers(usesFormData || !hasBody ? undefined : { "Content-Type": "application/json" });
    // Identity headers are not CORS-safelisted, so sending them on a public GET
    // forces a preflight. Writes already preflight (JSON content-type), so they
    // keep both headers: the API reads them for server-side event attribution.
    if (typeof window !== "undefined" && method !== "GET" && method !== "HEAD") {
      const identity = getAnalyticsIdentity();
      headers.set("x-pirate-anonymous-id", identity.anonymousId);
      headers.set("x-pirate-session-id", identity.sessionId);
    }
    let token = tokenRequired || tokenOptional ? this.getToken() : null;

    if (tokenRequired) {
      if (!token) {
        logger.info("[auth] request missing token, attempting refresh", { method: init?.method ?? "GET", path });
        const refreshed = await this.runAuthRefresh().catch(() => false);
        if (refreshed) {
          token = this.getToken();
        }
      }

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }

    if (tokenOptional && token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const callerHeaders = new Headers(fetchInit.headers);
    for (const [key, value] of callerHeaders.entries()) {
      headers.set(key, value);
    }

    logger.debug("[api-client] request", { method, path, tokenOptional, tokenRequired });

    let res: Response;
    const requestTimeoutMs = typeof timeoutMs === "number" && timeoutMs > 0 ? timeoutMs : null;
    const timeoutController = requestTimeoutMs ? new AbortController() : null;
    const callerSignal = fetchInit.signal;
    const handleCallerAbort = callerSignal && timeoutController
      ? () => timeoutController.abort()
      : null;
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;
    if (timeoutController) {
      timeoutId = globalThis.setTimeout(() => timeoutController.abort(), requestTimeoutMs ?? undefined);
      if (callerSignal) {
        if (callerSignal.aborted) {
          timeoutController.abort();
        } else if (handleCallerAbort) {
          callerSignal.addEventListener("abort", handleCallerAbort, { once: true });
        }
      }
    }
    try {
      // Progress-reporting uploads go through XHR (fetch can't report upload
      // bytes); the returned Response feeds the same auth/error path below.
      res = onUploadProgress && typeof XMLHttpRequest !== "undefined"
        ? await xhrUploadFetch(
          `${this.baseUrl}${path}`,
          { method, headers, body: fetchInit.body, signal: timeoutController?.signal ?? callerSignal ?? undefined },
          onUploadProgress,
        )
        : await fetch(`${this.baseUrl}${path}`, {
          ...fetchInit,
          headers,
          signal: timeoutController?.signal ?? callerSignal,
        });
    } catch (error) {
      logger.debug("[api-client] network request failed", {
        method,
        path,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      if (timeoutId) {
        globalThis.clearTimeout(timeoutId);
      }
      if (callerSignal && handleCallerAbort) {
        callerSignal.removeEventListener("abort", handleCallerAbort);
      }
    }

    logger.debug("[api-client] response", { method, path, status: res.status, ok: res.ok });

    if (!res.ok) {
      let code = "internal_error";
      let message = `Request failed with status ${res.status}`;
      let retryable: boolean | undefined;
      let requestId = res.headers.get("x-request-id");

      try {
        const body: JsonErrorResponse & { details?: unknown; error?: string; fields?: unknown; preview?: unknown } = await res.json();
        if (body.code) code = body.code;
        else if (typeof body.error === "string") code = body.error; // routes that return { error: reason }
        if (body.message) message = body.message;
        if (typeof body.retryable === "boolean") retryable = body.retryable;
        if (typeof body.request_id === "string" && body.request_id) requestId = body.request_id;
        let parsedDetails =
          body.details && typeof body.details === "object"
            ? (body.details as Record<string, unknown>)
            : null;
        if (Array.isArray(body.fields)) {
          // Routes that return { error: "validation_failed", fields: [{ field, reason }] }
          parsedDetails = { ...(parsedDetails ?? {}), fields: body.fields };
        }
        if ("preview" in body && body.preview && typeof body.preview === "object") {
          parsedDetails = { ...(parsedDetails ?? {}), preview: body.preview };
        }

        if (
          tokenRequired &&
          !replayedAfterRefresh &&
          res.status === 401 &&
          body.code === "auth_error"
        ) {
          logger.info("[auth] request received 401", { method, path });
          const refreshed = await this.runAuthRefresh().catch(() => false);

          if (refreshed) {
            logger.info("[auth] replaying request after refresh", { method, path });
            return this.request<T>(path, {
              ...init,
              replayedAfterRefresh: true,
            });
          }
        }

        if (
          tokenOptional &&
          !replayedWithoutOptionalToken &&
          res.status === 401 &&
          body.code === "auth_error"
        ) {
          logger.info("[auth] optional token rejected, replaying without auth", { method, path });
          return this.request<T>(path, {
            ...init,
            tokenOptional: false,
            tokenRequired: false,
            replayedWithoutOptionalToken: true,
          });
        }

        logger.error("[api-client] request failed", {
          method,
          path,
          status: res.status,
          code,
          message,
          retryable,
          requestId,
        });
        throw new ApiError(code, message, res.status, retryable, parsedDetails, requestId);
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        logger.error("[api-client] request failed", {
          method,
          path,
          status: res.status,
          code,
          message,
          retryable,
          requestId,
        });
        throw new ApiError(code, message, res.status, retryable, null, requestId);
      }
    }

    if (res.status === 204) {
      return undefined as T;
    }

    if (responseType === "response") {
      return res as T;
    }

    return res.json() as Promise<T>;
  }
}

;
