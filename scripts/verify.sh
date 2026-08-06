#!/usr/bin/env bash

set -euo pipefail

exec bun scripts/verify-repository.ts
