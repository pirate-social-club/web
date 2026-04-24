"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface BadgedCircleProps {
  badge: React.ReactNode;
  badgeFrameClassName?: string;
  badgeLabel?: string;
  badgeOffsetPercent?: number;
  badgeOffsetXPercent?: number;
  badgeOffsetYPercent?: number;
  badgePadding?: number;
  badgeSize: number;
  children: React.ReactNode;
  className?: string;
}

export function BadgedCircle({
  badge,
  badgeFrameClassName,
  badgeLabel,
  badgeOffsetPercent = 12,
  badgeOffsetXPercent,
  badgeOffsetYPercent,
  badgePadding = 1,
  badgeSize,
  children,
  className,
}: BadgedCircleProps) {
  const frameSize = badgeSize + badgePadding * 2;
  const offsetX = badgeOffsetXPercent ?? badgeOffsetPercent;
  const offsetY = badgeOffsetYPercent ?? badgeOffsetPercent;

  return (
    <span className={cn("relative z-10 inline-flex shrink-0", className)}>
      {children}
      <span
        aria-label={badgeLabel}
        className={cn(
          "pointer-events-none absolute bottom-0 right-0 z-20 grid place-items-center overflow-hidden rounded-full bg-white",
          badgeFrameClassName,
        )}
        role={badgeLabel ? "img" : undefined}
        style={{
          height: frameSize,
          padding: badgePadding,
          transform: `translate(${offsetX}%, ${offsetY}%)`,
          width: frameSize,
        }}
        title={badgeLabel}
      >
        {badge}
      </span>
    </span>
  );
}
