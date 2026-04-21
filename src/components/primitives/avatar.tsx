"use client";

import * as React from "react";

import { buildDefaultAvatarSrc } from "@/lib/default-avatar";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";

type AvatarSize = "xs" | "sm" | "md" | "lg";

const sizeClasses: Record<AvatarSize, string> = {
  xs: "h-5 w-5 text-[11px]",
  sm: "h-9 w-9 text-base",
  md: "h-12 w-12 text-base",
  lg: "h-14 w-14 text-base",
};

export function isRetryableImageSrc(src: string): boolean {
  const normalized = src.trim().toLowerCase();
  return normalized !== "" && !normalized.startsWith("data:");
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
  const [currentSrc, setCurrentSrc] = React.useState(
    normalizedPrimarySrc || normalizedFallbackSrc || generatedFallbackSrc,
  );

  React.useEffect(() => {
    logger.info("[avatar] source update", {
      fallback,
      generatedFallbackSrcPresent: Boolean(generatedFallbackSrc),
      normalizedFallbackSrc,
      normalizedPrimarySrc,
    });
    setImageFailed(false);
    setRetriedPrimarySrc(null);
    setCurrentSrc(normalizedPrimarySrc || normalizedFallbackSrc || generatedFallbackSrc);
  }, [generatedFallbackSrc, normalizedFallbackSrc, normalizedPrimarySrc]);

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
          onLoad={() => {
            logger.info("[avatar] image loaded", {
              currentSrc,
              fallback,
              imageFailed,
              normalizedPrimarySrc,
              retriedPrimarySrc,
            });
          }}
          onError={() => {
            const currentPrimarySrc = retriedPrimarySrc ?? normalizedPrimarySrc;

            logger.error("[avatar] image failed", {
              currentPrimarySrc,
              currentSrc,
              fallback,
              generatedFallbackSrcPresent: Boolean(generatedFallbackSrc),
              normalizedFallbackSrc,
              normalizedPrimarySrc,
              retriedPrimarySrc,
            });

            if (
              normalizedPrimarySrc
              && currentSrc === normalizedPrimarySrc
              && retriedPrimarySrc == null
              && isRetryableImageSrc(normalizedPrimarySrc)
            ) {
              const nextPrimarySrc = buildRetriedImageSrc(normalizedPrimarySrc);
              logger.info("[avatar] retrying primary image", {
                fallback,
                normalizedPrimarySrc,
                nextPrimarySrc,
              });
              setRetriedPrimarySrc(nextPrimarySrc);
              setCurrentSrc(nextPrimarySrc);
              return;
            }

            if (currentPrimarySrc && currentSrc === currentPrimarySrc) {
              const nextFallbackSrc = normalizedFallbackSrc || generatedFallbackSrc;

              if (nextFallbackSrc && nextFallbackSrc !== currentSrc) {
                logger.info("[avatar] falling back to alternate source", {
                  fallback,
                  nextFallbackSrc,
                });
                setCurrentSrc(nextFallbackSrc);
                return;
              }
            }
            logger.info("[avatar] marking image failed", {
              fallback,
              currentSrc,
            });
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
