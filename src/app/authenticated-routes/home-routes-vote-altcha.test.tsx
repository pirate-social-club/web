import { beforeEach, describe, expect, test } from "bun:test";
import type * as React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import type { CommunityPreview, HomeFeedItem, LocalizedPostResponse } from "@pirate/api-contracts";

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
Object.defineProperty(window, "location", {
  configurable: true,
  value: new URL("https://pirate.test/"),
});

const { mock } = await import("bun:test") as unknown as {
  mock: {
    module: (specifier: string, factory: () => unknown) => void;
  };
};

const gateCalls: RunGatedCommunityActionParams[] = [];
const prewarmCalls: Array<{ communityId: string; gateData: NonNullable<RunGatedCommunityActionParams["gateData"]> }> = [];
const ageVerificationRequests: Array<{
  requestedCapabilities?: string[];
  unavailableMessage?: string;
}> = [];

mock.module("@/hooks/use-client-hydrated", () => ({
  useClientHydrated: () => true,
}));

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
      await params.onAllowed({ altchaPayload: "home-proof" });
      return "allowed";
    },
  }),
}));

mock.module("@/app/authenticated-helpers/song-commerce", () => ({
  useSongPlayback: () => ({}),
}));

mock.module("@/lib/verification/use-self-verification", () => ({
  useSelfVerification: () => ({
    handleModalOpenChange: () => undefined,
    handleSelfQrError: () => undefined,
    handleSelfQrSuccess: () => undefined,
    selfError: null,
    selfModalOpen: false,
    selfPrompt: null,
    startVerification: async (options: {
      requestedCapabilities?: string[];
      unavailableMessage?: string;
    }) => {
      ageVerificationRequests.push(options);
      return { href: null, openedModal: false, started: true };
    },
  }),
}));

