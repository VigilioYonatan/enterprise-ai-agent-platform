# Self-hosted secret files (never commit)

Runtime Compose declares six required file secrets with fixed names:

- `postgres-password`: PostgreSQL admin/runtime password, random high entropy.
- `database-url`: `postgres://agentops:<URL-ENCODED-PASSWORD>@postgres:5432/agentops` for Nest API and workers. Do not log it.
- `keycloak-admin-password`: bootstrap administrator password, change/disable bootstrap credentials after setup.
- `grafana-admin-password`: operator dashboard credential, pair with SSO and private network access.
- `nats-token`: authentication token for the publisher.
- `nats.conf`: server-side JetStream config referencing the same token (only NATS can read it).

For an optional external OAuth connector, supply `aes-key` (64 hex characters) and `client-secret` in `../connector-secrets/` (isolated from infrastructure secrets so `api` and `worker` cannot read PostgreSQL, Keycloak, Grafana, or NATS admin secrets). These are mounted read-only at `/run/connector-secrets` for the API and worker; they are NOT checked into Git.

Host permissions: use an encrypted secret store or provision root-owned secrets with an ACL limited to the runtime UID/group. On Linux Compose file secrets may be implemented as bind mounts: `mode` is not a reliable guarantee of ownership or effective filesystem permissions. Check read access **inside** each running non-root container, and inspect `/proc` and backups for leakage. Never `chmod 777`.

Secrets do not automatically rotate. Runbook: provision next secret/version, test decryption/connection, rotate provider credential, restart dependent containers one at a time, verify old credentials rejected, and retain keys until encrypted rows have been rewrapped.

Without these files, Compose config or startup is deliberately BLOCKED. Do not create dummy secrets to pass a release gate.
