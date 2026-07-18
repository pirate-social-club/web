import { spawnSync } from "node:child_process";

const database = process.env.E2E_MULTIPART_GATE_D1_DATABASE;
const config = process.env.E2E_MULTIPART_GATE_D1_CONFIG;
const checkpointMigration = process.env.E2E_MULTIPART_GATE_CHECKPOINT_MIGRATION;
const storyMetadataMigration = process.env.E2E_MULTIPART_GATE_STORY_METADATA_MIGRATION;
if (!database || !checkpointMigration || !storyMetadataMigration) {
  throw new Error("Multipart fixture D1 migration configuration is incomplete");
}

function execute(...args) {
  const configArgs = config ? ["--config", config] : [];
  const result = spawnSync("bunx", ["wrangler", "d1", "execute", database, "--remote", ...configArgs, "--json", ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    throw new Error(`wrangler D1 execution failed with exit ${result.status}`);
  }
  return JSON.parse(result.stdout);
}

function columns(table) {
  const output = execute("--command", `PRAGMA table_info(${table})`);
  return new Set(output.flatMap((entry) => entry.results ?? []).map((row) => row.name));
}

function ensureColumns({ table, required, migration, label }) {
  let present = columns(table);
  const presentCount = required.filter((column) => present.has(column)).length;
  if (presentCount > 0 && presentCount < required.length) {
    throw new Error(`Multipart fixture D1 has a partially applied ${label} migration; refusing an unsafe replay`);
  }
  if (presentCount === 0) {
    execute("--file", migration);
    present = columns(table);
  }
  const missing = required.filter((column) => !present.has(column));
  if (missing.length) throw new Error(`Multipart fixture D1 ${label} migration is incomplete: ${missing.join(", ")}`);
}

ensureColumns({
  table: "community_jobs",
  required: ["last_checkpoint", "last_checkpoint_at", "attempt_started_at", "attempt_deadline_at"],
  migration: checkpointMigration,
  label: "community job checkpoint",
});
ensureColumns({
  table: "assets",
  required: ["story_ip_metadata_uri", "story_ip_metadata_hash", "story_nft_metadata_uri", "story_nft_metadata_hash"],
  migration: storyMetadataMigration,
  label: "Story metadata",
});
console.log(`Verified required staging fixture schema on ${database}`);
