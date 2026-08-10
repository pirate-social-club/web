export const feedKeys = {
  all: ["feed"] as const,
  // Explore payloads carry per-viewer vote, membership, purchase, and
  // authorship state. Refetch-on-mount is freshness policy, not a cache
  // boundary, so account switches need distinct entries.
  home: (input: {
    locale: string | null;
    sort: string | null;
    timeRange: string | null;
    userId: string | null;
  }) => [
    ...feedKeys.all,
    "home",
    input.userId ?? null,
    input.locale ?? null,
    input.sort ?? null,
    input.timeRange ?? null,
  ] as const,
  // Keyed by viewer, not by an authenticated boolean: nothing clears the query
  // cache on session change, and a home video payload carries per-viewer state
  // (membership, own-profile, vote). The pre-hydration bootstrap keys on a
  // boolean, but it is one-shot per page load; this cache spans a session.
  // Anonymous viewers share the anonymous public feed, which is correct.
  homeVideos: (input: {
    communityId?: string | null;
    locale: string | null;
    userId: string | null;
  }) => [
    ...feedKeys.all,
    "home-videos",
    input.communityId ?? "global",
    input.userId ?? null,
    input.locale ?? null,
  ] as const,
  publicHome: (input: { locale: string | null; sort: string | null; timeRange: string | null }) =>
    [...feedKeys.all, "home", "public", input.locale ?? null, input.sort ?? null, input.timeRange ?? null] as const,
};

export const postKeys = {
  all: ["posts"] as const,
  publicThread: (input: { locale: string | null; postId: string; sort: string | null }) =>
    [...postKeys.all, "public-thread", input.postId, input.locale ?? null, input.sort ?? null] as const,
};

const profileKeys = {
  all: ["profiles"] as const,
  byUserId: (userId: string) => [...profileKeys.all, "user", userId] as const,
};
