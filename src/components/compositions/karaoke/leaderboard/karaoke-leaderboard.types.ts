// API-shaped view models for karaoke leaderboards.
// Contract: core spec/karaoke-rankings §10. These mirror what the (not-yet-built)
// leaderboard endpoints will return — the UI consumes these, never DB rows.
// Scores cross this boundary in BASIS POINTS (0..10000); components convert to
// display percent only at render time.

export type RankingScope = "all_time" | "weekly";

export interface PublicLeaderboardIdentity {
  displayName: string;
  handle: string | null;
  avatarUrl: string | null;
  visibility: "visible" | "anonymized";
}

export interface KaraokeLeaderboardEntry {
  /** Competition rank (1,2,2,4); server-assigned, never computed client-side. */
  rank: number;
  scoreBps: number;
  /** ISO; best_reached_at (tie-break). */
  reachedAt: string;
  identity: PublicLeaderboardIdentity;
  isCurrentUser: boolean;
}

export interface KaraokeSongLeaderboardCurrentUser {
  eligible: boolean;
  rank: number | null;
  bestScoreBps: number | null;
  /** Top-fraction in basis points (1800 = "Top 18%"). */
  percentileBps: number | null;
}

export interface KaraokeSongLeaderboard {
  postId: string;
  karaokeRevisionId: string;
  scoringVersion: number;
  scope: RankingScope;
  periodStart: string | null;
  periodEnd: string | null;
  totalRanked: number;
  currentUser: KaraokeSongLeaderboardCurrentUser;
  entries: KaraokeLeaderboardEntry[];
}

/** Compact rank line for the result screen (separate from the full board). */
export interface KaraokeRankSummaryData {
  rank: number | null;
  totalRanked: number;
  /** Top-fraction in basis points (1800 = "Top 18%"). */
  percentile: number | null;
  scope: RankingScope;
  eligible: boolean;
}

/** One card on the community karaoke hub (an index of per-song boards). */
export interface CommunityKaraokeSongStanding {
  postId: string;
  title: string;
  artistName: string | null;
  artworkUrl: string | null;
  karaokeRevisionId: string;
  scoringVersion: number;
  participantCount: number;
  leadingScoreBps: number | null;
  currentUserBestScoreBps: number | null;
  currentUserRank: number | null;
}

/** Basis points (0..10000) → display percent (0..100). */
export function bpsToPercent(bps: number): number {
  return Math.round(Math.min(10000, Math.max(0, bps)) / 100);
}
