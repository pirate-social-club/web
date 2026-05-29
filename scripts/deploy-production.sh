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
if [[ -z "${OPERATOR_DIR:-}" ]]; then
  if [[ -d "$ROOT_DIR/api/services/community-provision-operator" ]]; then
    OPERATOR_DIR="$ROOT_DIR/api/services/community-provision-operator"
  else
    OPERATOR_DIR="$ROOT_DIR/../api/services/community-provision-operator"
  fi
fi
WEB_WRANGLER="$WEB_DIR/node_modules/.bin/wrangler"
API_WRANGLER="$API_DIR/node_modules/.bin/wrangler"
OPERATOR_WRANGLER="$OPERATOR_DIR/node_modules/.bin/wrangler"
API_PRODUCTION_WORKER_NAME="${API_PRODUCTION_WORKER_NAME:-api-core}"
REQUIRED_API_PRODUCTION_SECRETS=(
  OPENAI_API_KEY
  OPENROUTER_API_KEY
  STORY_OPERATOR_PRIVATE_KEY
  STORY_ROYALTY_SPG_NFT_CONTRACT
)

HOTFIX=0
HOTFIX_REASON=""
SKIP_TESTS=0
SKIP_BUILD=0
CONFIRM_PRODUCTION=0

usage() {
  cat <<'EOF'
Usage: scripts/deploy-production.sh --confirm-production [options]

Deploys web + api production as one release unit, then verifies live metadata.

Options:
  --hotfix -m "reason"      Allow dirty/non-main deploy with auditable metadata suffix.
  -m, --message "reason"    Required with --hotfix.
  --skip-tests              Skip focused predeploy tests.
  --skip-build              Skip web production build.
  --confirm-production      Required for any production deploy.
  -h, --help                Show this help.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --hotfix)
      HOTFIX=1
      shift
      ;;
    -m|--message)
      HOTFIX_REASON="${2:-}"
      if [[ -z "$HOTFIX_REASON" ]]; then
        printf 'Missing hotfix reason\n' >&2
        exit 2
      fi
      shift 2
      ;;
    --skip-tests)
      SKIP_TESTS=1
      shift
      ;;
    --skip-build)
      SKIP_BUILD=1
      shift
      ;;
    --confirm-production)
      CONFIRM_PRODUCTION=1
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

if [[ "$CONFIRM_PRODUCTION" != "1" ]]; then
  printf 'Refusing production deploy without --confirm-production\n' >&2
  exit 2
fi

if [[ "$HOTFIX" == "1" && -z "$HOTFIX_REASON" ]]; then
  printf '--hotfix requires -m "reason"\n' >&2
  exit 2
fi

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

repo_status() {
  git -C "$1" status --short
}

repo_ref() {
  git -C "$1" rev-parse --abbrev-ref HEAD
}

repo_sha() {
  git -C "$1" rev-parse --short HEAD
}

require_clean_main() {
  local dir="$1"
  local name="$2"
  local branch
  branch="$(repo_ref "$dir")"
  if [[ "$branch" != "main" ]]; then
    printf '%s must be on main, got %s\n' "$name" "$branch" >&2
    exit 1
  fi
  if [[ -n "$(repo_status "$dir")" ]]; then
    printf '%s worktree is dirty:\n%s\n' "$name" "$(repo_status "$dir")" >&2
    exit 1
  fi
}

check_api_production_secrets() {
  local secrets_json
  secrets_json="$(cd "$API_DIR" && "$API_WRANGLER" secret list --name "$API_PRODUCTION_WORKER_NAME" --env production --format json)"

  node - "$secrets_json" "${REQUIRED_API_PRODUCTION_SECRETS[*]}" <<'NODE'
const [rawSecrets = "[]", requiredRaw = ""] = process.argv.slice(2);
const required = requiredRaw.split(/\s+/).filter(Boolean);
let listedSecrets;
try {
  listedSecrets = JSON.parse(rawSecrets);
} catch (error) {
  throw new Error(`Unable to parse API production secret list: ${error.message}`);
}
const available = new Set(listedSecrets.map((entry) => entry?.name).filter(Boolean));
const missing = required.filter((name) => !available.has(name));
if (missing.length > 0) {
  console.error(`Missing API production secrets: ${missing.join(", ")}`);
  console.error("Sync /services/api secrets to the production API worker before deploying.");
  process.exit(1);
}
console.log(`API production secrets present: ${required.join(", ")}`);
NODE
}

require_command bun
require_command curl
require_command git
require_command node
require_file "$WEB_WRANGLER"
require_file "$API_WRANGLER"
require_file "$OPERATOR_WRANGLER"

