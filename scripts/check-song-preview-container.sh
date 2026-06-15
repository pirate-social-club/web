#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-staging}"

case "$TARGET" in
  staging)
    DEFAULT_ORIGIN="https://pirate-song-preview-container-staging.hippiehecton.workers.dev"
    TARGET_LABEL="staging"
    ;;
  prod|production)
    DEFAULT_ORIGIN="https://song-preview-container.hippiehecton.workers.dev"
    TARGET_LABEL="production"
    ;;
  *)
    printf 'Unknown target: %s\n' "$TARGET" >&2
    exit 2
    ;;
esac

ORIGIN="${SONG_PREVIEW_CONTAINER_ORIGIN:-$DEFAULT_ORIGIN}"

if [[ -z "${SONG_PREVIEW_SHARED_SECRET:-}" ]]; then
  printf 'SONG_PREVIEW_SHARED_SECRET is required\n' >&2
  exit 1
fi

node - "$ORIGIN" "$TARGET_LABEL" <<'NODE'
const [origin, targetLabel] = process.argv.slice(2);
const sharedSecret = process.env.SONG_PREVIEW_SHARED_SECRET?.trim();
const fetchTimeoutMs = Number(process.env.PIRATE_SONG_PREVIEW_HEALTH_FETCH_TIMEOUT_MS || "30000");
const retryForMs = Number(process.env.PIRATE_SONG_PREVIEW_HEALTH_RETRY_FOR_MS || "120000");
const retryIntervalMs = Number(process.env.PIRATE_SONG_PREVIEW_HEALTH_RETRY_INTERVAL_MS || "5000");

if (!sharedSecret) {
  throw new Error("SONG_PREVIEW_SHARED_SECRET is required");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), fetchTimeoutMs);
  const url = new URL(path, origin).toString();
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        accept: "application/json",
        ...(options.headers ?? {}),
      },
      signal: controller.signal,
    });
    const raw = await response.text();
    let body = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch {
      throw new Error(`${url} returned non-JSON HTTP ${response.status}: ${raw.slice(0, 300)}`);
    }
    if (!response.ok) {
      throw new Error(`${url} returned HTTP ${response.status}: ${raw.slice(0, 300)}`);
    }
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

async function retry(label, run) {
  const deadline = Date.now() + retryForMs;
  let lastError = null;
  do {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (Date.now() + retryIntervalMs > deadline) break;
      console.log(`${label}: retrying after ${error instanceof Error ? error.message : String(error)}`);
      await sleep(retryIntervalMs);
    }
  } while (Date.now() < deadline);
  throw lastError ?? new Error(`${label} failed`);
}

console.log(`song preview container target: ${targetLabel}`);

const wrapperHealth = await retry("wrapper health", () => fetchJson("/health"));
if (wrapperHealth?.service !== "song-preview-container" || wrapperHealth?.ok !== true) {
  throw new Error(`wrapper health returned unexpected body: ${JSON.stringify(wrapperHealth)}`);
}
console.log(`wrapper health: ${wrapperHealth.environment ?? "unknown"}`);

const containerHealth = await retry("container health", () => fetchJson("/health/container", {
  headers: {
    authorization: `Bearer ${sharedSecret}`,
  },
}));
if (containerHealth?.ok !== true) {
  throw new Error(`container health returned unexpected body: ${JSON.stringify(containerHealth)}`);
}
console.log("container health: ok");
NODE
