import * as React from "react";

import { cn } from "@/lib/utils";
import { PostCardHeader } from "./post-card-header";
import { PostCardMedia } from "./post-card-media";
import { PostCardEngagementBar } from "./post-card-engagement-bar";
import { postCardType } from "./post-card.styles";
import type { PostCardProps, SongContentSpec, VideoContentSpec } from "./post-card.types";

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
  byline,
  title,
  titleHref,
  postHref,
  content,
  engagement,
  menuItems,
  onVote,
  onComment,
  onSave,
  onShare,
  onMenuAction,
  className,
}: PostCardProps) {
  const wrapBodyWithPostLink = Boolean(postHref) && content.type !== "link";

  const titleElement = title ? (
    titleHref ? (
      <a
        className={cn(postCardType.title, "font-semibold text-foreground hover:underline")}
        href={titleHref}
      >
        {title}
      </a>
    ) : (
      <h3 className={cn(postCardType.title, "font-semibold text-foreground")}>
        {title}
      </h3>
    )
  ) : null;

  const unlockFromContent = deriveUnlockFromContent(content);
  const unlock = engagement.unlock ?? unlockFromContent;

  return (
    <article
      className={cn(
        "flex w-full flex-col gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-muted/30",
        className,
      )}
    >
      <PostCardHeader
        byline={byline}
        menuItems={menuItems}
        onMenuAction={(key) => {
          if (key === "save") onSave?.();
          else onMenuAction?.(key);
        }}
        saved={engagement.saved}
        viewContext={viewContext}
      />

      {wrapBodyWithPostLink ? (
        <a className="flex flex-col gap-3" href={postHref}>
          {titleElement}
          <PostCardMedia content={content} />
        </a>
      ) : (
        <>
          {titleElement}
          <PostCardMedia content={content} />
        </>
      )}

      <PostCardEngagementBar
        engagement={engagement}
        unlock={unlock ? { label: unlock.label, onClick: unlock.onBuy } : undefined}
        onVote={onVote}
        onComment={onComment}
        onShare={onShare}
      />
    </article>
  );
}
