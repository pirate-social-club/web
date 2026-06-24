import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { KaraokeSongLeaderboardView } from "../leaderboard/karaoke-song-leaderboard-view";
import { entry, songLeaderboard, songMeta } from "../leaderboard/fixtures";
import type { KaraokeLeaderboardEntry, KaraokeSongLeaderboard, RankingScope } from "../leaderboard/karaoke-leaderboard.types";

function id(displayName: string, handle: string | null, anonymized = false) {
  const full = !anonymized && handle ? (handle.includes(".") ? handle : `${handle}.pirate`) : null;
  return {
    displayName: full ?? displayName,
    handle: full,
    avatarUrl: anonymized ? null : `https://picsum.photos/seed/${handle ?? displayName}/64/64`,
    visibility: anonymized ? ("anonymized" as const) : ("visible" as const),
  };
}

/** Scope-stateful wrapper so the All-time/Weekly selector is interactive. */
function Demo(props: {
  initial: KaraokeSongLeaderboard | null;
  status?: "ready" | "loading" | "error";
  hasSung?: boolean;
}) {
  const [scope, setScope] = React.useState<RankingScope>(props.initial?.scope ?? "all_time");
  return (
    <KaraokeSongLeaderboardView
      hasSung={props.hasSung ?? true}
      leaderboard={props.initial ? { ...props.initial, scope } : null}
      onRetry={() => undefined}
      onScopeChange={setScope}
      onSing={() => undefined}
      scope={scope}
      song={songMeta}
      status={props.status}
    />
  );
}

const meta = {
  title: "Compositions/Karaoke/KaraokeSongLeaderboardView",
  component: KaraokeSongLeaderboardView,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof KaraokeSongLeaderboardView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllTime: Story = { render: () => <Demo initial={songLeaderboard({ scope: "all_time" })} /> };

export const Weekly: Story = {
  render: () => (
    <Demo
      initial={songLeaderboard({
        scope: "weekly",
        periodStart: "2026-06-22T00:00:00.000Z",
        periodEnd: "2026-06-29T00:00:00.000Z",
        totalRanked: 18,
        currentUser: { eligible: true, rank: 3, bestScoreBps: 9300, percentileBps: 1700 },
      })}
    />
  ),
};

export const CurrentUserOutsideTop: Story = {
  render: () => (
    <Demo
      initial={songLeaderboard({
        entries: [
          entry(1, 9600, id("maya", "maya")),
          entry(2, 9400, id("diego", "diego")),
          entry(3, 9300, id("lin", "lin")),
        ],
        currentUser: { eligible: true, rank: 47, bestScoreBps: 7200, percentileBps: 7300 },
      })}
    />
  ),
};

export const CurrentUserUnranked: Story = {
  render: () => (
    <Demo
      hasSung={false}
      initial={songLeaderboard({
        entries: [entry(1, 9600, id("maya", "maya")), entry(2, 9400, id("diego", "diego"))],
        totalRanked: 12,
        currentUser: { eligible: false, rank: null, bestScoreBps: null, percentileBps: null },
      })}
    />
  ),
};

export const TiedScores: Story = {
  render: () => (
    <Demo
      initial={songLeaderboard({
        totalRanked: 10,
        currentUser: { eligible: true, rank: 4, bestScoreBps: 9100, percentileBps: 4000 },
        entries: [
          entry(1, 9600, id("maya", "maya")),
          entry(2, 9400, id("diego", "diego")),
          entry(2, 9400, id("lin", "lin")),
          entry(4, 9100, id("you", "you"), ),
        ].map((e, i) => (i === 3 ? { ...e, isCurrentUser: true } : e)) as KaraokeLeaderboardEntry[],
      })}
    />
  ),
};

export const FewParticipants: Story = {
  render: () => (
    <Demo
      initial={songLeaderboard({
        totalRanked: 2,
        currentUser: { eligible: true, rank: 2, bestScoreBps: 8200, percentileBps: 10000 },
        entries: [
          entry(1, 9000, id("maya", "maya")),
          { ...entry(2, 8200, id("you", "you")), isCurrentUser: true },
        ],
      })}
    />
  ),
};

export const Empty: Story = {
  render: () => (
    <Demo
      initial={songLeaderboard({
        totalRanked: 0,
        entries: [],
        currentUser: { eligible: false, rank: null, bestScoreBps: null, percentileBps: null },
      })}
      hasSung={false}
    />
  ),
};

export const Loading: Story = { render: () => <Demo initial={null} status="loading" /> };

export const Error: Story = { render: () => <Demo initial={null} status="error" /> };

export const ModeratedIdentity: Story = {
  render: () => (
    <Demo
      initial={songLeaderboard({
        currentUser: { eligible: true, rank: 4, bestScoreBps: 8800, percentileBps: 2500 },
        entries: [
          entry(1, 9600, id("maya", "maya")),
          entry(2, 9400, id("Pirate singer", null, true)),
          entry(3, 9300, id("lin", "lin")),
          { ...entry(4, 8800, id("you", "you")), isCurrentUser: true },
        ],
      })}
    />
  ),
};

export const LongNamesMobile: Story = {
  render: () => (
    <div className="mx-auto w-[390px] border-x border-border-soft">
      <Demo
        initial={songLeaderboard({
          currentUser: { eligible: true, rank: 2, bestScoreBps: 9400, percentileBps: 500 },
          entries: [
            entry(1, 9600, id("Bartholomew Featherstonehaugh-Cholmondeley", "bartholomew_featherstonehaugh")),
            { ...entry(2, 9400, id("Maximiliana Aurelia Della Casa-Montenegro", "maximiliana")), isCurrentUser: true },
            entry(3, 9300, id("lin", "lin")),
          ],
        })}
      />
    </div>
  ),
};
