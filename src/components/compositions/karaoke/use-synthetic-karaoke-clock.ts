import * as React from "react";

interface UseSyntheticKaraokeClockOptions {
  durationMs: number;
  initialTimeMs?: number;
}

export function useSyntheticKaraokeClock({
  durationMs,
  initialTimeMs = 0,
}: UseSyntheticKaraokeClockOptions) {
  const [currentTimeMs, setCurrentTimeMs] = React.useState(initialTimeMs);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const currentTimeRef = React.useRef(initialTimeMs);
  const frameRef = React.useRef<number | null>(null);
  const startedAtRef = React.useRef(0);
  const startOffsetRef = React.useRef(initialTimeMs);

  const stopFrame = React.useCallback(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  const updateCurrentTime = React.useCallback((nextTimeMs: number) => {
    const clampedTimeMs = Math.max(0, Math.min(durationMs, nextTimeMs));
    currentTimeRef.current = clampedTimeMs;
    setCurrentTimeMs(clampedTimeMs);

    return clampedTimeMs;
  }, [durationMs]);

  const tick = React.useCallback(() => {
    const nextTimeMs = startOffsetRef.current + performance.now() - startedAtRef.current;

    updateCurrentTime(nextTimeMs);

    if (nextTimeMs >= durationMs) {
      frameRef.current = null;
      setIsPlaying(false);
      return;
    }

    frameRef.current = window.requestAnimationFrame(tick);
  }, [durationMs, updateCurrentTime]);

  React.useEffect(() => {
    currentTimeRef.current = currentTimeMs;
  }, [currentTimeMs]);

  React.useEffect(() => {
    if (!isPlaying) {
      stopFrame();
      return undefined;
    }

    startedAtRef.current = performance.now();
    startOffsetRef.current = currentTimeRef.current;
    frameRef.current = window.requestAnimationFrame(tick);

    return stopFrame;
  }, [isPlaying, stopFrame, tick]);

  React.useEffect(() => {
    updateCurrentTime(Math.min(currentTimeRef.current, durationMs));
  }, [durationMs, updateCurrentTime]);

  const play = React.useCallback(() => {
    stopFrame();
    const startTimeMs = currentTimeRef.current >= durationMs
      ? updateCurrentTime(0)
      : currentTimeRef.current;

    startedAtRef.current = performance.now();
    startOffsetRef.current = startTimeMs;
    setIsPlaying(true);
  }, [durationMs, stopFrame, updateCurrentTime]);

  const pause = React.useCallback(() => {
    stopFrame();
    setIsPlaying(false);
  }, [stopFrame]);

  const toggle = React.useCallback(() => {
    if (isPlaying) {
      pause();
      return;
    }

    play();
  }, [isPlaying, pause, play]);

  const seek = React.useCallback((nextTimeMs: number) => {
    const clampedTimeMs = updateCurrentTime(nextTimeMs);

    if (isPlaying) {
      startedAtRef.current = performance.now();
      startOffsetRef.current = clampedTimeMs;
    }
  }, [isPlaying, updateCurrentTime]);

  const reset = React.useCallback(() => {
    stopFrame();
    setIsPlaying(false);
    startOffsetRef.current = initialTimeMs;
    updateCurrentTime(initialTimeMs);
  }, [initialTimeMs, stopFrame, updateCurrentTime]);

  return {
    currentTimeMs,
    isPlaying,
    pause,
    play,
    reset,
    seek,
    toggle,
  };
}