WEB_SHA="$(repo_sha "$WEB_DIR")"
WEB_REF="$(repo_ref "$WEB_DIR")"
API_SHA="$(repo_sha "$API_DIR")"
API_REF="$(repo_ref "$API_DIR")"
OPERATOR_SHA="$(repo_sha "$OPERATOR_DIR")"
OPERATOR_REF="$(repo_ref "$OPERATOR_DIR")"
BUILD_TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

if [[ "$HOTFIX" != "1" ]]; then
  require_clean_main "$WEB_DIR" "web"
  require_clean_main "$API_DIR" "api"
  require_clean_main "$OPERATOR_DIR" "community-provision-operator"
else
  SAFE_SUFFIX="$(printf '%s' "$HOTFIX_REASON" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-' | sed 's/^-//;s/-$//' | cut -c1-40)"
  WEB_SHA="${WEB_SHA}-hotfix-${SAFE_SUFFIX:-manual}"
  API_SHA="${API_SHA}-hotfix-${SAFE_SUFFIX:-manual}"
  OPERATOR_SHA="${OPERATOR_SHA}-hotfix-${SAFE_SUFFIX:-manual}"
  log "hotfix deploy"
  printf 'reason: %s\n' "$HOTFIX_REASON"
  printf 'web status:\n%s\n' "$(repo_status "$WEB_DIR")"
  printf 'api status:\n%s\n' "$(repo_status "$API_DIR")"
  printf 'community-provision-operator status:\n%s\n' "$(repo_status "$OPERATOR_DIR")"
fi

log "release metadata"
printf 'web: %s (%s)\n' "$WEB_SHA" "$WEB_REF"
printf 'api: %s (%s)\n' "$API_SHA" "$API_REF"
printf 'community-provision-operator: %s (%s)\n' "$OPERATOR_SHA" "$OPERATOR_REF"
printf 'timestamp: %s\n' "$BUILD_TIMESTAMP"

if [[ "$SKIP_TESTS" != "1" ]]; then
  log "focused web tests"
  (cd "$WEB_DIR" && bun test src/lib/api/base-url.test.ts)

  log "focused api provisioning tests"
  (cd "$API_DIR" && bun test tests/routes/communities/community-provisioning-routes.test.ts tests/community-provision-operator-client.test.ts)

  log "community provision operator tests"
  (cd "$OPERATOR_DIR" && bun test)
fi

log "check api production secrets"
check_api_production_secrets

if [[ "$SKIP_BUILD" != "1" ]]; then
  log "build web production bundle"
  (cd "$WEB_DIR" && bun run build:prod)
fi

log "deploy community provision operator production"
(cd "$OPERATOR_DIR" && "$OPERATOR_WRANGLER" deploy \
  --env production \
  --var "BUILD_GIT_SHA:$OPERATOR_SHA" \
  --var "BUILD_GIT_REF:$OPERATOR_REF" \
  --var "BUILD_TIMESTAMP:$BUILD_TIMESTAMP")

log "deploy api production"
(cd "$API_DIR" && "$API_WRANGLER" deploy \
  --env production \
  --var "BUILD_GIT_SHA:$API_SHA" \
  --var "BUILD_GIT_REF:$API_REF" \
  --var "BUILD_TIMESTAMP:$BUILD_TIMESTAMP" \
  --define "__PIRATE_BUILD_GIT_SHA__:\"$API_SHA\"" \
  --define "__PIRATE_BUILD_GIT_REF__:\"$API_REF\"" \
  --define "__PIRATE_BUILD_TIMESTAMP__:\"$BUILD_TIMESTAMP\"")

log "deploy web production"
(cd "$WEB_DIR" && "$WEB_WRANGLER" deploy dist/worker/index.js \
  --config wrangler.jsonc \
  --assets dist/client \
  --no-bundle \
  --var "DEPLOY_ENV:production" \
  --var "BUILD_GIT_SHA:$WEB_SHA" \
  --var "BUILD_GIT_REF:$WEB_REF" \
  --var "BUILD_TIMESTAMP:$BUILD_TIMESTAMP")

log "deploy web public production worker"
(cd "$WEB_DIR" && "$WEB_WRANGLER" deploy \
  --config wrangler.public.jsonc \
  --var "DEPLOY_ENV:production" \
  --var "BUILD_GIT_SHA:$WEB_SHA" \
  --var "BUILD_GIT_REF:$WEB_REF" \
  --var "BUILD_TIMESTAMP:$BUILD_TIMESTAMP")

log "verify production"
"$ROOT_DIR/scripts/smoke-test.sh" prod
"$ROOT_DIR/scripts/check-deployments.sh" \
  --scope prod \
  --expected-web-sha "$WEB_SHA" \
  --expected-api-sha "$API_SHA" \
  --expected-operator-sha "$OPERATOR_SHA"

log "production deploy complete"
