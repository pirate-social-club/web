import {
  ApiClientError,
  ApiClientProtocolError,
  createPirateApiClient,
  type GetCommunitiesCommunityIdPreviewResponse,
  type GetFeedHomePublicResponse,
} from "@pirate/api-client";
import { getRequestEvent } from "@solidjs/web";
import type { InfiniteData, QueryFunctionContext } from "@tanstack/query-core";
import { resolveApiUrl } from "./request-origin";
import { resolveLocaleLanguageTag, type UiLocaleCode } from "../ui-locale-core";

interface PublicVideoMedia {
  mime_type?: string | null;
  poster_ref?: string | null;
  poster_width?: number | null;
  poster_height?: number | null;
  storage_ref?: string | null;
}

interface PublicVideoPost {
  id: string;
  post_type: "video";
  title?: string | null;
  caption?: string | null;
  author_user?: string | null;
  author_public_handle?: string | null;
  media_refs?: PublicVideoMedia[] | null;
}

export interface PublicVideoFeedItem {
  post: {
    post: PublicVideoPost;
    comment_count?: number | null;
    like_count?: number | null;
    upvote_count?: number | null;
  };
  community?: {
    display_name?: string | null;
    route_slug?: string | null;
    avatar_ref?: string | null;
  } | null;
}

export interface PublicVideoFeedPage {
  items: PublicVideoFeedItem[];
  next_cursor: string | null;
}

export const publicVideoFeedKey = (locale: UiLocaleCode = "en", cursor: string | null = null) =>
  ["feed", "public-videos", resolveLocaleLanguageTag(locale), "best", cursor] as const;

/**
 * The API's keyset cursor is backed by PG NUMERIC and may arrive as a number
 * in a fixture even though production returns a string. Never turn it into a
 * JS number: precision loss would make the next page non-deterministic.
 */
export function normalizeKeysetCursor(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  throw new Error("Invalid public feed keyset cursor");
}

/**
 * Some older public responses contain `usr_usr_<id>`. Normalize exactly one
 * duplicate prefix while preserving ordinary `usr_<id>` values.
 */
export function normalizeAuthorUser(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return value.startsWith("usr_usr_") ? value.slice("usr_".length) : value;
}

export function requestForFeed(): Request | undefined {
  const serverRequest = getRequestEvent()?.request;
  if (serverRequest) return serverRequest;
  if (typeof window === "undefined") return undefined;

  // Keep the preview origin intact. API origin resolution is environment-aware
  // and must never silently turn local browser pagination into production I/O.
  return new Request(window.location.href);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeMediaRefs(value: unknown): PublicVideoMedia[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const media: PublicVideoMedia[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) return null;
    const storageRef = typeof entry.storage_ref === "string" ? entry.storage_ref.trim() : "";
    const mimeType = typeof entry.mime_type === "string" ? entry.mime_type.trim() : "";
    if (!storageRef || !mimeType.startsWith("video/")) return null;
    const ref: PublicVideoMedia = { storage_ref: storageRef, mime_type: mimeType };
    if (typeof entry.poster_ref === "string" && entry.poster_ref.trim()) ref.poster_ref = entry.poster_ref.trim();
    if (typeof entry.poster_width === "number" && Number.isFinite(entry.poster_width)) ref.poster_width = entry.poster_width;
    if (typeof entry.poster_height === "number" && Number.isFinite(entry.poster_height)) ref.poster_height = entry.poster_height;
    media.push(ref);
  }
  return media;
}

function normalizeVideoItem(value: unknown): PublicVideoFeedItem | null {
  if (!isRecord(value) || !isRecord(value.post) || !isRecord(value.post.post)) return null;
  const post = value.post.post;
  if (typeof post.id !== "string" || !post.id) return null;

  // `/feed/home/public` is a mixed feed. Narrow the generated `unknown[]`
  // media payload before reading any video-only fields.
  if (post.post_type !== "video") return null;
  const mediaRefs = normalizeMediaRefs(post.media_refs);
  if (mediaRefs === null) return null;

  return {
    ...value,
    post: {
      ...value.post,
      post: {
        id: post.id,
        post_type: "video",
        title: typeof post.title === "string" ? post.title : null,
        caption: typeof post.caption === "string" ? post.caption : null,
        author_user: normalizeAuthorUser(post.author_user),
        author_public_handle: typeof post.author_public_handle === "string" ? post.author_public_handle : null,
        media_refs: mediaRefs,
      },
    },
  };
}

