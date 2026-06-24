import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { CommunityKaraokeHub } from "../leaderboard/community-karaoke-hub";
import { songStandings } from "../leaderboard/fixtures";
import type { CommunityKaraokeSongStanding } from "../leaderboard/karaoke-leaderboard.types";

const noop = () => undefined;

function hub(songs: CommunityKaraokeSongStanding[] | undefined, status?: "ready" | "loading" | "error") {
  return (
    <CommunityKaraokeHub
      communityName="Tidewater"
      onRetry={noop}
      onSing={noop}
      onViewRankings={noop}
      songs={songs}
      status={status}
    />
  );
}

const meta = {
  title: "Compositions/Karaoke/CommunityKaraokeHub",
  component: CommunityKaraokeHub,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof CommunityKaraokeHub>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithUserStandings: Story = { render: () => hub(songStandings) };

export const NoUserAttempts: Story = {
  render: () =>
    hub(songStandings.map((s) => ({ ...s, currentUserBestScoreBps: null, currentUserRank: null }))),
};

export const MixedAvailability: Story = {
  // Some songs have boards + user standings, one has no scores yet.
  render: () => hub(songStandings),
};

export const NoKaraokeSongs: Story = { render: () => hub([]) };

export const Loading: Story = { render: () => hub(undefined, "loading") };

export const Error: Story = { render: () => hub(undefined, "error") };

export const LongList: Story = {
  render: () =>
    hub(
      Array.from({ length: 14 }, (_, i) => ({
        postId: `pst_${i}`,
        title: `Song Number ${i + 1}`,
        artistName: i % 3 === 0 ? null : `Artist ${i + 1}`,
        artworkUrl: i % 2 === 0 ? `https://picsum.photos/seed/long${i}/64/64` : null,
        karaokeRevisionId: `krev_${i}`,
        scoringVersion: 1,
        participantCount: i % 4 === 0 ? 0 : (i + 1) * 3,
        leadingScoreBps: i % 4 === 0 ? null : 9000 - i * 100,
        currentUserBestScoreBps: i % 2 === 0 ? 8000 - i * 50 : null,
        currentUserRank: i % 2 === 0 ? i + 2 : null,
      })),
    ),
};

export const Mobile: Story = {
  render: () => <div className="mx-auto w-[390px] border-x border-border-soft">{hub(songStandings)}</div>,
};
