// PostCardMedia: the content-type switcher for the post card. Text collapse,
// link preview, image age-gate, and generic-asset rows are view-level and
// ported from the React post-card-media.tsx; song/video/live-room/embed/
// crosspost renderers live in their own modules. The React version lazy-loaded
// the video renderer behind a Suspense boundary; the Solid port imports it
// directly (the lazy boundary only mattered for bundle splitting, which the
// app build owns).

import { createSignal, Match, Show, Switch } from "solid-js";

import { Button, FormattedText, IconGlobe, IconLock, Type } from "../../../design-system";
import { cn } from "../../../lib/cn";
import { CrosspostSourcePreviewCard } from "./crosspost-preview";
import { OfficialOEmbed, OfficialYouTubeEmbed, PostEmbedPreview } from "./embed";
import { LiveRoomPostContent } from "./live-room-content";
import { SongPostContent } from "./song-content";
import {
  postCardBodyTextColor,
  postCardCaptionTextColor,
  postCardReadableWidth,
  postCardTextWrap,
  postCardType,
} from "./styles";
import type { PostCardContent, PostCardViewContext } from "./types";
import { VideoPostContent } from "./video-content";

type TextContent = Extract<PostCardContent, { type: "text" }>;
type ImageContent = Extract<PostCardContent, { type: "image" }>;
type LinkContent = Extract<PostCardContent, { type: "link" }>;
type GenericAssetContent = Extract<PostCardContent, { type: "generic_asset" }>;

export interface PostCardMediaLabels {
  readSummary?: string;
  hideSummary?: string;
  readFullPost?: string;
  showFullPost?: string;
  hideFullPost?: string;
  ageGateVerify?: string;
  openArticle?: (source: string) => string;
  downloadFile?: string;
  unlock?: string;
  unlockForPrice?: (price: string) => string;
  purchaseRequired?: string;
  deliveryPending?: string;
  lockedFileHint?: string;
}

const defaultMediaLabels: Required<PostCardMediaLabels> = {
  readSummary: "Read summary",
  hideSummary: "Hide summary",
  readFullPost: "Read full post",
  showFullPost: "Show full post",
  hideFullPost: "Hide full post",
  ageGateVerify: "Verify age",
  openArticle: (source) => `Open article: ${source}`,
  downloadFile: "Download file",
  unlock: "Unlock",
  unlockForPrice: (price) => `Unlock · ${price}`,
  purchaseRequired: "Purchase required.",
  deliveryPending: "Delivery is still being prepared.",
  lockedFileHint: "Locked downloadable file · signed delivery",
};

const TEXT_PREVIEW_CHARACTER_LIMIT = 1_200;
const TEXT_PREVIEW_LINE_LIMIT = 18;

function shouldCollapseTextPreview(content: TextContent, viewContext: PostCardViewContext | undefined): boolean {
  if (viewContext === "post") return false;
  const body = content.body.trim();
  if (!body) return false;
  return body.length > TEXT_PREVIEW_CHARACTER_LIMIT
    || body.split("\n").length > TEXT_PREVIEW_LINE_LIMIT;
}

function getLinkSummaryBullets(summary: LinkContent["summary"]): string[] {
  const shortSummary = summary?.shortSummary?.trim() ?? "";
  const keyPoints = summary?.keyPoints?.flatMap((point) => {
    const keyPoint = point.trim();
    return keyPoint ? [keyPoint] : [];
  }).slice(0, 3) ?? [];

  if (keyPoints.length > 0) return keyPoints;

  return shortSummary
    .split(/(?<=[.!?])\s+/u)
    .flatMap((point) => {
      const bullet = point.trim();
      return bullet ? [bullet] : [];
    })
    .slice(0, 3);
}

