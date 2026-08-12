"use client";

import { buildCommunityPath } from "@/lib/community-routing";
import { Button } from "@/components/primitives/button";
import { Type } from "@/components/primitives/type";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { cn } from "@/lib/utils";
import { useRouteContentLocale } from "@/hooks/use-route-content-locale";
import { usePublicCommunityQuery } from "@/lib/query/public-community-query";

export type CommunitySurface = "threads" | "videos";

export function sovereignAppHref(importedRootHostname: string): string {
  return `https://app.${importedRootHostname}/`;
}

export function communitySurfaceHrefs(input: {
  communityId: string;
  routeSlug?: string | null;
}): Record<CommunitySurface, string> {
  const base = buildCommunityPath(input.communityId, input.routeSlug);
  return {
    threads: `${base}/threads`,
    videos: `${base}/videos`,
  };
}

/**
 * Canonical community pages get a normal two-item view navigation. Sovereign
 * origins deliberately do not use this control: their apex is the community
 * identity and app.<root> is the video application.
 */
export function CommunitySurfaceNavigation({
  active,
  className,
  communityId,
  routeSlug,
}: {
  active: CommunitySurface;
  className?: string;
  communityId: string;
  routeSlug?: string | null;
}) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").communitySurface;
  const hrefs = communitySurfaceHrefs({ communityId, routeSlug });
  const labels: Record<CommunitySurface, string> = {
    threads: copy.threads,
    videos: copy.watch,
  };

  return (
    <nav
      aria-label={copy.ariaLabel}
      className={cn("flex min-w-0 items-center gap-6 border-b border-border-soft", className)}
      data-surface-navigation="canonical"
    >
      {(["videos", "threads"] as const).map((surface) => (
        <a
          aria-current={active === surface ? "page" : undefined}
          className={cn(
            "inline-flex h-12 min-w-0 items-center border-b-2 px-1 transition-colors",
            active === surface
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
          href={hrefs[surface]}
          key={surface}
        >
          <Type as="span" className="truncate" variant="label">{labels[surface]}</Type>
        </a>
      ))}
    </nav>
  );
}

export function SovereignOpenAppAction({
  importedRootHostname,
}: {
  importedRootHostname: string;
}) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").communitySurface;
  return (
    // The sovereign observer uses this stable attribute when it verifies
    // reciprocal navigation in a hydrated browser.
    <Button asChild data-surface-navigation="sovereign">
      <a href={sovereignAppHref(importedRootHostname)}>{copy.openApp}</a>
    </Button>
  );
}

function CommunityVideoSurfaceNavigation({
  className,
  communityId,
}: {
  className?: string;
  communityId: string;
}) {
  const contentLocale = useRouteContentLocale();
  const preview = usePublicCommunityQuery(communityId, contentLocale).data;
  return (
    <CommunitySurfaceNavigation
      active="videos"
      className={className}
      communityId={communityId}
      routeSlug={preview?.route_slug}
    />
  );
}

export function communityVideoSurfaceNavigation(
  enabled: boolean,
  communityId: string | null,
  className: string,
) {
  return enabled && communityId
    ? <CommunityVideoSurfaceNavigation className={className} communityId={communityId} />
    : null;
}
