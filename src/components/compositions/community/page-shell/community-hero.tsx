"use client";

import * as React from "react";

import { IdentityHero } from "@/components/compositions/profiles/identity-hero/identity-hero";
import { resolveCommunityBannerSrc } from "@/lib/default-community-media";

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
    <IdentityHero
      actions={actions}
      avatarFallback={displayName}
      avatarSrc={avatarSrc}
      className={className}
      coverClassName="bg-background"
      coverOverlay={<div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/45" />}
      coverSrc={resolvedBannerSrc}
      subtitle={secondaryLabel}
      title={primaryLabel}
    />
  );
}
