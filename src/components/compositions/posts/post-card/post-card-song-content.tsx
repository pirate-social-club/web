import * as React from "react";
import { ArrowSquareOut, Check, MusicNote } from "@phosphor-icons/react";
import { Lock as FilledLockIcon, Pause as PauseIcon, Play as PlayIcon } from "@phosphor-icons/react";
import { Spinner } from "@/components/primitives/spinner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/primitives/button";
import { MediaControlButton } from "@/components/primitives/media-control-button";
import { Scrubber } from "@/components/primitives/scrubber";
import { postCardType } from "./post-card.styles";
import { StoryLicenseNoticeBadge, StoryRegistrationBadge } from "./post-card-story-registration";
import type { SongContentSpec, UpstreamAttribution } from "./post-card.types";

export interface SongPostContentProps {
  content: SongContentSpec;
  className?: string;
}

// Derived UI state from domain model — all visual state is centralized here
interface DerivedSongUI {
  // Core playback
  isPlayable: boolean;
  canShowPreview: boolean;
  
  // Viewer states that affect UI
  isAgeGated: boolean;
  ageGateRequiresProof: boolean;
  
  // Artwork treatment is reserved for safety gates, not commerce locks.
  showAgeGatedArtwork: boolean;
  
  // Commerce states
  showPrice: boolean;
  showUnlock: boolean;
  showOwned: boolean;
  
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
    songMode,
    upstreamAttributions,
  } = content;

  const isAgeGated = ageGatePolicy === "18_plus" && contentSafetyState === "adult";
  const ageGateRequiresProof = isAgeGated && ageGateViewerState !== "verified_allowed";
  
  // Access checks
  const isLocked = accessMode === "locked";
  
  // Commerce checks
  const isListed = listingMode === "listed";
  const isListingActive = listingStatus === "active";
  const isOwned = hasEntitlement === true;
  
  // Playback availability
  const isPlayable = !ageGateRequiresProof;
  const canShowPreview = isLocked && !isOwned && !ageGateRequiresProof;
  
  const showAgeGatedArtwork = ageGateRequiresProof;
  
  // Commerce UI
  const showPrice = isListed && isListingActive && !isOwned && isLocked;
  const showUnlock = isLocked && !isOwned && (!isListed || !isListingActive);
  const showOwned = isLocked && isOwned;
  
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

  return {
    isPlayable,
    canShowPreview,
    isAgeGated,
    ageGateRequiresProof,
    showAgeGatedArtwork,
    showPrice,
    showUnlock,
    showOwned,
    showAttribution,
    primaryAction,
  };
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

