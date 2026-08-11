"use client";

import { buildCommunityPath } from "@/lib/community-routing";
import { Type } from "@/components/primitives/type";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { cn } from "@/lib/utils";

export type CommunitySurface = "threads" | "videos";

export function communitySurfaceHrefs(input: {
  communityId: string;
  importedRootHostname?: string | null;
  routeSlug?: string | null;
}): Record<CommunitySurface, string> {
  if (input.importedRootHostname) {
    const root = input.importedRootHostname;
    return {
      threads: `https://app.${root}/`,
      videos: `https://${root}/`,
    };
  }

  const base = buildCommunityPath(input.communityId, input.routeSlug);
  return {
    threads: `${base}/threads`,
    videos: `${base}/videos`,
  };
}

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
          className="inline-flex h-11 items-center rounded-[var(--radius-lg)] border border-border-soft bg-background/90 px-4 shadow-sm backdrop-blur transition-colors hover:bg-muted"
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
      className={cn(
        "flex min-w-0 items-center gap-6 border-b border-border-soft",
        className,
      )}
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
