"use client";

import * as React from "react";
import { ArrowSquareOut, Copy, Globe, Lock, ShoppingCart, Trash } from "@phosphor-icons/react";

import { navigate } from "@/app/router";
import { Button } from "@/components/primitives/button";
import { FormattedText } from "@/components/primitives/formatted-text";
import { toast } from "@/components/primitives/sonner";
import { Type } from "@/components/primitives/type";
import { useUiLocale } from "@/lib/ui-locale";
import { cn } from "@/lib/utils";
import { PostCardEventBlock } from "./post-card-event-block";
import { PostCardHeader } from "./post-card-header";
import { PostCardMedia } from "./post-card-media";
import { PostCardEngagementBar } from "./post-card-engagement-bar";
import { postCardReadableWidth, postCardTextWrap, postCardType } from "./post-card.styles";
import type { DownloadPolicy, PostCardMenuItem, PostCardProps, StemAccessPolicy, StemKind, StemSpec } from "./post-card.types";

type SongContent = Extract<PostCardProps["content"], { type: "song" }>;

export interface DerivedSongMenuAction {
  item: PostCardMenuItem;
  onAction: () => void;
}

function menuItemGroup(item: PostCardMenuItem): "general" | "external" | "download" | "destructive" {
  if (item.destructive) return "destructive";
  if (item.key === "view-story" || item.key === "song-annotations:genius" || item.key.startsWith("song-ipfs:")) return "external";
  if (item.key.startsWith("song-download:")) return "download";
  return "general";
}

function withPostCardMenuDefaults(item: PostCardMenuItem): PostCardMenuItem {
  if (item.key === "view-story" && !item.icon) {
    return { ...item, icon: <ArrowSquareOut className="size-4" /> };
  }
  if (item.key === "delete" && !item.icon) {
    return { ...item, icon: <Trash className="size-4" /> };
  }
  return item;
}

function appendMenuGroup(output: PostCardMenuItem[], items: PostCardMenuItem[]) {
  if (items.length === 0) return;
  items.forEach((item, index) => {
    output.push({
      ...item,
      separatorBefore: index === 0 ? output.length > 0 : item.separatorBefore,
    });
  });
}

async function copyTextToClipboard(value: string, successMessage: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard) return;
  await navigator.clipboard.writeText(value);
  toast.success(successMessage);
}

type SongCommerce =
  | { kind: "buy"; priceLabel?: string; onSelect: () => void }
  | { kind: "unlock"; onSelect: () => void };

function getEffectiveDownloadPolicy(content: SongContent): DownloadPolicy {
  if (content.downloadPolicy) return content.downloadPolicy;

  if (content.accessMode === "public") {
    return "stream_only";
  }

  if (content.listingMode === "listed" && content.listingStatus === "active") {
    return "purchased_download";
  }

  return "stream_only";
}

function stemKindLabel(kind: StemKind): string {
  switch (kind) {
    case "instrumental":
      return "Instrumental";
    case "vocals":
      return "Vocals";
    case "drums":
      return "Drums";
    case "bass":
      return "Bass";
    case "other":
      return "Stem";
    default:
      return "Stem";
  }
}

function stemLabel(stem: StemSpec): string {
  return stem.label ?? stemKindLabel(stem.kind);
}

function resolveStemAccessPolicy(stem: StemSpec, songPolicy: DownloadPolicy): StemAccessPolicy {
  if (stem.accessPolicy !== "inherit") {
    return stem.accessPolicy;
  }

  if (songPolicy === "free_download") {
    return "free";
  }

  if (songPolicy === "purchased_download") {
    return "purchasers_only";
  }

  return "unavailable";
}

function canDownloadStem(
  stem: StemSpec,
  content: SongContent,
  songPolicy: DownloadPolicy,
): boolean {
  if (!stem.onDownload) return false;

  const resolvedPolicy = resolveStemAccessPolicy(stem, songPolicy);
  if (resolvedPolicy === "unavailable") return false;
  if (resolvedPolicy === "free") return true;

  return stem.accessPolicy === "inherit" && songPolicy === "purchased_download"
    ? content.hasEntitlement === true || content.entitledStems?.includes(stem.kind) === true
    : content.entitledStems?.includes(stem.kind) === true;
}

