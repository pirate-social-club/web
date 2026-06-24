// Shared fixtures for leaderboard stories + component tests. API-shaped (basis points).
import type {
  CommunityKaraokeSongStanding,
  KaraokeLeaderboardEntry,
  KaraokeSongLeaderboard,
  PublicLeaderboardIdentity,
} from "./karaoke-leaderboard.types";

const AVATAR = (seed: string) => `https://picsum.photos/seed/${seed}/64/64`;

export const songMeta = {
  title: "Midnight Waves",
  artistName: "The Castaways",
  artworkUrl: "https://picsum.photos/seed/pirate-karaoke-lb/160/160",
};

function identity(displayName: string, handle: string | null, seed: string): PublicLeaderboardIdentity {
  return { displayName, handle, avatarUrl: AVATAR(seed), visibility: "visible" };
}

export function entry(
  rank: number,
  scoreBps: number,
  id: PublicLeaderboardIdentity,
  opts: { isCurrentUser?: boolean; reachedAt?: string } = {},
): KaraokeLeaderboardEntry {
  return {
    rank,
    scoreBps,
    reachedAt: opts.reachedAt ?? "2026-06-23T12:00:00.000Z",
    identity: id,
    isCurrentUser: opts.isCurrentUser ?? false,
  };
}

const TOP_ENTRIES: KaraokeLeaderboardEntry[] = [
  entry(1, 9600, identity("Maya", "maya.pirate", "maya")),
  entry(2, 9400, identity("Diego", "diego.eth", "diego")),
  entry(3, 9300, identity("Lin", "lin.pirate", "lin")),
  entry(4, 8800, identity("Sam", "sam.pirate", "sam")),
  entry(5, 8600, identity("Aria", "aria.eth", "aria")),
];

export function songLeaderboard(overrides: Partial<KaraokeSongLeaderboard> = {}): KaraokeSongLeaderboard {
  return {
    postId: "pst_song",
    karaokeRevisionId: "krev_1",
    scoringVersion: 1,
    scope: "all_time",
    periodStart: null,
    periodEnd: null,
    totalRanked: 64,
    currentUser: { eligible: true, rank: 5, bestScoreBps: 8600, percentileBps: 800 },
    entries: TOP_ENTRIES.map((e, i) => (i === 4 ? { ...e, isCurrentUser: true } : e)),
    ...overrides,
  };
}

export const songStandings: CommunityKaraokeSongStanding[] = [
  {
    postId: "pst_1",
    title: "Midnight Waves",
    artistName: "The Castaways",
    artworkUrl: AVATAR("hub1"),
    karaokeRevisionId: "krev_1",
    scoringVersion: 1,
    participantCount: 64,
    leadingScoreBps: 9600,
    currentUserBestScoreBps: 8600,
    currentUserRank: 5,
  },
  {
    postId: "pst_2",
    title: "Harbor Lights",
    artistName: "Reef & Tide",
    artworkUrl: AVATAR("hub2"),
    karaokeRevisionId: "krev_2",
    scoringVersion: 1,
    participantCount: 12,
    leadingScoreBps: 9100,
    currentUserBestScoreBps: null,
    currentUserRank: null,
  },
  {
    postId: "pst_3",
    title: "Saltwater Hymn",
    artistName: null,
    artworkUrl: null,
    karaokeRevisionId: "krev_3",
    scoringVersion: 1,
    participantCount: 0,
    leadingScoreBps: null,
    currentUserBestScoreBps: null,
    currentUserRank: null,
  },
];
