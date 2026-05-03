import { describe, expect, test } from "bun:test";
import { renderHook, waitFor } from "@testing-library/react";
import { installDomGlobals } from "@/test/setup-dom";

import type { HomeFeedCommunitySummary, HomeFeedItem, LocalizedPostResponse } from "@pirate/api-contracts";

import { api } from "@/lib/api";
import { __resetSessionStoreForTests } from "@/lib/api/session-store";
import { useHomeFeed } from "./home-routes";

installDomGlobals();

let resolveProfile: ((profile: unknown) => void) | null = null;
let resolveListings: ((items: { items: unknown[] }) => void) | null = null;
let resolvePurchases: ((items: { items: unknown[] }) => void) | null = null;

function createPostResponse(overrides: { postId?: string; postType?: LocalizedPostResponse["post"]["post_type"]; authorUserId?: string | null } = {}): LocalizedPostResponse {
  const postId = overrides.postId ?? "pst_test";
  return {
    post: {
      id: postId,
      object: "post",
      post: postId,
      community: "cmt_test",
      post_type: overrides.postType ?? "text",
      title: "Post title",
      body: "Post body",
      caption: null,
      status: "published",
      visibility: "public",
      identity_mode: overrides.authorUserId ? "public" : "anonymous",
      author_user: overrides.authorUserId ?? null,
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
      swarm_manifest_ref: "swarm://comments/pst_test",
      swarm_feed_ref: null,
      created: Date.parse("2026-04-24T00:00:00.000Z"),
    } as unknown as LocalizedPostResponse["thread_snapshot"],
    comment_count: 0,
    upvote_count: 1,
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

function createFeedItem(overrides: { postId?: string; postType?: LocalizedPostResponse["post"]["post_type"]; authorUserId?: string | null } = {}): HomeFeedItem {
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
    post: createPostResponse(overrides),
  } as unknown as HomeFeedItem;
}

function createTopCommunity(overrides: Partial<HomeFeedCommunitySummary> = {}): HomeFeedCommunitySummary {
  return {
    id: "com_cmt_test",
    object: "home_feed_community_summary",
    display_name: "Test Community",
    route_slug: "test",
    avatar_ref: null,
    member_count: null,
    follower_count: 7,
    view_count: null,
    ...overrides,
  };
}

describe("useHomeFeed", () => {
  test("renders feed entries before slower profile and commerce data resolves", async () => {
    __resetSessionStoreForTests();
    resolveProfile = null;
    resolveListings = null;
    resolvePurchases = null;

    const feedApi = api.feed as unknown as {
      home: (opts: unknown) => Promise<{ items: HomeFeedItem[]; top_communities: HomeFeedCommunitySummary[] }>;
    };
    const profilesApi = api.profiles as unknown as {
      getByUserId: (userId: string) => Promise<unknown>;
    };
    const communitiesApi = api.communities as unknown as {
      listListings: () => Promise<{ items: unknown[] }>;
      listPurchases: () => Promise<{ items: unknown[] }>;
    };

    feedApi.home = async () => ({
      items: [createFeedItem({ postId: "pst_1", authorUserId: "usr_1" })],
      top_communities: [createTopCommunity()],
    });
    profilesApi.getByUserId = async () =>
      new Promise((resolve) => {
        resolveProfile = resolve;
      });
    communitiesApi.listListings = async () =>
      new Promise((resolve) => {
        resolveListings = resolve;
      });
    communitiesApi.listPurchases = async () =>
      new Promise((resolve) => {
        resolvePurchases = resolve;
      });

    const { result } = renderHook(() =>
      useHomeFeed({
        activeSort: "best",
        contentLocale: "en",
        hydrated: true,
        session: null,
        topTimeRange: "day",
      }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.feedEntries.length).toBe(1);
    expect(result.current.feedEntries[0]?.post.post.id).toBe("pst_1");
    expect(result.current.topCommunities.length).toBe(1);
    expect(result.current.topCommunities[0]?.follower_count).toBe(7);
    expect(Object.keys(result.current.authorProfiles).length).toBe(0);
    expect(Object.keys(result.current.listingsByAssetId).length).toBe(0);
    expect(Object.keys(result.current.purchasesByAssetId).length).toBe(0);

    const resolveLoadedProfile = resolveProfile as unknown as (profile: unknown) => void;
    resolveLoadedProfile({ user: "usr_1", display_name: "Test User" });
    await waitFor(() => expect(result.current.authorProfiles["usr_1"] != null).toBe(true));
    expect(result.current.authorProfiles["usr_1"]).toEqual({ user: "usr_1", display_name: "Test User" });
  });

  test("loads commerce data asynchronously for song posts", async () => {
    __resetSessionStoreForTests();
    resolveProfile = null;
    resolveListings = null;
    resolvePurchases = null;

    const feedApi = api.feed as unknown as {
      home: (opts: unknown) => Promise<{ items: HomeFeedItem[]; top_communities: HomeFeedCommunitySummary[] }>;
    };
    const profilesApi = api.profiles as unknown as {
      getByUserId: (userId: string) => Promise<unknown>;
    };
    const communitiesApi = api.communities as unknown as {
      listListings: () => Promise<{ items: unknown[] }>;
      listPurchases: () => Promise<{ items: unknown[] }>;
    };

    feedApi.home = async () => ({
      items: [
        createFeedItem({ postId: "pst_song", postType: "song", authorUserId: "usr_1" }),
      ],
      top_communities: [],
    });
    profilesApi.getByUserId = async () => ({ user: "usr_1", display_name: "Test User" });
    communitiesApi.listListings = async () => ({
      items: [{ asset: "asset_1", community: "cmt_test", price_cents: 100 }],
    });
    communitiesApi.listPurchases = async () => ({
      items: [{ asset: "asset_1", community: "cmt_test" }],
    });

    const { result } = renderHook(() =>
      useHomeFeed({
        activeSort: "best",
        contentLocale: "en",
        hydrated: true,
        session: {
          accessToken: "token",
          user: {
            id: "usr_1",
            object: "user",
            created: Date.parse("2026-04-24T00:00:00.000Z"),
            verification_capabilities: {},
            verification_state: "verified",
          },
          profile: null,
          onboarding: { unique_human_verification_status: "verified" },
          walletAttachments: [],
          storedAt: new Date().toISOString(),
        } as never,
        topTimeRange: "day",
      }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.feedEntries.length).toBe(1);
    await waitFor(() => expect(Object.keys(result.current.listingsByAssetId).length).toBe(1));
    expect(Object.keys(result.current.purchasesByAssetId).length).toBe(1);
  });
});

