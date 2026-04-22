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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
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
  const activeSortLabel = React.useMemo(
    () => availableSorts?.find((sort) => sort.value === activeSort)?.label ?? copy.common.bestTab,
    [activeSort, availableSorts, copy.common.bestTab],
  );

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
      <section className={cn("mx-auto flex w-full min-w-0 max-w-[78rem] flex-col gap-4", className)}>
        <div className="min-w-0">{hero}</div>
        <FlatTabBar
          actions={mobileView === "feed" && activeSort && availableSorts && availableSorts.length > 0 ? (
              <Select onValueChange={(value) => onSortChange?.(value as FeedSort)} value={activeSort}>
                <SelectTrigger className="h-9 w-auto min-w-0 rounded-none border-0 bg-transparent px-0 py-0 text-base font-medium text-muted-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 data-[placeholder]:text-muted-foreground">
                  <SelectValue aria-label={activeSortLabel} />
                </SelectTrigger>
                <SelectContent align="end">
                  {availableSorts.map((sort) => (
                    <SelectItem key={sort.value} value={sort.value}>
                      {sort.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
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
              onSortChange={onSortChange}
            />
          </div>
        ) : (
          <div>
            <CommunitySidebarDetails
              charity={sidebar.charity}
              description={sidebar.description}
              flairPolicy={sidebar.flairPolicy}
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
        availableSorts={availableSorts}
        controls={controls}
        emptyState={emptyState}
        items={items}
        onSortChange={onSortChange}
      />
    </ContentRailShell>
  );
}
