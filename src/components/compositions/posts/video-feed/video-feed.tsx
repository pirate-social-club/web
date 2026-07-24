"use client";

import * as React from "react";
import {
  ArrowFatDown,
  BookOpen,
  CalendarCheck,
  CaretDown,
  CaretUp,
  ChatCircle,
  Check,
  CurrencyDollar,
  DotsThree,
  Heart,
  Lock,
  MicrophoneStage,
  Pause,
  Play,
  Plus,
  ShareNetwork,
  SpeakerHigh,
  SpeakerSlash,
} from "@phosphor-icons/react";

import { Avatar } from "@/components/primitives/avatar";
import { ActionMenu } from "@/components/primitives/action-menu";
import { formatCentsAsStartingUsd } from "@/components/compositions/bookings/fixtures/bookings-format";
import { IconButton } from "@/components/primitives/icon-button";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";
import { useProfileFollowState } from "@/hooks/use-profile-follow-state";
import type { VideoFeedCapability, VideoFeedItem } from "./video-feed.types";

export interface VideoFeedProps {
  /** Item paused by an external feed surface. Clearing this resumes its prior playback position. */
  externallyPausedItemId?: string;
  className?: string;
  downvoteLabel?: string;
  followLabel?: string;
  followingLabel?: string;
  initialItemId?: string;
  initialMuted?: boolean;
  initialPaused?: boolean;
  initialPlaybackSeconds?: number;
  items: VideoFeedItem[];
  onActiveItemChange?: (item: VideoFeedItem, index: number) => void;
  onBook?: (item: VideoFeedItem, state: VideoFeedPlaybackState) => void;
  onComment?: (item: VideoFeedItem) => void;
  onBoost?: (item: VideoFeedItem) => void;
  onDownvote?: (item: VideoFeedItem) => void;
  onGateRequired?: (item: VideoFeedItem) => void;
  onKaraoke?: (item: VideoFeedItem, state: VideoFeedPlaybackState) => void;
  onLike?: (item: VideoFeedItem) => void;
  onImpression?: (item: VideoFeedItem, impression: VideoFeedImpression) => void;
  onPublisherRelationship?: (item: VideoFeedItem) => void;
  onShare?: (item: VideoFeedItem) => void;
  onSong?: (item: VideoFeedItem, state: VideoFeedPlaybackState) => void;
  onStudy?: (item: VideoFeedItem, state: VideoFeedPlaybackState) => void;
  muteVideoLabel?: string;
  nextVideoLabel?: string;
  originalSoundLabel?: string;
  previousVideoLabel?: string;
  removeDownvoteLabel?: string;
  soundOnLabel?: string;
  tapForSoundLabel?: string;
  videoProgressLabel?: string;
}

export interface VideoFeedPlaybackState {
  muted: boolean;
  paused: boolean;
  playbackSeconds: number;
}

export interface VideoFeedImpression {
  completionRatio: number;
  durationSeconds: number;
  dwellMs: number;
  muted: boolean;
  playbackSeconds: number;
  position: number;
  replayCount: number;
  soundOnAtAnyPoint: boolean;
}

export const VIDEO_FEED_MUTED_PREFERENCE_KEY = "pirate.video-feed.muted";

export function isVideoLoopReplay({
  currentTime,
  duration,
  previousTime,
}: {
  currentTime: number;
  duration: number;
  previousTime: number;
}): boolean {
  if (!Number.isFinite(duration) || duration <= 0) return false;
  if (!Number.isFinite(currentTime) || !Number.isFinite(previousTime)) return false;
  const loopWindow = Math.min(1.5, duration * 0.25);
  return previousTime >= duration - loopWindow
    && currentTime <= loopWindow
    && currentTime < previousTime;
}

export function watchedPlaybackDelta(currentTime: number, previousTime: number): number {
  if (!Number.isFinite(currentTime) || !Number.isFinite(previousTime)) return 0;
  const delta = currentTime - previousTime;
  return delta > 0 && delta <= 1.25 ? delta : 0;
}

export function videoProgressKeyAction(key: string): "next" | "previous" | "toggle" | null {
  if (key === "ArrowUp" || key === "k") return "previous";
  if (key === "ArrowDown" || key === "j") return "next";
  if (key === " " || key === "Spacebar") return "toggle";
  return null;
}

function readStoredMutedPreference(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(VIDEO_FEED_MUTED_PREFERENCE_KEY);
    return stored === "true" ? true : stored === "false" ? false : null;
  } catch {
    return null;
  }
}

function writeStoredMutedPreference(muted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VIDEO_FEED_MUTED_PREFERENCE_KEY, String(muted));
  } catch {
    // Storage can be unavailable in private browsing; sound still works for the current feed.
  }
}

