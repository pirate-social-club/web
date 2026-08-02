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

export function validateShardCompatibility(
  payload,
  expectedSourceVersion,
  { environment = "production", phase = "converged", previousSourceVersion = null } = {},
) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Provisioning health returned a malformed JSON payload");
  }
  if (payload.environment !== environment) {
    throw new Error(
      `Provisioning health describes ${JSON.stringify(payload.environment ?? null)}, not ${environment}`,
    );
  }
  const actualSourceVersion = requiredString(
    payload.shard_version?.build?.sourceVersion,
    "shard_version.build.sourceVersion",
  );
  const liveApiExpectedSourceVersion = typeof payload.expected_shard_source_version === "string"
    ? payload.expected_shard_source_version
    : null;

  if (phase === "transition") {
    if (!previousSourceVersion) {
      throw new Error("Transition verification requires the immediately previous shard source version");
    }
    const exactConvergence = payload.ok === true
      && actualSourceVersion === expectedSourceVersion
      && liveApiExpectedSourceVersion === expectedSourceVersion;
    const boundedMismatch = payload.ok === false
      && payload.error_code === "d1_shard_version_mismatch"
      && actualSourceVersion === expectedSourceVersion
      && liveApiExpectedSourceVersion === previousSourceVersion;
    if (!exactConvergence && !boundedMismatch) {
      throw new Error(
        `Shard transition is outside the bounded previous-to-pinned window: previous=${previousSourceVersion}, pinned=${expectedSourceVersion}, live API expects=${liveApiExpectedSourceVersion ?? "not reported"}, shard serves=${actualSourceVersion}`,
      );
    }
  } else if (payload.ok !== true) {
    throw new Error(`Provisioning health is not ok (received ${JSON.stringify(payload.ok)})`);
  }

  if (phase !== "transition" && payload.shard_attestation?.healthy !== true) {
    throw new Error(
      `Shard attestation is not healthy (status ${JSON.stringify(payload.shard_attestation?.status ?? null)})`,
    );
  }

  if (phase === "pre-deploy") {
    const coherentPrevious = liveApiExpectedSourceVersion !== null
      && actualSourceVersion === liveApiExpectedSourceVersion;
    if (actualSourceVersion !== expectedSourceVersion && !coherentPrevious) {
      throw new Error(
        `Production is not a coherent previous pair or the pinned source: pinned=${expectedSourceVersion}, live API expects=${liveApiExpectedSourceVersion ?? "not reported"}, shard serves=${actualSourceVersion}`,
      );
    }
  } else if (phase !== "transition" && actualSourceVersion !== expectedSourceVersion) {
    throw new Error(
      `Pinned API expects shard source version ${expectedSourceVersion}, but production serves ${actualSourceVersion}`,
    );
  }

  return {
    actualSourceVersion,
    deployShard: phase === "pre-deploy" && actualSourceVersion !== expectedSourceVersion,
    liveApiExpectedSourceVersion,
    previousSourceVersion: phase === "pre-deploy" && actualSourceVersion !== expectedSourceVersion
      ? actualSourceVersion
      : previousSourceVersion,
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
  environment = "production",
  timeoutMs = DEFAULT_TIMEOUT_MS,
  retryDelayMs = DEFAULT_RETRY_DELAY_MS,
  fetchImpl = fetch,
  execFile = execFileSync,
  phase = "converged",
  previousSourceVersion = null,
  sleepImpl = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)),
}) {
  const expectedSourceVersion = deriveShardSourceVersion(apiDir, execFile);
  const url = new URL(healthUrl);
  url.searchParams.set("release_shard_verify", `${Date.now()}`);

  let response = null;
  let lastTransportError = null;
  let lastTransitionError = null;
  const maxAttempts = phase === "transition" ? 6 : 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
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
      if (phase === "transition") {
        try {
          const payload = await response.json();
          return {
            cfRay: response.headers.get("cf-ray"),
            environment,
            expectedSourceVersion,
            ...validateShardCompatibility(payload, expectedSourceVersion, {
              environment,
              phase,
              previousSourceVersion,
            }),
          };
        } catch (error) {
          lastTransitionError = error;
          if (attempt === maxAttempts) break;
        }
      } else if (response.status < 500 || attempt === maxAttempts) {
        break;
      }
    } catch (error) {
      lastTransportError = error;
      if (attempt === maxAttempts) {
        throw new Error(
          `Unable to read ${environment} provisioning health after ${maxAttempts} attempts: ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        );
      }
    }
    await sleepImpl(retryDelayMs);
  }

  if (phase === "transition" && lastTransitionError) {
    throw new Error(
      `Shard transition did not reach the bounded previous-to-pinned state after ${maxAttempts} attempts: ${lastTransitionError instanceof Error ? lastTransitionError.message : String(lastTransitionError)}`,
      { cause: lastTransitionError },
    );
  }

  if (!response) {
    throw new Error("Unable to read production provisioning health", { cause: lastTransportError });
  }
  if (!response.ok) {
    throw new Error(`${environment} provisioning health returned HTTP ${response.status}`);
  }

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error("Production provisioning health did not return valid JSON", { cause: error });
  }

  return {
    cfRay: response.headers.get("cf-ray"),
    environment,
    expectedSourceVersion,
    ...validateShardCompatibility(payload, expectedSourceVersion, {
      environment,
      phase,
      previousSourceVersion,
    }),
  };
}

export function formatSummary(result) {
  const value = (input) => input ?? "not reported";
  return [
    `## ${result.environment === "staging" ? "Staging" : "Production"} community-shard compatibility preflight`,
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
  const parsed = {
    apiDir: null,
    environment: "production",
    healthUrl: DEFAULT_HEALTH_URL,
    phase: "converged",
    previousSourceVersion: null,
  };
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === "--api-dir") parsed.apiDir = args[++index] ?? null;
    else if (value === "--environment") parsed.environment = args[++index] ?? null;
    else if (value === "--health-url") parsed.healthUrl = args[++index] ?? null;
    else if (value === "--phase") parsed.phase = args[++index] ?? null;
    else if (value === "--previous-source-version") parsed.previousSourceVersion = args[++index] ?? null;
    else throw new Error(`Unknown argument: ${value}`);
  }
  if (!parsed.apiDir
    || !["production", "staging"].includes(parsed.environment)
    || !["pre-deploy", "transition", "converged"].includes(parsed.phase)) {
    throw new Error("Usage: verify-community-shard-compatibility.mjs --api-dir <path> [--environment production|staging] [--phase pre-deploy|transition|converged] [--previous-source-version <version>] [--health-url <url>]");
  }
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
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, [
      `deploy_shard=${result.deployShard === true ? "true" : "false"}`,
      `previous_source_version=${result.previousSourceVersion ?? result.actualSourceVersion}`,
      "",
    ].join("\n"), "utf8");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
