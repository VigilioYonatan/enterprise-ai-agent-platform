#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
command -v docker >/dev/null || { echo 'BLOCKED: Docker required' >&2; exit 2; }
if [[ ! -f .env ]]; then cp environments/local.env.example .env; fi
"$ROOT/scripts/init-local-secrets.sh"
DC=(docker compose --env-file .env -f compose/compose.yaml)
"${DC[@]}" --profile dev --profile cache config --quiet
"${DC[@]}" --profile dev --profile cache up --build -d postgres keycloak nats valkey mailpit
# Migrations are a single explicit job; never run DDL in every API replica.
"${DC[@]}" --profile tools run --build --rm migration
"${DC[@]}" --profile dev --profile cache up --build -d
"$ROOT/scripts/smoke-test.sh"
