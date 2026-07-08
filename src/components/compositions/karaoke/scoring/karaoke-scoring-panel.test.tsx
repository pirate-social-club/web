import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import type { KaraokeSessionSummary } from "@pirate-social-club/karaoke-runtime";

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

describe("KaraokeScoringPanel ended state", () => {
  test("ended footer offers scores and Sing again — NOT the score (score lives on the stage)", () => {
    const restarts: string[] = [];
    const scores: string[] = [];
    const view = render(
      <KaraokeScoringPanel
        canStart
        onRestart={() => restarts.push("r")}
        onStart={noop}
        onViewScores={() => scores.push("s")}
        state={endedState()}
      />,
    );

    // The footer carries navigation/actions; the final score is rendered centered on
    // the stage by KaraokeScoreSummary, not here.
    expect(view.container.textContent).not.toContain("Final score");
    expect(view.container.textContent).not.toContain("86");
    expect(view.container.textContent).not.toContain("lines scored");

    fireEvent.click(view.getByText("Scores"));
    expect(scores).toEqual(["s"]);

    fireEvent.click(view.getByText("Sing again"));
    expect(restarts).toEqual(["r"]);
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
