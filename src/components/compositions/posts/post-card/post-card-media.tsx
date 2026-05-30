import * as React from "react";
import { Globe, Lock as FilledLockIcon } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { FormattedText } from "@/components/primitives/formatted-text";
import { Type } from "@/components/primitives/type";
import { CrosspostSourcePreviewCard } from "../crosspost-source-preview-card";
import { logger } from "@/lib/logger";
import { useUiLocale } from "@/lib/ui-locale";
import { cn } from "@/lib/utils";
import { getLocaleMessages } from "@/locales";
import { OfficialOEmbed, OfficialYouTubeEmbed, PostEmbedPreview } from "./post-card-embed";
import { LiveRoomPostContent } from "./post-card-live-room-content";
import { SongPostContent } from "./post-card-song-content";
import { postCardType } from "./post-card.styles";
import type { PostCardContent, PostCardViewContext } from "./post-card.types";

const FEED_TEXT_BODY_LIMIT = 600;
const FEED_LINK_BODY_LIMIT = 400;
const FEED_CAPTION_LIMIT = 300;

function truncateFeedText(text: string, limit: number): string | null {
  if (text.length <= limit) return null;
  const markTruncated = (value: string) => `${value.trimEnd()}\n\n...`;
  const paragraphBreak = text.lastIndexOf("\n\n", limit);
  if (paragraphBreak > limit * 0.3) {
    return markTruncated(text.slice(0, paragraphBreak));
  }
  const lineBreak = text.lastIndexOf("\n", limit);
  if (lineBreak > limit * 0.3) {
    return markTruncated(text.slice(0, lineBreak));
  }
  return markTruncated(text.slice(0, limit));
}

function isFeedContext(viewContext?: PostCardViewContext): boolean {
  return viewContext === "home" || viewContext === "community" || viewContext === "profile";
}

const LazyVideoPostContent = React.lazy(async () => {
  const module = await import("./post-card-video-content");
  return { default: module.VideoPostContent };
});

function VideoPostContentFallback({ className }: { className?: string }) {
  return <div className={cn("aspect-video w-full rounded-lg bg-muted", className)} aria-busy="true" />;
}

class LazyPostMediaErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode; resetKey: string },
  { hasError: boolean }
