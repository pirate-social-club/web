#!/usr/bin/env bash

repo_status() {
  git -C "$1" status --short
}

repo_ref() {
  git -C "$1" rev-parse --abbrev-ref HEAD
}

repo_sha() {
  git -C "$1" rev-parse --short HEAD
}

require_clean_release_source() {
  local dir="$1"
  local name="$2"
  local expected_sha="${3:-}"
  local actual_sha
  local branch

  if [[ -n "$(repo_status "$dir")" ]]; then
    printf '%s worktree is dirty:\n%s\n' "$name" "$(repo_status "$dir")" >&2
    exit 1
  fi

  if [[ -n "$expected_sha" ]]; then
    if [[ ! "$expected_sha" =~ ^[0-9a-f]{40}$ ]]; then
      printf '%s expected release SHA must be 40 lowercase hexadecimal characters\n' "$name" >&2
      exit 1
    fi

    actual_sha="$(git -C "$dir" rev-parse HEAD)"
    if [[ "$actual_sha" != "$expected_sha" ]]; then
      printf '%s release SHA mismatch: expected %s, got %s\n' \
        "$name" "$expected_sha" "$actual_sha" >&2
      exit 1
    fi
    return
  fi

  branch="$(repo_ref "$dir")"
  if [[ "$branch" != "main" ]]; then
    printf '%s must be on main, got %s\n' "$name" "$branch" >&2
    exit 1
  fi
}
