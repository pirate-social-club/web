"use client";

import * as React from "react";
import { AvatarWithBadge } from "@/components/compositions/system/avatar-badge/avatar-with-badge";
import { buildPublicProfilePath } from "@/lib/profile-routing";
import { cn } from "@/lib/utils";
import type { CommunitySidebarRoleHolder } from "./community-sidebar.types";

export interface CommunitySidebarRoleHolderProps {
  className?: string;
  roleHolder: CommunitySidebarRoleHolder;
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

export function CommunitySidebarRoleHolderComponent({
  className,
  roleHolder,
}: CommunitySidebarRoleHolderProps) {
  const handleLabel = normalizeHandleLabel(roleHolder.handle);

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
        badgeCountryCode={roleHolder.nationalityBadgeCountryCode}
        badgeLabel={roleHolder.nationalityBadgeLabel ?? ""}
        fallback={buildAvatarFallback(roleHolder.displayName)}
        fallbackSeed={roleHolder.avatarSeed ?? undefined}
        size="md"
        src={roleHolder.avatarSrc?.trim() || undefined}
      />
      <span className="min-w-0 truncate font-semibold text-foreground hover:underline">
        {handleLabel}
      </span>
    </a>
  );
}
