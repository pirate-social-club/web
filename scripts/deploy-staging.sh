#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/scripts/lib/release-source.sh"
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
  OPENAI_API_KEY
  OPENROUTER_API_KEY
  PRIVY_APP_ID
  PRIVY_APP_SECRET
  SONG_PREVIEW_SHARED_SECRET
  STORY_OPERATOR_PRIVATE_KEY
  MUSIC_PURCHASE_STORY_SETTLEMENT_PRIVATE_KEY
  STORY_ROYALTY_SPG_NFT_CONTRACT
)
OPTIONAL_API_STAGING_SECRETS=(
  SWARM_BEE_API_URL
)

ALLOW_NON_MAIN=0
ALLOW_REASON=""

usage() {
  cat <<'EOF'
Usage: scripts/deploy-staging.sh [options]

Deploys web + api staging as one release unit.

Options:
  --allow-non-main -m "reason"
                          Allow dirty/non-main staging deploy with auditable metadata suffix.
  -m, --message "reason"  Required with --allow-non-main.
  -h, --help              Show this help.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --allow-non-main)
      ALLOW_NON_MAIN=1
      shift
      ;;
    -m|--message)
      ALLOW_REASON="${2:-}"
      if [[ -z "$ALLOW_REASON" ]]; then
        printf 'Missing non-main deploy reason\n' >&2
        exit 2
      fi
      shift 2
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

if [[ "$ALLOW_NON_MAIN" == "1" && -z "$ALLOW_REASON" ]]; then
  printf '--allow-non-main requires -m "reason"\n' >&2
  exit 2
fi

WEB_SHA="$(repo_sha "$WEB_DIR")"
WEB_REF="$(repo_ref "$WEB_DIR")"
API_SHA="$(repo_sha "$API_DIR")"
API_REF="$(repo_ref "$API_DIR")"
BUILD_TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
API_SHARD_SOURCE_VERSION="$(
  printf '%s.%s' \
    "$(git -C "$API_DIR" rev-parse HEAD:services/community-d1-shard)" \
    "$(git -C "$API_DIR" rev-parse HEAD:services/shared)"
)"
SCHEMA_POLICY_DIGEST="${COMMUNITY_SCHEMA_POLICY_DIGEST:-}"
if [[ -n "$SCHEMA_POLICY_DIGEST" && ! "$SCHEMA_POLICY_DIGEST" =~ ^[0-9a-f]{64}$ ]]; then
  echo "COMMUNITY_SCHEMA_POLICY_DIGEST must be empty or one lowercase SHA-256 digest" >&2
  exit 1
fi

WEB_ORIGIN="${WEB_ORIGIN:-https://staging.pirate.sc}"
API_ORIGIN="${API_ORIGIN:-https://api-staging.pirate.sc}"
export VITE_PRIVY_CLIENT_ID=""

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
const attempts = 12;
let lastError = "";
for (let attempt = 1; attempt <= attempts; attempt += 1) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "cache-control": "no-cache",
    },
  });
  if (!response.ok) {
    lastError = `${url} returned HTTP ${response.status}`;
  } else {
    const body = await response.json();
    const actual = field.split(".").reduce((current, part) => current?.[part], body);
    if (actual === expected) {
      console.log(`${url} ${field}=${actual}`);
      process.exit(0);
    }
    lastError = `${url} expected ${field}=${expected}, got ${actual}`;
  }
  if (attempt < attempts) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}
throw new Error(lastError);
NODE
}

check_json_field_with_retry() {
  local url="$1"
  local field="$2"
  local expected="$3"
  local retry_for_seconds="${4:-30}"
  local deadline=$((SECONDS + retry_for_seconds))
  local last_status=1

  while true; do
    if check_json_field "$url" "$field" "$expected"; then
      return 0
    fi
    last_status=$?
    if (( SECONDS >= deadline )); then
      return "$last_status"
    fi
    sleep 2
  done
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

if [[ "$ALLOW_NON_MAIN" != "1" ]]; then
  require_clean_release_source "$WEB_DIR" "web"
  require_clean_release_source "$API_DIR" "api" "${API_RELEASE_SHA:-}"
  if [[ -n "${API_RELEASE_SHA:-}" ]]; then
    API_REF="pinned/$API_RELEASE_SHA"
  fi
else
  SAFE_SUFFIX="$(printf '%s' "$ALLOW_REASON" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-' | sed 's/^-//;s/-$//' | cut -c1-40)"
  WEB_SHA="${WEB_SHA}-non-main-${SAFE_SUFFIX:-manual}"
  API_SHA="${API_SHA}-non-main-${SAFE_SUFFIX:-manual}"
  log "non-main staging deploy"
  printf 'reason: %s\n' "$ALLOW_REASON"
  printf 'web status:\n%s\n' "$(repo_status "$WEB_DIR")"
  printf 'api status:\n%s\n' "$(repo_status "$API_DIR")"
fi

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
  --var "DEPLOY_ENV:staging" \
  --var "BUILD_GIT_SHA:$WEB_SHA" \
  --var "BUILD_GIT_REF:$WEB_REF" \
  --var "BUILD_TIMESTAMP:$BUILD_TIMESTAMP")

log "deploy web public staging worker"
(cd "$WEB_DIR" && "$WEB_WRANGLER" deploy \
  --config wrangler.public.jsonc \
  --env staging \
  --var "DEPLOY_ENV:staging" \
  --var "BUILD_GIT_SHA:$WEB_SHA" \
  --var "BUILD_GIT_REF:$WEB_REF" \
  --var "BUILD_TIMESTAMP:$BUILD_TIMESTAMP")

log "deploy api staging worker"
(cd "$API_DIR" && "$API_WRANGLER" deploy \
  --env staging \
  --var "BUILD_GIT_SHA:$API_SHA" \
  --var "BUILD_GIT_REF:$API_REF" \
  --var "BUILD_TIMESTAMP:$BUILD_TIMESTAMP" \
  --var "COMMUNITY_SCHEMA_POLICY_DIGEST:$SCHEMA_POLICY_DIGEST" \
  --define "__PIRATE_BUILD_GIT_SHA__:\"$API_SHA\"" \
  --define "__PIRATE_BUILD_GIT_REF__:\"$API_REF\"" \
  --define "__PIRATE_BUILD_TIMESTAMP__:\"$BUILD_TIMESTAMP\"" \
  --define "__PIRATE_COMMUNITY_D1_SHARD_SOURCE_VERSION__:\"$API_SHARD_SOURCE_VERSION\"")

log "smoke checks"
check_status "$WEB_ORIGIN/" "200"
check_status "$API_ORIGIN/health" "200"
check_json_field_with_retry "$WEB_ORIGIN/__version" "git_sha" "$WEB_SHA"
check_json_field_with_retry "$API_ORIGIN/__version" "git_sha" "$API_SHA"

log "staging deploy complete"
