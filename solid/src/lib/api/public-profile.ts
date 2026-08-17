import {
  createPirateApiClient,
  type GetPublicProfilesHandleResponse,
} from "@pirate/api-client";
import { getRequestEvent } from "@solidjs/web";
import { resolveApiUrl } from "./request-origin";

export type PublicProfileResponse = GetPublicProfilesHandleResponse;

export interface PublicProfileCommunity {
  readonly community: string;
  readonly displayName: string;
  readonly created: number | string;
  readonly routeSlug: string | null;
}

export interface PublicProfileView {
  readonly profile: {
    readonly displayName: string | null;
    readonly avatarRef: string | null;
    readonly coverRef: string | null;
    readonly bio: string | null;
    readonly globalHandleLabel: string;
  };
  readonly requestedHandleLabel: string;
  readonly resolvedHandleLabel: string;
  readonly isCanonical: boolean;
  readonly createdCommunities: readonly PublicProfileCommunity[];
}

export type PublicProfileLoadResult =
  | { readonly kind: "success"; readonly status: 200; readonly data: PublicProfileView }
  | { readonly kind: "invalid"; readonly status: 400 }
  | { readonly kind: "not-found"; readonly status: 404 }
  | { readonly kind: "upstream-error"; readonly status: 502 };

export const PUBLIC_PROFILE_CACHE_CONTROL = "public, max-age=60, s-maxage=300";

export interface PublicProfileResponsePolicy {
  readonly status: 200 | 302 | 400 | 404 | 502;
  readonly cacheControl: typeof PUBLIC_PROFILE_CACHE_CONTROL | "no-store";
  readonly vary: "Accept-Language";
  readonly redirect: string | null;
}

export interface PublicProfileRequestOptions {
  readonly request?: Request;
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
}

/** Match only the canonical app route; host-derived profile paths are not accepted here. */
export function parsePublicProfilePath(pathname: string): string | null {
  const match = /^\/u\/([^/]+)$/.exec(pathname);
  if (!match?.[1]) return null;
  let handle: string;
  try {
    handle = decodeURIComponent(match[1]);
  } catch {
    return null;
  }
  if (!handle.trim() || handle.includes("/") || handle.includes("\\")) return null;
  return handle;
}

function nonBlank(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function safeMediaRef(value: string | null | undefined): string | null {
  const trimmed = nonBlank(value);
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" || url.protocol === "ipfs:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function createdValue(value: number | "Infinity" | "-Infinity" | "NaN"): number {
  return typeof value === "number" && Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
}

export function projectPublicProfile(response: PublicProfileResponse): PublicProfileView {
  const communities = response.created_communities
    .map(community => ({
      community: community.community,
      displayName: community.display_name,
      created: community.created,
      routeSlug: nonBlank(community.route_slug),
    }))
    .map((community, index) => ({ community, index }))
    .sort((left, right) => {
      const createdOrder = createdValue(right.community.created) - createdValue(left.community.created);
      if (createdOrder !== 0) return createdOrder;
      return left.index - right.index;
    })
    .map(({ community }) => community);

  return {
    profile: {
      displayName: nonBlank(response.profile.display_name),
      avatarRef: safeMediaRef(response.profile.avatar_ref),
      coverRef: safeMediaRef(response.profile.cover_ref),
      bio: nonBlank(response.profile.bio),
      globalHandleLabel: response.profile.global_handle.label,
    },
    requestedHandleLabel: response.requested_handle_label,
    resolvedHandleLabel: response.resolved_handle_label,
    isCanonical: response.is_canonical,
    createdCommunities: communities,
  };
}

export function profileRedirectTarget(data: PublicProfileView): string | null {
  if (data.isCanonical) return null;
  const encoded = encodeURIComponent(data.resolvedHandleLabel);
  return `/u/${encoded}`;
}

export function profileResponsePolicy(
  result: PublicProfileLoadResult,
  hasAuthorization: boolean,
): PublicProfileResponsePolicy {
  const redirect = result.kind === "success" ? profileRedirectTarget(result.data) : null;
  const status = redirect ? 302 : result.status;
  return {
    status: status as PublicProfileResponsePolicy["status"],
    cacheControl: result.kind === "success" && !hasAuthorization
      ? PUBLIC_PROFILE_CACHE_CONTROL
      : "no-store",
    vary: "Accept-Language",
    redirect,
  };
}

export function classifyPublicProfileError(error: unknown): Exclude<PublicProfileLoadResult, { kind: "success" }> {
  if (error && typeof error === "object" && "status" in error && typeof error.status === "number") {
    if (error.status === 400) return { kind: "invalid", status: 400 };
    if (error.status === 404) return { kind: "not-found", status: 404 };
  }
  return { kind: "upstream-error", status: 502 };
}

export async function fetchPublicProfile(
  handle: string,
  options: PublicProfileRequestOptions = {},
): Promise<PublicProfileView> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 4_000);
  const client = createPirateApiClient(resolveApiUrl("/", options.request), {
    // Public profile reads are explicitly anonymous. The generated client has
    // no auth defaults, and credentials=omit prevents browser cookie leakage.
    fetchImpl: (input, init) => fetchImpl(input, { ...init, credentials: "omit" }),
  });
  try {
    const response = await client.get_publicProfilesHandle(
      { path: { handle } },
      { signal: controller.signal },
    );
    return projectPublicProfile(response);
  } finally {
    clearTimeout(timeout);
  }
}

export async function loadPublicProfile(
  handle: string,
  options: PublicProfileRequestOptions = {},
): Promise<PublicProfileLoadResult> {
  try {
    return { kind: "success", status: 200, data: await fetchPublicProfile(handle, options) };
  } catch (error) {
    return classifyPublicProfileError(error);
  }
}

export function requestForPublicProfile(): Request | undefined {
  const serverRequest = getRequestEvent()?.request;
  if (serverRequest) return serverRequest;
  if (typeof window === "undefined") return undefined;
  return new Request(window.location.href);
}

export function serializePublicProfile(result: PublicProfileLoadResult): string {
  // Keep JSON data safe inside the SSR attribute/script transport while
  // preserving the original value after JSON.parse on hydration.
  return JSON.stringify(result)
    .replaceAll("&", "\\u0026")
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

export function deserializePublicProfile(value: string | null): PublicProfileLoadResult | null {
  if (!value) return null;
  try {
    const result = JSON.parse(value) as PublicProfileLoadResult;
    if (result.kind === "success" && result.status === 200 && result.data?.profile) return result;
    if (result.kind === "invalid" && result.status === 400) return result;
    if (result.kind === "not-found" && result.status === 404) return result;
    if (result.kind === "upstream-error" && result.status === 502) return result;
  } catch {
    // Treat malformed preload data as a client fetch miss.
  }
  return null;
}
