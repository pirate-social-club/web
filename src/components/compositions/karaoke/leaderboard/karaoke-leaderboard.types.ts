import { buildPublicProfilePath, formatProfileDisplayHandle } from "@/lib/profile-routing";

// API-shaped view models for karaoke leaderboards.
// Contract: core spec/karaoke-rankings §10. These mirror what the (not-yet-built)
// leaderboard endpoints will return — the UI consumes these, never DB rows.
// Scores cross this boundary in BASIS POINTS (0..10000); components convert to
// display percent only at render time.

export type RankingScope = "all_time" | "weekly";

export interface PublicLeaderboardIdentity {
  /** Bold primary label; equals the handle unless the profile set a separate display name. */
  displayName: string;
  /** Full routing handle label, e.g. "maya.pirate" / "diego.eth" (NOT a bare nickname). */
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

/**
 * Profile link for a leaderboard entry, or null when not linkable (the viewer's
 * own "You" row, anonymized entries, or no handle). Routes to /u/<handle>.
 */
export function leaderboardProfileHref(
  identity: PublicLeaderboardIdentity,
  isCurrentUser: boolean,
): string | null {
  if (isCurrentUser || identity.visibility !== "visible" || !identity.handle) {
    return null;
  }
  return buildPublicProfilePath(identity.handle);
}

/** Formatted handle label (".pirate" → "u/…", else bare), or null when not shown. */
export function leaderboardHandleLabel(identity: PublicLeaderboardIdentity): string | null {
  if (identity.visibility !== "visible" || !identity.handle) {
    return null;
  }
  return formatProfileDisplayHandle(identity.handle);
}
