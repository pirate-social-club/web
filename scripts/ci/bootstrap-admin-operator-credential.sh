#!/usr/bin/env bash
set -euo pipefail

api_dir="${1:?API checkout path is required}"
for name in CONTROL_PLANE_MIGRATOR_DATABASE_URL CREDENTIAL_ENV_NAME RELEASE_GITHUB_TOKEN; do
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required environment variable: $name" >&2
    exit 1
  fi
done

credential_file="$(mktemp)"
trap 'rm -f "$credential_file"' EXIT
chmod 600 "$credential_file"
expires_at="$(date -u -d '+90 days' '+%Y-%m-%dT%H:%M:%SZ')"

if [[ -n "${REVOKE_CREDENTIAL_ID:-}" ]]; then
  bun "$api_dir/services/api/scripts/operator-credentials.ts" revoke \
    --credential-id "$REVOKE_CREDENTIAL_ID"
fi

bun "$api_dir/services/api/scripts/operator-credentials.ts" issue \
  --operator-actor-id svc_admin_automation \
  --label "Admin automation" \
  --scope admin:users:act_as \
  --scope admin:users:manage \
  --scope admin:operations:manage \
  --scope admin:debug:access \
  --expires-at "$expires_at" \
  --credential-env-name "$CREDENTIAL_ENV_NAME" \
  --credential-env-file "$credential_file"

credential="${CREDENTIAL_ENV_NAME}="
credential="$(sed -n "s/^${CREDENTIAL_ENV_NAME}=//p" "$credential_file")"
if [[ -z "$credential" ]]; then
  echo "Credential issuer did not produce $CREDENTIAL_ENV_NAME" >&2
  exit 1
fi
echo "::add-mask::$credential"

for repository in pirate-social-club/web pirate-social-club/api; do
  printf '%s' "$credential" | GH_TOKEN="$RELEASE_GITHUB_TOKEN" gh secret set "$CREDENTIAL_ENV_NAME" --repo "$repository"
done

echo "credential_env_name=$CREDENTIAL_ENV_NAME" >> "$GITHUB_STEP_SUMMARY"
echo "credential_expires_at=$expires_at" >> "$GITHUB_STEP_SUMMARY"
echo "credential stored as encrypted Actions secrets without exposing its value"
