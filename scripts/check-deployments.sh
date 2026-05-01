#!/usr/bin/env bash
set -euo pipefail

EXPECTED_SHA=""
EXPECTED_WEB_SHA=""
EXPECTED_API_SHA=""
STRICT=1
SCOPE="all"

usage() {
  cat <<'EOF'
Usage: scripts/check-deployments.sh [--scope all|prod|staging] [--expected-sha SHA] [--expected-web-sha SHA] [--expected-api-sha SHA] [--no-strict]

Checks deployed web/API version metadata across production and staging.

Options:
  --scope SCOPE           Targets to check: all, prod, or staging. Default: all.
  --expected-sha SHA      Require every target git_sha to match SHA. Useful for monorepos.
  --expected-web-sha SHA  Require web targets to match SHA.
  --expected-api-sha SHA  Require API targets to match SHA.
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

node - "$EXPECTED_SHA" "$EXPECTED_WEB_SHA" "$EXPECTED_API_SHA" "$STRICT" "$SCOPE" <<'NODE'
const [expectedSha, expectedWebSha, expectedApiSha, strictRaw, scopeRaw] = process.argv.slice(2);
const strict = strictRaw !== "0";
const scope = scopeRaw === "production" ? "prod" : scopeRaw;

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

function text(value) {
  return value == null || value === "" ? "-" : String(value);
}

async function fetchVersion(target) {
  try {
    const response = await fetch(target.url, {
      headers: { accept: "application/json" },
      cache: "no-store",
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
  }
}

function field(body, name) {
  return body && typeof body === "object" && name in body ? body[name] : null;
}

const results = await Promise.all(targets.map(fetchVersion));
const rows = results.map((result) => ({
  target: result.target.id,
  expected_env: result.target.deployEnv,
  status: result.status,
  service: text(field(result.body, "service")),
  environment: text(field(result.body, "environment")),
  git_sha: text(field(result.body, "git_sha")),
  git_ref: text(field(result.body, "git_ref")),
  build_timestamp: text(field(result.body, "build_timestamp")),
  url: result.target.url,
  error: result.error ?? "",
}));

console.table(rows);

const failures = [];
for (const result of results) {
  const body = result.body;
  const id = result.target.id;
  const service = field(body, "service");
  const environment = field(body, "environment");
  const gitSha = field(body, "git_sha");
  const gitRef = field(body, "git_ref");
  const buildTimestamp = field(body, "build_timestamp");

  if (!result.ok) failures.push(`${id}: ${result.error ?? "request failed"} (${result.status})`);
  if (service !== result.target.service) failures.push(`${id}: expected service=${result.target.service}, got ${text(service)}`);
  if (environment !== result.target.deployEnv) failures.push(`${id}: expected environment=${result.target.deployEnv}, got ${text(environment)}`);
  if (!gitSha) failures.push(`${id}: git_sha is missing`);
  if (!gitRef) failures.push(`${id}: git_ref is missing`);
  if (!buildTimestamp) failures.push(`${id}: build_timestamp is missing`);
  if (expectedSha && gitSha !== expectedSha) failures.push(`${id}: expected git_sha=${expectedSha}, got ${text(gitSha)}`);
  if (expectedWebSha && result.target.service === "web" && gitSha !== expectedWebSha) {
    failures.push(`${id}: expected web git_sha=${expectedWebSha}, got ${text(gitSha)}`);
  }
  if (expectedApiSha && result.target.service === "api" && gitSha !== expectedApiSha) {
    failures.push(`${id}: expected api git_sha=${expectedApiSha}, got ${text(gitSha)}`);
  }
}

if (failures.length > 0) {
  console.error("\nDeployment check failures:");
  for (const failure of failures) console.error(`- ${failure}`);
  if (strict) process.exit(1);
}
NODE
