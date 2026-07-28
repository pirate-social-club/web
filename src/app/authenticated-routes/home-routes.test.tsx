import { describe, expect, test } from "bun:test";
import type * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { installDomGlobals } from "@/test/setup-dom";

import type { HomeFeedCommunitySummary, HomeFeedItem, LocalizedPostResponse } from "@pirate/api-contracts";

import { api } from "@/lib/api";
import { __resetSessionStoreForTests } from "@/lib/api/session-store";
import { PirateQueryProvider } from "@/lib/query/query-client";
import { useHomeFeed } from "./home-routes";

installDomGlobals();

let resolveProfile: ((profile: unknown) => void) | null = null;
let resolveListings: ((items: { items: unknown[] }) => void) | null = null;
let resolvePurchases: ((items: { items: unknown[] }) => void) | null = null;

function createPostResponse(overrides: {
  anchorLiveRoom?: string | null;
  postId?: string;
  postType?: LocalizedPostResponse["post"]["post_type"];
  authorUserId?: string | null;
} = {}): LocalizedPostResponse {
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
      anchor_live_room: overrides.anchorLiveRoom ?? null,
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

function createFeedItem(overrides: {
  anchorLiveRoom?: string | null;
  postId?: string;
  postType?: LocalizedPostResponse["post"]["post_type"];
  authorUserId?: string | null;
} = {}): HomeFeedItem {
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

function wrapper({ children }: { children: React.ReactNode }) {
  return <PirateQueryProvider>{children}</PirateQueryProvider>;
}

describe("useHomeFeed", () => {
  test("renders feed entries before slower profile and commerce data resolves", async () => {
    __resetSessionStoreForTests();
    resolveProfile = null;
    resolveListings = null;
    resolvePurchases = null;

    const feedApi = api.feed as unknown as {
      home: (opts: unknown) => Promise<{ items: HomeFeedItem[]; top_communities: HomeFeedCommunitySummary[] }>;
      publicHome: (opts: unknown) => Promise<{ items: HomeFeedItem[]; top_communities: HomeFeedCommunitySummary[] }>;
    };
    const profilesApi = api.profiles as unknown as {
      getByUserId: (userId: string) => Promise<unknown>;
    };
    const communitiesApi = api.communities as unknown as {
      listListings: () => Promise<{ items: unknown[] }>;
      listPurchases: () => Promise<{ items: unknown[] }>;
    };

    const feedResponse = {
      items: [createFeedItem({ postId: "pst_1", authorUserId: "usr_1" })],
      top_communities: [createTopCommunity()],
    };
    feedApi.home = async () => feedResponse;
    feedApi.publicHome = async () => feedResponse;
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
      { wrapper },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.feedEntries.length).toBe(1);
    expect(result.current.feedEntries[0]?.post.post.id).toBe("pst_1");
    expect(result.current.topCommunities.length).toBe(1);
    expect(result.current.topCommunities[0]?.follower_count).toBe(7);
    expect(Object.keys(result.current.authorProfiles).length).toBe(0);
    expect(Object.keys(result.current.listingsByAssetId).length).toBe(0);
    expect(Object.keys(result.current.listingsByLiveRoomId).length).toBe(0);
    expect(Object.keys(result.current.purchasesByAssetId).length).toBe(0);
    expect(Object.keys(result.current.purchasesByLiveRoomId).length).toBe(0);
    expect(Object.keys(result.current.liveRoomAccessById).length).toBe(0);

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
      publicHome: (opts: unknown) => Promise<{ items: HomeFeedItem[]; top_communities: HomeFeedCommunitySummary[] }>;
    };
    const profilesApi = api.profiles as unknown as {
      getByUserId: (userId: string) => Promise<unknown>;
    };
    const communitiesApi = api.communities as unknown as {
      listListings: () => Promise<{ items: unknown[] }>;
      listPurchases: () => Promise<{ items: unknown[] }>;
    };

    const feedResponse = {
      items: [
        createFeedItem({ postId: "pst_song", postType: "song", authorUserId: "usr_1" }),
      ],
      top_communities: [],
    };
    feedApi.home = async () => feedResponse;
    feedApi.publicHome = async () => feedResponse;
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
      { wrapper },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.feedEntries.length).toBe(1);
    await waitFor(() => expect(Object.keys(result.current.listingsByAssetId).length).toBe(1));
    expect(result.current.listingsByAssetId.asset_1?.price_cents).toBe(100);
    expect(Object.keys(result.current.purchasesByAssetId).length).toBe(1);
    expect(result.current.purchasesByAssetId.asset_1?.asset).toBe("asset_1");
  });

  test("loads live-room commerce and access data asynchronously for anchor posts", async () => {
    __resetSessionStoreForTests();
    resolveProfile = null;
    resolveListings = null;
    resolvePurchases = null;

    const feedApi = api.feed as unknown as {
      home: (opts: unknown) => Promise<{ items: HomeFeedItem[]; top_communities: HomeFeedCommunitySummary[] }>;
      publicHome: (opts: unknown) => Promise<{ items: HomeFeedItem[]; top_communities: HomeFeedCommunitySummary[] }>;
    };
    const profilesApi = api.profiles as unknown as {
      getByUserId: (userId: string) => Promise<unknown>;
    };
    const communitiesApi = api.communities as unknown as {
      getLiveRoomAccess: (communityId: string, liveRoomId: string) => Promise<unknown>;
      listListings: () => Promise<{ items: unknown[] }>;
      listPurchases: () => Promise<{ items: unknown[] }>;
    };

    const feedResponse = {
      items: [
        createFeedItem({
          anchorLiveRoom: "lr_live",
          postId: "pst_live",
          postType: "video",
          authorUserId: "usr_1",
        }),
      ],
      top_communities: [],
    };
    feedApi.home = async () => feedResponse;
    feedApi.publicHome = async () => feedResponse;
    profilesApi.getByUserId = async () => ({ user: "usr_1", display_name: "Test User" });
    communitiesApi.listListings = async () => ({
      items: [{ live_room: "lr_live", community: "cmt_test", price_cents: 1200 }],
    });
    communitiesApi.listPurchases = async () => ({
      items: [{ live_room: "lr_live", community: "cmt_test" }],
    });
    communitiesApi.getLiveRoomAccess = async () => ({
      room: {
        id: "lr_live",
        object: "live_room",
        community: "cmt_test",
        anchor_post: "pst_live",
        host_user: "usr_1",
        guest_user: null,
        room_kind: "solo",
        status: "live",
        access_mode: "paid",
        visibility: "public",
        title: "Live room",
        description: null,
        cover_ref: null,
        event_start_at: null,
        live_started_at: null,
        ended_at: null,
        canceled_at: null,
        broadcast_ref: null,
        replay_status: "none",
        performer_allocations: [],
        setlist: { id: "lrs_test", object: "live_room_setlist", status: "ready", items: [] },
        created: Date.parse("2026-04-24T00:00:00.000Z"),
      },
      access: {
        allowed: true,
        decision_reason: null,
        access_mode: "paid",
        visibility: "public",
        listing: "lst_live",
        purchase_entitlement: "ent_live",
        guest_invite_status: null,
      },
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
      { wrapper },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.liveRoomAccessById.lr_live?.room.status).toBe("live"));
    await waitFor(() => expect(result.current.listingsByLiveRoomId.lr_live?.price_cents).toBe(1200));
    expect(result.current.purchasesByLiveRoomId.lr_live?.live_room).toBe("lr_live");
  });

  test("falls back to public live-room access when authenticated access fails", async () => {
    __resetSessionStoreForTests();

    const feedApi = api.feed as unknown as {
      home: (opts: unknown) => Promise<{ items: HomeFeedItem[]; top_communities: HomeFeedCommunitySummary[] }>;
      publicHome: (opts: unknown) => Promise<{ items: HomeFeedItem[]; top_communities: HomeFeedCommunitySummary[] }>;
    };
    const profilesApi = api.profiles as unknown as {
      getByUserId: (userId: string) => Promise<unknown>;
    };
    const communitiesApi = api.communities as unknown as {
      getLiveRoomAccess: (communityId: string, liveRoomId: string) => Promise<unknown>;
      listListings: () => Promise<{ items: unknown[] }>;
      listPurchases: () => Promise<{ items: unknown[] }>;
    };
    const publicCommunitiesApi = api.publicCommunities as unknown as {
      getLiveRoomAccess: (communityId: string, liveRoomId: string) => Promise<unknown>;
    };
    let authenticatedAccessCalls = 0;
    let publicAccessCalls = 0;

    const feedResponse = {
      items: [
        createFeedItem({
          anchorLiveRoom: "lr_live",
          postId: "pst_live",
          postType: "video",
          authorUserId: "usr_1",
        }),
      ],
      top_communities: [],
    };
    feedApi.home = async () => feedResponse;
    feedApi.publicHome = async () => feedResponse;
    profilesApi.getByUserId = async () => ({ user: "usr_1", display_name: "Test User" });
    communitiesApi.listListings = async () => ({ items: [] });
    communitiesApi.listPurchases = async () => ({ items: [] });
    communitiesApi.getLiveRoomAccess = async () => {
      authenticatedAccessCalls += 1;
      throw new Error("auth access failed");
    };
    publicCommunitiesApi.getLiveRoomAccess = async () => {
      publicAccessCalls += 1;
      return {
        room: {
          id: "lr_live",
          object: "live_room",
          community: "cmt_test",
          anchor_post: "pst_live",
          host_user: "usr_1",
          guest_user: null,
          room_kind: "solo",
          status: "live",
          access_mode: "free",
          visibility: "public",
          title: "Live room",
          description: null,
          cover_ref: "https://media.test/live-cover.jpg",
          event_start_at: null,
          live_started_at: null,
          ended_at: null,
          canceled_at: null,
          broadcast_ref: null,
          replay_status: "none",
          performer_allocations: [],
          setlist: { id: "lrs_test", object: "live_room_setlist", status: "ready", items: [] },
          created: Date.parse("2026-04-24T00:00:00.000Z"),
        },
        access: {
          allowed: true,
          decision_reason: null,
          access_mode: "free",
          visibility: "public",
          listing: null,
          purchase_entitlement: null,
          guest_invite_status: null,
        },
      };
    };

    const { result } = renderHook(() =>
      useHomeFeed({
        activeSort: "best",
        contentLocale: "en",
        hydrated: true,
        session: {
          accessToken: "token",
          user: {
            id: "usr_2",
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
      { wrapper },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.liveRoomAccessById.lr_live?.room.cover_ref).toBe("https://media.test/live-cover.jpg"));
    expect(authenticatedAccessCalls).toBeGreaterThan(0);
    expect(publicAccessCalls).toBeGreaterThan(0);
  });

  test("preserves enriched feed state across an auth-triggered refresh instead of blanking it", async () => {
    __resetSessionStoreForTests();
    resolveProfile = null;
    resolveListings = null;
    resolvePurchases = null;

    const feedApi = api.feed as unknown as {
      home: (opts: unknown) => Promise<{ items: HomeFeedItem[]; top_communities: HomeFeedCommunitySummary[] }>;
      publicHome: (opts: unknown) => Promise<{ items: HomeFeedItem[]; top_communities: HomeFeedCommunitySummary[] }>;
    };
    const profilesApi = api.profiles as unknown as {
      getByUserId: (userId: string) => Promise<unknown>;
    };

    const feedResponse = {
      items: [createFeedItem({ postId: "pst_1", authorUserId: "usr_1" })],
      top_communities: [createTopCommunity()],
    };

    // The first (logged-out) public feed paints and enriches. Any later
    // refresh stays pending so no fresh data can repopulate the enrichment,
    // isolating the synchronous-reset behavior under test.
    let publicHomeCalls = 0;
    feedApi.publicHome = async () => {
      publicHomeCalls += 1;
      if (publicHomeCalls === 1) return feedResponse;
      return new Promise<{ items: HomeFeedItem[]; top_communities: HomeFeedCommunitySummary[] }>(() => undefined);
    };
    feedApi.home = () => new Promise<{ items: HomeFeedItem[]; top_communities: HomeFeedCommunitySummary[] }>(() => undefined);
    profilesApi.getByUserId = async () => ({ user: "usr_1", display_name: "Test User" });

    const liveSession = {
      accessToken: "token",
      user: {
        id: "usr_viewer",
        object: "user",
        created: Date.parse("2026-04-24T00:00:00.000Z"),
        verification_capabilities: {},
        verification_state: "verified",
      },
      profile: null,
      onboarding: { unique_human_verification_status: "verified" },
      walletAttachments: [],
      storedAt: new Date().toISOString(),
    } as never;

    const { result, rerender } = renderHook(
      ({ session }: { session: never }) =>
        useHomeFeed({
          activeSort: "best",
          contentLocale: "en",
          hydrated: true,
          session,
          topTimeRange: "day",
        }),
      { wrapper, initialProps: { session: null as never } },
    );

    // Public paint enriches author profiles (the logged-out hard-refresh frame).
    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.authorProfiles.usr_1 != null).toBe(true));
    expect(result.current.feedEntries.length).toBe(1);
    expect(result.current.topCommunities.length).toBe(1);

    // Session appears a beat later; the refresh it triggers stays pending.
    act(() => {
      rerender({ session: liveSession });
    });

    // Same feed identity, so the enriched, already-rendered state must remain
    // visible during the pending refresh rather than flickering to empty.
    expect(publicHomeCalls).toBeGreaterThan(1);
    expect(result.current.feedEntries.length).toBe(1);
    expect(result.current.feedEntries[0]?.post.post.id).toBe("pst_1");
    expect(result.current.topCommunities.length).toBe(1);
    expect(result.current.authorProfiles.usr_1).toEqual({ user: "usr_1", display_name: "Test User" });
  });

  test("loads the next page with the server cursor and deduplicates appended posts", async () => {
    __resetSessionStoreForTests();
    const requests: Array<{ cursor?: string | null }> = [];
    const feedApi = api.feed as unknown as {
      publicHome: (opts: { cursor?: string | null }) => Promise<{
        items: HomeFeedItem[];
        next_cursor: string | null;
        top_communities: HomeFeedCommunitySummary[];
      }>;
    };
    feedApi.publicHome = async (opts) => {
      requests.push(opts);
      return opts.cursor === "o:25"
        ? {
            items: [createFeedItem({ postId: "pst_1" }), createFeedItem({ postId: "pst_2" })],
            next_cursor: null,
            top_communities: [],
          }
        : {
            items: [createFeedItem({ postId: "pst_1" })],
            next_cursor: "o:25",
            top_communities: [createTopCommunity()],
          };
    };

    const { result } = renderHook(() => useHomeFeed({
      activeSort: "best",
      contentLocale: "en",
      hydrated: true,
      session: null,
      topTimeRange: "day",
    }), { wrapper });

    await waitFor(() => expect(result.current.nextCursor).toBe("o:25"));
    await act(async () => result.current.loadMore());

    expect(requests[1]?.cursor).toBe("o:25");
    expect(result.current.feedEntries.map((entry) => entry.post.post.id)).toEqual(["pst_1", "pst_2"]);
    expect(result.current.nextCursor).toBeNull();
    expect(result.current.loadMoreError).toBeNull();
  });
  test("re-renders a cached feed without a loading pass when the route is revisited", async () => {
    __resetSessionStoreForTests();

    const feedApi = api.feed as unknown as {
      home: (opts: unknown) => Promise<{ items: HomeFeedItem[]; top_communities: HomeFeedCommunitySummary[] }>;
      publicHome: (opts: unknown) => Promise<{ items: HomeFeedItem[]; top_communities: HomeFeedCommunitySummary[] }>;
    };
    const profilesApi = api.profiles as unknown as {
      getByUserId: (userId: string) => Promise<unknown>;
    };

    const feedResponse = {
      items: [createFeedItem({ postId: "pst_1", authorUserId: "usr_1" })],
      top_communities: [createTopCommunity()],
    };
    feedApi.home = async () => feedResponse;
    feedApi.publicHome = async () => feedResponse;
    profilesApi.getByUserId = async () => ({ user: "usr_1", display_name: "Test User" });

    // One client across both mounts: the payload outliving the route is the
    // whole mechanism under test.
    const queryClient = new QueryClient();
    function sharedWrapper({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }
    const input = {
      activeSort: "best" as const,
      contentLocale: "en",
      hydrated: true,
      session: null,
      topTimeRange: "day",
    };

    const first = renderHook(() => useHomeFeed(input), { wrapper: sharedWrapper });
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    expect(first.result.current.feedEntries.length).toBe(1);
    first.unmount();

    const second = renderHook(() => useHomeFeed(input), { wrapper: sharedWrapper });

    // No await: the point is that the revisit never passes through a loading
    // state on its way to painting the cached entries.
    expect(second.result.current.loading).toBe(false);
    expect(second.result.current.feedEntries.map((entry) => entry.post.post.id)).toEqual(["pst_1"]);

    // Settle the background refresh the revisit kicked off, so its state update
    // lands inside the test rather than after it.
    await act(async () => { await Promise.resolve(); });
    second.unmount();
  });
});
