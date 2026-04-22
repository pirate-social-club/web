import * as React from "react";
import { ArrowSquareOut } from "@phosphor-icons/react";

import { FormattedText } from "@/components/primitives/formatted-text";
import { cn } from "@/lib/utils";
import { OfficialOEmbed, PostEmbedPreview } from "./post-card-embed";
import { postCardType } from "./post-card.styles";
import type { PostCardContent } from "./post-card.types";

const LazySongPostContent = React.lazy(async () => {
  const module = await import("./post-card-song-content");
  return { default: module.SongPostContent };
});

const LazyVideoPostContent = React.lazy(async () => {
  const module = await import("./post-card-video-content");
  return { default: module.VideoPostContent };
});

function SongPostContentFallback({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-lg border border-border-soft bg-muted/30 p-3", className)}>
      <div className="size-16 shrink-0 rounded-lg bg-muted" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="h-3 w-24 rounded bg-muted/80" />
      </div>
      <div className="size-10 shrink-0 rounded-full bg-muted" />
    </div>
  );
}

function VideoPostContentFallback({ className }: { className?: string }) {
  return <div className={cn("aspect-video w-full rounded-lg bg-muted", className)} aria-busy="true" />;
}

export interface PostCardMediaProps {
  content: PostCardContent;
  className?: string;
}

export function PostCardMedia({ content, className }: PostCardMediaProps) {
  switch (content.type) {
    case "text":
      return (
        <FormattedText
          className={cn(
            postCardType.body,
            "max-w-[72ch] self-start text-start text-foreground",
            className,
          )}
          dir={content.bodyDir ?? "auto"}
          lang={content.bodyLang}
          value={content.body}
        />
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
            <figcaption
              className={cn("mt-1.5 text-start text-muted-foreground", postCardType.caption)}
              dir={content.captionDir ?? "auto"}
              lang={content.captionLang}
            >
              {content.caption}
            </figcaption>
          )}
        </figure>
      );
    case "video":
      return (
        <React.Suspense fallback={<VideoPostContentFallback className={className} />}>
          <LazyVideoPostContent content={content} className={className} />
        </React.Suspense>
      );
    case "link":
      return (
        <div className={cn("w-full space-y-2 text-start", className)}>
          <a
            className={cn(
              "grid w-full items-stretch gap-3 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              content.previewImageSrc
                ? "grid-cols-[minmax(0,7fr)_minmax(5rem,3fr)]"
                : "grid-cols-1",
            )}
            href={content.href}
            data-post-card-interactive="true"
          >
            <div className="flex min-h-20 min-w-0 items-center rounded-lg border border-border-soft bg-muted/30 px-3 py-2.5">
              <div className="min-w-0 space-y-1">
                {content.previewTitle ? (
                  <p
                    className={cn(postCardType.title, "line-clamp-2 font-semibold text-foreground")}
                    dir={content.previewTitleDir ?? "auto"}
                    lang={content.previewTitleLang}
                  >
                    {content.previewTitle}
                  </p>
                ) : null}
                <div className={cn("flex min-w-0 items-center gap-1.5 text-muted-foreground", postCardType.meta)}>
                  <span className="truncate">{content.linkLabel ?? content.href}</span>
                  <ArrowSquareOut className="size-4 shrink-0" />
                </div>
              </div>
            </div>
            {content.previewImageSrc ? (
              <div className="min-h-20 overflow-hidden rounded-lg">
                <img
                  alt=""
                  aria-hidden="true"
                  className="size-full object-cover"
                  src={content.previewImageSrc}
                />
              </div>
            ) : null}
          </a>
          {content.linkCaption ? (
            <FormattedText
              className={cn(postCardType.caption, "text-foreground")}
              dir={content.linkCaptionDir ?? "auto"}
              lang={content.linkCaptionLang}
              value={content.linkCaption}
            />
          ) : null}
        </div>
      );
    case "embed":
      return content.renderMode === "official"
        ? <OfficialOEmbed content={content} className={className} />
        : <PostEmbedPreview content={content} className={className} />;
    case "song":
      return (
        <React.Suspense fallback={<SongPostContentFallback className={className} />}>
          <LazySongPostContent content={content} className={className} />
        </React.Suspense>
      );
  }
}
