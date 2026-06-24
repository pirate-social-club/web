import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";

import { installDomGlobals } from "@/test/setup-dom";
import { KaraokeSongTopSingersCard } from "./karaoke-song-top-singers-card";
import { entry, songLeaderboard } from "./fixtures";

installDomGlobals();
afterEach(cleanup);

const song = { title: "Midnight Waves", artistName: "The Castaways" };
const noop = () => undefined;

function id(name: string, handle: string | null, seed = name) {
  return { displayName: name, handle, avatarUrl: null, visibility: "visible" as const };
}

describe("KaraokeSongTopSingersCard", () => {
  test("renders the top-3 podium, scope label, and View all", () => {
    const view = render(
      <KaraokeSongTopSingersCard
        leaderboard={songLeaderboard({
          entries: [
            entry(1, 9600, id("Maya", "maya.pirate")),
            entry(2, 9400, id("Diego", "diego.eth")),
            entry(3, 9300, id("Lin", "lin.pirate")),
            entry(4, 8800, id("Sam", "sam.pirate")),
          ],
        })}
        onViewRankings={noop}
        song={song}
      />,
    );
    const text = view.container.textContent ?? "";
    expect(text).toContain("Top singers");
    expect(text).toContain("all-time");
    expect(text).toContain("Maya");
    expect(text).toContain("Diego");
    expect(text).toContain("Lin");
    expect(text).not.toContain("Sam"); // #4 is below the podium
    expect(text).toContain("96");
    expect(view.getByText("View all")).toBeTruthy();
  });

  test("links visible non-self names to /u/<handle>; self row is not a link", () => {
    const view = render(
      <KaraokeSongTopSingersCard
        leaderboard={songLeaderboard({
          entries: [
            entry(1, 9600, id("Maya", "maya.pirate")),
            entry(2, 9400, id("Diego", "diego.eth")),
            entry(3, 9300, id("You", "you.pirate"), { isCurrentUser: true }),
          ],
          currentUser: { eligible: true, rank: 3, bestScoreBps: 9300, percentileBps: 500 },
        })}
        onViewRankings={noop}
        song={song}
      />,
    );
    const mayaLink = view.getByText("Maya").closest("a");
    expect(mayaLink?.getAttribute("href")).toBe("/u/maya.pirate");
    // The "You" podium row is the current user → no anchor.
    expect(view.getByText("You").closest("a")).toBeNull();
  });

  test("appends your standing with rank-up flourish + gap nudge when ranked outside the podium", () => {
    const view = render(
      <KaraokeSongTopSingersCard
        leaderboard={songLeaderboard({
          entries: [
            entry(1, 9600, id("Maya", "maya.pirate")),
            entry(2, 9400, id("Diego", "diego.eth")),
            entry(3, 9300, id("Lin", "lin.pirate")),
          ],
          currentUser: {
            eligible: true,
            rank: 17,
            bestScoreBps: 7200,
            percentileBps: 2700,
            previousRank: 22,
            gapToNextRankBps: 500,
          },
        })}
        onViewRankings={noop}
        song={song}
      />,
    );
    const text = view.container.textContent ?? "";
    expect(text).toContain("#17");
    expect(text).toContain("↑5");
    expect(text).toContain("+5 to overtake #16");
  });

  test("empty state shows the empty message + Sing (anchor)", () => {
    const view = render(
      <KaraokeSongTopSingersCard
        karaokeHref="/p/pst_song/karaoke"
        leaderboard={songLeaderboard({
          entries: [],
          totalRanked: 0,
          currentUser: { eligible: false, rank: null, bestScoreBps: null, percentileBps: null },
        })}
        song={song}
      />,
    );
    expect(view.container.textContent).toContain("No scores yet — be the first to sing.");
    const sing = view.getByText("Sing").closest("a");
    expect(sing?.getAttribute("href")).toBe("/p/pst_song/karaoke");
  });

  test("loading shows no podium", () => {
    const view = render(
      <KaraokeSongTopSingersCard leaderboard={null} status="loading" song={song} />,
    );
    expect(view.container.textContent).not.toContain("Maya");
    expect(view.container.querySelector(".size-7")).toBeTruthy();
  });

  test("View all is an anchor when leaderboardHref is provided", () => {
    const view = render(
      <KaraokeSongTopSingersCard
        leaderboard={songLeaderboard()}
        leaderboardHref="/p/pst_song/karaoke/leaderboard"
        song={song}
      />,
    );
    const viewAll = view.getByText("View all").closest("a");
    expect(viewAll?.getAttribute("href")).toBe("/p/pst_song/karaoke/leaderboard");
  });

  test("anonymized entries are not links", () => {
    const view = render(
      <KaraokeSongTopSingersCard
        leaderboard={songLeaderboard({
          entries: [
            entry(1, 9600, { displayName: "Pirate singer", handle: null, avatarUrl: null, visibility: "anonymized" }),
            entry(2, 9400, id("Diego", "diego.eth")),
            entry(3, 9300, id("Lin", "lin.pirate")),
          ],
        })}
        song={song}
      />,
    );
    expect(view.getByText("Pirate singer").closest("a")).toBeNull();
  });

  test("wires the Sing callback", () => {
    const calls: string[] = [];
    const view = render(
      <KaraokeSongTopSingersCard
        leaderboard={songLeaderboard({
          entries: [],
          totalRanked: 0,
          currentUser: { eligible: false, rank: null, bestScoreBps: null, percentileBps: null },
        })}
        onSing={() => calls.push("sing")}
        song={song}
      />,
    );
    fireEvent.click(view.getByText("Sing"));
    expect(calls).toEqual(["sing"]);
  });
});