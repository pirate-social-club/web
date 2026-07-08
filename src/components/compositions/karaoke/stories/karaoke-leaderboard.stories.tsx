import type { Meta, StoryObj } from "@storybook/react";

import { KaraokeLeaderboard } from "../karaoke-leaderboard";
import type { KaraokeSongLeaderboard } from "@/lib/api/client-api-types";

const leaderboard: KaraokeSongLeaderboard = {
  object: "karaoke_song_leaderboard",
  post_id: "pst_song",
  community_id: "com_cmt_demo",
  scope: "all_time",
  period_start: null,
  period_end: null,
  karaoke_revision_id: "krv_demo",
  scoring_version: 1,
  scoring_provider: "elevenlabs",
  scoring_model: "scribe_v1",
  total_ranked: 5,
  viewer_rank: 4,
  viewer_top_percent: 80,
  viewer_best_score: 7410,
  viewer_best_reached_at: "2026-07-08T09:30:00Z",
  viewer_eligible_attempt_count: 2,
  entries: [
    {
      rank: 1,
      top_percent: 20,
      score: 9320,
      reached_at: "2026-07-08T08:00:00Z",
      identity: { avatar_ref: null, display_name: "Maya Voss", handle: "maya.pirate", visibility: "visible" },
      is_viewer: false,
    },
    {
      rank: 2,
      top_percent: 40,
      score: 8840,
      reached_at: "2026-07-08T08:10:00Z",
      identity: { avatar_ref: null, display_name: "Diego Ramos", handle: "diego.eth", visibility: "visible" },
      is_viewer: false,
    },
    {
      rank: 3,
      top_percent: 60,
      score: 8120,
      reached_at: "2026-07-08T08:20:00Z",
      identity: { avatar_ref: null, display_name: "Lena Fischer", handle: "lena.pirate", visibility: "visible" },
      is_viewer: false,
    },
  ],
};

const meta = {
  title: "Compositions/Karaoke/KaraokeLeaderboard",
  component: KaraokeLeaderboard,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof KaraokeLeaderboard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ActiveBoard: Story = {
  args: {
    artistName: "Maya Voss",
    artworkSrc: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80",
    state: { kind: "ready", leaderboard },
    title: "Midnight Echo",
  },
};

export const ViewerRanked: Story = {
  args: {
    artistName: "Maya Voss",
    artworkSrc: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80",
    state: {
      kind: "ready",
      leaderboard: {
        ...leaderboard,
        viewer_rank: 2,
        viewer_top_percent: 40,
        viewer_best_score: 8840,
        entries: leaderboard.entries.map((entry) =>
          entry.rank === 2 ? { ...entry, is_viewer: true } : entry
        ),
      },
    },
    title: "Midnight Echo",
  },
};

export const FormerMember: Story = {
  args: {
    artistName: "Maya Voss",
    artworkSrc: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80",
    state: {
      kind: "ready",
      leaderboard: {
        ...leaderboard,
        entries: leaderboard.entries.map((entry) =>
          entry.rank === 2
            ? {
              ...entry,
              identity: { avatar_ref: null, display_name: null, handle: null, visibility: "anonymized" },
            }
            : entry
        ),
      },
    },
    title: "Midnight Echo",
  },
};

export const Empty: Story = {
  args: {
    artistName: "Maya Voss",
    state: {
      kind: "ready",
      leaderboard: {
        ...leaderboard,
        entries: [],
        total_ranked: 0,
        viewer_rank: null,
        viewer_top_percent: null,
        viewer_best_score: null,
        viewer_best_reached_at: null,
        viewer_eligible_attempt_count: 0,
      },
    },
    title: "Midnight Echo",
  },
};

export const Error: Story = {
  args: {
    artistName: "Maya Voss",
    state: { kind: "error", message: "Karaoke scores are unavailable right now." },
    title: "Midnight Echo",
  },
};
