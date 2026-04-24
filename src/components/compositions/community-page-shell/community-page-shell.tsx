"use client";

import * as React from "react";

import { CommunityHero } from "@/components/compositions/community-page-shell/community-hero";
import { FlatTabBar, FlatTabButton } from "@/components/compositions/flat-tabs/flat-tabs";
import {
  CommunitySidebar,
  CommunitySidebarDetails,
} from "@/components/compositions/community-sidebar/community-sidebar";
import type { CommunitySidebarProps } from "@/components/compositions/community-sidebar/community-sidebar.types";
import { ContentRailShell } from "@/components/compositions/content-rail-shell/content-rail-shell";
import {
  Feed,
  type FeedEmptyState,
  type FeedItem,
  type FeedSort,
  type FeedSortOption,
} from "@/components/compositions/feed/feed";
import { ResponsiveOptionSelect } from "@/components/compositions/responsive-option-select/responsive-option-select";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { cn } from "@/lib/utils";

export interface CommunityPageShellProps {
  activeSort?: FeedSort;
  avatarSrc?: string | null;
  availableSorts?: FeedSortOption[];
  bannerSrc?: string | null;
  className?: string;
  communityId: string;
  controls?: React.ReactNode;
  emptyState?: FeedEmptyState;
  headerAction?: React.ReactNode;
  items: FeedItem[];
  loading?: boolean;
  onSortChange?: (sort: FeedSort) => void;
  routeLabel?: string | null;
  routeVerified?: boolean;
  sidebar: CommunitySidebarProps;
  title: string;
}

export function CommunityPageShell({
  activeSort,
  avatarSrc,
  availableSorts,
  bannerSrc,
  className,
  communityId,
  controls,
  emptyState,
  headerAction,
  items,
  loading = false,
  onSortChange,
  routeLabel,
  routeVerified,
  sidebar,
  title,
}: CommunityPageShellProps) {
  const isMobile = useIsMobile();
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes");
  const [mobileView, setMobileView] = React.useState<"feed" | "about">("feed");
  const sortControl = activeSort && availableSorts && availableSorts.length > 0 ? (
    <ResponsiveOptionSelect<FeedSort>
      ariaLabel="Sort feed"
      drawerTitle={copy.community.feedTab}
      onValueChange={onSortChange}
      options={availableSorts}
      value={activeSort}
    />
  ) : null;

  React.useEffect(() => {
    if (!isMobile && mobileView !== "feed") {
      setMobileView("feed");
    }
  }, [isMobile, mobileView]);

  const hero = (
    <CommunityHero
      actions={headerAction}
      avatarSrc={avatarSrc}
      bannerSrc={bannerSrc}
      communityId={communityId}
      displayName={title}
      routeLabel={routeLabel}
      routeVerified={routeVerified}
    />
  );

  if (isMobile) {
    return (
      <section className={cn("mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-4", className)}>
        <div className="min-w-0">{hero}</div>
        <FlatTabBar
          actions={mobileView === "feed" ? sortControl : null}
          columns={2}
        >
          <FlatTabButton active={mobileView === "feed"} onClick={() => setMobileView("feed")}>
            {copy.community.feedTab}
          </FlatTabButton>
          <FlatTabButton active={mobileView === "about"} onClick={() => setMobileView("about")}>
            {copy.community.aboutTab}
          </FlatTabButton>
        </FlatTabBar>
        {mobileView === "feed" ? (
          <div>
            <Feed
              activeSort={activeSort}
              controls={controls}
              emptyState={emptyState}
              items={items}
              listClassName="-mx-3 border-t-0 md:border-t"
              loading={loading}
              onSortChange={onSortChange}
            />
          </div>
        ) : (
          <div>
            <CommunitySidebarDetails
              charity={sidebar.charity}
              className="-mx-3 rounded-none bg-transparent px-3 py-0"
              description={sidebar.description}
              flairPolicy={sidebar.flairPolicy}
              followerCount={sidebar.followerCount}
              memberCount={sidebar.memberCount}
              moderator={sidebar.moderator}
              referenceLinks={sidebar.referenceLinks}
              requirements={sidebar.requirements}
              rules={sidebar.rules}
            />
          </div>
        )}
      </section>
    );
  }

  return (
    <ContentRailShell
      className={cn("min-w-0 flex-1", className)}
      header={hero}
      rail={<CommunitySidebar {...sidebar} />}
    >
      <Feed
        activeSort={activeSort}
        controls={sortControl || controls ? (
          <div className="flex flex-wrap items-center gap-2">
            {sortControl}
            {controls}
          </div>
        ) : undefined}
        emptyState={emptyState}
        items={items}
        loading={loading}
        onSortChange={onSortChange}
      />
    </ContentRailShell>
  );
}
