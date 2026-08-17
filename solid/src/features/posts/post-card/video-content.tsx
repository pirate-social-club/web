import { createEffect, createSignal, Show } from "solid-js";

import {
  Button,
  FormattedText,
  IconCheck,
  IconLock,
  IconMusicNote,
  IconPlay,
  IconVideoCamera,
  mediaControlButtonVariants,
  Type,
} from "../../../design-system";
import { cn } from "../../../design-system";
import { StoryRegistrationBadge } from "./ip-registration";
import { postCardType } from "./styles";
import {
  deriveVideoAttribution,
  deriveVideoOffer,
  deriveVideoUI,
  type DerivedVideoUI,
  type VideoOfferModel,
} from "./video-model";
import type { UpstreamAttribution, VideoContentSpec } from "./types";

interface VideoPostContentLabels {
  playVideo?: string;
  videoThumbnail?: string;
  ageGateVerify?: string;
  fullVideo?: string;
  buy?: string;
  unlock?: string;
  unlocked?: string;
}

const defaultVideoLabels: Required<VideoPostContentLabels> = {
  playVideo: "Play video",
  videoThumbnail: "Video thumbnail",
  ageGateVerify: "Verify age",
  fullVideo: "Full video",
  buy: "Buy",
  unlock: "Unlock",
  unlocked: "Unlocked",
};

// Media frame helpers (React: video-preview-layout). Only the aspect-ratio
// handling the card needs is ported.
function mediaAspectRatioStyle(aspectRatio?: number): string | undefined {
  return typeof aspectRatio === "number" && Number.isFinite(aspectRatio) && aspectRatio > 0
    ? `aspect-ratio: ${aspectRatio}`
    : undefined;
}

function videoPreviewFrameClassName(aspectRatio?: number): string {
  // Portrait previews are capped so tall clips do not flood the feed.
  return typeof aspectRatio === "number" && aspectRatio > 0 && aspectRatio < 1
    ? "mx-auto w-full max-w-[22rem]"
    : "w-full";
}

function videoPreviewObjectFitClassName(aspectRatio?: number): string {
  return aspectRatio && aspectRatio < 1 ? "object-contain" : "object-cover";
}

function VideoThumbnail(props: {
  class?: string;
  posterSrc?: string;
  src: string;
  title?: string;
}) {
  const [posterFailed, setPosterFailed] = createSignal(false);
  const videoSrc = () => props.src.trim();
  const showPoster = () => Boolean(props.posterSrc && !posterFailed());

  return (
    <Show
      when={showPoster()}
      fallback={(
        <Show when={videoSrc()}>
          <video
            aria-label={props.title}
            class={props.class}
            muted
            playsinline
            preload="metadata"
            src={videoSrc()}
          />
        </Show>
      )}
    >
      <img
        alt={props.title ?? ""}
        class={props.class}
        onError={() => setPosterFailed(true)}
        src={props.posterSrc}
      />
    </Show>
  );
}

function SongAttributionRow(props: { source: UpstreamAttribution }) {
  return (
    <div class={cn("flex min-w-0 items-center gap-1.5 text-muted-foreground", postCardType.meta)}>
      <IconMusicNote aria-hidden="true" class="size-4 shrink-0" />
      <Show
        when={props.source.href}
        fallback={<span class="truncate text-foreground">{props.source.title}</span>}
      >
        {(href) => (
          <a class="truncate text-foreground hover:underline" data-post-card-interactive="true" href={href()}>
            {props.source.title}
          </a>
        )}
      </Show>
      <Show when={props.source.artist}>
        <span aria-hidden="true">·</span>
      </Show>
      <Show when={props.source.artist && props.source.artistHref}>
        {(href) => (
          <a class="truncate hover:text-foreground hover:underline" data-post-card-interactive="true" href={href()}>
            {props.source.artist}
          </a>
        )}
      </Show>
      <Show when={props.source.artist && !props.source.artistHref}>
        <span class="truncate">{props.source.artist}</span>
      </Show>
    </div>
  );
}

