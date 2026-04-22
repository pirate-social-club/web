"use client";

import * as React from "react";
import type { CommunityListing as ApiCommunityListing } from "@pirate/api-contracts";
import type { CommunityPurchase as ApiCommunityPurchase } from "@pirate/api-contracts";
import type { HomeFeedCommunitySummary as ApiHomeFeedCommunitySummary } from "@pirate/api-contracts";
import type { HomeFeedItem as ApiHomeFeedItem } from "@pirate/api-contracts";
import type { Profile as ApiProfile } from "@pirate/api-contracts";

import { navigate } from "@/app/router";
import { Avatar } from "@/components/primitives/avatar";
import { useApi } from "@/lib/api";
import { clearSession, useSession } from "@/lib/api/session-store";
import { buildCommunityPath } from "@/lib/community-routing";
import { useSidebarCommunities } from "@/lib/owned-communities";
import { useUiLocale } from "@/lib/ui-locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/primitives/button";
import { Spinner } from "@/components/primitives/spinner";
import { Feed, type FeedSort, TopTimeRangeControl } from "@/components/compositions/feed/feed";

import { loadProfilesByUserId } from "./community-data";
import { sortHomeFeedEntries } from "./feed-sorting";
import { toHomeFeedItem } from "./post-presentation";
import { submitOptimisticPostVote, updateHomeFeedEntryPostVote } from "./post-vote";
import { buildFeedSortOptions, buildTopTimeRangeOptions, getErrorMessage, useRouteContentLocale, useRouteMessages, useClientHydrated } from "./route-core";
import { getRouteAuthDescription, getRouteFailureDescription } from "./route-status-copy";
import { AuthRequiredRouteState, EmptyFeedState, RouteLoadFailureState, StackPageShell } from "./route-shell";
import { useSongPlayback } from "./song-commerce";
import { useCommunityInteractionGate } from "./community-interaction-gate";

