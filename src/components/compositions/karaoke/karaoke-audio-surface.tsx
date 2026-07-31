import * as React from "react";
import { KARAOKE_TIMING_SCORING_ENABLED } from "@pirate-social-club/karaoke-runtime";

import { Button } from "@/components/primitives/button";
import { Type } from "@/components/primitives/type";
import { addNavigationGuard } from "@/app/router";
import { cn } from "@/lib/utils";

import {
  KaraokePracticeSurface,
  type KaraokePracticeCompleteSummary,
} from "./karaoke-practice-surface";
import { deriveKaraokeFeedback } from "./karaoke-scoring-feedback";
import { clampKaraokeLinesToDuration, getLyricDurationMs } from "./karaoke-timing";
import type { KaraokeStageLine } from "./karaoke-lyric-stage";
import { KaraokeSignInCta } from "./karaoke-signin-cta";
import { KaraokeScoreSummary } from "./scoring/karaoke-score-summary";
import { KaraokeScoringPanel } from "./scoring/karaoke-scoring-panel";
import type { UseKaraokeScoringResult } from "./scoring/use-karaoke-scoring-session";

type AudioState = "error" | "loading" | "ready";
const exitConfirmationMessage = "Stop karaoke and leave this song?";
// Total instrumental load attempts before surfacing the permanent error state
// (1 initial + 2 retries). Covers transient artifact-proxy failures (e.g. a
// 502 from the upstream object store) without looping forever.
const MAX_LOAD_ATTEMPTS = 3;
const LOAD_RETRY_BASE_DELAY_MS = 400;

export interface KaraokeAudioSurfaceProps {
  artworkSrc?: string;
  artistName?: string;
  className?: string;
  driftWarningThresholdMs?: number;
  initialTimeMs?: number;
  instrumentalAudioUrl?: string;
  leaderboardSlot?: React.ReactNode;
  lines: KaraokeStageLine[];
  rewardSlot?: React.ReactNode;
  onComplete?: (summary: KaraokePracticeCompleteSummary) => void;
  onExit?: () => void;
  onViewScores?: () => void;
  onTimingOffsetReset?: () => void;
  /**
   * Logged-out auth prompt. When true (and scoring is not enabled), the scoring-panel
   * slot renders a "Sing" call-to-action instead of nothing, so the page is never a
   * dead-end for unauthenticated visitors.
   */
  showSignInCta?: boolean;
  /** Triggers the auth flow when the logged-out "Sing" CTA is clicked. */
  onRequestSignIn?: () => void;
  /** True while the auth flow is mounting/opening. */
  signInBusy?: boolean;
  /** True when auth cannot be offered (Privy not configured or failed to load). */
  signInUnavailable?: boolean;
  /** Optional real-time scoring orchestration (Phase 5.3). Inert when omitted. */
  scoring?: UseKaraokeScoringResult;
  timingOffsetMs?: number;
  title: string;
}

function getAudioDurationMs(audio: HTMLAudioElement | null): number | undefined {
  if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) {
    return undefined;
  }

  return Math.round(audio.duration * 1000);
}

function canUseMediaSession(): boolean {
  return typeof navigator !== "undefined"
    && typeof window !== "undefined"
    && "mediaSession" in navigator
    && "MediaMetadata" in window;
}