export function openExternalUrl(url: string) {
  if (typeof window === "undefined") return;

  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (opened) {
    opened.opener = null;
  }
}

function deriveSongCommerce(content: PostCardProps["content"]): SongCommerce | undefined {
  if (content.type !== "song") return undefined;
  // Song acquisition actions are rendered as offer rows inside the song card.
  return undefined;
}

function FooterCommerce({ commerce }: { commerce: SongCommerce }) {
  switch (commerce.kind) {
    case "buy":
      return (
        <Button
          className="h-11 w-full px-5 text-base sm:w-auto"
          data-post-card-interactive="true"
          leadingIcon={<ShoppingCart className="size-5" />}
          onClick={commerce.onSelect}
        >
          {commerce.priceLabel ? `Buy track · ${commerce.priceLabel}` : "Buy track"}
        </Button>
      );
    case "unlock":
      return (
        <Button
          className="h-11 w-full px-5 text-base sm:w-auto"
          data-post-card-interactive="true"
          leadingIcon={<Lock className="size-5" />}
          onClick={commerce.onSelect}
        >
          Unlock
        </Button>
      );
  }
}

export function mergePostCardMenuItems(
  menuItems: PostCardMenuItem[] | undefined,
  derivedActions: DerivedSongMenuAction[],
): PostCardMenuItem[] {
  const derivedMenuItems = derivedActions.map((action) => action.item);
  const groupedItems = {
    general: [] as PostCardMenuItem[],
    external: [] as PostCardMenuItem[],
    download: [] as PostCardMenuItem[],
    destructive: [] as PostCardMenuItem[],
  };

  for (const item of [...(menuItems ?? []), ...derivedMenuItems].map(withPostCardMenuDefaults)) {
    groupedItems[menuItemGroup(item)].push(item);
  }

  const orderedItems: PostCardMenuItem[] = [];
  appendMenuGroup(orderedItems, groupedItems.general);
  appendMenuGroup(orderedItems, groupedItems.external);
  appendMenuGroup(orderedItems, groupedItems.download);
  appendMenuGroup(orderedItems, groupedItems.destructive);

  return orderedItems;
}

export function deriveSongHeaderMenuActions(content: PostCardProps["content"]): DerivedSongMenuAction[] {
  if (content.type !== "song") return [];

  const actions: DerivedSongMenuAction[] = [];
  if (content.annotationsUrl) {
    const url = content.annotationsUrl;
    actions.push({
      item: {
        key: "song-annotations:genius",
        label: "View on Genius",
        icon: <ArrowSquareOut className="size-4" />,
      },
      onAction: () => openExternalUrl(url),
    });
  }

  const proofs = content.storageProofs;
  if (proofs?.original && (content.accessMode === "public" || content.hasEntitlement)) {
    const { cid, gatewayUrl } = proofs.original;
    actions.push({
      item: {
        key: "song-ipfs:view:original",
        label: "View on IPFS",
        icon: <Globe className="size-4" />,
      },
      onAction: () => openExternalUrl(gatewayUrl),
    });
    actions.push({
      item: {
        key: "song-ipfs:copy:original",
        label: "Copy IPFS CID",
        icon: <Copy className="size-4" />,
      },
      onAction: () => void copyTextToClipboard(cid, "IPFS CID copied."),
    });
  }

  if (proofs?.preview && content.accessMode === "locked" && !content.hasEntitlement) {
    const { gatewayUrl } = proofs.preview;
    actions.push({
      item: {
        key: "song-ipfs:view:preview",
        label: "View on IPFS",
        icon: <Globe className="size-4" />,
      },
      onAction: () => openExternalUrl(gatewayUrl),
    });
  }

  if (proofs?.encryptedOriginal) {
    const { cid, gatewayUrl } = proofs.encryptedOriginal;
    actions.push({
      item: {
        key: "song-ipfs:view:encrypted-original",
        label: "View encrypted file on IPFS",
        icon: <Globe className="size-4" />,
      },
      onAction: () => openExternalUrl(gatewayUrl),
    });
    actions.push({
      item: {
        key: "song-ipfs:copy:encrypted-original",
        label: "Copy encrypted CID",
        icon: <Copy className="size-4" />,
      },
      onAction: () => void copyTextToClipboard(cid, "Encrypted IPFS CID copied."),
    });
  }

  return actions;
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
      className={cn(postCardType.caption, postCardReadableWidth, "text-muted-foreground -mt-1 mb-1 self-start text-start")}
      dir={content.captionDir ?? "auto"}
      lang={content.captionLang}
      value={content.caption}
    />
  );
}