export function HomePage() {
  const api = useApi();
  const hydrated = useClientHydrated();
  const session = useSession();
  const { locale } = useUiLocale();
  const { copy, localeTag } = useRouteMessages();
  const sortOptions = React.useMemo(() => buildFeedSortOptions(copy.common), [copy.common]);
  const topTimeRangeOptions = React.useMemo(() => buildTopTimeRangeOptions(copy.common), [copy.common]);
  const contentLocale = useRouteContentLocale();
  const createCommunityLabel = copy.home.createCommunityLabel;
  const emptyHomeBody = copy.home.emptyHomeBody;
  const emptyHomeTitle = copy.home.emptyHomeTitle;
  const emptyHomeVerifyBody = copy.home.emptyHomeVerifyBody;
  const verifyToPostLabel = copy.home.verifyToPostLabel;
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
  const { gateModal, runGatedCommunityAction } = useCommunityInteractionGate({
    previewLocale: contentLocale,
    routeKind: "home",
    uiLocale: locale,
  });

  React.useEffect(() => {
    let cancelled = false;

    if (!hydrated) return () => { cancelled = true; };

    setLoading(true);
    setError(null);

    void api.feed.home({
      locale: contentLocale,
    })
      .then(async (result) => {
        const nextFeedEntries = result.items;
        const nextTopCommunities = result.top_communities;
        const nextAuthorProfiles = await loadProfilesByUserId(
          api,
          nextFeedEntries.map((entry) => entry.post.post.identity_mode === "public" ? entry.post.post.author_user_id : null).filter((userId): userId is string => Boolean(userId)),
          session?.profile ? { [session.user.user_id]: session.profile } : {},
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
          return;
        }
        setError(nextError);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [api, contentLocale, hydrated, session]);

  const sortedFeedEntries = React.useMemo(() => sortHomeFeedEntries(feedEntries, {
    sort: activeSort,
    topTimeRange: activeSort === "top" ? topTimeRange : null,
  }), [activeSort, feedEntries, topTimeRange]);
  const needsPostingVerification = !!session && session.onboarding.unique_human_verification_status !== "verified";

  const voteOnPost = React.useCallback(async (postId: string, direction: "up" | "down" | null) => {
    const entry = feedEntries.find((candidate) => candidate.post.post.post_id === postId);
    if (!entry) return;
    await runGatedCommunityAction({
      action: "vote_post",
      communityId: entry.community.community_id,
      onAllowed: async () => {
        const previousPost = entry.post;
        await submitOptimisticPostVote({
          direction,
          onApply: (nextValue) => setFeedEntries((current) => updateHomeFeedEntryPostVote(current, postId, nextValue)),
          onRollback: (restoredPost) => setFeedEntries((current) => current.map((currentEntry) => currentEntry.post.post.post_id === postId ? { ...currentEntry, post: restoredPost } : currentEntry)),
          postId,
          previousPost: previousPost ?? null,
          requestIdsRef: voteRequestIdsRef,
          vote: api.posts.vote,
        });
      },
      postId,
    });
  }, [api.posts.vote, feedEntries, runGatedCommunityAction]);

  const feedItems = sortedFeedEntries.map((entry) => {
    const assetId = entry.post.post.asset_id ?? undefined;
    return toHomeFeedItem(
      entry,
      authorProfiles,
      entry.post.post.post_type === "song"
        ? {
          currentUserId: session?.user?.user_id,
          listing: assetId ? listingsByAssetId[assetId] : undefined,
          localeTag,
          playback: songPlayback,
          purchase: assetId ? purchasesByAssetId[assetId] : undefined,
        }
        : undefined,
      {
        onComment: () => navigate(`/p/${entry.post.post.post_id}`),
        onVote: (direction) => void voteOnPost(entry.post.post.post_id, direction),
      },
    );
  });

  if (error) {
    return <RouteLoadFailureState description={getErrorMessage(error, getRouteFailureDescription("home"))} title={copy.home.title} />;
  }

  return (
    <>
      {gateModal}
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
                <button className="flex w-full items-center gap-3 px-5 py-3 text-start" key={community.community_id} onClick={() => navigate(`/c/${community.route_slug ?? community.community_id}`)} type="button">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-medium text-foreground">{community.display_name}</div>
                    {community.member_count != null ? <div className="text-base text-muted-foreground">{copy.home.membersLabel.replace("{count}", community.member_count.toLocaleString(localeTag))}</div> : null}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : undefined}
        availableSorts={sortOptions}
        controls={activeSort === "top" ? <TopTimeRangeControl onValueChange={setTopTimeRange} options={topTimeRangeOptions} value={topTimeRange} /> : undefined}
        emptyState={{
          action: session ? (
            <Button onClick={() => navigate(needsPostingVerification ? "/onboarding" : "/communities/new")} variant="secondary">
              {needsPostingVerification ? verifyToPostLabel : createCommunityLabel}
            </Button>
          ) : undefined,
          body: needsPostingVerification ? emptyHomeVerifyBody : emptyHomeBody,
          title: emptyHomeTitle,
        }}
        items={feedItems}
        loading={loading}
        onSortChange={setActiveSort}
        />
      </section>
    </>
  );
}

export function YourCommunitiesPage() {
  const { copy } = useRouteMessages();
  const session = useSession();
  const { communities, error, loading } = useSidebarCommunities();
  const createCommunityLabel = copy.home.createCommunityLabel;
  const emptyYourCommunitiesBody = copy.home.emptyYourCommunitiesBody;
  const emptyYourCommunitiesTitle = copy.home.emptyYourCommunitiesTitle;

  if (!session) {
    return (
      <AuthRequiredRouteState
        description={getRouteAuthDescription("your-communities")}
        title={copy.yourCommunities.title}
      />
    );
  }

  if (loading && communities.length === 0) {
    return (
      <section className="flex min-w-0 flex-1 items-center justify-center py-20">
        <Spinner className="size-6" />
      </section>
    );
  }

  if (error && communities.length === 0) {
    return (
      <RouteLoadFailureState
        description={getErrorMessage(error, copy.home.loadCommunitiesError)}
        title={copy.yourCommunities.title}
      />
    );
  }

  return (
    <StackPageShell
      actions={<Button onClick={() => navigate("/communities/new")} variant="secondary">{createCommunityLabel}</Button>}
      title={copy.yourCommunities.title}
    >
      {communities.length === 0 ? (
        <EmptyFeedState message={`${emptyYourCommunitiesTitle}. ${emptyYourCommunitiesBody}`} />
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-2xl)] border border-border-soft bg-card">
          {communities.map((community, index) => (
            <button
              className={cn(
                "flex w-full items-center gap-3 px-5 py-4 text-start",
                index === communities.length - 1 ? undefined : "border-b border-border-soft",
              )}
              key={community.communityId}
              onClick={() => navigate(buildCommunityPath(community.communityId, community.routeSlug))}
              type="button"
            >
              <Avatar
                className="size-11 border-border-soft"
                fallback={community.displayName}
                src={community.avatarSrc ?? undefined}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-semibold text-foreground">{community.displayName}</div>
                <div className="truncate text-base text-muted-foreground">
                  {community.routeSlug ? `c/${community.routeSlug}` : community.communityId}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </StackPageShell>
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
