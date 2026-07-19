import type { LocalizedPostResponse } from "@pirate/api-contracts";

import { isApiNotFoundError } from "@/lib/api/client";

type PostReader = {
  get(postId: string, input: { locale: string }): Promise<LocalizedPostResponse>;
};

type SongRoutePostApi = { posts: PostReader; publicPosts: PostReader };

export async function loadSongRoutePost({ api, contentLocale, hasAccessToken, postId }: {
  api: SongRoutePostApi;
  contentLocale: string;
  hasAccessToken: boolean;
  postId: string;
}): Promise<LocalizedPostResponse> {
  if (!hasAccessToken) {
    return await api.publicPosts.get(postId, { locale: contentLocale });
  }

  try {
    return await api.posts.get(postId, { locale: contentLocale });
  } catch (error) {
    // Request-mode communities can mask a public post as not found for a
    // signed-in non-member. Only that response is safe to retry publicly:
    // auth failures must remain visible rather than silently changing modes.
    if (!isApiNotFoundError(error)) throw error;
    return await api.publicPosts.get(postId, { locale: contentLocale });
  }
}
