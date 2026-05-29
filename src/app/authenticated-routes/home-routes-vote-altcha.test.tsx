import { beforeEach, describe, expect, test } from "bun:test";
import type * as React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import type { HomeFeedItem, LocalizedPostResponse } from "@pirate/api-contracts";

import { installDomGlobals } from "@/test/setup-dom";
import type { RunGatedCommunityActionParams } from "@/hooks/use-community-interaction-gate.helpers";

installDomGlobals();
Object.defineProperty(navigator, "languages", {
  configurable: true,
  value: ["en-US"],
});
Object.defineProperty(navigator, "language", {
  configurable: true,
  value: "en-US",
});

const { mock } = await import("bun:test") as unknown as {
  mock: {
    module: (specifier: string, factory: () => unknown) => void;
  };
};

const gateCalls: RunGatedCommunityActionParams[] = [];

mock.module("@/hooks/use-client-hydrated", () => ({
  useClientHydrated: () => true,
}));

mock.module("@/hooks/use-community-interaction-gate", () => ({
  useCommunityInteractionGate: () => ({
    gateModal: null,
    runGatedCommunityAction: async (params: RunGatedCommunityActionParams) => {
      gateCalls.push(params);
      await params.onAllowed({ altchaPayload: "home-proof" });
      return "allowed";
    },
  }),
}));

mock.module("@/app/authenticated-helpers/song-commerce", () => ({
  useSongPlayback: () => ({}),
}));

mock.module("@/components/compositions/posts/feed/feed", () => ({
  Feed: ({
    items,
  }: {
    items: Array<{
      id: string;
      post: { onVote?: (direction: "up" | "down" | null) => void };
    }>;
  }) => (
    <div>
      {items.map((item, index) => (
        <button
          data-testid={`home-vote-${index}`}
          key={item.id}
          onClick={() => item.post.onVote?.("up")}
          type="button"
        >
          Vote
        </button>
      ))}
    </div>
  ),
  TopTimeRangeControl: () => null,
}));

const { api } = await import("@/lib/api");
const { __resetSessionStoreForTests, setSession } = await import("@/lib/api/session-store");
const { PirateQueryProvider } = await import("@/lib/query/query-client");
const { HomePage } = await import("./home-routes");

function createPostResponse(postId = "post_pst_home"): LocalizedPostResponse {
  return {
    post: {
      id: postId,
      object: "post",
      post: postId,
      community: "com_test",
      post_type: "text",
      title: "Post title",
      body: "Post body",
      caption: null,
      status: "published",
      visibility: "public",
      identity_mode: "anonymous",
      author_user: null,
      anonymous_label: null,
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
      anchor_live_room: null,
      created: Date.parse("2026-04-24T00:00:00.000Z"),
      analysis_state: "allow",
      content_safety_state: "safe",
      age_gate_policy: "none",
    } as unknown as LocalizedPostResponse["post"],
    thread_snapshot: {
      thread_root_post: postId,
      thread_root_post_id: postId,
      snapshot_seq: 1,
      published_through_comment_created: Date.parse("2026-04-24T00:00:00.000Z"),
      comment_count: 0,
      swarm_manifest_ref: "swarm://comments/post_pst_home",
      swarm_feed_ref: null,
      created: Date.parse("2026-04-24T00:00:00.000Z"),
    } as unknown as LocalizedPostResponse["thread_snapshot"],
    comment_count: 0,
    upvote_count: 0,
    downvote_count: 0,
    like_count: 0,
    viewer_vote: null,
    viewer_reaction_kinds: [],
    resolved_locale: "en",
    translation_state: "same_language",
    machine_translated: false,
    source_hash: "hash",
  };
}

function createFeedItem(postId = "post_pst_home"): HomeFeedItem {
  return {
    community: {
      id: "com_test",
      object: "home_feed_community_summary",
      community: "com_test",
      display_name: "Test Community",
      route_slug: "test",
      avatar_ref: null,
      member_count: 1,
      follower_count: 1,
    },
    post: createPostResponse(postId),
  } as unknown as HomeFeedItem;
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <PirateQueryProvider>{children}</PirateQueryProvider>;
}

beforeEach(() => {
  gateCalls.length = 0;
  __resetSessionStoreForTests();
  setSession({
    access_token: "test-token",
    user: { id: "usr_test" },
    profile: null,
    onboarding: { unique_human_verification_status: "verified" },
    wallet_attachments: [],
  } as Parameters<typeof setSession>[0]);
});

describe("HomePage vote ALTCHA plumbing", () => {
  test("passes vote value and solved proof through the inline home feed vote path", async () => {
    const voteCalls: Array<{
      options?: { altchaPayload?: string | null };
      postId: string;
      value: -1 | 1;
    }> = [];
    const feedApi = api.feed as unknown as {
      home: (opts: unknown) => Promise<{ items: HomeFeedItem[]; top_communities: [] }>;
      publicHome: (opts: unknown) => Promise<{ items: HomeFeedItem[]; top_communities: [] }>;
    };
    const postsApi = api.posts as unknown as {
      vote: (
        postId: string,
        value: -1 | 1,
        options?: { altchaPayload?: string | null },
      ) => Promise<{ value: -1 | 1 }>;
    };
    const feedResponse = {
      items: [createFeedItem()],
      top_communities: [],
    };

    feedApi.home = async () => feedResponse;
    feedApi.publicHome = async () => feedResponse;
    postsApi.vote = async (postId, value, options) => {
      voteCalls.push({ options, postId, value });
      return { value };
    };

    const view = render(<HomePage initialSort="best" />, { wrapper });

    await waitFor(() => expect(view.getByTestId("home-vote-0")).toBeTruthy());
    await act(async () => {
      fireEvent.click(view.getByTestId("home-vote-0"));
    });

    await waitFor(() => expect(voteCalls).toHaveLength(1));
    expect(gateCalls[0]).toMatchObject({
      action: "vote_post",
      communityId: "com_test",
      postId: "post_pst_home",
      voteValue: 1,
    });
    expect(voteCalls).toEqual([{
      options: { altchaPayload: "home-proof" },
      postId: "post_pst_home",
      value: 1,
    }]);
  });
});
