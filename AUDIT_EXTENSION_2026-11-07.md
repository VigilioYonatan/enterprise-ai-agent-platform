# Auditoría de extensión de AgentOps — 2026-11-07

**Dictamen: ENTREGA PARCIAL / NO VERIFICABLE COMO RELEASE.** Esta versión amplía sustancialmente código real, pero no supera un release gate de producción. El peso del ZIP no es una prueba de completitud. Los controles `PASS` indicados son específicos de la parte observada.

## Matriz de requisitos obligatorios

| ID | Requisito | Prioridad | Implementación localizada | Evidencia aplicable | Estado |
|---|---|---|---|---|---|
| R-001 | Cinco repositorios independientes | Alta | `apps/`, `enterprise-agents-deploy/`, `platform-ops/`, `prod-local/` | Inventario de archivos | VERIFICADO (estructura) |
| R-002 | NestJS API con módulos DDD y DTO Zod | Alta | `apps/enterprise-agents-impl/src/modules/` | AST/imports + inspección, falta TypeScript/build | NO VERIFICABLE (runtime) |
| R-003 | UI React/Tailwind conectada | Alta | `apps/enterprise-agents-web/src/features/`, `src/app/routes.tsx` | AST y rutas; sin navegador Playwright | NO VERIFICABLE |
| R-004 | Versionado inmutable de agentes/workflows | Alta | módulos Agents/Workflows + migraciones `0004`, `0005` | Revisión estática; faltan tests DB/race | NO VERIFICABLE |
| R-005 | Runs y workers durables | Bloqueante | `src/worker.main.ts`, Runs, migraciones `0002`, `0012` | Revisión de fencing/lease; integración PG no ejecutada | NO VERIFICABLE |
| R-006 | Idempotencia de requests y efectos de tools | Bloqueante | `runs/infrastructure/.../run.repository.ts`, `worker.main.ts` | Reglas puras OK; efectos externos no garantizados con crash remoto | INCOMPLETO |
| R-007 | Aprobación humana y separación de funciones | Alta | `approvals.service.ts`, `worker.main.ts`, React Approvals | Inspección y pruebas puras, E2E pendiente | NO VERIFICABLE |
| R-008 | RAG semántico y lexical local con ACL documento | Alta | Knowledge module; `knowledge.main.ts`; `0009_knowledge_hybrid_acl.sql` | Chunking offline PASS; ACL integración sin PostgreSQL | NO VERIFICABLE |
| R-009 | Subida avanzada de archivos, PDF, antivirus y S3 operativo | Alta | Solo importación de TXT/MD/CSV <=16 KB, `KnowledgePage` | Inspección | INCOMPLETO |
| R-010 | OAuth 2 PKCE para conectores autoalojados | Alta | Integrations domain/application/infrastructure; `0010_oauth_connections.sql` | AES-GCM offline PASS; proveedor externo no probado | NO VERIFICABLE |
| R-011 | Integraciones reales con múltiples proveedores y secretos rotables | Alta | Conector genérico configurado por operador, tool read-only fijo | Revisión de alcance: no revocación externa confirmada | INCOMPLETO |
| R-012 | Aislamiento multitenant/ACL | Bloqueante | Org guards, repos Knowledge, roles, pertenencia | Test PG ACL incluido pero no ejecutado; sin RLS probado | NO VERIFICABLE |
| R-013 | Evaluaciones fijadas a versión de agente/modelo | Alta | `0011_evaluation_pin.sql`, `evaluation.main.ts` | Revisión SQL y test score pura | NO VERIFICABLE |
| R-014 | Notificaciones persistentes | Alta | Notifications module; `0013_notifications.sql`; React Notifications | Rutas y esquema estáticos | NO VERIFICABLE |
| R-015 | Un Docker Compose autoalojado, sin AWS/Kubernetes | Alta | `enterprise-agents-deploy/compose/compose.yaml` | YAML strict + scripts estáticos PASS; Docker no instalado | NO VERIFICABLE (runtime) |
| R-016 | Dependencias y builds reproducibles | Bloqueante | package.json, Dockerfiles, `scripts/generate-lockfiles.sh` | Faltan dos package-lock.json; npm offline devuelve ENOTCACHED | INCOMPLETO |
| R-017 | DevSecOps CI/SAST/SCA/secrets/SBOM/firmas | Bloqueante | `enterprise-agents-deploy/scripts/security-gate.sh`, `verify-release-image.sh` | Gates fail-closed redactados; sin herramientas/runtime | NO VERIFICABLE |
| R-018 | Backup PostgreSQL restaurado y PITR | Alta | `platform-ops/scripts/verify-logical-restore.sh` y docs pgBackRest | Script sin ejecutar; PITR todavía no implementado | INCOMPLETO |
| R-019 | Identidad OIDC endurecida para producción | Bloqueante | Keycloak local start-dev + JWT guards | Sin TLS público ni test de hardening productivo; OIDC browser sin BFF | INCOMPLETO |
| R-020 | Tests BDD, API E2E, browser, seguridad y resiliencia | Bloqueante | `tests/`, `prod-local/`; BDD de Knowledge y workflows | Solo tests puros offline; suites integración/E2E no ejecutadas | INCOMPLETO |
| R-021 | Observabilidad con dashboards y alertas reales | Media | Prometheus/Grafana/Tempo/OTel en Compose | Runtime y trazas distribuídas no verificados | NO VERIFICABLE |
| R-022 | Documentación API Scalar/OpenAPI y SDK tipos | Alta | API Swagger + Scalar + cliente React manual | Sin export build; frontend tipos no totalmente generados | INCOMPLETO |
| R-023 | Arquitectura de frontend accesible WCAG 2.2 | Alta | UI + editor estructurado + pruebas Playwright | Solo lectura; auditoría automática/manual no ejecutada | NO VERIFICABLE |
| R-024 | ZIP íntegro, extraído y examinado | Alta | Manifiestos y scripts de auditoría | Se evalúa sobre el ZIP final; ver `ZIP_EXTENSION_AUDIT.md` | VERIFICADO (siempre que pase validación final) |

