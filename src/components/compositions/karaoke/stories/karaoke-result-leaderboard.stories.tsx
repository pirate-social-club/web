import type { Meta, StoryObj } from "@storybook/react-vite";

import { KaraokeResultLeaderboard } from "../leaderboard/karaoke-result-leaderboard";
import { entry, songLeaderboard } from "../leaderboard/fixtures";

function id(handle: string) {
  return {
    displayName: handle,
    handle,
    avatarUrl: `https://picsum.photos/seed/${handle}/64/64`,
    visibility: "visible" as const,
  };
}

const meta = {
  title: "Compositions/Karaoke/KaraokeResultLeaderboard",
  component: KaraokeResultLeaderboard,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Completion-screen preview: this take's score + Top 5 + your standing. Reads the per-song "
          + "leaderboard (gated on the endpoint); mocked here. Future replacement for the bare "
          + "score-only ended state once persistence lands.",
      },
    },
  },
} satisfies Meta<typeof KaraokeResultLeaderboard>;

export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => undefined;

export const InTopFive: Story = {
  render: () => (
    <div className="w-[420px]">
      <KaraokeResultLeaderboard
        finalScore={0.86}
        leaderboard={songLeaderboard({
          currentUser: { eligible: true, rank: 5, bestScoreBps: 8600, percentileBps: 800 },
        })}
        onViewRankings={noop}
      />
    </div>
  ),
};

export const OutsideTop: Story = {
  render: () => (
    <div className="w-[420px]">
      <KaraokeResultLeaderboard
        finalScore={0.72}
        leaderboard={songLeaderboard({
          entries: [
            entry(1, 9600, id("maya.pirate")),
            entry(2, 9400, id("diego.eth")),
            entry(3, 9300, id("lin.pirate")),
            entry(4, 8800, id("sam.pirate")),
            entry(5, 8600, id("aria.eth")),
          ],
          currentUser: { eligible: true, rank: 17, bestScoreBps: 7200, percentileBps: 2700 },
        })}
        onViewRankings={noop}
      />
    </div>
  ),
};

export const Unranked: Story = {
  render: () => (
    <div className="w-[420px]">
      <KaraokeResultLeaderboard
        finalScore={0.41}
        leaderboard={songLeaderboard({
          entries: [entry(1, 9600, id("maya.pirate")), entry(2, 9400, id("diego.eth")), entry(3, 9300, id("lin.pirate"))],
          currentUser: { eligible: false, rank: null, bestScoreBps: null, percentileBps: null },
        })}
        onViewRankings={noop}
      />
    </div>
  ),
};
