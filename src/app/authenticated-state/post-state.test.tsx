import { describe, expect, test } from "bun:test";
import type * as React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { installDomGlobals } from "@/test/setup-dom";

import type { Comment, CommentListItem, CommunityPreview, CreateCommentRequest, JoinEligibility, LocalizedPostResponse } from "@pirate/api-contracts";

import { api } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { __resetSessionStoreForTests, setSession } from "@/lib/api/session-store";
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

function createCommentItem(commentId = "cmt_parent"): CommentListItem {
  return {
    comment: {
      id: commentId,
      parent_comment: null,
      identity_mode: "anonymous",
      anonymous_label: "anon",
      author_user: null,
      status: "published",
      body: "Existing comment",
      score: 0,
      direct_reply_count: 0,
      descendant_count: 0,
      created: Date.parse("2026-04-24T00:00:00.000Z"),
      media_refs: [],
    },
    resolved_locale: "en",
    translation_state: "same_language",
    translated_body: null,
    viewer_vote: null,
  } as unknown as CommentListItem;
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

function createJoinEligibility(): JoinEligibility {
  return {
    community: "cmt_test",
    membership_mode: "open",
    human_verification_lane: "self",
    joinable_now: false,
    status: "already_joined",
    membership_gate_summaries: [],
  };
}

function installLiveSession() {
  setSession({
    access_token: "test-token",
    user: { id: "usr_test" },
    profile: null,
    onboarding: {},
    wallet_attachments: [],
  } as Parameters<typeof setSession>[0]);
}

function createCommentFile() {
  return new File(["gif"], "comment.gif", { type: "image/gif" });
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

  test("uploads root comment attachments as comment_image and sends media refs", async () => {
    __resetSessionStoreForTests();
    installLiveSession();
    const calls = {
      createComment: null as CreateCommentRequest | null,
      uploadKind: null as string | null,
    };

    const communities = api.communities as unknown as {
      preview: (communityId: string, opts?: { locale?: string | null }) => Promise<CommunityPreview>;
      listComments: (...args: unknown[]) => Promise<{ items: CommentListItem[]; next_cursor: null }>;
      getJoinEligibility: (communityId: string) => Promise<JoinEligibility>;
      uploadMedia: (input: { kind: string; file: File }) => Promise<{ media_ref: string; mime_type: string; size_bytes: number }>;
      createComment: (communityId: string, postId: string, body: CreateCommentRequest) => Promise<void>;
    };
    const posts = api.posts as unknown as {
      get: (postId: string, opts?: { locale?: string | null }) => Promise<LocalizedPostResponse>;
    };
    const agents = api.agents as unknown as {
      list: () => Promise<{ items: [] }>;
    };

    posts.get = async () => createPostResponse();
    communities.preview = async () => createPreview();
    communities.listComments = async () => ({ items: [], next_cursor: null });
    communities.getJoinEligibility = async () => createJoinEligibility();
    communities.uploadMedia = async (input) => {
      calls.uploadKind = input.kind;
      return {
        media_ref: "https://media.test/comment.gif",
        mime_type: input.file.type,
        size_bytes: input.file.size,
      };
    };
    communities.createComment = async (_communityId, _postId, body) => {
      calls.createComment = body;
    };
    agents.list = async () => ({ items: [] });

    const { result } = renderHook(() => usePost("pst_test", "en", true, labels), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.createTopLevelComment({
        attachment: {
          file: createCommentFile(),
          label: "comment.gif",
          mimeType: "image/gif",
          previewUrl: "blob:comment",
        },
        authorMode: "human",
        body: "",
      });
    });

    expect(calls.uploadKind).toBe("comment_image");
    expect(calls.createComment).toEqual({
      body: "",
      media_refs: [{
        storage_ref: "https://media.test/comment.gif",
        mime_type: "image/gif",
        size_bytes: 3,
      }],
    });
  });

  test("uploads reply attachments as comment_image and sends media refs", async () => {
    __resetSessionStoreForTests();
    installLiveSession();
    const calls = {
      createReply: null as CreateCommentRequest | null,
      uploadKind: null as string | null,
    };
    const parentComment = createCommentItem("cmt_parent");

    const communities = api.communities as unknown as {
      preview: (communityId: string, opts?: { locale?: string | null }) => Promise<CommunityPreview>;
      listComments: (...args: unknown[]) => Promise<{ items: CommentListItem[]; next_cursor: null }>;
      getJoinEligibility: (communityId: string) => Promise<JoinEligibility>;
      uploadMedia: (input: { kind: string; file: File }) => Promise<{ media_ref: string; mime_type: string; size_bytes: number }>;
    };
    const comments = api.comments as unknown as {
      createReply: (commentId: string, body: CreateCommentRequest) => Promise<void>;
      getContext: (commentId: string, opts?: { limit?: string | null; locale?: string | null }) => Promise<{ comment: CommentListItem; replies: CommentListItem[]; next_replies_cursor: null }>;
    };
    const posts = api.posts as unknown as {
      get: (postId: string, opts?: { locale?: string | null }) => Promise<LocalizedPostResponse>;
    };
    const agents = api.agents as unknown as {
      list: () => Promise<{ items: [] }>;
    };

    posts.get = async () => createPostResponse();
    communities.preview = async () => createPreview();
    communities.listComments = async () => ({ items: [parentComment], next_cursor: null });
    communities.getJoinEligibility = async () => createJoinEligibility();
    communities.uploadMedia = async (input) => {
      calls.uploadKind = input.kind;
      return {
        media_ref: "https://media.test/reply.gif",
        mime_type: input.file.type,
        size_bytes: input.file.size,
      };
    };
    comments.createReply = async (_commentId, body) => {
      calls.createReply = body;
    };
    comments.getContext = async () => ({
      comment: parentComment,
      replies: [],
      next_replies_cursor: null,
    });
    agents.list = async () => ({ items: [] });

    const { result } = renderHook(() => usePost("pst_test", "en", true, labels), { wrapper });

    await waitFor(() => expect(result.current.comments).toHaveLength(1));
    await act(async () => {
      await result.current.comments[0]?.onReplySubmit?.({
        attachment: {
          file: createCommentFile(),
          label: "comment.gif",
          mimeType: "image/gif",
          previewUrl: "blob:comment",
        },
        authorMode: "human",
        body: "",
      });
    });

    expect(calls.uploadKind).toBe("comment_image");
    expect(calls.createReply).toEqual({
      body: "",
      media_refs: [{
        storage_ref: "https://media.test/reply.gif",
        mime_type: "image/gif",
        size_bytes: 3,
      }],
    });
  });

  test("deletes owned comments and tombstones them locally", async () => {
    __resetSessionStoreForTests();
    installLiveSession();
    const parentComment = {
      ...createCommentItem("cmt_owned"),
      translated_body: "Translated comment",
      translation_state: "ready",
      viewer_can_delete: true,
      comment: {
        ...createCommentItem("cmt_owned").comment,
        body: "Original comment",
        media_refs: [{
          storage_ref: "https://media.test/comment.gif",
          mime_type: "image/gif",
        }],
      },
    } as CommentListItem;
    const calls = {
      deletedComment: null as string | null,
    };

    const originalConfirm = window.confirm;
    Object.defineProperty(window, "confirm", {
      configurable: true,
      value: () => true,
    });

    const communities = api.communities as unknown as {
      preview: (communityId: string, opts?: { locale?: string | null }) => Promise<CommunityPreview>;
      listComments: (...args: unknown[]) => Promise<{ items: CommentListItem[]; next_cursor: null }>;
    };
    const comments = api.comments as unknown as {
      delete: (commentId: string) => Promise<Comment>;
    };
    const posts = api.posts as unknown as {
      get: (postId: string, opts?: { locale?: string | null }) => Promise<LocalizedPostResponse>;
    };
    const agents = api.agents as unknown as {
      list: () => Promise<{ items: [] }>;
    };

    posts.get = async () => createPostResponse();
    communities.preview = async () => createPreview();
    communities.listComments = async () => ({ items: [parentComment], next_cursor: null });
    comments.delete = async (commentId) => {
      calls.deletedComment = commentId;
      return {
        ...parentComment.comment,
        body: "[deleted]",
        media_refs: [],
        status: "deleted",
      } as Comment;
    };
    agents.list = async () => ({ items: [] });

    try {
      const { result } = renderHook(() => usePost("pst_test", "en", true, labels), { wrapper });

      await waitFor(() => expect(result.current.comments[0]?.canDelete).toBe(true));
      await act(async () => {
        result.current.comments[0]?.onDelete?.();
      });
      await waitFor(() => expect(calls.deletedComment).toBe("cmt_owned"));

      expect(result.current.comments[0]?.body).toBe("[deleted]");
      expect(result.current.comments[0]?.media).toBeUndefined();
      expect(result.current.comments[0]?.canDelete).toBe(false);
    } finally {
      Object.defineProperty(window, "confirm", {
        configurable: true,
        value: originalConfirm,
      });
    }
  });
});
