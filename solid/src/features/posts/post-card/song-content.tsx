import { createEffect, createSignal, onCleanup, Show } from "solid-js";

import {
  Button,
  buttonVariants,
  IconArrowSquareOut,
  IconLock,
  IconMusicNote,
  IconPause,
  IconPlay,
  IconVinylRecord,
  IconWarningCircle,
  MediaControlButton,
  Scrubber,
  Spinner,
  Type,
} from "../../../design-system";
import { cn } from "../../../design-system";
import {
  clampProgressMs,
  DEFAULT_PREVIEW_DURATION_MS,
  defaultSongLabels,
  deriveSongActions,
  deriveSongDerivativeSummary,
  deriveSongUI,
  formatDurationMs,
  type DerivedSongUI,
  type SongActionsModel,
  type SongLabels,
} from "./song-model";
import { StoryLicenseNoticeBadge, StoryRegistrationBadge } from "./ip-registration";
import { postCardType } from "./styles";
import type { SongContentSpec } from "./types";

export interface SongPostContentLabels extends Partial<SongLabels> {
  pause?: string;
  play?: string;
  loading?: string;
  playPreview?: string;
  previewSeconds?: (seconds: number) => string;
  trackPosition?: string;
  verifyAge?: string;
  explicitContent?: string;
  explicitContentShort?: string;
  buyVinyl?: string;
}

export interface SongPostContentProps {
  content: SongContentSpec;
  labels?: SongPostContentLabels;
  class?: string;
  previewMode?: boolean;
}

const EMPTY_PROGRESS = { progressMs: 0 } as const;

function SongOfferRow(props: {
  action: import("@solidjs/web").JSX.Element;
  icon: import("@solidjs/web").JSX.Element;
  label: string;
  priceLabel?: string;
}) {
  return (
    <div
      class={cn(
        "mt-3 grid min-h-16 items-center gap-x-3 gap-y-2 border-t border-border-soft pt-3",
        props.priceLabel
          ? "grid-cols-[auto_minmax(0,1fr)_auto] sm:grid-cols-[auto_minmax(0,1fr)_4rem_8.5rem]"
          : "grid-cols-[auto_minmax(0,1fr)_auto]",
      )}
    >
      <div class="grid size-8 shrink-0 place-items-center text-muted-foreground">
        {props.icon}
      </div>
      <div class="min-w-0">
        <Type as="p" class="truncate font-semibold text-foreground" variant="body-strong">
          {props.label}
        </Type>
      </div>
      <Show when={props.priceLabel}>
        {(price) => (
          <Type as="p" class="text-end font-semibold text-foreground" variant="body-strong">
            {price()}
          </Type>
        )}
      </Show>
      <div class={cn("flex justify-end", props.priceLabel ? "col-span-3 sm:col-span-1" : undefined)}>
        {props.action}
      </div>
    </div>
  );
}

function learningActionButton(
  action: SongActionsModel["study"],
  content: SongContentSpec,
  previewMode: boolean | undefined,
  callbacks: { onStudy?: () => void; onKaraoke?: () => void },
  feature: "study" | "karaoke",
) {
  switch (action.kind) {
    case "callback":
      return (
        <Button
          class="w-full"
          data-post-card-interactive="true"
          onClick={feature === "study" ? callbacks.onStudy : callbacks.onKaraoke}
          size="lg"
          variant={feature === "study" ? "secondary" : "default"}
        >
          {action.label}
        </Button>
      );
    case "link":
      return (
        <a
          aria-label={action.ariaLabel}
          class={cn(buttonVariants({ variant: feature === "study" ? "secondary" : "default", size: "lg" }), "w-full")}
          data-post-card-interactive="true"
          href={action.href}
        >
          {action.label}
        </a>
      );
    case "processing":
      return (
        <Button
          class="w-full"
          disabled
          loading={!action.previewOnly}
          size="lg"
          variant="secondary"
        >
          {action.label}
        </Button>
      );
    case "disabled":
      return (
        <Button
          class="w-full"
          disabled
          size="lg"
          variant={feature === "study" ? "secondary" : "default"}
        >
          {action.label}
        </Button>
      );
    default:
      return null;
  }
}

