#!/usr/bin/env bash
set -euo pipefail

api_dir="${1:?API checkout path is required}"
for name in ACTIONS_ID_TOKEN_REQUEST_TOKEN ACTIONS_ID_TOKEN_REQUEST_URL CONTROL_PLANE_MIGRATOR_DATABASE_URL GITHUB_ENV INFISICAL_IDENTITY_ID INFISICAL_PROJECT_ID INFISICAL_ENV INFISICAL_SECRET_PATH CREDENTIAL_ENV_NAME; do
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required environment variable: $name" >&2
    exit 1
  fi
done

credential_file="$(mktemp)"
trap 'rm -f "$credential_file" /tmp/admin-operator-infisical-login.json /tmp/admin-operator-infisical-write.json' EXIT
chmod 600 "$credential_file"
expires_at="$(date -u -d '+90 days' '+%Y-%m-%dT%H:%M:%SZ')"

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

audience="https://github.com/pirate-social-club"
encoded_audience="$(AUDIENCE="$audience" node -e 'process.stdout.write(encodeURIComponent(process.env.AUDIENCE))')"
oidc="$(curl -fsS -H "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" "${ACTIONS_ID_TOKEN_REQUEST_URL}&audience=${encoded_audience}" | node -e 'let i="";process.stdin.on("data",c=>i+=c);process.stdin.on("end",()=>process.stdout.write(JSON.parse(i).value))')"
login_payload="$(INFISICAL_IDENTITY_ID="$INFISICAL_IDENTITY_ID" OIDC="$oidc" node -e 'process.stdout.write(JSON.stringify({identityId:process.env.INFISICAL_IDENTITY_ID,jwt:process.env.OIDC}))')"
login_code="$(curl -sS -o /tmp/admin-operator-infisical-login.json -w '%{http_code}' -X POST https://app.infisical.com/api/v1/auth/oidc-auth/login -H 'Content-Type: application/json' --data "$login_payload")"
if [[ "$login_code" != "200" ]]; then
  echo "Infisical OIDC login failed: HTTP $login_code" >&2
  exit 1
fi
infisical_token="$(node -e 'process.stdout.write(require("/tmp/admin-operator-infisical-login.json").accessToken)')"
echo "::add-mask::$infisical_token"

payload="$(PROJECT_ID="$INFISICAL_PROJECT_ID" ENVIRONMENT="$INFISICAL_ENV" SECRET_PATH="$INFISICAL_SECRET_PATH" SECRET_VALUE="$credential" node -e 'process.stdout.write(JSON.stringify({projectId:process.env.PROJECT_ID,environment:process.env.ENVIRONMENT,secretPath:process.env.SECRET_PATH,secretValue:process.env.SECRET_VALUE,type:"shared",secretComment:"Scoped API admin automation credential; rotate before expiry"}))')"
write_code="$(curl -sS -o /tmp/admin-operator-infisical-write.json -w '%{http_code}' -X POST "https://app.infisical.com/api/v4/secrets/$CREDENTIAL_ENV_NAME" -H "Authorization: Bearer $infisical_token" -H 'Content-Type: application/json' --data "$payload")"
if [[ "$write_code" != "200" ]]; then
  echo "Infisical secret create failed: HTTP $write_code" >&2
  exit 1
fi

echo "credential_env_name=$CREDENTIAL_ENV_NAME" >> "$GITHUB_STEP_SUMMARY"
echo "credential_expires_at=$expires_at" >> "$GITHUB_STEP_SUMMARY"
echo "credential stored without exposing its value"
