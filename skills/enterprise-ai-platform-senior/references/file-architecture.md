# Árbol de archivos con responsabilidades y propiedad

**Estados**: F1 base; F2 agentes/workflows; F3 ejecución; F4 integraciones/aprobaciones; F5 IA/analítica; OP crear solo al surgir necesidad. Estas son estructuras objetivo, NO afirmar archivos existentes.

```text
enterprise-ai-workspace/                           # Checkout local; sin npm raíz ni contracts/ global
├── apps/                                          # Repos de aplicaciones independientes
│   ├── enterprise-agents-impl/                    # Repo Git backend owner DTO, schema, OpenAPI
│   │   ├── src/main.ts                           # F1 HTTP bootstrap y graceful shutdown
│   │   ├── src/worker.main.ts                    # F3 proceso worker Nest sin listeners HTTP
│   │   ├── src/outbox.main.ts                    # F3 relay de eventos after-commit
│   │   ├── src/app.module.ts                     # F1 registra módulos y providers
│   │   ├── src/bootstrap/http.bootstrap.ts       # F1 CORS, guards, pipes, filters, límites
│   │   ├── src/bootstrap/openapi.bootstrap.ts    # F1 OpenAPI generado y Scalar restringido
│   │   ├── src/bootstrap/telemetry.bootstrap.ts  # F1 traces inicializadas temprano
│   │   ├── src/modules/identity/                 # F1 identidad validada por OIDC
│   │   ├── src/modules/organizations/            # F1 tenants y contexto organizativo
│   │   ├── src/modules/memberships/              # F1 roles, membresías y permisos
│   │   ├── src/modules/audit/                    # F1 evento de auditoría append-only
│   │   ├── src/modules/agents/                   # F2 configs y versiones inmutables
│   │   ├── src/modules/workflows/                # F2 grafos, drafts y publishing
│   │   ├── src/modules/runs/                     # F3 estados, checkpoints y budget
│   │   ├── src/modules/tools/                    # F4 políticas y ejecución segura
│   │   ├── src/modules/approvals/                # F4 decision humana vinculada a payload
│   │   ├── src/modules/integrations/             # F4 OAuth/conexiones a servicios
│   │   ├── src/modules/knowledge/                # F5 documentos, ACL y retrieval
│   │   ├── src/modules/evaluations/              # F5 benchmarks, datasets y regresiones
│   │   ├── src/modules/usage/                    # F5 consumo, cuotas y reservas
│   │   ├── src/modules/notifications/            # F5 avisos e inbox
│   │   ├── src/shared/auth/                      # F1 guards, actor context, JWT verifier
│   │   ├── src/shared/config/                    # F1 env Zod y typed config
│   │   ├── src/shared/database/                  # F1 pool Drizzle y transactions
│   │   ├── src/shared/messaging/                 # F3 NATS, outbox, inbox
│   │   ├── src/shared/http/                      # F1 error mapping + paginator DTO
│   │   ├── src/shared/health/                    # F1 liveness y readiness
│   │   ├── src/shared/telemetry/                 # F1 logs/traces/metrics saneadas
│   │   ├── src/database/migrate.ts              # F1 CLI migraciones (no en startup HTTP)
│   │   ├── src/database/seed.ts                 # OP datos sintéticos solo local
│   │   ├── drizzle/migrations/                  # F1 SQL versionado y revisado
│   │   ├── drizzle/meta/                        # F1 snapshots Drizzle
│   │   ├── tests/integration/                   # F1 DB real/NATS/tenant
│   │   ├── tests/bdd/{features,steps,support}/  # F2+ Gherkin, steps y World
│   │   ├── tests/e2e/                           # F1 HTTP real y permisos
│   │   ├── tests/contracts/                     # F1 OpenAPI diff (tests, no contratos duplicados)
│   │   ├── tests/performance/                   # F3+ pruebas de carga con criterios
│   │   ├── docs/{architecture,adr,api,security,runbooks}/ # Decisiones, amenazas, ops
│   │   ├── scripts/export-openapi.ts            # F1 export sin escuchar puertos
│   │   ├── Dockerfile                           # F1 OCI multi-stage no-root, entrypoints
│   │   ├── .dockerignore                        # F1 excluye secretos, node_modules y tests
│   │   ├── .env.example                        # F1 nombres y valores seguros
│   │   ├── drizzle.config.ts                   # F1 kit y migraciones
│   │   ├── vitest.config.ts                    # F1 unit/integration runner
│   │   ├── cucumber.js                         # F2+ BDD runner
│   │   ├── tsconfig.json                       # F1 TS strict, no any
│   │   ├── biome.json                          # F1 lint/format
│   │   ├── pnpm-workspace.yaml                 # F1 supply-chain pnpm packages: []
│   │   ├── package.json + pnpm-lock.yaml       # F1 manifests exactos
│   │   └── AGENTS.md + README.md               # F1 reglas humanas y setup
│   └── enterprise-agents-web/                   # Repo Git React, browser-only SDK
│       ├── src/main.tsx                        # F1 bootstrap React
│       ├── src/app/providers/                  # F1 auth, query, theme, router
│       ├── src/app/router/routes.tsx           # F1 rutas con lazy + fallback
│       ├── src/app/layouts/                    # F1 app, auth, editor layouts
│       ├── src/features/                       # F1-F5 features específicas
│       ├── src/services/http/api-client.ts     # F1 transport y errores
│       ├── src/services/contracts/generated/   # F1 browser-safe SDK OpenAPI (generado)
│       ├── src/services/realtime/              # F3 SSE y resume
│       ├── src/libs/ui/                        # F1 primitives sin dominio
│       ├── src/styles/{globals,tokens,themes,typography}.css # Tailwind4 y tokens
│       ├── tests/{e2e,accessibility,visual,fixtures}/ # Playwright y axe
│       ├── docs/{design-system,user-flows,accessibility}/ # UX decisiones y pruebas
│       ├── index.html                          # F1 HTML entrada y metadata
│       ├── vite.config.ts                      # F1 build y Tailwind plugin
│       ├── vitest.config.ts                    # F1 component tests
│       ├── playwright.config.ts                # F1 browser E2E config
│       ├── Dockerfile                          # F1 build Vite a imagen web
│       ├── tsconfig.json + biome.json          # F1 TypeScript/lint
│       ├── package.json + pnpm-lock.yaml       # F1 versiones específicas
│       └── AGENTS.md + README.md               # F1 normas y setup
├── enterprise-agents-deploy/                    # Repo Git producto/infra Compose
│   ├── compose/compose.yaml                    # ÚNICO compose local/staging/prod
│   ├── compose/Caddyfile                       # TLS, API REST, SSE y frontend
│   ├── compose/config/{nats,valkey,otel-collector}.* # Broker/cache/traces
│   ├── observability/{prometheus,grafana,tempo}/ # SLO y dashboards específicos
│   ├── environments/{local,staging,production}.env.example # Variables no secretas
│   ├── scripts/{validate-compose,verify-images,deploy,smoke-test,rollback}.sh # Gates
│   └── .github/workflows/ + README.md          # CI y operación
├── platform-ops/                                # Repo Git reutilizable, sin nombres de negocio
│   ├── ansible/{inventory,playbooks,roles}/     # Hardening, redes, runtime host
│   ├── backup/                                  # pgBackRest, PITR, restore verification
│   ├── security/                                # Acceso host y políticas generales
│   └── docs/runbooks/                           # DR y respuesta a incidente
└── prod-local/                                  # Repo Git laboratorio aislado
    ├── scripts/{up,verify,down}.sh              # Arranca un solo Compose por referencia
    ├── scenarios/                              # NATS outage, worker restart, restore
    ├── tests/{smoke,resilience,security,performance}/ # Evidencia dinámica
    └── fixtures/                               # Datos sintéticos, nunca credenciales reales
```

