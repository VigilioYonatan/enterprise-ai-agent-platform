#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
if ! command -v docker >/dev/null; then echo 'Docker is required; NOT_RUN' >&2;exit 2;fi
docker compose --env-file .env -f compose/compose.yaml config --quiet
echo 'Compose interpolation and schema valid'
