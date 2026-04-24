"use client";

import type { Icon } from "@phosphor-icons/react";
import { Fingerprint, IdentificationCard } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

export type VerificationModalIconKind = "self" | "very";

const iconByKind: Record<VerificationModalIconKind, Icon> = {
  self: IdentificationCard,
  very: Fingerprint,
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
