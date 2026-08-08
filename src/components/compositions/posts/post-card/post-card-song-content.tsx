import * as React from "react";
import {
  ArrowSquareOut,
  Lock as FilledLockIcon,
  MusicNote,
  Pause as PauseIcon,
  Play as PlayIcon,
  VinylRecord,
  WarningCircle,
} from "@phosphor-icons/react";
import { Spinner } from "@/components/primitives/spinner";
import { cn } from "@/lib/utils";
import { interpolateMessage } from "@/lib/route-messages";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages, type RoutesMessages } from "@/locales";
import { Button } from "@/components/primitives/button";
import { SongStreakPreview } from "@/components/compositions/song-study/song-streak-preview";
import { MediaControlButton } from "@/components/primitives/media-control-button";
import { Scrubber } from "@/components/primitives/scrubber";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/primitives/tooltip";
import { Type } from "@/components/primitives/type";
import { postCardType } from "./post-card.styles";
import { StoryLicenseNoticeBadge, StoryRegistrationBadge } from "./post-card-story-registration";
import type {
  DownloadPolicy,
  SongContentSpec,
  SongFeatureCapabilityReason,
  UpstreamAttribution,
} from "./post-card.types";

const defaultPreviewDurationMs = 30000;

export interface SongPostContentProps {
  content: SongContentSpec;
  className?: string;
  previewMode?: boolean;
}

type SongMessages = RoutesMessages["post"]["songContent"];

function featureFailureCopy(feature: "study" | "sing", reason: SongFeatureCapabilityReason | undefined, copy: SongMessages): string | null {
  if (!reason) return null;
  const label = feature === "study" ? copy.study : copy.sing;
  switch (reason.code) {
    case "provider_key_missing":
      return interpolateMessage(copy.providerKeyMissing, { label });
    case "provider_key_invalid":
      return copy.providerKeyInvalid;
    case "provider_rate_limited":
      return copy.providerRateLimited;
    case "provider_unavailable":
      return copy.providerUnavailable;
    case "provider_timeout":
      return copy.providerTimeout;
    case "provider_invalid_response":
      return copy.providerInvalidResponse;
    case "lyrics_missing":
      return interpolateMessage(copy.lyricsMissing, { label });
    case "lyrics_too_short":
      return interpolateMessage(copy.lyricsTooShort, { label });
    case "instrumental_missing":
      return copy.instrumentalMissing;
    case "timed_lyrics_missing":
    case "alignment_failed":
      return copy.timedLyricsMissing;
    case "exercise_generation_failed":
      return copy.exerciseGenerationFailed;
    case "karaoke_disabled":
      return copy.karaokeDisabled;
    case "locked":
      return interpolateMessage(copy.locked, { label });
    default:
      return null;
  }
}

// Derived UI state from domain model — all visual state is centralized here
interface DerivedSongUI {
  // Core playback
  isPlayable: boolean;
  canShowPreview: boolean;
  previewMaxMs: number | undefined;
  
  // Viewer states that affect UI
  isAgeGated: boolean;
  ageGateRequiresProof: boolean;
  
  // Artwork treatment is reserved for safety gates, not commerce locks.
  showAgeGatedArtwork: boolean;
  
  // Commerce states
  showPrice: boolean;
  showUnlock: boolean;
  showOwned: boolean;
  showVinylLink: boolean;
  showBuy: boolean;
  showDownload: boolean;
  effectiveDownloadPolicy: DownloadPolicy;
  primaryCommerceAction: "buy" | "unlock" | "verify_age" | null;
  
  // Attributions
  showAttribution: boolean;
  
  // Primary action
  primaryAction: "play" | "pause" | "buffering" | "preview" | "locked";
}

