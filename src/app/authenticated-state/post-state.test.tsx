import { describe, expect, test } from "bun:test";
import type * as React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { installDomGlobals } from "@/test/setup-dom";

import type { CommunityPreview, LocalizedPostResponse } from "@pirate/api-contracts";

import { api } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { __resetSessionStoreForTests } from "@/lib/api/session-store";
import { PirateQueryProvider } from "@/lib/query/query-client";
import { postKeys } from "@/lib/query/keys";
import type { PublicThreadQueryData } from "@/lib/query/public-thread-cache";

import { usePost } from "./post-state";

installDomGlobals();
Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }),
});
Object.defineProperty(window, "location", {
  configurable: true,
  value: new URL("https://app.pirate.sc/post/pst_test"),
});

const labels = {
  cancelReplyLabel: "Cancel",
  loadMoreRepliesLabel: "Load more replies",
  loadRepliesLabel: "Load replies",
  loadingRepliesLabel: "Loading replies",
  replyActionLabel: "Reply",
  replyPlaceholder: "Write a reply",
  showOriginalLabel: "Show original",
  showTranslationLabel: "Show translation",
  submitReplyLabel: "Post reply",
};

function wrapper({ children }: { children: React.ReactNode }) {
  return <PirateQueryProvider>{children}</PirateQueryProvider>;
}

