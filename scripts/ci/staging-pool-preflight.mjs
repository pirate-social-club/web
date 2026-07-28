// Pre-flight assertions for staging D1 pool maintenance.
//
// The documented runbook requires two credentialed read-only checks before the
// pool is mutated. The refill workflow used to create databases first and read
// `d1 list` afterwards, so neither check could fail closed — by the time the
// evidence existed, the mutation had happened. These functions are pure so the
// dangerous cases can be tested without touching Cloudflare.
//
// Two distinct hazards:
//   1. Concurrent refill — another session created pool databases that have no
//      `d1_pool` row yet. Allocating over that range double-allocates D1s and
//      corrupts the contiguous index space.
//   2. Stale config — a `wrangler.jsonc` that no longer lists a binding the pool
//      table still hands out. Deploying it silently drops live communities.

const POOL_DATABASE_PATTERN = /^community-d1-pool-(\d{4})-(.+)$/u;

export function poolBindingName(index) {
  return `DB_CMTY_${String(index).padStart(4, "0")}`;
}

export function poolDatabaseName(index, envSuffix = "staging") {
  return `community-d1-pool-${String(index).padStart(4, "0")}-${envSuffix}`;
}

// Mirrors planPoolBindings in api's allocate-d1-pool.ts. The expected additions
// must be derived, never eyeballed from a diff.
export function planExpectedAdditions(startIndex, count) {
  const start = Number(startIndex);
  const total = Number(count);
  if (!Number.isInteger(start) || start < 0) throw new Error(`invalid start index: ${startIndex}`);
  if (!Number.isInteger(total) || total <= 0) throw new Error(`invalid count: ${count}`);
  return Array.from({ length: total }, (_, offset) => poolBindingName(start + offset));
}

export function parsePoolDatabaseIndex(databaseName, envSuffix = "staging") {
  const match = POOL_DATABASE_PATTERN.exec(String(databaseName || ""));
  if (!match || match[2] !== envSuffix) return null;
  return Number(match[1]);
}

export function bindingIndex(bindingName) {
  const match = /^DB_CMTY_(\d{4})$/u.exec(String(bindingName || ""));
  return match ? Number(match[1]) : null;
}

// wrangler.jsonc is JSON with comments. Strip only comments that are outside
// string literals — a naive replace mangles any "https://..." value.
export function parseJsonc(text) {
  let out = "";
  let inString = false;
  let escaped = false;
  let comment = null; // "line" | "block"
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (comment === "line") {
      if (char === "\n") { comment = null; out += char; }
      continue;
    }
    if (comment === "block") {
      if (char === "*" && next === "/") { comment = null; i += 1; }
      continue;
    }
    if (inString) {
      out += char;
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') { inString = true; out += char; continue; }
    if (char === "/" && next === "/") { comment = "line"; i += 1; continue; }
    if (char === "/" && next === "*") { comment = "block"; i += 1; continue; }
    out += char;
  }
  return JSON.parse(out);
}

// Reads bindings from ONE environment's d1_databases block, defaulting to the
// top-level (unnamed) environment — which is what `wrangler deploy --env=""`
// ships and therefore what staging pool maintenance operates on.
//
// Deliberately NOT a recursive walk. The same binding name legitimately appears
// once per environment (DB_CMTY_0054 maps to …-0054-staging at the top level and
// …-0054-prod under env.production), so collecting across environments both
// invents duplicate-binding failures and would compare staging pool rows against
// production database entries.
export function readConfigBindings(config, envName = null) {
  const scope = envName ? config?.env?.[envName] : config;
  const entries = Array.isArray(scope?.d1_databases) ? scope.d1_databases : [];
  return entries
    .filter((entry) => entry && typeof entry.binding === "string" && bindingIndex(entry.binding) !== null)
    .map((entry) => ({ binding: entry.binding, databaseId: entry.database_id, databaseName: entry.database_name }));
}

// `wrangler d1 execute --json` returns [{ results: [...] }]; be tolerant of the
// bare-array and single-object shapes too rather than trusting one wrangler version.
export function readPoolBindingNames(payload) {
  const rows = Array.isArray(payload)
    ? payload.flatMap((entry) => (Array.isArray(entry?.results) ? entry.results : Array.isArray(entry) ? entry : [entry]))
    : Array.isArray(payload?.results) ? payload.results : [];
  return rows
    .map((row) => (typeof row === "string" ? row : row?.binding_name))
    .filter((name) => typeof name === "string" && name.length > 0);
}

export function readD1PoolIndexes(payload, envSuffix = "staging") {
  const list = Array.isArray(payload) ? payload : Array.isArray(payload?.result) ? payload.result : [];
  return list
    .map((entry) => parsePoolDatabaseIndex(typeof entry === "string" ? entry : entry?.name, envSuffix))
    .filter((index) => index !== null)
    .sort((a, b) => a - b);
}

