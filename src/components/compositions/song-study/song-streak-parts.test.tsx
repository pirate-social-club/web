import { afterEach, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import type { SongStreakLeaderboardEntry } from "@pirate/api-contracts";

import { installDomGlobals } from "@/test/setup-dom";

import { SongStreakEntryList } from "./song-streak-parts";

installDomGlobals();
afterEach(cleanup);

test("streak rows render the profile avatar with the display name fallback", () => {
  const entry: SongStreakLeaderboardEntry = {
    active_until_at: new Date(Date.now() + 86_400_000).toISOString(),
    best_streak: 4,
    current_streak: 3,
    identity: {
      avatar_ref: "https://media.test/luffy.png",
      display_name: "Monkey Luffy",
      handle: "luffy.pirate",
      user_id: "usr_luffy",
    },
    is_viewer: true,
    last_qualified_date: "2026-07-27",
    rank: 1,
    streak_started_date: "2026-07-25",
    total_qualified_days: 3,
  };

  const view = render(<SongStreakEntryList entries={[entry]} />);

  expect(view.getByRole("img", { name: "luffy.pirate" }).getAttribute("src"))
    .toBe("https://media.test/luffy.png");
});
