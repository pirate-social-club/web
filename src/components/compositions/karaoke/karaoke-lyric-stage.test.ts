import { describe, expect, test } from "bun:test";

import {
  getKaraokeDisplayState,
  getKaraokeStageLineKey,
  type KaraokeStageLine,
} from "./karaoke-lyric-stage";

const lines: KaraokeStageLine[] = [
  { id: "intro", text: "Intro line", startMs: 1000, endMs: 3000 },
  { id: "overlap", text: "Overlap line", startMs: 2500, endMs: 5000 },
  { id: "final", text: "Final line", startMs: 6000, endMs: 8000 },
];

function displayIds(currentTimeMs: number) {
  const state = getKaraokeDisplayState(lines, currentTimeMs);

  return {
    active: state.activeLine?.id ?? null,
    cue: state.cueLine?.id ?? null,
    next: state.nextLine?.id ?? null,
  };
}

describe("getKaraokeDisplayState", () => {
  test("shows the active line and the next line during a lyric", () => {
    expect(displayIds(1500)).toEqual({
      active: "intro",
      cue: null,
      next: "final",
    });
  });

  test("shows the upcoming cue during a gap", () => {
    expect(displayIds(5500)).toEqual({
      active: null,
      cue: "final",
      next: null,
    });
  });

  test("holds the final line after the song ends", () => {
    expect(displayIds(9000)).toEqual({
      active: "final",
      cue: null,
      next: null,
    });
  });

  test("keeps the earlier-started line active through an overlap", () => {
    expect(displayIds(2600)).toEqual({
      active: "intro",
      cue: null,
      next: "final",
    });
  });

  test("selects the later overlapping line after the earlier line ends", () => {
    expect(displayIds(3200)).toEqual({
      active: "overlap",
      cue: null,
      next: "final",
    });
  });

  test("handles a single line without a next preview", () => {
    const [onlyLine] = lines;
    const state = getKaraokeDisplayState([onlyLine], 1500);

    expect(state.activeLine?.id).toBe("intro");
    expect(state.nextLine).toBeNull();
  });

  test("handles empty input", () => {
    const state = getKaraokeDisplayState([], 1500);

    expect(state.activeLine).toBeNull();
    expect(state.cueLine).toBeNull();
    expect(state.nextLine).toBeNull();
  });

  test("keys repeated upstream ids by timing window", () => {
    expect(getKaraokeStageLineKey({
      id: "chorus",
      text: "Sing it again",
      startMs: 1000,
      endMs: 3000,
    })).not.toBe(getKaraokeStageLineKey({
      id: "chorus",
      text: "Sing it again",
      startMs: 12000,
      endMs: 14000,
    }));
  });
});