export function deriveSongUI(content: SongContentSpec): DerivedSongUI {
  const {
    playbackState = "idle",
    accessMode,
    contentSafetyState,
    ageGatePolicy,
    ageGateViewerState,
    listingMode,
    listingStatus,
    hasEntitlement,
    vinylRelease,
    songMode,
    upstreamAttributions,
    onBuy,
    onDownload,
    onUnlock,
  } = content;

  const isAgeGated = ageGatePolicy === "18_plus" && contentSafetyState === "adult";
  const ageGateRequiresProof = isAgeGated && ageGateViewerState !== "verified_allowed";
  
  // Access checks
  const isLocked = accessMode === "locked";
  
  // Commerce checks
  const isListed = listingMode === "listed";
  const isListingActive = listingStatus === "active";
  const isListedActive = isListed && isListingActive;
  const isOwned = hasEntitlement === true;
  const effectiveDownloadPolicy = getEffectiveDownloadPolicy(content);
  const hasVinylReleaseUrl = Boolean(vinylRelease?.url?.trim());
  
  // Playback availability
  const isPlayable = !ageGateRequiresProof;
  const canShowPreview = isLocked && !isOwned && !ageGateRequiresProof;
  const previewMaxMs = getPlaybackDurationMs(content, canShowPreview);
  
  const showAgeGatedArtwork = ageGateRequiresProof;
  
  // Commerce UI
  const showPrice = isListed && isListingActive && !isOwned && isLocked;
  const showBuy = showPrice && Boolean(onBuy);
  const showUnlock = isLocked && !isOwned && !isListedActive && Boolean(onUnlock);
  const showOwned = isLocked && isOwned;
  const showVinylLink = hasVinylReleaseUrl && !ageGateRequiresProof;
  const showDownload = Boolean(onDownload) && (
    effectiveDownloadPolicy === "free_download"
    || (effectiveDownloadPolicy === "purchased_download" && isOwned)
  );
  
  // Attribution
  const showAttribution = !!(songMode === "remix" && upstreamAttributions && upstreamAttributions.length > 0);

  // Determine primary action
  let primaryAction: DerivedSongUI["primaryAction"] = "play";

  if (ageGateRequiresProof) {
    primaryAction = "locked";
  } else if (playbackState === "playing") {
    primaryAction = "pause";
  } else if (playbackState === "buffering") {
    primaryAction = "buffering";
  } else if (isOwned) {
    primaryAction = "play";
  } else if (canShowPreview) {
    primaryAction = "preview";
  } else {
    primaryAction = "play";
  }

  let primaryCommerceAction: DerivedSongUI["primaryCommerceAction"] = null;
  if (ageGateRequiresProof) {
    primaryCommerceAction = "verify_age";
  } else if (isLocked && !isOwned && isListedActive && onBuy) {
    primaryCommerceAction = "buy";
  } else if (showUnlock) {
    primaryCommerceAction = "unlock";
  }

  return {
    isPlayable,
    canShowPreview,
    previewMaxMs,
    isAgeGated,
    ageGateRequiresProof,
    showAgeGatedArtwork,
    showPrice,
    showUnlock,
    showOwned,
    showVinylLink,
    showBuy,
    showDownload,
    effectiveDownloadPolicy,
    primaryCommerceAction,
    showAttribution,
    primaryAction,
  };
}

function getEffectiveDownloadPolicy(content: SongContentSpec): DownloadPolicy {
  if (content.downloadPolicy) return content.downloadPolicy;

  if (content.accessMode === "public") {
    return "stream_only";
  }

  if (content.listingMode === "listed" && content.listingStatus === "active") {
    return "purchased_download";
  }

  return "stream_only";
}

function relationshipLabel(source: UpstreamAttribution, copy: SongMessages): string {
  switch (source.relationshipType) {
    case "remix_of":
      return copy.remixOf;
    case "samples":
      return copy.samples;
    case "references_video":
      return copy.references;
    case "references_song":
      return "References";
    case "inspired_by":
      return copy.inspiredBy;
    default:
      return copy.derivedFrom;
  }
}

function sourceTitle(source: UpstreamAttribution, copy: SongMessages): string {
  return source.artist ? interpolateMessage(copy.titleByArtist, { title: source.title, artist: source.artist }) : source.title;
}

function getDerivativeSummary(
  upstreamAttributions: UpstreamAttribution[] | undefined,
  songMode: SongContentSpec["songMode"], copy: SongMessages,
): string | null {
  if (!upstreamAttributions || upstreamAttributions.length === 0) {
    return null;
  }

  if (upstreamAttributions.length === 1) {
    const source = upstreamAttributions[0];
    if (songMode === "remix") {
      return interpolateMessage(copy.titleRemix, { title: source.title });
    }
    return `${relationshipLabel(source, copy)} ${sourceTitle(source, copy)}`;
  }

  if (songMode === "remix") {
    return `${interpolateMessage(copy.titleRemix, { title: upstreamAttributions[0].title })} +${upstreamAttributions.length - 1}`;
  }

  return `${relationshipLabel(upstreamAttributions[0], copy)} ${sourceTitle(upstreamAttributions[0], copy)} +${upstreamAttributions.length - 1}`;
}

