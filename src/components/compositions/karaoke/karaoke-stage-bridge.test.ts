import { describe, expect, test } from "bun:test";

import { toScorableKaraokeLines } from "./karaoke-stage-bridge";
import type { KaraokeStageLine, KaraokeStageToken } from "./karaoke-lyric-stage";

function stageLine(id: string | undefined, startMs: number, endMs: number, text: string, tokens: KaraokeStageToken[] = []): KaraokeStageLine {
  return { endMs, id, startMs, text, tokens };
}

describe("toScorableKaraokeLines", () => {
  test("assigns stable lineId, lineIndex, and scoredLineIndex", () => {
    const lines = [
      stageLine("verse-1", 0, 1600, "old guitar", [
        { endMs: 500, startMs: 0, text: "old" },
        { endMs: 1400, startMs: 600, text: "guitar" },
      ]),
      stageLine("verse-2", 2000, 3800, "catch fire", [
        { endMs: 2500, startMs: 2000, text: "catch" },
        { endMs: 3700, startMs: 3000, text: "fire" },
      ]),
    ];

    const scorable = toScorableKaraokeLines(lines);

    expect(scorable).toHaveLength(2);
    expect(scorable[0]).toMatchObject({
      lineId: "verse-1",
      lineIndex: 0,
      scoredLineIndex: 0,
      text: "old guitar",
    });
    expect(scorable[0]?.words).toHaveLength(2);
    expect(scorable[1]).toMatchObject({
      lineId: "verse-2",
      lineIndex: 1,
      scoredLineIndex: 1,
    });
  });

  test("generates fallback id when stage line has no id", () => {
    const lines = [stageLine(undefined, 1000, 2000, "hold on")];
    const scorable = toScorableKaraokeLines(lines);
    expect(scorable[0]?.lineId).toBe("line-0-1000");
  });

  test("falls back to a whole-line word when no tokens are present", () => {
    const lines = [stageLine("x", 100, 200, "lone")];
    const scorable = toScorableKaraokeLines(lines);
    expect(scorable[0]?.words).toEqual([{ endMs: 200, startMs: 100, text: "lone" }]);
  });

  test("filters out lines where startMs >= endMs", () => {
    const lines = [
      stageLine("valid", 0, 1000, "ok"),
      stageLine("zero", 500, 500, "zero"),
      stageLine("inverted", 1000, 500, "inverted"),
    ];
    const scorable = toScorableKaraokeLines(lines);
    expect(scorable).toHaveLength(1);
    expect(scorable[0]?.lineId).toBe("valid");
  });
});