export function normalizePublicVideoFeed(input: unknown): PublicVideoFeedPage {
  if (!isRecord(input)) throw new Error("Invalid public video feed response");
  const items = Array.isArray(input.items)
    ? input.items.flatMap(item => {
      const normalized = normalizeVideoItem(item);
      return normalized ? [normalized] : [];
    })
    : [];
  return { items, next_cursor: normalizeKeysetCursor(input.next_cursor) };
}

export interface PublicVideoFeedRequestOptions {
  readonly cursor?: string | null;
  readonly locale?: UiLocaleCode;
  readonly request?: Request;
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
}

function boundedFetch(fetchImpl: typeof fetch, timeoutMs: number, noStore = false): typeof fetch {
  return async (input, init) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetchImpl(input, {
        ...init,
        ...(noStore ? { cache: "no-store" } : {}),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  };
}

/** Fetch the generated public operation and project its mixed response to videos. */
export async function fetchPublicVideoFeedPage(
  options: PublicVideoFeedRequestOptions = {},
): Promise<PublicVideoFeedPage> {
  const locale = options.locale ?? "en";
  const query: { locale: string; sort: "best"; cursor?: string } = {
    locale: resolveLocaleLanguageTag(locale),
    sort: "best",
  };
  if (options.cursor) query.cursor = options.cursor;

  // Deliberately omit headers: public feed requests must never forward a
  // browser/SSR Authorization header or become personalized cache entries.
  const client = createPirateApiClient(resolveApiUrl("/", options.request), {
    fetchImpl: boundedFetch(options.fetchImpl ?? fetch, options.timeoutMs ?? 4_000),
  });
  const response: GetFeedHomePublicResponse = await client.get_feedHomePublic({ query });
  return normalizePublicVideoFeed(response);
}

export interface CommunityPreviewRequestOptions {
  readonly locale?: UiLocaleCode;
  readonly request?: Request;
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
  /** An explicit bearer token opts into personalized, no-store preview data. */
  readonly bearerToken?: string;
}

/**
 * Typed community preview boundary. Anonymous calls ignore request cookies and
 * headers; only an explicit bearer token can opt into personalized data.
 */
export async function fetchCommunityPreview(
  communityId: string,
  options: CommunityPreviewRequestOptions = {},
): Promise<GetCommunitiesCommunityIdPreviewResponse> {
  const bearerToken = options.bearerToken?.trim();
  const personalized = Boolean(bearerToken);
  const client = createPirateApiClient(resolveApiUrl("/", options.request), {
    fetchImpl: boundedFetch(options.fetchImpl ?? fetch, options.timeoutMs ?? 4_000, personalized),
    ...(personalized ? { headers: { authorization: `Bearer ${bearerToken}` } } : {}),
  });
  return client.get_communitiesCommunityIdPreview({
    path: { communityId },
    query: { locale: resolveLocaleLanguageTag(options.locale ?? "en") },
  });
}

export function describeApiNextError(error: unknown): Record<string, unknown> {
  if (error instanceof ApiClientError) {
    return {
      name: error.name,
      status: error.status,
      code: error.code,
      declaredName: error.declaredName,
      retryable: error.retryable,
      requestId: error.requestId,
    };
  }
  if (error instanceof ApiClientProtocolError) {
    return { name: error.name, status: error.status, message: error.message };
  }
  return { name: error instanceof Error ? error.name : "UnknownError", message: String(error) };
}

export function createPublicVideoFeedInfiniteQuery(locale: UiLocaleCode = "en") {
  const initialPage = getRequestEvent()?.locals?.publicVideoFeed as PublicVideoFeedPage | undefined;
  return {
    queryKey: publicVideoFeedKey(locale, null),
    queryFn: ({ pageParam }: QueryFunctionContext<ReturnType<typeof publicVideoFeedKey>, string | null>) =>
      fetchPublicVideoFeedPage({ cursor: pageParam, locale, request: requestForFeed() }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: PublicVideoFeedPage) => lastPage.next_cursor,
    staleTime: 5 * 60_000,
    initialData: initialPage
      ? { pages: [initialPage], pageParams: [null] } satisfies InfiniteData<PublicVideoFeedPage, string | null>
      : undefined,
    retry: false,
    throwOnError: (_error: unknown, query: { state: { data: unknown } }) => query.state.data === undefined,
  };
}
