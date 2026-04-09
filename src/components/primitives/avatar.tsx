"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";

type AvatarSize = "xs" | "sm" | "md" | "lg";

const sizeClasses: Record<AvatarSize, string> = {
  xs: "h-5 w-5 text-[11px]",
  sm: "h-9 w-9 text-sm",
  md: "h-12 w-12 text-sm",
  lg: "h-14 w-14 text-base",
};

export function Avatar({
  className,
  fallback,
  fallbackIcon,
  fallbackSrc,
  size = "md",
  src,
}: {
  className?: string;
  fallback: string;
  fallbackIcon?: React.ReactNode;
  fallbackSrc?: string;
  size?: AvatarSize;
  src?: string;
}) {
  const normalizedPrimarySrc = src?.trim() || "";
  const normalizedFallbackSrc = fallbackSrc?.trim() || "";
  const [imageFailed, setImageFailed] = React.useState(false);
  const [currentSrc, setCurrentSrc] = React.useState(
    normalizedPrimarySrc || normalizedFallbackSrc,
  );

  React.useEffect(() => {
    setImageFailed(false);
    setCurrentSrc(normalizedPrimarySrc || normalizedFallbackSrc);
  }, [normalizedFallbackSrc, normalizedPrimarySrc]);

  const canRenderImage = Boolean(currentSrc) && !imageFailed;

  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full border border-border-soft bg-surface-skeleton font-semibold text-foreground",
        sizeClasses[size],
        className,
      )}
    >
      {canRenderImage ? (
        <img
          alt={fallback}
          className="h-full w-full object-cover"
          onError={() => {
            if (normalizedPrimarySrc && currentSrc === normalizedPrimarySrc) {
              if (normalizedFallbackSrc && normalizedFallbackSrc !== currentSrc) {
                setCurrentSrc(normalizedFallbackSrc);
                return;
              }
            }
            setImageFailed(true);
          }}
          src={currentSrc}
        />
      ) : fallbackIcon ? (
        fallbackIcon
      ) : (
        <Skeleton aria-hidden className="h-full w-full rounded-full bg-[var(--color-surface-skeleton)]" />
      )}
    </div>
  );
}
