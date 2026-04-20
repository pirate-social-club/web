"use client";

import * as React from "react";

import { CommunityHero } from "@/components/compositions/community-page-shell/community-hero";
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
      actions={isMobile ? undefined : headerAction}
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
        {headerAction ? (
          <div className="px-3">
            <div className="[&>div]:justify-start [&>div]:gap-2 [&_button]:h-8 [&_button]:px-3.5 [&_button]:text-base [&_button]:font-medium [&_button]:shadow-none [&_svg]:size-4">
              {headerAction}
            </div>
          </div>
        ) : null}
        <div className="px-3">
          <div className="flex items-center justify-between gap-4 border-b border-border-soft pb-2">
            <div className="flex items-center gap-4">
              <button
                className={cn(
                  "inline-flex h-9 items-center border-b-2 px-0 text-base font-semibold transition-colors",
                  mobileView === "feed"
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setMobileView("feed")}
                type="button"
              >
                {copy.community.feedTab}
              </button>
              <button
                className={cn(
                  "inline-flex h-9 items-center border-b-2 px-0 text-base font-semibold transition-colors",
                  mobileView === "about"
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setMobileView("about")}
                type="button"
              >
                {copy.community.aboutTab}
              </button>
            </div>
            {mobileView === "feed" && activeSort && availableSorts && availableSorts.length > 0 ? (
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
            ) : <div />}
          </div>
        </div>
        {mobileView === "feed" ? (
          <div className="px-3">
            <Feed
              activeSort={activeSort}
              controls={controls}
              emptyState={emptyState}
              items={items}
              onSortChange={onSortChange}
            />
          </div>
        ) : (
          <div className="px-3">
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
