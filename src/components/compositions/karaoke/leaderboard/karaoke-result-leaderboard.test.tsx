import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";

import { installDomGlobals } from "@/test/setup-dom";
import { KaraokeResultLeaderboard } from "./karaoke-result-leaderboard";
import { entry, songLeaderboard } from "./fixtures";

installDomGlobals();
afterEach(cleanup);

const noop = () => undefined;
function id(name: string) {
  return { displayName: name, handle: name, avatarUrl: null, visibility: "visible" as const };
}

describe("KaraokeResultLeaderboard", () => {
  test("shows this take's score, a Top-N, and a See-full-leaderboard link (no big action buttons)", () => {
    const view = render(
      <KaraokeResultLeaderboard
        finalScore={0.86}
        leaderboard={songLeaderboard({ currentUser: { eligible: true, rank: 5, bestScoreBps: 8600, percentileBps: 800 } })}
        onViewRankings={noop}
      />,
    );
    const text = view.container.textContent ?? "";
    expect(text).toContain("Final score");
    expect(text).toContain("86");
    expect(text).toContain("Top"); // "Top 5" heading + "Top 8%" rank line
    expect(view.getByText("See full leaderboard")).toBeTruthy();
    // Sing again belongs in the stage footer, not this preview.
    expect(view.queryByText("Sing again")).toBeNull();
  });

  test("appends the viewer's own row when they're outside the top N", () => {
    const view = render(
      <KaraokeResultLeaderboard
        finalScore={0.72}
        leaderboard={songLeaderboard({
          entries: [entry(1, 9600, id("maya")), entry(2, 9400, id("diego")), entry(3, 9300, id("lin"))],
          currentUser: { eligible: true, rank: 17, bestScoreBps: 7200, percentileBps: 2700 },
        })}
        onViewRankings={noop}
      />,
    );
    const text = view.container.textContent ?? "";
    expect(text).toContain("#17");
    expect(text).toContain("You");
  });

  test("no separate viewer row when ineligible/unranked, but the score still shows", () => {
    const view = render(
      <KaraokeResultLeaderboard
        finalScore={0.41}
        leaderboard={songLeaderboard({
          entries: [entry(1, 9600, id("maya"))],
          currentUser: { eligible: false, rank: null, bestScoreBps: null, percentileBps: null },
        })}
        onViewRankings={noop}
      />,
    );
    expect(view.container.textContent).toContain("41");
    expect(view.container.textContent).toContain("Not ranked");
    expect(view.container.textContent).not.toContain("You");
  });

  test("the See-full-leaderboard link opens the full board", () => {
    const calls: string[] = [];
    const view = render(
      <KaraokeResultLeaderboard
        finalScore={0.86}
        leaderboard={songLeaderboard()}
        onViewRankings={() => calls.push("rankings")}
      />,
    );
    fireEvent.click(view.getByText("See full leaderboard"));
    expect(calls).toEqual(["rankings"]);
  });
});
