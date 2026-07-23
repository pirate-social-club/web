"use client";

import * as React from "react";
import {
  ArrowFatDown,
  BookOpen,
  CalendarCheck,
  ChatCircle,
  CurrencyDollar,
  DotsThree,
  Heart,
  Lock,
  MicrophoneStage,
  Pause,
  Play,
  ShareNetwork,
  SpeakerHigh,
  SpeakerSlash,
  User,
} from "@phosphor-icons/react";

import { Avatar } from "@/components/primitives/avatar";
import { ActionMenu } from "@/components/primitives/action-menu";
import { formatCentsAsUsdc } from "@/components/compositions/bookings/fixtures/bookings-format";
import { IconButton } from "@/components/primitives/icon-button";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";
import type { VideoFeedCapability, VideoFeedItem } from "./video-feed.types";

export interface VideoFeedProps {
  /**
   * Id of the item whose booking overlay is open. That item pauses while the overlay is up and
   * returns to whatever playback state it had once this clears — the feed is never re-ordered or
   * remounted, so the viewer comes back to the same frame.
   */
  bookingOpenItemId?: string;
  className?: string;
  downvoteLabel?: string;
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
  onShare?: (item: VideoFeedItem) => void;
  onSong?: (item: VideoFeedItem, state: VideoFeedPlaybackState) => void;
  onStudy?: (item: VideoFeedItem, state: VideoFeedPlaybackState) => void;
  muteVideoLabel?: string;
  removeDownvoteLabel?: string;
  soundOnLabel?: string;
  tapForSoundLabel?: string;
}

export interface VideoFeedPlaybackState {
  muted: boolean;
  paused: boolean;
  playbackSeconds: number;
}

export const VIDEO_FEED_MUTED_PREFERENCE_KEY = "pirate.video-feed.muted";

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

