import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";

import { installDomGlobals } from "@/test/setup-dom";
import { KaraokeScoreSummary } from "./karaoke-score-summary";

installDomGlobals();
afterEach(cleanup);

describe("KaraokeScoreSummary", () => {
  test("renders the final score as a 0-100 value", () => {
    const view = render(<KaraokeScoreSummary finalScore={0.86} />);
    expect(view.getByText("Your score")).toBeTruthy();
    expect(view.getByText("86")).toBeTruthy();
  });

  test("renders compact performance metrics when supplied", () => {
    const view = render(
      <KaraokeScoreSummary
        finalScore={0.86}
        lineCount={12}
        lyricsScore={0.84}
        scoredLineCount={11}
        timingScore={0.88}
      />,
    );
    expect(view.getByText("Timing")).toBeTruthy();
    expect(view.getByText("88%")).toBeTruthy();
    expect(view.getByText("Lyrics")).toBeTruthy();
    expect(view.getByText("84%")).toBeTruthy();
    expect(view.getByText("Lines")).toBeTruthy();
    expect(view.getByText("11/12")).toBeTruthy();
  });

  test("shows a neutral measurement caveat only when uncertainLineCount > 0", () => {
    const withUncertain = render(<KaraokeScoreSummary finalScore={0.7} uncertainLineCount={2} />);
    expect(withUncertain.container.textContent).toContain("couldn't be measured");
    cleanup();

    const clean = render(<KaraokeScoreSummary finalScore={0.7} uncertainLineCount={0} />);
    expect(clean.container.textContent).not.toContain("couldn't be measured");
  });

  test("explains when timing could not be measured for this take", () => {
    const view = render(
      <KaraokeScoreSummary
        finalScore={0.8}
        timingCalibrationUnavailable
        timingScore={0.82}
        timingTrend="late"
      />,
    );
    expect(view.container.textContent).toContain(
      "We couldn't measure your timing on this take, so it didn't count against your score.",
    );
    expect(view.container.textContent).not.toContain("Try coming in earlier.");
  });

  test("explains the calibration failure reason", () => {
    const view = render(
      <KaraokeScoreSummary
        finalScore={0.8}
        timingCalibrationReason="incoherent_residuals"
        timingCalibrationUnavailable
      />,
    );
    expect(view.container.textContent).toContain(
      "The timing measurements varied too much to trust. They didn't count against your score.",
    );
  });

  test("keeps a single-word timing label and explains direction plainly", () => {
    const early = render(<KaraokeScoreSummary finalScore={0.9} timingScore={0.82} timingTrend="early" />);
    expect(early.getByText("Timing")).toBeTruthy();
    expect(early.getByText("82%")).toBeTruthy();
    expect(early.getByText("You sang a little early. Try coming in later.")).toBeTruthy();
    cleanup();

    const onTime = render(<KaraokeScoreSummary finalScore={0.9} timingScore={0.97} timingTrend="on_time" />);
    expect(onTime.getByText("Timing")).toBeTruthy();
    expect(onTime.getByText("Right on time.")).toBeTruthy();
  });
});
