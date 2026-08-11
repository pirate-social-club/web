#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

EXPECTED_SHA=""
EXPECTED_WEB_SHA=""
EXPECTED_API_SHA=""
EXPECTED_OPERATOR_SHA=""
STRICT=1
SCOPE="all"
RETRY_FOR_SECONDS=0

usage() {
  cat <<'EOF'
Usage: scripts/check-deployments.sh [--scope all|prod|staging] [--expected-sha SHA] [--expected-web-sha SHA] [--expected-api-sha SHA] [--expected-operator-sha SHA] [--retry-for SECONDS] [--no-strict]

Checks deployed web/API version metadata across production and staging.

Options:
  --scope SCOPE           Targets to check: all, prod, or staging. Default: all.
  --expected-sha SHA      Require every target git_sha to match SHA. Useful for monorepos.
  --expected-web-sha SHA  Require web targets to match SHA.
  --expected-api-sha SHA  Require API targets to match SHA.
  --expected-operator-sha SHA
                          Require API targets' operator.git_sha to match SHA.
  --retry-for SECONDS     Retry strict metadata checks for transient edge propagation.
  --no-strict             Print the table but do not fail on mismatches/null fields.
  -h, --help              Show this help.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --expected-sha)
      EXPECTED_SHA="${2:-}"
      if [[ -z "$EXPECTED_SHA" ]]; then
        printf 'Missing value for --expected-sha\n' >&2
        exit 2
      fi
      shift 2
      ;;
    --scope)
      SCOPE="${2:-}"
      if [[ "$SCOPE" != "all" && "$SCOPE" != "prod" && "$SCOPE" != "production" && "$SCOPE" != "staging" ]]; then
        printf 'Invalid --scope value: %s\n' "$SCOPE" >&2
        exit 2
      fi
      shift 2
      ;;
    --expected-web-sha)
      EXPECTED_WEB_SHA="${2:-}"
      if [[ -z "$EXPECTED_WEB_SHA" ]]; then
        printf 'Missing value for --expected-web-sha\n' >&2
        exit 2
      fi
      shift 2
      ;;
    --expected-api-sha)
      EXPECTED_API_SHA="${2:-}"
      if [[ -z "$EXPECTED_API_SHA" ]]; then
        printf 'Missing value for --expected-api-sha\n' >&2
        exit 2
      fi
      shift 2
      ;;
    --expected-operator-sha)
      EXPECTED_OPERATOR_SHA="${2:-}"
      if [[ -z "$EXPECTED_OPERATOR_SHA" ]]; then
        printf 'Missing value for --expected-operator-sha\n' >&2
        exit 2
      fi
      shift 2
      ;;
    --retry-for)
      RETRY_FOR_SECONDS="${2:-}"
      if ! [[ "$RETRY_FOR_SECONDS" =~ ^[0-9]+$ ]]; then
        printf 'Invalid value for --retry-for: %s\n' "$RETRY_FOR_SECONDS" >&2
        exit 2
      fi
      shift 2
      ;;
    --no-strict)
      STRICT=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      printf 'Unknown argument: %s\n' "$1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

node --input-type=module - "$ROOT_DIR" "$EXPECTED_SHA" "$EXPECTED_WEB_SHA" "$EXPECTED_API_SHA" "$EXPECTED_OPERATOR_SHA" "$STRICT" "$SCOPE" "$RETRY_FOR_SECONDS" <<'NODE'
import { pathToFileURL } from "node:url";

const [
  rootDir,
  expectedSha,
  expectedWebSha,
  expectedApiSha,
  expectedOperatorSha,
  strictRaw,
  scopeRaw,
  retryForSecondsRaw,
] = process.argv.slice(2);
const {
  field,
  nestedField,
  validateVersionPayload,
} = await import(pathToFileURL(`${rootDir}/scripts/lib/deployment-attestation.mjs`).href);
const strict = strictRaw !== "0";
const scope = scopeRaw === "production" ? "prod" : scopeRaw;
const retryForMs = Number(retryForSecondsRaw || 0) * 1000;

const allTargets = [
  { id: "web-prod", service: "web", deployEnv: "production", url: "https://pirate.sc/__version" },
  { id: "api-prod", service: "api", deployEnv: "production", url: "https://api.pirate.sc/__version" },
  { id: "web-staging", service: "web", deployEnv: "staging", url: "https://staging.pirate.sc/__version" },
  { id: "api-staging", service: "api", deployEnv: "staging", url: "https://api-staging.pirate.sc/__version" },
];
const targets = allTargets.filter((target) => {
  if (scope === "prod") return target.id.endsWith("-prod");
  if (scope === "staging") return target.id.endsWith("-staging");
  return true;
});
const FETCH_TIMEOUT_MS = 15000;

function text(value) {
  return value == null || value === "" ? "-" : String(value);
}

async function fetchVersion(target) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(target.url, {
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });
    const raw = await response.text();
    let body = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch {
      return { target, ok: false, status: response.status, body: null, error: "non_json_response" };
    }
    return { target, ok: response.ok, status: response.status, body, error: response.ok ? null : "http_error" };
  } catch (error) {
    return {
      target,
      ok: false,
      status: 0,
      body: null,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function buildRows(results) {
  return results.map((result) => ({
  target: result.target.id,
  expected_env: result.target.deployEnv,
  status: result.status,
  service: text(field(result.body, "service")),
  environment: text(field(result.body, "environment")),
  git_sha: text(field(result.body, "git_sha")),
  git_ref: text(field(result.body, "git_ref")),
  build_timestamp: text(field(result.body, "build_timestamp")),
  operator_git_sha: text(nestedField(result.body, "operator.git_sha")),
  url: result.target.url,
  error: result.error ?? "",
  }));
}

function collectFailures(results) {
  const failures = [];
  for (const result of results) {
    const body = result.body;
    const id = result.target.id;
    if (!result.ok) failures.push(`${id}: ${result.error ?? "request failed"} (${result.status})`);
    const serviceExpectedSha = result.target.service === "web" ? expectedWebSha : expectedApiSha;
    const validation = validateVersionPayload(body, {
      service: result.target.service,
      environment: result.target.deployEnv,
      gitSha: expectedSha || serviceExpectedSha || undefined,
      operatorGitSha: result.target.service === "api" ? expectedOperatorSha || undefined : undefined,
    });
    for (const failure of validation.failures) failures.push(`${id}: ${failure}`);
  }
  return failures;
}

let results = await Promise.all(targets.map(fetchVersion));
let failures = collectFailures(results);
const retryDeadline = Date.now() + retryForMs;
while (strict && failures.length > 0 && Date.now() < retryDeadline) {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  results = await Promise.all(targets.map(fetchVersion));
  failures = collectFailures(results);
  if (failures.length === 0) {
    break;
  }
}

console.table(buildRows(results));

if (failures.length > 0) {
  console.error("\nDeployment check failures:");
  for (const failure of failures) console.error(`- ${failure}`);
  if (strict) process.exit(1);
}
NODE
