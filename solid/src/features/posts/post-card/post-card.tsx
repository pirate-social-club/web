// PostCard composition, ported from the React post-card.tsx. Differences:
// - `navigate("@/app/router")` became the `onNavigate` prop so stories and
//   tests stay router-free.
// - The `useVideoExperience` fallback became the plain `onOpenVideoViewer`
//   prop (the shell wires the global viewer at the call site).
// - `deriveSongCommerce`/`FooterCommerce` from the React source were dropped:
//   `deriveSongCommerce` always returned undefined (song commerce renders as
//   offer rows inside the song card), so the footer branch was unreachable.
// - Click/keyboard guards and pointer-drag suppression live in navigation.ts;
//   song menu derivation lives in menu.ts; title policy in content-rules.ts.

import { Show } from "solid-js";

import { Button, FormattedText, Type } from "../../../design-system";
import { cn } from "../../../lib/cn";
import { useUiLocale } from "../../../lib/ui-locale";
import { buildPostCardTitleProps } from "./content-rules";
import { PostCardEngagementBar } from "./engagement-bar";
import { PostCardEventBlock } from "./event-block";
import { PostCardHeader } from "./header";
import { PostCardMedia } from "./media";
import {
  deriveSongHeaderMenuActions,
  mergePostCardMenuItems,
  runDerivedMenuAction,
} from "./menu";
import {
  createCardPointerTracker,
  formatSourceLanguage,
  normalizeUrlForComparison,
  shouldHandleCardClick,
  shouldHandleCardKeydown,
} from "./navigation";
import {
  postCardCaptionTextColor,
  postCardReadableWidth,
  postCardTextWrap,
  postCardType,
} from "./styles";
import type { PostCardProps } from "./types";

function SongCaptionBeforeMedia(props: { content: PostCardProps["content"] }) {
  return (
    <Show when={props.content.type === "song" && props.content.caption ? props.content : null}>
      {(content) => (
        <FormattedText
          class={cn(postCardType.caption, postCardReadableWidth, postCardCaptionTextColor, "-mt-1 mb-1 self-start text-start")}
          dir={(content() as Extract<PostCardProps["content"], { type: "song" }>).captionDir ?? "auto"}
          lang={(content() as Extract<PostCardProps["content"], { type: "song" }>).captionLang}
          value={(content() as Extract<PostCardProps["content"], { type: "song" }>).caption ?? ""}
        />
      )}
    </Show>
  );
}

