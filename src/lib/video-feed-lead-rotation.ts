"use client";

// Phase 0 of services/api/docs/video-feed-ranking-spec.md.
//
// The video feed's server ordering is a deterministic function of global
// engagement counters, so a reload reproduces the previous ordering exactly and
// the viewer is greeted by the same lead video every time. Rotating the page on
// the client fixes that symptom without touching the cursor, the CDN, or the
// materialized public feed — all three of which would otherwise have to grow a
// viewer dimension to express "not this one again".
//
// Rotation is deliberately not a shuffle: it guarantees a different lead
// whenever any other candidate exists, and it preserves page membership so
// pagination stays coherent.

const STORAGE_KEY = "pirate_video_feed_recent_leads_v1";

// Deep enough that a viewer cycling the feed keeps moving through the corpus,
// shallow enough that a ~100-item corpus never exhausts its non-recent
// candidates and falls back to no rotation at all.
export const MAX_RECENT_LEAD_IDS = 10;

function getStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readRecentLeadVideoIds(): string[] {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((id): id is string => typeof id === "string" && id.length > 0)
      .slice(0, MAX_RECENT_LEAD_IDS);
  } catch {
    return [];
  }
}

/**
 * Pure form of the write, exported for tests: most-recent-first, deduplicated,
 * bounded, oldest evicted.
 */
export function withRecentLeadVideoId(
  recentLeadIds: readonly string[],
  leadId: string,
): string[] {
  if (!leadId) return [...recentLeadIds];
  return [leadId, ...recentLeadIds.filter((id) => id !== leadId)]
    .slice(0, MAX_RECENT_LEAD_IDS);
}

export function recordRecentLeadVideoId(leadId: string): void {
  const storage = getStorage();
  if (!storage || !leadId) return;
  try {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify(withRecentLeadVideoId(readRecentLeadVideoIds(), leadId)),
    );
  } catch {
    // Storage is full, disabled, or partitioned. Rotation degrades to the
    // server ordering, which is exactly the pre-Phase-0 behavior.
  }
}

// Rotation moves the entry point of a freshly fetched page; it says nothing
// about which videos the viewer has already been served. That second question
// only arises once a session navigates away from the feed and back, so the
// answer lives here too, as the single owner of "what this viewer has seen".
//
// Deep enough that a session's pagination stays repeat-free, bounded because a
// Set has no eviction of its own: the oldest ids are front-trimmed in insertion
// order, and once trimming starts a very long session degrades to server
// ordering for the evicted ids — the same graceful-degradation contract the
// lead rotation above documents.
export const MAX_SESSION_SEEN_VIDEO_IDS = 500;

// Session scope only, deliberately not localStorage: a reload is still served
// by the pre-hydration bootstrap plus lead rotation, and persisting served ids
// across reloads would eventually starve a viewer of a corpus this size. This
// set exists for SPA navigation within one JS session.
const sessionSeenVideoIds = new Set<string>();

function trimSessionSeenVideoIds(): void {
  let overflow = sessionSeenVideoIds.size - MAX_SESSION_SEEN_VIDEO_IDS;
  if (overflow <= 0) return;
  for (const id of sessionSeenVideoIds) {
    sessionSeenVideoIds.delete(id);
    overflow -= 1;
    if (overflow <= 0) return;
  }
}

/** Insertion-ordered snapshot. A copy: the set itself never escapes. */
export function readSessionSeenVideoIds(): string[] {
  return [...sessionSeenVideoIds];
}

export function countSeenSessionVideoIds(ids: Iterable<string>): number {
  let count = 0;
  for (const id of ids) {
    if (sessionSeenVideoIds.has(id)) count += 1;
  }
  return count;
}

export function recordSessionSeenVideoIds(ids: Iterable<string>): void {
  for (const id of ids) {
    if (id) sessionSeenVideoIds.add(id);
  }
  trimSessionSeenVideoIds();
}

/**
 * Returns the items this session has not been served yet, recording every one
 * it returns.
 *
 * Filtering, recording and trimming are one operation on purpose: an API that
 * handed out the live Set for callers to filter through would let every real
 * caller record ids without ever trimming, and the cap above would be
 * decoration.
 */
export function takeUnseenSessionVideos<T>(
  items: readonly T[],
  getId: (item: T) => string,
): T[] {
  const unseen = items.filter((item) => {
    const id = getId(item);
    if (!id || sessionSeenVideoIds.has(id)) return false;
    sessionSeenVideoIds.add(id);
    return true;
  });
  trimSessionSeenVideoIds();
  return unseen;
}

export function clearSessionSeenVideoIds(): void {
  sessionSeenVideoIds.clear();
}

/**
 * Rotates `items` so the first entry is the highest-ranked one whose id is not
 * in `recentLeadIds`, moving the skipped prefix to the end.
 *
 * Returns the input order unchanged when there is nothing to gain: fewer than
 * two items, the top item is already unseen, or every item is a recent lead.
 * That last case is why this is a rotation rather than a filter — a viewer who
 * has led on everything still gets a full feed.
 */
export function rotateToUnseenLead<T>(
  items: readonly T[],
  getId: (item: T) => string,
  recentLeadIds: readonly string[],
): T[] {
  if (items.length < 2) return [...items];
  const recent = new Set(recentLeadIds);
  const index = items.findIndex((item) => !recent.has(getId(item)));
  if (index <= 0) return [...items];
  return [...items.slice(index), ...items.slice(0, index)];
}
