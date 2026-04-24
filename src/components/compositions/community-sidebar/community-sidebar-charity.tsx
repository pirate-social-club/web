"use client";

import * as React from "react";
import { Avatar } from "@/components/primitives/avatar";
import { cn } from "@/lib/utils";
import type { CommunitySidebarCharity } from "./community-sidebar.types";

export interface CommunitySidebarCharityProps {
  charity: CommunitySidebarCharity;
  className?: string;
}

function buildAvatarFallback(name: string): string {
  const tokens = name.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return "?";
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
  return `${tokens[0][0] ?? ""}${tokens[1][0] ?? ""}`.toUpperCase();
}

export function CommunitySidebarCharity({
  charity,
  className,
}: CommunitySidebarCharityProps) {
  const content = (
    <>
      <Avatar
        className="border-border bg-foreground/10 text-foreground"
        fallback={buildAvatarFallback(charity.name)}
        size="sm"
        src={charity.avatarSrc?.trim() || undefined}
      />
      <span className="min-w-0 truncate">{charity.name}</span>
    </>
  );

  if (!charity.href) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 py-1 text-muted-foreground",
          className,
        )}
      >
        {content}
      </div>
    );
  }

  return (
    <a
      className={cn(
        "flex items-center gap-3 py-1 text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
      href={charity.href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {content}
    </a>
  );
}
