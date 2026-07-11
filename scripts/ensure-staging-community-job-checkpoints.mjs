import { spawnSync } from "node:child_process";

const database = process.env.E2E_MULTIPART_GATE_D1_DATABASE;
const config = process.env.E2E_MULTIPART_GATE_D1_CONFIG;
const migration = process.env.E2E_MULTIPART_GATE_D1_MIGRATION;
if (!database || !config || !migration) throw new Error("Multipart fixture D1 migration configuration is incomplete");

function execute(...args) {
  const result = spawnSync("bunx", ["wrangler", "d1", "execute", database, "--remote", "--config", config, "--json", ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    throw new Error(`wrangler D1 execution failed with exit ${result.status}`);
  }
  return JSON.parse(result.stdout);
}

function columns() {
  const output = execute("--command", "PRAGMA table_info(community_jobs)");
  return new Set(output.flatMap((entry) => entry.results ?? []).map((row) => row.name));
}

const required = ["last_checkpoint", "last_checkpoint_at", "attempt_started_at", "attempt_deadline_at"];
let present = columns();
const presentCount = required.filter((column) => present.has(column)).length;
if (presentCount > 0 && presentCount < required.length) {
  throw new Error("Multipart fixture D1 has a partially applied checkpoint migration; refusing an unsafe replay");
}
if (presentCount === 0) {
  execute("--file", migration);
  present = columns();
}
const missing = required.filter((column) => !present.has(column));
if (missing.length) throw new Error(`Multipart fixture D1 migration is incomplete: ${missing.join(", ")}`);
console.log(`Verified community job checkpoint schema on ${database}`);
