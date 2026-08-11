#!/usr/bin/env bash
set -euo pipefail

: "${HNS_PROBE_GATEWAY_IP:?HNS_PROBE_GATEWAY_IP is required}"
: "${HNS_PROBE_ROOT:?HNS_PROBE_ROOT is required}"
: "${HNS_PROBE_COMMUNITY_ID:?HNS_PROBE_COMMUNITY_ID is required}"
: "${HNS_PROBE_ROUTE_SLUG:?HNS_PROBE_ROUTE_SLUG is required}"

html_file="$(mktemp)"
canonical_html_file="$(mktemp)"
namespace_file="$(mktemp)"
trap 'rm -f "$html_file" "$canonical_html_file" "$namespace_file"' EXIT

# Public PKI cannot validate a DANE-only HNS certificate. --insecure disables
# only that mismatched trust model; --resolve still exercises the real Caddy →
# gateway → Worker path with the sovereign host as both SNI and Host.
curl_args=(
  --silent
  --show-error
  --insecure
  --connect-timeout 10
  --max-time 30
  --retry 2
  --retry-all-errors
  --retry-delay 1
)

request_status() {
  local host="$1"
  local path="$2"
  local output="$3"
  curl "${curl_args[@]}" \
    --resolve "${host}:443:${HNS_PROBE_GATEWAY_IP}" \
    --output "$output" \
    --write-out '%{http_code}' \
    "https://${host}${path}"
}

public_request_status() {
  local path="$1"
  local output="$2"
  curl \
    --silent \
    --show-error \
    --connect-timeout 10 \
    --max-time 30 \
    --retry 2 \
    --retry-all-errors \
    --retry-delay 1 \
    --output "$output" \
    --write-out '%{http_code}' \
    "https://pirate.sc${path}"
}

api_header_value() {
  local origin="$1"
  local path="$2"
  local headers_file
  headers_file="$(mktemp)"
  local status
  status="$(curl \
    --silent \
    --show-error \
    --connect-timeout 10 \
    --max-time 30 \
    --retry 2 \
    --retry-all-errors \
    --retry-delay 1 \
    -H "Origin: ${origin}" \
    -D "$headers_file" \
    -o /dev/null \
    --write-out '%{http_code}' \
    "https://api.pirate.sc${path}")"
  local allow_origin
  allow_origin="$(awk 'BEGIN { IGNORECASE=1 } /^access-control-allow-origin:/ { sub(/^[^:]*:[[:space:]]*/, ""); gsub(/\r/, ""); value=$0 } END { print value }' "$headers_file")"
  rm -f "$headers_file"
  printf '%s\t%s' "$status" "$allow_origin"
}

if ! namespace_status="$(curl \
  --silent \
  --show-error \
  --connect-timeout 10 \
  --max-time 30 \
  --retry 2 \
  --retry-all-errors \
  --retry-delay 1 \
  --output "$namespace_file" \
  --write-out '%{http_code}' \
  "https://api.pirate.sc/public-namespaces")"; then
  echo "public namespace inventory request failed: transport error" >&2
  exit 1
fi

if [[ "$namespace_status" != "200" ]]; then
  echo "public namespace inventory request failed: HTTP ${namespace_status}" >&2
  exit 1
fi

mapfile -t namespace_rows < <(node - "$namespace_file" <<'NODE'
const fs = require("node:fs");
const file = process.argv[2];
const body = JSON.parse(fs.readFileSync(file, "utf8"));
for (const namespace of body.namespaces ?? []) {
  const root = typeof namespace.root_label === "string" ? namespace.root_label.trim() : "";
  const community = namespace.community ?? {};
  const id = typeof community.id === "string" ? community.id.trim() : "";
  const slug = typeof community.route_slug === "string" ? community.route_slug.trim() : "";
  if (root && id && slug) process.stdout.write(`${root}\t${id}\t${slug}\n`);
}
NODE
)

