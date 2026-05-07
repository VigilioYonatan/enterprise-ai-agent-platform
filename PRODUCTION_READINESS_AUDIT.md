# AUDITORÍA DE PRODUCCIÓN — AgentOps Enterprise (Senior/Staff)

**Dictamen final de esta revisión: NO APROBADO / entrega parcial de código fuente.** Se ha corregido código, CI y configuración, pero no se dispone de Node 24 (el entorno tiene Node 22), acceso a npm registry, Docker, PostgreSQL/NATS/Keycloak activos, navegadores E2E, `promtool`/`amtool`, Syft/Trivy/Gitleaks/Cosign ni credenciales/proveedor de alertas real. Ninguna comprobación estática justifica certificar producción.

## Arquitectura inspeccionada

- Backend NestJS 11 y TypeScript 6, modular monolith: `identity`, `organizations`, `memberships`, `agents`, `workflows`, `runs`, `tools`, `approvals`, `integrations`, `knowledge`, `evaluations`, `usage`, `audit`, `notifications`. La mayoría de módulos contienen servicios, DTOs HTTP, Drizzle y/o repositorios; **no todos cumplen DDD por capas** (servicios `Organizations`, `Memberships`, `Evaluations`, `Notifications` aún usan Drizzle directamente). `agents`, `workflows`, `runs`, `knowledge`, `integrations` y **approvals ahora** utilizan puertos/adapters de infraestructura para sus persistencias principales.
- Frontend React 19, Vite 8, Tailwind 4, UI feature-first y componentes reutilizables. Biome configurado en ambos repositorios; **sin binario Biome ni ejecución de check/formato**, no se certifica conformidad. Hay contratos HTTP TypeScript manuales; SDK generado desde OpenAPI pendiente.
- PostgreSQL16/pgvector con 13 migraciones, eventos outbox, NATS JetStream, leasing de workers y aprobaciones vinculadas a runs. **No probada** concurrencia ni entrega al menos una vez con contenedores reales.
- Docker Compose único, 21 servicios incluyendo perfiles, 3 redes, 5 procesos backend desde la misma imagen, Keycloak y Caddy; modos local/prod diferenciados. La revisión YAML y controles estáticos se ejecutan; Compose runtime no.
- Observabilidad: métricas HTTP + cola/outbox, Prometheus recording/alerting rules, Alertmanager, blackbox, Grafana, Tempo, Collector, runbooks. **Sin trazas end-to-end exportadas por Node/worker, sin receptor real de Alertmanager ni ensayo de alertas**, no se declara funcional.
- Sin AWS/Kubernetes, S3 local compatible solo en perfil storage; escaneo malware/PDF/Object Storage integrado al circuito completo no terminado.

## Matriz de requisitos y release gates

| ID | Requisito | Implementación / referencias | Método de verificación | Estado |
|---|---|---|---|---|
| R01 | Estructura 5 repositorios, skills conservadas | `apps/`, `enterprise-agents-deploy/`, `platform-ops/`, `prod-local/`, `skills/` | Inventario completo + extract ZIP | VERIFICADO estructural |
| R02 | Sintaxis TS e imports locales | `apps/*/{src,tests}`, auditor en `scripts/audit_ts_imports.cjs` | Parser TS global + imports | VERIFICADO estático, NO typecheck |
| R03 | Controllers y DTOs Zod, OpenAPI/Scalar | `src/modules/*/presentation/http`, `src/bootstrap/openapi.bootstrap.ts` | Parse AST/OpenAPI real | Parcial: OpenAPI runtime NOT_RUN |
| R04 | DDD Drizzle / casos de uso aislados | módulos agentes/workflows/runs/knowledge/integrations/approvals | Auditoría de imports y Vitest | Parcial: deuda DDD en algunos módulos |
| R05 | PostgreSQL, migraciones, pgvector, tenant/ACL | `src/database/`, `migrations/`, tests DB | PostgreSQL real, constraints y tenant e2e | NO VERIFICABLE en este entorno |
| R06 | Ejecución durable, idempotencia, outbox, NATS | `src/modules/runs`, `src/shared/messaging`, `worker.main.ts` | Integration + chaos NATS + concurrency | NO VERIFICABLE en este entorno |
| R07 | Human approvals y separación 4-eyes | `approvals.service.ts`, Drizzle adapter, `approval-application.test.ts` | Unit + Postgres parallel decision | Código implementado; test runtime NOT_RUN |
| R08 | React UI y workflow builder + Tailwind | `apps/enterprise-agents-web/src/` | Browser + visual + WCAG manual | Código revisado; E2E NOT_RUN |
| R09 | Biome TS y CSS / formato | `apps/*/biome.json`, scripts npm | `npm run lint` + `npm run format` | NO VERIFICABLE (Biome no instalado) |
| R10 | Unit / coverage backend + web | `tests/*.test.ts`, `src/**/*.test.tsx`, Vitest configs | `npm run test:unit`, coverage | NO VERIFICABLE (dependencias ausentes) |
| R11 | BDD Cucumber | `tests/bdd/{*.feature,*.steps.cjs}` | `npm run test:bdd` | NO VERIFICABLE (Cucumber no instalado) |
| R12 | API E2E / tenant isolation | `tests/e2e/`, `tests/integration/` | HTTP+PostgreSQL vivo | NO VERIFICABLE |
| R13 | React Playwright E2E + axe | `tests/e2e`, `tests/accessibility`, `playwright.config.ts` | Chromium + verified Keycloak creds | NO VERIFICABLE |
| R14 | Docker Compose 21 servicios + redes | `enterprise-agents-deploy/compose/compose.yaml` | YAML/Python y `docker compose config` | YAML verificado; runtime NOT_RUN |
| R15 | Keycloak producción, TLS, secretos | Caddyfile, Keycloak realm-init, scripts secretos | Login de producción, TLS, secrets audit | NO VERIFICABLE; realm Mailpit y operadores pendientes |
| R16 | Observabilidad end-to-end | `compose/observability`, `shared/telemetry/` | `promtool`, traces, alert fire drill | INCOMPLETO: OTel runtime / receiver real |
| R17 | DevSecOps CI/CD y supply chain | `.github/workflows`, scripts security-gate, release gates | npm/SAST/SCA/SBOM/sign/OCI scan | NO VERIFICABLE; no credenciales/scanners/locks |
| R18 | PITR backups y restauración aislada | `platform-ops/`, `prod-local/` | restore + medir RPO/RTO | INCOMPLETO/NOT_RUN |
| R19 | Escaneo de PDF/artefactos grandes y malware | Knowledge/S3 local | end-to-end OCR+antivirus+ACL | INCOMPLETO |
| R20 | OAuth externo en proveedor real | Integrations PKCE+AES-GCM | flujos redirect/revoke/scopes con proveedor | NO VERIFICABLE; ajustes de proveedor pendientes |
| R21 | OpenAPI SDK generado para web | `apps/enterprise-agents-web` | Generación/compatibility diff | INCOMPLETO: tipos HTTP manuales |
| R22 | Lockfiles/npm reproducible + Node LTS | Dockerfiles `npm ci`, scripts generate-lockfiles | `npm ci` y TypeScript/build ambos | BLOQUEANTE: faltan locks auténticos |
| R23 | ZIP integridad, manifiesto, extracción | `CHECKSUMS.sha256`, `audit/`, ZIP | ZIP CRC, hashes y auditoría del extraído | VERIFICABLE tras paquete final |