function SongOfferRows(props: {
  actions: SongActionsModel;
  content: SongContentSpec;
  labels: SongLabels & SongPostContentLabels;
  previewMode?: boolean;
  ui: DerivedSongUI;
}) {
  const studyButton = () => learningActionButton(props.actions.study, props.content, props.previewMode, props.content, "study");
  const karaokeButton = () => learningActionButton(props.actions.karaoke, props.content, props.previewMode, props.content, "karaoke");

  const primaryActions = () => {
    const rows: import("@solidjs/web").JSX.Element[] = [];
    const study = studyButton();
    if (study || props.actions.reserveStudySlot) {
      rows.push(study ?? <div aria-hidden="true" class="invisible min-h-11" />);
    }
    const karaoke = karaokeButton();
    if (karaoke) rows.push(karaoke);
    return rows;
  };

  return (
    <Show when={!props.ui.ageGateRequiresProof}>
      <Show when={props.actions.commerce}>
        {(commerce) => (
          <div class="mt-3">
            <Button
              aria-label={commerce().ariaLabel}
              class="w-full"
              data-post-card-interactive="true"
              disabled={props.previewMode}
              onClick={commerce().kind === "buy" ? props.content.onBuy : props.content.onUnlock}
              size="lg"
            >
              {commerce().label}
            </Button>
          </div>
        )}
      </Show>

      <Show when={primaryActions().length > 0}>
        <div
          class={cn(
            "mt-3",
            "border-t border-border-soft pt-3",
            primaryActions().length > 1 ? "grid grid-cols-2 gap-3" : "grid grid-cols-1",
          )}
        >
          {primaryActions()}
          <Show when={props.actions.failureReason}>
            {(reason) => (
              <div class="col-span-full flex items-start gap-2 rounded-md border border-warning/20 bg-warning/5 px-3 py-2 text-warning">
                <IconWarningCircle class="mt-0.5 size-4 shrink-0" />
                <Type as="p" class="text-warning/95" variant="caption">
                  {reason()}
                </Type>
              </div>
            )}
          </Show>
        </div>
      </Show>

      <Show when={props.actions.vinylUrl}>
        {(url) => (
          <SongOfferRow
            action={(
              <a
                aria-label={props.labels.buyVinyl ?? "Buy vinyl"}
                class={cn(buttonVariants({ variant: "secondary", size: "sm" }), "h-10 w-32 px-5")}
                data-post-card-interactive="true"
                href={url()}
                rel="noreferrer"
                target="_blank"
              >
                <span>{props.labels.buy}</span>
                <IconArrowSquareOut class="size-4" />
              </a>
            )}
            icon={<IconVinylRecord class="size-5" />}
            label={props.labels.vinylLabel}
          />
        )}
      </Show>
    </Show>
  );
}

