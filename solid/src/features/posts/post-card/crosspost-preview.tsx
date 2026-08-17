// Crosspost source preview, ported from the React
// crosspost-source-preview-card.tsx. Copy travels through labels so the card
// stays locale-free; media sources reuse the song/video content renderers.

import { Match, Show, Switch } from "solid-js";

import { IconArrowSquareOut, Type } from "../../../design-system";
import { cn } from "../../../design-system";
import { SongPostContent } from "./song-content";
import type { CrosspostSourcePreview, SongContentSpec, VideoContentSpec } from "./types";
import { VideoPostContent } from "./video-content";

type PostSourceSummaryKind = NonNullable<CrosspostSourcePreview["postType"]>;

export interface CrosspostPreviewLabels {
  livestream?: string;
  photoPost?: string;
  sourceDeleted?: string;
  sourceUnavailable?: string;
  untitledSource?: string;
  crosspostedFrom?: string;
  openSourcePost?: string;
  openSourcePostTitled?: (title: string) => string;
}

const defaultCrosspostLabels: Required<CrosspostPreviewLabels> = {
  livestream: "Livestream",
  photoPost: "Photo post",
  sourceDeleted: "Source post no longer available",
  sourceUnavailable: "Source post unavailable",
  untitledSource: "Untitled source post",
  crosspostedFrom: "Crossposted from",
  openSourcePost: "Open source post",
  openSourcePostTitled: (title) => `Open source post: ${title}`,
};

function postSourceKindLabel(kind: PostSourceSummaryKind | null | undefined, labels: Required<CrosspostPreviewLabels>): string | null {
  if (!kind || kind === "text") return null;
  if (kind === "live_room") return labels.livestream;
  if (kind === "image") return labels.photoPost;
  return `${kind[0]?.toUpperCase() ?? ""}${kind.slice(1)} post`;
}

function sourceStatusLabel(status: CrosspostSourcePreview["status"], labels: Required<CrosspostPreviewLabels>): string | null {
  if (status === "deleted" || status === "removed") return labels.sourceDeleted;
  if (status === "unavailable") return labels.sourceUnavailable;
  return null;
}

interface PostSourceSummaryCardProps {
  available?: boolean;
  class?: string;
  href?: string;
  kind?: PostSourceSummaryKind;
  metaLabel: string;
  statusLabel?: string | null;
  thumbnailAlt?: string;
  thumbnailSrc?: string;
  title?: string;
  labels: Required<CrosspostPreviewLabels>;
}

function PostSourceSummaryCard(props: PostSourceSummaryCardProps) {
  const kindLabel = () => postSourceKindLabel(props.kind, props.labels);
  const fullMetaLabel = () => (props.available ?? true) && kindLabel() ? `${props.metaLabel} · ${kindLabel()}` : props.metaLabel;
  const shouldLink = () => Boolean((props.available ?? true) && props.href);

  return (
    <div
      class={cn(
        "relative block w-full rounded-lg border border-border-soft bg-muted/20 px-4 py-3.5 text-start transition-colors",
        shouldLink() && "hover:bg-muted/30",
        props.class,
      )}
    >
      <Show when={shouldLink() && props.href}>
        {(href) => (
          <a
            aria-label={props.title ? props.labels.openSourcePostTitled(props.title) : props.labels.openSourcePost}
            class="absolute inset-0 z-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            data-post-card-interactive="true"
            href={href()}
          />
        )}
      </Show>
      <div
        class={cn(
          "relative z-10 grid min-w-0 gap-3",
          (props.available ?? true) && props.thumbnailSrc ? "grid-cols-[4.5rem_minmax(0,1fr)] sm:grid-cols-[5.5rem_minmax(0,1fr)]" : "grid-cols-1",
          shouldLink() && "pointer-events-none",
        )}
      >
        <Show when={(props.available ?? true) && props.thumbnailSrc}>
          {(src) => (
            <div class="aspect-square self-center overflow-hidden rounded-lg bg-muted">
              <img
                alt={props.thumbnailAlt ?? ""}
                aria-hidden={props.thumbnailAlt ? undefined : "true"}
                class="size-full object-cover"
                src={src()}
              />
            </div>
          )}
        </Show>
        <div class="min-w-0 self-center">
          <div class="flex min-w-0 items-center gap-2 text-muted-foreground">
            <IconArrowSquareOut class="size-4 shrink-0" />
            <Type as="span" variant="caption" class="truncate">
              {props.labels.crosspostedFrom} {fullMetaLabel()}
            </Type>
          </div>
          <Show
            when={props.available ?? true}
            fallback={(
              <Type as="p" variant="body-strong" class="mt-2 text-muted-foreground">
                {props.statusLabel}
              </Type>
            )}
          >
            <Type as="p" variant="h4" class="mt-2 line-clamp-3">
              {props.title?.trim() || props.labels.untitledSource}
            </Type>
          </Show>
        </div>
      </div>
    </div>
  );
}

