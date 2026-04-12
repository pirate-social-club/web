import * as React from "react";

import { PostCard } from "@/components/compositions/post-card/post-card";
import { PostCardSkeleton } from "@/components/compositions/post-card/post-card-skeleton";
import { PillButton } from "@/components/primitives/pill-button";
import { ContentWithRail } from "@/components/primitives/content-with-rail";
import type { PostCardProps } from "@/components/compositions/post-card/post-card.types";
import { cn } from "@/lib/utils";

export type FeedSort = "best" | "new" | "top";

export interface FeedSortOption {
  label: string;
  value: FeedSort;
}

export interface FeedItem {
  id: string;
  post: PostCardProps;
}

export interface FeedEmptyState {
  title: string;
  body?: string;
  action?: React.ReactNode;
}

export interface FeedProps {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  items: FeedItem[];
  activeSort?: FeedSort;
  availableSorts?: FeedSortOption[];
  onSortChange?: (sort: FeedSort) => void;
  headerAction?: React.ReactNode;
  controls?: React.ReactNode;
  emptyState?: FeedEmptyState;
  loading?: boolean;
  loadingCount?: number;
  aside?: React.ReactNode;
  className?: string;
}

function FeedLoadingRows({ count }: { count: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, index) => (
        <PostCardSkeleton
          key={`feed-skeleton-${index}`}
          showMedia={index % 2 === 0}
        />
      ))}
    </div>
  );
}

function FeedEmpty({ emptyState }: { emptyState: FeedEmptyState }) {
  return (
    <div className="px-5 py-8 md:px-6">
      <div className="max-w-2xl space-y-2">
        <h2 className="text-lg font-semibold text-foreground">{emptyState.title}</h2>
        {emptyState.body ? (
          <p className="text-base leading-7 text-muted-foreground">{emptyState.body}</p>
        ) : null}
        {emptyState.action ? <div className="pt-2">{emptyState.action}</div> : null}
      </div>
    </div>
  );
}

export function Feed({
  eyebrow,
  title,
  subtitle,
  items,
  activeSort,
  availableSorts = [],
  onSortChange,
  headerAction,
  controls,
  emptyState,
  loading = false,
  loadingCount = 3,
  aside,
  className,
}: FeedProps) {
  const hasItems = items.length > 0;
  const showHeadingBlock = Boolean(eyebrow || title || subtitle || headerAction);
  const showHeaderControls = availableSorts.length > 0 || controls;
  const showLoadingOnly = loading && !hasItems;
  const showLoadingTail = loading && hasItems;

  return (
    <ContentWithRail className={className} rail={aside}>
      <section className="min-w-0">
        <div className={cn("flex flex-col", showHeadingBlock || showHeaderControls ? "mb-4 gap-4 md:mb-5" : undefined)}>
          {showHeadingBlock ? (
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="space-y-2">
                {eyebrow ? (
                  <div className="text-base uppercase tracking-[0.12em] text-muted-foreground">
                    {eyebrow}
                  </div>
                ) : null}
                {title ? (
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                    {title}
                  </h1>
                ) : null}
                {subtitle ? (
                  <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                    {subtitle}
                  </p>
                ) : null}
              </div>
              {headerAction ? <div className="flex flex-wrap gap-3">{headerAction}</div> : null}
            </div>
          ) : null}

          {showHeaderControls ? (
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              {availableSorts.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {availableSorts.map((sort) => (
                    <PillButton
                      key={sort.value}
                      onClick={() => onSortChange?.(sort.value)}
                      tone={sort.value === activeSort ? "selected" : "default"}
                    >
                      {sort.label}
                    </PillButton>
                  ))}
                </div>
              ) : null}
              {controls ? <div className="flex flex-wrap gap-2">{controls}</div> : null}
            </div>
          ) : null}
        </div>

        <div>
          {showLoadingOnly ? <FeedLoadingRows count={loadingCount} /> : null}
          {!loading && !hasItems && emptyState ? <FeedEmpty emptyState={emptyState} /> : null}
          {hasItems ? (
            <div className="space-y-3">
              {items.map((item) => {
                const { className: postClassName, ...post } = item.post;

                return (
                  <div
                    className="overflow-hidden rounded-[var(--radius-2xl)] border border-border-soft bg-card"
                    key={item.id}
                  >
                    <PostCard
                      {...post}
                      className={cn("border-b-0", postClassName)}
                    />
                  </div>
                );
              })}
              {showLoadingTail ? <FeedLoadingRows count={loadingCount} /> : null}
            </div>
          ) : null}
        </div>
      </section>
    </ContentWithRail>
  );
}
