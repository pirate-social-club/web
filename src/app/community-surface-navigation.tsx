"use client";

import { buildCommunityPath } from "@/lib/community-routing";
import { Type } from "@/components/primitives/type";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { cn } from "@/lib/utils";
import { useRouteContentLocale } from "@/hooks/use-route-content-locale";
import { usePublicCommunityQuery } from "@/lib/query/public-community-query";

export type CommunitySurface = "threads" | "videos";

export function communitySurfaceHrefs(input: {
  communityId: string;
  importedRootHostname?: string | null;
  routeSlug?: string | null;
}): Record<CommunitySurface, string> {
  if (input.importedRootHostname) {
    return {
      threads: `https://app.${input.importedRootHostname}/`,
      videos: `https://${input.importedRootHostname}/`,
    };
  }

  const base = buildCommunityPath(input.communityId, input.routeSlug);
  return {
    threads: `${base}/threads`,
    videos: `${base}/videos`,
  };
}

/**
 * Canonical community pages get a normal two-item view navigation. Imported app
 * origins get one contextual link back to their sovereign video homepage; this
 * is deliberately not a segmented cross-origin toggle.
 */
export function CommunitySurfaceNavigation({
  active,
  className,
  communityId,
  importedRootHostname,
  routeSlug,
}: {
  active: CommunitySurface;
  className?: string;
  communityId: string;
  importedRootHostname?: string | null;
  routeSlug?: string | null;
}) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").communitySurface;
  const hrefs = communitySurfaceHrefs({ communityId, importedRootHostname, routeSlug });
  const labels: Record<CommunitySurface, string> = {
    threads: copy.threads,
    videos: copy.watch,
  };

  if (importedRootHostname) {
    const destination: CommunitySurface = active === "videos" ? "threads" : "videos";
    return (
      <nav aria-label={copy.ariaLabel} className={className} data-surface-navigation="sovereign">
        <a
          className="inline-flex h-10 items-center rounded-[var(--radius-lg)] border border-border-soft bg-background/90 px-4 shadow-sm backdrop-blur transition-colors hover:bg-muted"
          href={hrefs[destination]}
        >
          <Type as="span" variant="label">{labels[destination]}</Type>
        </a>
      </nav>
    );
  }

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
