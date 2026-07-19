import * as React from "react";
import { Globe, Lock as FilledLockIcon } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { FormattedText } from "@/components/primitives/formatted-text";
import { Type } from "@/components/primitives/type";
import { CrosspostSourcePreviewCard } from "../crosspost-source-preview-card";
import {
  getMediaAspectRatioStyle,
  getVideoPreviewFrameClassName,
} from "../video-preview-layout";
import { logger } from "@/lib/logger";
import { useUiLocale } from "@/lib/ui-locale";
import { cn } from "@/lib/utils";
import { getLocaleMessages } from "@/locales";
import { OfficialOEmbed, OfficialYouTubeEmbed, PostEmbedPreview } from "./post-card-embed";
import { LiveRoomPostContent } from "./post-card-live-room-content";
import { SongPostContent } from "./post-card-song-content";
import {
  postCardBodyTextColor,
  postCardCaptionTextColor,
  postCardReadableWidth,
  postCardTextWrap,
  postCardType,
} from "./post-card.styles";
import type { PostCardContent, PostCardViewContext } from "./post-card.types";

const LazyVideoPostContent = React.lazy(async () => {
  const module = await import("./post-card-video-content");
  return { default: module.VideoPostContent };
});

function VideoPostContentFallback({ aspectRatio, className }: { aspectRatio?: number; className?: string }) {
  const aspectRatioStyle = getMediaAspectRatioStyle(aspectRatio);
  return (
    <div
      aria-busy="true"
      className={cn(
        "rounded-lg bg-muted",
        getVideoPreviewFrameClassName(aspectRatio),
        !aspectRatioStyle && "aspect-video",
        className,
      )}
      style={aspectRatioStyle}
    />
  );
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
type TextContent = Extract<PostCardContent, { type: "text" }>;

const TEXT_PREVIEW_CHARACTER_LIMIT = 1_200;
const TEXT_PREVIEW_LINE_LIMIT = 18;

function shouldCollapseTextPreview(content: TextContent, viewContext: PostCardViewContext | undefined): boolean {
  if (viewContext === "post") {
    return false;
  }

  const body = content.body.trim();
  if (!body) {
    return false;
  }

  return body.length > TEXT_PREVIEW_CHARACTER_LIMIT
    || body.split("\n").length > TEXT_PREVIEW_LINE_LIMIT;
}

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
              className={cn(
                postCardType.title,
                postCardTextWrap,
                "line-clamp-3 font-semibold text-foreground",
              )}
              dir={content.previewTitleDir ?? "auto"}
              lang={content.previewTitleLang}
            >
              {content.previewTitle}
            </p>
          ) : (
            <p
              className={cn(
                postCardType.title,
                postCardTextWrap,
                "line-clamp-2 font-semibold text-primary underline decoration-primary/40 underline-offset-2",
              )}
            >
              {content.href}
            </p>
          )}
          {summaryBullets.length > 0 ? (
            <ul className="mt-2 space-y-1 ps-4 text-foreground/85">
              {summaryBullets.map((point) => (
                <li
                  className={cn(postCardType.caption, postCardTextWrap, "list-disc")}
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
  postHref?: string;
  viewContext?: PostCardViewContext;
  previewMode?: boolean;
}

function TextPostContent({
  className,
  content,
  postHref,
  previewMode,
  viewContext,
}: {
  className?: string;
  content: TextContent;
  postHref?: string;
  previewMode?: boolean;
  viewContext?: PostCardViewContext;
}) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").common;
  const [expanded, setExpanded] = React.useState(false);
  const shouldCollapse = shouldCollapseTextPreview(content, previewMode ? "home" : viewContext);
  const isCollapsed = shouldCollapse && !expanded;
  const formattedText = (
    <FormattedText
      className={cn(
        postCardType.body,
        postCardReadableWidth,
        "self-start text-start",
        postCardBodyTextColor,
        className,
      )}
      dir={content.bodyDir ?? "auto"}
      lang={content.bodyLang}
      value={content.body}
    />
  );

  if (!shouldCollapse) {
    return formattedText;
  }

  return (
    <div className={cn(postCardReadableWidth, "self-start text-start")}>
      <div className={cn(isCollapsed && "max-h-96 overflow-hidden")}>
        {formattedText}
      </div>
      {postHref ? (
        <a
          className={cn(postCardType.label, "mt-2 inline-flex font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2")}
          data-post-card-interactive="true"
          href={postHref}
        >
          {copy.readFullPost}
        </a>
      ) : (
        <button
          aria-expanded={expanded}
          className={cn(postCardType.label, "mt-2 inline-flex font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2")}
          data-post-card-interactive="true"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setExpanded((value) => !value);
          }}
          type="button"
        >
          {expanded ? copy.hideFullPost : copy.showFullPost}
        </button>
      )}
    </div>
  );
}

export function PostCardMedia({ content, className, postHref, previewMode, viewContext }: PostCardMediaProps) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").common;
  switch (content.type) {
    case "text":
      return <TextPostContent className={className} content={content} postHref={postHref} previewMode={previewMode} viewContext={viewContext} />;
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
            ) : content.src.trim() ? (
              <img
                alt={content.alt}
                className="w-full object-cover"
                src={content.src}
                style={content.aspectRatio ? { aspectRatio: content.aspectRatio } : undefined}
              />
            ) : (
              <div
                aria-label={content.alt}
                className="min-h-64 w-full bg-muted"
                role="img"
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
              className={cn("mt-1.5 text-start", postCardCaptionTextColor, postCardType.caption)}
              dir={content.captionDir ?? "auto"}
              lang={content.captionLang}
              value={content.caption}
            />
          )}
        </figure>
      );
    }
    case "video":
      return (
        <LazyPostMediaErrorBoundary
          fallback={<VideoPostContentFallback aspectRatio={content.aspectRatio} className={className} />}
          resetKey={`video:${content.src}`}
        >
          <React.Suspense fallback={<VideoPostContentFallback aspectRatio={content.aspectRatio} className={className} />}>
            <LazyVideoPostContent content={content} className={className} previewMode={previewMode} />
          </React.Suspense>
        </LazyPostMediaErrorBoundary>
      );
    case "link":
      return (
        <div className={cn("w-full space-y-2 text-start", className)}>
          {content.body ? (
            <FormattedText
              className={cn(postCardType.body, postCardReadableWidth, postCardBodyTextColor)}
              dir={content.bodyDir ?? "auto"}
              lang={content.bodyLang}
              value={content.body}
            />
          ) : null}
          <LinkPreviewCard content={content} />
        </div>
      );
    case "crosspost":
      return <CrosspostPreviewCard content={content} />;
    case "embed":
      return (
        <div className={cn("w-full space-y-2 text-start", className)}>
          {content.body ? (
            <FormattedText
              className={cn(postCardType.body, postCardReadableWidth, postCardBodyTextColor)}
              dir={content.bodyDir ?? "auto"}
              lang={content.bodyLang}
              value={content.body}
            />
          ) : null}
          {content.renderMode === "official"
            ? content.provider === "youtube"
              ? <OfficialYouTubeEmbed content={content} />
              : <OfficialOEmbed content={content} />
            : <PostEmbedPreview content={content} />}
        </div>
      );
    case "song":
      return <SongPostContent content={content} className={className} previewMode={previewMode} />;
    case "live_room":
      return <LiveRoomPostContent content={content} className={className} viewContext={viewContext} />;
  }
}
