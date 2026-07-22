"use client";

import * as React from "react";

import { PostCard } from "@/components/compositions/posts/post-card/post-card";
import { PostCardSkeleton } from "@/components/compositions/posts/post-card/post-card-skeleton";
import { VideoFeed } from "@/components/compositions/posts/video-feed/video-feed";
import type { VideoFeedItem } from "@/components/compositions/posts/video-feed/video-feed.types";
import { ResponsiveOptionSelect } from "@/components/compositions/system/responsive-option-select/responsive-option-select";
import { pillButtonVariants } from "@/components/primitives/pill-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import { Spinner } from "@/components/primitives/spinner";
import { Button } from "@/components/primitives/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/primitives/dialog";
import type { PostCardProps } from "@/components/compositions/posts/post-card/post-card.types";
import { FullBleedMobileListSection } from "@/components/compositions/app/page-shell";
import { cn } from "@/lib/utils";
import { Type } from "@/components/primitives/type";

export type FeedSort = "best" | "new" | "top";

export interface FeedSortOption {
  label: string;
  value: FeedSort;
}

export interface FeedItem {
  id: string;
  post: PostCardProps;
  postOriginal?: PostCardProps;
}

export interface FeedEmptyState {
  title: string;
  body?: string;
  action?: React.ReactNode;
  illustration?: React.ReactNode;
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
  hideMobileHeaderControls?: boolean;
  loading?: boolean;
  loadingCount?: number;
  loadingMore?: boolean;
  hasMore?: boolean;
  loadMoreError?: string | null;
  loadMoreLabel?: string;
  endMessage?: string;
  onLoadMore?: () => void;
  aside?: React.ReactNode;
  className?: string;
  listClassName?: string;
  fullBleedMobile?: boolean;
}

export interface TopTimeRangeOption {
  label: string;
  value: string;
}

