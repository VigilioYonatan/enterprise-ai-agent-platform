# Docker Compose, DevSecOps, operaciones (sin AWS)

## Cinco repos y runtime

`enterprise-agents-deploy/compose/compose.yaml` único archivo; interpolación `ENV_FILE`, `COMPOSE_PROJECT_NAME`, imagen por digest OCI; evitar compose.staging/prod divergentes. Servicios `caddy, web, api, worker, outbox, migration, platform-setup, postgres+pgvector, nats, valkey, object-storage, otel-collector, prometheus, grafana, tempo`, identidad autoalojada cuando configurada. Perfil herramientas para migraciones/setup; una imagen backend, varios entrypoints. Segmentar `edge/backend/observability`; solo Caddy publica 80/443; healthchecks y dependencias no equivalen a migración exitosa. Caddy proxy REST, SSE sin buffer incorrecto y TLS.

```text
enterprise-agents-deploy/compose/compose.yaml            # fuente única de topología
enterprise-agents-deploy/compose/Caddyfile               # TLS, proxy, headers, SSE
enterprise-agents-deploy/compose/config/nats.conf        # JS persistente, ack, consumers
enterprise-agents-deploy/compose/config/valkey.conf      # auth y límite cache
enterprise-agents-deploy/compose/config/otel-collector.yaml # redacción y exportación
enterprise-agents-deploy/observability/prometheus/prometheus.yml # métricas
enterprise-agents-deploy/observability/prometheus/alerts.yml # SLO alertas
enterprise-agents-deploy/observability/grafana/dashboards/ # vistas operativas
enterprise-agents-deploy/observability/tempo/tempo.yaml # traces
enterprise-agents-deploy/environments/{local,staging,production}.env.example # no secrets
enterprise-agents-deploy/scripts/validate-compose.sh    # `docker compose config` por env
enterprise-agents-deploy/scripts/verify-images.sh       # verificación cosign + digest
enterprise-agents-deploy/scripts/deploy.sh              # migration→rollout→smoke
enterprise-agents-deploy/scripts/smoke-test.sh          # smoke HTTP / app
enterprise-agents-deploy/scripts/rollback.sh            # rollback version compatible
platform-ops/ansible/                                   # usuario host, hardening firewall
platform-ops/backup/                                    # pgBackRest PITR y restore drill
prod-local/scenarios/{worker-restart,nats-outage,restore-drill}.sh # fallos aislados
```

## Seguridad y supply chain

- Images pin exact digest, multi-stage, no root, read-only/tmpfs cuando soportado, `cap_drop ALL`, `no-new-privileges`, uso `secrets:` archivos, recursos limitados y escaneo Trivy. No usar latest ni incluir `.env` productivo en la imagen.
- CI PR: format/lint, TS strict, unit, DB integration, BDD, API E2E, React e2e/axe, OpenAPI diff, SAST, SCA, secrets scan, IaC/Compose scan, dependency lock audit. Release: SBOM Syft, provenance, Cosign sign/verify, staging same digest, migration con backup, smoke, revisión humana, prod mismo digest, monitor y rollback. Reportar controles que no corrieron.
- Observability: trace_id e IDs con cardinalidad controlada; nunca exportar PII, secretos, tokens, prompts o herramientas completas por defecto. Alertas por tasa de error, backlog, saturación, fallos de presupuesto y latencia p95.
- Backups cifrados 3-2-1 o equivalente, PITR WAL, destino en host/servicio **independiente** no AWS; simulación de pérdida completa de host, restauración aislada sin tools reales, RPO/RTO medidos. Un volumen Compose no es backup.
- DevSecOps threat model: IDOR/BOLA multi-tenant, SSRF, injection (SQL/prompt), malicious docs, tool privilege escalation, OAuth redirect, replay, race, supply chain, PII leaks, no arbitrary tool commands, safe defaults.
- Antes de producción: `docker compose --env-file ... -f compose/compose.yaml config --quiet` para **cada** entorno; smoke y tests dynamic. Comprobar que el Compose real no requiere imagen o servicio AWS.
