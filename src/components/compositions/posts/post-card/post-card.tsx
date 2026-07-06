"use client";

import * as React from "react";
import { ArrowSquareOut, DownloadSimple, Lock, ShoppingCart } from "@phosphor-icons/react";

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
import { postCardCaptionTextColor, postCardReadableWidth, postCardTextWrap, postCardType } from "./post-card.styles";
import type { DownloadPolicy, PostCardMenuItem, PostCardProps, StemAccessPolicy, StemKind, StemSpec } from "./post-card.types";

type SongContent = Extract<PostCardProps["content"], { type: "song" }>;

export interface DerivedSongMenuAction {
  category: "metadata" | "download";
  item: PostCardMenuItem;
  onAction: () => void;
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
      return "instrumental";
    case "vocals":
      return "vocals";
    case "drums":
      return "drums";
    case "bass":
      return "bass";
    case "other":
      return "stem";
    default:
      return "stem";
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
  const metadataItems = derivedActions
    .filter((action) => action.category === "metadata")
    .map((action) => action.item);
  const downloadActions = derivedActions.filter((action) => action.category === "download");
  const firstDownloadNeedsSeparator = downloadActions.length > 0
    && (Boolean(menuItems?.length) || metadataItems.length > 0);
  const downloadItems = downloadActions.map((action, index) => ({
    ...action.item,
    icon: action.item.icon ?? <DownloadSimple className="size-4" />,
    separatorBefore: action.item.separatorBefore || (index === 0 && firstDownloadNeedsSeparator),
  }));

  return [
    ...(menuItems ?? []),
    ...metadataItems,
    ...downloadItems,
  ];
}

export function deriveSongHeaderMenuActions(content: PostCardProps["content"]): DerivedSongMenuAction[] {
  if (content.type !== "song") return [];

  const actions: DerivedSongMenuAction[] = [];
  if (content.annotationsUrl) {
    const url = content.annotationsUrl;
    actions.push({
      category: "metadata",
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
    const { gatewayUrl } = proofs.original;
    actions.push({
      category: "metadata",
      item: {
        key: "song-ipfs:view:original",
        label: "View on IPFS",
        icon: <ArrowSquareOut className="size-4" />,
      },
      onAction: () => openExternalUrl(gatewayUrl),
    });
  }

  if (proofs?.preview && content.accessMode === "locked" && !content.hasEntitlement) {
    const { gatewayUrl } = proofs.preview;
    actions.push({
      category: "metadata",
      item: {
        key: "song-ipfs:view:preview",
        label: "View on IPFS",
        icon: <ArrowSquareOut className="size-4" />,
      },
      onAction: () => openExternalUrl(gatewayUrl),
    });
  }

  if (proofs?.encryptedOriginal) {
    const { gatewayUrl } = proofs.encryptedOriginal;
    actions.push({
      category: "metadata",
      item: {
        key: "song-ipfs:view:encrypted-original",
        label: "View encrypted file on IPFS",
        icon: <ArrowSquareOut className="size-4" />,
      },
      onAction: () => openExternalUrl(gatewayUrl),
    });
  }

  const songPolicy = getEffectiveDownloadPolicy(content);
  const canDownloadOriginal = Boolean(
    content.onDownload
    && (
      songPolicy === "free_download"
      || (songPolicy === "purchased_download" && content.hasEntitlement === true)
    ),
  );

  if (canDownloadOriginal && content.onDownload) {
    actions.push({
      category: "download",
      item: {
        key: "song-download:original",
        label: "Download original",
      },
      onAction: content.onDownload,
    });
  }

  for (const [index, stem] of (content.stems ?? []).entries()) {
    if (!canDownloadStem(stem, content, songPolicy) || !stem.onDownload) continue;

    actions.push({
      category: "download",
      item: {
        key: `song-download:stem:${stem.kind}:${index}`,
        label: `Download ${stemLabel(stem)}`,
      },
      onAction: stem.onDownload,
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
      className={cn(postCardType.caption, postCardReadableWidth, postCardCaptionTextColor, "-mt-1 mb-1 self-start text-start")}
      dir={content.captionDir ?? "auto"}
      lang={content.captionLang}
      value={content.caption}
    />
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
  qualifierLabels,
  statusNotice,
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

  const unlock = content.type === "song" || content.type === "video" ? undefined : engagement.unlock;
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
        {statusNotice ? (
          <div
            className={cn(
              "rounded-md border px-3 py-2 text-start",
              statusNotice.tone === "destructive"
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "border-border/70 bg-muted/35 text-muted-foreground",
            )}
          >
            <Type as="p" variant="label" className="text-current">
              {statusNotice.label}
            </Type>
            {statusNotice.message ? (
              <Type as="p" variant="caption" className="mt-0.5 text-current/80">
                {statusNotice.message}
              </Type>
            ) : null}
            {statusNotice.action ? (
              <Button
                className="mt-2 h-8 px-3"
                data-post-card-interactive="true"
                onClick={statusNotice.action.onClick}
                size="sm"
                variant={statusNotice.tone === "destructive" ? "outline" : "secondary"}
              >
                {statusNotice.action.label}
              </Button>
            ) : null}
          </div>
        ) : null}

        {titleElement}
        {event ? <PostCardEventBlock event={event} showEventUrl={shouldShowEventUrl} /> : null}
        <SongCaptionBeforeMedia content={content} />
        <PostCardMedia content={content} postHref={postHref} viewContext={viewContext} />
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