mock.module("@/components/compositions/posts/feed/feed", () => ({
  Feed: ({
    items,
  }: {
    items: Array<{
      id: string;
      post: {
        content?: {
          ageGatePolicy?: "none" | "18_plus";
          ageGateViewerState?: "proof_required" | "verified_allowed";
          onVerifyAge?: () => void;
          type?: string;
        };
        onVote?: (direction: "up" | "down" | null) => void;
      };
    }>;
  }) => (
    <div>
      {items.map((item, index) => {
        const content = item.post.content;
        const verifyAge = content?.ageGatePolicy === "18_plus"
          && content.ageGateViewerState !== "verified_allowed"
          ? content.onVerifyAge
          : undefined;
        return (
          <div key={item.id}>
            <button
              data-testid={`home-vote-${index}`}
              onClick={() => item.post.onVote?.("up")}
              type="button"
            >
              Vote
            </button>
            {content?.type === "song" && content.ageGatePolicy === "18_plus" ? (
              <button
                data-testid={`home-verify-age-${index}`}
                disabled={!verifyAge}
                onClick={() => verifyAge?.()}
                type="button"
              >
                Verify Age
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  ),
  TopTimeRangeControl: () => null,
}));

const { api } = await import("@/lib/api");
const { __resetSessionStoreForTests, setSession } = await import("@/lib/api/session-store");
const { PirateQueryProvider } = await import("@/lib/query/query-client");
const { HomePage } = await import("./home-routes");

function createPostResponse(postId = "post_pst_home", community: CommunityPreview | null = null): LocalizedPostResponse {
  return {
    post: {
      id: postId,
      object: "post",
      post: postId,
      community: "cmt_test",
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
    community,
  };
}

function createPreview(overrides: Partial<CommunityPreview> = {}): CommunityPreview {
  return {
    id: "cmt_test",
    object: "community_preview",
    display_name: "Test Community",
    membership_mode: "gated",
    human_verification_lane: "self",
    moderators: [],
    membership_gate_summaries: [{ gate_type: "altcha_pow" }],
    rules: [],
    viewer_community_role: null,
    viewer_membership_status: "member",
    created: Date.parse("2026-04-24T00:00:00.000Z"),
    ...overrides,
  } as CommunityPreview;
}

function createFeedItem(postId = "post_pst_home", community: CommunityPreview | null = null): HomeFeedItem {
  return {
    community: {
      id: "cmt_test",
      object: "home_feed_community_summary",
      community: "cmt_test",
      display_name: "Test Community",
      route_slug: "test",
      avatar_ref: null,
      member_count: 1,
      follower_count: 1,
    },
    post: createPostResponse(postId, community),
  } as unknown as HomeFeedItem;
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <PirateQueryProvider>{children}</PirateQueryProvider>;
}

beforeEach(() => {
  gateCalls.length = 0;
  prewarmCalls.length = 0;
  ageVerificationRequests.length = 0;
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
  test("enables age verification on age-gated home feed song cards", async () => {
    const feedApi = api.feed as unknown as {
      home: (opts: unknown) => Promise<{ items: HomeFeedItem[]; top_communities: [] }>;
      publicHome: (opts: unknown) => Promise<{ items: HomeFeedItem[]; top_communities: [] }>;
    };
    const ageGatedSong = createFeedItem("post_pst_explicit_song");
    ageGatedSong.post.post.post_type = "song";
    ageGatedSong.post.post.title = "Explicit song";
    ageGatedSong.post.post.song_title = "Explicit song";
    ageGatedSong.post.post.song_artifact_bundle = "sab_explicit_song";
    ageGatedSong.post.post.age_gate_policy = "18_plus";
    ageGatedSong.post.post.content_safety_state = "adult";
    ageGatedSong.post.age_gate_viewer_state = "proof_required";
    const feedResponse = {
      items: [ageGatedSong],
      top_communities: [],
    };

    feedApi.home = async () => feedResponse;
    feedApi.publicHome = async () => feedResponse;

    const view = render(<HomePage initialSort="best" />, { wrapper });

    await waitFor(() => expect(view.getByTestId("home-verify-age-0")).toBeTruthy());
    expect((view.getByTestId("home-verify-age-0") as HTMLButtonElement).disabled).toBe(false);
    await act(async () => {
      fireEvent.click(view.getByTestId("home-verify-age-0"));
    });

    expect(ageVerificationRequests).toEqual([{
      requestedCapabilities: ["age_over_18"],
      unavailableMessage: "Age verification is required to view 18+ content.",
    }]);
  });

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
      communityId: "cmt_test",
      postId: "post_pst_home",
      voteValue: 1,
    });
    expect(voteCalls).toEqual([{
      options: { altchaPayload: "home-proof" },
      postId: "post_pst_home",
      value: 1,
    }]);
  });

  test("prewarms and passes home vote gate data for community staff", async () => {
    const preview = createPreview({
      viewer_community_role: "owner",
      viewer_membership_status: "not_member",
    });
    const voteCalls: string[] = [];
    const feedApi = api.feed as unknown as {
      home: (opts: unknown) => Promise<{ items: HomeFeedItem[]; top_communities: [] }>;
      publicHome: (opts: unknown) => Promise<{ items: HomeFeedItem[]; top_communities: [] }>;
    };
    const postsApi = api.posts as unknown as {
      vote: (postId: string, value: -1 | 1) => Promise<{ value: -1 | 1 }>;
    };
    const feedResponse = {
      items: [createFeedItem("post_pst_home", preview)],
      top_communities: [],
    };

    feedApi.home = async () => feedResponse;
    feedApi.publicHome = async () => feedResponse;
    postsApi.vote = async (postId, value) => {
      voteCalls.push(`${postId}:${value}`);
      return { value };
    };

    const view = render(<HomePage initialSort="best" />, { wrapper });

    await waitFor(() => expect(view.getByTestId("home-vote-0")).toBeTruthy());
    await waitFor(() => expect(prewarmCalls).toHaveLength(1));
    await act(async () => {
      fireEvent.click(view.getByTestId("home-vote-0"));
    });

    expect(prewarmCalls[0]?.gateData.preview.viewer_community_role).toBe("owner");
    expect(gateCalls[0]?.gateData?.preview.viewer_community_role).toBe("owner");
    expect(gateCalls[0]?.communityId).toBe("cmt_test");
    expect(voteCalls).toEqual(["post_pst_home:1"]);
  });

  test("prewarms and passes home vote gate data for community members", async () => {
    const preview = createPreview({
      viewer_community_role: null,
      viewer_membership_status: "member",
    });
    const feedApi = api.feed as unknown as {
      home: (opts: unknown) => Promise<{ items: HomeFeedItem[]; top_communities: [] }>;
      publicHome: (opts: unknown) => Promise<{ items: HomeFeedItem[]; top_communities: [] }>;
    };
    const postsApi = api.posts as unknown as {
      vote: (postId: string, value: -1 | 1) => Promise<{ value: -1 | 1 }>;
    };
    const feedResponse = {
      items: [createFeedItem("post_pst_home", preview)],
      top_communities: [],
    };

    feedApi.home = async () => feedResponse;
    feedApi.publicHome = async () => feedResponse;
    postsApi.vote = async (_postId, value) => ({ value });

    const view = render(<HomePage initialSort="best" />, { wrapper });

    await waitFor(() => expect(view.getByTestId("home-vote-0")).toBeTruthy());
    await act(async () => {
      fireEvent.click(view.getByTestId("home-vote-0"));
    });

    expect(prewarmCalls[0]?.gateData.eligibility.status).toBe("already_joined");
    expect(gateCalls[0]?.gateData?.eligibility.status).toBe("already_joined");
  });

  test("falls back to gate loading when home post preview cannot prove membership", async () => {
    const preview = createPreview({
      viewer_community_role: null,
      viewer_membership_status: "not_member",
    });
    const feedApi = api.feed as unknown as {
      home: (opts: unknown) => Promise<{ items: HomeFeedItem[]; top_communities: [] }>;
      publicHome: (opts: unknown) => Promise<{ items: HomeFeedItem[]; top_communities: [] }>;
    };
    const postsApi = api.posts as unknown as {
      vote: (postId: string, value: -1 | 1) => Promise<{ value: -1 | 1 }>;
    };
    const feedResponse = {
      items: [createFeedItem("post_pst_home", preview)],
      top_communities: [],
    };

    feedApi.home = async () => feedResponse;
    feedApi.publicHome = async () => feedResponse;
    postsApi.vote = async (_postId, value) => ({ value });

    const view = render(<HomePage initialSort="best" />, { wrapper });

    await waitFor(() => expect(view.getByTestId("home-vote-0")).toBeTruthy());
    await act(async () => {
      fireEvent.click(view.getByTestId("home-vote-0"));
    });

    expect(prewarmCalls).toHaveLength(0);
    expect(gateCalls[0]?.gateData).toBeUndefined();
  });

  test("does not call the home post vote API for a prewarmed banned viewer", async () => {
    const preview = createPreview({
      viewer_community_role: null,
      viewer_membership_status: "banned",
    });
    const feedApi = api.feed as unknown as {
      home: (opts: unknown) => Promise<{ items: HomeFeedItem[]; top_communities: [] }>;
      publicHome: (opts: unknown) => Promise<{ items: HomeFeedItem[]; top_communities: [] }>;
    };
    const postsApi = api.posts as unknown as {
      vote: () => Promise<{ value: -1 | 1 }>;
    };
    let voteCalled = false;
    const feedResponse = {
      items: [createFeedItem("post_pst_home", preview)],
      top_communities: [],
    };

    feedApi.home = async () => feedResponse;
    feedApi.publicHome = async () => feedResponse;
    postsApi.vote = async () => {
      voteCalled = true;
      return { value: 1 };
    };

    const view = render(<HomePage initialSort="best" />, { wrapper });

    await waitFor(() => expect(view.getByTestId("home-vote-0")).toBeTruthy());
    await act(async () => {
      fireEvent.click(view.getByTestId("home-vote-0"));
    });

    expect(gateCalls[0]?.gateData?.eligibility.status).toBe("banned");
    expect(voteCalled).toBe(false);
  });
});
