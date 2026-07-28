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

// Collects DB_CMTY bindings from every d1_databases block in the config,
// including per-environment overrides, so a binding hidden in `env.*` still counts.
export function readConfigBindings(config) {
  const found = [];
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node.d1_databases)) {
      for (const entry of node.d1_databases) {
        if (entry && typeof entry.binding === "string" && bindingIndex(entry.binding) !== null) {
          found.push({ binding: entry.binding, databaseId: entry.database_id, databaseName: entry.database_name });
        }
      }
    }
    for (const value of Object.values(node)) {
      if (value && typeof value === "object") visit(value);
    }
  };
  visit(config);
  return found;
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
  if (mode === "refill") {
    const d1Indexes = readD1PoolIndexes(await readJsonFile(args["d1-list-json"]), envSuffix);
    const refill = checkRefillSafety({ d1Indexes, poolBindingNames, startIndex: args.start, count: args.count });
    problems.push(...refill.problems);
    // The config must already cover what is live before we add to it.
    problems.push(...checkConfigCoverage({ poolBindingNames, configBindingNames }).problems);
    console.log(`pool bindings: ${poolBindingNames.length}, max pool index: ${refill.maxPoolIndex}, max D1 index: ${refill.maxD1Index}`);
  } else {
    problems.push(...checkConfigCoverage({ poolBindingNames, configBindingNames }).problems);
    problems.push(...checkAppendOnly({ poolBindingNames, configBindingNames, expectedAdditions }).problems);
    console.log(`pool bindings: ${poolBindingNames.length}, config bindings: ${configBindingNames.length}`);
  }
  console.log(`expected additions: ${expectedAdditions[0]}…${expectedAdditions[expectedAdditions.length - 1]} (${expectedAdditions.length})`);

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
