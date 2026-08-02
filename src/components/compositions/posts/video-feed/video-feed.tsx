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
  ShareFat,
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
import { VideoShareSurface } from "./video-share-surface";

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
  /** Opaque identity shared by every impression in one accepted feed bootstrap. */
  feedRequestId?: string;
  items: VideoFeedItem[];
  /** BCP-47 tag for the rail's compact counters. Defaults to "en". */
  locale?: string;
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
  /** Test/diagnostic hook for committed slide renders. Omit in product callers. */
  onSlideRender?: (itemId: string) => void;
  onSong?: (item: VideoFeedItem, state: VideoFeedPlaybackState) => void;
  onStudy?: (item: VideoFeedItem, state: VideoFeedPlaybackState) => void;
  muteVideoLabel?: string;
  /** Hide the desktop prev/next buttons (e.g. while a side panel docks against the feed). */
  navigationHidden?: boolean;
  nextVideoLabel?: string;
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
  eventId: string;
  exitReason: VideoFeedImpressionExitReason;
  feedRequestId: string;
  muted: boolean;
  playbackSeconds: number;
  position: number;
  replayCount: number;
  slideEntrySequence: number;
  soundOnAtAnyPoint: boolean;
}

export type VideoFeedImpressionExitReason =
  | "autoplay_blocked"
  | "playback_error"
  | "route_unmount"
  | "swipe"
  | "visibility_hidden";

type VideoFeedImpressionIdentity = {
  eventId: string;
  feedRequestId: string;
  slideEntrySequence: number;
};

export function videoImpressionEventId(
  feedRequestId: string,
  itemId: string,
  slideEntrySequence: number,
): string {
  return `evt_video_${feedRequestId}_${encodeURIComponent(itemId)}_${slideEntrySequence}`;
}

export function classifyVideoPlayRejection(
  error: unknown,
): "autoplay_blocked" | "playback_error" | null {
  const name = error instanceof DOMException
    ? error.name
    : typeof error === "object" && error !== null && "name" in error
      ? String(error.name)
      : "";
  if (name === "AbortError") return null;
  if (name === "NotAllowedError") return "autoplay_blocked";
  return "playback_error";
}

export const VIDEO_FEED_MUTED_PREFERENCE_KEY = "pirate.video-feed.muted";

/**
 * Recently viewed slides keep their media element mounted so scrolling back does not re-download
 * or re-buffer. The cap is deliberately small: mobile Safari only tolerates a handful of live
 * video decoders at once, and kept slides are paused, so they cost memory rather than CPU.
 */
export const VIDEO_FEED_KEEP_ALIVE_MEDIA_COUNT = 4;
export const VIDEO_FEED_LONG_PRESS_MS = 500;
export const VIDEO_FEED_LONG_PRESS_MOVE_THRESHOLD_PX = 10;

/**
 * Only slides within this distance of the settled index render their shell content; every spacer
 * div stays mounted either way so scroll height, snap points, and index math are preserved.
 */
export const VIDEO_FEED_SLIDE_RENDER_WINDOW = 2;

export function didVideoLongPressMove(
  start: { x: number; y: number },
  current: { x: number; y: number },
): boolean {
  return Math.hypot(current.x - start.x, current.y - start.y) > VIDEO_FEED_LONG_PRESS_MOVE_THRESHOLD_PX;
}

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

/**
 * Slide shells are windowed like the media elements: distant slides keep their full-height spacer
 * (scroll height, snap points, and index math) but skip rendering the expensive shell content.
 * Recently viewed slides stay rendered so their kept-alive media is never detached mid-session,
 * and a pending initial-item restore target renders even outside the window so the restoration
 * never commits scrollTop onto a blank frame.
 */
export function shouldRenderVideoFeedSlide({
  activeIndex,
  index,
  itemId,
  pendingRestoreItemId,
  recentItemIds,
}: {
  activeIndex: number;
  index: number;
  itemId: string;
  pendingRestoreItemId?: string | null;
  recentItemIds: readonly string[];
}): boolean {
  if (Math.abs(index - activeIndex) <= VIDEO_FEED_SLIDE_RENDER_WINDOW) return true;
  if (recentItemIds.includes(itemId)) return true;
  return pendingRestoreItemId != null && itemId === pendingRestoreItemId;
}

/** Restore-effect runs tolerated before an unreachable initial item is given up on. */
const VIDEO_FEED_RESTORE_MAX_ATTEMPTS = 10;

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

