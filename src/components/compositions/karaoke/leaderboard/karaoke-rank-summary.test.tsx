import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";

import { installDomGlobals } from "@/test/setup-dom";
import { KaraokeRankSummary } from "./karaoke-rank-summary";

installDomGlobals();
afterEach(cleanup);

describe("KaraokeRankSummary", () => {
  test("renders rank + scope + percentile (percentile is basis points)", () => {
    const view = render(
      <KaraokeRankSummary eligible percentile={1800} rank={12} scope="weekly" totalRanked={64} />,
    );
    const text = view.container.textContent ?? "";
    expect(text).toContain("#12");
    expect(text).toContain("this week");
    expect(text).toContain("Top 18%");
  });

  test("uses the all-time label", () => {
    const view = render(<KaraokeRankSummary eligible percentile={300} rank={2} scope="all_time" totalRanked={64} />);
    expect(view.container.textContent).toContain("all-time");
  });

  test("shows 'Not ranked' when ineligible or unranked", () => {
    const ineligible = render(
      <KaraokeRankSummary eligible={false} percentile={null} rank={null} scope="weekly" totalRanked={0} />,
    );
    expect(ineligible.container.textContent).toContain("Not ranked");
    expect(ineligible.container.textContent).not.toContain("#");
    cleanup();

    const noRank = render(
      <KaraokeRankSummary eligible percentile={null} rank={null} scope="all_time" totalRanked={10} />,
    );
    expect(noRank.container.textContent).toContain("Not ranked");
  });
});
