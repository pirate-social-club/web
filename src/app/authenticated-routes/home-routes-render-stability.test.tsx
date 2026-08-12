import { beforeEach, describe, expect, mock, test } from "bun:test";
import * as React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import type { HomeFeedItem, LocalizedPostResponse } from "@pirate/api-contracts";

import { installDomGlobals } from "@/test/setup-dom";

installDomGlobals();
if (typeof DocumentFragment === "undefined" && typeof window.DocumentFragment !== "undefined") {
  Object.defineProperty(globalThis, "DocumentFragment", {
    configurable: true,
    value: window.DocumentFragment,
  });
}
Object.defineProperty(navigator, "languages", { configurable: true, value: ["en-US"] });
Object.defineProperty(navigator, "language", { configurable: true, value: "en-US" });
Object.defineProperty(window, "location", {
  configurable: true,
  value: new URL("https://pirate.test/"),
});

let postCardRenderCount = 0;
const stableNoop = () => undefined;
const stableRunGatedCommunityAction = async () => "allowed" as const;
const stableStartVerification = async () => ({ href: null, openedModal: false, started: true });

mock.module("@/hooks/use-client-hydrated", () => ({
  useClientHydrated: () => true,
}));

mock.module("@/hooks/use-community-interaction-gate", () => ({
  useCommunityInteractionGate: () => ({
    gateModal: null,
    prewarmCommunityGate: stableNoop,
    runGatedCommunityAction: stableRunGatedCommunityAction,
  }),
}));

const progressSnapshot = { progressMs: 0 };
const progressStore = {
  getSnapshot: () => progressSnapshot,
  subscribe: () => stableNoop,
};
const playbackController = {
  getAssetSourceState: () => ({ playbackState: "idle" as const }),
  getPlaybackProgress: () => progressSnapshot,
  getPlaybackProgressStore: () => progressStore,
  getPlaybackState: () => "idle" as const,
  loadAssetSource: async () => null,
  pauseTrack: stableNoop,
  playTrack: async () => undefined,
  seekTrack: async () => undefined,
  subscribePlaybackProgress: () => stableNoop,
};

mock.module("@/app/authenticated-helpers/song-commerce", () => ({
  useSongPlayback: () => playbackController,
}));

mock.module("@/lib/verification/use-self-verification", () => ({
  useSelfVerification: () => ({
    handleModalOpenChange: stableNoop,
    handleSelfQrError: stableNoop,
    handleSelfQrSuccess: stableNoop,
    selfError: null,
    selfModalOpen: false,
    selfPrompt: null,
    startVerification: stableStartVerification,
  }),
}));

mock.module("@/components/compositions/posts/post-card/post-card", () => ({
  PostCard: () => {
    postCardRenderCount += 1;
    return <article data-testid="feed-post-card" />;
  },
}));

mock.module("@/components/compositions/system/responsive-option-select/responsive-option-select", () => ({
  ResponsiveOptionSelect: () => null,
}));

const { api } = await import("@/lib/api");
const { __resetSessionStoreForTests } = await import("@/lib/api/session-store");
const { PirateQueryProvider } = await import("@/lib/query/query-client");
const { HomePage } = await import("./home-routes");

function createFeedItem(index: number): HomeFeedItem {
  const postId = `post_pst_append_${index}`;
  const post = {
    id: postId,
    object: "post",
    post: postId,
    community: "cmt_append",
    post_type: "text",
    title: `Post ${index}`,
    body: "Body",
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
  } as unknown as LocalizedPostResponse["post"];

  return {
    community: {
      id: "cmt_append",
      object: "home_feed_community_summary",
      community: "cmt_append",
      display_name: "Append Community",
      route_slug: "append",
      avatar_ref: null,
      member_count: 1,
      follower_count: 1,
    },
    post: {
      post,
      thread_snapshot: {
        thread_root_post: postId,
        thread_root_post_id: postId,
        snapshot_seq: 1,
        published_through_comment_created: post.created,
        comment_count: 0,
        swarm_manifest_ref: `swarm://comments/${postId}`,
        swarm_feed_ref: null,
        created: post.created,
      },
      comment_count: 0,
      upvote_count: 0,
      downvote_count: 0,
      like_count: 0,
      viewer_vote: null,
      viewer_reaction_kinds: [],
      resolved_locale: "en",
      translation_state: "same_language",
      machine_translated: false,
      source_hash: "append-hash",
      community: null,
    },
  } as unknown as HomeFeedItem;
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <PirateQueryProvider>{children}</PirateQueryProvider>;
}

beforeEach(() => {
  postCardRenderCount = 0;
  __resetSessionStoreForTests();
});

describe("home feed projection stability", () => {
  test("an appended page renders only new rows and the previous last row", async () => {
    const feedApi = api.feed as unknown as {
      publicHome: (request: { cursor?: string }) => Promise<{
        items: HomeFeedItem[];
        next_cursor: string | null;
        top_communities: [];
      }>;
    };
    feedApi.publicHome = async (request) => ({
      items: Array.from({ length: 40 }, (_, index) => createFeedItem(index + (request.cursor ? 40 : 0))),
      next_cursor: request.cursor ? null : "next-page",
      top_communities: [],
    });

    const view = render(<HomePage initialSort="best" />, { wrapper });
    await waitFor(() => expect(view.getAllByTestId("feed-post-card")).toHaveLength(40));
    postCardRenderCount = 0;

    await act(async () => {
      fireEvent.click(view.getByRole("button", { name: /load more/i }));
    });
    await waitFor(() => expect(view.getAllByTestId("feed-post-card")).toHaveLength(80));

    expect(postCardRenderCount).toBe(41);
  });
});
