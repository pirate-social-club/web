import { pathToFileURL } from "node:url";

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
    targets.push({ expectedSha, url });
  }
  return targets;
}

async function readVersion(target, attempt, fetchImpl) {
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
    throw new Error(`${target.url} returned HTTP ${response.status}`);
  }
  const body = await response.json();
  const actualSha = String(body?.git_sha ?? "");
  if (!actualSha.startsWith(target.expectedSha.slice(0, 7))) {
    throw new Error(`${target.url} expected ${target.expectedSha}, got ${actualSha || "missing git_sha"}`);
  }
  return actualSha;
}

export async function verifyDeployedVersions(targets, {
  attempts = DEFAULT_ATTEMPTS,
  delayMs = DEFAULT_DELAY_MS,
  fetchImpl = fetch,
} = {}) {
  let lastErrors = [];
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const results = await Promise.allSettled(
      targets.map((target) => readVersion(target, attempt, fetchImpl)),
    );
    lastErrors = [];
    for (let index = 0; index < results.length; index += 1) {
      const result = results[index];
      if (result.status === "fulfilled") {
        console.log(`verified ${targets[index].url}: ${result.value}`);
      } else {
        lastErrors.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
      }
    }
    if (lastErrors.length === 0) return;
    if (attempt < attempts) {
      console.warn(`version verification attempt ${attempt}/${attempts} failed: ${lastErrors.join("; ")}`);
      await sleep(delayMs);
    }
  }
  throw new Error(`deployed version verification failed: ${lastErrors.join("; ")}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await verifyDeployedVersions(parseTargets(process.argv.slice(2)));
}
