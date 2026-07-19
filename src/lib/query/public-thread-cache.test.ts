import { describe, expect, test } from "bun:test";
import type { LocalizedPostResponse } from "@pirate/api-contracts";
import { QueryClient } from "@tanstack/react-query";

import { applyPostVote } from "@/app/authenticated-helpers/post-vote";
import { postKeys } from "./keys";
import {
  type PublicThreadQueryData,
  updateCachedPublicThreadPost,
} from "./public-thread-cache";

function postResponse(): LocalizedPostResponse {
  return {
    post: { id: "pst_vote_cache" },
    upvote_count: 4,
    downvote_count: 0,
    viewer_vote: null,
  } as LocalizedPostResponse;
}

describe("public thread cache", () => {
  test("carries an optimistic vote into every existing permalink sort", () => {
    const queryClient = new QueryClient();
    const queryKeys = ["best", "new", "top"].map((sort) =>
      postKeys.publicThread({ postId: "pst_vote_cache", locale: "en", sort }));
    for (const queryKey of queryKeys) {
      queryClient.setQueryData<PublicThreadQueryData>(queryKey, {
        post: postResponse(),
        community: null,
        comments: [],
        authorProfiles: {},
        partial: true,
        source: "feed_seed",
      });
    }

    updateCachedPublicThreadPost({
      locale: "en",
      postId: "pst_vote_cache",
      queryClient,
      update: (post) => applyPostVote(post, 1),
    });

    for (const queryKey of queryKeys) {
      const cached = queryClient.getQueryData<PublicThreadQueryData>(queryKey);
      expect(cached?.post.viewer_vote).toBe(1);
      expect(cached?.post.upvote_count).toBe(5);
      expect(cached?.partial).toBe(true);
      expect(cached?.source).toBe("feed_seed");
    }
  });

  test("does not create missing sort variants or update another locale", () => {
    const queryClient = new QueryClient();
    const otherLocaleKey = postKeys.publicThread({ postId: "pst_vote_cache", locale: "es", sort: "new" });
    queryClient.setQueryData<PublicThreadQueryData>(otherLocaleKey, {
      post: postResponse(),
      community: null,
      comments: [],
      authorProfiles: {},
      partial: false,
      source: "thread_api",
    });

    updateCachedPublicThreadPost({
      locale: "en",
      postId: "pst_vote_cache",
      queryClient,
      update: (post) => applyPostVote(post, 1),
    });

    for (const sort of ["best", "new", "top"]) {
      expect(queryClient.getQueryData(
        postKeys.publicThread({ postId: "pst_vote_cache", locale: "en", sort }),
      )).toBeUndefined();
    }
    const otherLocale = queryClient.getQueryData<PublicThreadQueryData>(otherLocaleKey);
    expect(otherLocale?.post.viewer_vote).toBeNull();
    expect(otherLocale?.post.upvote_count).toBe(4);
  });
});
