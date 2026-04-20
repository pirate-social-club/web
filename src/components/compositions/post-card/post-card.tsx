import * as React from "react";

import { cn } from "@/lib/utils";
import { PostCardHeader } from "./post-card-header";
import { PostCardMedia } from "./post-card-media";
import { PostCardEngagementBar } from "./post-card-engagement-bar";
import { postCardType } from "./post-card.styles";
import type { PostCardProps } from "./post-card.types";

function isInteractiveTarget(target: EventTarget | null, currentTarget: HTMLElement): boolean {
  if (!(target instanceof Element)) return false;

  const interactiveElement = target.closest(
    'a, button, input, textarea, select, summary, [role="button"], [role="link"], [data-post-card-interactive="true"]',
  );

  return interactiveElement != null && currentTarget.contains(interactiveElement);
}

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
        data-post-card-interactive="true"
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

  const navigateToPost = React.useCallback(() => {
    if (!postHref || typeof window === "undefined") return;
    window.location.assign(postHref);
  }, [postHref]);

  return (
    <article
      className={cn(
        "flex w-full flex-col gap-2.5 border-b border-border px-4 py-2.5 transition-colors",
        isClickable && "cursor-pointer hover:bg-muted/20 focus-visible:bg-muted/20",
        className,
      )}
      style={{
        containIntrinsicSize: "560px",
        contentVisibility: "auto",
      }}
      onClick={(event) => {
        if (!isClickable || isInteractiveTarget(event.target, event.currentTarget)) return;
        navigateToPost();
      }}
      onKeyDown={(event) => {
        if (!isClickable || isInteractiveTarget(event.target, event.currentTarget)) return;
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        navigateToPost();
      }}
      role={isClickable ? "link" : undefined}
      tabIndex={isClickable ? 0 : undefined}
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
      <PostCardMedia content={content} />

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
