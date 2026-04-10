"use client";

import * as React from "react";

import { AppRoute, navigate } from "@/app/router";
import {
  COMMUNITY_RECORDS,
  CREATE_COMMUNITY_SAMPLE,
  CURRENT_USER_ID,
  HOME_POSTS,
  ONBOARDING_SAMPLE,
  POSTS_BY_ID,
  PROFILES,
  type CommunitySummary,
  type ProfileSummary,
  type RoutePost,
  YOUR_COMMUNITIES_POSTS,
} from "@/app/mocks";
import { CommunitySidebar } from "@/components/compositions/community-sidebar/community-sidebar";
import { CreateCommunityComposer } from "@/components/compositions/create-community-composer/create-community-composer";
import { Feed, type FeedSort, type FeedSortOption } from "@/components/compositions/feed/feed";
import type { OnboardingRedditBootstrapProps } from "@/components/compositions/onboarding-reddit-bootstrap/onboarding-reddit-bootstrap.types";
import { OnboardingRedditBootstrap } from "@/components/compositions/onboarding-reddit-bootstrap/onboarding-reddit-bootstrap";
import { PostCard } from "@/components/compositions/post-card/post-card";
import { PostThread } from "@/components/compositions/post-thread/post-thread";
import { ProfilePage as ProfilePageComposition } from "@/components/compositions/profile-page/profile-page";
import type { ProfilePageProps as ProfileCompositionProps } from "@/components/compositions/profile-page/profile-page.types";
import { Button } from "@/components/primitives/button";
import { pillButtonVariants } from "@/components/primitives/pill-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import { useUiLocale } from "@/lib/ui-locale";
import { resolveLocaleLanguageTag } from "@/lib/ui-locale-core";
import { getLocaleMessages } from "@/locales";
import { cn } from "@/lib/utils";

function interpolateMessage(
  template: string,
  replacements: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/gu, (_, key: string) => replacements[key] ?? `{${key}}`);
}

function useRouteMessages() {
  const { locale } = useUiLocale();

  return {
    copy: getLocaleMessages(locale, "routes"),
    localeTag: resolveLocaleLanguageTag(locale),
  };
}

type FeedTopTimeRange = "hour" | "day" | "week" | "month" | "year" | "all";

function getFeedSortOptions(copy: {
  bestTab: string;
  newTab: string;
  topTab: string;
}): FeedSortOption[] {
  return [
    { value: "best", label: copy.bestTab },
    { value: "new", label: copy.newTab },
    { value: "top", label: copy.topTab },
  ];
}

function getTopTimeRangeOptions(copy: {
  topHour: string;
  topDay: string;
  topWeek: string;
  topMonth: string;
  topYear: string;
  topAll: string;
}) {
  return [
    { value: "hour" as const, label: copy.topHour },
    { value: "day" as const, label: copy.topDay },
    { value: "week" as const, label: copy.topWeek },
    { value: "month" as const, label: copy.topMonth },
    { value: "year" as const, label: copy.topYear },
    { value: "all" as const, label: copy.topAll },
  ];
}

