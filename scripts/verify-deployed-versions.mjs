import { pathToFileURL } from "node:url";

import {
  targetIdentityFromUrl,
  validateMatchingReleaseAttestations,
  validateVersionPayload,
} from "./lib/deployment-attestation.mjs";

const DEFAULT_ATTEMPTS = 12;
const DEFAULT_DELAY_MS = 5_000;

function sleep(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function parseTargets(args) {
  if (args.length === 0 || args.length % 2 !== 0) {
    throw new Error("Usage: verify-deployed-versions.mjs <version-url> <expected-sha> [...]");
  }
  const targets = [];
  for (let index = 0; index < args.length; index += 2) {
    const url = args[index];
    const expectedSha = args[index + 1];
    if (!url || !expectedSha) {
      throw new Error("Every version URL must have an expected SHA");
    }
    targets.push({ expectedSha, url, ...targetIdentityFromUrl(url) });
  }
  return targets;
}

// A SHA MISMATCH and a TRANSPORT FAILURE are different events and must not share
// a retry policy. A mismatch is a fact about what is deployed: retrying cannot
// change it, and for a caller checking "was this replaced?" it is terminal. A
// fetch failure, timeout or 5xx says nothing about what is deployed — it is
// exactly what retries exist for. Conflating them cost us a production-blocking
// gate failure on 2026-07-22: a single `fetch failed` on an otherwise green run,
// with retries disabled because the caller wanted mismatches to fail fast.
export class VersionMismatchError extends Error {
  constructor(message) {
    super(message);
    this.name = "VersionMismatchError";
  }
}

async function readVersion(target, attempt, fetchImpl, expectedReleaseId) {
  const url = new URL(target.url);
  url.searchParams.set("release_verify", `${Date.now()}-${attempt}`);
  const response = await fetchImpl(url, {
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache, no-store, max-age=0",
      Pragma: "no-cache",
    },
  });
  if (!response.ok) {
    // Transport-ish: the origin may be mid-deploy or briefly unhealthy.
    throw new Error(`${target.url} returned HTTP ${response.status}`);
  }
  const body = await response.json();
  const validation = validateVersionPayload(body, {
    service: target.service,
    environment: target.environment,
    gitSha: target.expectedSha,
    releaseId: expectedReleaseId,
  });
  if (validation.failures.length > 0) {
    throw new VersionMismatchError(
      `${target.url} ${validation.failures.join("; ")}`,
    );
  }
  return { body, gitSha: validation.metadata.gitSha };
}

export async function verifyDeployedVersions(targets, {
  attempts = DEFAULT_ATTEMPTS,
  delayMs = DEFAULT_DELAY_MS,
  failFastOnMismatch = false,
  fetchImpl = fetch,
  expectedReleaseId,
} = {}) {
  if (!/^[0-9a-f]{64}$/.test(expectedReleaseId ?? "")) {
    throw new Error("expectedReleaseId must be one lowercase SHA-256 digest");
  }
  let lastErrors = [];
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const results = await Promise.allSettled(
      targets.map((target) => readVersion(target, attempt, fetchImpl, expectedReleaseId)),
    );
    lastErrors = [];
    let mismatched = false;
    for (let index = 0; index < results.length; index += 1) {
      const result = results[index];
      if (result.status === "fulfilled") {
        console.log(`verified ${targets[index].url}: ${result.value.gitSha}`);
      } else {
        if (result.reason instanceof VersionMismatchError) mismatched = true;
        lastErrors.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
      }
    }
    if (lastErrors.length === 0) {
      const pairFailures = validateMatchingReleaseAttestations(results.map((result, index) => ({
        label: targets[index].url,
        body: result.value.body,
      })));
      if (pairFailures.length > 0) {
        mismatched = true;
        lastErrors.push(...pairFailures);
      }
    }
    if (lastErrors.length === 0) return;
    // A caller asking "was this replaced?" wants a mismatch to stop immediately,
    // but must still ride out transport noise. Retrying is decided per FAILURE
    // KIND, never by the caller disabling retries wholesale.
    if (failFastOnMismatch && mismatched) {
      throw new Error(`deployed version verification failed: ${lastErrors.join("; ")}`);
    }
    if (attempt < attempts) {
      console.warn(`version verification attempt ${attempt}/${attempts} failed: ${lastErrors.join("; ")}`);
      await sleep(delayMs);
    }
  }
  throw new Error(`deployed version verification failed: ${lastErrors.join("; ")}`);
}

function positiveIntFromEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer, got ${raw}`);
  }
  return parsed;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // Defaults suit the post-deploy case, where a mismatch means "not propagated
  // yet" and retrying is correct. A caller re-checking that a deploy has not been
  // REPLACED wants the opposite: a mismatch is terminal, so retrying just burns
  // a minute before failing. Such callers set VERIFY_DEPLOYED_ATTEMPTS=1.
  await verifyDeployedVersions(parseTargets(process.argv.slice(2)), {
    attempts: positiveIntFromEnv("VERIFY_DEPLOYED_ATTEMPTS", DEFAULT_ATTEMPTS),
    delayMs: positiveIntFromEnv("VERIFY_DEPLOYED_DELAY_MS", DEFAULT_DELAY_MS),
    failFastOnMismatch: process.env.VERIFY_DEPLOYED_FAIL_FAST_ON_MISMATCH === "1",
    expectedReleaseId: process.env.EXPECTED_RELEASE_ID,
  });
}