/**
 * Fails closed when a pool database exists above the highest registered binding:
 * that gap is another session mid-refill, and allocating into it double-allocates.
 * Also refuses a requested range that is not strictly above everything known.
 */
export function checkRefillSafety({ d1Indexes, poolBindingNames, startIndex, count }) {
  const problems = [];
  const maxPoolIndex = poolBindingNames.reduce((max, name) => Math.max(max, bindingIndex(name) ?? -1), -1);
  const maxD1Index = d1Indexes.reduce((max, index) => Math.max(max, index), -1);
  const orphaned = d1Indexes.filter((index) => index > maxPoolIndex);

  // Every registered binding has a 1:1 database by construction, so the inventory
  // can never legitimately be smaller than the pool table. If it is, `d1 list` was
  // truncated (pagination) or databases were deleted — and a short list makes the
  // orphan check below silently under-report, which is the exact failure this
  // pre-flight exists to prevent. Refuse to judge on evidence we cannot trust.
  const poolDatabaseCount = d1Indexes.length;
  if (poolDatabaseCount < poolBindingNames.length) {
    problems.push(
      `incomplete inventory: d1 list returned ${poolDatabaseCount} pool database(s) but the pool table has `
      + `${poolBindingNames.length} binding(s). The listing is truncated or databases are missing; `
      + `the overlap check cannot be trusted — stand down.`,
    );
  }

  if (orphaned.length > 0) {
    problems.push(
      `concurrent refill: ${orphaned.length} pool database(s) exist above the highest registered binding `
      + `(${poolBindingName(maxPoolIndex)}): ${orphaned.slice(0, 5).map((i) => poolDatabaseName(i)).join(", ")}`
      + `${orphaned.length > 5 ? ", …" : ""}. Another session is mid-refill — stand down.`,
    );
  }
  const start = Number(startIndex);
  const highestKnown = Math.max(maxPoolIndex, maxD1Index);
  if (start <= highestKnown) {
    problems.push(
      `requested start index ${start} is not above the highest known pool index ${highestKnown}; `
      + `refilling here would reallocate existing databases. Use ${highestKnown + 1}.`,
    );
  }
  return { maxD1Index, maxPoolIndex, orphaned, expected: planExpectedAdditions(startIndex, count), problems };
}

/**
 * Every binding the pool table can still hand out must be present in the config
 * about to be deployed. A missing one is a live community that loses its database.
 */
export function checkConfigCoverage({ poolBindingNames, configBindingNames }) {
  const configured = new Set(configBindingNames);
  const missing = poolBindingNames.filter((name) => !configured.has(name));
  const duplicates = configBindingNames.filter((name, index) => configBindingNames.indexOf(name) !== index);
  const problems = [];
  if (missing.length > 0) {
    problems.push(
      `stale config: ${missing.length} live pool binding(s) are absent from the shard config: `
      + `${missing.slice(0, 5).join(", ")}${missing.length > 5 ? ", …" : ""}. Deploying it would strand those communities.`,
    );
  }
  if (duplicates.length > 0) {
    problems.push(`duplicate binding(s) in config: ${[...new Set(duplicates)].join(", ")}`);
  }
  return { missing, duplicates, problems };
}

/**
 * Strict append-only: the config may differ from the live pool by exactly the
 * planned additions and nothing else. A renamed or removed binding shows up as
 * both a coverage failure and an unexpected delta, so neither can slip through.
 */
export function checkAppendOnly({ poolBindingNames, configBindingNames, expectedAdditions }) {
  const pool = new Set(poolBindingNames);
  const expected = new Set(expectedAdditions);
  const added = configBindingNames.filter((name) => !pool.has(name));
  const unexpected = added.filter((name) => !expected.has(name));
  const absent = expectedAdditions.filter((name) => !configBindingNames.includes(name));
  const problems = [];
  if (unexpected.length > 0) {
    problems.push(
      `unexpected config delta: ${unexpected.length} binding(s) added that are not part of this refill: `
      + `${unexpected.slice(0, 5).join(", ")}${unexpected.length > 5 ? ", …" : ""}`,
    );
  }
  if (absent.length > 0) {
    problems.push(
      `incomplete config: ${absent.length} planned binding(s) missing from the config: `
      + `${absent.slice(0, 5).join(", ")}${absent.length > 5 ? ", …" : ""}`,
    );
  }
  return { added, unexpected, absent, problems };
}

