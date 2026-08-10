"use client";

import { buildCommunityPath } from "@/lib/community-routing";
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

export function CommunitySurfaceSwitch({
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
  const hrefs = communitySurfaceHrefs({ communityId, importedRootHostname, routeSlug });

  return (
    <nav
      aria-label="Community surface"
      className={cn(
        "inline-flex items-center rounded-full border border-border/70 bg-background/85 p-1 shadow-sm backdrop-blur",
        className,
      )}
    >
      {(["videos", "threads"] as const).map((surface) => (
        <a
          aria-current={active === surface ? "page" : undefined}
          className={cn(
            "rounded-full px-3 py-1.5 text-base font-semibold transition-colors",
            active === surface
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
          href={hrefs[surface]}
          key={surface}
        >
          {surface === "videos" ? "Videos" : "Threads"}
        </a>
      ))}
    </nav>
  );
}
