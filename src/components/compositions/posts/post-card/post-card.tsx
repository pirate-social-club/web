"use client";

import * as React from "react";

import { navigate } from "@/app/router";
import { Button } from "@/components/primitives/button";
import { FormattedText } from "@/components/primitives/formatted-text";
import { Type } from "@/components/primitives/type";
import { useUiLocale } from "@/lib/ui-locale";
import { cn } from "@/lib/utils";
import { PostCardEventBlock } from "./post-card-event-block";
import { PostCardHeader } from "./post-card-header";
import { PostCardMedia } from "./post-card-media";
import { PostCardEngagementBar } from "./post-card-engagement-bar";
import { postCardType } from "./post-card.styles";
import type { PostCardProps } from "./post-card.types";

function deriveUnlockFromContent(
  content: PostCardProps["content"],
): PostCardProps["engagement"]["unlock"] {
  if (content.type === "song" || content.type === "video") {
    const {
      accessMode,
      listingMode,
      listingStatus,
      hasEntitlement,
      priceLabel,
      regionalPriceLabel,
      onBuy,
      onUnlock,
    } = content;

    if (accessMode !== "locked" || hasEntitlement) return undefined;

    const isListed = listingMode === "listed" && listingStatus === "active";
    const effectivePrice = regionalPriceLabel ?? priceLabel;

    if (isListed && effectivePrice && onBuy) {
      return { label: effectivePrice, onBuy };
    }

    if (onUnlock) {
      return { label: "Unlock", onBuy: onUnlock };
    }
  }

  return undefined;
}

function formatSourceLanguage(sourceLanguage: string | null | undefined, locale: string): string | null {
  const normalized = String(sourceLanguage ?? "").trim();
  if (!normalized) return null;

  try {
    const displayNames = Reflect.construct(Intl.DisplayNames, [[locale], { type: "language" }]) as Intl.DisplayNames;
    return displayNames.of(normalized) ?? normalized;
  } catch {
    return normalized;
  }
}

function shouldHandleCardNavigation(event: React.MouseEvent<HTMLElement>): boolean {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) {
    return false;
  }

  const target = event.target instanceof Element ? event.target : null;
  return !target?.closest(
    "a,button,input,select,textarea,summary,[role='button'],[role='menu'],[role='menuitem'],[data-post-card-interactive='true']",
  );
}

function shouldHandleCardKeyboardNavigation(event: React.KeyboardEvent<HTMLElement>): boolean {
  if (event.defaultPrevented || event.key !== "Enter") {
    return false;
  }

  const target = event.target instanceof Element ? event.target : null;
  return !target?.closest(
    "a,button,input,select,textarea,summary,[role='button'],[role='menu'],[role='menuitem'],[data-post-card-interactive='true']",
  );
}

function SongCaptionBeforeMedia({ content }: { content: PostCardProps["content"] }) {
  if (content.type !== "song" || !content.caption) return null;

  return (
    <FormattedText
      className={cn(postCardType.caption, "-mt-1 mb-1 max-w-[72ch] self-start text-start text-muted-foreground")}
      dir={content.captionDir ?? "auto"}
      lang={content.captionLang}
      value={content.caption}
    />
  );
}

function getReadableTagTextColor(backgroundColor?: string | null): string {
  const normalized = backgroundColor?.trim().replace(/^#/u, "");
  if (!normalized || !/^[\da-f]{6}$/iu.test(normalized)) return "var(--foreground)";

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.58 ? "#111827" : "#ffffff";
}

function PostLabelPill({ postLabel }: { postLabel?: PostCardProps["postLabel"] }) {
  if (!postLabel?.label) return null;

  const backgroundColor = postLabel.colorToken?.trim() || "var(--muted)";
  const color = postLabel.colorToken ? getReadableTagTextColor(postLabel.colorToken) : "var(--muted-foreground)";

  return (
    <div className="flex max-w-[72ch] self-start">
      <span
        className="inline-flex max-w-full items-center rounded-full px-2.5 py-0.5 text-xs font-bold leading-tight"
        style={{ backgroundColor, color }}
      >
        <bdi className="truncate">{postLabel.label}</bdi>
      </span>
    </div>
  );
}

function normalizeUrlForComparison(url: string | undefined): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString().replace(/\/$/u, "");
  } catch {
    return url.trim().replace(/\/$/u, "") || null;
  }
}