if (( ${#namespace_rows[@]} == 0 )); then
  echo "public namespace inventory is empty" >&2
  exit 1
fi

inventory_has_probe_root=false
for row in "${namespace_rows[@]}"; do
  IFS=$'\t' read -r root community_id route_slug <<< "$row"
  if [[ "$root" == "$HNS_PROBE_ROOT" && "$community_id" == "$HNS_PROBE_COMMUNITY_ID" ]]; then
    inventory_has_probe_root=true
  fi

  root_apex_status="$(request_status "$root" "/" /dev/null)"
  app_host="app.${root}"
  app_status="$(request_status "$app_host" "/" /dev/null)"
  apex_cors="$(api_header_value "https://${root}" "/public-communities/${community_id}/feed/videos")"
  app_cors="$(api_header_value "https://${app_host}" "/public-communities/${community_id}/feed/videos")"
  apex_cors_status="${apex_cors%%$'\t'*}"
  apex_cors_origin="${apex_cors#*$'\t'}"
  app_cors_status="${app_cors%%$'\t'*}"
  app_cors_origin="${app_cors#*$'\t'}"

  if [[ "$root_apex_status" != "200" || "$app_status" != "200" \
    || "$apex_cors_status" != "200" || "$apex_cors_origin" != "https://${root}" \
    || "$app_cors_status" != "200" || "$app_cors_origin" != "https://${app_host}" ]]; then
    echo "HNS root parity failed: root=${root} apex=${root_apex_status} app=${app_status} apex_cors=${apex_cors_status}/${apex_cors_origin:-none} app_cors=${app_cors_status}/${app_cors_origin:-none}" >&2
    exit 1
  fi
  printf 'root=%s apex=%s app=%s apex_cors=%s app_cors=%s\n' \
    "$root" "$root_apex_status" "$app_status" "$apex_cors_origin" "$app_cors_origin"
done

if [[ "$inventory_has_probe_root" != true ]]; then
  echo "pinned probe root is missing from the activated namespace inventory" >&2
  exit 1
fi

for unknown_origin in "https://hns-probe-unknown-root" "https://app.hns-probe-unknown-root"; do
  unknown_cors="$(api_header_value "$unknown_origin" "/health")"
  unknown_status="${unknown_cors%%$'\t'*}"
  unknown_allow_origin="${unknown_cors#*$'\t'}"
  if [[ "$unknown_status" != "200" || -n "$unknown_allow_origin" ]]; then
    echo "unknown HNS origin unexpectedly received CORS access: origin=${unknown_origin} status=${unknown_status} allow=${unknown_allow_origin:-none}" >&2
    exit 1
  fi
done

apex_status="$(request_status "$HNS_PROBE_ROOT" "/" "$html_file")"
if [[ "$apex_status" != "200" ]]; then
  echo "sovereign apex returned HTTP ${apex_status}" >&2
  exit 1
fi

canonical_status="$(public_request_status "/c/${HNS_PROBE_ROUTE_SLUG}/videos" "$canonical_html_file")"
if [[ "$canonical_status" != "200" ]]; then
  echo "canonical community video page returned HTTP ${canonical_status}" >&2
  exit 1
fi

node scripts/ci/sovereign-context.mjs \
  --html "$html_file" \
  --canonical-html "$canonical_html_file" \
  --root "$HNS_PROBE_ROOT" \
  --community-id "$HNS_PROBE_COMMUNITY_ID"

app_host="app.${HNS_PROBE_ROOT}"
own_status="$(request_status "$app_host" "/c/${HNS_PROBE_ROUTE_SLUG}/mod" /dev/null)"
foreign_status="$(request_status "$app_host" "/c/not-the-sovereign-community/threads" /dev/null)"
wallet_status="$(request_status "$app_host" "/wallet" /dev/null)"

if [[ "$own_status" != "200" || "$foreign_status" != "404" || "$wallet_status" != "200" ]]; then
  echo "sovereign app routing failed: own=${own_status} foreign=${foreign_status} wallet=${wallet_status}" >&2
  exit 1
fi

printf '{"status":"ok","root":"%s","apex":%s,"canonical":%s,"app_own":%s,"app_foreign":%s,"wallet":%s}\n' \
  "$HNS_PROBE_ROOT" "$apex_status" "$canonical_status" "$own_status" "$foreign_status" "$wallet_status"
