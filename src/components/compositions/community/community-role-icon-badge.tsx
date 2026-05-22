import * as React from "react";
import { CrownCrossIcon, ShieldIcon } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

export type CommunityRoleIconBadgeRole = "owner" | "admin" | "moderator";

function getRoleBadgeCopy(role: CommunityRoleIconBadgeRole): string {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";
  return "Moderator";
}

export function CommunityRoleIconBadge({
  className,
  role,
}: {
  className?: string;
  role?: CommunityRoleIconBadgeRole | null;
}) {
  if (!role) return null;

  const label = getRoleBadgeCopy(role);
  const Icon = role === "owner" ? CrownCrossIcon : ShieldIcon;
  const colorClassName = role === "owner" ? "text-warning" : "text-foreground/70";

  return (
    <span
      aria-label={label}
      className={cn(
        "inline-flex size-[1.1em] shrink-0 items-center justify-center",
        colorClassName,
        className,
      )}
      role="img"
      title={label}
    >
      <Icon aria-hidden className="size-full" weight="fill" />
    </span>
  );
}