function LinkPreviewCard(props: { content: LinkContent; labels: Required<PostCardMediaLabels> }) {
  const [summaryExpanded, setSummaryExpanded] = createSignal(false);
  const sourceLabel = () => props.content.sourceLabel ?? props.content.linkLabel ?? props.content.href;
  const metaLabel = () => props.content.publishedLabel
    ? `${sourceLabel()} · ${props.content.publishedLabel}`
    : sourceLabel();
  const summaryBullets = () => getLinkSummaryBullets(props.content.summary);
  const summaryParagraph = () => props.content.summary?.summaryParagraph?.trim()
    ?? props.content.summary?.shortSummary?.trim()
    ?? "";
  const openLabel = () => props.labels.openArticle(props.content.previewTitle ?? sourceLabel());

  return (
    <div class="relative block w-full rounded-lg border border-border-soft bg-muted/20 px-4 py-3.5 text-start transition-colors hover:bg-muted/30">
      <a
        aria-label={openLabel()}
        class="absolute inset-0 z-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        data-post-card-interactive="true"
        href={props.content.href}
        rel="noopener noreferrer"
        target="_blank"
      />
      <div class={cn("pointer-events-none relative z-10 flex min-w-0 items-center gap-2 text-muted-foreground", postCardType.meta)}>
        <IconGlobe class="size-4 shrink-0" />
        <span class="truncate">{metaLabel()}</span>
      </div>

      <div
        class={cn(
          "pointer-events-none relative z-10 mt-3 grid min-w-0 gap-3",
          props.content.previewImageSrc ? "grid-cols-[minmax(0,1fr)_5.75rem] sm:grid-cols-[minmax(0,1fr)_7rem]" : "grid-cols-1",
        )}
      >
        <div class="min-w-0 self-center">
          <Show
            when={props.content.previewTitle}
            fallback={(
              <p
                class={cn(postCardType.title, postCardTextWrap, "line-clamp-2 font-semibold text-primary underline decoration-primary/40 underline-offset-2")}
              >
                {props.content.href}
              </p>
            )}
          >
            {(title) => (
              <p
                class={cn(postCardType.title, postCardTextWrap, "line-clamp-3 font-semibold text-foreground")}
                dir={props.content.previewTitleDir ?? "auto"}
                lang={props.content.previewTitleLang}
              >
                {title()}
              </p>
            )}
          </Show>
          <Show when={summaryBullets().length > 0}>
            <ul class="mt-2 space-y-1 ps-4 text-foreground/85">
              {summaryBullets().map((point) => (
                <li
                  class={cn(postCardType.caption, postCardTextWrap, "list-disc")}
                  dir={props.content.summaryDir ?? "auto"}
                  lang={props.content.summaryLang}
                >
                  {point}
                </li>
              ))}
            </ul>
          </Show>
        </div>
        <Show when={props.content.previewImageSrc}>
          {(src) => (
            <div class="aspect-square self-center overflow-hidden rounded-lg">
              <img alt="" aria-hidden="true" class="size-full object-cover" src={src()} />
            </div>
          )}
        </Show>
      </div>
      <Show when={summaryParagraph()}>
        <div class="relative z-20 mt-2">
          <Show when={summaryExpanded()}>
            <FormattedText
              class={cn(postCardType.caption, "mb-2 border-t border-border-soft pt-2 text-foreground/85")}
              dir={props.content.summaryDir ?? "auto"}
              lang={props.content.summaryLang}
              value={summaryParagraph()}
            />
          </Show>
          <button
            class={cn(postCardType.label, "font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2")}
            data-post-card-interactive="true"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setSummaryExpanded((value) => !value);
            }}
            type="button"
          >
            {summaryExpanded() ? props.labels.hideSummary : props.labels.readSummary}
          </button>
        </div>
      </Show>
    </div>
  );
}