export function PostCard({
  viewContext = "home",
  identityPresentation,
  authorCommunityRole,
  authorNationalityBadgeCountry,
  authorNationalityBadgeLabel,
  byline,
  postLabel,
  qualifierLabels,
  title,
  titleDir,
  titleLang,
  titleHref,
  postHref,
  content,
  event,
  sourceLanguage,
  isViewingOriginal = false,
  showOriginalLabel,
  showTranslationLabel,
  engagement,
  menuItems,
  shareActions,
  onVote,
  onComment,
  onShare,
  onToggleOriginal,
  onMenuAction,
  className,
}: PostCardProps) {
  const { locale } = useUiLocale();
  const effectiveTitleHref = titleHref ?? postHref;
  const sourceLanguageLabel = formatSourceLanguage(sourceLanguage, locale);
  const canToggleOriginal = Boolean(
    sourceLanguageLabel
    && onToggleOriginal
    && showOriginalLabel
    && showTranslationLabel,
  );

  const titleElement = title ? (
    effectiveTitleHref ? (
      <a
        className={cn(
          postCardType.title,
          "max-w-[72ch] self-start text-start font-semibold text-foreground hover:underline",
        )}
        dir={titleDir ?? "auto"}
        href={effectiveTitleHref}
        lang={titleLang}
      >
        {title}
      </a>
    ) : (
      <h3
        className={cn(
          postCardType.title,
          "max-w-[72ch] self-start text-start font-semibold text-foreground",
        )}
        dir={titleDir ?? "auto"}
        lang={titleLang}
      >
        {title}
      </h3>
    )
  ) : null;

  const unlockFromContent = deriveUnlockFromContent(content);
  const unlock = engagement.unlock ?? unlockFromContent;
  const isClickable = Boolean(postHref);
  const shouldShowEventUrl = event
    ? normalizeUrlForComparison(event.eventUrl) !== normalizeUrlForComparison(content.type === "link" ? content.href : undefined)
    : true;

  return (
    <article
      className={cn(
        "relative w-full border-b border-border transition-colors",
        isClickable && "cursor-pointer hover:bg-muted/20 focus-visible:bg-muted/20",
        className,
      )}
      onClick={postHref ? (event) => {
        if (shouldHandleCardNavigation(event)) {
          navigate(postHref);
        }
      } : undefined}
      onKeyDown={postHref ? (event) => {
        if (shouldHandleCardKeyboardNavigation(event)) {
          event.preventDefault();
          navigate(postHref);
        }
      } : undefined}
      role={postHref ? "link" : undefined}
      style={{
        containIntrinsicSize: "560px",
        contentVisibility: "auto",
      }}
      tabIndex={postHref ? 0 : undefined}
    >
      <div
        className={cn(
          "relative z-10 flex w-full flex-col gap-2.5 px-4 py-2.5",
        )}
      >
        <PostCardHeader
          authorCommunityRole={authorCommunityRole}
          authorNationalityBadgeCountry={authorNationalityBadgeCountry}
          authorNationalityBadgeLabel={authorNationalityBadgeLabel}
          byline={byline}
          identityPresentation={identityPresentation}
          menuItems={menuItems}
          onMenuAction={onMenuAction}
          qualifierLabels={qualifierLabels}
          saved={engagement.saved}
          viewContext={viewContext}
        />

        {titleElement}
        <PostLabelPill postLabel={postLabel} />
        {event ? <PostCardEventBlock event={event} showEventUrl={shouldShowEventUrl} /> : null}
        <SongCaptionBeforeMedia content={content} />
        <PostCardMedia content={content} viewContext={viewContext} />
        {canToggleOriginal ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-start">
            <Type as="span" variant="caption" className="text-muted-foreground">
              {isViewingOriginal ? "Original text" : `Translated from ${sourceLanguageLabel}`}
            </Type>
            <Button
              className="h-auto px-2 py-1"
              onClick={onToggleOriginal}
              size="sm"
              variant="ghost"
            >
              {isViewingOriginal ? showTranslationLabel : showOriginalLabel}
            </Button>
          </div>
        ) : null}

        <PostCardEngagementBar
          engagement={engagement}
          unlock={unlock ? { label: unlock.label, onClick: unlock.onBuy } : undefined}
          shareActions={shareActions}
          onVote={onVote}
          onComment={onComment}
          onShare={onShare}
        />
      </div>
    </article>
  );
}
