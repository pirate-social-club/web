import * as React from "react";

import { Button } from "@/components/primitives/button";
import { Type } from "@/components/primitives/type";
import { addNavigationGuard } from "@/app/router";
import { cn } from "@/lib/utils";

import {
  KaraokePracticeSurface,
  type KaraokePracticeCompleteSummary,
} from "./karaoke-practice-surface";
import { getLyricDurationMs } from "./karaoke-timing";
import type { KaraokeStageLine } from "./karaoke-lyric-stage";
import { KaraokeScoringPanel } from "./scoring/karaoke-scoring-panel";
import type { UseKaraokeScoringResult } from "./scoring/use-karaoke-scoring-session";

type AudioState = "error" | "loading" | "ready";
const exitConfirmationMessage = "Stop karaoke and leave this song?";

export interface KaraokeAudioSurfaceProps {
  artworkSrc?: string;
  artistName?: string;
  className?: string;
  driftWarningThresholdMs?: number;
  initialTimeMs?: number;
  instrumentalAudioUrl?: string;
  lines: KaraokeStageLine[];
  onComplete?: (summary: KaraokePracticeCompleteSummary) => void;
  onExit?: () => void;
  onTimingOffsetReset?: () => void;
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
  lines,
  onComplete,
  onExit,
  onTimingOffsetReset,
  scoring,
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
  const [audioState, setAudioState] = React.useState<AudioState>("loading");
  const [audioDurationMs, setAudioDurationMs] = React.useState<number | undefined>(undefined);
  const [currentTimeMs, setCurrentTimeMs] = React.useState(initialTimeMs);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const fallbackDurationMs = React.useMemo(() => getLyricDurationMs(lines), [lines]);
  const durationMs = getLyricDurationMs(lines, audioDurationMs);
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

  const seekAudio = React.useCallback((nextTimeMs: number) => {
    const audio = audioRef.current;
    const clampedTimeMs = Math.max(0, Math.min(durationMs, nextTimeMs));

    if (audio) {
      audio.currentTime = clampedTimeMs / 1000;
    }

    setCurrentTimeMs(clampedTimeMs);
    scoringRef.current?.controls.noteSeek(clampedTimeMs);
  }, [durationMs]);

  const resetAudio = React.useCallback(() => {
    pauseAudio();
    seekAudio(initialTimeMs);
  }, [initialTimeMs, pauseAudio, seekAudio]);

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

  // Begin (or retry) a scoring session from the current position, then play. The
  // controller acquires the mic before the instrumental advances; the initial
  // capture anchor is taken when the socket reaches `live`.
  const startScoring = React.useCallback(() => {
    const audio = audioRef.current;
    scoringRef.current?.controls.start(audio ? audio.currentTime * 1000 : 0);
    void playAudio();
  }, [playAudio]);

  React.useEffect(() => {
    const audio = audioRef.current;

    setAudioState("loading");
    setAudioDurationMs(undefined);
    setCurrentTimeMs(initialTimeMs);
    setIsPlaying(false);

    if (!audio || !instrumentalAudioUrl) {
      return undefined;
    }

    const handleLoadedMetadata = () => {
      setAudioDurationMs(getAudioDurationMs(audio));

      if (initialTimeMs > 0 && Number.isFinite(audio.duration)) {
        audio.currentTime = Math.min(initialTimeMs / 1000, audio.duration);
      }
    };
    const handleCanPlay = () => {
      setAudioState("ready");
      setAudioDurationMs(getAudioDurationMs(audio));
    };
    const handleError = () => {
      setAudioState("error");
      setIsPlaying(false);
      stopFrame();
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

  return (
    <div className={cn("relative min-h-screen w-full flex-1", className)}>
      <audio crossOrigin="anonymous" preload="auto" ref={audioRef} />
      <KaraokePracticeSurface
        artistName={artistName}
        artworkSrc={artworkSrc}
        controlsDisabled={audioState !== "ready"}
        currentTimeMs={displayTimeMs}
        durationMs={durationMs}
        isLoading={audioState === "loading"}
        isPlaying={isPlaying}
        lines={lines}
        onComplete={onComplete}
        onExit={exitAudio}
        onPause={pauseAudio}
        onPlay={() => {
          void playAudio();
        }}
        onReset={resetAudio}
        onSeek={(nextTimeMs) => {
          seekAudio(nextTimeMs - timingOffsetMs);
        }}
        title={title}
      />
      {scoring?.enabled && scoring.state ? (
        <KaraokeScoringPanel
          canStart={audioState === "ready"}
          className="pointer-events-auto absolute inset-x-4 top-24 mx-auto max-w-md rounded-[var(--radius-xl)] border border-border-soft bg-card/95 p-4 shadow-lg backdrop-blur"
          onStart={startScoring}
          state={scoring.state}
        />
      ) : null}
      {audioState === "error" ? (
        <div className="absolute inset-x-4 bottom-24 rounded-[var(--radius-xl)] border border-border-soft bg-card p-4 shadow-lg sm:left-auto sm:max-w-sm">
          <Type as="p" variant="body-strong">
            Audio unavailable
          </Type>
          <Type as="p" className="mt-1 text-muted-foreground" variant="caption">
            The instrumental could not be loaded.
          </Type>
        </div>
      ) : null}
      {audioState !== "error" && showDriftWarning ? (
        <div className="absolute inset-x-4 bottom-24 rounded-[var(--radius-xl)] border border-border-soft bg-card p-4 shadow-lg sm:left-auto sm:max-w-sm">
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
