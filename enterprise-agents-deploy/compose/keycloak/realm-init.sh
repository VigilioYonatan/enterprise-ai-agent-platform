#!/bin/bash
set -euo pipefail
: "${APP_ORIGIN:?APP_ORIGIN must match the browser-facing origin}"
mode="${KEYCLOAK_START_MODE:-dev}"
case "$mode" in
  production)
    [[ "$APP_ORIGIN" == https://* ]] || { printf 'Production requires HTTPS APP_ORIGIN\n' >&2; exit 1; }
    command=start ;;
  dev) command=start-dev ;;
  *) printf 'KEYCLOAK_START_MODE must be dev or production\n' >&2; exit 1 ;;
esac
[[ "$APP_ORIGIN" =~ ^https?://[A-Za-z0-9.:-]+$ ]] || { printf 'APP_ORIGIN requires scheme and host only\n' >&2; exit 1; }
# The minimal Keycloak image provides bash, not a full toolchain. Use built-ins.
mkdir -p /opt/keycloak/data/import
while IFS= read -r line || [[ -n "$line" ]]; do
  printf '%s\n' "${line//http:\/\/localhost:8080/$APP_ORIGIN}"
done < /opt/keycloak/data/bootstrap/realm.template.json > /opt/keycloak/data/import/agentops-realm.json
IFS= read -r KC_DB_PASSWORD < /run/secrets/postgres_password || true
IFS= read -r KC_BOOTSTRAP_ADMIN_PASSWORD < /run/secrets/keycloak_admin_password || true
[[ -n "$KC_DB_PASSWORD" && -n "$KC_BOOTSTRAP_ADMIN_PASSWORD" ]] || { printf 'Keycloak runtime secrets missing\n' >&2; exit 1; }
export KC_DB_PASSWORD KC_BOOTSTRAP_ADMIN_PASSWORD
exec /opt/keycloak/bin/kc.sh "$command" --import-realm --http-enabled=true --proxy-headers=xforwarded
