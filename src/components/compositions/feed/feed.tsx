import * as React from "react";

import { PostCard } from "@/components/compositions/post-card/post-card";
import { PostCardSkeleton } from "@/components/compositions/post-card/post-card-skeleton";
import { ResponsiveOptionSelect } from "@/components/compositions/responsive-option-select/responsive-option-select";
import { pillButtonVariants } from "@/components/primitives/pill-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import { Spinner } from "@/components/primitives/spinner";
import type { PostCardProps } from "@/components/compositions/post-card/post-card.types";
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
  aside?: React.ReactNode;
  className?: string;
  listClassName?: string;
}

export interface TopTimeRangeOption {
  label: string;
  value: string;
}

export const topTimeRangeOptions = [
  { value: "hour", label: "This hour" },
  { value: "day", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
] satisfies readonly TopTimeRangeOption[];

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
  return (
    <div className="space-y-0 md:space-y-3">
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
  availableSorts = [],
  onSortChange,
  headerAction,
  controls,
  emptyState,
  hideMobileHeaderControls = false,
  loading = false,
  loadingCount = 3,
  aside,
  className,
  listClassName,
}: FeedProps) {
  const hasItems = items.length > 0;
  const showHeadingBlock = Boolean(eyebrow || title || subtitle || headerAction);
  const showSortControl = Boolean(activeSort && availableSorts.length > 0);
  const showHeaderControls = showSortControl || controls;
  const showMobileHeaderControls = showHeaderControls && !hideMobileHeaderControls;
  const showLoadingOnly = loading && !hasItems;
  const showLoadingTail = loading && hasItems;
  const [originalPostIds, setOriginalPostIds] = React.useState<Set<string>>(() => new Set());

  React.useEffect(() => {
    setOriginalPostIds((current) => {
      const itemIdsWithOriginals = new Set(items.filter((item) => item.postOriginal).map((item) => item.id));
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
                    <div className="text-base uppercase tracking-widest text-muted-foreground">
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
                    className="self-end md:self-auto"
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
            <div className={cn("overflow-hidden border-y border-border-soft md:rounded-[var(--radius-2xl)] md:border md:bg-card", listClassName)}>
              <FeedEmpty emptyState={emptyState} />
            </div>
          ) : null}
          {hasItems ? (
            <div className={cn("overflow-hidden border-y border-border-soft md:rounded-[var(--radius-2xl)] md:border md:bg-card", listClassName)}>
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
            </div>
          ) : null}
        </div>
        {aside ? <div className="hidden w-72 shrink-0 lg:block">{aside}</div> : null}
      </div>
    </section>
  );
}
