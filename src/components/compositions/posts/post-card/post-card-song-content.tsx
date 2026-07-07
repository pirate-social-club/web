import * as React from "react";
import {
  ArrowSquareOut,
  Lock as FilledLockIcon,
  GraduationCap,
  MicrophoneStage,
  MusicNote,
  Pause as PauseIcon,
  Play as PlayIcon,
  VinylRecord,
  WarningCircle,
} from "@phosphor-icons/react";
import { Spinner } from "@/components/primitives/spinner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/primitives/button";
import { SongStreakPreview, type SongStreakSummary } from "@/components/compositions/song-study/song-streak-preview";
import { MediaControlButton } from "@/components/primitives/media-control-button";
import { Scrubber } from "@/components/primitives/scrubber";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/primitives/tooltip";
import { Type } from "@/components/primitives/type";
import { Waveform } from "@/components/primitives/waveform";
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
}

function featureFailureCopy(feature: "study" | "sing", reason: SongFeatureCapabilityReason | undefined): string | null {
  if (!reason) return null;
  const label = feature === "study" ? "Study" : "Sing";
  switch (reason.code) {
    case "provider_key_missing":
      return `${label} needs an ElevenLabs key. Add it in Integrations.`;
    case "provider_key_invalid":
      return `The ElevenLabs key did not work. Check it in Integrations.`;
    case "provider_rate_limited":
      return `ElevenLabs is rate-limiting this community. Try again in a minute.`;
    case "provider_unavailable":
      return `ElevenLabs was unavailable. Retry publishing in a minute.`;
    case "provider_timeout":
      return `ElevenLabs timed out. Retry publishing.`;
    case "provider_invalid_response":
      return `ElevenLabs returned an unreadable response. Retry publishing.`;
    case "lyrics_missing":
      return `${label} needs lyrics. Add lyrics and retry.`;
    case "lyrics_too_short":
      return `${label} needs more lyrics. Add a longer lyric set.`;
    case "instrumental_missing":
      return `Sing needs an instrumental track. Upload stems and retry.`;
    case "timed_lyrics_missing":
    case "alignment_failed":
      return `Timed lyrics could not be prepared. Check the lyrics and audio, then retry.`;
    case "exercise_generation_failed":
      return `Study exercises could not be generated. Retry publishing.`;
    case "karaoke_disabled":
      return `Karaoke is disabled for this community.`;
    case "locked":
      return `${label} is locked until the song is purchased.`;
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

function relationshipLabel(source: UpstreamAttribution): string {
  switch (source.relationshipType) {
    case "remix_of":
      return "Remix of";
    case "samples":
      return "Samples";
    case "references_video":
      return "References";
    case "references_song":
      return "References";
    case "inspired_by":
      return "Inspired by";
    default:
      return "Derived from";
  }
}

function sourceTitle(source: UpstreamAttribution): string {
  return source.artist ? `${source.title} by ${source.artist}` : source.title;
}

function getDerivativeSummary(upstreamAttributions?: UpstreamAttribution[]): string | null {
  if (!upstreamAttributions || upstreamAttributions.length === 0) {
    return null;
  }

  if (upstreamAttributions.length === 1) {
    const source = upstreamAttributions[0];
    return `${relationshipLabel(source)} ${sourceTitle(source)}`;
  }

  return `${relationshipLabel(upstreamAttributions[0])} ${sourceTitle(upstreamAttributions[0])} +${upstreamAttributions.length - 1}`;
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
        "grid min-h-16 items-center gap-x-3 gap-y-2 border-t border-border-soft px-4 py-3",
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

function SongOfferRows({ content, ui }: { content: SongContentSpec; ui: DerivedSongUI }) {
  if (ui.ageGateRequiresProof) return null;

  const isOwned = content.hasEntitlement === true;
  const isLocked = content.accessMode === "locked";
  const isListedActive = content.listingMode === "listed" && content.listingStatus === "active";
  const effectivePrice = content.regionalPriceLabel ?? content.priceLabel;
  const vinylReleaseUrl = content.vinylRelease?.url?.trim();
  const rows: React.ReactNode[] = [];

  if (isLocked && !isOwned && isListedActive && content.onBuy) {
    rows.push(
      <div className="border-t border-border-soft px-4 py-3" key="digital-buy">
        <Button
          aria-label={effectivePrice ? `Buy Digital MP3 for ${effectivePrice}` : "Buy Digital MP3"}
          className="w-full"
          data-post-card-interactive="true"
          onClick={content.onBuy}
          size="lg"
        >
          {effectivePrice ? `Buy ${effectivePrice}` : "Buy"}
        </Button>
      </div>,
    );
  } else if (isLocked && !isOwned && !isListedActive && content.onUnlock) {
    rows.push(
      <div className="border-t border-border-soft px-4 py-3" key="digital-unlock">
        <Button
          aria-label="Unlock Digital MP3"
          className="w-full"
          data-post-card-interactive="true"
          onClick={content.onUnlock}
          size="lg"
        >
          Unlock
        </Button>
      </div>,
    );
  }

  // Learn + Karaoke are the two primary CTAs. When a post is hydrated from a
  // partial feed payload, study can be unknown for one render; reserve its slot
  // so Sing does not jump from full-width to half-width once study arrives.
  let studyAction: React.ReactNode | null = null;
  let studyFailureReason: string | null = null;

  if (!isLocked || isOwned) {
    switch (content.study?.status) {
      case "ready":
        if (content.onStudy) {
          studyAction = (
            <Button
              className="w-full"
              data-post-card-interactive="true"
              key="study"
              leadingIcon={<GraduationCap className="size-4" weight="fill" />}
              onClick={content.onStudy}
              size="lg"
              variant="secondary"
            >
              Study
            </Button>
          );
        }
        break;
      case "processing":
        studyAction = (
          <Button className="w-full" disabled key="study" loading size="lg" variant="secondary">
            Study
          </Button>
        );
        break;
      case "locked":
        studyAction = (
          <Button
            className="w-full"
            disabled
            key="study"
            leadingIcon={<GraduationCap className="size-4" weight="fill" />}
            size="lg"
            variant="secondary"
          >
            Study
          </Button>
        );
        if (content.viewerCanManage) {
          studyFailureReason = featureFailureCopy("study", content.study.reason)
            ?? "Study is locked. Check the song access settings.";
        }
        break;
      default:
        break;
    }
  }

  let karaokeAction: React.ReactNode | null = null;
  let karaokeFailureReason: string | null = null;
  if (!isLocked || isOwned) {
    switch (content.karaoke?.status) {
      case "ready":
        if (content.karaokeHref || content.onKaraoke) {
          karaokeAction = content.onKaraoke ? (
            <Button
              className="w-full"
              data-post-card-interactive="true"
              key="karaoke"
              leadingIcon={<MicrophoneStage className="size-4" weight="fill" />}
              onClick={content.onKaraoke}
              size="lg"
            >
              Sing
            </Button>
          ) : (
            <Button asChild className="w-full" data-post-card-interactive="true" key="karaoke" size="lg">
              <a aria-label="Sing this song with karaoke" href={content.karaokeHref}>
                <MicrophoneStage className="size-4" weight="fill" />
                <span>Sing</span>
              </a>
            </Button>
          );
        }
        break;
      case "processing":
        karaokeAction = (
          <Button className="w-full" disabled key="karaoke" loading size="lg">
            Sing
          </Button>
        );
        break;
      case "failed":
        karaokeAction = (
          <Button
            aria-label="Sing"
            className="w-full"
            disabled
            key="karaoke"
            leadingIcon={<MicrophoneStage className="size-4" weight="fill" />}
            size="lg"
            variant="secondary"
          >
            Sing
          </Button>
        );
        if (content.viewerCanManage) {
          karaokeFailureReason = featureFailureCopy("sing", content.karaoke.reason)
            ?? "Sing setup failed. Check the lyrics and stems, then retry publishing.";
        }
        break;
      default:
        if (content.karaokeHref || content.onKaraoke) {
          karaokeAction = content.onKaraoke ? (
            <Button
              className="w-full"
              data-post-card-interactive="true"
              key="karaoke"
              leadingIcon={<MicrophoneStage className="size-4" weight="fill" />}
              onClick={content.onKaraoke}
              size="lg"
            >
              Sing
            </Button>
          ) : (
            <Button asChild className="w-full" data-post-card-interactive="true" key="karaoke" size="lg">
              <a aria-label="Sing this song with karaoke" href={content.karaokeHref}>
                <MicrophoneStage className="size-4" weight="fill" />
                <span>Sing</span>
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
    ? "Study and Sing setup failed. Check the song setup, then retry publishing."
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
            <a aria-label="Buy vinyl on ElasticStage" href={vinylReleaseUrl} rel="noreferrer" target="_blank">
              <span>Buy</span>
              <ArrowSquareOut className="size-4" />
            </a>
          </Button>
        )}
        icon={<VinylRecord className="size-5" />}
        key="vinyl"
        label="Vinyl"
      />,
    );
  }

  if (primaryActions.length === 0 && rows.length === 0) return null;

  return (
    <div>
      {primaryActions.length > 0 ? (
        <div
          className={cn(
            "border-t border-border-soft px-4 py-3",
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

export function SongPostContent({ content, className }: SongPostContentProps) {
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
  const controlButtonClassName = "size-10 border-transparent shadow-lg";
  const controlIconClassName = "size-5";

  // Determine control button - the player owns listening only; commerce lives in the post footer.
  const getControlButton = () => {
    switch (ui.primaryAction) {
      case "pause":
        return (
          <MediaControlButton aria-label="Pause" className={controlButtonClassName} onClick={onPause} size="md">
            <PauseIcon className={controlIconClassName} weight="fill" />
          </MediaControlButton>
        );
      case "play":
        return (
          <MediaControlButton aria-label="Play" className={controlButtonClassName} onClick={() => onPlay?.()} size="md">
            <PlayIcon className={controlIconClassName} weight="fill" />
          </MediaControlButton>
        );
      case "buffering":
        return (
          <MediaControlButton aria-label="Loading" className={controlButtonClassName} size="md" disabled>
            <Spinner className="size-6" />
          </MediaControlButton>
        );
      case "preview":
        return (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <MediaControlButton aria-label="Play preview" className={controlButtonClassName} onClick={() => onPlay?.()} size="md">
                  <PlayIcon className={controlIconClassName} weight="fill" />
                </MediaControlButton>
              </TooltipTrigger>
              <TooltipContent>Preview ({previewSeconds}s)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case "locked":
        return null;
      default:
        return (
          <MediaControlButton aria-label="Play" className={controlButtonClassName} onClick={() => onPlay?.()} size="md">
            <PlayIcon className={controlIconClassName} weight="fill" />
          </MediaControlButton>
        );
    }
  };

  const derivativeSummary = ui.showAttribution ? getDerivativeSummary(upstreamAttributions) : null;
  const derivativeHref = upstreamAttributions?.find((source) => source.href)?.href;
  const playbackDurationMs = ui.previewMaxMs;
  const scrubberDurationMs = playbackDurationMs && playbackDurationMs > 0 ? playbackDurationMs : 100;
  const scrubberProgressMs = clampProgressMs(progressMs, playbackDurationMs);
  const canSeek = Boolean(onSeek && playbackDurationMs && playbackDurationMs > 0 && !ui.ageGateRequiresProof);
  const waveformProgressFraction = scrubberDurationMs > 0 ? scrubberProgressMs / scrubberDurationMs : 0;
  const durationDisplayLabel = playbackDurationMs && playbackDurationMs > 0
    ? formatTime(playbackDurationMs)
    : content.durationLabel ?? "--:--";
  const waveformSeed = [
    content.title,
    content.artist ?? "",
    content.artworkSrc ?? "",
    String(content.durationMs ?? content.durationLabel ?? ""),
  ].join(":");
  const playButton = ui.primaryAction !== "locked" ? getControlButton() : null;
  const verifyAgeButton = ui.ageGateRequiresProof ? (
    <Button
      className="h-9 px-4 font-medium"
      disabled={!onVerifyAge}
      onClick={onVerifyAge}
      size="sm"
    >
      Verify Age
    </Button>
  ) : null;

  return (
    <div className={cn("flex flex-col gap-2 text-start", className)}>
      <div className="overflow-hidden rounded-lg border border-border-soft bg-card">
        <div
          className={cn(
            "grid items-center gap-3 p-3",
            verifyAgeButton ? "grid-cols-[auto_minmax(0,1fr)_auto]" : "grid-cols-[auto_minmax(0,1fr)]",
          )}
        >
          <div className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted sm:size-28">
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
            {playButton ? (
              <div className="absolute inset-0 z-10 grid place-items-center bg-black/20">
                {playButton}
              </div>
            ) : null}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="min-w-0">
              <Type as="p" className="truncate font-semibold leading-tight text-foreground sm:text-lg" variant="body-strong">
                {content.title}
              </Type>
              {content.artist ? (
                <Type as="p" className="mt-1 truncate text-muted-foreground" variant="caption">
                  {content.artist}
                </Type>
              ) : null}
              {derivativeSummary && derivativeHref ? (
                <a
                  className={cn("mt-1 block truncate text-muted-foreground transition-colors hover:text-foreground", postCardType.meta)}
                  href={derivativeHref}
                >
                  {derivativeSummary}
                </a>
              ) : derivativeSummary ? (
                <p className={cn("mt-1 truncate text-muted-foreground", postCardType.meta)}>
                  {derivativeSummary}
                </p>
              ) : null}
            </div>

            {!ui.ageGateRequiresProof ? (
              <div className="flex flex-col gap-1.5">
                <Waveform
                  height={28}
                  progressFraction={waveformProgressFraction}
                  seed={waveformSeed}
                />
                <div className="flex flex-col gap-1">
                  <Scrubber
                    ariaLabel="Track position"
                    className={!canSeek ? "opacity-100" : undefined}
                    disabled={!canSeek}
                    max={scrubberDurationMs}
                    onChange={(next) => onSeek?.(Math.min(next, scrubberDurationMs))}
                    showThumb
                    value={scrubberProgressMs}
                  />
                  <div className={cn("flex items-center justify-between tabular-nums text-muted-foreground", postCardType.meta)}>
                    <span>{formatTime(scrubberProgressMs)}</span>
                    <span>{durationDisplayLabel}</span>
                  </div>
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
          <div className="border-t border-border-soft px-4 py-2.5">
            <SongStreakPreview href={content.streaksHref} onViewLeaderboard={content.onStreaks} summary={content.streakSummary} />
          </div>
        ) : null}
        <SongOfferRows content={content} ui={ui} />
      </div>

      <StoryRegistrationBadge status={content.storyRegistration} />
      <StoryLicenseNoticeBadge notice={content.storyLicenseNotice} />
    </div>
  );
}