function FeedTopTimeRangeSelect({
  activeRange,
  options,
  onRangeChange,
}: {
  activeRange: FeedTopTimeRange;
  options: Array<{ value: FeedTopTimeRange; label: string }>;
  onRangeChange: (value: FeedTopTimeRange) => void;
}) {
  return (
    <Select onValueChange={(value) => onRangeChange(value as FeedTopTimeRange)} value={activeRange}>
      <SelectTrigger
        className={cn(
          pillButtonVariants({ tone: "default" }),
          "w-full min-w-[10rem] justify-between bg-card py-0 pl-4 pr-3 shadow-none md:w-[11rem]",
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function StackPageShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6">
      <div className="rounded-[var(--radius-3xl)] border border-border-soft bg-card px-5 py-5 md:px-6 md:py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              {title}
            </h1>
            {description ? (
              <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function FeedRailList({
  items,
  title,
}: {
  items: Array<{ id: string; label: string; meta: string; href: string }>;
  title: string;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-3xl)] border border-border-soft bg-card">
      <div className="border-b border-border-soft px-5 py-4">
        <div className="text-lg font-semibold text-foreground">{title}</div>
      </div>
      <div className="divide-y divide-border-soft">
        {items.map((item) => (
          <button
            className="flex w-full flex-col items-start gap-1 px-5 py-4 text-left transition-colors hover:bg-muted/40"
            key={item.id}
            onClick={() => navigate(item.href)}
            type="button"
          >
            <div className="text-base font-medium text-foreground">{item.label}</div>
            <div className="text-base text-muted-foreground">{item.meta}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function toFeedItems(posts: RoutePost[]) {
  return posts.map((post) => ({
    id: post.postId,
    post,
  }));
}

function toRecentPostRailItems(posts: RoutePost[]) {
  return posts.slice(0, 5).map((post) => ({
    id: `recent-${post.postId}`,
    label: post.title ?? post.byline.community?.label ?? post.byline.author?.label ?? "Post",
    meta: [post.byline.community?.label, post.byline.timestampLabel].filter(Boolean).join(" · "),
    href: post.postHref ?? `/p/${post.postId}`,
  }));
}

function HomePage() {
  const { copy } = useRouteMessages();
  const [activeSort, setActiveSort] = React.useState<FeedSort>("best");
  const [topTimeRange, setTopTimeRange] = React.useState<FeedTopTimeRange>("day");
  const sortOptions = getFeedSortOptions(copy.common);
  const topTimeRangeOptions = getTopTimeRangeOptions(copy.common);
  const railItems = toRecentPostRailItems(HOME_POSTS);

  return (
    <Feed
      activeSort={activeSort}
      aside={<FeedRailList items={railItems} title={copy.home.railTitle} />}
      availableSorts={sortOptions}
      controls={
        activeSort === "top" ? (
          <FeedTopTimeRangeSelect
            activeRange={topTimeRange}
            onRangeChange={setTopTimeRange}
            options={topTimeRangeOptions}
          />
        ) : undefined
      }
      items={toFeedItems(HOME_POSTS)}
      onSortChange={setActiveSort}
    />
  );
}

function YourCommunitiesPage() {
  const { copy } = useRouteMessages();
  const [activeSort, setActiveSort] = React.useState<FeedSort>("new");
  const [topTimeRange, setTopTimeRange] = React.useState<FeedTopTimeRange>("day");
  const sortOptions = getFeedSortOptions(copy.common);
  const topTimeRangeOptions = getTopTimeRangeOptions(copy.common);
  const railItems = Object.values(COMMUNITY_RECORDS).map((community) => ({
    id: `${community.id}-rail`,
    label: community.displayName,
    meta:
      community.membershipMode === "gated"
        ? copy.yourCommunities.gatedLabel
        : copy.yourCommunities.openLabel,
    href: `/c/${community.id}`,
  }));

  return (
    <Feed
      activeSort={activeSort}
      aside={<FeedRailList items={railItems} title={copy.yourCommunities.railTitle} />}
      availableSorts={sortOptions}
      controls={
        activeSort === "top" ? (
          <FeedTopTimeRangeSelect
            activeRange={topTimeRange}
            onRangeChange={setTopTimeRange}
            options={topTimeRangeOptions}
          />
        ) : undefined
      }
      items={toFeedItems(YOUR_COMMUNITIES_POSTS)}
      onSortChange={setActiveSort}
    />
  );
}

function CommunityPage({ community }: { community: CommunitySummary }) {
  const { copy } = useRouteMessages();
  const [activeSort, setActiveSort] = React.useState<FeedSort>("best");
  const [topTimeRange, setTopTimeRange] = React.useState<FeedTopTimeRange>("day");
  const sortOptions = getFeedSortOptions(copy.common);
  const topTimeRangeOptions = getTopTimeRangeOptions(copy.common);

  return (
    <Feed
      activeSort={activeSort}
      aside={
        <CommunitySidebar
          charity={{
            href: "https://www.musicares.org/",
            name: "MusiCares",
          }}
          createdAt={community.createdAt}
          description={community.description}
          displayName={community.displayName}
          flairPolicy={community.flairPolicy}
          memberCount={community.memberCount}
          membershipMode={community.membershipMode}
          moderator={community.moderator}
          referenceLinks={community.referenceLinks}
          rules={community.rules}
        />
      }
      availableSorts={sortOptions}
      controls={
        <>
          {activeSort === "top" ? (
            <FeedTopTimeRangeSelect
              activeRange={topTimeRange}
              onRangeChange={setTopTimeRange}
              options={topTimeRangeOptions}
            />
          ) : null}
        </>
      }
      items={toFeedItems(community.posts)}
      onSortChange={setActiveSort}
    />
  );
}

function PostPage({ post }: { post: RoutePost }) {
  const { copy } = useRouteMessages();

  return (
    <StackPageShell
      title={post.title ?? copy.post.fallbackTitle}
      description={copy.post.description}
    >
      <PostThread
        commentsBody={copy.post.commentsBody}
        commentsHeading={copy.common.commentsHeading}
        post={post}
      />
    </StackPageShell>
  );
}

function toProfilePageProps(
  profile: ProfileSummary,
  ownProfile: boolean,
  joinedStatLabel: string,
): ProfileCompositionProps {
  const overviewItems: ProfileCompositionProps["overviewItems"] = [];
  const overviewLength = Math.max(
    profile.posts.length,
    profile.comments.length,
    profile.scrobbles.length,
  );

  for (let index = 0; index < overviewLength; index += 1) {
    const post = profile.posts[index];
    if (post) {
      overviewItems.push({
        kind: "post",
        id: `activity_post_${post.postId}`,
        post: {
          postId: post.postId,
          post,
        },
      });
    }

    const comment = profile.comments[index];
    if (comment) {
      overviewItems.push({
        kind: "comment",
        id: `activity_comment_${comment.commentId}`,
        comment,
      });
    }

    const scrobble = profile.scrobbles[index];
    if (scrobble) {
      overviewItems.push({
        kind: "scrobble",
        id: `activity_scrobble_${scrobble.scrobbleId}`,
        scrobble,
      });
    }
  }

  return {
    profile: {
      displayName: profile.displayName,
      handle: profile.handle,
      bio: profile.bio,
      avatarSrc: profile.avatarSrc,
      bannerSrc: `https://picsum.photos/seed/${profile.userId}-banner/1600/480`,
      meta: profile.stats,
      viewerContext: ownProfile ? "self" : "public",
      viewerFollows: false,
      canMessage: !ownProfile,
    },
    rightRail: {
      stats: [
        { label: joinedStatLabel, value: profile.joinedLabel.replace(/^Joined\s+/, "") },
        ...profile.stats,
      ],
    },
    overviewItems,
    posts: profile.posts.map((post) => ({
      postId: post.postId,
      post,
    })),
    comments: profile.comments,
    scrobbles: profile.scrobbles,
  };
}

function CurrentUserProfilePage() {
  const { copy } = useRouteMessages();

  return (
    <ProfilePageComposition
      {...toProfilePageProps(PROFILES[CURRENT_USER_ID], true, copy.common.joinedStatLabel)}
    />
  );
}

function UserProfilePage({ profile }: { profile: ProfileSummary }) {
  const { copy } = useRouteMessages();

  return (
    <ProfilePageComposition
      {...toProfilePageProps(profile, false, copy.common.joinedStatLabel)}
    />
  );
}

function OnboardingPage() {
  const { copy } = useRouteMessages();
  const [phase, setPhase] = React.useState<OnboardingRedditBootstrapProps["phase"]>("import_karma");

  return (
    <StackPageShell
      title={copy.onboarding.title}
      description={copy.onboarding.description}
      actions={
        <>
          <Button
            onClick={() => setPhase("import_karma")}
            variant={phase === "import_karma" ? "default" : "secondary"}
          >
            {copy.onboarding.importKarmaAction}
          </Button>
          <Button
            onClick={() => setPhase("choose_name")}
            variant={phase === "choose_name" ? "default" : "secondary"}
          >
            {copy.onboarding.chooseNameAction}
          </Button>
          <Button
            onClick={() => setPhase("suggested_communities")}
            variant={phase === "suggested_communities" ? "default" : "secondary"}
          >
            {copy.onboarding.suggestedCommunitiesAction}
          </Button>
        </>
      }
    >
      <div className="mx-auto w-full max-w-5xl">
        <OnboardingRedditBootstrap {...ONBOARDING_SAMPLE} phase={phase} />
      </div>
    </StackPageShell>
  );
}

function AuthPlaceholderPage() {
  const { copy } = useRouteMessages();

  return (
    <StackPageShell
      title={copy.auth.title}
      description={copy.auth.description}
    >
      <div className="rounded-[var(--radius-3xl)] border border-border-soft bg-card px-5 py-5">
        <p className="text-base leading-7 text-muted-foreground">
          {copy.auth.body}
        </p>
      </div>
    </StackPageShell>
  );
}

function InboxPlaceholderPage() {
  const { copy } = useRouteMessages();

  return (
    <StackPageShell
      title={copy.inbox.title}
      description={copy.inbox.description}
    >
      <div className="rounded-[var(--radius-3xl)] border border-border-soft bg-card px-5 py-5">
        <p className="text-base leading-7 text-muted-foreground">
          {copy.inbox.body}
        </p>
      </div>
    </StackPageShell>
  );
}

function CreateCommunityPage() {
  const { copy } = useRouteMessages();

  return (
    <StackPageShell
      title={copy.createCommunity.title}
      description={copy.createCommunity.description}
    >
      <div className="mx-auto w-full max-w-5xl">
        <CreateCommunityComposer {...CREATE_COMMUNITY_SAMPLE} />
      </div>
    </StackPageShell>
  );
}

function NotFoundPage({ path }: { path: string }) {
  const { copy } = useRouteMessages();

  return (
    <StackPageShell
      title={copy.notFound.title}
      description={interpolateMessage(copy.notFound.description, { path })}
      actions={
        <Button onClick={() => navigate("/")} variant="secondary">
          {copy.common.backHome}
        </Button>
      }
    >
      <div className="rounded-[var(--radius-3xl)] border border-border-soft bg-card px-5 py-5">
        <p className="text-base leading-7 text-muted-foreground">
          {copy.notFound.body}
        </p>
      </div>
    </StackPageShell>
  );
}

export function renderRoute(route: AppRoute): React.ReactNode {
  switch (route.kind) {
    case "home":
      return <HomePage />;
    case "your-communities":
      return <YourCommunitiesPage />;
    case "community": {
      const community = COMMUNITY_RECORDS[route.communityId];
      return community ? (
        <CommunityPage community={community} />
      ) : (
        <NotFoundPage path={route.path} />
      );
    }
    case "create-community":
      return <CreateCommunityPage />;
    case "post": {
      const post = POSTS_BY_ID[route.postId];
      return post ? <PostPage post={post} /> : <NotFoundPage path={route.path} />;
    }
    case "inbox":
      return <InboxPlaceholderPage />;
    case "me":
      return <CurrentUserProfilePage />;
    case "user": {
      const profile = PROFILES[route.userId];
      return profile ? (
        <UserProfilePage profile={profile} />
      ) : (
        <NotFoundPage path={route.path} />
      );
    }
    case "onboarding":
      return <OnboardingPage />;
    case "auth":
      return <AuthPlaceholderPage />;
    case "not-found":
      return <NotFoundPage path={route.path} />;
  }
}
