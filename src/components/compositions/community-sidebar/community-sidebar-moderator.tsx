"use client";

import * as React from "react";
import { Avatar } from "@/components/primitives/avatar";
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

export function CommunitySidebarModerator({
  className,
  moderator,
}: CommunitySidebarModeratorProps) {
  return (
    <a
      className={cn(
        "flex items-center gap-3 py-1 text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
      href={`/${moderator.handle}`}
    >
      <Avatar
        className="border-border-on-dark bg-white/10 text-white"
        fallback={buildAvatarFallback(moderator.displayName)}
        size="sm"
        src={moderator.avatarSrc?.trim() || undefined}
      />
      <span className="min-w-0 truncate">{moderator.handle}</span>
    </a>
  );
}
