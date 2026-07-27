import type { KaraokeStageLine } from "./karaoke-lyric-stage";

export const KARAOKE_LINE_HOLD_MS = 1600;

export function clampKaraokeLinesToDuration(
  lines: readonly KaraokeStageLine[],
  audioDurationMs?: number,
): KaraokeStageLine[] {
  if (audioDurationMs === undefined || !Number.isFinite(audioDurationMs) || audioDurationMs <= 0) {
    return [...lines];
  }

  return lines
    .filter((line) => line.startMs < audioDurationMs)
    .map((line) => {
      const endMs = Math.min(line.endMs, audioDurationMs);
      return {
        ...line,
        endMs,
        tokens: line.tokens
          ?.filter((token) => token.startMs < audioDurationMs)
          .map((token) => ({
            ...token,
            endMs: Math.max(token.startMs, Math.min(token.endMs, audioDurationMs)),
          })),
      };
    });
}

export function getLyricDurationMs(
  lines: readonly KaraokeStageLine[],
  audioDurationMs?: number,
): number {
  if (audioDurationMs !== undefined && Number.isFinite(audioDurationMs) && audioDurationMs > 0) {
    return Math.max(1, Math.round(audioDurationMs));
  }

  const lyricEndMs = lines.reduce((maxEndMs, line) => Math.max(maxEndMs, line.endMs), 0);

  return Math.max(1, lyricEndMs + KARAOKE_LINE_HOLD_MS);
}