function deriveVideoUnlock(
  content: PostCardProps["content"],
): PostCardProps["engagement"]["unlock"] {
  if (content.type !== "video") return undefined;

  const { accessMode, listingMode, listingStatus, hasEntitlement, priceLabel, regionalPriceLabel, onBuy, onUnlock } = content;

  if (accessMode !== "locked" || hasEntitlement) return undefined;

  const isListed = listingMode === "listed" && listingStatus === "active";
  const effectivePrice = regionalPriceLabel ?? priceLabel;

  if (isListed && effectivePrice && onBuy) {
    return { label: effectivePrice, onBuy };
  }

  if (onUnlock) {
    return { label: "Unlock", onBuy: onUnlock };
  }

  return undefined;
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
    onToggleOriginal
    && showOriginalLabel
    && showTranslationLabel,
  );

  const titleElement = title ? (
    effectiveTitleHref ? (
      <a
        className={cn(
          postCardType.title,
          postCardTextWrap,
          postCardReadableWidth,
          "self-start text-start font-semibold text-foreground hover:underline",
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
          postCardTextWrap,
          postCardReadableWidth,
          "self-start text-start font-semibold text-foreground",
        )}
        dir={titleDir ?? "auto"}
        lang={titleLang}
      >
        {title}
      </h3>
    )
  ) : null;

  const videoUnlock = deriveVideoUnlock(content);
  const unlock = content.type === "song" ? undefined : engagement.unlock ?? videoUnlock;
  const songCommerce = deriveSongCommerce(content);
  const songHeaderMenuActions = deriveSongHeaderMenuActions(content);
  const effectiveMenuItems = mergePostCardMenuItems(menuItems, songHeaderMenuActions);
  const handleMenuAction = (key: string) => {
    const derivedAction = songHeaderMenuActions.find((action) => action.item.key === key);
    if (derivedAction) {
      derivedAction.onAction();
      return;
    }

    onMenuAction?.(key);
  };
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
          menuItems={effectiveMenuItems}
          onMenuAction={handleMenuAction}
          qualifierLabels={qualifierLabels}
          saved={engagement.saved}
          viewContext={viewContext}
        />

        {titleElement}
        {event ? <PostCardEventBlock event={event} showEventUrl={shouldShowEventUrl} /> : null}
        <SongCaptionBeforeMedia content={content} />
        <PostCardMedia
          content={content}
          hasPostTitle={Boolean(title)}
          postHref={postHref}
          viewContext={viewContext}
        />
        {canToggleOriginal ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-start">
            <Type as="span" variant="caption" className="text-muted-foreground">
              {isViewingOriginal ? "Original text" : sourceLanguageLabel ? `Translated from ${sourceLanguageLabel}` : "Translated"}
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

        {songCommerce ? (
          <div className="flex flex-col gap-2 pt-0.5 sm:flex-row sm:items-center sm:gap-1.5">
            <PostCardEngagementBar
              compact
              className="pt-0"
              engagement={engagement}
              shareActions={shareActions}
              onVote={onVote}
              onComment={onComment}
              onShare={onShare}
            />
            <div className="hidden flex-1 sm:block" />
            <FooterCommerce commerce={songCommerce} />
          </div>
        ) : (
          <PostCardEngagementBar
            engagement={engagement}
            unlock={unlock ? { label: unlock.label, onClick: unlock.onBuy } : undefined}
            shareActions={shareActions}
            onVote={onVote}
            onComment={onComment}
            onShare={onShare}
          />
        )}
      </div>
    </article>
  );
}
