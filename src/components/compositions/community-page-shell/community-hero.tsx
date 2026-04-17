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
  const primaryLabel = routeVerified && trimmedRouteLabel ? trimmedRouteLabel : trimmedDisplayName;
  const secondaryLabel = routeVerified
    ? trimmedDisplayName && trimmedDisplayName !== primaryLabel
      ? trimmedDisplayName
      : null
    : trimmedRouteLabel && trimmedRouteLabel !== primaryLabel
      ? trimmedRouteLabel
      : null;

  return (
    <section className={cn("overflow-visible", className)}>
      <div className="relative h-40 w-full overflow-hidden rounded-[var(--radius-2xl)] border border-border-soft bg-[#22120b] md:h-52">
        <img
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
          src={resolvedBannerSrc}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/45" />
      </div>
      <div className="relative z-10 px-4 pt-3 md:px-5">
        <div className="-mt-10 flex flex-col gap-4 md:-mt-12 md:flex-row md:items-end md:justify-between">
          <div className="flex min-w-0 items-end gap-4">
            <Avatar
              className="relative z-10 h-20 w-20 shrink-0 border-4 border-card bg-card shadow-[0_10px_30px_rgba(0,0,0,0.28)] md:h-24 md:w-24"
              fallback={displayName}
              size="lg"
              src={avatarSrc?.trim() || undefined}
            />
            <div className="min-w-0 pb-1">
              <h1 className="truncate text-[2rem] font-semibold tracking-tight text-foreground md:text-[2.5rem]">
                {primaryLabel}
              </h1>
              {secondaryLabel ? (
                <div className="truncate text-base text-muted-foreground md:text-lg">
                  {secondaryLabel}
                </div>
              ) : null}
            </div>
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3 self-start md:self-auto">{actions}</div> : null}
        </div>
      </div>
    </section>
  );
}
