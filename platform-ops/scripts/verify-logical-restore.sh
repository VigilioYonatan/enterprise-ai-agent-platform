#!/usr/bin/env bash
set -euo pipefail
# Logical restoration proof, NOT PITR. Isolated loopback PostgreSQL only.
[[ "${ALLOW_RESTORE_DRILL:-}" == 'YES' ]] || { echo 'Set ALLOW_RESTORE_DRILL=YES after review' >&2;exit 2; }
BACKUP="${1:?Path to pg_dump custom-format backup required}"
[[ -s "$BACKUP" ]] || { echo 'Backup missing or empty' >&2;exit 1; }
for cmd in psql createdb dropdb pg_restore;do command -v "$cmd" >/dev/null || { echo "$cmd required" >&2;exit 2; };done
[[ "${PGHOST:-localhost}" == 'localhost' || "${PGHOST:-localhost}" == '127.0.0.1' ]] || { echo 'Only loopback host is allowed' >&2;exit 1; }
DB="agentops_restore_$(date +%s)_$$"
trap 'dropdb --if-exists "$DB" >/dev/null 2>&1 || true' EXIT
createdb "$DB"
pg_restore --exit-on-error --no-owner --no-privileges -d "$DB" "$BACKUP"
psql -d "$DB" -v ON_ERROR_STOP=1 -tAc 'SELECT count(*) FROM organizations;' >/dev/null
psql -d "$DB" -v ON_ERROR_STOP=1 -tAc 'SELECT count(*) FROM workflows;' >/dev/null
printf 'PASS: logical backup restored to isolated database %s and core tables queried; PITR not proven.\n' "$DB"
