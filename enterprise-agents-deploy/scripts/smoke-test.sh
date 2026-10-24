#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
APP_URL="${APP_URL:-http://127.0.0.1:8080}" node "$ROOT/prod-local/scripts/smoke.mjs"
