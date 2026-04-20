"use client";

import * as React from "react";

import { Avatar } from "@/components/primitives/avatar";
import { resolveCommunityBannerSrc } from "@/lib/default-community-media";
import { cn } from "@/lib/utils";

export interface CommunityHeroProps {
  actions?: React.ReactNode;
  avatarSrc?: string | null;
  bannerSrc?: string | null;
  className?: string;
  communityId: string;
  displayName: string;
  routeLabel?: string | null;
  routeVerified?: boolean;
}

export function CommunityHero({
  actions,
  avatarSrc,
  bannerSrc,
  className,
  communityId,
  displayName,
  routeLabel,
  routeVerified = false,
}: CommunityHeroProps) {
  const resolvedBannerSrc = React.useMemo(
    () => resolveCommunityBannerSrc({ bannerSrc, communityId, displayName }),
    [bannerSrc, communityId, displayName],
  );
  const trimmedDisplayName = displayName.trim();
  const trimmedRouteLabel = routeLabel?.trim() || null;
  const primaryLabel = trimmedDisplayName;
  const secondaryLabel = trimmedRouteLabel;

  return (
    <section className={cn("overflow-visible", className)}>
      <div className="relative h-44 w-full overflow-hidden rounded-[var(--radius-2xl)] border border-border-soft bg-[#22120b] md:h-60">
        <img
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
          src={resolvedBannerSrc}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/45" />
      </div>
      <div className="relative z-10 px-3 pt-3 md:px-5 md:pt-4">
        <div className="-mt-8 flex flex-col gap-3 md:-mt-12 md:flex-row md:items-end md:justify-between md:gap-4">
          <div className="flex min-w-0 items-end gap-3 md:gap-5">
            <Avatar
              className="relative z-10 h-20 w-20 shrink-0 border-3 border-card bg-card shadow-[0_10px_30px_rgba(0,0,0,0.28)] md:h-28 md:w-28 md:border-4"
              fallback={displayName}
              size="lg"
              src={avatarSrc?.trim() || undefined}
            />
            <div className="min-w-0 pb-0.5 md:pb-1.5">
              <h1 className="truncate text-[1.5rem] font-semibold tracking-tight text-foreground md:text-[2.125rem]">
                {primaryLabel}
              </h1>
              {secondaryLabel ? (
                <div className="truncate text-base text-muted-foreground md:text-[1.05rem]">
                  {secondaryLabel}
                </div>
              ) : null}
            </div>
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3 self-start md:self-end">{actions}</div> : null}
        </div>
      </div>
    </section>
  );
}