export function compactCount(value: number, locale = "en"): string {
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(value);
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
        "grid size-6 place-items-center rounded-full text-white shadow-md transition-colors",
        active ? "bg-success text-success-foreground" : "bg-destructive",
        "disabled:cursor-not-allowed disabled:opacity-70",
      )}
      disabled={disabled || pending}
      onClick={onClick}
      type="button"
    >
      {pending ? (
        <Plus aria-hidden className="size-4 animate-pulse" weight="bold" />
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
  targetUserId,
  targetWalletAddress,
}: {
  followLabel: string;
  followingLabel: string;
  ownProfile: boolean;
  targetUserId: string;
  targetWalletAddress: string;
}) {
  const follow = useProfileFollowState(targetWalletAddress, ownProfile, targetUserId);
  if (ownProfile) return null;
  return (
    <PublisherRelationshipButton
      active={follow.isFollowing}
      disabled={follow.followDisabled}
      label={follow.followUnavailable
        ? follow.followUnavailableLabel
        : follow.isFollowing
          ? followingLabel
          : followLabel}
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
          className="!bg-transparent text-white drop-shadow-[0_1px_2px_rgb(0_0_0/0.65)] hover:!bg-white/15 data-[active=true]:text-destructive [&_svg]:size-7 md:!bg-white/10 md:shadow-md md:drop-shadow-none md:hover:!bg-white/20 md:[&_svg]:size-6"
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
      {value ? <Type className="-mt-2 text-white drop-shadow-md md:mt-0" variant="caption">{value}</Type> : null}
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
  const stateLabel = capability === "locked"
    ? `${label} locked`
    : capability === "processing"
      ? `${label} processing`
      : capability === "failed"
        ? `${label} unavailable`
        : label;
  return (
    <VideoAction
      disabled={capability !== "ready"}
      icon={capability === "locked" ? <Lock className="size-6" weight="fill" /> : icon}
      label={stateLabel}
      onClick={onClick}
      rewardLabel={rewardLabel}
      value={capability === "processing" ? "Preparing" : label}
    />
  );
}

/**
 * Minimal stand-in for slides outside the render window: the black stage plus the poster, framed
 * like the real slide so a fast scroll shows posters instead of blank transparent spacers and the
 * swap to the full slide does not visually pop. Nothing interactive, no media, no impression
 * logic — the windowing DOM win comes from skipping the rail, overflow menu, and video element.
 */
function VideoFeedSlideShell({ item }: { item: VideoFeedItem }) {
  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden bg-black",
        "[--feed-browser-occlusion:max(0px,calc(100lvh-100dvh))] md:[--feed-browser-occlusion:0px]",
      )}
      data-video-slide-shell
    >
      {item.media.posterSrc ? (
        <img
          alt={item.song?.title ?? item.caption ?? "Video poster"}
          className={cn("size-full", item.media.orientation === "portrait" ? "object-cover" : "object-contain")}
          data-video-media-image
          decoding="async"
          loading="lazy"
          src={item.media.posterSrc}
          style={{ transform: "translateY(calc(var(--feed-browser-occlusion) / -2))" }}
        />
      ) : null}
    </div>
  );
}