export interface CrosspostSourcePreviewCardProps {
  class?: string;
  labels?: CrosspostPreviewLabels;
  linkEnabled?: boolean;
  source: CrosspostSourcePreview;
}

export function CrosspostSourcePreviewCard(props: CrosspostSourcePreviewCardProps) {
  const labels = (): Required<CrosspostPreviewLabels> => ({ ...defaultCrosspostLabels, ...props.labels });
  const isAvailable = () => props.source.status === "available";
  const thumbnailRequiresProof = () => props.source.contentSafetyState === "adult"
    && props.source.ageGatePolicy === "18_plus"
    && props.source.ageGateViewerState !== "verified_allowed";
  const sourceMeta = () => props.source.authorLabel
    ? `${props.source.communityLabel} · ${props.source.authorLabel}`
    : props.source.communityLabel;
  const mediaPreview = () => (isAvailable() ? props.source.mediaPreview : undefined);

  const sourceLabelElement = () => {
    const sourceLabel = `${labels().crosspostedFrom} ${sourceMeta()}`;
    const labelClassName = "flex min-w-0 items-center gap-2 text-muted-foreground";
    return (
      <Show
        when={props.linkEnabled && props.source.postHref}
        fallback={(
          <div class={labelClassName}>
            <IconArrowSquareOut class="size-4 shrink-0" />
            <Type as="span" variant="caption" class="truncate">
              {sourceLabel}
            </Type>
          </div>
        )}
      >
        {(href) => (
          <a
            class={cn(
              labelClassName,
              "transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
            data-post-card-interactive="true"
            href={href()}
          >
            <IconArrowSquareOut class="size-4 shrink-0" />
            <Type as="span" variant="caption" class="truncate">
              {sourceLabel}
            </Type>
          </a>
        )}
      </Show>
    );
  };

  return (
    <Show
      when={mediaPreview()}
      fallback={(
        <PostSourceSummaryCard
          available={isAvailable()}
          class={props.class}
          href={props.linkEnabled ? props.source.postHref : undefined}
          kind={props.source.postType}
          labels={labels()}
          metaLabel={isAvailable() ? sourceMeta() : props.source.communityLabel}
          statusLabel={sourceStatusLabel(props.source.status, labels())}
          thumbnailAlt={props.source.thumbnailAlt}
          thumbnailSrc={thumbnailRequiresProof() ? undefined : props.source.thumbnailSrc}
          title={props.source.title}
        />
      )}
    >
      {(preview) => (
        <div class={cn("w-full space-y-3.5 text-start", props.class)}>
          {sourceLabelElement()}
          <Switch>
            <Match when={preview().type === "song"}>
              <SongPostContent content={preview() as SongContentSpec} />
            </Match>
            <Match when={preview().type === "video"}>
              <VideoPostContent content={preview() as VideoContentSpec} />
            </Match>
          </Switch>
        </div>
      )}
    </Show>
  );
}
