#!/usr/bin/env bash
set -euo pipefail

: "${HNS_PROBE_GATEWAY_IP:?HNS_PROBE_GATEWAY_IP is required}"
: "${HNS_PROBE_ROOT:?HNS_PROBE_ROOT is required}"
: "${HNS_PROBE_COMMUNITY_ID:?HNS_PROBE_COMMUNITY_ID is required}"
: "${HNS_PROBE_ROUTE_SLUG:?HNS_PROBE_ROUTE_SLUG is required}"

html_file="$(mktemp)"
app_html_file="$(mktemp)"
canonical_html_file="$(mktemp)"
canonical_threads_html_file="$(mktemp)"
inventory_apex_html_file="$(mktemp)"
inventory_app_html_file="$(mktemp)"
inventory_apex_headers_file="$(mktemp)"
namespace_file="$(mktemp)"
trap 'rm -f "$html_file" "$app_html_file" "$canonical_html_file" "$canonical_threads_html_file" "$inventory_apex_html_file" "$inventory_app_html_file" "$inventory_apex_headers_file" "$namespace_file"' EXIT

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

request_redirect_status() {
  local host="$1"
  local path="$2"
  local headers_file="$3"
  curl "${curl_args[@]}" \
    --resolve "${host}:443:${HNS_PROBE_GATEWAY_IP}" \
    --dump-header "$headers_file" \
    --output /dev/null \
    --write-out $'%{http_code}\t%{redirect_url}' \
    "https://${host}${path}"
}

response_header_value() {
  local headers_file="$1"
  local header_name="$2"
  awk -v header_name="$header_name" '
    BEGIN { IGNORECASE=1 }
    $0 ~ "^" header_name ":" {
      sub(/^[^:]*:[[:space:]]*/, "");
      gsub(/\r/, "");
      value=$0
    }
    END { print value }
  ' "$headers_file"
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
  if (root && id && slug) process.stdout.write(`${root}\t${id}\t${slug}\t${encodeURIComponent(slug).replace(/^%40/u, "@")}\n`);
}
NODE
)