function VideoOfferRow(props: {
  action: import("@solidjs/web").JSX.Element;
  label: string;
  priceLabel?: string;
}) {
  return (
    <div class="grid min-h-16 grid-cols-[auto_minmax(0,1fr)_4rem_8.5rem] items-center gap-3 border-t border-border-soft px-4 py-3">
      <div class="grid size-8 shrink-0 place-items-center text-muted-foreground">
        <IconVideoCamera class="size-5" />
      </div>
      <div class="min-w-0">
        <Type as="p" class="truncate font-semibold text-foreground" variant="body-strong">
          {props.label}
        </Type>
      </div>
      <Show when={props.priceLabel} fallback={<div aria-hidden="true" />}>
        {(price) => (
          <Type as="p" class="text-end font-semibold text-foreground" variant="body-strong">
            {price()}
          </Type>
        )}
      </Show>
      <div class="flex justify-end">
        {props.action}
      </div>
    </div>
  );
}

function VideoOfferRows(props: {
  content: VideoContentSpec;
  labels: Required<VideoPostContentLabels>;
  offer: VideoOfferModel;
  previewMode?: boolean;
  ui: DerivedVideoUI;
}) {
  const offer = () => props.offer;
  return (
    <Show when={offer().kind !== "none"}>
      <VideoOfferRow
        action={(
          <>
            <Show when={offer().kind === "buy"}>
              <Button
                aria-label={`Buy ${props.labels.fullVideo}`}
                class="h-10 w-32 px-5"
                data-post-card-interactive="true"
                disabled={props.previewMode}
                onClick={props.content.onBuy}
                size="sm"
              >
                {props.labels.buy}
              </Button>
            </Show>
            <Show when={offer().kind === "unlock"}>
              <Button
                aria-label={`Unlock ${props.labels.fullVideo}`}
                class="h-10 w-32 px-5"
                data-post-card-interactive="true"
                disabled={props.previewMode}
                onClick={props.content.onUnlock}
                size="sm"
              >
                {props.labels.unlock}
              </Button>
            </Show>
            <Show when={offer().kind === "owned"}>
              <span class="inline-flex h-10 w-32 items-center justify-center gap-1.5 rounded-full px-3 font-semibold text-success">
                <span>{props.labels.unlocked}</span>
                <IconCheck class="size-4" />
              </span>
            </Show>
          </>
        )}
        label={props.labels.fullVideo}
        priceLabel={offer().kind === "buy" ? (offer() as { priceLabel?: string }).priceLabel : undefined}
      />
    </Show>
  );
}

export interface VideoPostContentProps {
  content: VideoContentSpec;
  labels?: VideoPostContentLabels;
  class?: string;
  onOpenVideoViewer?: () => void;
  previewMode?: boolean;
}

