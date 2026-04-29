"use client";

import * as React from "react";

import { CommunityAvatar } from "@/components/primitives/community-avatar";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

export interface RecentPostRailItem {
  commentCount: number;
  communityAvatarSrc?: string | null;
  communityHref: string;
  communityId: string;
  communityLabel: string;
  postHref: string;
  postId: string;
  postTitle: string;
  score: number;
  thumbnailSrc?: string | null;
  timestampLabel: string;
}

export interface RecentPostRailProps {
  className?: string;
  items: readonly RecentPostRailItem[];
  localeTag?: string;
  title?: string;
}

function formatCompactCount(value: number, localeTag: string): string {
  return new Intl.NumberFormat(localeTag, {
    compactDisplay: "short",
    notation: "compact",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);
}

export function RecentPostRail({
  className,
  items,
  localeTag = "en-US",
  title = "Recent posts",
}: RecentPostRailProps) {
  const headingId = React.useId();

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "overflow-hidden rounded-[var(--radius-3xl)] border border-border-soft bg-card",
        className,
      )}
    >
      <header className="px-5 pt-5 pb-3">
        <Type
          as="h2"
          id={headingId}
          variant="overline"
          className="text-[13px] tracking-[0.02em] text-muted-foreground/70"
        >
          {title}
        </Type>
      </header>
      <div className="divide-y divide-border-soft">
        {items.map((item) => {
          const scoreLabel = formatCompactCount(item.score, localeTag);
          const commentLabel = formatCompactCount(item.commentCount, localeTag);

          return (
            <article
              className="flex items-start gap-4 px-5 py-4"
              key={item.postId}
            >
              <div className="min-w-0 flex-1 pr-2">
                <div className="flex min-w-0 items-center gap-2 text-[15px] leading-none text-muted-foreground">
                  <a
                    className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Open community: ${item.communityLabel}`}
                    href={item.communityHref}
                  >
                    <CommunityAvatar
                      avatarSrc={item.communityAvatarSrc}
                      className="size-8 shrink-0 border-border-soft"
                      communityId={item.communityId}
                      displayName={item.communityLabel}
                      size="sm"
                    />
                  </a>
                  <a
                    className="min-w-0 rounded-[var(--radius-sm)] outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Open community: ${item.communityLabel}`}
                    href={item.communityHref}
                  >
                    <span className="block truncate font-medium text-muted-foreground transition-colors hover:text-foreground">
                      {item.communityLabel}
                    </span>
                  </a>
                  <span aria-hidden="true" className="shrink-0 text-muted-foreground/80">
                    •
                  </span>
                  <span className="shrink-0 text-muted-foreground/80">{item.timestampLabel}</span>
                </div>
                <a
                  className="group mt-2 block rounded-[var(--radius-md)] outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Open post: ${item.postTitle}`}
                  href={item.postHref}
                >
                  <Type
                    as="span"
                    variant="body-strong"
                    className="block line-clamp-2 text-[17px] leading-[1.24] transition-colors group-hover:text-link md:text-[18px]"
                  >
                    {item.postTitle}
                  </Type>
                </a>
                <div className="mt-2 flex flex-nowrap items-center gap-2 text-[14px] leading-none text-muted-foreground">
                  <span className="whitespace-nowrap">{`${scoreLabel} upvotes`}</span>
                  <span aria-hidden="true" className="shrink-0">
                    •
                  </span>
                  <span className="whitespace-nowrap">{`${commentLabel} comments`}</span>
                </div>
              </div>
              {item.thumbnailSrc ? (
                <a
                  className="shrink-0 rounded-[var(--radius-md)] outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Open post: ${item.postTitle}`}
                  href={item.postHref}
                >
                  <div className="h-[4.5rem] w-[4.5rem] overflow-hidden rounded-[var(--radius-xl)] border border-border-soft bg-surface-skeleton">
                    <img
                      alt=""
                      className="h-full w-full object-cover"
                      decoding="async"
                      loading="lazy"
                      src={item.thumbnailSrc}
                    />
                  </div>
                </a>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