function VideoAction({
  active,
  disabled,
  icon,
  label,
  onClick,
  rewardLabel,
  tone = "action",
  value,
}: {
  active?: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  rewardLabel?: string;
  tone?: "action" | "social";
  value?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1" data-video-action-tone={tone}>
      <div className="relative">
        <IconButton
          active={active}
          aria-label={label}
          className={tone === "social"
            ? "bg-transparent text-white drop-shadow-[0_2px_3px_rgb(0_0_0/0.9)] hover:bg-black/25 data-[active=true]:bg-transparent data-[active=true]:text-destructive data-[active=true]:hover:bg-black/25"
            : "border border-border-soft bg-card/85 shadow-md backdrop-blur hover:bg-card"}
          disabled={disabled}
          onClick={onClick}
          variant={tone === "social" ? "ghost" : "secondary"}
        >
          {icon}
        </IconButton>
        {rewardLabel ? (
          <span aria-label={`Earn ${rewardLabel}`} className="absolute -right-2 -top-2 inline-flex min-h-5 items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground shadow-sm">
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
      icon={capability === "locked" ? <Lock className="size-5" weight="fill" /> : icon}
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
  item,
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
  onShare,
  onSong,
  onSoundPromptShown,
  onToggleMute,
  onStudy,
  onTogglePlayback,
  muted,
  preferenceMuted,
  soundOnLabel,
  soundPromptEligible,
  tapForSoundLabel,
  muteVideoLabel,
  initialPlaybackSeconds,
}: Omit<VideoFeedProps, "downvoteLabel" | "initialItemId" | "initialMuted" | "initialPaused" | "initialPlaybackSeconds" | "items" | "muteVideoLabel" | "removeDownvoteLabel" | "soundOnLabel" | "tapForSoundLabel"> & {
  active: boolean;
  allowAutoplay: boolean;
  downvoteLabel: string;
  item: VideoFeedItem;
  mountMedia: boolean;
  muteVideoLabel: string;
  onSoundPromptShown: () => void;
  onToggleMute: (video: HTMLVideoElement | null) => void;
  onTogglePlayback: (item: VideoFeedItem) => void;
  muted: boolean;
  preferenceMuted: boolean;
  paused: boolean;
  preload: "auto" | "metadata";
  removeDownvoteLabel: string;
  soundOnLabel: string;
  soundPromptEligible: boolean;
  tapForSoundLabel: string;
  initialPlaybackSeconds?: number;
}) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const ageBlocked = item.viewerState === "age_proof_required";
  const hasPlayableSource = !ageBlocked && Boolean(item.media.src);
  const mediaMounted = mountMedia && hasPlayableSource;
  const [showSoundPrompt, setShowSoundPrompt] = React.useState(false);

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
          src={item.media.posterSrc}
        />
      ) : null}
      <div className="relative flex size-full items-center justify-center md:gap-4">
        <div className={cn(
          "relative h-full w-full overflow-hidden bg-black md:rounded-[var(--radius-xl)]",
          item.media.orientation === "portrait"
            ? "md:h-[min(88dvh,50rem)] md:w-[min(49.5dvh,28rem)] md:max-w-[calc(100%-4rem)]"
            : "md:h-auto md:max-h-[min(88dvh,50rem)] md:w-[min(72vw,64rem)] md:max-w-[calc(100%-4rem)] md:aspect-video",
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
          />
        ) : item.media.posterSrc ? (
          <img
            alt={item.song?.title ?? item.caption ?? "Video poster"}
            className={cn("size-full", item.media.orientation === "portrait" ? "object-cover" : "object-contain")}
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

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-5 pb-[calc(var(--feed-chrome-bottom)+1.25rem)] pt-24 text-white">
          <div className="pointer-events-auto max-w-[calc(100%-4.5rem)] space-y-2">
            <div className="flex items-center gap-2">
              <Type variant="body-strong">
                {item.publisher.handle}
              </Type>
            </div>
            {item.caption ? <Type className="line-clamp-2" variant="body">{item.caption}</Type> : null}
            {item.song ? (
              item.song.songHref && onSong ? (
                <button
                  aria-label={`Open ${item.song.title} by ${item.song.artist}`}
                  className="cursor-pointer text-left text-white/80 underline decoration-white/60 underline-offset-4 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
        </div>

        <div className="absolute bottom-[calc(var(--feed-chrome-bottom)+1.25rem)] right-3 z-10 flex flex-col items-center gap-3 md:static">
          {/*
            The ring separates the avatar from arbitrary video behind it. The neutral fallback icon
            suppresses the generated identicon, whose saturated colours read as a UI element rather
            than a person once they sit on top of media.
          */}
          <div
            aria-label={`Publisher ${item.publisher.handle}`}
            className="rounded-full ring-2 ring-white/90 shadow-md"
            data-video-publisher-avatar
            role="img"
          >
            <Avatar
              fallback={item.publisher.handle}
              fallbackIcon={(
                <span className="grid size-full place-items-center rounded-full bg-black/70 text-white">
                  <User aria-hidden className="size-5" weight="fill" />
                </span>
              )}
              size="md"
              src={item.publisher.avatarSrc}
            />
          </div>
          <VideoAction
            active={item.liked}
            icon={<Heart className="size-7" weight={item.liked ? "fill" : "regular"} />}
            label="Like"
            onClick={() => runInteraction(onLike)}
            tone="social"
            value={compactCount(item.likeCount)}
          />
          <VideoAction
            icon={<ChatCircle className="size-7" weight="fill" />}
            label="Comments"
            onClick={() => runInteraction(onComment)}
            tone="social"
            value={compactCount(item.commentCount)}
          />
          {item.booking && onBook ? (
            <VideoAction
              icon={<CalendarCheck className="size-5" weight="fill" />}
              label="Book"
              onClick={() => runPlaybackInteraction(onBook)}
              value={formatCentsAsUsdc(item.booking.basePriceCents)}
            />
          ) : null}
          <CapabilityAction capability={item.study} icon={<BookOpen className="size-5" weight="fill" />} label="Study" onClick={() => runPlaybackInteraction(onStudy)} rewardLabel={item.rewards?.study?.amountLabel} />
          <CapabilityAction capability={item.karaoke} icon={<MicrophoneStage className="size-5" weight="fill" />} label="Sing" onClick={() => runPlaybackInteraction(onKaraoke)} rewardLabel={item.rewards?.karaoke?.amountLabel} />
          <VideoAction
            icon={<ShareNetwork className="size-7" weight="fill" />}
            label="Share"
            onClick={() => onShare?.(item)}
            tone="social"
          />
          {/*
            Overflow renders on every slide so the rail keeps a stable height between videos.
            Downvote lives here rather than in the rail: it is low-frequency, and a seventh
            persistent action would push the rail into the caption.
          */}
          <ActionMenu
            items={[
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
            ]}
            label="More video actions"
            onAction={(key) => {
              if (key === "boost") onBoost?.(item);
              if (key === "downvote") runInteraction(onDownvote);
              if (key === "sound") onToggleMute(videoRef.current);
            }}
            title="Video actions"
            trigger={(
              <IconButton
                aria-label="More video actions"
                className="text-white drop-shadow-md hover:bg-white/15"
                data-video-overflow-trigger
                variant="ghost"
              >
                <DotsThree className="size-7" weight="bold" />
              </IconButton>
            )}
          />
        </div>
      </div>
    </article>
  );
}

export function VideoFeed({
  bookingOpenItemId,
  className,
  downvoteLabel = "Downvote",
  initialItemId,
  initialMuted,
  initialPaused = false,
  initialPlaybackSeconds,
  items,
  muteVideoLabel = "Mute video",
  removeDownvoteLabel = "Remove downvote",
  soundOnLabel = "Sound on",
  tapForSoundLabel = "Tap for sound",
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
    <div
      ref={containerRef}
      aria-label="Video feed"
      className={cn("h-dvh w-full snap-y snap-mandatory overflow-y-auto overscroll-y-contain", className)}
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
            item={item}
            initialPlaybackSeconds={item.id === initialItemId ? initialPlaybackSeconds : undefined}
            mountMedia={Math.abs(index - activeIndex) <= 2}
            muteVideoLabel={muteVideoLabel}
            onSoundPromptShown={markSoundPromptShown}
            onToggleMute={toggleMute}
            onTogglePlayback={togglePlayback}
            muted={muted}
            preferenceMuted={preferenceMuted}
            paused={pausedItemIds.has(item.id) || bookingOpenItemId === item.id}
            preload={Math.abs(index - activeIndex) <= 1 ? "auto" : "metadata"}
            removeDownvoteLabel={removeDownvoteLabel}
            soundOnLabel={soundOnLabel}
            soundPromptEligible={!hasShownSoundPromptRef.current}
            tapForSoundLabel={tapForSoundLabel}
          />
        </div>
      ))}
    </div>
  );
}
