# Production hardening — blocking checklist

The included Compose is a **local demo**, not production configuration.

1. Keycloak switch from `start-dev` to `start --optimized` with HTTPS hostname, trusted proxy, trusted CA and separated DB credentials. Generate confidential admin credentials via secret mounts, no defaults or command-line passwords.
2. Enforce HTTPS for app and IdP. Update Keycloak client redirect URIs and OIDC issuer with precise public HTTPS hosts; configure a real SMTP provider with encrypted transport and email verification.
3. Change SPA bearer token architecture to BFF HttpOnly/Secure/SameSite cookies, synchronizer CSRF tokens and rotating server-side sessions for high assurance. Alternatively explicitly accept and mitigate sessionStorage XSS risk.
4. Add Keycloak Google and Facebook provider credentials only via protected admin configuration or managed secrets. Check redirect callback allowlists and provider verification requirements.
5. Separate public edge and internal networks. Only Caddy exposes HTTPS. No DB, brokers, or Mailpit ports. Disable OpenAPI/Scalar public access (`DOCS_ENABLED=false`).
6. Generate npm lockfiles online and use `npm ci`; pin OCI image digests, scan SCA/SAST/container, generate SBOM, sign images, implement release promotion by digest.
7. Postgres: unique DB users/roles, least-privilege privileges, encryption, tested PITR backups, migrations with rollback and retention.
8. NATS and Valkey: auth + mTLS/isolated network, quota, monitoring; avoid insecure defaults.
9. Implement outbox/inbox, safe workers, real API rate limiting, audit and tenant penetration tests before public release.
10. Test actual docker compose config/up/smoke, Keycloak login/password reset, social redirect, access-control, email routing and disaster recovery. Keep evidence.
