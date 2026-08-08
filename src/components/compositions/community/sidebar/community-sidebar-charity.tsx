"use client";

import { Avatar } from "@/components/primitives/avatar";
import { cn } from "@/lib/utils";
import { formatAvatarInitials } from "@/lib/formatting/initials";
import type { CommunitySidebarCharity } from "./community-sidebar.types";

export interface CommunitySidebarCharityProps {
  charity: CommunitySidebarCharity;
  className?: string;
}

function buildAvatarFallback(name: string): string {
  return formatAvatarInitials(name);
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
