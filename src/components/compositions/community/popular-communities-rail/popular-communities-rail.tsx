"use client";

import * as React from "react";

import { CommunityAvatar } from "@/components/primitives/community-avatar";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

export interface PopularCommunityItem {
  communityId: string;
  communityLabel: string;
  communityHref: string;
  avatarSrc?: string | null;
  memberCount: number;
}

export interface PopularCommunitiesRailProps {
  className?: string;
  items: readonly PopularCommunityItem[];
  localeTag?: string;
  title?: string;
}

function formatMemberCount(value: number, localeTag: string): string {
  return new Intl.NumberFormat(localeTag, {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: value >= 1_000_000 ? 1 : 0,
  }).format(value);
}

export function PopularCommunitiesRail({
  className,
  items,
  localeTag = "en-US",
  title = "POPULAR",
}: PopularCommunitiesRailProps) {
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
          className="text-muted-foreground/70"
        >
          {title}
        </Type>
      </header>
      <div className="divide-y divide-border-soft">
        {items.map((item) => {
          const membersLabel = formatMemberCount(item.memberCount, localeTag);

          return (
            <a
              className="flex items-center gap-3 px-5 py-3 outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
              href={item.communityHref}
              key={item.communityId}
            >
              <CommunityAvatar
                avatarSrc={item.avatarSrc}
                className="size-8 shrink-0 border-border-soft"
                communityId={item.communityId}
                displayName={item.communityLabel}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <Type as="div" variant="body-strong" className="truncate">
                  {item.communityLabel}
                </Type>
                <Type as="div" variant="caption" className="truncate">
                  {`${membersLabel} members`}
                </Type>
              </div>
            </a>
          );
        })}
      </div>

    </section>
  );
}