const topTimeRangeOptions = [
  { value: "hour", label: "This hour" },
  { value: "day", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
] satisfies readonly TopTimeRangeOption[];

const EMPTY_FEED_SORT_OPTIONS: FeedSortOption[] = [];

export function toPageVideoItem(item: FeedItem): VideoFeedItem | null {
  const { post } = item;
  if (post.content.type !== "video") return null;
  const content = post.content;
  if (!content.src.trim() && !content.posterSrc) return null;
  const publisher = post.byline.author ?? post.byline.community;
  if (!publisher) return null;
  const linkedSong = content.upstreamAttributions?.find((source) => source.relationshipType === "references_song");

  return {
    id: item.id,
    caption: content.caption,
    commentCount: post.engagement.commentCount,
    karaoke: "unavailable",
    likeCount: post.engagement.score,
    media: {
      orientation: content.aspectRatio != null && content.aspectRatio < 1 ? "portrait" : "landscape",
      posterSrc: content.posterSrc ?? "",
      src: content.src,
    },
    publisher: {
      avatarSrc: publisher.avatarSrc,
      handle: publisher.label,
      kind: publisher.kind === "user" ? "profile" : "community",
    },
    song: linkedSong ? { artist: linkedSong.artist ?? "", title: linkedSong.title } : undefined,
    study: "unavailable",
    viewerState: content.ageGateViewerState === "proof_required" ? "age_proof_required" : "allowed",
  };
}

export function TopTimeRangeControl({
  options = topTimeRangeOptions,
  value,
  onValueChange,
}: {
  options?: readonly TopTimeRangeOption[];
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <Select onValueChange={onValueChange} value={value}>
      <SelectTrigger
        className={cn(
          pillButtonVariants({ tone: "default" }),
          "w-full min-w-40 justify-between bg-card py-0 pe-3 ps-4 shadow-none md:w-44",
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

function FeedLoadingRows({ count }: { count: number }) {
  const rows = Array.from({ length: count }, (_, index) => index + 1);

  return (
    <div className="space-y-0 md:space-y-3">
      {rows.map((rowNumber) => (
        <PostCardSkeleton
          key={`feed-skeleton-${rowNumber}`}
          showMedia={rowNumber % 2 === 1}
        />
      ))}
    </div>
  );
}

function FeedEmpty({ emptyState }: { emptyState: FeedEmptyState }) {
  if (emptyState.illustration) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 px-5 py-10 text-center">
        {emptyState.illustration}
        <Type as="h2" variant="h4" className="text-muted-foreground">
          {emptyState.title}
        </Type>
        {emptyState.body ? (
          <p className="max-w-xs text-lg leading-7 text-muted-foreground">{emptyState.body}</p>
        ) : null}
        {emptyState.action ? <div className="mt-1">{emptyState.action}</div> : null}
      </div>
    );
  }

  return (
    <div className="px-5 py-8 md:px-6">
      <div className="max-w-2xl space-y-2 text-start">
        <Type as="h2" variant="h4">{emptyState.title}</Type>
        {emptyState.body ? (
          <p className="text-base leading-7 text-muted-foreground">{emptyState.body}</p>
        ) : null}
        {emptyState.action ? <div className="pt-2">{emptyState.action}</div> : null}
      </div>
    </div>
  );
}

function FeedLoadingState() {
  return (
    <div className="flex min-h-72 items-center justify-center" aria-busy="true">
      <Spinner className="size-6" />
    </div>
  );
}

export function Feed({
  eyebrow,
  title,
  subtitle,
  items,
  activeSort,
  availableSorts = EMPTY_FEED_SORT_OPTIONS,
  onSortChange,
  headerAction,
  controls,
  emptyState,
  hideMobileHeaderControls = false,
  loading = false,
  loadingCount = 3,
  loadingMore = false,
  hasMore,
  loadMoreError,
  loadMoreLabel = "Load more",
  endMessage = "You're all caught up.",
  onLoadMore,
  aside,
  className,
  listClassName,
  fullBleedMobile = false,
}: FeedProps) {
  const hasItems = items.length > 0;
  const ListWrapper = fullBleedMobile ? FullBleedMobileListSection : React.Fragment;
  const showHeadingBlock = Boolean(eyebrow || title || subtitle || headerAction);
  const showSortControl = Boolean(activeSort && availableSorts.length > 0);
  const showHeaderControls = showSortControl || controls;
  const showMobileHeaderControls = Boolean(controls) && !hideMobileHeaderControls;
  const showLoadingOnly = loading && !hasItems;
  const showLoadingTail = loading && hasItems;
  const [originalPostIds, setOriginalPostIds] = React.useState<Set<string>>(() => new Set());
  const [viewerItemId, setViewerItemId] = React.useState<string | null>(null);
  const loadMoreSentinelRef = React.useRef<HTMLDivElement>(null);
  const paginationEnabled = hasMore !== undefined && Boolean(onLoadMore);
  const pageVideoItems = React.useMemo(() => items.flatMap((item) => {
    const videoItem = toPageVideoItem(item);
    return videoItem ? [videoItem] : [];
  }), [items]);

  React.useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel || !hasMore || loadingMore || !onLoadMore || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
    }, { rootMargin: "600px 0px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, onLoadMore]);

  React.useEffect(() => {
    setOriginalPostIds((current) => {
      const itemIdsWithOriginals = new Set(items.reduce<string[]>((result, item) => {
        if (item.postOriginal) {
          result.push(item.id);
        }
        return result;
      }, []));
      const next = new Set<string>();
      for (const id of current) {
        if (itemIdsWithOriginals.has(id)) {
          next.add(id);
        }
      }
      return next.size === current.size ? current : next;
    });
  }, [items]);

  return (
    <section className={cn("min-w-0", className)}>
      <div className="flex gap-6">
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "flex flex-col",
              showHeadingBlock || showMobileHeaderControls
                ? "mb-4 gap-4 md:mb-5"
                : showHeaderControls
                  ? "md:mb-5 md:gap-4"
                  : undefined,
            )}
          >
            {showHeadingBlock ? (
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="space-y-2 text-start">
                  {eyebrow ? (
                    <div className="text-base uppercase tracking-[0.03em] text-muted-foreground">
                      {eyebrow}
                    </div>
                  ) : null}
                  {title ? (
                    <Type as="h1" variant="h1" className="text-2xl md:text-3xl">
                      {title}
                    </Type>
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
              <div className={cn(
                "flex-col gap-3 md:flex md:flex-row-reverse md:items-center md:justify-between",
                showMobileHeaderControls ? "flex" : "hidden",
              )}>
                {showSortControl ? (
                  <ResponsiveOptionSelect
                    ariaLabel="Sort feed"
                    className="hidden self-end md:inline-flex md:self-auto"
                    drawerTitle="Sort"
                    onValueChange={onSortChange}
                    options={availableSorts}
                    value={activeSort}
                  />
                ) : null}
                {controls ? <div className="flex flex-wrap gap-2 md:me-auto">{controls}</div> : null}
              </div>
            ) : null}
          </div>

          {showLoadingOnly ? <FeedLoadingState /> : null}
          {!loading && !hasItems && emptyState ? (
            <ListWrapper>
              <div className={cn("overflow-hidden border-y border-border-soft md:rounded-[var(--radius-2xl)] md:border md:bg-card", listClassName)}>
                <FeedEmpty emptyState={emptyState} />
              </div>
            </ListWrapper>
          ) : null}
          {hasItems ? (
            <ListWrapper>
              <div className={cn("overflow-hidden border-y border-border-soft animate-in fade-in-0 duration-200 md:rounded-[var(--radius-2xl)] md:border md:bg-card", listClassName)}>
                {items.map((item, index) => {
                const isViewingOriginal = Boolean(item.postOriginal && originalPostIds.has(item.id));
                const activePost = isViewingOriginal && item.postOriginal ? item.postOriginal : item.post;
                const { className: postClassName, ...post } = activePost;

                return (
                  <PostCard
                    {...post}
                    className={cn(index === items.length - 1 ? "border-b-0" : undefined, postClassName)}
                    isViewingOriginal={isViewingOriginal}
                    key={item.id}
                    onOpenVideoViewer={pageVideoItems.some((videoItem) => videoItem.id === item.id)
                      ? () => setViewerItemId(item.id)
                      : undefined}
                    onToggleOriginal={item.postOriginal
                      ? () => setOriginalPostIds((current) => {
                        const next = new Set(current);
                        if (next.has(item.id)) {
                          next.delete(item.id);
                        } else {
                          next.add(item.id);
                        }
                        return next;
                      })
                      : post.onToggleOriginal}
                  />
                );
              })}
                {showLoadingTail ? <FeedLoadingRows count={loadingCount} /> : null}
                {paginationEnabled ? (
                  <div className="flex flex-col items-center gap-2 border-t border-border-soft px-5 py-6" ref={loadMoreSentinelRef}>
                    {loadingMore ? <Spinner className="size-5" /> : null}
                    {loadMoreError ? <p className="text-center text-base text-destructive" role="alert">{loadMoreError}</p> : null}
                    {hasMore && !loadingMore ? <Button onClick={onLoadMore} variant="secondary">{loadMoreLabel}</Button> : null}
                    {!hasMore && !loadingMore ? <p className="text-base text-muted-foreground">{endMessage}</p> : null}
                  </div>
                ) : null}
              </div>
            </ListWrapper>
          ) : null}
        </div>
        {aside ? <div className="hidden w-72 shrink-0 lg:block">{aside}</div> : null}
      </div>
      <Dialog onOpenChange={(open) => { if (!open) setViewerItemId(null); }} open={viewerItemId !== null}>
        <DialogContent className="h-dvh w-screen max-w-none rounded-none border-0 p-0" hideCloseButton>
          <DialogTitle className="sr-only">Video viewer</DialogTitle>
          {viewerItemId ? <VideoFeed initialItemId={viewerItemId} items={pageVideoItems} /> : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
