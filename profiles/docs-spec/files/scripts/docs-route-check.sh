#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: $0 PUBLIC_URL PROTECTED_URL" >&2
  exit 2
fi

public_status=$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' "$1")
protected_status=$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' "$2")

if [[ "$public_status" != "200" ]]; then
  echo "public route failed: expected 200, received $public_status" >&2
  exit 1
fi

if [[ "$protected_status" != "404" ]]; then
  echo "anonymous protected route failed: expected 404, received $protected_status" >&2
  exit 1
fi

echo "route checks passed: public=200 anonymous-protected=404"
echo "authenticated access and private no-store caching remain separate checks"