if (( ${#namespace_rows[@]} == 0 )); then
  if [[ "${HNS_PROBE_ALLOW_EMPTY_INVENTORY:-false}" == "true" ]]; then
    echo "public namespace inventory is empty; no activated HNS root is available for this release probe" >&2
    exit 0
  fi
  echo "public namespace inventory is empty" >&2
  exit 1
fi

inventory_has_probe_root=false
for row in "${namespace_rows[@]}"; do
  IFS=$'\t' read -r root community_id route_slug encoded_route_slug <<< "$row"
  if [[ "$root" == "$HNS_PROBE_ROOT" && "$community_id" == "$HNS_PROBE_COMMUNITY_ID" ]]; then
    inventory_has_probe_root=true
  fi

  root_apex_redirect="$(request_redirect_status "$root" "/" "$inventory_apex_headers_file")"
  root_apex_status="${root_apex_redirect%%$'\t'*}"
  root_apex_location="${root_apex_redirect#*$'\t'}"
  root_apex_cache_control="$(response_header_value "$inventory_apex_headers_file" "cache-control")"
  root_apex_cdn_cache_control="$(response_header_value "$inventory_apex_headers_file" "cdn-cache-control")"
  root_apex_cache_tag="$(response_header_value "$inventory_apex_headers_file" "cache-tag")"
  root_apex_cf_cache_status="$(response_header_value "$inventory_apex_headers_file" "cf-cache-status")"
  root_apex_age="$(response_header_value "$inventory_apex_headers_file" "age")"
  root_apex_cf_ray="$(response_header_value "$inventory_apex_headers_file" "cf-ray")"
  app_host="app.${root}"
  app_status="$(request_status "$app_host" "/" "$inventory_app_html_file")"
  app_threads_status="$(request_status "$app_host" "/c/${encoded_route_slug}/threads" "$inventory_apex_html_file")"
  app_cors="$(api_header_value "https://${app_host}" "/public-communities/${community_id}/feed/videos")"
  app_cors_status="${app_cors%%$'\t'*}"
  app_cors_origin="${app_cors#*$'\t'}"
  expected_apex_location="https://${app_host}/c/${encoded_route_slug}/threads"

  if [[ "$root_apex_status" != "307" || "$root_apex_location" != "$expected_apex_location" \
    || "$root_apex_cache_control" != "no-store" || "$root_apex_cdn_cache_control" != "no-store" \
    || -n "$root_apex_cache_tag" \
    || "$app_status" != "200" || "$app_threads_status" != "200" \
    || "$app_cors_status" != "200" || "$app_cors_origin" != "https://${app_host}" ]]; then
    echo "HNS app routing failed: root=${root} apex=${root_apex_status}/${root_apex_location:-none} cache_control=${root_apex_cache_control:-none} cdn_cache_control=${root_apex_cdn_cache_control:-none} cache_tag=${root_apex_cache_tag:-none} cf_cache_status=${root_apex_cf_cache_status:-none} age=${root_apex_age:-none} cf_ray=${root_apex_cf_ray:-none} app=${app_status} threads=${app_threads_status} app_cors=${app_cors_status}/${app_cors_origin:-none}" >&2
    exit 1
  fi

  canonical_threads_status="$(public_request_status "/c/${encoded_route_slug}/threads" "$canonical_threads_html_file")"
  canonical_videos_status="$(public_request_status "/c/${encoded_route_slug}/videos" "$canonical_html_file")"
  if [[ "$canonical_threads_status" != "200" || "$canonical_videos_status" != "200" ]]; then
    echo "surface navigation source failed: community_id=${community_id} threads=${canonical_threads_status} videos=${canonical_videos_status}" >&2
    exit 1
  fi
  node scripts/ci/sovereign-context.mjs \
    --navigation-only \
    --html "$inventory_apex_html_file" \
    --app-html "$inventory_app_html_file" \
    --canonical-html "$canonical_html_file" \
    --canonical-threads-html "$canonical_threads_html_file" \
    --root "$root" \
    --community-id "$community_id" \
    --route-slug "$route_slug"
  printf 'community_id=%s apex_redirect=%s cache_control=%s cdn_cache_control=%s cache_tag=%s cf_cache_status=%s age=%s cf_ray=%s app=%s threads=%s cors=ok navigation=ok\n' \
    "$community_id" "$root_apex_status" "$root_apex_cache_control" "$root_apex_cdn_cache_control" \
    "${root_apex_cache_tag:-none}" "${root_apex_cf_cache_status:-none}" "${root_apex_age:-none}" \
    "${root_apex_cf_ray:-none}" "$app_status" "$app_threads_status"
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

encoded_probe_route_slug="$(node -e 'process.stdout.write(encodeURIComponent(process.argv[1]).replace(/^%40/u, "@"))' "$HNS_PROBE_ROUTE_SLUG")"
apex_redirect="$(request_redirect_status "$HNS_PROBE_ROOT" "/")"
apex_status="${apex_redirect%%$'\t'*}"
apex_location="${apex_redirect#*$'\t'}"
expected_apex_location="https://app.${HNS_PROBE_ROOT}/c/${encoded_probe_route_slug}/threads"
if [[ "$apex_status" != "307" || "$apex_location" != "$expected_apex_location" ]]; then
  echo "sovereign apex redirect failed: status=${apex_status} location=${apex_location:-none}" >&2
  exit 1
fi

app_host="app.${HNS_PROBE_ROOT}"
app_status="$(request_status "$app_host" "/" "$app_html_file")"
if [[ "$app_status" != "200" ]]; then
  echo "sovereign app returned HTTP ${app_status}" >&2
  exit 1
fi

app_threads_status="$(request_status "$app_host" "/c/${encoded_probe_route_slug}/threads" "$html_file")"
if [[ "$app_threads_status" != "200" ]]; then
  echo "sovereign app threads returned HTTP ${app_threads_status}" >&2
  exit 1
fi

canonical_status="$(public_request_status "/c/${HNS_PROBE_ROUTE_SLUG}/videos" "$canonical_html_file")"
if [[ "$canonical_status" != "200" ]]; then
  echo "canonical community video page returned HTTP ${canonical_status}" >&2
  exit 1
fi

node scripts/ci/sovereign-context.mjs \
  --html "$html_file" \
  --app-html "$app_html_file" \
  --canonical-html "$canonical_html_file" \
  --root "$HNS_PROBE_ROOT" \
  --community-id "$HNS_PROBE_COMMUNITY_ID" \
  --route-slug "$HNS_PROBE_ROUTE_SLUG"

own_status="$(request_status "$app_host" "/c/${HNS_PROBE_ROUTE_SLUG}/mod" /dev/null)"
foreign_status="$(request_status "$app_host" "/c/not-the-sovereign-community/threads" /dev/null)"
wallet_status="$(request_status "$app_host" "/wallet" /dev/null)"

if [[ "$own_status" != "200" || "$foreign_status" != "404" || "$wallet_status" != "200" ]]; then
  echo "sovereign app routing failed: own=${own_status} foreign=${foreign_status} wallet=${wallet_status}" >&2
  exit 1
fi

printf '{"status":"ok","root":"%s","apex_redirect":%s,"app":%s,"app_threads":%s,"canonical":%s,"app_own":%s,"app_foreign":%s,"wallet":%s}\n' \
  "$HNS_PROBE_ROOT" "$apex_status" "$app_status" "$app_threads_status" "$canonical_status" "$own_status" "$foreign_status" "$wallet_status"