## Riesgos P0/P1 pendientes — NO APROBAR

1. **P0 funcional de release:** las builds no son reproducibles sin auténticos `package-lock.json` ni dependencias instaladas; ejecutar `generate-lockfiles.sh` en Node24 conectado y revisar. Los tests reales NUNCA han corrido en esta sesión.
2. **P1 seguridad:** mismo broker/DB/Keycloak requieren pruebas de ACL, JWT, roles, cross-tenant y aislamiento real, más credenciales operativas y secretos con permisos verificables.
3. **P1 SRE:** cobertura de trazas OTel faltante, alerta con `unconfigured-receiver` a propósito para bloquear release, restore PITR+WAL no probado, SLO/fire-drill pendiente.
4. **P1 data/AI:** ingesta PDF/escaneo, embeddings y permisos RAG de extremo a extremo sin verificación; tool sandbox de ejecución arbitraria no disponible (se limita a allowlist); OAuth provider real no integrado ni probado.
5. **P1 compatibilidad:** `openapi:export` y SDK no ejecutados, frontend tipa respuestas manualmente; posible drift; no declarar contract-tests aprobados.
6. **P1 deuda de arquitectura:** algunos servicios de application aún contienen consultas Drizzle y no cumplen completamente el patrón de ports/repositories de las skills; requiere refactor incremental con test de regresión.
7. **P1 supply chain:** imágenes de Compose siguen en tags para DEV; producción debe configurar digests OCI, firmas y SBOM verificadas, con un pipeline de promoción y release evidence firmada.

## Correcciones realizadas en la presente revisión

- Añadidos Biome y Vitest/coverage en ambas aplicaciones; Playwright + axe tests, BDD de transiciones y aprobaciones, API E2E y controles de esquema Postgres.
- CI real `npm ci` + Biome + unit + coverage + build + BDD + integración PG, sin declarar ejecución local inexistente. Playwright en staging requiere URL y usuario reales.
- Compose consolidado: secretos por archivos, Keycloak prod no `start-dev`, Caddy same-origin y CSP frontend; migración explícita, 3 redes, nonroot y permisos mínimos donde corresponde.
- Prometheus/Alertmanager/Grafana/Tempo, métricas HTTP y outbox y reglas promtool, fire-drill pendiente.
- Migraciones con checksum bajo lock; `api` no migrará schema silenciosamente al arrancar.
- Auth y cambios de agentes separados de Drizzle; **ApprovalsService ahora es aplicación pura respecto a SQL**, usa puerto + adapter Drizzle que actualiza run/aprobación/auditoría/outbox atómicamente y revalida condiciones con lock.
- Nuevos tests unitarios de cuatro ojos; no ejecutados por falta de dependencias.
- Documentación de arranque, README, release gate con manifiesto firmado en lugar de `.PASS` trivial, y gates CI/seguridad que fallan si faltan herramientas y evidencias.

## No confundir niveles de evidencia

- **Estructural:** archivo existe y ZIP íntegro. No equivale a código correcto.
- **Estático:** parse/imports/YAML/scripts y pruebas puras offline (solo invariantes), no equivale a `tsc` ni Compose.
- **Runtime:** instalaciones reproducibles, build, Vitest, Cucumber, Playwright, PostgreSQL, Keycloak, NATS, OTel, restore. **No ejecutados**.
- **Producción:** solo después de gates reales, imágenes firmadas, alertas verificadas, backups/restores y autorización de cambio. **Bloqueado**.

Ver `PRODUCTION_VALIDATION_RESULT.md` para las salidas observadas, y `enterprise-agents-deploy/docs/RELEASE_GATES.md` para instrucciones reproducibles. No se incluyeron secretos, .env reales, node_modules, imágenes ni datos ficticios de carga.
