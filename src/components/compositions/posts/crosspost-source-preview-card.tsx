import * as React from "react";
import { ArrowSquareOut } from "@phosphor-icons/react";

import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";
import type { CrosspostSourcePreview } from "./post-card/post-card.types";

function sourceStatusLabel(status: CrosspostSourcePreview["status"]) {
  if (status === "deleted" || status === "removed") {
    return "Source post no longer available";
  }
  if (status === "unavailable") {
    return "Source post unavailable";
  }
  return null;
}

function sourceTypeLabel(postType: CrosspostSourcePreview["postType"]) {
  if (!postType || postType === "text") {
    return null;
  }
  return `${postType[0]?.toUpperCase() ?? ""}${postType.slice(1)} post`;
}

export function CrosspostSourcePreviewCard({
  className,
  linkEnabled = false,
  source,
}: {
  className?: string;
  linkEnabled?: boolean;
  source: CrosspostSourcePreview;
}) {
  const isAvailable = source.status === "available";
  const statusLabel = sourceStatusLabel(source.status);
  const typeLabel = sourceTypeLabel(source.postType);
  const sourceMeta = source.authorLabel
    ? `${source.communityLabel} · ${source.authorLabel}`
    : source.communityLabel;
  const sourceMetaWithType = typeLabel ? `${sourceMeta} · ${typeLabel}` : sourceMeta;
  const shouldLink = linkEnabled && isAvailable && source.postHref;

  return (
    <div className={cn(
      "relative block w-full rounded-lg border border-border-soft bg-muted/20 px-4 py-3.5 text-start transition-colors",
      shouldLink && "hover:bg-muted/30",
      className,
    )}>
      {shouldLink ? (
        <a
          aria-label={source.title ? `Open source post: ${source.title}` : "Open source post"}
          className="absolute inset-0 z-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          data-post-card-interactive="true"
          href={source.postHref}
        />
      ) : null}
      <div className={cn(
        "relative z-10 grid min-w-0 gap-3",
        isAvailable && source.thumbnailSrc ? "grid-cols-[4.5rem_minmax(0,1fr)] sm:grid-cols-[5.5rem_minmax(0,1fr)]" : "grid-cols-1",
        shouldLink && "pointer-events-none",
      )}>
        {isAvailable && source.thumbnailSrc ? (
          <div className="aspect-square self-center overflow-hidden rounded-lg bg-muted">
            <img
              alt={source.thumbnailAlt ?? ""}
              aria-hidden={!source.thumbnailAlt}
              className="size-full object-cover"
              src={source.thumbnailSrc}
            />
          </div>
        ) : null}
        <div className="min-w-0 self-center">
          <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
            <ArrowSquareOut className="size-4 shrink-0" />
            <Type as="span" variant="caption" className="truncate">
              Crossposted from {isAvailable ? sourceMetaWithType : source.communityLabel}
            </Type>
          </div>
          {isAvailable ? (
            <Type as="p" variant="h4" className="mt-2 line-clamp-3">
              {source.title?.trim() || "Untitled source post"}
            </Type>
          ) : (
            <Type as="p" variant="body-strong" className="mt-2 text-muted-foreground">
              {statusLabel}
            </Type>
          )}
        </div>
      </div>
    </div>
  );
}
