import { beforeEach, describe, expect, test } from "bun:test";
import type * as React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type {
  CommentListItem,
  CommunityPreview,
  JoinEligibility,
  LocalizedPostResponse,
} from "@pirate/api-contracts";

import { installDomGlobals } from "@/test/setup-dom";
import type { RunGatedCommunityActionParams } from "@/hooks/use-community-interaction-gate.helpers";

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

const { mock } = await import("bun:test") as unknown as {
  mock: {
    module: (specifier: string, factory: () => unknown) => void;
  };
};

const gateCalls: RunGatedCommunityActionParams[] = [];
const prewarmCalls: Array<{ communityId: string; gateData: NonNullable<RunGatedCommunityActionParams["gateData"]> }> = [];

mock.module("@/hooks/use-community-interaction-gate", () => ({
  useCommunityInteractionGate: () => ({
    gateModal: null,
    prewarmCommunityGate: (communityId: string, gateData: NonNullable<RunGatedCommunityActionParams["gateData"]>) => {
      prewarmCalls.push({ communityId, gateData });
    },
    runGatedCommunityAction: async (params: RunGatedCommunityActionParams) => {
      gateCalls.push(params);
      if (params.gateData?.eligibility.status === "banned") {
        return "blocked";
      }
      await params.onAllowed({ altchaPayload: "vote-proof" });
      return "allowed";
    },
  }),
}));

const { api } = await import("@/lib/api");
const { __resetSessionStoreForTests, setSession } = await import("@/lib/api/session-store");
const { usePost } = await import("./post-state");

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

function wrapperWithClient(queryClient: QueryClient) {
  return function TestQueryWrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function createPostResponse(community: CommunityPreview | null = null): LocalizedPostResponse {
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
      comment_count: 1,
      swarm_manifest_ref: "swarm://comments/pst_test",
      swarm_feed_ref: null,
      created: Date.parse("2026-04-24T00:00:00.000Z"),
    } as unknown as LocalizedPostResponse["thread_snapshot"],
    comment_count: 1,
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
    source_hash: "hash",
    community,
  };
}

function createPreview(): CommunityPreview {
  return {
    id: "cmt_test",
    object: "community_preview",
    display_name: "Preview Community",
    description: "Preview source",
    localized_text: null,
    avatar_ref: null,
    banner_ref: null,
    membership_mode: "gated",
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
    membership_gate_summaries: [{ gate_type: "altcha_pow" }],
    rules: [],
    viewer_membership_status: "member",
    viewer_following: true,
    created: Date.parse("2026-04-24T00:00:00.000Z"),
  } as CommunityPreview;
}

function createJoinEligibility(): JoinEligibility {
  return {
    community: "cmt_test",
    membership_mode: "gated",
    human_verification_lane: "self",
    joinable_now: false,
    status: "already_joined",
    membership_gate_summaries: [{ gate_type: "altcha_pow" }],
  } as JoinEligibility;
}

