import { describe, expect, test } from "bun:test";
import type * as React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { LocalizedPostResponse } from "@pirate/api-contracts";

import { installDomGlobals } from "@/test/setup-dom";

import { upsertCommunityFeedPostCache, useCommunityFeedPosts } from "./community-feed-data";

installDomGlobals();

function wrapperWithClient(queryClient: QueryClient) {
  return function TestQueryWrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function createPostResponse(id: string, created: number): LocalizedPostResponse {
  return {
    post: {
      id,
      object: "post",
      post: id,
      community: "cmt_test",
      post_type: "text",
      title: id,
      body: null,
      caption: null,
      status: "published",
      visibility: "public",
      identity_mode: "anonymous",
      author_user: null,
      anonymous_label: "anon",
      authorship_mode: "human_direct",
      agent_display_name_snapshot: null,
      agent_owner_handle_snapshot: null,
      source_language: "en",
      translation_policy: "machine_allowed",
      label_id: null,
      disclosed_qualifiers_json: null,
      media_refs: [],
      embeds: [],
      link_url: null,
      asset: null,
      access_mode: "public",
      created,
    },
    thread_snapshot: null,
    comment_count: 0,
    label: null,
    upvote_count: 0,
    downvote_count: 0,
    like_count: 0,
    viewer_vote: null,
    viewer_reaction_kinds: [],
    resolved_locale: "en",
    translation_state: "same_language",
    machine_translated: false,
    translated_title: null,
    translated_body: null,
    translated_caption: null,
    source_hash: null,
  } as unknown as LocalizedPostResponse;
}

describe("useCommunityFeedPosts", () => {
  test("keeps empty pending feed arrays stable across rerenders", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const loadPosts = () => new Promise<{ items: LocalizedPostResponse[]; next_cursor: string | null }>(() => {});

    const { result, rerender } = renderHook(() => useCommunityFeedPosts({
      communityId: "cmt_test",
      locale: "en",
      sort: "best",
      loadPosts,
    }), { wrapper: wrapperWithClient(queryClient) });

    const firstRawPosts = result.current.rawPosts;
    const firstPosts = result.current.posts;

    rerender();

    expect(result.current.loading).toBe(true);
    expect(result.current.rawPosts).toBe(firstRawPosts);
    expect(result.current.posts).toBe(firstPosts);
  });

  test("upserts a pending post across community feed sort caches", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const existing = createPostResponse("pst_existing", 10);
    const pending = createPostResponse("pst_pending", 20);
    queryClient.setQueryData(["community-feed-posts", "cmt_test", "en", "best"], {
      items: [existing],
      next_cursor: "next-best",
    });
    queryClient.setQueryData(["community-feed-posts", "cmt_test", "en", "new"], {
      items: [pending, existing],
      next_cursor: null,
    });

    upsertCommunityFeedPostCache({
      queryClient,
      communityId: "cmt_test",
      locale: "en",
      post: pending,
    });

    expect(queryClient.getQueryData<{ items: LocalizedPostResponse[]; next_cursor: string | null }>([
      "community-feed-posts",
      "cmt_test",
      "en",
      "best",
    ])?.items.map((item) => item.post.id)).toEqual(["pst_pending", "pst_existing"]);
    expect(queryClient.getQueryData<{ items: LocalizedPostResponse[]; next_cursor: string | null }>([
      "community-feed-posts",
      "cmt_test",
      "en",
      "new",
    ])?.items.map((item) => item.post.id)).toEqual(["pst_pending", "pst_existing"]);
    expect(queryClient.getQueryData<{ items: LocalizedPostResponse[]; next_cursor: string | null }>([
      "community-feed-posts",
      "cmt_test",
      "en",
      "top",
    ])?.items.map((item) => item.post.id)).toEqual(["pst_pending"]);
    expect(queryClient.getQueryData<{ items: LocalizedPostResponse[]; next_cursor: string | null }>([
      "community-feed-posts",
      "cmt_test",
      "en",
      "best",
    ])?.next_cursor).toBe("next-best");
  });

  test("loads posts through React Query and exposes cache-backed optimistic updates", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const first = createPostResponse("pst_first", 10);
    const second = createPostResponse("pst_second", 20);
    const loadPosts = async () => ({ items: [first], next_cursor: null });

    const { result } = renderHook(() => useCommunityFeedPosts({
      communityId: "cmt_test",
      locale: "en",
      sort: "new",
      loadPosts,
    }), { wrapper: wrapperWithClient(queryClient) });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.rawPosts.map((item) => item.post.id)).toEqual(["pst_first"]);
    });

    act(() => {
      result.current.setPosts((current) => [second, ...current]);
    });

    await waitFor(() => {
      expect(result.current.rawPosts.map((item) => item.post.id)).toEqual(["pst_second", "pst_first"]);
    });
    expect(queryClient.getQueryData<{ items: LocalizedPostResponse[]; next_cursor: string | null }>([
      "community-feed-posts",
      "cmt_test",
      "en",
      "new",
    ])?.items.map((item) => item.post.id)).toEqual(["pst_second", "pst_first"]);

    await act(async () => {
      await result.current.refetchPosts();
    });

    await waitFor(() => {
      expect(result.current.rawPosts.map((item) => item.post.id)).toEqual(["pst_first"]);
    });
  });

  test("appends cursor pages without duplicating posts", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const first = createPostResponse("pst_first", 20);
    const second = createPostResponse("pst_second", 10);
    const cursors: Array<string | null> = [];
    const loadPosts = async ({ cursor }: { cursor: string | null }) => {
      cursors.push(cursor);
      return cursor
        ? { items: [first, second], next_cursor: null }
        : { items: [first], next_cursor: "next-page" };
    };

    const { result } = renderHook(() => useCommunityFeedPosts({
      communityId: "cmt_test",
      locale: "en",
      sort: "best",
      loadPosts,
    }), { wrapper: wrapperWithClient(queryClient) });

    await waitFor(() => {
      expect(result.current.hasMore).toBe(true);
    });

    await act(async () => {
      await result.current.loadMore();
    });

    expect(cursors).toEqual([null, "next-page"]);
    expect(result.current.rawPosts.map((item) => item.post.id)).toEqual(["pst_first", "pst_second"]);
    expect(result.current.hasMore).toBe(false);
  });
});
