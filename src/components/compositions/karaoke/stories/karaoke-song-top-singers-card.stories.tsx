import type { Meta, StoryObj } from "@storybook/react-vite";

import { KaraokeSongTopSingersCard } from "../leaderboard/karaoke-song-top-singers-card";
import { entry, songLeaderboard } from "../leaderboard/fixtures";

function id(handle: string | null, seed: string) {
  return { displayName: handle, handle, avatarUrl: `https://picsum.photos/seed/${seed}/64/64`, visibility: "visible" as const };
}

const song = { title: "Midnight Waves", artistName: "The Castaways" };
const noop = () => undefined;

const meta = {
  title: "Compositions/Karaoke/KaraokeSongTopSingersCard",
  component: KaraokeSongTopSingersCard,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Inline 'Top singers' card for the song post page (the no-sing entry point, spec §10.5): a "
          + "top-3 podium + the viewer's own standing when ranked outside it, with View all → the full "
          + "board. Names link to /u/<handle> for visible, non-self entries. Reads the per-song board "
          + "(gated on the endpoint); mocked here.",
      },
    },
  },
  args: { song, onSing: noop, onViewRankings: noop },
} satisfies Meta<typeof KaraokeSongTopSingersCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="w-[400px]">
      <KaraokeSongTopSingersCard
        {...args}
        leaderboard={songLeaderboard({
          entries: [
            entry(1, 9600, id("maya.pirate", "maya"), { reachedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString() }),
            entry(2, 9400, id("diego.eth", "diego"), { reachedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() }),
            entry(3, 9300, id("lin.pirate", "lin"), { reachedAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString() }),
            entry(4, 8800, id("sam.pirate", "sam")),
            entry(5, 8600, id("aria.eth", "aria")),
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
      />
    </div>
  ),
};

export const YouOnPodium: Story = {
  render: (args) => (
    <div className="w-[400px]">
      <KaraokeSongTopSingersCard
        {...args}
        leaderboard={songLeaderboard({
          entries: [
            entry(1, 9600, id("maya.pirate", "maya")),
            entry(2, 9400, id("diego.eth", "diego")),
            entry(3, 9300, id("you.pirate", "you"), { isCurrentUser: true }),
          ],
          currentUser: { eligible: true, rank: 3, bestScoreBps: 9300, percentileBps: 500 },
        })}
      />
    </div>
  ),
};

export const Empty: Story = {
  render: (args) => (
    <div className="w-[400px]">
      <KaraokeSongTopSingersCard
        {...args}
        karaokeHref="/p/pst_song/karaoke"
        leaderboard={songLeaderboard({
          entries: [],
          totalRanked: 0,
          currentUser: { eligible: false, rank: null, bestScoreBps: null, percentileBps: null },
        })}
      />
    </div>
  ),
};

export const Loading: Story = {
  render: (args) => (
    <div className="w-[400px]">
      <KaraokeSongTopSingersCard {...args} status="loading" leaderboard={null} />
    </div>
  ),
};

export const Error: Story = {
  render: (args) => (
    <div className="w-[400px]">
      <KaraokeSongTopSingersCard {...args} status="error" leaderboard={null} onRetry={noop} />
    </div>
  ),
};

export const AnonymizedEntry: Story = {
  render: (args) => (
    <div className="w-[400px]">
      <KaraokeSongTopSingersCard
        {...args}
        leaderboard={songLeaderboard({
          entries: [
            entry(1, 9600, { displayName: "Pirate singer", handle: null, avatarUrl: null, visibility: "anonymized" }),
            entry(2, 9400, id("diego.eth", "diego")),
            entry(3, 9300, id("lin.pirate", "lin")),
          ],
          currentUser: { eligible: true, rank: 17, bestScoreBps: 7200, percentileBps: 2700 },
        })}
      />
    </div>
  ),
};