function clampProgressMs(progressMs: number | undefined, durationMs: number | undefined): number {
  const progress = Number.isFinite(progressMs) ? Math.max(0, progressMs ?? 0) : 0;
  if (!durationMs || !Number.isFinite(durationMs) || durationMs <= 0) {
    return progress;
  }
  return Math.min(progress, durationMs);
}

function formatTime(ms: number | undefined): string {
  const totalSeconds = Math.max(0, Math.floor((ms ?? 0) / 1000));
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  const paddedSeconds = String(seconds).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${paddedSeconds}`;
  }

  return `${minutes}:${paddedSeconds}`;
}

function getPlaybackDurationMs(content: SongContentSpec, canShowPreview: boolean): number | undefined {
  if (!canShowPreview) {
    return content.durationMs;
  }

  if (content.previewDurationMs && content.previewDurationMs > 0) {
    return content.previewDurationMs;
  }

  if (content.durationMs && content.durationMs > 0) {
    return Math.min(content.durationMs, defaultPreviewDurationMs);
  }

  return defaultPreviewDurationMs;
}

interface SongOfferRowProps {
  action: React.ReactNode;
  icon: React.ReactNode;
  label: string;
  priceLabel?: string;
}

function SongOfferRow({ action, icon, label, priceLabel }: SongOfferRowProps) {
  return (
    <div
      className={cn(
        "mt-3 grid min-h-16 items-center gap-x-3 gap-y-2 border-t border-border-soft pt-3",
        priceLabel
          ? "grid-cols-[auto_minmax(0,1fr)_auto] sm:grid-cols-[auto_minmax(0,1fr)_4rem_8.5rem]"
          : "grid-cols-[auto_minmax(0,1fr)_auto]",
      )}
    >
      <div className="grid size-8 shrink-0 place-items-center text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0">
        <Type as="p" className="truncate font-semibold text-foreground" variant="body-strong">
          {label}
        </Type>
      </div>
      {priceLabel ? (
        <Type as="p" className="text-end font-semibold text-foreground" variant="body-strong">
          {priceLabel}
        </Type>
      ) : null}
      <div className={cn("flex justify-end", priceLabel ? "col-span-3 sm:col-span-1" : undefined)}>
        {action}
      </div>
    </div>
  );
}

function SongOfferRows({
  content,
  previewMode,
  ui,
}: {
  content: SongContentSpec;
  previewMode?: boolean;
  ui: DerivedSongUI;
}) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes");
  const song = copy.post.songContent;
  if (ui.ageGateRequiresProof) return null;

  const isOwned = content.hasEntitlement === true;
  const isLocked = content.accessMode === "locked";
  const isListedActive = content.listingMode === "listed" && content.listingStatus === "active";
  const effectivePrice = content.regionalPriceLabel ?? content.priceLabel;
  const vinylReleaseUrl = content.vinylRelease?.url?.trim();
  const rows: React.ReactNode[] = [];

  if (isLocked && !isOwned && isListedActive && content.onBuy) {
    rows.push(
      <div className="mt-3" key="digital-buy">
        <Button
          aria-label={effectivePrice ? interpolateMessage(song.buyDigitalMp3ForPrice, { price: effectivePrice }) : song.buyDigitalMp3}
          className="w-full"
          data-post-card-interactive="true"
          disabled={previewMode}
          onClick={content.onBuy}
          size="lg"
        >
          {effectivePrice ? interpolateMessage(song.buyForPrice, { price: effectivePrice }) : song.buy}
        </Button>
      </div>,
    );
  } else if (isLocked && !isOwned && !isListedActive && content.onUnlock) {
    rows.push(
      <div className="mt-3" key="digital-unlock">
        <Button
          aria-label={song.unlockDigitalMp3}
          className="w-full"
          data-post-card-interactive="true"
          disabled={previewMode}
          onClick={content.onUnlock}
          size="lg"
        >
          {song.unlock}
        </Button>
      </div>,
    );
  }

  // Learn + Karaoke are the two primary CTAs. When a post is hydrated from a
  // partial feed payload, study can be unknown for one render; reserve its slot
  // so Sing does not jump from full-width to half-width once study arrives.
  let studyAction: React.ReactNode | null = null;
  let studyFailureReason: string | null = null;
  const studyActionLabel = content.study?.rewardLabel
    ? interpolateMessage(song.studyEarnReward, { reward: content.study.rewardLabel })
    : song.study;

  if (!isLocked || isOwned) {
    switch (content.study?.status) {
      case "ready":
        if (content.onStudy || content.studyHref) {
          studyAction = content.onStudy ? (
            <Button
              className="w-full"
              data-post-card-interactive="true"
              key="study"
              onClick={content.onStudy}
              size="lg"
              variant="secondary"
            >
              {studyActionLabel}
            </Button>
          ) : (
            <Button asChild className="w-full" data-post-card-interactive="true" key="study" size="lg" variant="secondary">
              <a aria-label={song.studyAriaLabel} href={content.studyHref}>
                <span>{studyActionLabel}</span>
              </a>
            </Button>
          );
        }
        break;
      case "processing":
        studyAction = (
          <Button
            className="w-full"
            disabled
            key="study"
            loading={!content.study.previewOnly}
            size="lg"
            variant="secondary"
          >
            {song.study}
          </Button>
        );
        break;
      case "locked":
        studyAction = (
          <Button
            className="w-full"
            disabled
            key="study"
            size="lg"
            variant="secondary"
          >
            {song.study}
          </Button>
        );
        if (content.viewerCanManage) {
          studyFailureReason = featureFailureCopy("study", content.study.reason, song)
            ?? song.studyLocked;
        }
        break;
      default:
        break;
    }
  }

  let karaokeAction: React.ReactNode | null = null;
  let karaokeFailureReason: string | null = null;
  const karaokeActionLabel = content.karaoke?.rewardLabel
    ? interpolateMessage(song.singEarnReward, { reward: content.karaoke.rewardLabel })
    : song.sing;
  if (!isLocked || isOwned) {
    switch (content.karaoke?.status) {
      case "ready":
        if (content.karaokeHref || content.onKaraoke) {
          karaokeAction = content.onKaraoke ? (
            <Button
              className="w-full"
              data-post-card-interactive="true"
              key="karaoke"
              onClick={content.onKaraoke}
              size="lg"
            >
              {karaokeActionLabel}
            </Button>
          ) : (
            <Button asChild className="w-full" data-post-card-interactive="true" key="karaoke" size="lg">
              <a aria-label={song.singAriaLabel} href={content.karaokeHref}>
                <span>{karaokeActionLabel}</span>
              </a>
            </Button>
          );
        }
        break;
      case "processing":
        karaokeAction = (
          <Button
            className="w-full"
            disabled
            key="karaoke"
            loading={!content.karaoke.previewOnly}
            size="lg"
          >
            {song.sing}
          </Button>
        );
        break;
      case "failed":
        karaokeAction = (
          <Button
            aria-label={song.sing}
            className="w-full"
            disabled
            key="karaoke"
            size="lg"
            variant="secondary"
          >
            {song.sing}
          </Button>
        );
        if (content.viewerCanManage) {
          karaokeFailureReason = featureFailureCopy("sing", content.karaoke.reason, song)
            ?? song.singSetupFailed;
        }
        break;
      default:
        if (content.karaokeHref || content.onKaraoke) {
          karaokeAction = content.onKaraoke ? (
            <Button
              className="w-full"
              data-post-card-interactive="true"
              key="karaoke"
              onClick={content.onKaraoke}
              size="lg"
            >
              {song.sing}
            </Button>
          ) : (
            <Button asChild className="w-full" data-post-card-interactive="true" key="karaoke" size="lg">
              <a aria-label={song.singAriaLabel} href={content.karaokeHref}>
                <span>{song.sing}</span>
              </a>
            </Button>
          );
        }
        break;
    }
  }
  const reserveStudySlot = karaokeAction !== null && content.study === undefined;
  const primaryActions: React.ReactNode[] = [];

  if (studyAction || reserveStudySlot) {
    primaryActions.push(
      studyAction ?? <div aria-hidden="true" className="invisible min-h-11" key="study-placeholder" />,
    );
  }

  if (karaokeAction) {
    primaryActions.push(karaokeAction);
  }

  const failureReason = studyFailureReason && karaokeFailureReason
    ? song.studySingSetupFailed
    : studyFailureReason ?? karaokeFailureReason;

  if (vinylReleaseUrl) {
    rows.push(
      <SongOfferRow
        action={(
          <Button
            asChild
            className="h-10 w-32 px-5"
            data-post-card-interactive="true"
            size="sm"
            variant="secondary"
          >
            <a aria-label={song.buyVinyl} href={vinylReleaseUrl} rel="noreferrer" target="_blank">
              <span>{song.buy}</span>
              <ArrowSquareOut className="size-4" />
            </a>
          </Button>
        )}
        icon={<VinylRecord className="size-5" />}
        key="vinyl"
        label={song.vinylLabel}
      />,
    );
  }

  if (primaryActions.length === 0 && rows.length === 0) return null;

  return (
    <div>
      {primaryActions.length > 0 ? (
        <div
          className={cn(
            "mt-3",
            !content.streakSummary && "border-t border-border-soft pt-3",
            primaryActions.length > 1 ? "grid grid-cols-2 gap-3" : "grid grid-cols-1",
          )}
        >
          {primaryActions}
          {failureReason ? (
            <div className="col-span-full flex items-start gap-2 rounded-md border border-warning/20 bg-warning/5 px-3 py-2 text-warning">
              <WarningCircle className="mt-0.5 size-4 shrink-0" weight="fill" />
              <Type as="p" className="text-warning/95" variant="caption">
                {failureReason}
              </Type>
            </div>
          ) : null}
        </div>
      ) : null}
      {rows}
    </div>
  );
}

export function SongPostContent({ content, className, previewMode }: SongPostContentProps) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes");
  const song = copy.post.songContent;
  const ui = deriveSongUI(content);
  const {
    progressMs,
    upstreamAttributions,
    onPlay,
    onPause,
    onSeek,
    onVerifyAge,
  } = content;

  const previewSeconds = Math.max(1, Math.round((ui.previewMaxMs ?? defaultPreviewDurationMs) / 1000));
  const controlButtonClassName = "relative border-transparent bg-transparent shadow-none before:absolute before:inset-0 before:rounded-full before:bg-primary before:shadow-sm hover:bg-transparent hover:before:bg-primary/90";
  const controlIconClassName = "relative z-10 size-5";

  // Determine control button - the player owns listening only; commerce lives in the post footer.
  const getControlButton = () => {
    switch (ui.primaryAction) {
      case "pause":
        return (
          <MediaControlButton aria-label={song.pause} className={controlButtonClassName} onClick={onPause} size="lg">
            <PauseIcon className={controlIconClassName} weight="fill" />
          </MediaControlButton>
        );
      case "play":
        return (
          <MediaControlButton aria-label={song.play} className={controlButtonClassName} onClick={() => onPlay?.()} size="lg">
            <PlayIcon className={controlIconClassName} weight="fill" />
          </MediaControlButton>
        );
      case "buffering":
        return (
          <MediaControlButton aria-label={song.loading} className={controlButtonClassName} size="lg" disabled>
            <Spinner className="relative z-10 size-5" />
          </MediaControlButton>
        );
      case "preview":
        return (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <MediaControlButton aria-label={song.playPreview} className={controlButtonClassName} onClick={() => onPlay?.()} size="lg">
                  <PlayIcon className={controlIconClassName} weight="fill" />
                </MediaControlButton>
              </TooltipTrigger>
              <TooltipContent>{interpolateMessage(song.previewSeconds, { seconds: String(previewSeconds) })}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case "locked":
        return null;
      default:
        return (
          <MediaControlButton aria-label={song.play} className={controlButtonClassName} onClick={() => onPlay?.()} size="lg">
            <PlayIcon className={controlIconClassName} weight="fill" />
          </MediaControlButton>
        );
    }
  };

  const derivativeSummary = ui.showAttribution
    ? getDerivativeSummary(upstreamAttributions, content.songMode, song)
    : null;
  const derivativeHref = upstreamAttributions?.find((source) => source.href)?.href;
  const playbackDurationMs = ui.previewMaxMs;
  const scrubberDurationMs = playbackDurationMs && playbackDurationMs > 0 ? playbackDurationMs : 100;
  const scrubberProgressMs = clampProgressMs(progressMs, playbackDurationMs);
  const canSeek = Boolean(onSeek && playbackDurationMs && playbackDurationMs > 0 && !ui.ageGateRequiresProof);
  const durationDisplayLabel = playbackDurationMs && playbackDurationMs > 0
    ? formatTime(playbackDurationMs)
    : content.durationLabel ?? "--:--";
  const playButton = ui.primaryAction !== "locked" ? getControlButton() : null;
  const verifyAgeButton = ui.ageGateRequiresProof ? (
    <Button
      className="h-9 px-4 font-medium"
      disabled={!onVerifyAge}
      onClick={onVerifyAge}
      size="sm"
    >
      {song.verifyAge}
    </Button>
  ) : null;

  return (
    <div className={cn("flex flex-col gap-2 text-start", className)}>
      <div>
        <div
          className={cn(
            "grid items-center gap-3 py-1",
            verifyAgeButton ? "grid-cols-[auto_minmax(0,1fr)_auto]" : "grid-cols-[auto_minmax(0,1fr)]",
          )}
        >
          <div className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted sm:size-24">
            {ui.showAgeGatedArtwork ? (
              <>
                {content.artworkSrc ? (
                  <img
                    alt=""
                    aria-hidden="true"
                    className="size-full object-cover"
                    src={content.artworkSrc}
                  />
                ) : (
                  <div
                    aria-label={content.title}
                    className="size-full bg-muted"
                    role="img"
                  />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <FilledLockIcon className="size-7 text-white" weight="fill" />
                </div>
              </>
            ) : content.artworkSrc ? (
              <img
                alt=""
                aria-hidden="true"
                className="size-full object-cover"
                src={content.artworkSrc}
              />
            ) : (
              <MusicNote className="size-7 text-muted-foreground" />
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0 leading-tight">
                <Type as="span" className="max-w-full truncate font-semibold text-foreground sm:text-lg" variant="body-strong">
                  {content.title}
                </Type>
                {content.contentSafetyState === "sensitive" ? (
                  <Type
                    aria-label={song.explicitContent}
                    as="span"
                    className="shrink-0 border border-current px-1 text-muted-foreground"
                    title={song.explicitContent}
                    variant="caption"
                  >
                    {song.explicitContentShort}
                  </Type>
                ) : null}
                {derivativeSummary ? <span aria-hidden="true" className="text-base leading-6 text-muted-foreground sm:text-lg">–</span> : null}
                {derivativeSummary && derivativeHref ? (
                  <a
                    className="max-w-full truncate text-base font-medium leading-6 text-muted-foreground transition-colors hover:text-foreground hover:underline sm:text-lg"
                    href={derivativeHref}
                  >
                    {derivativeSummary}
                  </a>
                ) : derivativeSummary ? (
                  <span className="max-w-full truncate text-base leading-6 text-muted-foreground sm:text-lg">
                    {derivativeSummary}
                  </span>
                ) : null}
              </div>
              {content.artist ? (
                <Type as="p" className="mt-1 truncate text-muted-foreground" variant="caption">
                  {content.artist}
                </Type>
              ) : null}
            </div>

            {!ui.ageGateRequiresProof ? (
              <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] grid-rows-[2.75rem_auto] gap-x-3">
                {playButton ? (
                  <div className="row-start-1 flex shrink-0 items-center">
                    {playButton}
                  </div>
                ) : null}
                <div className="col-start-2 row-start-1 flex min-w-0 items-center">
                  <Scrubber
                    ariaLabel={song.trackPosition}
                    className={!canSeek ? "opacity-100" : undefined}
                    disabled={!canSeek}
                    max={scrubberDurationMs}
                    onChange={(next) => onSeek?.(Math.min(next, scrubberDurationMs))}
                    showThumb
                    value={scrubberProgressMs}
                  />
                </div>
                <div className={cn("col-start-2 row-start-2 flex items-center justify-between tabular-nums text-muted-foreground", postCardType.meta)}>
                  <span>{formatTime(scrubberProgressMs)}</span>
                  <span>{durationDisplayLabel}</span>
                </div>
              </div>
            ) : null}
          </div>

          {verifyAgeButton ? (
            <div className="flex shrink-0 items-center justify-end">
              {verifyAgeButton}
            </div>
          ) : null}
        </div>

        {content.streakSummary ? (
          <div className="mt-2">
            <SongStreakPreview href={content.streaksHref} onViewLeaderboard={content.onStreaks} summary={content.streakSummary} />
          </div>
        ) : null}
        <SongOfferRows content={content} previewMode={previewMode} ui={ui} />
      </div>

      <StoryRegistrationBadge status={content.storyRegistration} />
      <StoryLicenseNoticeBadge notice={content.storyLicenseNotice} />
    </div>
  );
}