export function KaraokeAudioSurface({
  artworkSrc,
  artistName,
  className,
  driftWarningThresholdMs = 250,
  initialTimeMs = 0,
  instrumentalAudioUrl,
  leaderboardSlot,
  lines,
  onComplete,
  onExit,
  onRequestSignIn,
  onTimingOffsetReset,
  onViewScores,
  rewardSlot,
  scoring,
  showSignInCta = false,
  signInBusy = false,
  signInUnavailable = false,
  timingOffsetMs = 0,
  title,
}: KaraokeAudioSurfaceProps) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const frameRef = React.useRef<number | null>(null);
  const wasPlayingBeforeHiddenRef = React.useRef(false);
  // Latest scoring result in a ref so the stable playback callbacks below can
  // notify the orchestrator without taking it as a dependency (its identity
  // changes on every state update). The controls themselves are stable + safe
  // to call when scoring is disabled (they no-op).
  const scoringRef = React.useRef(scoring);
  scoringRef.current = scoring;
  // True between "Score my singing" and the first `active` (mic-live) status.
  // The instrumental is held until the mic is actually listening — see effect.
  const pendingPlayRef = React.useRef(false);
  const playAudioRef = React.useRef<() => void>(() => {});
  const [audioState, setAudioState] = React.useState<AudioState>("loading");
  const [audioDurationMs, setAudioDurationMs] = React.useState<number | undefined>(undefined);
  const [currentTimeMs, setCurrentTimeMs] = React.useState(initialTimeMs);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const fallbackDurationMs = React.useMemo(() => getLyricDurationMs(lines), [lines]);
  const durationMs = getLyricDurationMs(lines, audioDurationMs);
  const displayLines = React.useMemo(
    () => clampKaraokeLinesToDuration(lines, audioDurationMs),
    [audioDurationMs, lines],
  );
  const displayTimeMs = Math.max(0, Math.min(durationMs, currentTimeMs + timingOffsetMs));
  const showDriftWarning = Math.abs(timingOffsetMs) > driftWarningThresholdMs;

  const stopFrame = React.useCallback(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  const syncFromAudio = React.useCallback(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    setCurrentTimeMs(audio.currentTime * 1000);
    scoringRef.current?.controls.noteTime(audio.currentTime * 1000);

    if (!audio.paused && !audio.ended) {
      frameRef.current = window.requestAnimationFrame(syncFromAudio);
    }
  }, []);

  const pauseAudio = React.useCallback(() => {
    const audio = audioRef.current;

    stopFrame();
    audio?.pause();
    setIsPlaying(false);
    if (audio) {
      setCurrentTimeMs(audio.currentTime * 1000);
      scoringRef.current?.controls.notePause(audio.currentTime * 1000);
    }
  }, [stopFrame]);

  const playAudio = React.useCallback(async () => {
    const audio = audioRef.current;

    if (!audio || audioState !== "ready") {
      return;
    }

    if (audio.ended || audio.currentTime * 1000 >= durationMs) {
      audio.currentTime = 0;
      setCurrentTimeMs(0);
    }

    try {
      await audio.play();
      setIsPlaying(true);
      scoringRef.current?.controls.notePlay(audio.currentTime * 1000);
      stopFrame();
      frameRef.current = window.requestAnimationFrame(syncFromAudio);
    } catch {
      setIsPlaying(false);
      stopFrame();
      setAudioState(audio.error ? "error" : "ready");
    }
  }, [audioState, durationMs, stopFrame, syncFromAudio]);
  playAudioRef.current = playAudio;

  const seekAudio = React.useCallback((nextTimeMs: number) => {
    const audio = audioRef.current;
    const clampedTimeMs = Math.max(0, Math.min(durationMs, nextTimeMs));

    if (audio) {
      audio.currentTime = clampedTimeMs / 1000;
    }

    setCurrentTimeMs(clampedTimeMs);
    scoringRef.current?.controls.noteSeek(clampedTimeMs);
  }, [durationMs]);

  const confirmExit = React.useCallback(() => (
    !isPlaying
    || typeof window === "undefined"
    || window.confirm(exitConfirmationMessage)
  ), [isPlaying]);

  const exitAudio = React.useCallback(() => {
    if (!confirmExit()) {
      return;
    }

    pauseAudio();
    onExit?.();
  }, [confirmExit, onExit, pauseAudio]);

  // Begin (or retry) a scoring session from the current position. The mic is
  // acquired and the transport connected BEFORE playback starts — the
  // instrumental only advances once the socket reaches `active` (live), so the
  // user is never singing over music the server can't hear yet.
  const startScoring = React.useCallback(() => {
    const audio = audioRef.current;
    pendingPlayRef.current = true;
    scoringRef.current?.controls.start(audio ? audio.currentTime * 1000 : 0);
  }, []);

  // "Sing again" after a take ends: reset the playhead to the start, then begin a
  // fresh scoring take through the same orchestration as startScoring (no reload
  // or navigation). Playback is still held until the mic goes live.
  const restartScoring = React.useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = initialTimeMs / 1000;
    }
    setCurrentTimeMs(initialTimeMs);
    pendingPlayRef.current = true;
    scoringRef.current?.controls.start(initialTimeMs);
  }, [initialTimeMs]);

  // Hold playback until the mic is live. `pendingPlayRef` is set by
  // `startScoring` and cleared the first time scoring goes `active` (or on
  // terminal states so a stale flag never starts audio later).
  const scoringStatus = scoring?.state?.status ?? null;
  React.useEffect(() => {
    if (scoringStatus !== "active") {
      if (scoringStatus === "error" || scoringStatus === "idle") {
        pendingPlayRef.current = false;
      }
      return;
    }
    if (!pendingPlayRef.current) return;
    pendingPlayRef.current = false;
    if (!isPlaying) {
      void playAudioRef.current();
    }
  }, [scoringStatus, isPlaying]);

  React.useEffect(() => {
    const audio = audioRef.current;

    setAudioState("loading");
    setAudioDurationMs(undefined);
    setCurrentTimeMs(initialTimeMs);
    setIsPlaying(false);

    if (!audio || !instrumentalAudioUrl) {
      return undefined;
    }

    // Retry only load-time failures (transient artifact-proxy 502s, dropped
    // connections) with a short backoff. Once `canplay` fires we mark the
    // instrumental loaded and stop retrying — a later error is a mid-playback
    // problem, not a failed load, and retrying it would loop.
    let loadAttempt = 0;
    let hasLoaded = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const handleLoadedMetadata = () => {
      setAudioDurationMs(getAudioDurationMs(audio));

      if (initialTimeMs > 0 && Number.isFinite(audio.duration)) {
        audio.currentTime = Math.min(initialTimeMs / 1000, audio.duration);
      }
    };
    const handleCanPlay = () => {
      hasLoaded = true;
      // A retry scheduled by an earlier transient error is now moot — the
      // instrumental loaded. Cancel it so it can't reset us back to "loading".
      if (retryTimer !== null) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      setAudioState("ready");
      setAudioDurationMs(getAudioDurationMs(audio));
    };
    const handleError = () => {
      setIsPlaying(false);
      stopFrame();

      if (!hasLoaded && loadAttempt < MAX_LOAD_ATTEMPTS - 1) {
        loadAttempt += 1;
        retryTimer = setTimeout(() => {
          retryTimer = null;
          // The instrumental may have loaded between scheduling and firing.
          if (hasLoaded) return;
          setAudioState("loading");
          audio.src = instrumentalAudioUrl;
          audio.load();
        }, LOAD_RETRY_BASE_DELAY_MS * loadAttempt);
        return;
      }

      setAudioState("error");
    };
    const handleEnded = () => {
      setCurrentTimeMs((getAudioDurationMs(audio) ?? fallbackDurationMs));
      setIsPlaying(false);
      stopFrame();
      scoringRef.current?.controls.noteFinish(getAudioDurationMs(audio) ?? fallbackDurationMs);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("error", handleError);
    audio.addEventListener("ended", handleEnded);
    audio.src = instrumentalAudioUrl;
    audio.load();

    return () => {
      if (retryTimer !== null) {
        clearTimeout(retryTimer);
      }
      stopFrame();
      audio.pause();
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("ended", handleEnded);
      audio.removeAttribute("src");
      audio.load();
    };
  }, [fallbackDurationMs, initialTimeMs, instrumentalAudioUrl, stopFrame]);

  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        wasPlayingBeforeHiddenRef.current = isPlaying;
        pauseAudio();
        return;
      }

      if (wasPlayingBeforeHiddenRef.current) {
        wasPlayingBeforeHiddenRef.current = false;
        void playAudio();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isPlaying, pauseAudio, playAudio]);

  React.useEffect(() => {
    if (!isPlaying || typeof window === "undefined") {
      return undefined;
    }

    const removeNavigationGuard = addNavigationGuard(() => {
      if (window.confirm(exitConfirmationMessage)) {
        pauseAudio();
        return true;
      }

      return false;
    });
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const handlePopState = () => {
      if (window.confirm(exitConfirmationMessage)) {
        pauseAudio();
        return;
      }

      window.history.forward();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    return () => {
      removeNavigationGuard();
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isPlaying, pauseAudio]);

  React.useEffect(() => {
    if (!canUseMediaSession()) {
      return undefined;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      artist: artistName,
      artwork: artworkSrc ? [{ src: artworkSrc }] : undefined,
      title,
    });
    navigator.mediaSession.setActionHandler("play", () => {
      void playAudio();
    });
    navigator.mediaSession.setActionHandler("pause", pauseAudio);
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (typeof details.seekTime === "number") {
        seekAudio(details.seekTime * 1000);
      }
    });

    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("seekto", null);
      navigator.mediaSession.metadata = null;
    };
  }, [artistName, artworkSrc, pauseAudio, playAudio, seekAudio, title]);

  const feedback = React.useMemo(() => deriveKaraokeFeedback(scoring?.state ?? null), [scoring?.state]);
  const listening = scoringStatus === "active" || scoringStatus === "finishing";
  // The scoring panel lives in the footer for every state EXCEPT active
  // performance (lyrics + rating pops + header score are the feedback there).
  // Finishing is brief (awaiting summary) — keep lyrics visible, header pulses.
  const showScoringFooter = scoring?.enabled === true
    && scoringStatus !== null
    && scoringStatus !== "active"
    && scoringStatus !== "finishing"
    && scoringStatus !== "reconnecting";
  const scoringPanel = showScoringFooter && scoring.state ? (
    <KaraokeScoringPanel
      canStart={audioState === "ready"}
      className="w-full"
      onRestart={restartScoring}
      onStart={startScoring}
      onViewScores={onViewScores}
      state={scoring.state}
    />
  ) : null;
  // Footer keeps the scoring controls in their usual place (Start / Try again /
  // Sing again). On "ended" the final SCORE is shown centered on the stage; the
  // "Sing again" action stays in the footer.
  const endedSummary = scoringStatus === "ended" ? scoring?.state?.summary : null;
  const centerContent = endedSummary ? (
    <div className="flex w-full flex-col items-center gap-5">
      <KaraokeScoreSummary
        finalScore={endedSummary.finalScore}
        lyricsScore={endedSummary.lyricsScore ?? undefined}
        lineCount={endedSummary.lineCount ?? undefined}
        scoredLineCount={endedSummary.scoredLineCount ?? undefined}
        timingScore={endedSummary.timingScore ?? undefined}
        timingCalibrationUnavailable={
          KARAOKE_TIMING_SCORING_ENABLED && endedSummary.timingScore === null
        }
        timingCalibrationReason={endedSummary.timingCalibration.reason}
        timingTrend={endedSummary.timingTrend}
        uncertainLineCount={endedSummary.uncertainLineCount}
      />
      {leaderboardSlot}
    </div>
  ) : null;
  const footerContent = scoringPanel ?? (showSignInCta ? (
    <KaraokeSignInCta
      busy={signInBusy}
      className="w-full"
      onSignIn={onRequestSignIn}
      unavailable={signInUnavailable}
    />
  ) : null);

  return (
    <div className={cn("relative flex h-dvh w-full flex-col overflow-hidden", className)}>
      <audio crossOrigin="anonymous" preload="auto" ref={audioRef} />
      <KaraokePracticeSurface
        artistName={artistName}
        artworkSrc={artworkSrc}
        currentTimeMs={displayTimeMs}
        durationMs={durationMs}
        isLoading={audioState === "loading"}
        isPlaying={isPlaying}
        lines={displayLines}
        listening={listening}
        onComplete={onComplete}
        onExit={exitAudio}
        combo={feedback.combo}
        centerContent={centerContent}
        footerContent={footerContent}
        rating={feedback.rating}
        rewardSlot={rewardSlot}
        runningScore={feedback.runningScore}
        scoringStatus={scoringStatus}
        title={title}
      />
      {audioState === "error" ? (
        <div className="absolute inset-x-4 top-20 rounded-[var(--radius-xl)] border border-border-soft bg-card p-4 shadow-lg sm:left-1/2 sm:max-w-sm sm:-translate-x-1/2">
          <Type as="p" variant="body-strong">
            Audio unavailable
          </Type>
          <Type as="p" className="mt-1 text-muted-foreground" variant="caption">
            The instrumental could not be loaded.
          </Type>
        </div>
      ) : null}
      {audioState !== "error" && showDriftWarning ? (
        <div className="absolute inset-x-4 top-20 rounded-[var(--radius-xl)] border border-border-soft bg-card p-4 shadow-lg sm:left-1/2 sm:max-w-sm sm:-translate-x-1/2">
          <Type as="p" variant="body-strong">
            Lyrics may be out of sync
          </Type>
          <Button
            className="mt-3"
            disabled={!onTimingOffsetReset}
            onClick={onTimingOffsetReset}
            size="sm"
            variant="secondary"
          >
            Re-sync
          </Button>
        </div>
      ) : null}
    </div>
  );
}
