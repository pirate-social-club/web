"use client";

import * as React from "react";

import { buildDefaultAvatarSrc } from "@/lib/default-avatar";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";

export type AvatarSize = "xs" | "sm" | "md" | "lg";

const sizeClasses: Record<AvatarSize, string> = {
  xs: "h-6 w-6",
  sm: "h-9 w-9 text-base",
  md: "h-12 w-12 text-base",
  lg: "h-14 w-14 text-base",
};

export function isRetryableImageSrc(src: string): boolean {
  const normalized = src.trim().toLowerCase();
  return isRenderableImageSrc(normalized) && !normalized.startsWith("data:");
}

export function isRenderableImageSrc(src: string): boolean {
  const trimmed = src.trim();
  const normalized = trimmed.toLowerCase();

  if (!trimmed) {
    return false;
  }

  if (
    normalized.startsWith("data:")
    || normalized.startsWith("blob:")
    || normalized.startsWith("http://")
    || normalized.startsWith("https://")
    || normalized.startsWith("/")
    || normalized.startsWith("./")
    || normalized.startsWith("../")
  ) {
    return true;
  }

  return !/^[a-z][a-z0-9+.-]*:/iu.test(trimmed);
}

export function buildRetriedImageSrc(src: string): string {
  const trimmed = src.trim();
  if (!trimmed) {
    return trimmed;
  }

  try {
    const url = typeof window === "undefined"
      ? new URL(trimmed, "http://localhost")
      : new URL(trimmed, window.location.href);
    url.searchParams.set("_img_retry", Date.now().toString());
    return url.toString();
  } catch {
    const separator = trimmed.includes("?") ? "&" : "?";
    return `${trimmed}${separator}_img_retry=${Date.now()}`;
  }
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
  const generatedFallbackSrc = React.useMemo(() => {
    if (normalizedFallbackSrc || fallbackIcon) {
      return "";
    }

    return buildDefaultAvatarSrc(fallback);
  }, [fallback, fallbackIcon, normalizedFallbackSrc]);
  const [imageFailed, setImageFailed] = React.useState(false);
  const [retriedPrimarySrc, setRetriedPrimarySrc] = React.useState<string | null>(null);
  const primarySrc = isRenderableImageSrc(normalizedPrimarySrc) ? normalizedPrimarySrc : "";
  const alternateSrc = isRenderableImageSrc(normalizedFallbackSrc) ? normalizedFallbackSrc : generatedFallbackSrc;
  const [currentSrc, setCurrentSrc] = React.useState(primarySrc || alternateSrc);

  React.useEffect(() => {
    setImageFailed(false);
    setRetriedPrimarySrc(null);
    setCurrentSrc(primarySrc || alternateSrc);
  }, [alternateSrc, primarySrc]);

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
            const currentPrimarySrc = retriedPrimarySrc ?? normalizedPrimarySrc;

            logger.warn("[avatar] image failed", {
              currentPrimarySrc,
              currentSrc,
              fallback,
              generatedFallbackSrcPresent: Boolean(generatedFallbackSrc),
              normalizedFallbackSrc,
              normalizedPrimarySrc,
              retriedPrimarySrc,
            });

            if (
              primarySrc
              && currentSrc === primarySrc
              && retriedPrimarySrc == null
              && isRetryableImageSrc(primarySrc)
            ) {
              const nextPrimarySrc = buildRetriedImageSrc(primarySrc);
              setRetriedPrimarySrc(nextPrimarySrc);
              setCurrentSrc(nextPrimarySrc);
              return;
            }

            if (currentPrimarySrc && currentSrc === currentPrimarySrc) {
              const nextFallbackSrc = alternateSrc;

              if (nextFallbackSrc && nextFallbackSrc !== currentSrc) {
                setCurrentSrc(nextFallbackSrc);
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
