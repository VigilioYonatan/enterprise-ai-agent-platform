# Threat model — AgentOps self-hosted

Assets: tenant records, agent instructions, workflow versions, approval decisions, JWT access tokens, local LLM inference output, run state, documents, audit logs.

Boundaries: browser→Caddy→Nest JWT; Nest→PostgreSQL tenant-filtered; worker→PG queue; outbox→NATS; worker→local Ollama; browser→Keycloak via OIDC PKCE. NATS, Valkey and PostgreSQL must have no exposed public TCP ports.

High-risk scenarios and safeguards:
- IDOR/tenant confusion: membership checked in controllers and application service, scoped repository queries, cross-tenant E2E tests mandatory.
- Approval bypass: exact args hash + run/node binding, 24h expiry, requestor cannot approve own step, admin/owner only, compare before execution.
- Prompt injection: LLM output treated as untrusted data, no shell or outbound network tools; only bounded deterministic functions available.
- SSRF: external HTTP tools intentionally not implemented until egress policy + DNS/IP pinning + URL allowlist + tests.
- Replay/duplicate messages: Postgres unique idempotency key + durable step keys; NATS msgID dedup; retry of LLM may incur duplicate charges and is recorded as an accepted risk.
- Secrets: Keycloak password env shown for local ONLY; prod needs protected secret mounts, TLS and rotation.
- Trust boundary for browser tokens: SPA stores OIDC tokens in session storage for demo; BFF cookie/CSRF design required for sensitive regulated deployment.
- User-provided documents: text-only, size-limited (16k characters), no executable or binary uploads; RAG embeddings not enabled.

No claim of audited production security without DAST, scans, container runtime verification and pentest.
