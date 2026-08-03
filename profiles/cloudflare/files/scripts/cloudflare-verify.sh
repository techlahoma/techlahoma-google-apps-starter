#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: $0 https://host.example/health" >&2
  exit 2
fi

target_url=$1
case "$target_url" in
  https://*) ;;
  *)
    echo "target must use https" >&2
    exit 2
    ;;
esac

status=$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' "$target_url")

if [[ "$status" != "200" ]]; then
  echo "live verification failed: $target_url returned HTTP $status" >&2
  exit 1
fi

echo "live verification passed: $target_url returned HTTP 200"