function compactCount(value: number): string {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatVideoTime(seconds: number): string {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  return `${minutes}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

function PublisherRelationshipButton({
  active,
  disabled,
  label,
  onClick,
  pending,
}: {
  active: boolean;
  disabled?: boolean;
  label: string;
  onClick?: () => void;
  pending?: boolean;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "-mt-5 grid size-6 place-items-center rounded-full text-white shadow-md transition-colors",
        active ? "bg-success text-success-foreground" : "bg-destructive",
        "disabled:cursor-not-allowed disabled:opacity-70",
      )}
      disabled={disabled || pending}
      onClick={onClick}
      type="button"
    >
      {pending ? (
        <span aria-hidden className="size-2.5 animate-pulse rounded-full bg-current" />
      ) : active ? (
        <Check aria-hidden className="size-4" weight="bold" />
      ) : (
        <Plus aria-hidden className="size-4" weight="bold" />
      )}
    </button>
  );
}

function ProfilePublisherRelationship({
  followLabel,
  followingLabel,
  ownProfile,
  targetWalletAddress,
}: {
  followLabel: string;
  followingLabel: string;
  ownProfile: boolean;
  targetWalletAddress: string;
}) {
  const follow = useProfileFollowState(targetWalletAddress, ownProfile);
  if (ownProfile) return null;
  return (
    <PublisherRelationshipButton
      active={follow.isFollowing}
      disabled={follow.followDisabled}
      label={follow.isFollowing ? followingLabel : followLabel}
      onClick={follow.onToggleFollow}
      pending={follow.followBusy || follow.followLoading}
    />
  );
}

function VideoAction({
  active,
  disabled,
  icon,
  label,
  onClick,
  rewardLabel,
  value,
}: {
  active?: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  rewardLabel?: string;
  value?: string;
}) {
  // Mobile overlays the video, so actions stay bare filled glyphs with a drop shadow and no
  // circle. On md+ the rail sits on the black stage outside the frame, where a dark circle is
  // invisible — so desktop uses a light filled circle instead. Earning actions remain
  // distinguished by the reward badge rather than a second surface treatment.
  return (
    <div className="flex flex-col items-center gap-0.5 md:gap-1">
      <div className="relative">
        <IconButton
          active={active}
          aria-label={label}
          className="bg-transparent text-white drop-shadow-[0_2px_3px_rgb(0_0_0/0.9)] hover:bg-white/15 data-[active=true]:text-destructive md:bg-white/10 md:shadow-md md:drop-shadow-none md:hover:bg-white/20"
          disabled={disabled}
          onClick={onClick}
          variant="ghost"
        >
          {icon}
        </IconButton>
        {rewardLabel ? (
          <span aria-label={`Earn ${rewardLabel}`} className="absolute -right-1 -top-1 inline-flex min-h-5 items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground shadow-sm ring-2 ring-black/60">
            {rewardLabel}
          </span>
        ) : null}
      </div>
      {value ? <Type className="text-white drop-shadow-md" variant="caption">{value}</Type> : null}
    </div>
  );
}

function CapabilityAction({
  capability,
  icon,
  label,
  onClick,
  rewardLabel,
}: {
  capability: VideoFeedCapability;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  rewardLabel?: string;
}) {
  if (capability === "unavailable") return null;
  return (
    <VideoAction
      disabled={capability !== "ready"}
      icon={capability === "locked" ? <Lock className="size-6" weight="fill" /> : icon}
      label={capability === "locked" ? `${label} locked` : label}
      onClick={onClick}
      rewardLabel={rewardLabel}
      value={label}
    />
  );
}

function VideoFeedSlide({
  active,
  allowAutoplay,
  downvoteLabel,
  followLabel,
  followingLabel,
  impressionVisible,
  item,
  itemPosition,
  onBook,
  mountMedia,
  onBoost,
  paused,
  preload,
  removeDownvoteLabel,
  onComment,
  onDownvote,
  onGateRequired,
  onKaraoke,
  onLike,
  onImpression,
  onPublisherRelationship,
  onShare,
  onSong,
  onSoundPromptShown,
  onToggleMute,
  onStudy,
  onTogglePlayback,
  onMoveNext,
  onMovePrevious,
  muted,
  preferenceMuted,
  soundOnLabel,
  soundPromptEligible,
  tapForSoundLabel,
  muteVideoLabel,
  originalSoundLabel,
  videoProgressLabel,
  initialPlaybackSeconds,
}: Omit<VideoFeedProps, "downvoteLabel" | "followLabel" | "followingLabel" | "initialItemId" | "initialMuted" | "initialPaused" | "initialPlaybackSeconds" | "items" | "muteVideoLabel" | "removeDownvoteLabel" | "soundOnLabel" | "tapForSoundLabel"> & {
  active: boolean;
  allowAutoplay: boolean;
  downvoteLabel: string;
  followLabel: string;
  followingLabel: string;
  impressionVisible: boolean;
  item: VideoFeedItem;
  itemPosition: number;
  mountMedia: boolean;
  muteVideoLabel: string;
  originalSoundLabel: string;
  onSoundPromptShown: () => void;
  onToggleMute: (video: HTMLVideoElement | null) => void;
  onTogglePlayback: (item: VideoFeedItem) => void;
  onMoveNext: () => void;
  onMovePrevious: () => void;
  muted: boolean;
  preferenceMuted: boolean;
  paused: boolean;
  preload: "auto" | "metadata";
  removeDownvoteLabel: string;
  soundOnLabel: string;
  soundPromptEligible: boolean;
  tapForSoundLabel: string;
  videoProgressLabel: string;
  initialPlaybackSeconds?: number;
}) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const progressFillRef = React.useRef<HTMLDivElement | null>(null);
  const progressInputRef = React.useRef<HTMLInputElement | null>(null);
  const progressFrameRef = React.useRef<number | null>(null);
  const suppressSeekTelemetryRef = React.useRef(false);
  const ageBlocked = item.viewerState === "age_proof_required";
  const hasPlayableSource = !ageBlocked && Boolean(item.media.src);
  const mediaMounted = mountMedia && hasPlayableSource;
  const [showSoundPrompt, setShowSoundPrompt] = React.useState(false);
  const impressionRef = React.useRef<{
    muted: boolean;
    previousPlaybackSeconds: number;
    replayCount: number;
    soundOnAtAnyPoint: boolean;
    startedAt: number;
    item: VideoFeedItem;
    watchedSeconds: number;
  } | null>(null);

  const paintProgress = React.useCallback((video: HTMLVideoElement) => {
    const paint = () => {
      progressFrameRef.current = null;
      const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
      const currentTime = duration > 0 ? Math.min(duration, Math.max(0, video.currentTime)) : 0;
      const ratio = duration > 0 ? currentTime / duration : 0;
      if (progressFillRef.current) progressFillRef.current.style.transform = `scaleX(${ratio})`;
      if (progressInputRef.current) {
        progressInputRef.current.max = String(duration);
        progressInputRef.current.value = String(currentTime);
        progressInputRef.current.setAttribute(
          "aria-valuetext",
          `${formatVideoTime(currentTime)} / ${formatVideoTime(duration)}`,
        );
      }
    };
    if (!window.requestAnimationFrame) {
      paint();
      return;
    }
    if (progressFrameRef.current !== null) window.cancelAnimationFrame?.(progressFrameRef.current);
    progressFrameRef.current = window.requestAnimationFrame(paint);
  }, []);

  React.useEffect(() => () => {
    if (progressFrameRef.current !== null) window.cancelAnimationFrame?.(progressFrameRef.current);
  }, []);

  React.useEffect(() => {
    if (!impressionVisible) return;
    impressionRef.current = {
      muted,
      previousPlaybackSeconds: videoRef.current?.currentTime ?? 0,
      replayCount: 0,
      soundOnAtAnyPoint: !muted,
      startedAt: performance.now(),
      item,
      watchedSeconds: 0,
    };
    return () => {
      const impression = impressionRef.current;
      impressionRef.current = null;
      if (!impression) return;
      const video = videoRef.current;
      const durationSeconds = Number.isFinite(video?.duration) && (video?.duration ?? 0) > 0
        ? video!.duration
        : 0;
      const playbackSeconds = impression.watchedSeconds + watchedPlaybackDelta(
        video?.currentTime ?? impression.previousPlaybackSeconds,
        impression.previousPlaybackSeconds,
      );
      onImpression?.(impression.item, {
        completionRatio: durationSeconds > 0 ? Math.min(1, playbackSeconds / durationSeconds) : 0,
        durationSeconds,
        dwellMs: Math.max(0, Math.round(performance.now() - impression.startedAt)),
        muted: impression.muted,
        playbackSeconds,
        position: itemPosition,
        replayCount: impression.replayCount,
        soundOnAtAnyPoint: impression.soundOnAtAnyPoint,
      });
    };
  }, [impressionVisible, item.id, itemPosition, onImpression]);

  React.useEffect(() => {
    if (!impressionRef.current) return;
    impressionRef.current.muted = muted;
    if (!muted) impressionRef.current.soundOnAtAnyPoint = true;
  }, [muted]);

  React.useEffect(() => {
    if (!active || !mediaMounted || !muted || preferenceMuted || !soundPromptEligible) {
      setShowSoundPrompt(false);
      return;
    }
    onSoundPromptShown();
    setShowSoundPrompt(true);
    const timeout = window.setTimeout(() => setShowSoundPrompt(false), 2500);
    return () => window.clearTimeout(timeout);
  }, [active, mediaMounted, muted, onSoundPromptShown, preferenceMuted, soundPromptEligible]);

  // Keep this before the muted-autoplay effect below. A rejected unmuted preference attempt must
  // re-mute the element before the fallback play starts, or the browser can leave playback stopped.
  React.useEffect(() => {
    if (!active || !mediaMounted || !muted || preferenceMuted) return;
    onToggleMute(videoRef.current);
  }, [active, mediaMounted, muted, onToggleMute, preferenceMuted]);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!active || paused || !allowAutoplay) {
      video.pause?.();
      return;
    }
    const playback = video.play?.();
    void playback?.catch(() => undefined);
  }, [active, allowAutoplay, paused]);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!active || !video || initialPlaybackSeconds === undefined) return;
    const restore = () => { video.currentTime = initialPlaybackSeconds; };
    if (video.readyState >= 1) restore();
    else video.addEventListener("loadedmetadata", restore, { once: true });
    return () => video.removeEventListener("loadedmetadata", restore);
  }, [active, initialPlaybackSeconds]);

  const runInteraction = (action: ((item: VideoFeedItem) => void) | undefined) => {
    if (item.interactionGate === "membership_required") {
      onGateRequired?.(item);
      return;
    }
    action?.(item);
  };

  const runPlaybackInteraction = (action: ((item: VideoFeedItem, state: VideoFeedPlaybackState) => void) | undefined) => {
    if (item.interactionGate === "membership_required") {
      onGateRequired?.(item);
      return;
    }
    action?.(item, {
      muted,
      paused,
      playbackSeconds: videoRef.current?.currentTime ?? 0,
    });
  };

  const runSongNavigation = () => {
    onSong?.(item, {
      muted,
      paused,
      playbackSeconds: videoRef.current?.currentTime ?? 0,
    });
  };

  // One overflow definition feeds both responsive slots: the mobile rail instance and the desktop
  // hover corner. ActionMenu itself picks Sheet vs dropdown from the viewport, so the two slots can
  // never drift apart in content or behaviour.
  const overflowItems = [
    {
      key: "sound",
      label: muted ? soundOnLabel : muteVideoLabel,
      icon: muted
        ? <SpeakerHigh className="size-5" weight="fill" />
        : <SpeakerSlash className="size-5" weight="fill" />,
    },
    {
      key: "downvote",
      label: item.downvoted ? removeDownvoteLabel : downvoteLabel,
      icon: <ArrowFatDown className="size-5" weight={item.downvoted ? "fill" : "regular"} />,
    },
    ...(item.boostEligibility === "eligible"
      ? [{ key: "boost", label: "Boost this song", icon: <CurrencyDollar className="size-5" weight="bold" /> }]
      : []),
  ];
  const runOverflowAction = (key: string) => {
    if (key === "boost") onBoost?.(item);
    if (key === "downvote") runInteraction(onDownvote);
    if (key === "sound") onToggleMute(videoRef.current);
  };

  // The mobile header (h-16) and footer nav (--header-height) are fixed overlays, so the slide stays
  // full-bleed and only the overlaid controls are inset out from under them. On md+ the header is in
  // flow and the feed box already excludes it, so the insets collapse to zero.
  return (
    <article className={cn(
      "relative flex h-full w-full snap-start snap-always items-center justify-center overflow-hidden bg-black",
      "[--feed-chrome-top:calc(env(safe-area-inset-top)+4rem)] [--feed-chrome-bottom:calc(env(safe-area-inset-bottom)+var(--header-height))]",
      "md:[--feed-chrome-bottom:0px] md:[--feed-chrome-top:0px]",
    )}>
      {item.media.orientation === "landscape" ? (
        <img
          aria-hidden
          alt=""
          className="absolute inset-0 size-full scale-110 object-cover opacity-40 blur-2xl"
          data-video-media-image
          decoding="async"
          loading="lazy"
          src={item.media.posterSrc}
        />
      ) : null}
      {/*
        On md+ the stage becomes a two-track grid: the media frame owns the first track and sets the
        row height through its explicit md:h, so `items-end` anchors the rail's bottom edge to the
        frame's bottom edge. The cqw sizing term still reserves ~4rem of inline space, which is what
        the in-flow rail track plus the gap consume — do not shrink it without moving the rail back
        out of flow.
      */}
      <div className="relative flex size-full items-center justify-center [container-type:inline-size] md:grid md:grid-cols-[auto_auto] md:content-center md:items-end md:justify-center md:gap-4">
        <div className={cn(
          "group relative h-full w-full overflow-hidden bg-black md:rounded-[var(--radius-xl)]",
          item.media.orientation === "portrait"
            ? "md:h-[min(92dvh,54rem,calc(177.7778cqw-7.1111rem))] md:w-auto md:aspect-[9/16]"
            : "md:h-[min(92dvh,40rem,40.5cqw)] md:w-auto md:aspect-video",
        )}>
        {mediaMounted ? (
          <video
            ref={videoRef}
            aria-label={item.song?.title ?? item.caption ?? "Video"}
            className={cn("size-full", item.media.orientation === "portrait" ? "object-cover" : "object-contain")}
            loop
            muted={muted}
            playsInline
            poster={item.media.posterSrc}
            preload={preload}
            src={item.media.src}
            onDurationChange={(event) => paintProgress(event.currentTarget)}
            onTimeUpdate={(event) => {
              paintProgress(event.currentTarget);
              const currentTime = event.currentTarget.currentTime;
              if (suppressSeekTelemetryRef.current) {
                suppressSeekTelemetryRef.current = false;
                if (impressionRef.current) impressionRef.current.previousPlaybackSeconds = currentTime;
                return;
              }
              const impression = impressionRef.current;
              if (!impression) return;
              if (isVideoLoopReplay({
                currentTime,
                duration: event.currentTarget.duration,
                previousTime: impression.previousPlaybackSeconds,
              })) {
                impression.replayCount += 1;
              }
              impression.watchedSeconds += watchedPlaybackDelta(
                currentTime,
                impression.previousPlaybackSeconds,
              );
              impression.previousPlaybackSeconds = currentTime;
            }}
          />
        ) : item.media.posterSrc ? (
          <img
            alt={item.song?.title ?? item.caption ?? "Video poster"}
            className={cn("size-full", item.media.orientation === "portrait" ? "object-cover" : "object-contain")}
            data-video-media-image
            decoding="async"
            loading="lazy"
            src={item.media.posterSrc}
          />
        ) : (
          <div aria-hidden className="size-full bg-black" />
        )}

        {ageBlocked ? (
          <div className="absolute inset-0 grid place-items-center bg-black/80 p-6 text-center">
            <div className="flex max-w-sm flex-col items-center gap-3 text-white">
              <Lock className="size-8" weight="fill" />
              <Type as="h2" variant="h3">Age verification required</Type>
              <Type variant="body">Verify your age before this video can load.</Type>
            </div>
          </div>
        ) : mediaMounted ? (
          <button
            aria-label={paused ? "Play video" : "Pause video"}
            className="absolute inset-0 grid cursor-pointer place-items-center text-white"
            data-video-play-control
            onClick={() => onTogglePlayback?.(item)}
            onMouseDown={(event) => event.preventDefault()}
            type="button"
          >
            {paused ? <Play className="size-14 drop-shadow-md" weight="fill" /> : <span className="sr-only"><Pause />Pause</span>}
          </button>
        ) : null}

        {showSoundPrompt ? (
          <button
            className="absolute left-1/2 top-[calc(var(--feed-chrome-top)+1rem)] z-10 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-white shadow-md backdrop-blur"
            onClick={() => onToggleMute(videoRef.current)}
            type="button"
          >
            <Type as="span" className="text-inherit" variant="caption">{tapForSoundLabel}</Type>
          </button>
        ) : null}

        {/*
          Desktop-only corner controls, revealed while the frame is hovered or focused within.
          Mobile keeps sound on "Tap for sound" and overflow in the rail, where there is no hover.
          They render after the full-frame play control so clicks reach them instead of toggling
          playback.
        */}
        {mediaMounted ? (
          <div className="absolute left-3 top-3 z-10 hidden opacity-0 transition-opacity duration-150 md:block md:group-hover:opacity-100 md:group-focus-within:opacity-100">
            <IconButton
              aria-label={muted ? soundOnLabel : muteVideoLabel}
              className="bg-black/55 text-white shadow-md backdrop-blur-sm hover:bg-black/75"
              onClick={() => onToggleMute(videoRef.current)}
              variant="ghost"
            >
              {muted
                ? <SpeakerSlash aria-hidden className="size-6" weight="fill" />
                : <SpeakerHigh aria-hidden className="size-6" weight="fill" />}
            </IconButton>
          </div>
        ) : null}
        <div className="absolute right-3 top-3 z-10 hidden opacity-0 transition-opacity duration-150 md:block md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <ActionMenu
            items={overflowItems}
            label="More video actions"
            onAction={runOverflowAction}
            title="Video actions"
            trigger={(
              <IconButton
                aria-label="More video actions"
                className="bg-black/55 text-white shadow-md backdrop-blur-sm hover:bg-black/75"
                data-video-overflow-trigger
                variant="ghost"
              >
                <DotsThree className="size-6" weight="bold" />
              </IconButton>
            )}
          />
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-5 pb-[calc(var(--feed-chrome-bottom)+1.25rem)] pt-24 text-white">
          {/* The 4.5rem reserve clears the overlaid rail on mobile; on md+ the rail is out of frame. */}
          <div className="pointer-events-auto max-w-[calc(100%-4.5rem)] space-y-2 md:max-w-none">
            <div className="flex items-center gap-2">
              {item.publisher.href ? (
                <a
                  className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  href={item.publisher.href}
                >
                  <Type as="span" className="text-inherit" variant="body-strong">
                    {item.publisher.handle}
                  </Type>
                </a>
              ) : (
                <Type variant="body-strong">{item.publisher.handle}</Type>
              )}
            </div>
            {item.caption ? <Type className="line-clamp-2" variant="body">{item.caption}</Type> : null}
            {item.song ? (
              item.song.songHref && onSong ? (
                <button
                  aria-label={`Open ${item.song.title} by ${item.song.artist}`}
                  className="cursor-pointer text-left text-white/80 underline-offset-4 hover:text-white hover:underline hover:decoration-white/60 focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  onClick={runSongNavigation}
                  type="button"
                >
                  <Type as="span" className="text-inherit" variant="caption">
                    {item.song.title} · {item.song.artist}
                  </Type>
                </button>
              ) : <Type className="text-white/80" variant="caption">{item.song.title} · {item.song.artist}</Type>
            ) : (
              <Type className="text-white/80" variant="caption">
                {originalSoundLabel} · {item.publisher.handle}
              </Type>
            )}
          </div>
        </div>

        {mediaMounted ? (
          <div
            className="group/timeline absolute inset-x-0 bottom-[var(--feed-chrome-bottom)] z-20 h-5 touch-pan-x md:bottom-0"
            data-video-progress
            dir="ltr"
          >
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-white/30 transition-[height] group-hover/timeline:h-1 group-focus-within/timeline:h-1">
              <div
                ref={progressFillRef}
                className="h-full origin-left scale-x-0 bg-white will-change-transform"
                data-video-progress-fill
              />
            </div>
            <input
              ref={progressInputRef}
              aria-label={videoProgressLabel}
              aria-valuetext="0:00 / 0:00"
              className="absolute inset-x-0 bottom-0 h-5 w-full cursor-pointer touch-pan-x opacity-0 accent-white focus-visible:opacity-100 group-hover/timeline:opacity-100"
              defaultValue="0"
              max="0"
              min="0"
              onInput={(event) => {
                const video = videoRef.current;
                if (!video) return;
                const nextTime = Number(event.currentTarget.value);
                suppressSeekTelemetryRef.current = true;
                if (impressionRef.current) impressionRef.current.previousPlaybackSeconds = nextTime;
                video.currentTime = nextTime;
                paintProgress(video);
              }}
              onKeyDown={(event) => {
                const action = videoProgressKeyAction(event.key);
                if (!action) return;
                event.preventDefault();
                event.stopPropagation();
                if (action === "previous") onMovePrevious();
                if (action === "next") onMoveNext();
                if (action === "toggle") onTogglePlayback(item);
              }}
              step="0.1"
              type="range"
            />
          </div>
        ) : null}
        </div>

        <div className="absolute bottom-[calc(var(--feed-chrome-bottom)+1.25rem)] right-3 z-10 flex flex-col items-center gap-3 md:static">
          {/*
            The avatar sits clean on the media without a separating ring. Missing images deliberately
            use Avatar's canonical generated ghost so account identity stays consistent app-wide.
          */}
          {item.publisher.href ? (
            <a className="rounded-full shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" href={item.publisher.href}>
              <span
                aria-label={`Publisher ${item.publisher.handle}`}
                className="block rounded-full"
                data-video-publisher-avatar
                role="img"
              >
                <Avatar
                  fallback={item.publisher.handle}
                  size="md"
                  src={item.publisher.avatarSrc}
                />
              </span>
            </a>
          ) : (
            <div
              aria-label={`Publisher ${item.publisher.handle}`}
              className="rounded-full shadow-md"
              data-video-publisher-avatar
              role="img"
            >
            <Avatar
              fallback={item.publisher.handle}
              size="md"
              src={item.publisher.avatarSrc}
            />
            </div>
          )}
          {active && item.publisher.relationship?.kind === "follow" ? (
            <ProfilePublisherRelationship
              followLabel={followLabel}
              followingLabel={followingLabel}
              ownProfile={item.publisher.relationship.ownProfile}
              targetWalletAddress={item.publisher.relationship.targetWalletAddress}
            />
          ) : item.publisher.relationship?.kind === "join" ? (
            <PublisherRelationshipButton
              active={item.publisher.relationship.active}
              disabled={item.publisher.relationship.disabled}
              label={item.publisher.relationship.label}
              onClick={() => onPublisherRelationship?.(item)}
              pending={item.publisher.relationship.pending}
            />
          ) : null}
          <VideoAction
            active={item.liked}
            icon={(
              <Heart
                className="size-6"
                data-video-icon-weight="fill"
                weight="fill"
              />
            )}
            label="Like"
            onClick={() => runInteraction(onLike)}
            value={compactCount(item.likeCount)}
          />
          <VideoAction
            icon={<ChatCircle className="size-6" data-video-icon-weight="fill" weight="fill" />}
            label="Comments"
            // Reading a public thread is not a gated interaction. Authentication and membership
            // are requested by the composer only when the viewer tries to write.
            onClick={() => onComment?.(item)}
            value={compactCount(item.commentCount)}
          />
          {item.booking?.hasAvailableSlot && item.booking.startingPriceCents !== null && onBook ? (
            <VideoAction
              icon={<CalendarCheck className="size-6" data-video-icon-weight="fill" weight="fill" />}
              label="Book"
              onClick={() => runPlaybackInteraction(onBook)}
              value={formatCentsAsStartingUsd(item.booking.startingPriceCents)}
            />
          ) : null}
          <CapabilityAction capability={item.study} icon={<BookOpen className="size-6" data-video-icon-weight="fill" weight="fill" />} label="Study" onClick={() => runPlaybackInteraction(onStudy)} rewardLabel={item.rewards?.study?.amountLabel} />
          <CapabilityAction capability={item.karaoke} icon={<MicrophoneStage className="size-6" data-video-icon-weight="fill" weight="fill" />} label="Sing" onClick={() => runPlaybackInteraction(onKaraoke)} rewardLabel={item.rewards?.karaoke?.amountLabel} />
          <VideoAction
            icon={<ShareNetwork className="size-6" data-video-icon-weight="fill" weight="fill" />}
            label="Share"
            onClick={() => onShare?.(item)}
          />
          {/*
            Mobile keeps overflow in the rail so the rail height stays stable between videos and the
            menu stays reachable without hover. On md+ the desktop hover corner inside the frame
            takes over; both slots share the single overflow definition above.
          */}
          <div className="md:hidden">
            <ActionMenu
              items={overflowItems}
              label="More video actions"
              onAction={runOverflowAction}
              title="Video actions"
              trigger={(
                <IconButton
                  aria-label="More video actions"
                  className="bg-transparent text-white drop-shadow-[0_2px_3px_rgb(0_0_0/0.9)] hover:bg-white/15"
                  data-video-overflow-trigger
                  variant="ghost"
                >
                  <DotsThree className="size-6" weight="bold" />
                </IconButton>
              )}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

export function VideoFeed({
  externallyPausedItemId,
  className,
  downvoteLabel = "Downvote",
  followLabel = "Follow",
  followingLabel = "Following",
  initialItemId,
  initialMuted,
  initialPaused = false,
  initialPlaybackSeconds,
  items,
  muteVideoLabel = "Mute video",
  nextVideoLabel = "Next video",
  originalSoundLabel = "Original sound",
  previousVideoLabel = "Previous video",
  removeDownvoteLabel = "Remove downvote",
  soundOnLabel = "Sound on",
  tapForSoundLabel = "Tap for sound",
  videoProgressLabel = "Video progress",
  ...actions
}: VideoFeedProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const initialIndex = Math.max(0, items.findIndex((item) => item.id === initialItemId));
  const [activeIndex, setActiveIndex] = React.useState(initialIndex);
  const [documentHidden, setDocumentHidden] = React.useState(false);
  const [pausedItemIds, setPausedItemIds] = React.useState<Set<string>>(() => initialPaused && initialItemId ? new Set([initialItemId]) : new Set());
  const [userStartedItemIds, setUserStartedItemIds] = React.useState<Set<string>>(() => new Set());
  const [reduceMotion, setReduceMotion] = React.useState(false);
  const [preferenceMuted, setPreferenceMuted] = React.useState(() => initialMuted ?? readStoredMutedPreference() ?? false);
  const hasShownSoundPromptRef = React.useRef(false);
  // Autoplay always begins muted. We only clear this after an unmuted play() has resolved.
  const [muted, setMuted] = React.useState(true);

  React.useLayoutEffect(() => {
    const container = containerRef.current;
    if (container && initialIndex > 0) container.scrollTop = initialIndex * container.clientHeight;
  }, [initialIndex]);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mediaQuery) return;
    const onChange = () => setReduceMotion(mediaQuery.matches);
    onChange();
    mediaQuery.addEventListener?.("change", onChange);
    return () => mediaQuery.removeEventListener?.("change", onChange);
  }, []);

  React.useEffect(() => {
    const onVisibilityChange = () => setDocumentHidden(document.visibilityState === "hidden");
    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  const moveTo = React.useCallback((index: number) => {
    const nextIndex = Math.max(0, Math.min(items.length - 1, index));
    const container = containerRef.current;
    if (!container || nextIndex === activeIndex) return;
    container.scrollTo({ behavior: reduceMotion ? "auto" : "smooth", top: nextIndex * container.clientHeight });
    setActiveIndex(nextIndex);
  }, [activeIndex, items.length, reduceMotion]);

  const togglePlayback = React.useCallback((item: VideoFeedItem) => {
    setPausedItemIds((current) => {
      const next = new Set(current);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
    setUserStartedItemIds((current) => new Set(current).add(item.id));
  }, []);

  const toggleMute = React.useCallback((video: HTMLVideoElement | null) => {
    if (!muted) {
      if (video) video.muted = true;
      setMuted(true);
      setPreferenceMuted(true);
      writeStoredMutedPreference(true);
      return;
    }
    if (!video) return;
    // This imperative write must precede play(): browsers inspect the media element itself. The
    // paired state update after resolution keeps React's controlled `muted` prop synchronized.
    video.muted = false;
    const playback = video.play?.();
    void Promise.resolve(playback).then(() => {
      if (video.muted) return;
      setPreferenceMuted(false);
      writeStoredMutedPreference(false);
      setMuted(false);
    }).catch(() => {
      video.muted = true;
      setMuted(true);
    });
  }, [muted]);

  const markSoundPromptShown = React.useCallback(() => {
    hasShownSoundPromptRef.current = true;
  }, []);

  const onKeyDown = React.useCallback((event: KeyboardEvent) => {
    const container = containerRef.current;
    if (!container) return;
    const target = event.target instanceof HTMLElement ? event.target : container;
    if (target !== container && target.closest("input, textarea, select, [contenteditable='true'], [role='dialog'], button, a, [role='button']")) return;
    if (event.key === " " || event.key === "Spacebar") {
      event.preventDefault();
      const item = items[activeIndex];
      if (item?.viewerState !== "age_proof_required") togglePlayback(item);
      return;
    }
    const direction = event.key === "ArrowDown" || event.key === "j"
      ? 1
      : event.key === "ArrowUp" || event.key === "k"
        ? -1
        : 0;
    if (direction !== 0) {
      event.preventDefault();
      moveTo(activeIndex + direction);
    }
  }, [activeIndex, items, moveTo, togglePlayback]);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener("keydown", onKeyDown);
    return () => container.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  React.useEffect(() => {
    containerRef.current?.focus({ preventScroll: true });
  }, []);

  React.useEffect(() => {
    const activeItem = items[activeIndex];
    if (activeItem) actions.onActiveItemChange?.(activeItem, activeIndex);
  }, [actions.onActiveItemChange, activeIndex, items]);

  if (items.length === 0) {
    return <div className="grid h-dvh place-items-center"><Type variant="h3">No videos yet</Type></div>;
  }

  return (
    <div className={cn("relative h-dvh w-full", className)}>
    <div
      ref={containerRef}
      aria-label="Video feed"
      className="h-full w-full snap-y snap-mandatory overflow-y-auto overscroll-y-contain"
      data-active-index={activeIndex}
      onScroll={(event) => {
        const container = event.currentTarget;
        setActiveIndex(Math.max(0, Math.min(items.length - 1, Math.round(container.scrollTop / container.clientHeight))));
      }}
      tabIndex={0}
    >
      {items.map((item, index) => (
        <div className="h-full" key={item.id}>
          <VideoFeedSlide
            {...actions}
            active={index === activeIndex}
            allowAutoplay={!documentHidden && (!reduceMotion || userStartedItemIds.has(item.id))}
            downvoteLabel={downvoteLabel}
            followLabel={followLabel}
            followingLabel={followingLabel}
            item={item}
            itemPosition={index}
            impressionVisible={index === activeIndex && !documentHidden}
            initialPlaybackSeconds={item.id === initialItemId ? initialPlaybackSeconds : undefined}
            mountMedia={Math.abs(index - activeIndex) <= 2}
            muteVideoLabel={muteVideoLabel}
            onSoundPromptShown={markSoundPromptShown}
            onMoveNext={() => moveTo(index + 1)}
            onMovePrevious={() => moveTo(index - 1)}
            originalSoundLabel={originalSoundLabel}
            onToggleMute={toggleMute}
            onTogglePlayback={togglePlayback}
            muted={muted}
            preferenceMuted={preferenceMuted}
            paused={pausedItemIds.has(item.id) || externallyPausedItemId === item.id}
            preload={Math.abs(index - activeIndex) <= 1 ? "auto" : "metadata"}
            removeDownvoteLabel={removeDownvoteLabel}
            soundOnLabel={soundOnLabel}
            soundPromptEligible={!hasShownSoundPromptRef.current}
            tapForSoundLabel={tapForSoundLabel}
            videoProgressLabel={videoProgressLabel}
          />
        </div>
      ))}
    </div>
      <div
        aria-label="Video navigation"
        className="pointer-events-none absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-3 md:flex"
        role="group"
      >
        <IconButton
          aria-label={previousVideoLabel}
          className="pointer-events-auto bg-white/10 text-white shadow-md hover:bg-white/20 disabled:bg-white/5 disabled:text-white/40"
          disabled={activeIndex === 0}
          onClick={() => moveTo(activeIndex - 1)}
          variant="ghost"
        >
          <CaretUp aria-hidden className="size-6" weight="bold" />
        </IconButton>
        <IconButton
          aria-label={nextVideoLabel}
          className="pointer-events-auto bg-white/10 text-white shadow-md hover:bg-white/20 disabled:bg-white/5 disabled:text-white/40"
          disabled={activeIndex === items.length - 1}
          onClick={() => moveTo(activeIndex + 1)}
          variant="ghost"
        >
          <CaretDown aria-hidden className="size-6" weight="bold" />
        </IconButton>
      </div>
    </div>
  );
}
