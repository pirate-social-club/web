"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type AvatarSize = "xs" | "sm" | "md" | "lg";

const sizeClasses: Record<AvatarSize, string> = {
  xs: "h-5 w-5 text-[11px]",
  sm: "h-9 w-9 text-base",
  md: "h-12 w-12 text-base",
  lg: "h-14 w-14 text-base",
};

function getAvatarFallbackLabel(input: string) {
  const parts = input
    .trim()
    .split(/\s+/u)
    .filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

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
          className="pointer-events-none h-full w-full object-cover"
          draggable={false}
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
        <span aria-hidden className="leading-none">
          {getAvatarFallbackLabel(fallback)}
        </span>
      )}
    </div>
  );
}