export function VideoPostContent(props: VideoPostContentProps) {
  const labels = () => ({ ...defaultVideoLabels, ...props.labels });
  const [expanded, setExpanded] = createSignal(false);
  let playRequested = false;

  const ui = () => deriveVideoUI(props.content);
  const offer = () => deriveVideoOffer(props.content, ui());
  const attribution = () => deriveVideoAttribution(props.content, ui());

  const hasPlayableSource = () => props.content.src.trim().length > 0;
  const isBuffering = () => props.content.playbackState === "buffering";
  const aspectRatioStyle = () => mediaAspectRatioStyle(props.content.aspectRatio);
  const frameClassName = () => videoPreviewFrameClassName(props.content.aspectRatio);
  const objectFitClassName = () => videoPreviewObjectFitClassName(props.content.aspectRatio);
  const videoFrameClassName = () => aspectRatioStyle() ? "w-full" : "aspect-video w-full";

  // A play requested before the source resolved expands once it arrives.
  // (React: useEffect on hasPlayableSource + a playRequested ref.)
  createEffect(
    () => hasPlayableSource(),
    (playable) => {
      if (playable && playRequested) {
        playRequested = false;
        setExpanded(true);
      }
    },
  );

  const handlePlay = () => {
    if (!ui().canPlay) return;
    if (props.onOpenVideoViewer) {
      props.onOpenVideoViewer();
      return;
    }
    if (hasPlayableSource()) {
      setExpanded(true);
    } else {
      playRequested = true;
    }
    props.content.onPlay?.();
  };

  const attributionElement = () => {
    const value = attribution();
    if (!value) return null;
    if (value.kind === "song") return <SongAttributionRow source={value.source} />;
    return (
      <p class={cn("truncate text-muted-foreground", postCardType.meta)}>
        {value.label}
      </p>
    );
  };

  const captionElement = () => (
    <Show when={props.content.caption}>
      <FormattedText
        class={cn("text-muted-foreground", postCardType.caption)}
        dir={props.content.captionDir ?? "auto"}
        lang={props.content.captionLang}
        value={props.content.caption ?? ""}
      />
    </Show>
  );

  return (
    <div class={cn("flex flex-col gap-2 text-start", props.class)}>
      <div class={cn("overflow-hidden rounded-lg border border-border-soft bg-card", frameClassName())}>
        <Show
          when={expanded() && ui().canPlay && hasPlayableSource()}
          fallback={(
            <div class={cn("relative", videoFrameClassName())}>
              <button
                class={cn(
                  "relative block overflow-hidden bg-muted",
                  videoFrameClassName(),
                  ui().canPlay && "cursor-pointer",
                )}
                type="button"
                style={aspectRatioStyle()}
                onClick={handlePlay}
                disabled={!ui().canPlay}
                aria-label={props.content.title ? `Play ${props.content.title}` : labels().playVideo}
              >
              <Show
                when={ui().ageGateRequiresProof}
                fallback={(
                  <Show
                    when={props.content.posterSrc || props.content.src.trim()}
                    fallback={(
                      <div class="flex size-full items-center justify-center bg-muted">
                        <IconPlay class="size-8 text-muted-foreground" />
                      </div>
                    )}
                  >
                    <VideoThumbnail
                      class={cn(
                        "size-full",
                        objectFitClassName(),
                        "transition-[filter,transform]",
                        ui().showLockedThumbnail && "scale-[1.02] blur-[3px]",
                      )}
                      posterSrc={props.content.posterSrc}
                      src={props.content.src}
                      title={props.content.title ?? labels().videoThumbnail}
                    />
                  </Show>
                )}
              >
                <div
                  aria-label={props.content.title ?? labels().videoThumbnail}
                  class="size-full bg-muted"
                  role="img"
                />
              </Show>

              <Show when={ui().showLockedThumbnail}>
                <div class="absolute inset-0 bg-black/22" />
              </Show>

              <Show when={ui().canPlay && !isBuffering()}>
                <div class="absolute inset-0 flex items-center justify-center">
                  <span
                    aria-hidden="true"
                    class={mediaControlButtonVariants({ size: "md" })}
                  >
                    <IconPlay class="size-[18px]" />
                  </span>
                </div>
              </Show>

              <Show when={isBuffering()}>
                <div class="absolute inset-0 flex items-center justify-center">
                  <span
                    aria-hidden="true"
                    class="size-10 animate-spin rounded-full border-2 border-white/35 border-t-white"
                  />
                </div>
              </Show>

              <Show when={props.content.durationLabel && !ui().ageGateRequiresProof}>
                <div class="absolute bottom-2 end-2">
                  <span
                    class={cn(
                      "rounded bg-black/70 px-1.5 py-0.5 text-white",
                      postCardType.caption,
                    )}
                  >
                    {props.content.durationLabel}
                  </span>
                </div>
              </Show>
              </button>

              <Show when={ui().showAgeGatedThumbnail}>
                <div class="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
                  <Button
                    size="lg"
                    class="gap-2 font-semibold shadow-lg"
                    onClick={(event) => {
                      event.stopPropagation();
                      props.content.onVerifyAge?.();
                    }}
                    disabled={!props.content.onVerifyAge}
                  >
                    <IconLock class="size-4" />
                    <Type variant="body-strong">{labels().ageGateVerify}</Type>
                  </Button>
                </div>
              </Show>
            </div>
          )}
        >
          {/* Expanded playback uses a native video element; the composed
              VideoPlayer is a separate (video-player) lane. */}
          <video
            class={cn(
              "rounded-none bg-black object-contain",
              aspectRatioStyle() ? frameClassName() : "aspect-video w-full",
            )}
            style={aspectRatioStyle()}
            autoplay
            controls
            muted
            playsinline
            poster={props.content.posterSrc}
            preload="metadata"
            src={props.content.src}
            title={props.content.title}
          />
        </Show>
        <VideoOfferRows
          content={props.content}
          labels={labels()}
          offer={offer()}
          previewMode={props.previewMode}
          ui={ui()}
        />
      </div>

      {attributionElement()}
      {captionElement()}
      <StoryRegistrationBadge status={props.content.storyRegistration} />
    </div>
  );
}
