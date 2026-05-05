export const feedKeys = {
  all: ["feed"] as const,
  publicHome: (input: { locale: string | null; sort: string | null; timeRange: string | null }) =>
    [...feedKeys.all, "home", "public", input.locale ?? null, input.sort ?? null, input.timeRange ?? null] as const,
};

export const postKeys = {
  all: ["posts"] as const,
  publicThread: (input: { locale: string | null; postId: string; sort: string | null }) =>
    [...postKeys.all, "public-thread", input.postId, input.locale ?? null, input.sort ?? null] as const,
};

export const profileKeys = {
  all: ["profiles"] as const,
  byUserId: (userId: string) => [...profileKeys.all, "user", userId] as const,
};
