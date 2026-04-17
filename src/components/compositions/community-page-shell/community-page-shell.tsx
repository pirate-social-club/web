"use client";

import * as React from "react";

import { CommunityHero } from "@/components/compositions/community-page-shell/community-hero";
import { CommunitySidebar } from "@/components/compositions/community-sidebar/community-sidebar";
import type { CommunitySidebarProps } from "@/components/compositions/community-sidebar/community-sidebar.types";
import { ContentRailShell } from "@/components/compositions/content-rail-shell/content-rail-shell";
import {
  Feed,
  type FeedEmptyState,
  type FeedItem,
  type FeedSort,
  type FeedSortOption,
} from "@/components/compositions/feed/feed";
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
  return (
    <ContentRailShell
      className={cn("min-w-0 flex-1", className)}
      header={(
        <CommunityHero
          actions={headerAction}
          avatarSrc={avatarSrc}
          bannerSrc={bannerSrc}
          communityId={communityId}
          displayName={title}
          routeLabel={routeLabel}
          routeVerified={routeVerified}
        />
      )}
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
