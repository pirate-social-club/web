import * as React from "react";
import {
  ArrowSquareOut,
  CheckCircle,
  Lock as FilledLockIcon,
  MusicNote,
  Pause as PauseIcon,
  Play as PlayIcon,
} from "@phosphor-icons/react";
import { Spinner } from "@/components/primitives/spinner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/primitives/button";
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
  UpstreamAttribution,
} from "./post-card.types";

const defaultPreviewDurationMs = 30000;

export interface SongPostContentProps {
  content: SongContentSpec;
  className?: string;
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
  showVinylAvailable: boolean;
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
  const hasVinylRelease = vinylRelease?.available === true;
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
  const showVinylAvailable = hasVinylRelease && isLocked && !isOwned && isListedActive && !ageGateRequiresProof;
  const showVinylLink = showOwned && hasVinylReleaseUrl;
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
    showVinylAvailable,
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
  const vinylReleaseUrl = content.vinylRelease?.url?.trim();

  const previewSeconds = Math.max(1, Math.round((ui.previewMaxMs ?? defaultPreviewDurationMs) / 1000));
  const controlButtonClassName = "size-12 border-transparent shadow-sm sm:size-16";
  const controlIconClassName = "size-6 sm:size-7";

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
      <div className="rounded-lg border border-border-soft bg-card p-3">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
          <div className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted sm:size-28">
            {ui.showAgeGatedArtwork ? (
              <>
                <div
                  aria-label={content.title}
                  className="size-full bg-muted"
                  role="img"
                />
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

          {playButton || verifyAgeButton ? (
            <div className="flex shrink-0 items-center justify-end">
              {playButton ?? verifyAgeButton}
            </div>
          ) : null}
        </div>

        {ui.showOwned || ui.showVinylAvailable || ui.showVinylLink ? (
          <div className="mt-2 flex flex-wrap items-center justify-end gap-3">
            {ui.showVinylAvailable ? (
              <span className="font-medium text-muted-foreground">
                Vinyl available after unlock
              </span>
            ) : null}
            {ui.showOwned ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border-soft bg-background px-2.5 py-1 text-base font-medium text-muted-foreground">
                <CheckCircle className="size-4 text-primary" weight="fill" />
                Owned
              </span>
            ) : null}
            {ui.showVinylLink && vinylReleaseUrl ? (
              <a
                className="inline-flex min-w-0 items-center gap-1.5 font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
                data-post-card-interactive="true"
                href={vinylReleaseUrl}
                rel="noreferrer"
                target="_blank"
              >
                <span className="truncate">Buy vinyl on ElasticStage</span>
                <ArrowSquareOut className="size-4 shrink-0" />
              </a>
            ) : null}
          </div>
        ) : null}
      </div>

      <StoryRegistrationBadge status={content.storyRegistration} />
      <StoryLicenseNoticeBadge notice={content.storyLicenseNotice} />
    </div>
  );
}
