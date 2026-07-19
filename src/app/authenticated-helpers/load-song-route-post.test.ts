import { describe, expect, mock, test } from "bun:test";

import { ApiError } from "@/lib/api/client";
import { loadSongRoutePost } from "./load-song-route-post";

const authenticatedPost = { post: { id: "pst_song" } } as never;
const publicPost = { post: { id: "pst_song_public" } } as never;

function createApi(authenticatedResult: unknown = authenticatedPost) {
  const authenticatedGet = mock(async () => {
    if (authenticatedResult instanceof Error) throw authenticatedResult;
    return authenticatedResult as never;
  });
  const publicGet = mock(async () => publicPost);

  return {
    api: { posts: { get: authenticatedGet }, publicPosts: { get: publicGet } },
    authenticatedGet,
    publicGet,
  };
}

describe("loadSongRoutePost", () => {
  test("uses the public read for a signed-out viewer", async () => {
    const { api, authenticatedGet, publicGet } = createApi();
    await expect(loadSongRoutePost({ api, contentLocale: "en", hasAccessToken: false, postId: "pst_song" })).resolves.toBe(publicPost);
    expect(authenticatedGet).not.toHaveBeenCalled();
    expect(publicGet).toHaveBeenCalledWith("pst_song", { locale: "en" });
  });

  test("uses the authenticated read for a signed-in viewer", async () => {
    const { api, authenticatedGet, publicGet } = createApi();
    await expect(loadSongRoutePost({ api, contentLocale: "es", hasAccessToken: true, postId: "pst_song" })).resolves.toBe(authenticatedPost);
    expect(authenticatedGet).toHaveBeenCalledWith("pst_song", { locale: "es" });
    expect(publicGet).not.toHaveBeenCalled();
  });

  test("retries publicly when the authenticated read masks a public post as not found", async () => {
    const { api, publicGet } = createApi(new ApiError("not_found", "Community not found", 404));
    await expect(loadSongRoutePost({ api, contentLocale: "en", hasAccessToken: true, postId: "pst_song" })).resolves.toBe(publicPost);
    expect(publicGet).toHaveBeenCalledWith("pst_song", { locale: "en" });
  });

  test("does not silently fall back to public state on an auth failure", async () => {
    const authError = new ApiError("unauthorized", "Session expired", 401);
    const { api, publicGet } = createApi(authError);
    await expect(loadSongRoutePost({ api, contentLocale: "en", hasAccessToken: true, postId: "pst_song" })).rejects.toBe(authError);
    expect(publicGet).not.toHaveBeenCalled();
  });
});
