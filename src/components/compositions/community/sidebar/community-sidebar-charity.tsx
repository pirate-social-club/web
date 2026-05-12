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

function CharityContent({
  charity,
  linked,
}: {
  charity: CommunitySidebarCharity;
  linked: boolean;
}) {
  return (
    <>
      <Avatar
        className="border-border bg-foreground/10 text-foreground"
        fallback={buildAvatarFallback(charity.name)}
        size="sm"
        src={charity.avatarSrc?.trim() || undefined}
      />
      <span
        className={cn(
          "min-w-0 truncate",
          linked ? "font-semibold text-foreground hover:underline" : "font-medium text-muted-foreground",
        )}
      >
        {charity.name}
      </span>
    </>
  );
}

export function CommunitySidebarCharity({
  charity,
  className,
}: CommunitySidebarCharityProps) {
  if (!charity.href) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 py-1",
          className,
        )}
      >
        <CharityContent charity={charity} linked={false} />
      </div>
    );
  }

  return (
    <a
      className={cn(
        "flex items-center gap-3 py-1",
        className,
      )}
      href={charity.href}
      rel="noopener noreferrer"
      target="_blank"
    >
      <CharityContent charity={charity} linked />
    </a>
  );
}
