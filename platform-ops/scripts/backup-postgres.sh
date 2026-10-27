#!/usr/bin/env bash
set -euo pipefail
# Logical pg_dump backup helper; pair with WAL archiving for PITR.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/../../enterprise-agents-deploy" && pwd)"
: "${POSTGRES_PASSWORD:?required}"
DEST="${1:?destination filename required}"
DB_NAME="${2:-agentops}"
if [[ -e "$DEST" ]]; then echo "Destination already exists" >&2; exit 1; fi
umask 077
docker compose --env-file "$DEPLOY_DIR/.env" -f "$DEPLOY_DIR/compose/compose.yaml" exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" postgres pg_dump -U agentops -Fc "$DB_NAME" > "$DEST"
[[ -s "$DEST" ]] || { rm -f "$DEST"; exit 1; }
echo "Backup created for database '$DB_NAME'; independently test restore before relying on it."
