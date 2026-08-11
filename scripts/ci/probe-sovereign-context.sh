#!/usr/bin/env bash
set -euo pipefail

: "${HNS_PROBE_GATEWAY_IP:?HNS_PROBE_GATEWAY_IP is required}"
: "${HNS_PROBE_ROOT:?HNS_PROBE_ROOT is required}"
: "${HNS_PROBE_COMMUNITY_ID:?HNS_PROBE_COMMUNITY_ID is required}"
: "${HNS_PROBE_ROUTE_SLUG:?HNS_PROBE_ROUTE_SLUG is required}"

html_file="$(mktemp)"
canonical_html_file="$(mktemp)"
trap 'rm -f "$html_file" "$canonical_html_file"' EXIT

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
