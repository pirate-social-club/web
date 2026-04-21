"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
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
      return { label: `Unlock ${effectivePrice}`, onBuy };
    }

    if (onUnlock) {
      return { label: "Unlock", onBuy: onUnlock };
    }
  }

  return undefined;
}

export function PostCard({
  viewContext = "home",
  identityPresentation,
  byline,
  qualifierLabels,
  title,
  titleDir,
  titleLang,
  titleHref,
  postHref,
  content,
  engagement,
  menuItems,
  onVote,
  onComment,
  onShare,
  onMenuAction,
  className,
}: PostCardProps) {
  const effectiveTitleHref = titleHref ?? (content.type !== "link" ? postHref : undefined);
  const shouldFoldLinkTitle = content.type === "link" && Boolean(content.previewImageSrc) && Boolean(title);
  const mediaContent = shouldFoldLinkTitle && content.type === "link"
    ? {
        ...content,
        linkTitle: title ?? undefined,
        linkTitleDir: titleDir,
        linkTitleLang: titleLang,
      }
    : content;

  const titleElement = title && !shouldFoldLinkTitle ? (
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
  const openPostLabel = title ? `Open post: ${title}` : "Open post";

  return (
    <article
      className={cn(
        "relative w-full border-b border-border transition-colors",
        isClickable && "cursor-pointer hover:bg-muted/20 focus-visible:bg-muted/20",
        className,
      )}
      style={{
        containIntrinsicSize: "560px",
        contentVisibility: "auto",
      }}
    >
      {postHref ? (
        <a
          aria-label={openPostLabel}
          className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          href={postHref}
        />
      ) : null}

      <div
        className={cn(
          "pointer-events-none relative z-10 flex w-full flex-col gap-2.5 px-4 py-2.5",
          "[&_a]:pointer-events-auto [&_button]:pointer-events-auto [&_input]:pointer-events-auto",
          "[&_select]:pointer-events-auto [&_summary]:pointer-events-auto [&_textarea]:pointer-events-auto",
        )}
      >
        <PostCardHeader
          byline={byline}
          identityPresentation={identityPresentation}
          menuItems={menuItems}
          onMenuAction={onMenuAction}
          qualifierLabels={qualifierLabels}
          saved={engagement.saved}
          viewContext={viewContext}
        />

        {titleElement}
        <PostCardMedia content={mediaContent} />

        <PostCardEngagementBar
          engagement={engagement}
          unlock={unlock ? { label: unlock.label, onClick: unlock.onBuy } : undefined}
          onVote={onVote}
          onComment={onComment}
          onShare={onShare}
        />
      </div>
    </article>
  );
}
