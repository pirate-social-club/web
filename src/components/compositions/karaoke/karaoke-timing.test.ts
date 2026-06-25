import { describe, expect, test } from "bun:test";

import type { KaraokeStageLine } from "./karaoke-lyric-stage";
import { getLyricDurationMs, KARAOKE_LINE_HOLD_MS } from "./karaoke-timing";

function line(startMs: number, endMs: number): KaraokeStageLine {
  return {
    endMs,
    id: `line-${startMs}-${endMs}`,
    startMs,
    text: "Line",
    tokens: [
      {
        endMs,
        startMs,
        text: "Line",
      },
    ],
  };
}

describe("getLyricDurationMs", () => {
  test("uses loaded audio duration when available", () => {
    expect(getLyricDurationMs([line(0, 5000)], 3200.4)).toBe(3200);
  });

  test("falls back to the final lyric end plus hold padding", () => {
    expect(getLyricDurationMs([
      line(1000, 2400),
      line(3000, 5300),
    ])).toBe(5300 + KARAOKE_LINE_HOLD_MS);
  });

  test("returns a positive duration for empty lyrics", () => {
    expect(getLyricDurationMs([])).toBe(KARAOKE_LINE_HOLD_MS);
  });
});
