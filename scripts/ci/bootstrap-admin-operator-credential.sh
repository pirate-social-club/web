#!/usr/bin/env bash
set -euo pipefail

api_dir="${1:?API checkout path is required}"
for name in CONTROL_PLANE_MIGRATOR_DATABASE_URL CREDENTIAL_ENV_NAME PIRATE_ADMIN_TOKEN; do
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required environment variable: $name" >&2
    exit 1
  fi
done

expires_at="$(date -u -d '+90 days' '+%Y-%m-%dT%H:%M:%SZ')"

export ADMIN_OPERATOR_CREDENTIAL_ID=opc_admin_automation
export ADMIN_OPERATOR_EXPIRES_AT="$expires_at"
export REVOKE_CREDENTIAL_IDS="${REVOKE_CREDENTIAL_IDS:-}"
bun -e '
  import { createHash } from "node:crypto";
  import { SQL } from "bun";
  const url = new URL(process.env.CONTROL_PLANE_MIGRATOR_DATABASE_URL);
  url.searchParams.delete("sslrootcert");
  const sql = new SQL({ url: url.toString(), max: 1 });
  const now = new Date().toISOString();
  const id = process.env.ADMIN_OPERATOR_CREDENTIAL_ID;
  const hash = createHash("sha256").update(process.env.PIRATE_ADMIN_TOKEN).digest("hex");
  const scopes = JSON.stringify(["admin:users:act_as","admin:users:manage","admin:operations:manage","admin:debug:access"]);
  try {
    for (const staleId of process.env.REVOKE_CREDENTIAL_IDS.split(/\s+/).filter(Boolean)) {
      await sql`UPDATE operator_credentials SET status = ${"revoked"}, revoked_at = ${now} WHERE operator_credential_id = ${staleId} AND status = ${"active"}`;
    }
    await sql`INSERT INTO operator_credentials (operator_credential_id, operator_actor_id, label, secret_hash, secret_hash_algo, secret_hash_version, scopes_json, status, created_at, expires_at)
      VALUES (${id}, ${"svc_admin_automation"}, ${"Admin automation"}, ${hash}, ${"sha256"}, 1, ${scopes}, ${"active"}, ${now}, ${process.env.ADMIN_OPERATOR_EXPIRES_AT})
      ON CONFLICT (operator_credential_id) DO UPDATE SET secret_hash = EXCLUDED.secret_hash, scopes_json = EXCLUDED.scopes_json, status = EXCLUDED.status, expires_at = EXCLUDED.expires_at, revoked_at = NULL`;
  } finally { await sql.end(); }
'

echo "credential_env_name=$CREDENTIAL_ENV_NAME" >> "$GITHUB_STEP_SUMMARY"
echo "credential_expires_at=$expires_at" >> "$GITHUB_STEP_SUMMARY"
echo "credential bound to existing encrypted automation secret without exposing its value"
