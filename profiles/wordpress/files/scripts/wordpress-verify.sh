#!/usr/bin/env bash

set -euo pipefail

strict=0
if [[ "${1:-}" == "--strict" ]]; then
  strict=1
  shift
fi
if [[ $# -ne 0 ]]; then
  echo "usage: $0 [--strict]" >&2
  exit 2
fi

php_files=()
while IFS= read -r -d '' file_path; do
  php_files+=("$file_path")
done < <(git ls-files -z -- '*.php')

if [[ ${#php_files[@]} -eq 0 ]]; then
  echo "wordpress verify: no tracked PHP files"
else
  if ! command -v php >/dev/null 2>&1; then
    echo "wordpress verify: php is required for syntax checks" >&2
    exit 1
  fi
  for file_path in "${php_files[@]}"; do
    php -l "$file_path" >/dev/null
  done
  echo "wordpress verify: PHP syntax passed for ${#php_files[@]} file(s)"
fi

if [[ -x vendor/bin/phpcs ]]; then
  vendor/bin/phpcs
elif [[ "$strict" -eq 1 ]]; then
  echo "wordpress verify: vendor/bin/phpcs is required in strict mode" >&2
  exit 1
else
  echo "wordpress verify: PHPCS unavailable; install reviewed Composer dependencies" >&2
fi

if [[ -x vendor/bin/phpunit ]]; then
  vendor/bin/phpunit
else
  echo "wordpress verify: PHPUnit not configured; project-specific test proof remains"
fi
