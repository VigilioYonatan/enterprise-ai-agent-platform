# Production release gates — AgentOps, Docker Compose only, no AWS

**State:** NOT APPROVED, source delivery only. A gate is PASS only after command output, SHA and environment are recorded by CI and independently reviewed.

## Required sequence

1. Lockfile generation on Node 24.22.2 LTS: run `scripts/generate-lockfiles.sh` while connected; commit the two genuine `package-lock.json` files. Dockerfiles enforce `npm ci`.
2. Backend: `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:coverage`, `npm run test:bdd`, `npm run build`, OpenAPI export and breaking diff.
3. Real migrated PostgreSQL: `npm run test:integration` and `npm run test:e2e:api`, with negative access cases between organizations and ACLs; never use test doubles as evidence.
4. Frontend: `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:unit`, `npm run test:coverage`, `npm run test:e2e` with a real, verified Keycloak test user, plus Playwright axe and a manual WCAG 2.2 review.
5. Security: static composition, secrets scanning, dependency vulnerability gates, SBOM for each OCI image, container image scan, Cosign keyless signature and provenance verification (OIDC workflow identity). Tools must be present and versions reviewed.
6. Infra: `docker compose config --quiet` with real production env, valid TLS certificate on Caddy, network/permissions inspection, Keycloak issuer and redirect URLs, hardening of accounts, smtp TLS and secret rotations.
7. Observability: `promtool check rules`, `promtool test rules`, dashboard scrape checks, live traces, external blackbox availability, real Alertmanager delivery and resolving; static config is not proof.
8. Data: backup 3-2-1, continuous WAL with pgBackRest on a verified image, physically isolated PITR restore drill, and measured RPO/RTO.
9. Resilience: restart API/worker/NATS/PostgreSQL under load, prove idempotent tool effects, no loss of events, outage runbooks and recovery thresholds.
10. Only then promote immutable image digests via a restricted change-approved deployment; migration is an explicit tools-profile job.

### Hard release blockers currently known

- Authentic npm lockfiles and TypeScript/Vitest builds not available in this execution environment.
- Existing React HTTP types are still handwritten, browser-safe OpenAPI SDK generation remains blocked.
- No completed browser E2E, database/worker integration or manual accessibility tests.
- External OAuth provider, durable idempotency of irreversible actions, PDF/object-storage antivirus processing not independently verified.
- Static Prometheus/Tempo pipeline exists; Node OTLP exporter, real receivers/alerts and worker tracing still missing.
- Keycloak dev realm Mailpit SMTP and initial import must be converted to real production SMTP and verified client redirect URLs; current example is not secure production configuration.
- Continuous pgBackRest/WAL 3-2-1 deployment and PITR have not been implemented or tested.
- Image digests are configurable but not known/pinned/verified, SAST/SCA scanners not run.

A fully deployed, secure production release cannot be asserted from these files or a CRC check.

### Cadena de custodia de evidencias (adición)

`check-release-gates.sh` ahora **no acepta archivos `.PASS` sueltos**: exige `audit/release-evidence/manifest.json`, su firma detached validada con `cosign verify-blob --key`, `RELEASE_EVIDENCE_PUBLIC_KEY` y registros con `status: PASS`, `evidence_sha256`, commit y entorno para las 12 suites obligatorias. El script valida formato y firma; un revisor autorizado debe además comprobar el origen CI y la correspondencia del SHA con los artefactos. `deploy-production.sh` bloquea promoción sin firma OCI y matriz de imágenes por digest. No se entrega ningún manifiesto PASS prellenado.

Ejemplo de estructura para evidencia **solo después** de ejecutar los controles, nunca fabricar:

```json
{
  "commit_sha": "<SHA real del commit probado>",
  "environment": "<entorno aislado y fecha>",
  "checks": {
    "backend-unit": { "status": "PASS", "evidence_sha256": "<hash de logs verificados>" }
  }
}
```

### Situación actual

Sin Node 24 operativo, npm registry, Docker, Keycloak y PostgreSQL vivos, OTLP exporter probado, promtool, amtool, escáneres, certificados TLS, mail real ni PITR restaurado, el resultado correcto es **BLOCKED / NOT_RUN**, no PASS. Existen configuraciones y suites; no evidencia operativa. 
