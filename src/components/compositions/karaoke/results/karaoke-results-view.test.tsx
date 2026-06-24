import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import type { KaraokeSessionSummary, ScorableKaraokeLine } from "@pirate/karaoke-runtime";

import { installDomGlobals } from "@/test/setup-dom";
import { KaraokeResultsView } from "./karaoke-results-view";

installDomGlobals();

afterEach(cleanup);

const lines: ScorableKaraokeLine[] = [
  { lineId: "l0", lineIndex: 0, scoredLineIndex: 0, text: "first line", startMs: 0, endMs: 1000, words: [] },
];

function summaryWith(overrides: Partial<KaraokeSessionSummary> = {}): KaraokeSessionSummary {
  return {
    confidenceMean: 0.8,
    finalScore: 0.86,
    lyricsScore: 0.84,
    timingScore: 0.88,
    lineCount: 12,
    scoredLineCount: 11,
    noRecognitionLineCount: 0,
    uncertainLineCount: 0,
    phoneticUnavailableLineCount: 12,
    lowConfidenceLineCount: 1,
    timingTrend: "on_time",
    strongestLines: [],
    weakestLines: [],
    missedWords: [],
    ...overrides,
  };
}

const noop = () => undefined;

describe("KaraokeResultsView", () => {
  test("labels a new personal best using raw scores, not the rounded display value", () => {
    // 0.864 and 0.861 both render as 86, but only the raw value should decide "new best".
    const beats = render(
      <KaraokeResultsView
        lines={lines}
        onSingAgain={noop}
        previousPersonalBest={0.861}
        summary={summaryWith({ finalScore: 0.864 })}
        title="Song"
      />,
    );
    expect(beats.getByText("New personal best")).toBeTruthy();
    cleanup();

    const doesNotBeat = render(
      <KaraokeResultsView
        lines={lines}
        onSingAgain={noop}
        previousPersonalBest={0.864}
        summary={summaryWith({ finalScore: 0.861 })}
        title="Song"
      />,
    );
    expect(doesNotBeat.queryByText("New personal best")).toBeNull();
    expect(doesNotBeat.getByText("Your score")).toBeTruthy();
  });

  test("does not claim a new best when the previous best is unknown", () => {
    const view = render(
      <KaraokeResultsView lines={lines} onSingAgain={noop} summary={summaryWith()} title="Song" />,
    );
    expect(view.queryByText("New personal best")).toBeNull();
    expect(view.getByText("Your score")).toBeTruthy();
  });

  test("shows the infra caveat from uncertainLineCount only — never from no-recognition silence", () => {
    const uncertain = render(
      <KaraokeResultsView
        lines={lines}
        onSingAgain={noop}
        summary={summaryWith({ uncertainLineCount: 2, noRecognitionLineCount: 0 })}
        title="Song"
      />,
    );
    expect(uncertain.container.textContent).toContain("couldn’t be measured");
    cleanup();

    // Silence/failed recognition must NOT be mislabeled as an audio/connection failure.
    const silence = render(
      <KaraokeResultsView
        lines={lines}
        onSingAgain={noop}
        summary={summaryWith({ uncertainLineCount: 0, noRecognitionLineCount: 3 })}
        title="Song"
      />,
    );
    expect(silence.container.textContent).not.toContain("couldn’t be measured");
  });

  test("falls back to the attempt's missed words for review when none are provided", () => {
    const view = render(
      <KaraokeResultsView
        lines={lines}
        onSingAgain={noop}
        summary={summaryWith({ missedWords: ["alpha", "Alpha", "beta"] })}
        title="Song"
      />,
    );
    const text = view.container.textContent ?? "";
    expect(text).toContain("alpha");
    expect(text).toContain("beta");
    // De-duped case-insensitively: "Alpha" should not produce a second chip.
    expect(text.match(/alpha/gi)?.length).toBe(1);
  });

  test("always offers Sing again; hides Rankings when there is no ranking data or handler", () => {
    const view = render(
      <KaraokeResultsView lines={lines} onSingAgain={noop} summary={summaryWith()} title="Song" />,
    );
    expect(view.getByText("Sing again")).toBeTruthy();
    expect(view.queryByText("Rankings")).toBeNull();
  });
});
