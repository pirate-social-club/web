import type { LocalizedPostResponse } from "@pirate/api-contracts";

import { isApiNotFoundError } from "@/lib/api/client";

type PostReader = {
  get(postId: string, input: { locale: string }): Promise<LocalizedPostResponse>;
};

type SongRoutePostApi = { posts: PostReader; publicPosts: PostReader };

export type SongRoutePostReadMode = "authenticated" | "public";

export interface LoadedSongRoutePost {
  post: LocalizedPostResponse;
  readMode: SongRoutePostReadMode;
}

export async function loadSongRoutePostWithReadMode({ api, contentLocale, hasAccessToken, postId }: {
  api: SongRoutePostApi;
  contentLocale: string;
  hasAccessToken: boolean;
  postId: string;
}): Promise<LoadedSongRoutePost> {
  if (!hasAccessToken) {
    return {
      post: await api.publicPosts.get(postId, { locale: contentLocale }),
      readMode: "public",
    };
  }

  try {
    return {
      post: await api.posts.get(postId, { locale: contentLocale }),
      readMode: "authenticated",
    };
  } catch (error) {
    // Request-mode communities can mask a public post as not found for a
    // signed-in non-member. Only that response is safe to retry publicly:
    // auth failures must remain visible rather than silently changing modes.
    if (!isApiNotFoundError(error)) throw error;
    return {
      post: await api.publicPosts.get(postId, { locale: contentLocale }),
      readMode: "public",
    };
  }
}

export async function loadSongRoutePost({ api, contentLocale, hasAccessToken, postId }: {
  api: SongRoutePostApi;
  contentLocale: string;
  hasAccessToken: boolean;
  postId: string;
}): Promise<LocalizedPostResponse> {
  return (await loadSongRoutePostWithReadMode({ api, contentLocale, hasAccessToken, postId })).post;
}
