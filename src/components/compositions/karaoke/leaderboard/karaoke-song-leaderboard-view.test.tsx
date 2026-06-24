import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";

import { installDomGlobals } from "@/test/setup-dom";
import { KaraokeSongLeaderboardView } from "./karaoke-song-leaderboard-view";
import { entry, songLeaderboard, songMeta } from "./fixtures";
import type { KaraokeLeaderboardEntry, KaraokeSongLeaderboard } from "./karaoke-leaderboard.types";

installDomGlobals();
afterEach(cleanup);

const noop = () => undefined;

function renderView(props: Partial<React.ComponentProps<typeof KaraokeSongLeaderboardView>> = {}) {
  return render(
    <KaraokeSongLeaderboardView
      leaderboard={props.leaderboard ?? songLeaderboard()}
      onRetry={props.onRetry ?? noop}
      onScopeChange={props.onScopeChange ?? noop}
      onSing={props.onSing ?? noop}
      scope={props.scope ?? "all_time"}
      song={songMeta}
      status={props.status}
      hasSung={props.hasSung}
    />,
  );
}

function id(name: string) {
  return { displayName: name, handle: name, avatarUrl: null, visibility: "visible" as const };
}

describe("KaraokeSongLeaderboardView", () => {
  test("renders server competition ranks (1,2,2,4) verbatim — never client-sequential", () => {
    const lb: KaraokeSongLeaderboard = songLeaderboard({
      entries: [
        entry(1, 9600, id("maya")),
        entry(2, 9400, id("diego")),
        entry(2, 9400, id("lin")),
        entry(4, 9100, id("sam")),
      ] as KaraokeLeaderboardEntry[],
      currentUser: { eligible: true, rank: 4, bestScoreBps: 9100, percentileBps: 4000 },
    });
    const text = renderView({ leaderboard: lb }).container.textContent ?? "";
    expect(text).toContain("#1");
    expect(text).toContain("#2");
    expect(text).toContain("#4");
    // A client computing its own ranks would emit #3 for the 3rd row; competition rank skips it.
    expect(text).not.toContain("#3");
    // basis points → percent
    expect(text).toContain("96");
  });

  test("empty board invites the first score and shows no rows", () => {
    const view = renderView({
      leaderboard: songLeaderboard({ totalRanked: 0, entries: [], currentUser: { eligible: false, rank: null, bestScoreBps: null, percentileBps: null } }),
    });
    expect(view.container.textContent).toContain("be the first");
  });

  test("loading shows a spinner, error offers retry", () => {
    const loading = renderView({ status: "loading", leaderboard: null });
    expect(loading.container.querySelector('svg[role="status"]')).toBeTruthy();
    cleanup();

    const retries: string[] = [];
    const errored = renderView({ status: "error", leaderboard: null, onRetry: () => retries.push("r") });
    fireEvent.click(errored.getByText("Try again"));
    expect(retries).toEqual(["r"]);
  });

  test("scope selector reports changes (server re-queries; client never recomputes)", () => {
    const scopes: string[] = [];
    const view = renderView({ scope: "all_time", onScopeChange: (s) => scopes.push(s) });
    fireEvent.click(view.getByText("This week"));
    expect(scopes).toEqual(["weekly"]);
  });

  test("ranked-but-outside-top viewer gets their own position row", () => {
    const view = renderView({
      leaderboard: songLeaderboard({
        entries: [entry(1, 9600, id("maya")), entry(2, 9400, id("diego")), entry(3, 9300, id("lin"))],
        currentUser: { eligible: true, rank: 47, bestScoreBps: 7200, percentileBps: 7300 },
      }),
    });
    const text = view.container.textContent ?? "";
    expect(text).toContain("#47");
    expect(text).toContain("You");
  });

  test("primary CTA reflects whether the viewer has sung", () => {
    expect(renderView({ hasSung: false }).getByText("Sing")).toBeTruthy();
    cleanup();
    expect(renderView({ hasSung: true }).getByText("Sing again")).toBeTruthy();
  });
});
