import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import type { KaraokeSessionSummary } from "@pirate/karaoke-runtime";

import { installDomGlobals } from "@/test/setup-dom";
import type { KaraokeScoringState } from "./karaoke-scoring-controller";
import { KaraokeScoringPanel } from "./karaoke-scoring-panel";

installDomGlobals();
afterEach(cleanup);

function summary(overrides: Partial<KaraokeSessionSummary> = {}): KaraokeSessionSummary {
  return {
    confidenceMean: 0.8,
    finalScore: 0.86,
    lyricsScore: 0.84,
    timingScore: 0.88,
    lineCount: 12,
    scoredLineCount: 11,
    noRecognitionLineCount: 0,
    uncertainLineCount: 0,
    phoneticUnavailableLineCount: 0,
    lowConfidenceLineCount: 0,
    timingTrend: "on_time",
    strongestLines: [],
    weakestLines: [],
    missedWords: [],
    ...overrides,
  };
}

function endedState(summaryOverrides: Partial<KaraokeSessionSummary> = {}): KaraokeScoringState {
  return {
    error: null,
    latestLineId: null,
    lineScores: [],
    micError: null,
    partialTranscript: "",
    phase: "idle",
    status: "ended",
    summary: summary(summaryOverrides),
  } as unknown as KaraokeScoringState;
}

const noop = () => undefined;

describe("KaraokeScoringPanel ended state (minimal)", () => {
  test("shows the final score and a Sing again action, and NO 'X of Y lines scored'", () => {
    const restarts: string[] = [];
    const view = render(
      <KaraokeScoringPanel canStart onRestart={() => restarts.push("r")} onStart={noop} state={endedState()} />,
    );

    expect(view.getByText("Final score")).toBeTruthy();
    expect(view.getByText("86")).toBeTruthy();
    expect(view.container.textContent).not.toContain("lines scored");

    fireEvent.click(view.getByText("Sing again"));
    expect(restarts).toEqual(["r"]);
  });

  test("shows a neutral measurement caveat only when uncertainLineCount > 0", () => {
    const withUncertain = render(
      <KaraokeScoringPanel canStart onRestart={noop} onStart={noop} state={endedState({ uncertainLineCount: 2 })} />,
    );
    expect(withUncertain.container.textContent).toContain("couldn’t be measured");
    cleanup();

    const clean = render(
      <KaraokeScoringPanel canStart onRestart={noop} onStart={noop} state={endedState({ uncertainLineCount: 0 })} />,
    );
    expect(clean.container.textContent).not.toContain("couldn’t be measured");
  });

  test("idle state still offers Start (start path unchanged)", () => {
    const state = {
      error: null,
      latestLineId: null,
      lineScores: [],
      micError: null,
      partialTranscript: "",
      phase: "idle",
      status: "idle",
      summary: null,
    } as unknown as KaraokeScoringState;
    const view = render(<KaraokeScoringPanel canStart onStart={noop} state={state} />);
    expect(view.getByText("Start")).toBeTruthy();
    expect(view.queryByText("Sing again")).toBeNull();
  });
});
