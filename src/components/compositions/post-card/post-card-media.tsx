import * as React from "react";
import { ArrowSquareOut } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { postCardType } from "./post-card.styles";
import { SongPostContent } from "./post-card-song-content";
import { VideoPostContent } from "./post-card-video-content";
import type { PostCardContent } from "./post-card.types";

export interface PostCardMediaProps {
  content: PostCardContent;
  className?: string;
}

export function PostCardMedia({ content, className }: PostCardMediaProps) {
  switch (content.type) {
    case "text":
      return (
        <p className={cn(postCardType.body, "text-foreground", className)}>
          {content.body}
        </p>
      );
    case "image":
      return (
        <figure className={cn("overflow-hidden rounded-lg", className)}>
          <img
            alt={content.alt}
            className="w-full object-cover"
            src={content.src}
            style={content.aspectRatio ? { aspectRatio: content.aspectRatio } : undefined}
          />
          {content.caption && (
            <figcaption className={cn("mt-1.5 text-muted-foreground", postCardType.caption)}>
              {content.caption}
            </figcaption>
          )}
        </figure>
      );
    case "video":
      return <VideoPostContent content={content} className={className} />;
    case "link":
      return (
        <a
          className={cn(
            "flex w-full items-stretch gap-3 transition-colors hover:opacity-90",
            className,
          )}
          href={content.href}
          data-post-card-interactive="true"
        >
          <div className="min-w-0 flex-1">
            <p className={cn(postCardType.label, "line-clamp-2 font-semibold text-foreground")}>
              {content.linkTitle}
            </p>
            <div className={cn("mt-1.5 flex items-center gap-1.5 text-muted-foreground", postCardType.meta)}>
              <span className="truncate">{content.linkLabel ?? content.href}</span>
              <ArrowSquareOut className="size-4 shrink-0" />
            </div>
          </div>
          <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-muted sm:size-24">
            {content.previewImageSrc ? (
              <img
                alt={content.linkTitle}
                className="size-full object-cover"
                src={content.previewImageSrc}
              />
            ) : null}
          </div>
        </a>
      );
    case "song":
      return <SongPostContent content={content} className={className} />;
  }
}
