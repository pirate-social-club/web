import * as React from "react";
import { ArrowSquareOut } from "@phosphor-icons/react";

import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";
import type { CrosspostSourcePreview } from "./post-card/post-card.types";
import { SongPostContent } from "./post-card/post-card-song-content";
import { VideoPostContent } from "./post-card/post-card-video-content";

type PostSourceSummaryKind = NonNullable<CrosspostSourcePreview["postType"]>;

function postSourceKindLabel(kind: PostSourceSummaryKind | null | undefined): string | null {
  if (!kind || kind === "text") {
    return null;
  }
  if (kind === "live_room") {
    return "Livestream";
  }
  if (kind === "image") {
    return "Photo post";
  }
  return `${kind[0]?.toUpperCase() ?? ""}${kind.slice(1)} post`;
}

function sourceStatusLabel(status: CrosspostSourcePreview["status"]) {
  if (status === "deleted" || status === "removed") {
    return "Source post no longer available";
  }
  if (status === "unavailable") {
    return "Source post unavailable";
  }
  return null;
}

interface PostSourceSummaryCardProps {
  available?: boolean;
  className?: string;
  href?: string;
  kind?: PostSourceSummaryKind;
  metaLabel: string;
  prefixLabel: string;
  statusLabel?: string | null;
  thumbnailAlt?: string;
  thumbnailSrc?: string;
  title?: string;
  untitledLabel?: string;
}

function PostSourceSummaryCard({
  available = true,
  className,
  href,
  kind,
  metaLabel,
  prefixLabel,
  statusLabel,
  thumbnailAlt,
  thumbnailSrc,
  title,
  untitledLabel = "Untitled source post",
}: PostSourceSummaryCardProps) {
  const kindLabel = postSourceKindLabel(kind);
  const fullMetaLabel = available && kindLabel ? `${metaLabel} · ${kindLabel}` : metaLabel;
  const shouldLink = Boolean(available && href);

  return (
    <div className={cn(
      "relative block w-full rounded-lg border border-border-soft bg-muted/20 px-4 py-3.5 text-start transition-colors",
      shouldLink && "hover:bg-muted/30",
      className,
    )}>
      {shouldLink ? (
        <a
          aria-label={title ? `Open source post: ${title}` : "Open source post"}
          className="absolute inset-0 z-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          data-post-card-interactive="true"
          href={href}
        />
      ) : null}
      <div className={cn(
        "relative z-10 grid min-w-0 gap-3",
        available && thumbnailSrc ? "grid-cols-[4.5rem_minmax(0,1fr)] sm:grid-cols-[5.5rem_minmax(0,1fr)]" : "grid-cols-1",
        shouldLink && "pointer-events-none",
      )}>
        {available && thumbnailSrc ? (
          <div className="aspect-square self-center overflow-hidden rounded-lg bg-muted">
            <img
              alt={thumbnailAlt ?? ""}
              aria-hidden={!thumbnailAlt}
              className="size-full object-cover"
              src={thumbnailSrc}
            />
          </div>
        ) : null}
        <div className="min-w-0 self-center">
          <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
            <ArrowSquareOut className="size-4 shrink-0" />
            <Type as="span" variant="caption" className="truncate">
              {prefixLabel} {fullMetaLabel}
            </Type>
          </div>
          {available ? (
            <Type as="p" variant="h4" className="mt-2 line-clamp-3">
              {title?.trim() || untitledLabel}
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
  const sourceMeta = source.authorLabel
    ? `${source.communityLabel} · ${source.authorLabel}`
    : source.communityLabel;
  const mediaPreview = isAvailable ? source.mediaPreview : undefined;

  if (mediaPreview) {
    const sourceLabel = `Crossposted from ${sourceMeta}`;
    const sourceLabelClassName = "flex min-w-0 items-center gap-2 text-muted-foreground";
    const sourceLink = linkEnabled && source.postHref ? (
      <a
        className={cn(
          sourceLabelClassName,
          "transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
        data-post-card-interactive="true"
        href={source.postHref}
      >
        <ArrowSquareOut className="size-4 shrink-0" />
        <Type as="span" variant="caption" className="truncate">
          {sourceLabel}
        </Type>
      </a>
    ) : (
      <div className={sourceLabelClassName}>
        <ArrowSquareOut className="size-4 shrink-0" />
        <Type as="span" variant="caption" className="truncate">
          {sourceLabel}
        </Type>
      </div>
    );

    return (
      <div className={cn("w-full space-y-3.5 text-start", className)}>
        {sourceLink}
        {mediaPreview.type === "song" ? (
          <SongPostContent content={mediaPreview} />
        ) : (
          <VideoPostContent content={mediaPreview} />
        )}
      </div>
    );
  }

  return (
    <PostSourceSummaryCard
      available={isAvailable}
      className={className}
      href={linkEnabled ? source.postHref : undefined}
      kind={source.postType}
      metaLabel={isAvailable ? sourceMeta : source.communityLabel}
      prefixLabel="Crossposted from"
      statusLabel={statusLabel}
      thumbnailAlt={source.thumbnailAlt}
      thumbnailSrc={source.thumbnailSrc}
      title={source.title}
    />
  );
}