export function SongPostContent(props: SongPostContentProps) {
  const labels = (): SongLabels & SongPostContentLabels => ({ ...defaultSongLabels, ...props.labels });

  // Live progress store subscription (React used useSyncExternalStore).
  const [liveProgress, setLiveProgress] = createSignal<{ durationMs?: number; progressMs: number }>(EMPTY_PROGRESS);
  createEffect(
    () => props.content.progressStore,
    (store) => {
      if (!store) {
        setLiveProgress(EMPTY_PROGRESS);
        return;
      }
      setLiveProgress(store.getSnapshot());
      const unsubscribe = store.subscribe(() => setLiveProgress(store.getSnapshot()));
      onCleanup(unsubscribe);
    },
  );

  const resolvedContent = (): SongContentSpec => props.content.progressStore
    ? {
        ...props.content,
        durationMs: props.content.durationMs ?? liveProgress().durationMs,
        progressMs: liveProgress().progressMs,
      }
    : props.content;

  const ui = () => deriveSongUI(resolvedContent());
  const actions = () => deriveSongActions(resolvedContent(), ui(), labels());

  const previewSeconds = () => Math.max(1, Math.round((ui().previewMaxMs ?? DEFAULT_PREVIEW_DURATION_MS) / 1000));
  const controlButtonClassName = "relative border-transparent bg-transparent shadow-none before:absolute before:inset-0 before:rounded-full before:bg-primary before:shadow-sm hover:bg-transparent hover:before:bg-primary/90";
  const controlIconClassName = "relative z-10 size-5";

  const derivativeSummary = () => ui().showAttribution
    ? deriveSongDerivativeSummary(resolvedContent().upstreamAttributions, resolvedContent().songMode, labels())
    : null;
  const derivativeHref = () => resolvedContent().upstreamAttributions?.find((source) => source.href)?.href;

  const playbackDurationMs = () => ui().previewMaxMs;
  const scrubberDurationMs = () => {
    const duration = playbackDurationMs();
    return duration && duration > 0 ? duration : 100;
  };
  const scrubberProgressMs = () => clampProgressMs(resolvedContent().progressMs, playbackDurationMs());
  const canSeek = () => Boolean(resolvedContent().onSeek && playbackDurationMs() && playbackDurationMs()! > 0 && !ui().ageGateRequiresProof);
  const durationDisplayLabel = () => {
    const duration = playbackDurationMs();
    return duration && duration > 0
      ? formatDurationMs(duration)
      : resolvedContent().durationLabel ?? "--:--";
  };

  const controlButton = () => {
    const content = resolvedContent();
    switch (ui().primaryAction) {
      case "pause":
        return (
          <MediaControlButton aria-label={labels().pause ?? "Pause"} class={controlButtonClassName} onClick={content.onPause} size="lg">
            <IconPause class={controlIconClassName} />
          </MediaControlButton>
        );
      case "buffering":
        return (
          <MediaControlButton aria-label={labels().loading ?? "Loading"} class={controlButtonClassName} size="lg" disabled>
            <Spinner class="relative z-10 size-5" />
          </MediaControlButton>
        );
      case "preview":
        return (
          <MediaControlButton
            aria-label={labels().playPreview ?? "Play preview"}
            class={controlButtonClassName}
            onClick={() => content.onPlay?.()}
            size="lg"
            title={(labels().previewSeconds ?? ((seconds) => `${seconds}-second preview`))(previewSeconds())}
          >
            <IconPlay class={controlIconClassName} />
          </MediaControlButton>
        );
      case "locked":
        return null;
      default:
        return (
          <MediaControlButton aria-label={labels().play ?? "Play"} class={controlButtonClassName} onClick={() => content.onPlay?.()} size="lg">
            <IconPlay class={controlIconClassName} />
          </MediaControlButton>
        );
    }
  };

  return (
    <div class={cn("flex flex-col gap-2 text-start", props.class)}>
      <div>
        <div
          class={cn(
            "grid items-start gap-x-3 gap-y-2 py-1",
            ui().ageGateRequiresProof ? "grid-cols-[auto_minmax(0,1fr)_auto]" : "grid-cols-[auto_minmax(0,1fr)]",
          )}
        >
          <div class="relative row-start-1 grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted sm:row-span-2 sm:size-24 sm:self-center">
            <Show
              when={ui().showAgeGatedArtwork}
              fallback={(
                <Show
                  when={props.content.artworkSrc}
                  fallback={<IconMusicNote class="size-7 text-muted-foreground" />}
                >
                  {(src) => (
                    <img
                      alt=""
                      aria-hidden="true"
                      class="size-full object-cover"
                      src={src()}
                    />
                  )}
                </Show>
              )}
            >
              <Show when={props.content.artworkSrc}>
                {(src) => (
                  <img
                    alt=""
                    aria-hidden="true"
                    class="size-full object-cover"
                    src={src()}
                  />
                )}
              </Show>
              <Show when={!props.content.artworkSrc}>
                <div
                  aria-label={props.content.title}
                  class="size-full bg-muted"
                  role="img"
                />
              </Show>
              <div class="absolute inset-0 flex items-center justify-center bg-black/40">
                <IconLock class="size-7 text-white" />
              </div>
            </Show>
          </div>

          <div class="col-start-2 row-start-1 min-w-0 self-center sm:self-end">
            <div class="min-w-0">
              <div class="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0 leading-tight">
                <Type as="span" class="max-w-full truncate font-semibold text-foreground sm:text-lg" variant="body-strong">
                  {props.content.title}
                </Type>
                <Show when={props.content.contentSafetyState === "sensitive"}>
                  <Type
                    aria-label={labels().explicitContent ?? "Explicit content"}
                    as="span"
                    class="shrink-0 border border-current px-1 text-muted-foreground"
                    title={labels().explicitContent ?? "Explicit content"}
                    variant="caption"
                  >
                    {labels().explicitContentShort ?? "E"}
                  </Type>
                </Show>
                <Show when={derivativeSummary()}>
                  <span aria-hidden="true" class="text-base leading-6 text-muted-foreground sm:text-lg">–</span>
                </Show>
                <Show when={derivativeSummary()}>
                  {(summary) => (
                    <Show
                      when={derivativeHref()}
                      fallback={(
                        <span class="max-w-full truncate text-base leading-6 text-muted-foreground sm:text-lg">
                          {summary()}
                        </span>
                      )}
                    >
                      {(href) => (
                        <a
                          class="max-w-full truncate text-base font-medium leading-6 text-muted-foreground transition-colors hover:text-foreground hover:underline sm:text-lg"
                          href={href()}
                        >
                          {summary()}
                        </a>
                      )}
                    </Show>
                  )}
                </Show>
              </div>
              <Show when={props.content.artist}>
                <Type as="p" class="mt-1 truncate text-muted-foreground" variant="caption">
                  {props.content.artist}
                </Type>
              </Show>
            </div>
          </div>

          <Show when={!ui().ageGateRequiresProof}>
            <div class="col-span-full row-start-2 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] grid-rows-[2.75rem_auto] gap-x-3 sm:col-span-1 sm:col-start-2 sm:self-start">
              <Show when={controlButton()}>
                {(button) => (
                  <div class="row-start-1 flex shrink-0 items-center">
                    {button()}
                  </div>
                )}
              </Show>
              <div class="col-start-2 row-start-1 flex min-w-0 items-center" data-post-card-interactive="true">
                <Scrubber
                  ariaLabel={labels().trackPosition ?? "Track position"}
                  ariaValueText={`${formatDurationMs(scrubberProgressMs())} / ${durationDisplayLabel()}`}
                  class={cn("h-full", !canSeek() && "opacity-100")}
                  disabled={!canSeek()}
                  max={scrubberDurationMs()}
                  onChange={(next) => resolvedContent().onSeek?.(Math.min(next, scrubberDurationMs()))}
                  showThumb
                  showValueBubble
                  step={1000}
                  value={scrubberProgressMs()}
                  valueLabel={formatDurationMs(scrubberProgressMs())}
                />
              </div>
              <div class={cn("col-start-2 row-start-2 flex items-center justify-between tabular-nums text-muted-foreground", postCardType.meta)}>
                <span>{formatDurationMs(scrubberProgressMs())}</span>
                <span>{durationDisplayLabel()}</span>
              </div>
            </div>
          </Show>

          <Show when={ui().ageGateRequiresProof}>
            <div class="flex shrink-0 items-center justify-end">
              <Button
                class="h-9 px-4 font-medium"
                disabled={!resolvedContent().onVerifyAge}
                onClick={resolvedContent().onVerifyAge}
                size="sm"
              >
                {labels().verifyAge ?? "Verify age"}
              </Button>
            </div>
          </Show>
        </div>

        <SongOfferRows
          actions={actions()}
          content={resolvedContent()}
          labels={labels()}
          previewMode={props.previewMode}
          ui={ui()}
        />
      </div>

      <StoryRegistrationBadge status={props.content.storyRegistration} />
      <StoryLicenseNoticeBadge notice={props.content.storyLicenseNotice} />
    </div>
  );
}