function GenericAssetCard(props: { content: GenericAssetContent; labels: Required<PostCardMediaLabels> }) {
  const entitled = () => props.content.hasEntitlement === true || props.content.accessMode === "public";
  const pending = () => props.content.accessState === "delivery_pending";

  return (
    <div class="space-y-3 rounded-lg border border-border-soft bg-muted/20 p-4 text-start">
      <div class="flex items-start gap-3">
        <span class="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">↓</span>
        <div class="min-w-0 flex-1">
          <Type as="p" variant="body-strong" class="truncate">{props.content.filename ?? props.content.title}</Type>
          <Type as="p" variant="caption" class="text-muted-foreground">
            {props.labels.lockedFileHint}
          </Type>
        </div>
      </div>
      <Show when={pending()}>
        <Type as="p" variant="caption" class="text-muted-foreground">{props.labels.deliveryPending}</Type>
      </Show>
      <Show
        when={entitled() && !pending()}
        fallback={(
          <Show
            when={props.content.onBuy}
            fallback={(
              <Type as="p" variant="caption" class="text-muted-foreground">{props.labels.purchaseRequired}</Type>
            )}
          >
            {(onBuy) => (
              <Button class="w-full sm:w-auto" data-post-card-interactive="true" onClick={onBuy()}>
                {props.content.priceLabel ? props.labels.unlockForPrice(props.content.priceLabel) : props.labels.unlock}
              </Button>
            )}
          </Show>
        )}
      >
        <Button
          class="w-full sm:w-auto"
          data-post-card-interactive="true"
          disabled={!props.content.onDownload}
          onClick={props.content.onDownload}
          variant="default"
        >
          {props.labels.downloadFile}
        </Button>
      </Show>
    </div>
  );
}

function TextPostContent(props: {
  class?: string;
  content: TextContent;
  labels: Required<PostCardMediaLabels>;
  postHref?: string;
  previewMode?: boolean;
  viewContext?: PostCardViewContext;
}) {
  const [expanded, setExpanded] = createSignal(false);
  const shouldCollapse = () => shouldCollapseTextPreview(props.content, props.previewMode ? "home" : props.viewContext);
  const isCollapsed = () => shouldCollapse() && !expanded();
  const formattedText = () => (
    <FormattedText
      class={cn(
        postCardType.body,
        postCardReadableWidth,
        "self-start text-start",
        postCardBodyTextColor,
        props.class,
      )}
      dir={props.content.bodyDir ?? "auto"}
      lang={props.content.bodyLang}
      value={props.content.body}
    />
  );

  return (
    <Show when={shouldCollapse()} fallback={formattedText()}>
      <div class={cn(postCardReadableWidth, "self-start text-start")}>
        <div class={cn(isCollapsed() && "max-h-96 overflow-hidden")}>
          {formattedText()}
        </div>
        <Show
          when={props.postHref}
          fallback={(
            <button
              aria-expanded={expanded() ? "true" : "false"}
              class={cn(postCardType.label, "mt-2 inline-flex font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2")}
              data-post-card-interactive="true"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setExpanded((value) => !value);
              }}
              type="button"
            >
              {expanded() ? props.labels.hideFullPost : props.labels.showFullPost}
            </button>
          )}
        >
          {(href) => (
            <a
              class={cn(postCardType.label, "mt-2 inline-flex font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2")}
              data-post-card-interactive="true"
              href={href()}
            >
              {props.labels.readFullPost}
            </a>
          )}
        </Show>
      </div>
    </Show>
  );
}

function ImagePostContent(props: {
  class?: string;
  content: ImageContent;
  labels: Required<PostCardMediaLabels>;
}) {
  const isAgeGated = () => props.content.ageGatePolicy === "18_plus" && props.content.contentSafetyState === "adult";
  const ageGateRequiresProof = () => isAgeGated() && props.content.ageGateViewerState !== "verified_allowed";
  const aspectStyle = () => props.content.aspectRatio ? { "aspect-ratio": String(props.content.aspectRatio) } : undefined;

  return (
    <figure class={props.class}>
      <div class="relative overflow-hidden rounded-lg bg-muted">
        <Show
          when={!ageGateRequiresProof() && props.content.src.trim()}
          fallback={(
            <div
              aria-label={props.content.alt}
              class="min-h-64 w-full bg-muted"
              role="img"
              style={aspectStyle()}
            />
          )}
        >
          <img
            alt={props.content.alt}
            class="w-full object-cover"
            src={props.content.src}
            style={aspectStyle()}
          />
        </Show>
        <Show when={ageGateRequiresProof()}>
          <div class="absolute inset-0 flex items-center justify-center bg-black/40">
            <Button
              size="lg"
              class="gap-2 font-semibold shadow-lg"
              data-post-card-interactive="true"
              onClick={props.content.onVerifyAge}
              disabled={!props.content.onVerifyAge}
            >
              <IconLock class="size-4" />
              <Type variant="body-strong">{props.labels.ageGateVerify}</Type>
            </Button>
          </div>
        </Show>
      </div>
      <Show when={!ageGateRequiresProof() && props.content.caption}>
        <FormattedText
          class={cn("mt-1.5 text-start", postCardCaptionTextColor, postCardType.caption)}
          dir={props.content.captionDir ?? "auto"}
          lang={props.content.captionLang}
          value={props.content.caption ?? ""}
        />
      </Show>
    </figure>
  );
}

