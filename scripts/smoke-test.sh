#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

TARGET="${1:-staging}"
CREATE_COMMUNITY=0
CONFIRM_PRODUCTION=0

shift || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --create-community)
      CREATE_COMMUNITY=1
      shift
      ;;
    --confirm-production)
      CONFIRM_PRODUCTION=1
      shift
      ;;
    -h|--help)
      cat <<'EOF'
Usage: scripts/smoke-test.sh <staging|prod> [--create-community] [--confirm-production]

Default smoke tests are unauthenticated and safe:
  - web /__version
  - api /__version
  - api /health
  - api /health/provisioning (including live D1 pool capacity)
  - api CORS from the web origin

Authenticated community creation is opt-in and requires PIRATE_SMOKE_AUTH_TOKEN.
Production creation additionally requires --confirm-production.
EOF
      exit 0
      ;;
    *)
      printf 'Unknown argument: %s\n' "$1" >&2
      exit 2
      ;;
  esac
done

case "$TARGET" in
  prod|production)
    WEB_ORIGIN="https://pirate.sc"
    API_ORIGIN="https://api.pirate.sc"
    TARGET_LABEL="production"
    ;;
  staging)
    WEB_ORIGIN="https://staging.pirate.sc"
    API_ORIGIN="https://api-staging.pirate.sc"
    TARGET_LABEL="staging"
    ;;
  *)
    printf 'Unknown target: %s\n' "$TARGET" >&2
    exit 2
    ;;
esac

if [[ "$CREATE_COMMUNITY" == "1" && "$TARGET_LABEL" == "production" && "$CONFIRM_PRODUCTION" != "1" ]]; then
  printf 'Refusing production community creation without --confirm-production\n' >&2
  exit 2
fi

node --input-type=module - "$ROOT_DIR" "$WEB_ORIGIN" "$API_ORIGIN" "$TARGET_LABEL" "$CREATE_COMMUNITY" <<'NODE'
import { pathToFileURL } from "node:url";

const [rootDir, webOrigin, apiOrigin, targetLabel, createCommunityRaw] = process.argv.slice(2);
const { validateVersionPayload } = await import(
  pathToFileURL(`${rootDir}/scripts/lib/deployment-attestation.mjs`).href
);
const createCommunity = createCommunityRaw === "1";
const FETCH_TIMEOUT_MS = 15000;
const SMOKE_PROPAGATION_BUDGET_MS = Number(process.env.SMOKE_PROPAGATION_BUDGET_MS ?? 90000);

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function expectJsonOnce(url, expectedStatus = 200, options = {}) {
  const response = await fetchWithTimeout(url, {
    ...options,
    headers: { accept: "application/json", ...(options.headers ?? {}) },
  });
  const raw = await response.text();
  let body = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    throw new Error(`${url} returned non-JSON response with HTTP ${response.status}`);
  }
  if (response.status !== expectedStatus) {
    const error = new Error(`${url} expected HTTP ${expectedStatus}, got ${response.status}: ${raw.slice(0, 300)}`);
    error.httpStatus = response.status;
    throw error;
  }
  return { response, body };
}

// This smoke runs immediately after a deploy, so a 5xx or a dropped connection
// is usually the deploy still landing rather than a broken release. Retry those
// within a bounded window; anything else (4xx, non-JSON, a failed assertion on
// the body) is a real answer and fails on the spot.
//
// On 2026-08-03 a single transient 503 from /health/provisioning failed a
// production release attempt whose payload already carried the correct pinned
// SHA. The next attempt passed unchanged.
async function expectJson(url, expectedStatus = 200, options = {}) {
  // Retry only idempotent probes. The community-creation POST must never be
  // replayed on a 5xx: the write may well have landed, and a second attempt
  // would create a second community in production.
  const method = String(options.method ?? "GET").toUpperCase();
  const idempotent = method === "GET" || method === "HEAD";
  const deadline = Date.now() + SMOKE_PROPAGATION_BUDGET_MS;
  let delayMs = 2_000;
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await expectJsonOnce(url, expectedStatus, options);
    } catch (error) {
      const status = error?.httpStatus ?? null;
      const retryable = idempotent && (status === null || status >= 500);
      if (!retryable || Date.now() >= deadline) throw error;
      console.warn(`smoke attempt ${attempt} for ${url} retryable (${status ?? "transport"}), retrying in ${delayMs}ms`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs = Math.min(delayMs * 2, 10_000);
    }
  }
}

function requireVersion(label, body, service) {
  const validation = validateVersionPayload(body, { service, environment: targetLabel });
  if (validation.failures.length > 0) {
    throw new Error(`${label} version invalid: ${validation.failures.join("; ")}`);
  }
}

console.log(`smoke target: ${targetLabel}`);

const webVersion = await expectJson(`${webOrigin}/__version`);
requireVersion("web", webVersion.body, "web");
console.log(`web version: ${webVersion.body.git_sha}`);

const apiVersion = await expectJson(`${apiOrigin}/__version`);
requireVersion("api", apiVersion.body, "api");
console.log(`api version: ${apiVersion.body.git_sha}`);

await expectJson(`${apiOrigin}/health`);
console.log("api health: ok");

const provisioningHealth = await expectJson(`${apiOrigin}/health/provisioning`);
const freeCapacity = provisioningHealth.body?.pool_capacity?.free;
const capacityThreshold = provisioningHealth.body?.pool_capacity?.threshold;
if (!Number.isFinite(freeCapacity) || !Number.isFinite(capacityThreshold)) {
  throw new Error("api provisioning health is missing D1 pool capacity");
}
console.log(`api provisioning health: ok (${freeCapacity} free, threshold ${capacityThreshold})`);

const cors = await fetchWithTimeout(`${apiOrigin}/health`, {
  headers: { origin: webOrigin, accept: "application/json" },
});
const allowedOrigin = cors.headers.get("access-control-allow-origin");
if (allowedOrigin !== webOrigin) {
  throw new Error(`CORS expected access-control-allow-origin=${webOrigin}, got ${allowedOrigin}`);
}
console.log("api CORS: ok");

if (createCommunity) {
  const token = process.env.PIRATE_SMOKE_AUTH_TOKEN?.trim();
  if (!token) throw new Error("PIRATE_SMOKE_AUTH_TOKEN is required for --create-community");

  const suffix = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const body = {
    display_name: `Smoke Test ${targetLabel} ${suffix}`,
    description: "Automated deployment smoke test.",
    membership_mode: "request",
    default_age_gate_policy: "none",
    allow_anonymous_identity: true,
    anonymous_identity_scope: "community_stable",
    handle_policy: { policy_template: "standard" },
    governance_mode: "centralized",
    database_region: "aws-us-east-1",
    community_bootstrap: {
      rules: [
        { title: "Be useful", body: "Keep the smoke test community civil.", report_reason: "Be useful" },
      ],
    },
  };

  const created = await expectJson(`${apiOrigin}/communities`, 202, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      origin: webOrigin,
    },
    body: JSON.stringify(body),
  });
  const state = created.body?.community?.provisioning_state;
  if (state !== "active" && state !== "provisioning" && state !== "requested") {
    throw new Error(`unexpected community provisioning_state=${state}`);
  }
  console.log(`community create: ${created.body.community.id} ${state}`);
}
NODE
