import { execFileSync } from "node:child_process";
import { appendFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const DEFAULT_HEALTH_URL = "https://api.pirate.sc/health/provisioning";
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RETRY_DELAY_MS = 1_000;

function requiredString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Provisioning health payload is missing ${label}`);
  }
  return value;
}

export function deriveShardSourceVersion(apiDir, execFile = execFileSync) {
  const tree = (path) => String(execFile(
    "git",
    ["-C", apiDir, "rev-parse", `HEAD:${path}`],
    { encoding: "utf8" },
  )).trim();

  return `${tree("services/community-d1-shard")}.${tree("services/shared")}`;
}

export function validateShardCompatibility(payload, expectedSourceVersion) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Provisioning health returned a malformed JSON payload");
  }
  if (payload.ok !== true) {
    throw new Error(`Provisioning health is not ok (received ${JSON.stringify(payload.ok)})`);
  }
  if (payload.environment !== "production") {
    throw new Error(
      `Provisioning health describes ${JSON.stringify(payload.environment ?? null)}, not production`,
    );
  }
  if (payload.shard_attestation?.healthy !== true) {
    throw new Error(
      `Shard attestation is not healthy (status ${JSON.stringify(payload.shard_attestation?.status ?? null)})`,
    );
  }

  const actualSourceVersion = requiredString(
    payload.shard_version?.build?.sourceVersion,
    "shard_version.build.sourceVersion",
  );
  if (actualSourceVersion !== expectedSourceVersion) {
    throw new Error(
      `Pinned API expects shard source version ${expectedSourceVersion}, but production serves ${actualSourceVersion}`,
    );
  }

  return {
    actualSourceVersion,
    liveApiExpectedSourceVersion: typeof payload.expected_shard_source_version === "string"
      ? payload.expected_shard_source_version
      : null,
    shardGitSha: typeof payload.shard_version?.build?.gitSha === "string"
      ? payload.shard_version.build.gitSha
      : null,
    workerVersionId: typeof payload.shard_version?.workerVersion?.id === "string"
      ? payload.shard_version.workerVersion.id
      : null,
    workerVersionTag: typeof payload.shard_version?.workerVersion?.tag === "string"
      ? payload.shard_version.workerVersion.tag
      : null,
  };
}

export async function verifyShardCompatibility({
  apiDir,
  healthUrl = DEFAULT_HEALTH_URL,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  retryDelayMs = DEFAULT_RETRY_DELAY_MS,
  fetchImpl = fetch,
  execFile = execFileSync,
  sleepImpl = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)),
}) {
  const expectedSourceVersion = deriveShardSourceVersion(apiDir, execFile);
  const url = new URL(healthUrl);
  url.searchParams.set("release_shard_verify", `${Date.now()}`);

  let response = null;
  let lastTransportError = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      response = await fetchImpl(url, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache, no-store, max-age=0",
          Pragma: "no-cache",
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.status < 500 || attempt === 2) break;
    } catch (error) {
      lastTransportError = error;
      if (attempt === 2) {
        throw new Error(
          `Unable to read production provisioning health after 2 attempts: ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        );
      }
    }
    await sleepImpl(retryDelayMs);
  }

  if (!response) {
    throw new Error("Unable to read production provisioning health", { cause: lastTransportError });
  }
  if (!response.ok) {
    throw new Error(`Production provisioning health returned HTTP ${response.status}`);
  }

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error("Production provisioning health did not return valid JSON", { cause: error });
  }

  return {
    cfRay: response.headers.get("cf-ray"),
    expectedSourceVersion,
    ...validateShardCompatibility(payload, expectedSourceVersion),
  };
}

export function formatSummary(result) {
  const value = (input) => input ?? "not reported";
  return [
    "## Production community-shard compatibility preflight",
    "",
    "| Field | Value |",
    "| --- | --- |",
    `| Pinned API expected source version | \`${result.expectedSourceVersion}\` |`,
    `| Live shard source version | \`${result.actualSourceVersion}\` |`,
    `| Live API expected source version (diagnostic only) | \`${value(result.liveApiExpectedSourceVersion)}\` |`,
    `| Shard Git SHA | \`${value(result.shardGitSha)}\` |`,
    `| Worker version ID | \`${value(result.workerVersionId)}\` |`,
    `| Worker version tag | \`${value(result.workerVersionTag)}\` |`,
    `| CF-Ray | \`${value(result.cfRay)}\` |`,
    "",
  ].join("\n");
}

function parseArgs(args) {
  const parsed = { apiDir: null, healthUrl: DEFAULT_HEALTH_URL };
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === "--api-dir") parsed.apiDir = args[++index] ?? null;
    else if (value === "--health-url") parsed.healthUrl = args[++index] ?? null;
    else throw new Error(`Unknown argument: ${value}`);
  }
  if (!parsed.apiDir) throw new Error("Usage: verify-community-shard-compatibility.mjs --api-dir <path> [--health-url <url>]");
  return parsed;
}

async function main() {
  const input = parseArgs(process.argv.slice(2));
  const result = await verifyShardCompatibility(input);
  const summary = formatSummary(result);
  process.stdout.write(summary);
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, summary, "utf8");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
