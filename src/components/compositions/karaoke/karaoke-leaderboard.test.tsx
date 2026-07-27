import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";

import type { KaraokeSongLeaderboard } from "@/lib/api/client-api-types";
import { installDomGlobals } from "@/test/setup-dom";

import {
  KaraokeCompletionLeaderboard,
  KaraokeLeaderboard,
} from "./karaoke-leaderboard";

installDomGlobals();
afterEach(cleanup);

function singleSingerLeaderboard(): KaraokeSongLeaderboard {
  return {
    object: "karaoke_song_leaderboard",
    post_id: "pst_song",
    community_id: "com_demo",
    scope: "all_time",
    period_start: null,
    period_end: null,
    karaoke_revision_id: "krv_demo",
    scoring_version: 4,
    scoring_provider: "elevenlabs",
    scoring_model: "scribe_v1",
    total_ranked: 1,
    viewer_rank: 1,
    viewer_top_percent: 100,
    viewer_best_score: 9200,
    viewer_best_reached_at: "2026-07-27T05:30:00Z",
    viewer_eligible_attempt_count: 1,
    entries: [
      {
        rank: 1,
        top_percent: 100,
        score: 9200,
        reached_at: "2026-07-27T05:30:00Z",
        identity: {
          avatar_ref: null,
          display_name: "Alexia Salas",
          handle: "alexiasalas.pirate",
          visibility: "visible",
        },
        is_viewer: true,
      },
    ],
  };
}

describe("KaraokeLeaderboard", () => {
  test("shows an understandable rank instead of a misleading top percentile", () => {
    const view = render(
      <KaraokeLeaderboard
        state={{ kind: "ready", leaderboard: singleSingerLeaderboard() }}
        title="Jazzin' Baby Blues"
      />,
    );

    expect(view.getByText("Rank 1 of 1")).toBeTruthy();
    expect(view.container.textContent).not.toContain("Top 100%");
  });

  test("completion view shows compact scores and the viewer standing", () => {
    const leaderboard = singleSingerLeaderboard();
    leaderboard.entries[0] = {
      ...leaderboard.entries[0],
      is_viewer: false,
    };
    leaderboard.total_ranked = 2;
    leaderboard.viewer_rank = 2;
    leaderboard.viewer_best_score = 8300;

    const view = render(
      <KaraokeCompletionLeaderboard
        state={{ kind: "ready", leaderboard }}
      />,
    );

    expect(view.getByLabelText("Karaoke leaderboard")).toBeTruthy();
    expect(view.getByText("Rank 1 of 2")).toBeTruthy();
    expect(view.getByText("You are #2 with 83%")).toBeTruthy();
  });
});