async function readJsonFile(path) {
  const { readFile } = await import("node:fs/promises");
  return JSON.parse(await readFile(path, "utf8"));
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith("--")) continue;
    const key = argv[i].slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[(i += 1)] : "true";
    args[key] = value;
  }
  return args;
}

// Renders the state a human needs to diagnose a discrepancy without having to
// infer it from a pass/fail. Written to the step summary on every run, including
// dry runs, because "the check passed" is not a description of the pool.
export function formatReport({ mode, poolBindingNames, configBindingNames, expectedAdditions, d1Indexes, problems }) {
  const poolSet = new Set(poolBindingNames);
  const configSet = new Set(configBindingNames);
  const missingFromConfig = poolBindingNames.filter((name) => !configSet.has(name));
  const notInPool = configBindingNames.filter((name) => !poolSet.has(name));
  const indexes = configBindingNames.map((name) => bindingIndex(name)).filter((index) => index !== null);
  const maxIndex = indexes.length > 0 ? Math.max(...indexes) : 0;
  const gaps = [];
  for (let index = 1; index <= maxIndex; index += 1) {
    if (!configSet.has(poolBindingName(index))) gaps.push(poolBindingName(index));
  }
  return [
    `## Staging pool pre-flight (${mode})`,
    "",
    `| measure | value |`,
    `| --- | --- |`,
    `| pool rows (\`d1_pool\`) | ${poolBindingNames.length} |`,
    `| config bindings (deployed env) | ${configBindingNames.length} |`,
    `| pool databases seen (\`d1 list\`) | ${d1Indexes ? d1Indexes.length : "n/a"} |`,
    `| highest config index | ${maxIndex} |`,
    `| planned additions | ${expectedAdditions.length} (${expectedAdditions[0]}…${expectedAdditions[expectedAdditions.length - 1]}) |`,
    `| pool rows absent from config | ${missingFromConfig.length}${missingFromConfig.length ? ` (${missingFromConfig.slice(0, 10).join(", ")})` : ""} |`,
    `| config bindings with no pool row | ${notInPool.length}${notInPool.length ? ` (${notInPool.slice(0, 10).join(", ")})` : ""} |`,
    `| gaps in config range | ${gaps.length}${gaps.length ? ` (${gaps.slice(0, 10).join(", ")})` : ""} |`,
    "",
    problems.length > 0 ? `### Blocking\n\n${problems.map((problem) => `- ${problem}`).join("\n")}` : "### No blocking findings",
  ].join("\n");
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const mode = args.mode || "refill";
  const envSuffix = args["env-suffix"] || "staging";
  const { readFile } = await import("node:fs/promises");

  const poolBindingNames = readPoolBindingNames(await readJsonFile(args["pool-json"]));
  if (poolBindingNames.length === 0) {
    console.error("::error::pre-flight read no pool bindings; refusing to proceed on empty evidence.");
    return 1;
  }
  const configBindingNames = readConfigBindings(parseJsonc(await readFile(args.config, "utf8"))).map((e) => e.binding);
  const expectedAdditions = planExpectedAdditions(args.start, args.count);

  const problems = [];
  let d1Indexes = null;
  if (mode === "refill") {
    d1Indexes = readD1PoolIndexes(await readJsonFile(args["d1-list-json"]), envSuffix);
    const refill = checkRefillSafety({ d1Indexes, poolBindingNames, startIndex: args.start, count: args.count });
    problems.push(...refill.problems);
    // The config must already cover what is live before we add to it.
    problems.push(...checkConfigCoverage({ poolBindingNames, configBindingNames }).problems);
  } else {
    problems.push(...checkConfigCoverage({ poolBindingNames, configBindingNames }).problems);
    problems.push(...checkAppendOnly({ poolBindingNames, configBindingNames, expectedAdditions }).problems);
  }

  const report = formatReport({ mode, poolBindingNames, configBindingNames, expectedAdditions, d1Indexes, problems });
  console.log(report);
  if (args["report-file"]) {
    const { writeFile } = await import("node:fs/promises");
    await writeFile(args["report-file"], `${report}\n`, "utf8");
  }

  // A dry run reports and stops. It must never influence whether a mutation
  // happens, so its exit code describes the pool, not a go/no-go: findings are
  // surfaced as warnings and the run still succeeds, because a dry run that
  // "fails" would read as a broken workflow rather than a diagnosis.
  if (args["dry-run"] === "true") {
    for (const problem of problems) console.warn(`::warning::${problem}`);
    console.log(`::notice::dry run: ${problems.length} finding(s); no mutation attempted.`);
    return 0;
  }

  if (problems.length > 0) {
    for (const problem of problems) console.error(`::error::${problem}`);
    return 1;
  }
  console.log(`::notice::staging pool pre-flight (${mode}) passed.`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(await main());
}