> {
  public state = { hasError: false };

  public static getDerivedStateFromError() {
    return { hasError: true };
  }

  public componentDidCatch(error: Error) {
    logger.error("[post-card-media] lazy media failed to load", { error });
  }

  public componentDidUpdate(previousProps: { resetKey: string }) {
    if (this.state.hasError && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  public render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

type LinkContent = Extract<PostCardContent, { type: "link" }>;
type CrosspostContent = Extract<PostCardContent, { type: "crosspost" }>;

function getLinkSummaryBullets(summary: LinkContent["summary"]): string[] {
  const shortSummary = summary?.shortSummary?.trim() ?? "";
  const keyPoints = summary?.keyPoints?.flatMap((point) => {
    const keyPoint = point.trim();
    return keyPoint ? [keyPoint] : [];
  }).slice(0, 3) ?? [];

  if (keyPoints.length > 0) {
    return keyPoints;
  }

  return shortSummary
    .split(/(?<=[.!?])\s+/u)
    .flatMap((point) => {
      const bullet = point.trim();
      return bullet ? [bullet] : [];
    })
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
              {summaryBullets.map((point) => (
                <li
                  className={cn(postCardType.caption, "list-disc")}
                  dir={content.summaryDir ?? "auto"}
                  key={point}
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

function CrosspostPreviewCard({ content }: { content: CrosspostContent }) {
  return <CrosspostSourcePreviewCard linkEnabled source={content.source} />;
}

export interface PostCardMediaProps {
  content: PostCardContent;
  className?: string;
  viewContext?: PostCardViewContext;
}

export function PostCardMedia({ content, className, viewContext }: PostCardMediaProps) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").common;
  switch (content.type) {
    case "text": {
      const feedTruncated = isFeedContext(viewContext) ? truncateFeedText(content.body, FEED_TEXT_BODY_LIMIT) : null;
      return (
        <FormattedText
          className={cn(
            postCardType.body,
            "max-w-[72ch] self-start text-start text-foreground",
            className,
          )}
          dir={content.bodyDir ?? "auto"}
          lang={content.bodyLang}
          value={feedTruncated ?? content.body}
        />
      );
    }
    case "image": {
      const isAgeGated = content.ageGatePolicy === "18_plus" && content.contentSafetyState === "adult";
      const ageGateRequiresProof = isAgeGated && content.ageGateViewerState !== "verified_allowed";
      return (
        <figure className={className}>
          <div className="relative overflow-hidden rounded-lg bg-muted">
            {ageGateRequiresProof ? (
              <div
                aria-label={content.alt}
                className="min-h-64 w-full bg-muted"
                role="img"
                style={content.aspectRatio ? { aspectRatio: content.aspectRatio } : undefined}
              />
            ) : (
              <img
                alt={content.alt}
                className="w-full object-cover"
                src={content.src}
                style={content.aspectRatio ? { aspectRatio: content.aspectRatio } : undefined}
              />
            )}
            {ageGateRequiresProof && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Button
                  size="lg"
                  className="gap-2 font-semibold shadow-lg"
                  onClick={content.onVerifyAge}
                  disabled={!content.onVerifyAge}
                >
                  <FilledLockIcon className="size-4" weight="fill" />
                  <Type variant="body-strong">{copy.ageGateVerify}</Type>
                </Button>
              </div>
            )}
          </div>
          {!ageGateRequiresProof && content.caption && (
            <FormattedText
              className={cn("mt-1.5 text-start text-muted-foreground", postCardType.caption)}
              dir={content.captionDir ?? "auto"}
              lang={content.captionLang}
              value={isFeedContext(viewContext) ? (truncateFeedText(content.caption, FEED_CAPTION_LIMIT) ?? content.caption) : content.caption}
            />
          )}
        </figure>
      );
    }
    case "video":
      return (
        <LazyPostMediaErrorBoundary
          fallback={<VideoPostContentFallback className={className} />}
          resetKey={`video:${content.src}`}
        >
          <React.Suspense fallback={<VideoPostContentFallback className={className} />}>
            <LazyVideoPostContent content={content} className={className} />
          </React.Suspense>
        </LazyPostMediaErrorBoundary>
      );
    case "link": {
      const linkBody = content.body
        ? isFeedContext(viewContext)
          ? truncateFeedText(content.body, FEED_LINK_BODY_LIMIT) ?? content.body
          : content.body
        : undefined;
      return (
        <div className={cn("w-full space-y-2 text-start", className)}>
          {linkBody ? (
            <FormattedText
              className={cn(postCardType.body, "max-w-[72ch] text-foreground")}
              dir={content.bodyDir ?? "auto"}
              lang={content.bodyLang}
              value={linkBody}
            />
          ) : null}
          <LinkPreviewCard content={content} />
        </div>
      );
    }
    case "crosspost":
      return <CrosspostPreviewCard content={content} />;
    case "embed": {
      const embedBody = content.body
        ? isFeedContext(viewContext)
          ? truncateFeedText(content.body, FEED_LINK_BODY_LIMIT) ?? content.body
          : content.body
        : undefined;
      return (
        <div className={cn("w-full space-y-2 text-start", className)}>
          {embedBody ? (
            <FormattedText
              className={cn(postCardType.body, "max-w-[72ch] text-foreground")}
              dir={content.bodyDir ?? "auto"}
              lang={content.bodyLang}
              value={embedBody}
            />
          ) : null}
          {content.renderMode === "official"
            ? content.provider === "youtube"
              ? <OfficialYouTubeEmbed content={content} />
              : <OfficialOEmbed content={content} />
            : <PostEmbedPreview content={content} />}
        </div>
      );
    }
    case "song":
      return <SongPostContent content={content} className={className} />;
    case "live_room":
      return <LiveRoomPostContent content={content} className={className} viewContext={viewContext} />;
  }
}
