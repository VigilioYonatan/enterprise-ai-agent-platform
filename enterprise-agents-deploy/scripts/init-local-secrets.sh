#!/usr/bin/env bash
set -euo pipefail
# Local development only. Never overwrite existing secrets.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
folder="$ROOT/compose/secrets"
connector_folder="$ROOT/compose/connector-secrets"
command -v openssl >/dev/null || { echo 'openssl is required' >&2; exit 2; }
umask 077
mkdir -p "$folder" "$connector_folder"
create() { local target="$1"; if [[ ! -s "$target" ]]; then openssl rand -hex 32 > "$target"; fi; }
create "$folder/postgres-password"
create "$folder/keycloak-admin-password"
create "$folder/grafana-admin-password"
create "$folder/nats-token"
create "$connector_folder/aes-key"
if [[ ! -s "$folder/nats.conf" ]]; then
  token="$(<"$folder/nats-token")"
  printf 'port: 4222\njetstream: { store_dir: "/data" }\nauthorization { token: "%s" }\n' "$token" > "$folder/nats.conf"
fi
if [[ ! -s "$folder/database-url" ]]; then
  password="$(<"$folder/postgres-password")"
  # openssl hex has no URL-reserved characters.
  printf 'postgres://agentops:%s@postgres:5432/agentops\n' "$password" > "$folder/database-url"
fi
chmod 600 "$folder/postgres-password" "$folder/keycloak-admin-password" "$folder/grafana-admin-password" "$folder/database-url" "$folder/nats-token" "$folder/nats.conf" "$connector_folder/aes-key"
echo 'Local secrets created without echoing their values.'
echo 'Verify read permission for UID 1000 in the node runtime; use host ACLs when UID/GID differ.'
