import * as React from "react";

import { cn } from "@/lib/utils";

export interface WaveformProps {
  peaks?: readonly number[];
  seed: string;
  count?: number;
  progressFraction?: number;
  height?: number;
  barWidth?: number;
  gap?: number;
  className?: string;
}

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function nextState(current: number): number {
  let state = current || 0x9e3779b9;
  state ^= state << 13;
  state ^= state >>> 17;
  state ^= state << 5;
  return state >>> 0;
}

function seededPeaks(seed: string, count: number): number[] {
  const peaks: number[] = [];
  let state = hashSeed(seed);

  for (let index = 0; index < count; index += 1) {
    state = nextState(state + index);
    const random = state / 0xffffffff;
    const wave = 0.5 + Math.sin(index * 0.72) * 0.18;
    peaks.push(Math.max(0.16, Math.min(1, (random * 0.55) + wave * 0.45)));
  }

  return peaks;
}

function normalizePeak(value: number): number {
  if (!Number.isFinite(value)) return 0.2;
  return Math.max(0.08, Math.min(1, value));
}

export function Waveform({
  barWidth = 2,
  className,
  count = 72,
  gap = 2,
  height = 24,
  peaks,
  progressFraction = 0,
  seed,
}: WaveformProps) {
  const resolvedPeaks = React.useMemo(() => {
    if (peaks?.length) {
      return peaks.slice(0, count).map(normalizePeak);
    }
    return seededPeaks(seed, count);
  }, [count, peaks, seed]);
  const playedCount = Math.max(0, Math.min(resolvedPeaks.length, Math.round(resolvedPeaks.length * progressFraction)));

  return (
    <div
      aria-hidden="true"
      className={cn("flex w-full items-center overflow-hidden", className)}
      style={{ gap, height }}
    >
      {resolvedPeaks.map((peak, index) => (
        <span
          className={cn(
            "shrink-0 rounded-full bg-current",
            index < playedCount ? "text-primary" : "text-muted-foreground/30",
          )}
          key={`${index}-${peak.toFixed(3)}`}
          style={{
            height: Math.max(2, Math.round(peak * height)),
            width: barWidth,
          }}
        />
      ))}
    </div>
  );
}