function createCommentItem(): CommentListItem {
  return {
    comment: {
      id: "cmt_parent",
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

beforeEach(() => {
  gateCalls.length = 0;
  prewarmCalls.length = 0;
  __resetSessionStoreForTests();
  setSession({
    access_token: "test-token",
    user: { id: "usr_test" },
    profile: null,
    onboarding: {},
    wallet_attachments: [],
  } as Parameters<typeof setSession>[0]);
});

describe("usePost vote ALTCHA plumbing", () => {
  test("passes vote value, comment target, and solved proof through post and comment votes", async () => {
    const calls = {
      postVote: null as null | {
        postId: string;
        value: -1 | 1;
        options?: { altchaPayload?: string | null };
      },
      commentVote: null as null | {
        commentId: string;
        value: -1 | 1;
        options?: { altchaPayload?: string | null };
      },
    };
    const commentItem = createCommentItem();
    const communities = api.communities as unknown as {
      preview: (communityId: string, opts?: { locale?: string | null }) => Promise<CommunityPreview>;
      listComments: (...args: unknown[]) => Promise<{ items: CommentListItem[]; next_cursor: null }>;
      getJoinEligibility: (communityId: string) => Promise<JoinEligibility>;
    };
    const comments = api.comments as unknown as {
      vote: (
        commentId: string,
        value: -1 | 1,
        options?: { altchaPayload?: string | null },
      ) => Promise<{ comment: string; value: -1 | 1 }>;
    };
    const posts = api.posts as unknown as {
      get: (postId: string, opts?: { locale?: string | null }) => Promise<LocalizedPostResponse>;
      vote: (
        postId: string,
        value: -1 | 1,
        options?: { altchaPayload?: string | null },
      ) => Promise<{ post: string; value: -1 | 1 }>;
    };
    const agents = api.agents as unknown as {
      list: () => Promise<{ items: [] }>;
    };

    posts.get = async () => createPostResponse();
    posts.vote = async (postId, value, options) => {
      calls.postVote = { postId, value, options };
      return { post: postId, value };
    };
    communities.preview = async () => createPreview();
    communities.listComments = async () => ({ items: [commentItem], next_cursor: null });
    communities.getJoinEligibility = async () => createJoinEligibility();
    comments.vote = async (commentId, value, options) => {
      calls.commentVote = { commentId, value, options };
      return { comment: commentId, value };
    };
    agents.list = async () => ({ items: [] });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => usePost("pst_test", "en", true, labels), {
      wrapper: wrapperWithClient(queryClient),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.comments).toHaveLength(1));

    await act(async () => {
      await result.current.voteOnPost("up");
    });

    expect(gateCalls[0]).toMatchObject({
      action: "vote_post",
      communityId: "cmt_test",
      postId: "pst_test",
      voteValue: 1,
    });
    expect(calls.postVote).toEqual({
      postId: "pst_test",
      value: 1,
      options: { altchaPayload: "vote-proof" },
    });

    await act(async () => {
      result.current.comments[0]?.onVote?.("down");
    });

    expect(gateCalls[1]).toMatchObject({
      action: "vote_comment",
      commentId: "cmt_parent",
      communityId: "cmt_test",
      postId: "pst_test",
      voteValue: -1,
    });
    expect(calls.commentVote).toEqual({
      commentId: "cmt_parent",
      value: -1,
      options: { altchaPayload: "vote-proof" },
    });
  });

  test("prewarms and passes post vote gate data for community staff", async () => {
    const preview = createPreview();
    preview.viewer_community_role = "admin";
    preview.viewer_membership_status = "not_member";
    const posts = api.posts as unknown as {
      get: () => Promise<LocalizedPostResponse>;
      vote: (postId: string, value: -1 | 1) => Promise<{ post: string; value: -1 | 1 }>;
    };
    const communities = api.communities as unknown as {
      preview: () => Promise<CommunityPreview>;
      listComments: () => Promise<{ items: CommentListItem[]; next_cursor: null }>;
    };
    const agents = api.agents as unknown as { list: () => Promise<{ items: [] }> };
    const voteCalls: string[] = [];

    posts.get = async () => createPostResponse(preview);
    posts.vote = async (postId, value) => {
      voteCalls.push(`${postId}:${value}`);
      return { post: postId, value };
    };
    communities.preview = async () => preview;
    communities.listComments = async () => ({ items: [], next_cursor: null });
    agents.list = async () => ({ items: [] });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => usePost("pst_test", "en", true, labels), {
      wrapper: wrapperWithClient(queryClient),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(prewarmCalls).toHaveLength(1));

    await act(async () => {
      await result.current.voteOnPost("up");
    });

    expect(prewarmCalls[0]?.communityId).toBe("cmt_test");
    expect(prewarmCalls[0]?.gateData.preview.viewer_community_role).toBe("admin");
    expect(gateCalls[0]?.gateData?.preview.viewer_community_role).toBe("admin");
    expect(gateCalls[0]?.gateData?.eligibility.status).toBe("already_joined");
    expect(voteCalls).toEqual(["pst_test:1"]);
  });

  test("prewarms and passes post vote gate data for community members", async () => {
    const preview = createPreview();
    preview.viewer_community_role = null;
    preview.viewer_membership_status = "member";
    const posts = api.posts as unknown as {
      get: () => Promise<LocalizedPostResponse>;
      vote: (postId: string, value: -1 | 1) => Promise<{ post: string; value: -1 | 1 }>;
    };
    const communities = api.communities as unknown as {
      preview: () => Promise<CommunityPreview>;
      listComments: () => Promise<{ items: CommentListItem[]; next_cursor: null }>;
    };
    const agents = api.agents as unknown as { list: () => Promise<{ items: [] }> };

    posts.get = async () => createPostResponse(preview);
    posts.vote = async (postId, value) => ({ post: postId, value });
    communities.preview = async () => preview;
    communities.listComments = async () => ({ items: [], next_cursor: null });
    agents.list = async () => ({ items: [] });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => usePost("pst_test", "en", true, labels), {
      wrapper: wrapperWithClient(queryClient),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.voteOnPost("up");
    });

    expect(prewarmCalls[0]?.gateData.eligibility.status).toBe("already_joined");
    expect(gateCalls[0]?.gateData?.eligibility.status).toBe("already_joined");
  });

  test("falls back to gate loading when embedded post community cannot prove membership", async () => {
    const preview = createPreview();
    preview.viewer_community_role = null;
    preview.viewer_membership_status = "not_member";
    const posts = api.posts as unknown as {
      get: () => Promise<LocalizedPostResponse>;
      vote: (postId: string, value: -1 | 1) => Promise<{ post: string; value: -1 | 1 }>;
    };
    const communities = api.communities as unknown as {
      preview: () => Promise<CommunityPreview>;
      listComments: () => Promise<{ items: CommentListItem[]; next_cursor: null }>;
    };
    const agents = api.agents as unknown as { list: () => Promise<{ items: [] }> };

    posts.get = async () => createPostResponse(preview);
    posts.vote = async (postId, value) => ({ post: postId, value });
    communities.preview = async () => preview;
    communities.listComments = async () => ({ items: [], next_cursor: null });
    agents.list = async () => ({ items: [] });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => usePost("pst_test", "en", true, labels), {
      wrapper: wrapperWithClient(queryClient),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.voteOnPost("up");
    });

    expect(prewarmCalls).toHaveLength(0);
    expect(gateCalls[0]?.gateData).toBeUndefined();
  });

  test("does not call the post vote API for a prewarmed banned viewer", async () => {
    const preview = createPreview();
    preview.viewer_community_role = null;
    preview.viewer_membership_status = "banned";
    const posts = api.posts as unknown as {
      get: () => Promise<LocalizedPostResponse>;
      vote: () => Promise<{ post: string; value: -1 | 1 }>;
    };
    const communities = api.communities as unknown as {
      preview: () => Promise<CommunityPreview>;
      listComments: () => Promise<{ items: CommentListItem[]; next_cursor: null }>;
    };
    const agents = api.agents as unknown as { list: () => Promise<{ items: [] }> };
    let voteCalled = false;

    posts.get = async () => createPostResponse(preview);
    posts.vote = async () => {
      voteCalled = true;
      return { post: "pst_test", value: 1 };
    };
    communities.preview = async () => preview;
    communities.listComments = async () => ({ items: [], next_cursor: null });
    agents.list = async () => ({ items: [] });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => usePost("pst_test", "en", true, labels), {
      wrapper: wrapperWithClient(queryClient),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.voteOnPost("up");
    });

    expect(gateCalls[0]?.gateData?.eligibility.status).toBe("banned");
    expect(voteCalled).toBe(false);
  });
});
