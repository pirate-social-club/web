import { describe, expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import * as React from "react";
import type {
  JoinEligibility,
  LocalizedPostResponse as ApiPost,
} from "@pirate/api-contracts";

import { installDomGlobals } from "@/test/setup-dom";
import type {
  CommunityGateData,
  InteractionResult,
  RunGatedCommunityActionParams,
} from "@/hooks/use-community-interaction-gate.helpers";

import { useCommunityVoteAction } from "./use-community-vote-action";

installDomGlobals();

function createPost(overrides: Partial<ApiPost> = {}): ApiPost {
  return {
    post: {
      id: "pst_test",
      community: "com_post",
    } as ApiPost["post"],
    comment_count: 0,
    downvote_count: 0,
    like_count: 0,
    machine_translated: false,
    resolved_locale: "en",
    source_hash: "hash",
    thread_snapshot: null,
    translation_state: "same_language",
    upvote_count: 0,
    viewer_reaction_kinds: [],
    viewer_vote: null,
    ...overrides,
  };
}

function createGateData(): CommunityGateData {
  return {
    eligibility: { status: "already_joined" } as JoinEligibility,
    preview: {
      display_name: "Test Community",
      id: "com_gate",
      membership_gate_summaries: [],
    },
  };
}

function renderVoteHarness(options: {
  buildBlockedModalState?: RunGatedCommunityActionParams["buildBlockedModalState"];
  communityId?: string | null;
  gateData?: CommunityGateData | null;
  posts?: ApiPost[];
  runGatedCommunityAction?: (
    params: RunGatedCommunityActionParams,
  ) => Promise<InteractionResult>;
  vote?: (postId: string, value: 1 | -1) => Promise<{ value: 1 | -1 }>;
} = {}) {
  const gatedCalls: RunGatedCommunityActionParams[] = [];
  const voteCalls: Array<{ postId: string; value: 1 | -1 }> = [];
  const runGatedCommunityAction = options.runGatedCommunityAction ?? (async (params) => {
    gatedCalls.push(params);
    await params.onAllowed();
    return "allowed";
  });
  const vote = options.vote ?? (async (postId, value) => {
    voteCalls.push({ postId, value });
    return { value };
  });

  const hook = renderHook(() => {
    const [posts, setPosts] = React.useState<ApiPost[]>(options.posts ?? [createPost()]);
    const voteOnPost = useCommunityVoteAction({
      buildBlockedModalState: options.buildBlockedModalState,
      communityId: options.communityId,
      gateData: options.gateData,
      posts,
      runGatedCommunityAction,
      setPosts,
      vote,
    });
    return { posts, voteOnPost };
  });

  return {
    gatedCalls,
    hook,
    voteCalls,
  };
}

describe("useCommunityVoteAction", () => {
  test("runs the gated vote action with route gate data and updates the post", async () => {
    const gateData = createGateData();
    const { gatedCalls, hook, voteCalls } = renderVoteHarness({
      communityId: "com_route",
      gateData,
    });

    await act(async () => {
      await hook.result.current.voteOnPost("pst_test", "up");
    });

    expect(gatedCalls).toHaveLength(1);
    expect(gatedCalls[0]?.action).toBe("vote_post");
    expect(gatedCalls[0]?.communityId).toBe("com_route");
    expect(gatedCalls[0]?.gateData).toBe(gateData);
    expect(gatedCalls[0]?.postId).toBe("pst_test");
    expect(voteCalls).toEqual([{ postId: "pst_test", value: 1 }]);
    expect(hook.result.current.posts[0]?.viewer_vote).toBe(1);
    expect(hook.result.current.posts[0]?.upvote_count).toBe(1);
  });

  test("falls back to the post community when no route community id is provided", async () => {
    const { gatedCalls, hook } = renderVoteHarness();

    await act(async () => {
      await hook.result.current.voteOnPost("pst_test", "down");
    });

    expect(gatedCalls[0]?.communityId).toBe("com_post");
  });

  test("does nothing when required gate data is explicitly unavailable", async () => {
    const { gatedCalls, hook, voteCalls } = renderVoteHarness({
      gateData: null,
    });

    await act(async () => {
      await hook.result.current.voteOnPost("pst_test", "up");
    });

    expect(gatedCalls).toHaveLength(0);
    expect(voteCalls).toHaveLength(0);
    expect(hook.result.current.posts[0]?.viewer_vote).toBe(null);
  });

  test("does nothing when the target post is missing", async () => {
    const { gatedCalls, hook, voteCalls } = renderVoteHarness();

    await act(async () => {
      await hook.result.current.voteOnPost("pst_missing", "up");
    });

    expect(gatedCalls).toHaveLength(0);
    expect(voteCalls).toHaveLength(0);
  });

  test("rolls back the optimistic vote when the vote request fails", async () => {
    const { hook } = renderVoteHarness({
      vote: async () => {
        throw new Error("vote failed");
      },
    });

    await act(async () => {
      await hook.result.current.voteOnPost("pst_test", "up");
    });

    expect(hook.result.current.posts[0]?.viewer_vote).toBe(null);
    expect(hook.result.current.posts[0]?.upvote_count).toBe(0);
  });
});
