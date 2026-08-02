import { afterEach, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import type { SongStreakLeaderboardEntry } from "@pirate/api-contracts";

import { installDomGlobals } from "@/test/setup-dom";

import { SongStreakPreview } from "./song-streak-preview";

installDomGlobals();
afterEach(cleanup);

function tiedEntry(userId: string, displayName: string): SongStreakLeaderboardEntry {
  return {
    active_until_at: new Date(Date.now() + 86_400_000).toISOString(),
    best_streak: 1,
    current_streak: 1,
    identity: {
      avatar_ref: `https://media.test/${userId}.png`,
      display_name: displayName,
      handle: null,
      user_id: userId,
    },
    is_viewer: false,
    last_qualified_date: "2026-07-27",
    rank: 1,
    streak_started_date: "2026-07-27",
    total_qualified_days: 1,
  };
}

test("streak preview represents tied leaders without inventing a sole crown holder", () => {
  const view = render(
    <SongStreakPreview
      summary={{
        entries: [
          tiedEntry("usr_luffy", "Monkey Luffy"),
          tiedEntry("usr_peer", "Peer Singer"),
        ],
        totalActiveStreaks: 2,
        viewer: null,
      }}
    />,
  );

  expect(view.getByText("2 people · 1-day streak")).toBeTruthy();
  expect(view.getAllByRole("img")).toHaveLength(2);
});

test("streak preview drops expired entries and hides when none remain active", () => {
  const expired = {
    ...tiedEntry("usr_ghost", "Ghost Singer"),
    active_until_at: new Date(Date.now() - 60_000).toISOString(),
  };

  const hidden = render(
    <SongStreakPreview
      summary={{ entries: [expired], totalActiveStreaks: 1, viewer: null }}
    />,
  );
  expect(hidden.container.textContent).toBe("");
  cleanup();

  const alive = tiedEntry("usr_luffy", "Monkey Luffy");
  const view = render(
    <SongStreakPreview
      summary={{ entries: [expired, alive], totalActiveStreaks: 2, viewer: null }}
    />,
  );
  expect(view.getByText("Monkey Luffy")).toBeTruthy();
  expect(view.queryByText("Ghost Singer")).toBeNull();
});
