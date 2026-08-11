import type { FeedPanelState } from "@/components/compositions/posts/feed-side-panel/feed-side-panel";

const VIDEO_EXPERIENCE_QUERY_PARAM = "video";
export const VIDEO_EXPERIENCE_HISTORY_KEY = "pirateVideoViewer";

export function videoIdFromLocation(location: Pick<Location, "href">): string | null {
  const value = new URL(location.href).searchParams.get(VIDEO_EXPERIENCE_QUERY_PARAM)?.trim();
  return value || null;
}

export function hrefWithVideo(href: string, postId: string): string {
  const url = new URL(href);
  url.searchParams.set(VIDEO_EXPERIENCE_QUERY_PARAM, postId);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function hrefWithoutVideo(href: string): string {
  const url = new URL(href);
  url.searchParams.delete(VIDEO_EXPERIENCE_QUERY_PARAM);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function isVideoExperienceHistoryState(state: unknown): boolean {
  if (!state || typeof state !== "object") return false;
  return VIDEO_EXPERIENCE_HISTORY_KEY in state;
}

export function historyStateWithoutVideo(state: unknown): Record<string, unknown> {
  if (!state || typeof state !== "object") return {};
  const next = { ...(state as Record<string, unknown>) };
  delete next[VIDEO_EXPERIENCE_HISTORY_KEY];
  return next;
}

export const VIDEO_COMMENTS_HISTORY_KEY = "pirateGlobalVideoComments";

export function globalVideoCommentsHistoryState(
  state: unknown,
  itemId: string,
  postId: string,
): Record<string, unknown> {
  return {
    ...(state && typeof state === "object" ? state : {}),
    [VIDEO_COMMENTS_HISTORY_KEY]: { itemId, postId },
  };
}

export function globalVideoPanelFromHistoryState(state: unknown): FeedPanelState {
  if (!state || typeof state !== "object") return { kind: "none" };
  const value = (state as Record<string, unknown>)[VIDEO_COMMENTS_HISTORY_KEY];
  if (!value || typeof value !== "object") return { kind: "none" };
  const itemId = (value as Record<string, unknown>).itemId;
  const postId = (value as Record<string, unknown>).postId;
  return typeof itemId === "string" && typeof postId === "string"
    ? { itemId, kind: "comments", postId }
    : { kind: "none" };
}