export interface PostCardMediaProps {
  content: PostCardContent;
  class?: string;
  labels?: PostCardMediaLabels;
  postHref?: string;
  onOpenVideoViewer?: () => void;
  viewContext?: PostCardViewContext;
  previewMode?: boolean;
}

export function PostCardMedia(props: PostCardMediaProps) {
  const labels = (): Required<PostCardMediaLabels> => ({ ...defaultMediaLabels, ...props.labels });
  const content = () => props.content;

  const bodyText = (body: string | undefined, bodyDir?: "ltr" | "rtl" | "auto", bodyLang?: string) => {
    if (!body) return null;
    return (
      <FormattedText
        class={cn(postCardType.body, postCardReadableWidth, postCardBodyTextColor)}
        dir={bodyDir ?? "auto"}
        lang={bodyLang}
        value={body}
      />
    );
  };

  return (
    <Switch>
      <Match when={content().type === "text" ? content() as TextContent : null}>
        {(value) => (
          <TextPostContent
            class={props.class}
            content={value()}
            labels={labels()}
            postHref={props.postHref}
            previewMode={props.previewMode}
            viewContext={props.viewContext}
          />
        )}
      </Match>
      <Match when={content().type === "image" ? content() as ImageContent : null}>
        {(value) => <ImagePostContent class={props.class} content={value()} labels={labels()} />}
      </Match>
      <Match when={content().type === "video" ? content() as Extract<PostCardContent, { type: "video" }> : null}>
        {(value) => (
          <VideoPostContent
            class={props.class}
            content={value()}
            onOpenVideoViewer={props.onOpenVideoViewer}
            previewMode={props.previewMode}
          />
        )}
      </Match>
      <Match when={content().type === "link" ? content() as LinkContent : null}>
        {(value) => (
          <div class={cn("w-full space-y-2 text-start", props.class)}>
            {bodyText(value().body, value().bodyDir, value().bodyLang)}
            <LinkPreviewCard content={value()} labels={labels()} />
          </div>
        )}
      </Match>
      <Match when={content().type === "crosspost" ? content() as Extract<PostCardContent, { type: "crosspost" }> : null}>
        {(value) => <CrosspostSourcePreviewCard class={props.class} linkEnabled source={value().source} />}
      </Match>
      <Match when={content().type === "embed" ? content() as Extract<PostCardContent, { type: "embed" }> : null}>
        {(value) => (
          <div class={cn("w-full space-y-2 text-start", props.class)}>
            {bodyText(value().body, value().bodyDir, value().bodyLang)}
            {value().renderMode === "official"
              ? value().provider === "youtube"
                ? <OfficialYouTubeEmbed content={value()} />
                : <OfficialOEmbed content={value()} />
              : <PostEmbedPreview content={value()} />}
          </div>
        )}
      </Match>
      <Match when={content().type === "song" ? content() as Extract<PostCardContent, { type: "song" }> : null}>
        {(value) => <SongPostContent class={props.class} content={value()} previewMode={props.previewMode} />}
      </Match>
      <Match when={content().type === "live_room" ? content() as Extract<PostCardContent, { type: "live_room" }> : null}>
        {(value) => <LiveRoomPostContent class={props.class} content={value()} viewContext={props.viewContext} />}
      </Match>
      <Match when={content().type === "generic_asset" ? content() as GenericAssetContent : null}>
        {(value) => <GenericAssetCard content={value()} labels={labels()} />}
      </Match>
    </Switch>
  );
}
