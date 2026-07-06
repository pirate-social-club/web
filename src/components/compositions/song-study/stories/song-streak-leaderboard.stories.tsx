import type { Meta, StoryObj } from "@storybook/react-vite";
import type {
  SongStreakLeaderboardEntry,
  SongStreakViewerStanding,
} from "@pirate/api-contracts";

import { SongStreakLeaderboard } from "../song-streak-leaderboard";

const artworkSrc =
  "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=200&q=60";

const baseProps = {
  artistName: "Nadia Rey",
  artworkSrc,
  title: "Ríos de Sal",
  onExit: () => {},
  onRetry: () => {},
  onStartStudy: () => {},
};

function makeEntry(
  rank: number,
  overrides: Partial<SongStreakLeaderboardEntry> & {
    userId: string;
    displayName: string;
    handle?: string;
    currentStreak: number;
  },
): SongStreakLeaderboardEntry {
  const { userId, displayName, handle, currentStreak, ...rest } = overrides;
  return {
    rank,
    identity: {
      user_id: userId,
      handle: handle ?? null,
      display_name: displayName,
      avatar_ref: null,
    },
    current_streak: currentStreak,
    best_streak: Math.max(currentStreak, currentStreak + 2),
    total_qualified_days: currentStreak + 5,
    streak_started_date: "2026-06-24",
    last_qualified_date: "2026-07-05",
    is_viewer: false,
    ...rest,
  };
}

const boardEntries: SongStreakLeaderboardEntry[] = [
  makeEntry(1, { userId: "usr_lena", displayName: "lena.pirate", handle: "lena.pirate", currentStreak: 21 }),
  makeEntry(2, { userId: "usr_theo", displayName: "theo.eth", handle: "theo.eth", currentStreak: 18 }),
  makeEntry(3, { userId: "usr_priya", displayName: "priya.pirate", handle: "priya.pirate", currentStreak: 14 }),
  makeEntry(4, { userId: "usr_sam", displayName: "sam.eth", handle: "sam.eth", currentStreak: 9 }),
  makeEntry(5, { userId: "usr_maria", displayName: "maria.pirate", handle: "maria.pirate", currentStreak: 6 }),
];

const viewerRankedLockedIn: SongStreakViewerStanding = {
  alive: true,
  current_streak: 14,
  best_streak: 16,
  total_qualified_days: 19,
  qualified_today: true,
  study_attempts_today: 10,
  study_target_today: 10,
  karaoke_passed_today: false,
};

const viewerRankedBehind: SongStreakViewerStanding = {
  alive: true,
  current_streak: 14,
  best_streak: 16,
  total_qualified_days: 19,
  qualified_today: false,
  study_attempts_today: 6,
  study_target_today: 10,
  karaoke_passed_today: false,
};

const viewerNotRanked: SongStreakViewerStanding = {
  alive: true,
  current_streak: 3,
  best_streak: 3,
  total_qualified_days: 3,
  qualified_today: false,
  study_attempts_today: 2,
  study_target_today: 8,
  karaoke_passed_today: false,
};

const viewerDead: SongStreakViewerStanding = {
  alive: false,
  current_streak: 0,
  best_streak: 11,
  total_qualified_days: 24,
  qualified_today: false,
  study_attempts_today: 0,
  study_target_today: 10,
  karaoke_passed_today: false,
};

const meta = {
  title: "Compositions/Song Study/SongStreakLeaderboard",
  component: SongStreakLeaderboard,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof SongStreakLeaderboard>;

export default meta;
type Story = StoryObj<typeof meta>;

const viewerRankedEntries = boardEntries.map((entry) =>
  entry.rank === 3 ? { ...entry, is_viewer: true } : entry,
);

export const Empty: Story = {
  name: "Board / Empty (no streaks yet)",
  args: {
    ...baseProps,
    state: { kind: "ready", date: "2026-07-05", entries: [], totalActiveStreaks: 0, viewer: null },
  },
};

export const ActiveBoardViewerRanked: Story = {
  name: "Board / Active — viewer ranked, locked in today",
  args: {
    ...baseProps,
    state: {
      kind: "ready",
      date: "2026-07-05",
      entries: viewerRankedEntries,
      totalActiveStreaks: 5,
      viewer: viewerRankedLockedIn,
    },
  },
};

export const ActiveBoardViewerBehindToday: Story = {
  name: "Board / Active — viewer ranked, streak at risk today",
  args: {
    ...baseProps,
    state: {
      kind: "ready",
      date: "2026-07-05",
      entries: viewerRankedEntries,
      totalActiveStreaks: 5,
      viewer: viewerRankedBehind,
    },
  },
};

export const ViewerNotRanked: Story = {
  name: "Board / Active — viewer not in top ranks",
  args: {
    ...baseProps,
    state: {
      kind: "ready",
      date: "2026-07-05",
      entries: boardEntries,
      totalActiveStreaks: 42,
      viewer: viewerNotRanked,
    },
  },
};

export const DeadViewerStreak: Story = {
  name: "Board / Active — viewer streak lapsed",
  args: {
    ...baseProps,
    state: {
      kind: "ready",
      date: "2026-07-05",
      entries: boardEntries,
      totalActiveStreaks: 5,
      viewer: viewerDead,
    },
  },
};

export const Loading: Story = {
  name: "Loading",
  args: { ...baseProps, state: { kind: "loading" } },
};

export const ErrorLoading: Story = {
  name: "Error",
  args: {
    ...baseProps,
    state: {
      kind: "error",
      message: "We couldn't reach the streak service. Check your connection and retry.",
    },
  },
};