export function SongPostContent({ content, className }: SongPostContentProps) {
  const ui = deriveSongUI(content);
  const {
    playbackState = "idle",
    durationMs,
    progressMs,
    upstreamAttributions,
    onPlay,
    onPause,
    onSeek,
    onVerifyAge,
  } = content;

  // Determine control button - smaller secondary style for preview, prominent for play
  const getControlButton = () => {
    switch (ui.primaryAction) {
      case "pause":
        return (
          <MediaControlButton aria-label="Pause" onClick={onPause} size="md">
            <PauseIcon className="size-[18px]" weight="fill" />
          </MediaControlButton>
        );
      case "play":
        return (
          <MediaControlButton aria-label="Play" onClick={onPlay} size="md">
            <PlayIcon className="size-[18px]" weight="fill" />
          </MediaControlButton>
        );
      case "buffering":
        return (
          <MediaControlButton aria-label="Loading" size="md" disabled>
            <Spinner className="size-[18px]" />
          </MediaControlButton>
        );
      case "preview":
        return (
          <MediaControlButton aria-label="Play preview" onClick={onPlay} title="Preview (30s)" size="md">
            <PlayIcon className="size-[18px]" weight="fill" />
          </MediaControlButton>
        );
      case "locked":
        return null;
      default:
        return (
          <MediaControlButton aria-label="Play" onClick={onPlay} size="md">
            <PlayIcon className="size-[18px]" weight="fill" />
          </MediaControlButton>
        );
    }
  };

  const derivativeSummary = ui.showAttribution ? getDerivativeSummary(upstreamAttributions) : null;
  const derivativeHref = upstreamAttributions?.find((source) => source.href)?.href;
  const scrubberDurationMs = durationMs && durationMs > 0 ? durationMs : 100;
  const scrubberProgressMs = clampProgressMs(progressMs, durationMs);
  const canSeek = Boolean(onSeek && durationMs && durationMs > 0 && !ui.ageGateRequiresProof);

  return (
    <div className={cn("flex flex-col gap-2 text-start", className)}>
      {/* Main song row */}
      <div className="flex items-center gap-3">
        {/* Artwork */}
        <div className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted">
          {ui.showAgeGatedArtwork ? (
            <>
              <div
                aria-label={content.title}
                className="size-full bg-muted"
                role="img"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <FilledLockIcon className="size-6 text-white" weight="fill" />
              </div>
            </>
          ) : content.artworkSrc ? (
            <>
              <img
                alt={content.title}
                className="size-full object-cover"
                src={content.artworkSrc}
              />
            </>
          ) : (
            <MusicNote className="size-5 text-muted-foreground" />
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={cn("min-w-0 truncate font-semibold text-foreground", postCardType.label)}>
              {content.title}
            </p>
            {content.durationLabel && !ui.ageGateRequiresProof && (
              <span className={cn("shrink-0 font-normal text-muted-foreground", postCardType.label)}>
                ({content.durationLabel})
              </span>
            )}
          </div>
          {derivativeSummary && derivativeHref ? (
            <a
              className={cn("block truncate text-muted-foreground transition-colors hover:text-foreground", postCardType.meta)}
              href={derivativeHref}
            >
              {derivativeSummary}
            </a>
          ) : derivativeSummary ? (
            <p className={cn("truncate text-muted-foreground", postCardType.meta)}>
              {derivativeSummary}
            </p>
          ) : null}
          {content.annotationsUrl && (
            <a
              className={cn(
                "mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-background/40 px-3 py-1 font-medium text-foreground transition-colors hover:border-foreground/40 hover:bg-foreground/5",
                postCardType.meta,
              )}
              href={content.annotationsUrl}
              rel="noreferrer"
              target="_blank"
            >
              <span className="truncate">View on Genius</span>
              <ArrowSquareOut className="size-3.5 shrink-0" />
            </a>
          )}
        </div>

        {ui.primaryAction !== "locked" ? (
          <div className="flex shrink-0 items-center">
            {getControlButton()}
          </div>
        ) : null}
      </div>

      {!ui.ageGateRequiresProof ? (
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
          <span className={cn("w-14 tabular-nums text-muted-foreground", postCardType.meta)}>
            {formatTime(scrubberProgressMs)}
          </span>
          <Scrubber
            ariaLabel="Track position"
            className={!canSeek ? "opacity-100" : undefined}
            disabled={!canSeek}
            max={scrubberDurationMs}
            onChange={(next) => onSeek?.(next)}
            showThumb={playbackState === "playing" || playbackState === "paused"}
            value={scrubberProgressMs}
          />
          <span className={cn("w-14 text-end tabular-nums text-muted-foreground", postCardType.meta)}>
            {durationMs && durationMs > 0 ? formatTime(durationMs) : "--:--"}
          </span>
        </div>
      ) : null}

      <StoryRegistrationBadge status={content.storyRegistration} />
      <StoryLicenseNoticeBadge notice={content.storyLicenseNotice} />

      {ui.showOwned && (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 font-medium text-success",
            postCardType.label,
          )}
        >
          <Check className="size-4" weight="bold" />
          <span>Unlocked</span>
        </span>
      )}
      {ui.isAgeGated && ui.ageGateRequiresProof && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
          <div className="flex min-w-0 flex-1 items-center text-muted-foreground">
            <span className={cn("truncate", postCardType.label)}>
              Prove you're 18+ to listen
            </span>
          </div>
          <div className="flex shrink-0 items-center">
            <Button
              size="sm"
              className="h-8 px-4 font-medium"
              onClick={onVerifyAge}
              disabled={!onVerifyAge}
            >
              Verify Age
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