export function PostCard(props: PostCardProps) {
  const { locale } = useUiLocale();
  const viewContext = () => props.viewContext ?? "home";
  const previewMode = () => props.previewMode ?? false;

  const effectiveTitleHref = () => props.titleHref ?? props.postHref;
  const sourceLanguageLabel = () => formatSourceLanguage(props.sourceLanguage, locale());
  const canToggleOriginal = () => Boolean(
    sourceLanguageLabel()
    && props.onToggleOriginal
    && props.showOriginalLabel
    && props.showTranslationLabel,
  );

  const titleProps = () => buildPostCardTitleProps({
    content: props.content,
    title: props.title,
    titleDir: props.titleDir,
    titleHref: effectiveTitleHref(),
    titleLang: props.titleLang,
  });

  const unlock = () => props.content.type === "song" || props.content.type === "video" ? undefined : props.engagement.unlock;
  const songHeaderMenuActions = () => deriveSongHeaderMenuActions(props.content);
  const effectiveMenuItems = () => previewMode()
    ? []
    : mergePostCardMenuItems(props.menuItems, songHeaderMenuActions());
  const handleMenuAction = (key: string) => {
    if (runDerivedMenuAction(key, songHeaderMenuActions())) return;
    props.onMenuAction?.(key);
  };

  const pointerTracker = createCardPointerTracker();
  const shouldShowEventUrl = () => props.event
    ? normalizeUrlForComparison(props.event.eventUrl) !== normalizeUrlForComparison(props.content.type === "link" ? props.content.href : undefined)
    : true;

  const handleNavigate = () => {
    const href = props.postHref;
    if (!href) return;
    props.onNavigate?.(href);
  };

  return (
    <article
      class={cn(
        "relative w-full border-b border-border transition-colors",
        props.postHref && "cursor-pointer hover:bg-muted/20 focus-visible:bg-muted/20",
        props.class,
      )}
      onPointerDown={props.postHref ? (event) => {
        pointerTracker.onPointerDown({
          isPrimary: event.isPrimary,
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
        });
      } : undefined}
      onPointerCancel={props.postHref ? (event) => {
        pointerTracker.onPointerCancel({ pointerId: event.pointerId });
      } : undefined}
      onClick={props.postHref ? (event) => {
        if (pointerTracker.shouldSuppressClick({ x: event.clientX, y: event.clientY })) {
          return;
        }
        if (shouldHandleCardClick(event)) {
          handleNavigate();
        }
      } : undefined}
      onKeyDown={props.postHref ? (event) => {
        if (shouldHandleCardKeydown(event)) {
          event.preventDefault();
          handleNavigate();
        }
      } : undefined}
      role={props.postHref ? "link" : undefined}
      style={previewMode() ? undefined : {
        "contain-intrinsic-size": "560px",
        "content-visibility": "auto",
      }}
      tabindex={props.postHref ? 0 : undefined}
    >
      <div class="relative z-10 flex w-full flex-col gap-2.5 px-4 py-2.5">
        <PostCardHeader
          authorCommunityRole={props.authorCommunityRole}
          authorNationalityBadgeCountry={props.authorNationalityBadgeCountry}
          authorNationalityBadgeLabel={props.authorNationalityBadgeLabel}
          byline={props.byline}
          identityPresentation={props.identityPresentation}
          menuItems={effectiveMenuItems()}
          onMenuAction={handleMenuAction}
          qualifierLabels={props.qualifierLabels}
          saved={props.engagement.saved}
          viewContext={viewContext()}
        />
        <Show when={props.statusNotice}>
          {(notice) => (
            <div
              class={cn(
                "rounded-md border px-3 py-2 text-start",
                notice().tone === "destructive"
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : "border-border/70 bg-muted/35 text-muted-foreground",
              )}
              data-status-notice-tone={notice().tone}
              data-testid="post-status-notice"
            >
              <Type as="p" variant="label" class="text-current">
                {notice().label}
              </Type>
              <Show when={notice().message}>
                <Type as="p" variant="caption" class="mt-0.5 text-current/80">
                  {notice().message}
                </Type>
              </Show>
              <Show when={notice().action}>
                {(action) => (
                  <Button
                    class="mt-2 h-8 px-3"
                    data-post-card-interactive="true"
                    onClick={action().onClick}
                    size="sm"
                    variant={notice().tone === "destructive" ? "outline" : "secondary"}
                  >
                    {action().label}
                  </Button>
                )}
              </Show>
            </div>
          )}
        </Show>

        <Show when={titleProps().title}>
          {(title) => (
            <Show
              when={titleProps().titleHref}
              fallback={(
                <h3
                  class={cn(
                    postCardType.title,
                    postCardTextWrap,
                    postCardReadableWidth,
                    "self-start text-start font-semibold text-foreground",
                  )}
                  dir={titleProps().titleDir ?? "auto"}
                  lang={titleProps().titleLang}
                >
                  {title()}
                </h3>
              )}
            >
              {(href) => (
                <a
                  class={cn(
                    postCardType.title,
                    postCardTextWrap,
                    postCardReadableWidth,
                    "self-start text-start font-semibold text-foreground hover:underline",
                  )}
                  data-post-card-interactive="true"
                  dir={titleProps().titleDir ?? "auto"}
                  href={href()}
                  lang={titleProps().titleLang}
                >
                  {title()}
                </a>
              )}
            </Show>
          )}
        </Show>
        {/* Translation attribution sits directly below the title: it describes
            the translated text fields, not the media or actions that follow. */}
        <Show when={canToggleOriginal()}>
          <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-start">
            <Type as="span" variant="caption" class="text-muted-foreground">
              {props.isViewingOriginal ? "Original text" : `Translated from ${sourceLanguageLabel()}`}
            </Type>
            <Button
              class="h-auto px-2 py-1"
              data-post-card-interactive="true"
              onClick={props.onToggleOriginal}
              size="sm"
              variant="ghost"
            >
              {props.isViewingOriginal ? props.showTranslationLabel : props.showOriginalLabel}
            </Button>
          </div>
        </Show>
        <Show when={props.event}>
          {(event) => <PostCardEventBlock event={event()} showEventUrl={shouldShowEventUrl()} />}
        </Show>
        <SongCaptionBeforeMedia content={props.content} />
        <PostCardMedia
          content={props.content}
          onOpenVideoViewer={props.onOpenVideoViewer}
          postHref={props.postHref}
          previewMode={previewMode()}
          viewContext={viewContext()}
        />

        <Show when={!previewMode()}>
          <PostCardEngagementBar
            engagement={props.engagement}
            onComment={props.onComment}
            onShare={props.onShare}
            onVote={props.onVote}
            shareActions={props.shareActions}
            unlock={unlock() ? { label: unlock()!.label, onClick: unlock()!.onBuy } : undefined}
            voteAccess={props.voteAccess}
          />
        </Show>
      </div>
    </article>
  );
}
