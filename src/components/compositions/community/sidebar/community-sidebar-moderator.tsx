"use client";

import * as React from "react";
import { AvatarWithBadge } from "@/components/compositions/system/avatar-badge/avatar-with-badge";
import { buildPublicProfilePath } from "@/lib/profile-routing";
import { cn } from "@/lib/utils";
import type { CommunitySidebarModerator } from "./community-sidebar.types";

export interface CommunitySidebarModeratorProps {
  className?: string;
  moderator: CommunitySidebarModerator;
}

function buildAvatarFallback(name: string): string {
  const tokens = name.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return "?";
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
  return `${tokens[0][0] ?? ""}${tokens[1][0] ?? ""}`.toUpperCase();
}

function normalizeHandleLabel(handle: string): string {
  return handle.trim().replace(/^u\//i, "");
}

export function CommunitySidebarModerator({
  className,
  moderator,
}: CommunitySidebarModeratorProps) {
  const handleLabel = normalizeHandleLabel(moderator.handle);

  return (
    <a
      className={cn(
        "flex items-center gap-3 py-1",
        className,
      )}
      href={buildPublicProfilePath(handleLabel)}
    >
      <AvatarWithBadge
        avatarClassName="border-border bg-foreground/10 text-foreground"
        badgeCountryCode={moderator.nationalityBadgeCountryCode}
        badgeLabel={moderator.nationalityBadgeLabel ?? ""}
        fallback={buildAvatarFallback(moderator.displayName)}
        fallbackSeed={moderator.avatarSeed ?? undefined}
        size="md"
        src={moderator.avatarSrc?.trim() || undefined}
      />
      <span className="min-w-0 truncate font-semibold text-foreground hover:underline">
        {handleLabel}
      </span>
    </a>
  );
}
