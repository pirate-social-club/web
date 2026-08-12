import { describe, expect, test } from "bun:test";
import { compareSongStudyRowCounts } from "./song-study-fill-blank-row-counts";

const counts = (attempts: number, reviews: number) => ({
  song_study_attempt: attempts,
  song_study_review_state: reviews,
});

describe("fill-blank rebuild row-count verification", () => {
  test("reports concurrent growth without treating it as data loss", () => {
    const result = compareSongStudyRowCounts(
      { shards: [{ database_name: "community-d1-pool-0001-staging", row_counts: counts(100, 20) }] },
      { shards: [{ database_name: "community-d1-pool-0001-staging", row_counts: counts(104, 21) }] },
    );
    expect(result.failures).toEqual([]);
    expect(result.growth).toHaveLength(1);
    expect(result.compared_shards).toBe(1);
  });

  test("fails when either rebuilt table loses rows", () => {
    const result = compareSongStudyRowCounts(
      { shards: [{ database_name: "community-d1-pool-0001-prod", row_counts: counts(100, 20) }] },
      { shards: [{ database_name: "community-d1-pool-0001-prod", row_counts: counts(99, 20) }] },
    );
    expect(result.failures).toEqual([
      {
        database_name: "community-d1-pool-0001-prod",
        kind: "row_count_loss",
        before: counts(100, 20),
        after: counts(99, 20),
      },
    ]);
  });

  test("fails closed when a shard or its post-migration counts are absent", () => {
    const before = {
      shards: [
        { database_name: "community-d1-pool-0001-prod", row_counts: counts(100, 20) },
        { database_name: "community-d1-pool-0002-prod", row_counts: counts(50, 10) },
      ],
    };
    const result = compareSongStudyRowCounts(before, {
      shards: [{ database_name: "community-d1-pool-0002-prod" }],
    });
    expect(result.failures.map(({ kind }) => kind)).toEqual([
      "missing_or_duplicate_verification",
      "missing_after_counts",
    ]);
  });

  test("fails closed when either count field is missing", () => {
    const result = compareSongStudyRowCounts(
      { shards: [{ database_name: "community-d1-pool-0001-prod", row_counts: counts(100, 20) }] },
      { shards: [{ database_name: "community-d1-pool-0001-prod", row_counts: { song_study_attempt: 100 } }] },
    );
    expect(result.failures[0]?.kind).toBe("missing_after_counts");
  });
});