## Mejoras concretas incorporadas sobre el ZIP revisado anterior

- **Knowledge**: RAG local híbrido de pgvector y FTS con fusión RRF, embeddings de Ollama, fuente/versionado de chunks, indexador durable, ACL obligatoria por documento, permisos para compartir lectura, reindexación, citas y una pantalla de consulta conectada.
- **Integrations**: servicio de OAuth 2.0 con PKCE y estados consumibles una vez, token cifrado AES-256-GCM con clave fuera del repositorio, conexión por actor/tenant, refresh y un conector de lectura de perfil con URL fija del operador y aprobación humana.
- **Executions/evaluations**: fencing por lease token en runs y evaluaciones, versión/modelo de evaluación fijados, deduplicación de registros de uso por paso y eventos de expiración condicionados al estado real.
- **Notifications**: tabla, port, servicio, repositorio SQL, controller, eventos de aprobación y resultado, bandeja React con marcar leído.
- **DevSecOps**: Compose profile `llm` para indexador, secretos como archivos montados, verificadores YAML estrictos y de wiring, script de lockfiles auténticos, gates de dependencias/secretos/SBOM, firma OCI y ensayo lógico de restauración controlado.
- **Testing**: archivos de prueba de chunking, criptografía OAuth, ACL PostgreSQL y escenarios BDD. Un test presente no implica test ejecutado.

## Pruebas y evidencias observadas

- `node scripts/test_pure_rules.cjs` → PASS, 14 assertions offline preexistentes.
- `node /mnt/data/agentops-work/offline_smoke.cjs` → PASS, chunking y AES-GCM OAuth (script de auditoría externo al paquete).
- `python scripts/check-contract-wiring.py` → PASS de rutas/archivos/contextos Compose (estático).
- `python enterprise-agents-deploy/scripts/check-compose-security.py` → PASS (19 servicios Compose, YAML seguro estático).
- `python prod-local/scripts/validate-static.py` → PASS (realm/configuración y archivos).
- `node scripts/audit_ts_imports.cjs apps` → resultado y números finales en `audit/TS_IMPORT_AUDIT.json`.
- `python scripts/audit_every_file.py` → inventario por bytes y formato; no certifica semántica.
- `npm install --package-lock-only --offline` → **FAIL (ENOTCACHED)**, falta caché de paquetes; no se inventaron lockfiles.
- Docker Compose runtime, Postgres, Keycloak, Ollama, E2E/BDD, Playwright, SAST/SCA, imagen firmada, PITR → **NOT_RUN** (sin herramientas y/o dependencias). 

## Defectos adicionales hallados y corregidos en esta extensión

- `PostgresKnowledgeRepository` ahora declara su port y devuelve `reindex` con tipo explícito.
- Drizzle `usageRecords` ahora refleja `node_id` utilizado para deduplicación.
- `IntegrationsService.providers` verifica que exista el archivo de la clave de cifrado, no solo endpoints OAuth.
- El comando Gitleaks ahora usa `dir`, apto para entregas sin historial Git.
- Expiración de aprobación no publica `approval.expired` para un run que ya no puede cancelar.

## P0/P1 que siguen impidiendo aprobar producción

1. No se han generado lockfiles reales ni ejecutado compilación TypeScript con node_modules.
2. No se han ejecutado migraciones, tests de aislamiento PG, Playwright ni recuperación. Los Dockerfiles ahora exigen `npm ci` y, sin lockfiles reales, fallarán deliberadamente antes de iniciar.
3. Sin RAG de archivos grandes/PDF con procesamiento aislado, antivirus y almacenamiento persistente completo.
4. Sin OAuth de proveedor específico, revocación externa garantizada ni rotación de claves.
5. El entorno OIDC Keycloak está configurado solo para desarrollo; endurecer TLS, cookies y políticas para producción.
6. Sin prueba end-to-end de idempotencia de efectos externos tras fallo, ni aislamiento de ejecución arbitraria por sandbox.
7. El pipeline de supply-chain no tiene ejecuciones verificadas, y las imágenes no están fijadas por digest publicado.
8. No hay PITR probado, restore drill real, ni evaluación independiente de WCAG.

**Decisión: NO APROBADO para release de producción.** Se entrega una ampliación real del código fuente y un procedimiento reproducible de revalidación; nunca se interpreta auditoría estática como compilación o pruebas de operación.