function wrapperWithClient(queryClient: QueryClient) {
  return function TestQueryWrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function createPostResponse(): LocalizedPostResponse {
  return {
    post: {
      id: "pst_test",
      object: "post",
      post: "pst_test",
      community: "cmt_test",
      post_type: "text",
      title: "Post title",
      body: "Post body",
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
      created: Date.parse("2026-04-24T00:00:00.000Z"),
    } as unknown as LocalizedPostResponse["post"],
    thread_snapshot: {
      thread_root_post: "pst_test",
      thread_root_post_id: "pst_test",
      snapshot_seq: 1,
      published_through_comment_created: Date.parse("2026-04-24T00:00:00.000Z"),
      comment_count: 0,
      swarm_manifest_ref: "swarm://comments/pst_test",
      swarm_feed_ref: null,
      created: Date.parse("2026-04-24T00:00:00.000Z"),
    } as unknown as LocalizedPostResponse["thread_snapshot"],
    comment_count: 0,
    label: null,
    upvote_count: 0,
    downvote_count: 0,
    like_count: 0,
    viewer_vote: null,
    viewer_reaction_kinds: [],
    resolved_locale: "es",
    translation_state: "same_language",
    machine_translated: false,
    translated_title: null,
    translated_body: null,
    translated_caption: null,
    source_hash: "hash",
  };
}

function createPreview(): CommunityPreview {
  return {
    id: "cmt_test",
    object: "community_preview",
    display_name: "Preview Community",
    description: "Localized preview source",
    localized_text: null,
    avatar_ref: null,
    banner_ref: null,
    membership_mode: "open",
    human_verification_lane: "self",
    member_count: 2,
    follower_count: 3,
    donation_policy_mode: "none",
    donation_partner: null,
    owner: {
      user: "usr_owner",
      display_name: "Owner Person",
      handle: "owner.pirate",
      avatar_ref: null,
      nationality_badge_country: null,
      role: "owner" as const,
    },
    moderators: [],
    reference_links: [],
    membership_gate_summaries: [],
    rules: [],
    viewer_membership_status: "member",
    viewer_following: true,
    created: Date.parse("2026-04-24T00:00:00.000Z"),
  };
}

describe("usePost", () => {
  test("keeps a cached feed-seeded thread shell for anonymous post navigation", async () => {
    __resetSessionStoreForTests();
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    queryClient.setQueryData<PublicThreadQueryData>(
      postKeys.publicThread({ postId: "pst_test", locale: "es", sort: "best" }),
      {
        post: createPostResponse(),
        community: createPreview(),
        comments: [],
        authorProfiles: {},
        partial: true,
        source: "feed_seed",
      },
    );

    const publicPosts = api.publicPosts as unknown as {
      getThread: () => Promise<unknown>;
    };
    publicPosts.getThread = () => new Promise<unknown>(() => undefined);

    const { result } = renderHook(() => usePost("pst_test", "es", false, labels), {
      wrapper: wrapperWithClient(queryClient),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.threadPartial).toBe(true);
    expect(result.current.post?.post.id).toBe("pst_test");
    expect(result.current.community?.display_name).toBe("Preview Community");
  });

  test("renders a cached feed-seeded thread shell before authenticated post fetch resolves", async () => {
    __resetSessionStoreForTests();
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    queryClient.setQueryData<PublicThreadQueryData>(
      postKeys.publicThread({ postId: "pst_test", locale: "es", sort: "best" }),
      {
        post: createPostResponse(),
        community: createPreview(),
        comments: [],
        authorProfiles: {},
        partial: true,
        source: "feed_seed",
      },
    );

    const posts = api.posts as unknown as {
      get: (postId: string, opts?: { locale?: string | null }) => Promise<LocalizedPostResponse>;
    };
    posts.get = () => new Promise<LocalizedPostResponse>(() => undefined);

    const { result } = renderHook(() => usePost("pst_test", "es", true, labels), {
      wrapper: wrapperWithClient(queryClient),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.threadPartial).toBe(true);
    expect(result.current.post?.post.id).toBe("pst_test");
    expect(result.current.community?.display_name).toBe("Preview Community");
  });

  test("loads authenticated post sidebar data through localized community preview", async () => {
    __resetSessionStoreForTests();
    const calls = {
      communityGet: 0,
      communityPreview: [] as Array<{ communityId: string; locale?: string | null }>,
    };

    const communities = api.communities as unknown as {
      get: (communityId: string, opts?: { locale?: string | null }) => Promise<unknown>;
      preview: (communityId: string, opts?: { locale?: string | null }) => Promise<CommunityPreview>;
      listComments: (...args: unknown[]) => Promise<{ items: []; next_cursor: null }>;
    };
    const posts = api.posts as unknown as {
      get: (postId: string, opts?: { locale?: string | null }) => Promise<LocalizedPostResponse>;
    };
    const agents = api.agents as unknown as {
      list: () => Promise<{ items: [] }>;
    };

    communities.get = async () => {
      calls.communityGet += 1;
      throw new Error("owner-only community get should not be called");
    };
    communities.preview = async (communityId, opts) => {
      calls.communityPreview.push({ communityId, locale: opts?.locale });
      return createPreview();
    };
    communities.listComments = async () => ({ items: [], next_cursor: null });
    posts.get = async () => createPostResponse();
    agents.list = async () => ({ items: [] });

    const { result } = renderHook(() => usePost("pst_test", "es", true, labels), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.community?.display_name).toBe("Preview Community"));

    expect(calls.communityGet).toBe(0);
    expect(calls.communityPreview).toEqual([{ communityId: "cmt_test", locale: "es" }]);
    expect(result.current.community?.display_name).toBe("Preview Community");
  });

  test("renders the post before slower sidebar and comments data resolves", async () => {
    __resetSessionStoreForTests();
    let resolvePreview: ((preview: CommunityPreview) => void) | null = null;

    const communities = api.communities as unknown as {
      preview: (communityId: string, opts?: { locale?: string | null }) => Promise<CommunityPreview>;
      listComments: (...args: unknown[]) => Promise<{ items: []; next_cursor: null }>;
    };
    const posts = api.posts as unknown as {
      get: (postId: string, opts?: { locale?: string | null }) => Promise<LocalizedPostResponse>;
    };
    const agents = api.agents as unknown as {
      list: () => Promise<{ items: [] }>;
    };

    posts.get = async () => createPostResponse();
    communities.preview = () => new Promise<CommunityPreview>((resolve) => {
      resolvePreview = resolve;
    });
    communities.listComments = async () => ({ items: [], next_cursor: null });
    agents.list = async () => ({ items: [] });

    const { result } = renderHook(() => usePost("pst_test", "es", true, labels), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.post?.post.id).toBe("pst_test");
    expect(result.current.community).toBeNull();

    const resolveLoadedPreview = resolvePreview as unknown as (preview: CommunityPreview) => void;
    resolveLoadedPreview(createPreview());
    await waitFor(() => expect(result.current.community?.display_name).toBe("Preview Community"));
  });

  test("normalizes legacy public post fallback before loading community data", async () => {
    __resetSessionStoreForTests();
    const calls = {
      communityPreview: [] as Array<{ communityId: string; locale?: string | null }>,
      publicPost: [] as Array<{ postId: string; locale?: string | null }>,
    };

    const communities = api.communities as unknown as {
      preview: (communityId: string, opts?: { locale?: string | null }) => Promise<CommunityPreview>;
    };
    const posts = api.posts as unknown as {
      get: (postId: string, opts?: { locale?: string | null }) => Promise<LocalizedPostResponse>;
    };
    const publicPosts = api.publicPosts as unknown as {
      get: (postId: string, opts?: { locale?: string | null }) => Promise<LocalizedPostResponse>;
    };
    const publicComments = api.publicComments as unknown as {
      listPostComments: (...args: unknown[]) => Promise<{ items: []; next_cursor: null }>;
    };
    const agents = api.agents as unknown as {
      list: () => Promise<{ items: [] }>;
    };

    posts.get = async () => {
      throw new ApiError("not_found", "Community not found", 404);
    };
    publicPosts.get = async (postId, opts) => {
      calls.publicPost.push({ postId, locale: opts?.locale });
      const response = createPostResponse();
      const { id: _id, community: _community, ...legacyPost } = response.post;
      return {
        ...response,
        post: {
          ...legacyPost,
          post_id: "pst_test",
          community_id: "cmt_test",
        },
      } as unknown as LocalizedPostResponse;
    };
    communities.preview = async (communityId, opts) => {
      calls.communityPreview.push({ communityId, locale: opts?.locale });
      return createPreview();
    };
    publicComments.listPostComments = async () => ({ items: [], next_cursor: null });
    agents.list = async () => ({ items: [] });

    const { result } = renderHook(() => usePost("post_pst_test", "ar", true, labels), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.community?.display_name).toBe("Preview Community"));

    expect(calls.publicPost).toEqual([{ postId: "post_pst_test", locale: "ar" }]);
    expect(calls.communityPreview).toEqual([{ communityId: "com_cmt_test", locale: "ar" }]);
    expect(result.current.post?.post.id).toBe("post_pst_test");
    expect(result.current.post?.post.community).toBe("com_cmt_test");
  });
});
