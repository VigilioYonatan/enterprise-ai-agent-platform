# Optional OAuth Connector Secrets (never commit)

Mounted read-only at `/run/connector-secrets` ONLY into `api` and `worker` (isolated from infrastructure secrets in `../secrets/`):

- `aes-key`: 64-character hex AES-256-GCM encryption key used to encrypt/decrypt tenant OAuth tokens at rest.
- `client-secret`: External OAuth 2.0 client secret (required only when `CONNECTOR_OAUTH_CLIENT_ID` is configured).

Never commit secret files to Git. Restrict host permissions (`chmod 600` / UID ACL).
