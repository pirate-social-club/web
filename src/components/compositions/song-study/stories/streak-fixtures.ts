import type {
  SongStreakLeaderboardEntry,
  SongStreakViewerStanding,
} from "@pirate/api-contracts";

import type { SongStreakSummary } from "../song-streak-preview";

export function makeEntry(
  rank: number,
  overrides: { userId: string; handle: string; currentStreak: number; isViewer?: boolean },
): SongStreakLeaderboardEntry {
  return {
    rank,
    identity: {
      user_id: overrides.userId,
      handle: overrides.handle,
      display_name: overrides.handle,
      avatar_ref: null,
    },
    current_streak: overrides.currentStreak,
    best_streak: overrides.currentStreak + 2,
    total_qualified_days: overrides.currentStreak + 5,
    streak_started_date: "2026-06-24",
    last_qualified_date: "2026-07-06",
    active_until_at: "2099-01-01T00:00:00.000Z",
    is_viewer: overrides.isViewer ?? false,
  };
}

export const boardEntries: SongStreakLeaderboardEntry[] = [
  makeEntry(1, { userId: "usr_lena", handle: "lena.pirate", currentStreak: 21 }),
  makeEntry(2, { userId: "usr_theo", handle: "theo.eth", currentStreak: 18 }),
  makeEntry(3, { userId: "usr_priya", handle: "priya.pirate", currentStreak: 14 }),
  makeEntry(4, { userId: "usr_sam", handle: "sam.eth", currentStreak: 9 }),
  makeEntry(5, { userId: "usr_maria", handle: "maria.pirate", currentStreak: 6 }),
];

export const viewerRankedLockedIn: SongStreakViewerStanding = {
  alive: true,
  current_streak: 14,
  best_streak: 16,
  total_qualified_days: 19,
  qualified_today: true,
  study_attempts_today: 10,
  study_target_today: 10,
  karaoke_passed_today: false,
};

export const viewerRankedBehind: SongStreakViewerStanding = {
  alive: true,
  current_streak: 14,
  best_streak: 16,
  total_qualified_days: 19,
  qualified_today: false,
  study_attempts_today: 6,
  study_target_today: 10,
  karaoke_passed_today: false,
};

export const viewerNotRanked: SongStreakViewerStanding = {
  alive: true,
  current_streak: 3,
  best_streak: 3,
  total_qualified_days: 3,
  qualified_today: false,
  study_attempts_today: 2,
  study_target_today: 8,
  karaoke_passed_today: false,
};

export const viewerDead: SongStreakViewerStanding = {
  alive: false,
  current_streak: 0,
  best_streak: 11,
  total_qualified_days: 24,
  qualified_today: false,
  study_attempts_today: 0,
  study_target_today: 10,
  karaoke_passed_today: false,
};

export function summary(
  entries: SongStreakLeaderboardEntry[],
  viewer: SongStreakViewerStanding | null,
  totalActiveStreaks: number,
): SongStreakSummary {
  return { entries, viewer, totalActiveStreaks };
}
