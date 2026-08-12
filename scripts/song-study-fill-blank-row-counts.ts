import { readFileSync, writeFileSync } from "node:fs";

type RowCounts = {
  song_study_attempt: number;
  song_study_review_state: number;
};

type Shard = {
  database_name: string;
  row_counts?: Partial<RowCounts>;
};

type Manifest = { shards: Shard[] };

type Comparison = {
  compared_shards: number;
  failures: Array<{
    database_name: string;
    kind: "missing_before_counts" | "missing_or_duplicate_verification" | "missing_after_counts" | "row_count_loss";
    before?: RowCounts;
    after?: RowCounts;
    verification_matches?: number;
  }>;
  growth: Array<{
    database_name: string;
    before: RowCounts;
    after: RowCounts;
  }>;
};

function completeRowCounts(value: Partial<RowCounts> | undefined): value is RowCounts {
  return (
    Number.isSafeInteger(value?.song_study_attempt) &&
    Number.isSafeInteger(value?.song_study_review_state) &&
    (value?.song_study_attempt ?? -1) >= 0 &&
    (value?.song_study_review_state ?? -1) >= 0
  );
}

export function compareSongStudyRowCounts(before: Manifest, after: Manifest): Comparison {
  const failures: Comparison["failures"] = [];
  const growth: Comparison["growth"] = [];
  let comparedShards = 0;

  for (const beforeShard of before.shards) {
    if (!completeRowCounts(beforeShard.row_counts)) {
      failures.push({ database_name: beforeShard.database_name, kind: "missing_before_counts" });
      continue;
    }
    const matches = after.shards.filter((shard) => shard.database_name === beforeShard.database_name);
    if (matches.length !== 1) {
      failures.push({
        database_name: beforeShard.database_name,
        kind: "missing_or_duplicate_verification",
        before: beforeShard.row_counts,
        verification_matches: matches.length,
      });
      continue;
    }
    const afterCounts = matches[0]?.row_counts;
    if (!completeRowCounts(afterCounts)) {
      failures.push({
        database_name: beforeShard.database_name,
        kind: "missing_after_counts",
        before: beforeShard.row_counts,
      });
      continue;
    }
    comparedShards += 1;
    if (
      afterCounts.song_study_attempt < beforeShard.row_counts.song_study_attempt ||
      afterCounts.song_study_review_state < beforeShard.row_counts.song_study_review_state
    ) {
      failures.push({
        database_name: beforeShard.database_name,
        kind: "row_count_loss",
        before: beforeShard.row_counts,
        after: afterCounts,
      });
    } else if (
      afterCounts.song_study_attempt > beforeShard.row_counts.song_study_attempt ||
      afterCounts.song_study_review_state > beforeShard.row_counts.song_study_review_state
    ) {
      growth.push({
        database_name: beforeShard.database_name,
        before: beforeShard.row_counts,
        after: afterCounts,
      });
    }
  }

  return { compared_shards: comparedShards, failures, growth };
}

if (import.meta.main) {
  const [beforePath, afterPath, outputPath] = process.argv.slice(2);
  if (!beforePath || !afterPath || !outputPath) {
    throw new Error("usage: bun song-study-fill-blank-row-counts.ts BEFORE AFTER OUTPUT");
  }
  const before = JSON.parse(readFileSync(beforePath, "utf8")) as Manifest;
  const after = JSON.parse(readFileSync(afterPath, "utf8")) as Manifest;
  const comparison = compareSongStudyRowCounts(before, after);
  writeFileSync(outputPath, `${JSON.stringify(comparison, null, 2)}\n`);
  if (comparison.growth.length > 0) {
    console.log(`${comparison.growth.length} shard(s) received study writes during migration; recorded as expected growth.`);
  }
  if (comparison.failures.length > 0) {
    console.error(JSON.stringify(comparison.failures, null, 2));
    console.error(`${comparison.failures.length} shard(s) lost rows or lack complete post-migration evidence.`);
    process.exit(1);
  }
}
