import { execFileSync } from "node:child_process";
import { appendFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const DEFAULT_HEALTH_URL = "https://api.pirate.sc/health/provisioning";
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RETRY_DELAY_MS = 1_000;
// A Workers deploy is not visible everywhere the instant wrangler returns. The
// transition phase polls for the shard to flip, so it needs a budget measured
// in "how long can propagation take", not a fixed attempt count. 6 attempts at
// a flat 1s gave a ~6s window and cost a production release two failed attempts
// on 2026-08-03 while every version reported was mutually consistent.
const DEFAULT_TRANSITION_BUDGET_MS = 90_000;
const MAX_RETRY_DELAY_MS = 5_000;

// The shard and the live API both still reporting the PREVIOUS pair is not a
// failure — it is the state before propagation lands, and the only cure is
// waiting. Distinguishing it from a genuinely unexpected version matters in
// both directions: without it the wait is wasted on states that will never
// converge, and a real incompatibility burns the whole budget before failing.
export class ShardPropagationPendingError extends Error {
  constructor(message) {
    super(message);
    this.name = "ShardPropagationPendingError";
  }
}

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
  const boundedPreDeployMismatch = phase === "pre-deploy"
    && payload.ok === false
    && payload.error_code === "d1_shard_version_mismatch"
    && actualSourceVersion === expectedSourceVersion
    && liveApiExpectedSourceVersion !== null
    && liveApiExpectedSourceVersion !== expectedSourceVersion;

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
    // Nothing has moved yet: the shard still serves the previous source and the
    // live API still expects it. Coherent, healthy, and simply not propagated.
    const stillOnPrevious = actualSourceVersion === previousSourceVersion
      && liveApiExpectedSourceVersion === previousSourceVersion;
    if (!exactConvergence && !boundedMismatch) {
      const detail = `previous=${previousSourceVersion}, pinned=${expectedSourceVersion}, live API expects=${liveApiExpectedSourceVersion ?? "not reported"}, shard serves=${actualSourceVersion}`;
      if (stillOnPrevious) {
        throw new ShardPropagationPendingError(`Shard transition has not propagated yet: ${detail}`);
      }
      throw new Error(`Shard transition is outside the bounded previous-to-pinned window: ${detail}`);
    }
  } else if (!boundedPreDeployMismatch && payload.ok !== true) {
    throw new Error(`Provisioning health is not ok (received ${JSON.stringify(payload.ok)})`);
  }

  if (phase !== "transition" && !boundedPreDeployMismatch && payload.shard_attestation?.healthy !== true) {
    throw new Error(
      `Shard attestation is not healthy (status ${JSON.stringify(payload.shard_attestation?.status ?? null)})`,
    );
  }

  if (phase === "pre-deploy") {
    const coherentPrevious = liveApiExpectedSourceVersion !== null
      && actualSourceVersion === liveApiExpectedSourceVersion;
    if (actualSourceVersion !== expectedSourceVersion && !coherentPrevious && !boundedPreDeployMismatch) {
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
  transitionBudgetMs = DEFAULT_TRANSITION_BUDGET_MS,
  sleepImpl = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)),
  nowImpl = () => Date.now(),
}) {
  const expectedSourceVersion = deriveShardSourceVersion(apiDir, execFile);
  const url = new URL(healthUrl);
  url.searchParams.set("release_shard_verify", `${Date.now()}`);

  let response = null;
  let lastTransportError = null;
  let lastCompatibilityError = null;
  // The transition phase waits out propagation, so it is bounded by elapsed time
  // rather than a fixed count. Every other phase describes a state that should
  // already be settled, and keeps its small count.
  const isTransition = phase === "transition";
  const startedAtMs = nowImpl();
  const maxAttempts = isTransition ? Number.POSITIVE_INFINITY : 2;
  const attemptsExhausted = (attempt) => (isTransition
    ? nowImpl() - startedAtMs >= transitionBudgetMs
    : attempt >= maxAttempts);
  const describeBudget = (attempt) => (isTransition
    ? `${attempt} attempts over ${Math.round((nowImpl() - startedAtMs) / 1000)}s`
    : `${maxAttempts} attempts`);
  let lastAttempt = 0;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    lastAttempt = attempt;
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
      if (phase === "transition" || phase === "pre-deploy") {
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
          lastCompatibilityError = error;
          // Only propagation-pending states are worth waiting on. A version we
          // never expected will not become expected, so fail immediately rather
          // than spending the whole budget arriving at the same answer.
          if (isTransition && !(error instanceof ShardPropagationPendingError)) break;
          if (attemptsExhausted(attempt)) break;
        }
      } else if (response.status < 500 || attemptsExhausted(attempt)) {
        break;
      }
    } catch (error) {
      lastTransportError = error;
      if (attemptsExhausted(attempt)) {
        throw new Error(
          `Unable to read ${environment} provisioning health after ${describeBudget(attempt)}: ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        );
      }
    }
    // Back off so a 90s budget is a handful of probes rather than 90 of them,
    // while still reacting quickly when propagation lands early.
    const delayMs = isTransition
      ? Math.min(retryDelayMs * 2 ** (attempt - 1), MAX_RETRY_DELAY_MS)
      : retryDelayMs;
    await sleepImpl(delayMs);
  }

  if ((phase === "transition" || phase === "pre-deploy") && lastCompatibilityError) {
    throw new Error(
      `Shard ${phase} verification failed after ${describeBudget(lastAttempt)}: ${lastCompatibilityError instanceof Error ? lastCompatibilityError.message : String(lastCompatibilityError)}`,
      { cause: lastCompatibilityError },
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
