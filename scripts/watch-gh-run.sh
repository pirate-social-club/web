#!/usr/bin/env bash
set -euo pipefail

RUN_ID=""
REPO=""
INTERVAL=30

usage() {
  cat <<'EOF'
Usage: scripts/watch-gh-run.sh RUN_ID [--repo OWNER/REPO] [--interval SECONDS]

Waits quietly for a GitHub Actions run to finish, then prints structured data
for the workflow and every job. The exit status matches `gh run watch`.

Options:
  --repo OWNER/REPO   Repository containing the run. Defaults to the current repo.
  --interval SECONDS  Polling interval. Default: 30.
  -h, --help          Show this help.
EOF
}

if [[ $# -eq 0 ]]; then
  usage >&2
  exit 2
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo|-R)
      REPO="${2:-}"
      if [[ -z "$REPO" ]]; then
        printf 'Missing value for %s\n' "$1" >&2
        exit 2
      fi
      shift 2
      ;;
    --interval|-i)
      INTERVAL="${2:-}"
      if [[ ! "$INTERVAL" =~ ^[1-9][0-9]*$ ]]; then
        printf 'Interval must be a positive integer: %s\n' "$INTERVAL" >&2
        exit 2
      fi
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      printf 'Unknown argument: %s\n' "$1" >&2
      usage >&2
      exit 2
      ;;
    *)
      if [[ -n "$RUN_ID" ]]; then
        printf 'Unexpected argument: %s\n' "$1" >&2
        usage >&2
        exit 2
      fi
      RUN_ID="$1"
      shift
      ;;
  esac
done

if [[ -z "$RUN_ID" ]]; then
  printf 'RUN_ID is required\n' >&2
  exit 2
fi

repo_args=()
if [[ -n "$REPO" ]]; then
  repo_args=(--repo "$REPO")
fi

printf 'Watching GitHub Actions run %s until completion...\n' "$RUN_ID" >&2

watch_status=0
rtk gh run watch "$RUN_ID" \
  "${repo_args[@]}" \
  --compact \
  --exit-status \
  --interval "$INTERVAL" >/dev/null || watch_status=$?

rtk gh run view "$RUN_ID" \
  "${repo_args[@]}" \
  --json status,conclusion,jobs,url

exit "$watch_status"
