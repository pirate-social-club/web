"use client";

import * as React from "react";
import type { CommunityListing as ApiCommunityListing } from "@pirate/api-contracts";
import type { CommunityPurchase as ApiCommunityPurchase } from "@pirate/api-contracts";
import type { HomeFeedCommunitySummary as ApiHomeFeedCommunitySummary } from "@pirate/api-contracts";
import type { HomeFeedItem as ApiHomeFeedItem } from "@pirate/api-contracts";
import type { Profile as ApiProfile } from "@pirate/api-contracts";

import { navigate } from "@/app/router";
import { useApi } from "@/lib/api";
import { clearSession, useSession } from "@/lib/api/session-store";
import { Button } from "@/components/primitives/button";
import { Feed, type FeedSort, TopTimeRangeControl } from "@/components/compositions/feed/feed";

import { loadProfilesByUserId } from "./community-data";
import { toHomeFeedItem } from "./post-presentation";
import { submitOptimisticPostVote, updateHomeFeedEntryPostVote } from "./post-vote";
import { buildFeedSortOptions, buildTopTimeRangeOptions, getErrorMessage, useRouteContentLocale, useRouteMessages, useClientHydrated } from "./route-core";
import { getRouteFailureDescription, getRouteString } from "./route-status-copy";
import { EmptyFeedState, RouteLoadFailureState } from "./route-shell";
import { useSongPlayback } from "./song-commerce";

