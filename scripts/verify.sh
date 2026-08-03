#!/usr/bin/env bash

set -euo pipefail

bun scripts/project-starter.ts verify
bun run check

resolved_tool=""
resolve_tool() {
  local tool_name=$1
  resolved_tool=""
  if command -v "$tool_name" >/dev/null 2>&1; then
    resolved_tool=$(command -v "$tool_name")
    return 0
  fi
  if command -v mise >/dev/null 2>&1; then
    if resolved_tool=$(mise which "$tool_name" 2>/dev/null); then
      return 0
    fi
  fi
  return 1
}

if resolve_tool actionlint; then
  "$resolved_tool"
else
  echo "verify: actionlint not installed; structural workflow checks passed" >&2
fi

if resolve_tool shellcheck; then
  shell_scripts=(scripts/verify.sh scripts/hooks/gitleaks-staged)
  shopt -s nullglob
  shell_scripts+=(profiles/*/files/scripts/*.sh)
  shopt -u nullglob
  "$resolved_tool" "${shell_scripts[@]}"
else
  echo "verify: shellcheck not installed; bash syntax checks passed" >&2
fi