## Estructura de módulo ejemplar: workflows

```text
src/modules/workflows/
├── domain/schemas/workflow.schema.ts                      # Campos del modelo y estados Zod
├── domain/schemas/workflow-graph.schema.ts                # Nodos/edges permitidos
├── domain/entities/workflow.entity.ts                     # OP invariantes de edición/publicación
├── domain/policies/workflow-publication.policy.ts         # OP valida topología, condiciones, límites
├── domain/events/workflow-published.event.ts              # OP hecho de dominio inmutable
├── domain/exceptions/invalid-workflow-state.error.ts      # OP error independiente de HTTP
├── application/service/create-workflow.service.ts         # actor+tenant, draft inicial
├── application/service/update-workflow.service.ts         # permisos, optimistic revision, save
├── application/service/validate-workflow.service.ts       # valida nodos/aristas; errores localizables
├── application/service/publish-workflow.service.ts        # permisos, versión+outbox atómicos
├── application/service/get-workflow.service.ts            # lectura autorizada del recurso
├── application/service/list-workflows.service.ts          # filtros estables por tenant
├── application/repositories/workflow.repository.interface.ts # puerto sin Drizzle
├── application/ports/workflow-unit-of-work.port.ts         # OP frontera transaccional
├── application/types/workflow-search-criteria.type.ts     # filtros independientes de HTTP
├── presentation/http/controllers/workflow.controller.ts   # rutas y delegación (sin business SQL)
├── presentation/http/dto/create-workflow.request.dto.ts   # Zod request + tipo inferido
├── presentation/http/dto/update-workflow.request.dto.ts   # Zod revisión/campos editables
├── presentation/http/dto/list-workflows.query.dto.ts      # Zod limit/offset/filtros
├── presentation/http/dto/workflow.response.dto.ts         # Zod proyección segura
├── presentation/http/dto/workflow-list.response.dto.ts    # {count,next,previous,results}
├── presentation/http/docs/workflow.doc.ts                 # OP adaptador OpenAPI sin duplicación
├── presentation/http/presenters/workflow.presenter.ts     # OP map a DTO seguro
├── infrastructure/persistence/drizzle/workflow.table.ts   # schema SQL/FK/indexes
├── infrastructure/persistence/drizzle/workflow-version.table.ts # versiones inmutables
├── infrastructure/persistence/drizzle/workflow.repository.ts # adapter Drizzle tenant-safe
├── infrastructure/messaging/workflow-outbox.adapter.ts    # OP registra evento en tx
├── tests/workflow.entity.test.ts                          # transiciones
├── tests/publish-workflow.service.test.ts                 # permisos/outbox/conflictos
├── tests/workflow.repository.int.test.ts                  # PG real/tenant
└── workflows.module.ts                                   # DI tokens, services y controller
```

El resto de bounded contexts (identity, organizations, memberships, agents, runs, tools, approvals, integrations, knowledge, evaluations, usage, audit, notifications) siguen patrón **sin clonar carpetas ceremoniales**; ver `backend-domain-data.md`.