export function HomePage() {
  const api = useApi();
  const hydrated = useClientHydrated();
  const session = useSession();
  const { copy } = useRouteMessages();
  const sortOptions = React.useMemo(() => buildFeedSortOptions(copy.common), [copy.common]);
  const topTimeRangeOptions = React.useMemo(() => buildTopTimeRangeOptions(copy.common), [copy.common]);
  const contentLocale = useRouteContentLocale(session?.profile.preferred_locale);
  const createCommunityLabel = getRouteString("home", "createCommunity", "Create a community");
  const emptyHomeBody = getRouteString("home", "emptyHomeBody", "Join a community or create one to start building your home feed.");
  const emptyHomeTitle = getRouteString("home", "emptyHomeTitle", "No posts yet");
  const [activeSort, setActiveSort] = React.useState<FeedSort>("best");
  const [topTimeRange, setTopTimeRange] = React.useState("day");
  const [feedEntries, setFeedEntries] = React.useState<ApiHomeFeedItem[]>([]);
  const [topCommunities, setTopCommunities] = React.useState<ApiHomeFeedCommunitySummary[]>([]);
  const [authorProfiles, setAuthorProfiles] = React.useState<Record<string, ApiProfile | null>>({});
  const [listingsByAssetId, setListingsByAssetId] = React.useState<Record<string, ApiCommunityListing | undefined>>({});
  const [purchasesByAssetId, setPurchasesByAssetId] = React.useState<Record<string, ApiCommunityPurchase | undefined>>({});
  const [error, setError] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(true);
  const songPlayback = useSongPlayback(session?.accessToken ?? null);
  const voteRequestIdsRef = React.useRef<Record<string, number>>({});

  React.useEffect(() => {
    let cancelled = false;

    if (!hydrated) return () => { cancelled = true; };

    if (!session) {
      setFeedEntries([]);
      setTopCommunities([]);
      setAuthorProfiles({});
      setListingsByAssetId({});
      setPurchasesByAssetId({});
      setError(null);
      setLoading(false);
      return () => { cancelled = true; };
    }

    setLoading(true);
    setError(null);

    void api.feed.home({
      locale: contentLocale,
      sort: activeSort,
      timeRange: activeSort === "top" ? topTimeRange : null,
    })
      .then(async (result) => {
        const nextFeedEntries = result.items;
        const nextTopCommunities = result.top_communities;
        const nextAuthorProfiles = await loadProfilesByUserId(
          api,
          nextFeedEntries.map((entry) => entry.post.post.identity_mode === "public" ? entry.post.post.author_user_id : null).filter((userId): userId is string => Boolean(userId)),
          session.profile ? { [session.user.user_id]: session.profile } : {},
        );
        const songCommunityIds = [...new Set(nextFeedEntries.filter((entry) => entry.post.post.post_type === "song").map((entry) => entry.community.community_id))];
        const commerceByCommunity = await Promise.all(songCommunityIds.map(async (communityId) => {
          const [listings, purchases] = await Promise.all([
            api.communities.listListings(communityId).then((response) => response.items).catch(() => []),
            api.communities.listPurchases(communityId).then((response) => response.items).catch(() => []),
          ]);
          return { communityId, listings, purchases };
        }));

        if (cancelled) return;
        setFeedEntries(nextFeedEntries);
        setTopCommunities(nextTopCommunities);
        setAuthorProfiles(nextAuthorProfiles);
        setListingsByAssetId(Object.fromEntries(commerceByCommunity.flatMap((result) => result.listings.map((listing) => (
          typeof listing.asset_id === "string" && listing.asset_id.length > 0 ? [[listing.asset_id, listing] as const] : []
        )))));
        setPurchasesByAssetId(Object.fromEntries(commerceByCommunity.flatMap((result) => result.purchases.map((purchase) => (
          typeof purchase.asset_id === "string" && purchase.asset_id.length > 0 ? [[purchase.asset_id, purchase] as const] : []
        )))));
      })
      .catch((nextError: unknown) => {
        if (cancelled) return;
        if ((nextError as { status?: number; code?: string }).status === 401 || (nextError as { code?: string }).code === "auth_error") {
          clearSession();
          setFeedEntries([]);
          setTopCommunities([]);
          setAuthorProfiles({});
          setListingsByAssetId({});
          setPurchasesByAssetId({});
          setError(null);
          return;
        }
        setError(nextError);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [activeSort, api, contentLocale, hydrated, session, topTimeRange]);

  const voteOnPost = React.useCallback(async (postId: string, direction: "up" | "down" | null) => {
    if (!session?.accessToken) return;
    const previousPost = feedEntries.find((entry) => entry.post.post.post_id === postId)?.post;
    await submitOptimisticPostVote({
      direction,
      onApply: (nextValue) => setFeedEntries((current) => updateHomeFeedEntryPostVote(current, postId, nextValue)),
      onRollback: (restoredPost) => setFeedEntries((current) => current.map((entry) => entry.post.post.post_id === postId ? { ...entry, post: restoredPost } : entry)),
      postId,
      previousPost: previousPost ?? null,
      requestIdsRef: voteRequestIdsRef,
      vote: api.posts.vote,
    });
  }, [api.posts, feedEntries, session?.accessToken]);

  const feedItems = feedEntries.map((entry) => {
    const assetId = entry.post.post.asset_id ?? undefined;
    return toHomeFeedItem(
      entry,
      authorProfiles,
      entry.post.post.post_type === "song"
        ? { currentUserId: session?.user?.user_id, listing: assetId ? listingsByAssetId[assetId] : undefined, playback: songPlayback, purchase: assetId ? purchasesByAssetId[assetId] : undefined }
        : undefined,
      { onVote: (direction) => void voteOnPost(entry.post.post.post_id, direction) },
    );
  });

  if (error) {
    return <RouteLoadFailureState description={getErrorMessage(error, getRouteFailureDescription("home"))} title={copy.home.title} />;
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6">
      <Feed
        activeSort={activeSort}
        aside={topCommunities.length > 0 ? (
          <div className="overflow-hidden rounded-[var(--radius-2xl)] border border-border-soft bg-card">
            <div className="border-b border-border-soft px-5 py-4">
              <div className="text-lg font-semibold text-foreground">{copy.home.railTitle}</div>
            </div>
            <div className="divide-y divide-border-soft">
              {topCommunities.map((community) => (
                <button className="flex w-full items-center gap-3 px-5 py-3 text-left" key={community.community_id} onClick={() => navigate(`/c/${community.route_slug ?? community.community_id}`)} type="button">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-medium text-foreground">{community.display_name}</div>
                    {community.member_count != null ? <div className="text-base text-muted-foreground">{copy.home.membersLabel.replace("{count}", community.member_count.toLocaleString())}</div> : null}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : undefined}
        availableSorts={sortOptions}
        controls={activeSort === "top" ? <TopTimeRangeControl onValueChange={setTopTimeRange} options={topTimeRangeOptions} value={topTimeRange} /> : undefined}
        emptyState={{
          action: session ? <Button onClick={() => navigate("/communities/new")} variant="secondary">{createCommunityLabel}</Button> : undefined,
          body: emptyHomeBody,
          title: emptyHomeTitle,
        }}
        items={feedItems}
        loading={loading}
        onSortChange={setActiveSort}
        title={copy.home.title}
      />
    </section>
  );
}

export function YourCommunitiesPage() {
  const { copy } = useRouteMessages();
  const sortOptions = React.useMemo(() => buildFeedSortOptions(copy.common), [copy.common]);
  const createCommunityLabel = getRouteString("home", "createCommunity", "Create a community");
  const emptyYourCommunitiesBody = getRouteString("home", "emptyYourCommunitiesBody", "Communities you create or join will show up here.");
  const emptyYourCommunitiesTitle = getRouteString("home", "emptyYourCommunitiesTitle", "No communities yet");
  const [activeSort, setActiveSort] = React.useState<FeedSort>("best");

  return (
    <Feed
      activeSort={activeSort}
      availableSorts={sortOptions}
      emptyState={{
        action: <Button variant="secondary" onClick={() => navigate("/communities/new")}>{createCommunityLabel}</Button>,
        body: emptyYourCommunitiesBody,
        title: emptyYourCommunitiesTitle,
      }}
      items={[]}
      loading={false}
      onSortChange={setActiveSort}
      title={copy.yourCommunities.title}
    />
  );
}

export function NotFoundBody({ title, description, body, backHomeLabel }: { title: string; description: string; body: string; backHomeLabel: string }) {
  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6">
      <div className="rounded-[var(--radius-3xl)] border border-border-soft bg-card px-5 py-5 md:px-6 md:py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title}</h1>
            <p className="max-w-3xl text-base leading-7 text-muted-foreground">{description}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Button onClick={() => navigate("/")} variant="secondary">{backHomeLabel}</Button>
          </div>
        </div>
      </div>
      <EmptyFeedState message={body} />
    </section>
  );
}
