#!/usr/bin/env bash
set -euo pipefail
# Generates browser-safe types from the OWNED backend OpenAPI document.
# Intentionally fails rather than accepting handwritten DTO copies as a substitute.
SOURCE="${1:?Usage: scripts/generate-api-types.sh <path-to-openapi.json>}"
test -s "$SOURCE" || { echo 'OpenAPI artifact not found' >&2;exit 2; }
command -v npx >/dev/null || { echo 'npx is required' >&2;exit 2; }
# @hey-api/openapi-ts version is pinned in npm lockfile when adopted.
if ! grep -q '"@hey-api/openapi-ts"' package.json; then
  echo 'BLOCKED: add and lock an OpenAPI client generator after SDK compatibility review' >&2
  exit 2
fi
npx --no-install openapi-ts -i "$SOURCE" -o src/services/contracts/generated
