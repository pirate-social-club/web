"use client";

import * as React from "react";
import { CircleFlag } from "react-circle-flags";

import { Avatar } from "@/components/primitives/avatar";
import { BadgedCircle } from "@/components/primitives/badged-circle";
import { cn } from "@/lib/utils";

type AvatarBadgeSize = "sm" | "md" | "lg";

const defaultBadgeSizeByAvatarSize: Record<AvatarBadgeSize, number> = {
  sm: 18,
  md: 22,
  lg: 26,
};

const ringWidthByBadgeSize = (badgeSize: number) => badgeSize >= 28 ? 2 : 1;

function badgeOffsetXPercentForSize(avatarSize: AvatarBadgeSize, badgeSize: number): number {
  if (badgeSize >= 40) return 10;
  if (badgeSize >= 30) return 8;
  if (avatarSize === "sm") return 6;
  if (avatarSize === "md") return 8;
  return 8;
}

export interface AvatarWithBadgeProps {
  avatarClassName?: string;
  badgeCountryCode?: string | null;
  badgeLabel: string;
  badgeSize?: number;
  className?: string;
  fallback: string;
  fallbackIcon?: React.ReactNode;
  fallbackSeed?: string;
  fallbackSrc?: string;
  size?: AvatarBadgeSize;
  src?: string;
}

function normalizeBadgeCountryCode(countryCode: string | null | undefined): string | null {
  const normalized = countryCode?.trim().toLowerCase();
  return normalized && /^[a-z]{2}$/u.test(normalized) ? normalized : null;
}

export function AvatarWithBadge({
  avatarClassName,
  badgeCountryCode,
  badgeLabel,
  badgeSize,
  className,
  fallback,
  fallbackIcon,
  fallbackSeed,
  fallbackSrc,
  size = "md",
  src,
}: AvatarWithBadgeProps) {
  const normalizedCountryCode = normalizeBadgeCountryCode(badgeCountryCode);
  const resolvedBadgeSize = badgeSize ?? defaultBadgeSizeByAvatarSize[size];
  const ringWidth = ringWidthByBadgeSize(resolvedBadgeSize);

  if (!normalizedCountryCode) {
    return (
      <Avatar
        className={cn(avatarClassName, className)}
        fallback={fallback}
        fallbackIcon={fallbackIcon}
        fallbackSeed={fallbackSeed}
        fallbackSrc={fallbackSrc}
        size={size}
        src={src}
      />
    );
  }

  return (
    <BadgedCircle
      badge={(
        <CircleFlag
          aria-hidden="true"
          className="rounded-full"
          countryCode={normalizedCountryCode}
          height={resolvedBadgeSize}
          width={resolvedBadgeSize}
        />
      )}
      badgeLabel={badgeLabel}
      badgeOffsetXPercent={badgeOffsetXPercentForSize(size, resolvedBadgeSize)}
      badgeOffsetYPercent={0}
      badgePadding={ringWidth}
      badgeSize={resolvedBadgeSize}
      className={className}
    >
      <Avatar
        className={avatarClassName}
        fallback={fallback}
        fallbackIcon={fallbackIcon}
        fallbackSeed={fallbackSeed}
        fallbackSrc={fallbackSrc}
        size={size}
        src={src}
      />
    </BadgedCircle>
  );
}
