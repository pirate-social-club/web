"use client";

import type { Icon } from "@phosphor-icons/react";
import { CheckCircle, Clock, Gauge, HandPalm, IdentificationCard, UserPlus, WarningCircle } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

export type VerificationModalIconKind = "blocked" | "join" | "passport" | "pending" | "ready" | "self" | "very";

const iconByKind: Record<VerificationModalIconKind, Icon> = {
  blocked: WarningCircle,
  join: UserPlus,
  passport: Gauge,
  pending: Clock,
  ready: CheckCircle,
  self: IdentificationCard,
  very: HandPalm,
};

export function VerificationIconBadge({
  className,
  icon,
  iconClassName,
}: {
  className?: string;
  icon: VerificationModalIconKind;
  iconClassName?: string;
}) {
  const IconComponent = iconByKind[icon];

  return (
    <span
      aria-hidden="true"
      className={cn("grid size-12 shrink-0 place-items-center rounded-full border border-border-soft bg-muted/45 text-foreground", className)}
    >
      <IconComponent className={cn("size-7", iconClassName)} weight="duotone" />
    </span>
  );
}
