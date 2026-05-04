import * as React from "react";
import { Globe, Lock as FilledLockIcon } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { FormattedText } from "@/components/primitives/formatted-text";
import { useUiLocale } from "@/lib/ui-locale";
import { cn } from "@/lib/utils";
import { getLocaleMessages } from "@/locales";
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

type LinkContent = Extract<PostCardContent, { type: "link" }>;

function getLinkSummaryBullets(summary: LinkContent["summary"]): string[] {
  const shortSummary = summary?.shortSummary?.trim() ?? "";
  const keyPoints = summary?.keyPoints?.map((point) => point.trim()).filter(Boolean).slice(0, 3) ?? [];

  if (keyPoints.length > 0) {
    return keyPoints;
  }

  return shortSummary
    .split(/(?<=[.!?])\s+/u)
    .map((point) => point.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function LinkPreviewCard({ content }: { content: LinkContent }) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").common;
  const [summaryExpanded, setSummaryExpanded] = React.useState(false);
  const sourceLabel = content.sourceLabel ?? content.linkLabel ?? content.href;
  const metaLabel = content.publishedLabel
    ? `${sourceLabel} · ${content.publishedLabel}`
    : sourceLabel;
  const summaryBullets = getLinkSummaryBullets(content.summary);
  const summaryParagraph = content.summary?.summaryParagraph?.trim()
    ?? content.summary?.shortSummary?.trim()
    ?? "";
  const openLabel = content.previewTitle
    ? `Open article: ${content.previewTitle}`
    : `Open article: ${sourceLabel}`;

  return (
    <div className="relative block w-full rounded-lg border border-border-soft bg-muted/20 px-4 py-3.5 text-start transition-colors hover:bg-muted/30">
      <a
        aria-label={openLabel}
        className="absolute inset-0 z-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        href={content.href}
        rel="noopener noreferrer"
        target="_blank"
        data-post-card-interactive="true"
      />
      <div className={cn("pointer-events-none relative z-10 flex min-w-0 items-center gap-2 text-muted-foreground", postCardType.meta)}>
        <Globe className="size-4 shrink-0" />
        <span className="truncate">{metaLabel}</span>
      </div>

      <div
        className={cn(
          "pointer-events-none relative z-10 mt-3 grid min-w-0 gap-3",
          content.previewImageSrc ? "grid-cols-[minmax(0,1fr)_5.75rem] sm:grid-cols-[minmax(0,1fr)_7rem]" : "grid-cols-1",
        )}
      >
        <div className="min-w-0 self-center">
          {content.previewTitle ? (
            <p
              className={cn(postCardType.title, "line-clamp-3 font-semibold text-foreground")}
              dir={content.previewTitleDir ?? "auto"}
              lang={content.previewTitleLang}
            >
              {content.previewTitle}
            </p>
          ) : (
            <p className={cn(postCardType.title, "line-clamp-2 font-semibold text-primary underline decoration-primary/40 underline-offset-2")}>
              {content.href}
            </p>
          )}
          {summaryBullets.length > 0 ? (
            <ul className="mt-2 space-y-1 ps-4 text-foreground/85">
              {summaryBullets.map((point, index) => (
                <li
                  className={cn(postCardType.caption, "list-disc")}
                  dir={content.summaryDir ?? "auto"}
                  key={`${index}:${point}`}
                  lang={content.summaryLang}
                >
                  {point}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {content.previewImageSrc ? (
          <div className="aspect-square self-center overflow-hidden rounded-lg">
            <img
              alt=""
              aria-hidden="true"
              className="size-full object-cover"
              src={content.previewImageSrc}
            />
          </div>
        ) : null}
      </div>
      {summaryParagraph ? (
        <div className="relative z-20 mt-2">
          {summaryExpanded ? (
            <FormattedText
              className={cn(postCardType.caption, "mb-2 border-t border-border-soft pt-2 text-foreground/85")}
              dir={content.summaryDir ?? "auto"}
              lang={content.summaryLang}
              value={summaryParagraph}
            />
          ) : null}
          <button
            className={cn(postCardType.label, "font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2")}
            data-post-card-interactive="true"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setSummaryExpanded((value) => !value);
            }}
            type="button"
          >
            {summaryExpanded ? copy.hideSummary : copy.readSummary}
          </button>
        </div>
      ) : null}
    </div>
  );
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
    case "image": {
      const isAgeGated = content.ageGatePolicy === "18_plus" && content.contentSafetyState === "adult";
      const ageGateRequiresProof = isAgeGated && content.ageGateViewerState !== "verified_allowed";
      return (
        <figure className={className}>
          <div className="relative overflow-hidden rounded-lg bg-muted">
            <img
              alt={content.alt}
              className={cn(
                "w-full object-cover transition-[filter,transform]",
                ageGateRequiresProof && "blur-md saturate-0",
              )}
              src={content.src}
              style={content.aspectRatio ? { aspectRatio: content.aspectRatio } : undefined}
            />
            {ageGateRequiresProof && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <FilledLockIcon className="size-6 text-white" weight="fill" />
              </div>
            )}
          </div>
          {ageGateRequiresProof && (
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className={cn("flex items-center gap-1.5 text-muted-foreground", postCardType.label)}>
                <FilledLockIcon className="size-3.5" weight="fill" />
                Prove you're 18+ to view
              </span>
              <Button
                size="sm"
                className="h-8 px-4 font-medium"
                onClick={content.onVerifyAge}
                disabled={!content.onVerifyAge}
              >
                Verify Age
              </Button>
            </div>
          )}
          {!ageGateRequiresProof && content.caption && (
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
    }
    case "video":
      return (
        <React.Suspense fallback={<VideoPostContentFallback className={className} />}>
          <LazyVideoPostContent content={content} className={className} />
        </React.Suspense>
      );
    case "link":
      return (
        <div className={cn("w-full space-y-2 text-start", className)}>
          {content.body ? (
            <FormattedText
              className={cn(postCardType.body, "max-w-[72ch] text-foreground")}
              dir={content.bodyDir ?? "auto"}
              lang={content.bodyLang}
              value={content.body}
            />
          ) : null}
          <LinkPreviewCard content={content} />
        </div>
      );
    case "embed":
      return (
        <div className={cn("w-full space-y-2 text-start", className)}>
          {content.body ? (
            <FormattedText
              className={cn(postCardType.body, "max-w-[72ch] text-foreground")}
              dir={content.bodyDir ?? "auto"}
              lang={content.bodyLang}
              value={content.body}
            />
          ) : null}
          {content.renderMode === "official"
            ? <OfficialOEmbed content={content} />
            : <PostEmbedPreview content={content} />}
        </div>
      );
    case "song":
      return (
        <React.Suspense fallback={<SongPostContentFallback className={className} />}>
          <LazySongPostContent content={content} className={className} />
        </React.Suspense>
      );
  }
}
