#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_WRANGLER="$ROOT_DIR/node_modules/.bin/wrangler"
DEPLOY_ENV="production"
CONFIRM_PRODUCTION=0

usage() {
  cat <<'EOF'
Usage: scripts/deploy-public.sh [--env staging|production] [--confirm-production]

Deploys the public web worker with build metadata for /__version.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)
      DEPLOY_ENV="${2:-}"
      if [[ "$DEPLOY_ENV" != "staging" && "$DEPLOY_ENV" != "production" ]]; then
        printf 'Invalid --env value: %s\n' "$DEPLOY_ENV" >&2
        exit 2
      fi
      shift 2
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

if [[ "$DEPLOY_ENV" == "production" && "$CONFIRM_PRODUCTION" != "1" ]]; then
  printf 'Refusing production public deploy without --confirm-production\n' >&2
  exit 1
fi

if [[ ! -x "$WEB_WRANGLER" ]]; then
  printf 'Missing required executable: %s\n' "$WEB_WRANGLER" >&2
  exit 1
fi

WEB_SHA="$(git -C "$ROOT_DIR" rev-parse --short HEAD)"
WEB_REF="$(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD)"
BUILD_TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

printf 'deploy public worker: %s %s (%s)\n' "$DEPLOY_ENV" "$WEB_SHA" "$WEB_REF"
printf 'timestamp: %s\n' "$BUILD_TIMESTAMP"

WRANGLER_ARGS=(
  deploy
  --config wrangler.public.jsonc
  --var "DEPLOY_ENV:$DEPLOY_ENV"
  --var "BUILD_GIT_SHA:$WEB_SHA"
  --var "BUILD_GIT_REF:$WEB_REF"
  --var "BUILD_TIMESTAMP:$BUILD_TIMESTAMP"
)

if [[ "$DEPLOY_ENV" == "staging" ]]; then
  WRANGLER_ARGS+=(--env staging)
fi

(cd "$ROOT_DIR" && "$WEB_WRANGLER" "${WRANGLER_ARGS[@]}")
