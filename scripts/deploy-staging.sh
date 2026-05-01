#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ -d "$ROOT_DIR/web" && -f "$ROOT_DIR/web/package.json" ]]; then
  WEB_DIR="$ROOT_DIR/web"
else
  WEB_DIR="$ROOT_DIR"
fi
if [[ -z "${API_DIR:-}" ]]; then
  if [[ -d "$ROOT_DIR/api/services/api" ]]; then
    API_DIR="$ROOT_DIR/api/services/api"
  else
    API_DIR="$ROOT_DIR/../api/services/api"
  fi
fi
WEB_WRANGLER="$WEB_DIR/node_modules/.bin/wrangler"
API_WRANGLER="$API_DIR/node_modules/.bin/wrangler"
REQUIRED_API_STAGING_SECRETS=(
  OPENROUTER_API_KEY
)
OPTIONAL_API_STAGING_SECRETS=(
  SWARM_BEE_API_URL
)

WEB_SHA="$(git -C "$WEB_DIR" rev-parse --short HEAD)"
WEB_REF="$(git -C "$WEB_DIR" rev-parse --abbrev-ref HEAD)"
API_SHA="$(git -C "$API_DIR" rev-parse --short HEAD)"
API_REF="$(git -C "$API_DIR" rev-parse --abbrev-ref HEAD)"
BUILD_TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

WEB_ORIGIN="${WEB_ORIGIN:-https://staging.pirate.sc}"
API_ORIGIN="${API_ORIGIN:-https://api-staging.pirate.sc}"

log() {
  printf '\n==> %s\n' "$*"
}

require_command() {
  local command="$1"
  if ! command -v "$command" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$command" >&2
    exit 1
  fi
}

require_file() {
  local file="$1"
  if [[ ! -x "$file" ]]; then
    printf 'Missing required executable: %s\n' "$file" >&2
    exit 1
  fi
}

check_json_field() {
  local url="$1"
  local field="$2"
  local expected="$3"

  node - "$url" "$field" "$expected" <<'NODE'
const [url, field, expected] = process.argv.slice(2);
const response = await fetch(url, { headers: { accept: "application/json" } });
if (!response.ok) {
  throw new Error(`${url} returned HTTP ${response.status}`);
}
const body = await response.json();
const actual = body[field];
if (actual !== expected) {
  throw new Error(`${url} expected ${field}=${expected}, got ${actual}`);
}
console.log(`${url} ${field}=${actual}`);
NODE
}

check_status() {
  local url="$1"
  local expected="$2"
  local status
  status="$(curl -fsS -o /dev/null -w "%{http_code}" "$url")"
  if [[ "$status" != "$expected" ]]; then
    printf 'Expected %s from %s, got %s\n' "$expected" "$url" "$status" >&2
    exit 1
  fi
  printf '%s HTTP %s\n' "$url" "$status"
}

check_api_staging_secrets() {
  local secrets_json
  secrets_json="$(cd "$API_DIR" && "$API_WRANGLER" secret list --env staging --format json)"

  node - "$secrets_json" "${REQUIRED_API_STAGING_SECRETS[*]}" "${OPTIONAL_API_STAGING_SECRETS[*]}" <<'NODE'
const [rawSecrets, requiredRaw = "", optionalRaw = ""] = process.argv.slice(2);
const requiredSecrets = requiredRaw.split(/\s+/).filter(Boolean);
const optionalSecrets = optionalRaw.split(/\s+/).filter(Boolean);
let listedSecrets;
try {
  listedSecrets = JSON.parse(rawSecrets);
} catch (error) {
  throw new Error(`Unable to parse wrangler secret list output: ${error.message}`);
}
const available = new Set(listedSecrets.map((entry) => entry?.name).filter(Boolean));
const missing = requiredSecrets.filter((name) => !available.has(name));
if (missing.length > 0) {
  console.error(`Missing API staging secrets: ${missing.join(", ")}`);
  console.error("Set them with: cd api/services/api && wrangler secret put <NAME> --env staging");
  process.exit(1);
}
console.log(`API staging secrets present: ${requiredSecrets.join(", ")}`);
const missingOptional = optionalSecrets.filter((name) => !available.has(name));
if (missingOptional.length > 0) {
  console.warn(`Optional API staging secrets missing: ${missingOptional.join(", ")}`);
}
NODE
}

require_command bun
require_command curl
require_command git
require_command node
require_file "$WEB_WRANGLER"
require_file "$API_WRANGLER"

log "check API staging secrets"
check_api_staging_secrets

log "staging build metadata"
printf 'web: %s (%s)\n' "$WEB_SHA" "$WEB_REF"
printf 'api: %s (%s)\n' "$API_SHA" "$API_REF"
printf 'timestamp: %s\n' "$BUILD_TIMESTAMP"

log "build web staging bundle"
(cd "$WEB_DIR" && bun run build:staging)

log "deploy web staging worker"
(cd "$WEB_DIR" && "$WEB_WRANGLER" deploy dist/worker/index.js \
  --config wrangler.jsonc \
  --env staging \
  --assets dist/client \
  --no-bundle \
  --var "BUILD_GIT_SHA:$WEB_SHA" \
  --var "BUILD_GIT_REF:$WEB_REF" \
  --var "BUILD_TIMESTAMP:$BUILD_TIMESTAMP")

log "deploy web public staging worker"
(cd "$WEB_DIR" && "$WEB_WRANGLER" deploy \
  --config wrangler.public.jsonc \
  --env staging \
  --var "BUILD_GIT_SHA:$WEB_SHA" \
  --var "BUILD_GIT_REF:$WEB_REF" \
  --var "BUILD_TIMESTAMP:$BUILD_TIMESTAMP")

log "deploy api staging worker"
(cd "$API_DIR" && "$API_WRANGLER" deploy \
  --env staging \
  --var "BUILD_GIT_SHA:$API_SHA" \
  --var "BUILD_GIT_REF:$API_REF" \
  --var "BUILD_TIMESTAMP:$BUILD_TIMESTAMP")

log "smoke checks"
check_status "$WEB_ORIGIN/" "200"
check_status "$API_ORIGIN/health" "200"
check_json_field "$WEB_ORIGIN/__version" "git_sha" "$WEB_SHA"
check_json_field "$API_ORIGIN/__version" "git_sha" "$API_SHA"

log "staging deploy complete"
