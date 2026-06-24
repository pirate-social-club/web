import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";

import { installDomGlobals } from "@/test/setup-dom";
import { KaraokeScoreSummary } from "./karaoke-score-summary";

installDomGlobals();
afterEach(cleanup);

describe("KaraokeScoreSummary", () => {
  test("renders the final score as a 0-100 value", () => {
    const view = render(<KaraokeScoreSummary finalScore={0.86} />);
    expect(view.getByText("Final score")).toBeTruthy();
    expect(view.getByText("86")).toBeTruthy();
  });

  test("shows a neutral measurement caveat only when uncertainLineCount > 0", () => {
    const withUncertain = render(<KaraokeScoreSummary finalScore={0.7} uncertainLineCount={2} />);
    expect(withUncertain.container.textContent).toContain("couldn’t be measured");
    cleanup();

    const clean = render(<KaraokeScoreSummary finalScore={0.7} uncertainLineCount={0} />);
    expect(clean.container.textContent).not.toContain("couldn’t be measured");
  });
});