const VideoFeedSlide = React.memo(function VideoFeedSlide({
  active,
  allowAutoplay,
  autoplayBlocked,
  downvoteLabel,
  followLabel,
  followingLabel,
  impressionVisible,
  impressionIdentity,
  intentionalPaused,
  item,
  itemPosition,
  locale = "en",
  onBook,
  mountMedia,
  onBoost,
  onAutoplayBlockedChange,
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
  onSlideRender,
  onSong,
  onSoundPromptShown,
  onToggleMute,
  onStudy,
  onTogglePlayback,
  onMoveTo,
  muted,
  preferenceMuted,
  soundOnLabel,
  soundPromptEligible,
  tapForSoundLabel,
  muteVideoLabel,
  videoProgressLabel,
  initialPlaybackSeconds,
}: Omit<VideoFeedProps, "downvoteLabel" | "followLabel" | "followingLabel" | "initialItemId" | "initialMuted" | "initialPaused" | "initialPlaybackSeconds" | "items" | "muteVideoLabel" | "removeDownvoteLabel" | "soundOnLabel" | "tapForSoundLabel"> & {
  active: boolean;
  allowAutoplay: boolean;
  autoplayBlocked: boolean;
  downvoteLabel: string;
  followLabel: string;
  followingLabel: string;
  impressionVisible: boolean;
  impressionIdentity: VideoFeedImpressionIdentity;
  intentionalPaused: boolean;
  item: VideoFeedItem;
  itemPosition: number;
  mountMedia: boolean;
  muteVideoLabel: string;
  onAutoplayBlockedChange: (itemId: string, blocked: boolean) => void;
  onSoundPromptShown: () => void;
  onToggleMute: (video: HTMLVideoElement | null) => void;
  onTogglePlayback: (item: VideoFeedItem) => void;
  onMoveTo: (index: number) => void;
  muted: boolean;
  preferenceMuted: boolean;
  paused: boolean;
  preload: "auto" | "metadata" | "none";
  removeDownvoteLabel: string;
  soundOnLabel: string;
  soundPromptEligible: boolean;
  tapForSoundLabel: string;
  videoProgressLabel: string;
  initialPlaybackSeconds?: number;
}) {
  React.useEffect(() => {
    onSlideRender?.(item.id);
  });
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const progressFillRef = React.useRef<HTMLDivElement | null>(null);
  const progressInputRef = React.useRef<HTMLInputElement | null>(null);
  const progressFrameRef = React.useRef<number | null>(null);
  const longPressTimerRef = React.useRef<number | null>(null);
  const longPressStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const suppressNextPlaybackClickRef = React.useRef(false);
  const suppressSeekTelemetryRef = React.useRef(false);
  const ageBlocked = item.viewerState === "age_proof_required";
  const hasPlayableSource = !ageBlocked && Boolean(item.media.src);
  const mediaMounted = mountMedia && hasPlayableSource;
  const [mobileOverflowOpen, setMobileOverflowOpen] = React.useState(false);
  const [showSoundPrompt, setShowSoundPrompt] = React.useState(false);
  const [showOriginalCaption, setShowOriginalCaption] = React.useState(false);
  const impressionRef = React.useRef<{
    autoplayBlocked: boolean;
    eventId: string;
    feedRequestId: string;
    muted: boolean;
    playbackError: boolean;
    playbackStarted: boolean;
    previousPlaybackSeconds: number;
    replayCount: number;
    slideEntrySequence: number;
    soundOnAtAnyPoint: boolean;
    startedAt: number;
    item: VideoFeedItem;
    watchedSeconds: number;
  } | null>(null);
  const navigationExitReasonRef = React.useRef<VideoFeedImpressionExitReason>("route_unmount");
  navigationExitReasonRef.current = impressionVisible
    ? "route_unmount"
    : active
      ? "visibility_hidden"
      : "swipe";

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
    if (longPressTimerRef.current !== null) window.clearTimeout(longPressTimerRef.current);
  }, []);

  React.useEffect(() => {
    setShowOriginalCaption(false);
  }, [item.id]);

  React.useEffect(() => {
    if (!impressionVisible) return;
    impressionRef.current = {
      autoplayBlocked: false,
      eventId: impressionIdentity.eventId,
      feedRequestId: impressionIdentity.feedRequestId,
      muted,
      playbackError: false,
      playbackStarted: false,
      previousPlaybackSeconds: videoRef.current?.currentTime ?? 0,
      replayCount: 0,
      slideEntrySequence: impressionIdentity.slideEntrySequence,
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
      const exitReason = impression.playbackError
        ? "playback_error"
        : impression.autoplayBlocked && !impression.playbackStarted && playbackSeconds <= 0
          ? "autoplay_blocked"
          : navigationExitReasonRef.current;
      onImpression?.(impression.item, {
        completionRatio: durationSeconds > 0 ? Math.min(1, playbackSeconds / durationSeconds) : 0,
        durationSeconds,
        dwellMs: Math.max(0, Math.round(performance.now() - impression.startedAt)),
        eventId: impression.eventId,
        exitReason,
        feedRequestId: impression.feedRequestId,
        muted: impression.muted,
        playbackSeconds,
        position: itemPosition,
        replayCount: impression.replayCount,
        slideEntrySequence: impression.slideEntrySequence,
        soundOnAtAnyPoint: impression.soundOnAtAnyPoint,
      });
    };
  }, [impressionIdentity, impressionVisible, item.id, itemPosition, onImpression]);

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
    if (!mediaMounted || !video) return;
    if (!active || paused || !allowAutoplay) {
      video.pause?.();
      return;
    }
    const playback = video.play?.();
    void Promise.resolve(playback).then(() => {
      if (impressionRef.current) {
        impressionRef.current.autoplayBlocked = false;
        impressionRef.current.playbackStarted = true;
      }
      if (autoplayBlocked) onAutoplayBlockedChange(item.id, false);
    }).catch((error: unknown) => {
      const failure = classifyVideoPlayRejection(error);
      if (!failure) return;
      if (impressionRef.current) {
        impressionRef.current.autoplayBlocked = failure === "autoplay_blocked";
        impressionRef.current.playbackError = failure === "playback_error";
      }
      onAutoplayBlockedChange(item.id, failure === "autoplay_blocked");
    });
  }, [active, allowAutoplay, autoplayBlocked, item.id, mediaMounted, onAutoplayBlockedChange, paused]);

  const cancelLongPress = React.useCallback(() => {
    if (longPressTimerRef.current !== null) window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
    longPressStartRef.current = null;
  }, []);

  const startLongPress = React.useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse") return;
    cancelLongPress();
    longPressStartRef.current = { x: event.clientX, y: event.clientY };
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTimerRef.current = null;
      longPressStartRef.current = null;
      suppressNextPlaybackClickRef.current = true;
      setMobileOverflowOpen(true);
    }, VIDEO_FEED_LONG_PRESS_MS);
  }, [cancelLongPress]);

  const moveLongPress = React.useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    const start = longPressStartRef.current;
    if (!start || !didVideoLongPressMove(start, { x: event.clientX, y: event.clientY })) return;
    cancelLongPress();
  }, [cancelLongPress]);

  const togglePlaybackFromControl = () => {
    if (autoplayBlocked) {
      const playback = videoRef.current?.play?.();
      void Promise.resolve(playback).then(() => {
        onAutoplayBlockedChange(item.id, false);
      }).catch(() => {
        onAutoplayBlockedChange(item.id, true);
      });
    }
    onTogglePlayback(item);
  };

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
      paused: intentionalPaused,
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
  const displayedCaption = showOriginalCaption
    ? item.translation?.originalCaption ?? item.caption
    : item.caption;
  const displayedCaptionDir = showOriginalCaption
    ? item.translation?.originalDir
    : item.captionDir;
  const displayedCaptionLang = showOriginalCaption
    ? item.translation?.originalLang
    : item.captionLang;

  // One overflow definition feeds the mobile long-press sheet and desktop hover-corner menu, so
  // their content and behaviour cannot drift apart.
  const overflowItems = [
    ...(item.shareActions?.length
      ? item.shareActions.map((action) => ({
        key: `share:${action.key}`,
        label: action.label,
        icon: action.icon,
        destructive: action.destructive,
        disabled: action.disabled,
      }))
      : onShare
        ? [{
          key: "share:fallback",
          label: "Share",
          icon: <ShareFat className="size-5" weight="fill" />,
        }]
        : []),
    ...(onDownvote ? [{
      key: "downvote",
      label: item.downvoted ? removeDownvoteLabel : downvoteLabel,
      icon: <ArrowFatDown className="size-5" weight={item.downvoted ? "fill" : "regular"} />,
      separatorBefore: Boolean(item.shareActions?.length || onShare),
    }] : []),
    ...(item.boostEligibility === "eligible"
      ? [{ key: "boost", label: "Boost this song", icon: <CurrencyDollar className="size-5" weight="bold" /> }]
      : []),
  ];
  const runOverflowAction = (key: string) => {
    if (key.startsWith("share:")) {
      const action = item.shareActions?.find((candidate) => `share:${candidate.key}` === key);
      if (action) void action.onSelect?.();
      else onShare?.(item);
    }
    if (key === "boost") onBoost?.(item);
    if (key === "downvote") runInteraction(onDownvote);
  };

  // The mobile header (h-16) and footer nav (--header-height) are fixed overlays, so the slide stays
  // full-bleed and only the overlaid controls are inset out from under them. On md+ the header is in
  // flow and the feed box already excludes it, so the insets collapse to zero.
  return (
    <article className={cn(
      "relative flex h-full w-full items-center justify-center overflow-hidden bg-black",
      "[--feed-browser-occlusion:max(0px,calc(100lvh-100dvh))]",
      "[--feed-chrome-top:calc(env(safe-area-inset-top)+4rem)] [--feed-chrome-bottom:calc(env(safe-area-inset-bottom)+var(--header-height)+var(--feed-browser-occlusion))]",
      "md:[--feed-browser-occlusion:0px] md:[--feed-chrome-bottom:0px] md:[--feed-chrome-top:0px]",
    )}>
      {item.media.orientation === "landscape" && item.media.posterSrc ? (
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
            style={{ transform: "translateY(calc(var(--feed-browser-occlusion) / -2))" }}
            loop
            muted={muted}
            playsInline
            poster={item.media.posterSrc || undefined}
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
            onError={() => {
              if (impressionRef.current) impressionRef.current.playbackError = true;
            }}
            onPlaying={() => {
              if (!impressionRef.current) return;
              impressionRef.current.autoplayBlocked = false;
              impressionRef.current.playbackStarted = true;
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
            style={{ transform: "translateY(calc(var(--feed-browser-occlusion) / -2))" }}
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
            aria-label={paused || autoplayBlocked ? "Play video" : "Pause video"}
            className="absolute inset-0 grid cursor-pointer place-items-center text-white"
            data-video-play-control
            onClick={() => {
              if (suppressNextPlaybackClickRef.current) {
                suppressNextPlaybackClickRef.current = false;
                return;
              }
              togglePlaybackFromControl();
            }}
            onMouseDown={(event) => event.preventDefault()}
            onPointerCancel={cancelLongPress}
            onPointerDown={startLongPress}
            onPointerMove={moveLongPress}
            onPointerUp={cancelLongPress}
            type="button"
          >
            {paused || autoplayBlocked ? <Play className="size-14 drop-shadow-md" weight="fill" /> : <span className="sr-only"><Pause />Pause</span>}
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
          Mobile keeps sound in the top-left and opens overflow by long press. These render after the
          full-frame play control so clicks reach them instead of toggling playback.
        */}
        {mediaMounted ? (
          <div className="absolute left-3 top-[calc(var(--feed-chrome-top)+0.75rem)] z-10 block opacity-100 transition-opacity duration-150 md:top-3 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
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
            {displayedCaption ? (
              <Type
                className="line-clamp-2"
                dir={displayedCaptionDir ?? "auto"}
                lang={displayedCaptionLang}
                variant="body"
              >
                {displayedCaption}
              </Type>
            ) : null}
            {item.translation ? (
              <button
                aria-pressed={showOriginalCaption}
                className="rounded-sm text-left text-white/80 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                onClick={() => setShowOriginalCaption((current) => !current)}
                type="button"
              >
                <Type as="span" className="text-inherit" variant="caption">
                  {showOriginalCaption
                    ? item.translation.showTranslationLabel
                    : item.translation.showOriginalLabel}
                </Type>
              </button>
            ) : null}
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
            ) : null}
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
                if (action === "previous") onMoveTo(itemPosition - 1);
                if (action === "next") onMoveTo(itemPosition + 1);
                if (action === "toggle") togglePlaybackFromControl();
              }}
              step="0.1"
              type="range"
            />
          </div>
        ) : null}
        </div>

        <div className="absolute bottom-[calc(var(--feed-chrome-bottom)+1.25rem)] right-3 z-10 flex flex-col items-center gap-3 md:static">
          {/* Missing images deliberately use Avatar's canonical generated ghost. */}
          {item.publisher.href ? (
            <a className="rounded-full shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" href={item.publisher.href}>
              <span
                aria-label={`Publisher ${item.publisher.handle}`}
                className="block rounded-full ring-2 ring-white"
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
              className="rounded-full shadow-md ring-2 ring-white"
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
          {item.publisher.relationship?.kind === "follow" ? (
            <div className="-mt-5 size-6" data-video-publisher-relationship-slot>
              {active ? (
                <ProfilePublisherRelationship
                  followLabel={followLabel}
                  followingLabel={followingLabel}
                  ownProfile={item.publisher.relationship.ownProfile}
                  targetUserId={item.publisher.relationship.targetUserId}
                  targetWalletAddress={item.publisher.relationship.targetWalletAddress}
                />
              ) : item.publisher.relationship.ownProfile ? null : (
                <span
                  aria-hidden
                  className="grid size-6 place-items-center rounded-full bg-destructive text-white shadow-md"
                  data-video-publisher-relationship-placeholder
                >
                  <Plus className="size-4" weight="bold" />
                </span>
              )}
            </div>
          ) : item.publisher.relationship?.kind === "join" ? (
            <div className="-mt-5 size-6" data-video-publisher-relationship-slot>
              <PublisherRelationshipButton
                active={item.publisher.relationship.active}
                disabled={item.publisher.relationship.disabled}
                label={item.publisher.relationship.label}
                onClick={() => onPublisherRelationship?.(item)}
                pending={item.publisher.relationship.pending}
              />
            </div>
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
            value={compactCount(item.likeCount, locale)}
          />
          <VideoAction
            icon={<ChatCircle className="size-6" data-video-icon-weight="fill" weight="fill" />}
            label="Comments"
            // Reading a public thread is not a gated interaction. Authentication and membership
            // are requested by the composer only when the viewer tries to write.
            onClick={() => onComment?.(item)}
            value={compactCount(item.commentCount, locale)}
          />
          {item.booking?.hasAvailableSlot && item.booking.startingPriceCents !== null && onBook ? (
            <VideoAction
              icon={<CalendarCheck className="size-6" data-video-icon-weight="fill" weight="fill" />}
              label="Book"
              onClick={() => runPlaybackInteraction(onBook)}
              value={formatCentsAsStartingUsd(item.booking.startingPriceCents)}
            />
          ) : null}
          {/* A linked song's age gate does not label the post itself: Study/Sing render
              normally and the tap handlers open the verification flow when required. */}
          <CapabilityAction capability={item.study} icon={<BookOpen className="size-6" data-video-icon-weight="fill" weight="fill" />} label="Study" onClick={() => runPlaybackInteraction(onStudy)} rewardLabel={item.rewards?.study?.amountLabel} />
          <CapabilityAction capability={item.karaoke} icon={<MicrophoneStage className="size-6" data-video-icon-weight="fill" weight="fill" />} label="Sing" onClick={() => runPlaybackInteraction(onKaraoke)} rewardLabel={item.rewards?.karaoke?.amountLabel} />
          <div className="hidden md:block">
            {item.shareActions?.length ? (
              <VideoShareSurface actions={item.shareActions}>
                <IconButton
                  aria-label="Share"
                  className="bg-transparent text-white drop-shadow-[0_1px_2px_rgb(0_0_0/0.65)] hover:bg-white/15 [&_svg]:size-7 md:bg-white/10 md:shadow-md md:drop-shadow-none md:hover:bg-white/20 md:[&_svg]:size-6"
                  variant="ghost"
                >
                  <ShareFat className="size-7 md:size-6" data-video-icon-weight="fill" weight="fill" />
                </IconButton>
              </VideoShareSurface>
            ) : (
              <VideoAction
                icon={<ShareFat className="size-7 md:size-6" data-video-icon-weight="fill" weight="fill" />}
                label="Share"
                onClick={onShare ? () => onShare(item) : undefined}
              />
            )}
          </div>
          <div className="grid size-11 place-items-center md:hidden">
            {item.song?.songHref && item.song.artworkSrc ? (
              <a
                aria-label={`Open audio: ${item.song.title}`}
                className="grid size-10 animate-spin place-items-center overflow-hidden rounded-full border-4 border-background bg-card shadow-sm motion-reduce:animate-none"
                data-video-audio-disc
                href={item.song.songHref}
                onClick={(event) => {
                  event.preventDefault();
                  runSongNavigation();
                }}
                style={{ animationDuration: "8s" }}
              >
                <img
                  alt=""
                  className="size-full object-cover"
                  src={item.song.artworkSrc}
                />
              </a>
            ) : null}
          </div>
          {/* Mobile opens overflow by long-pressing the video; desktop keeps the hover-corner menu. */}
          <div className="md:hidden">
            <ActionMenu
              items={overflowItems}
              label="More video actions"
              onAction={runOverflowAction}
              onOpenChange={setMobileOverflowOpen}
              open={mobileOverflowOpen}
              mobilePresentation="gesture"
              title="Video actions"
              trigger={(
                <button
                  aria-label="More video actions"
                  className="sr-only"
                  type="button"
                >
                  More video actions
                </button>
              )}
            />
          </div>
        </div>
      </div>
    </article>
  );
});

export function VideoFeed({
  externallyPausedItemId,
  className,
  downvoteLabel = "Downvote",
  followLabel = "Follow",
  followingLabel = "Following",
  feedRequestId,
  initialItemId,
  initialMuted,
  initialPaused = false,
  initialPlaybackSeconds,
  items,
  locale = "en",
  muteVideoLabel = "Mute video",
  navigationHidden = false,
  nextVideoLabel = "Next video",
  previousVideoLabel = "Previous video",
  removeDownvoteLabel = "Remove downvote",
  soundOnLabel = "Sound on",
  tapForSoundLabel = "Tap for sound",
  videoProgressLabel = "Video progress",
  onSlideRender,
  ...actions
}: VideoFeedProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const scrollSettleTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoredInitialItemIdRef = React.useRef<string | null>(null);
  // Restore-effect misses per target: after enough of them the target is treated as never
  // arriving (its page may never load) and its pending render slot is released.
  const restoreAttemptsRef = React.useRef<{ count: number; itemId: string | null }>({ count: 0, itemId: null });
  const [givenUpRestoreItemId, setGivenUpRestoreItemId] = React.useState<string | null>(null);
  const initialIndex = Math.max(0, items.findIndex((item) => item.id === initialItemId));
  const [activeIndex, setActiveIndex] = React.useState(initialIndex);
  const activeIndexRef = React.useRef(initialIndex);
  const localFeedRequestIdRef = React.useRef(`feed_${crypto.randomUUID().replaceAll("-", "")}`);
  const effectiveFeedRequestId = feedRequestId ?? localFeedRequestIdRef.current;
  const activationFeedRequestIdRef = React.useRef(effectiveFeedRequestId);
  const activationSequenceByItemRef = React.useRef(new Map<string, number>());
  const impressionIdentityByItemRef = React.useRef(new Map<string, VideoFeedImpressionIdentity>());
  const activeActivationItemIdRef = React.useRef<string | null>(null);
  if (activationFeedRequestIdRef.current !== effectiveFeedRequestId) {
    activationFeedRequestIdRef.current = effectiveFeedRequestId;
    activationSequenceByItemRef.current.clear();
    impressionIdentityByItemRef.current.clear();
    activeActivationItemIdRef.current = null;
  }
  const activateItem = React.useCallback((itemId: string): VideoFeedImpressionIdentity => {
    if (activeActivationItemIdRef.current === itemId) {
      const existing = impressionIdentityByItemRef.current.get(itemId);
      if (existing) return existing;
    }
    const sequence = (activationSequenceByItemRef.current.get(itemId) ?? 0) + 1;
    activationSequenceByItemRef.current.set(itemId, sequence);
    const identity = {
      eventId: videoImpressionEventId(effectiveFeedRequestId, itemId, sequence),
      feedRequestId: effectiveFeedRequestId,
      slideEntrySequence: sequence,
    };
    impressionIdentityByItemRef.current.set(itemId, identity);
    activeActivationItemIdRef.current = itemId;
    return identity;
  }, [effectiveFeedRequestId]);
  const initialActiveItem = items[initialIndex];
  if (initialActiveItem && activeActivationItemIdRef.current === null) activateItem(initialActiveItem.id);
  const [documentHidden, setDocumentHidden] = React.useState(false);
  const [pausedItemIds, setPausedItemIds] = React.useState<Set<string>>(() => initialPaused && initialItemId ? new Set([initialItemId]) : new Set());
  const [autoplayBlockedItemIds, setAutoplayBlockedItemIds] = React.useState<Set<string>>(() => new Set());
  const [userStartedItemIds, setUserStartedItemIds] = React.useState<Set<string>>(() => new Set());
  const [reduceMotion, setReduceMotion] = React.useState(false);
  const [preferenceMuted, setPreferenceMuted] = React.useState(() => initialMuted ?? readStoredMutedPreference() ?? false);
  const hasShownSoundPromptRef = React.useRef(false);
  // Autoplay always begins muted. We only clear this after an unmuted play() has resolved.
  const [muted, setMuted] = React.useState(true);
  const [recentItemIds, setRecentItemIds] = React.useState<string[]>(() => {
    const initial = items[initialIndex];
    return initial ? [initial.id] : [];
  });
  // Until the restore layout effect commits, its target can sit outside the render window
  // (e.g. the item arrived with a later page); keep it rendered so restoration never blanks.
  const pendingRestoreItemId = initialItemId
    && restoredInitialItemIdRef.current !== initialItemId
    && givenUpRestoreItemId !== initialItemId
    ? initialItemId
    : null;

  React.useEffect(() => {
    const activeItem = items[activeIndex];
    if (!activeItem) return;
    // Bail out when the active slide is already most-recent: a fresh array would re-render the
    // feed and recompute render-scoped state such as the sound prompt's one-shot eligibility.
    setRecentItemIds((current) => current[0] === activeItem.id
      ? current
      : [activeItem.id, ...current.filter((id) => id !== activeItem.id)].slice(0, VIDEO_FEED_KEEP_ALIVE_MEDIA_COUNT));
  }, [activeIndex, items]);

  React.useLayoutEffect(() => {
    if (!initialItemId || restoredInitialItemIdRef.current === initialItemId) return;
    // The target may never arrive (its page may never load). After enough misses, give up so the
    // pending render slot is not held for the rest of the session.
    const attempts = restoreAttemptsRef.current.itemId === initialItemId
      ? restoreAttemptsRef.current
      : { count: 0, itemId: initialItemId };
    attempts.count += 1;
    restoreAttemptsRef.current = attempts;
    if (attempts.count > VIDEO_FEED_RESTORE_MAX_ATTEMPTS) {
      restoredInitialItemIdRef.current = initialItemId;
      setGivenUpRestoreItemId(initialItemId);
      return;
    }
    let frame: number | null = null;
    const restore = () => {
      const container = containerRef.current;
      const restoredIndex = items.findIndex((item) => item.id === initialItemId);
      if (!container || restoredIndex < 0) return;
      // A newly mounted dvh container can report zero before its first layout. Committing the
      // restoration at that point leaves activeIndex pointing at a different slide than the one
      // physically visible, so the visible video never receives active preload/playback.
      if (container.clientHeight <= 0) {
        frame = window.requestAnimationFrame(restore);
        return;
      }
      restoredInitialItemIdRef.current = initialItemId;
      activeIndexRef.current = restoredIndex;
      activateItem(initialItemId);
      setActiveIndex(restoredIndex);
      if (restoredIndex > 0) container.scrollTop = restoredIndex * container.clientHeight;
    };
    restore();
    return () => {
      if (frame != null) window.cancelAnimationFrame(frame);
    };
  }, [activateItem, initialItemId, items]);

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
    if (!container) return;
    container.scrollTo({ behavior: reduceMotion ? "auto" : "smooth", top: nextIndex * container.clientHeight });
    const nextItem = items[nextIndex];
    if (nextItem && (activeIndexRef.current !== nextIndex || activeActivationItemIdRef.current !== nextItem.id)) {
      activeIndexRef.current = nextIndex;
      activateItem(nextItem.id);
    }
    setActiveIndex(nextIndex);
  }, [activateItem, items, reduceMotion]);

  const commitSettledIndex = React.useCallback(() => {
    const container = containerRef.current;
    if (!container || container.clientHeight <= 0) return;
    const nextIndex = Math.max(0, Math.min(
      items.length - 1,
      Math.round(container.scrollTop / container.clientHeight),
    ));
    const nextItem = items[nextIndex];
    if (nextItem && (activeIndexRef.current !== nextIndex || activeActivationItemIdRef.current !== nextItem.id)) {
      activeIndexRef.current = nextIndex;
      activateItem(nextItem.id);
    }
    setActiveIndex(nextIndex);
  }, [activateItem, items]);

  const scheduleSettledIndex = React.useCallback(() => {
    if (scrollSettleTimerRef.current) clearTimeout(scrollSettleTimerRef.current);
    scrollSettleTimerRef.current = setTimeout(() => {
      scrollSettleTimerRef.current = null;
      commitSettledIndex();
    }, 120);
  }, [commitSettledIndex]);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onScrollEnd = () => {
      if (scrollSettleTimerRef.current) {
        clearTimeout(scrollSettleTimerRef.current);
        scrollSettleTimerRef.current = null;
      }
      commitSettledIndex();
    };
    container.addEventListener("scrollend", onScrollEnd);
    return () => {
      container.removeEventListener("scrollend", onScrollEnd);
      if (scrollSettleTimerRef.current) clearTimeout(scrollSettleTimerRef.current);
    };
  }, [commitSettledIndex]);

  const setAutoplayBlocked = React.useCallback((itemId: string, blocked: boolean) => {
    setAutoplayBlockedItemIds((current) => {
      if (current.has(itemId) === blocked) return current;
      const next = new Set(current);
      if (blocked) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
  }, []);

  const togglePlayback = React.useCallback((item: VideoFeedItem) => {
    if (autoplayBlockedItemIds.has(item.id)) {
      setAutoplayBlockedItemIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    } else {
      setPausedItemIds((current) => {
        const next = new Set(current);
        if (next.has(item.id)) next.delete(item.id);
        else next.add(item.id);
        return next;
      });
    }
    setUserStartedItemIds((current) => new Set(current).add(item.id));
  }, [autoplayBlockedItemIds]);

  const toggleMute = React.useCallback((video: HTMLVideoElement | null) => {
    // Brave can change the media element's effective mute state independently of React while
    // restoring autoplay or moving between mounted slides. Use the element as the source of truth
    // for a direct user gesture so every tap toggles what the viewer is actually hearing.
    const effectivelyMuted = video?.muted ?? muted;
    if (!effectivelyMuted) {
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
    return <div className="grid h-lvh place-items-center md:h-dvh"><Type variant="h3">No videos yet</Type></div>;
  }

  const impressionIdentityForItem = (itemId: string): VideoFeedImpressionIdentity => {
    const existing = impressionIdentityByItemRef.current.get(itemId);
    if (existing) return existing;
    const inactiveIdentity = {
      eventId: videoImpressionEventId(effectiveFeedRequestId, itemId, 0),
      feedRequestId: effectiveFeedRequestId,
      slideEntrySequence: 0,
    };
    impressionIdentityByItemRef.current.set(itemId, inactiveIdentity);
    return inactiveIdentity;
  };

  return (
    <div className={cn("relative h-lvh w-full md:h-dvh", className)}>
    <div
      ref={containerRef}
      aria-label="Video feed"
      className="h-full w-full snap-y snap-mandatory overflow-y-auto overscroll-y-contain"
      data-active-index={activeIndex}
      onScroll={() => {
        // Playback and media mounting should follow the settled snap position, not oscillate as
        // the viewport crosses a midpoint. `scrollend` handles modern browsers; the timer is the
        // fallback for older Safari and interrupted programmatic scrolls.
        scheduleSettledIndex();
      }}
      tabIndex={0}
    >
      {items.map((item, index) => (
        <div className="h-full snap-start snap-always" key={item.id}>
          {shouldRenderVideoFeedSlide({
            activeIndex,
            index,
            itemId: item.id,
            pendingRestoreItemId,
            recentItemIds,
          }) ? (
            <VideoFeedSlide
              {...actions}
              active={index === activeIndex}
              allowAutoplay={!documentHidden && (!reduceMotion || userStartedItemIds.has(item.id))}
              autoplayBlocked={autoplayBlockedItemIds.has(item.id)}
              downvoteLabel={downvoteLabel}
              followLabel={followLabel}
              followingLabel={followingLabel}
              item={item}
              itemPosition={index}
              locale={locale}
              impressionIdentity={impressionIdentityForItem(item.id)}
              impressionVisible={index === activeIndex && !documentHidden}
              intentionalPaused={pausedItemIds.has(item.id)}
              initialPlaybackSeconds={item.id === initialItemId ? initialPlaybackSeconds : undefined}
              mountMedia={Math.abs(index - activeIndex) <= 1 || recentItemIds.includes(item.id)}
              muteVideoLabel={muteVideoLabel}
              onAutoplayBlockedChange={setAutoplayBlocked}
              onSoundPromptShown={markSoundPromptShown}
              onSlideRender={onSlideRender}
              onMoveTo={moveTo}
              onToggleMute={toggleMute}
              onTogglePlayback={togglePlayback}
              muted={muted}
              preferenceMuted={preferenceMuted}
              paused={pausedItemIds.has(item.id) || externallyPausedItemId === item.id}
              preload={index === activeIndex ? "auto" : Math.abs(index - activeIndex) === 1 ? "metadata" : "none"}
              removeDownvoteLabel={removeDownvoteLabel}
              soundOnLabel={soundOnLabel}
              soundPromptEligible={!hasShownSoundPromptRef.current}
              tapForSoundLabel={tapForSoundLabel}
              videoProgressLabel={videoProgressLabel}
            />
          ) : (
            <VideoFeedSlideShell item={item} />
          )}
        </div>
      ))}
    </div>
      {!navigationHidden ? (
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
      ) : null}
    </div>
  );
}
