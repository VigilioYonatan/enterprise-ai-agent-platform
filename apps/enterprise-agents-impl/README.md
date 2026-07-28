# AgentOps Backend · NestJS 11 / TypeScript 6 / Drizzle

Backend del monolito modular. Los procesos `api`, `worker`, `evaluator`, `knowledge-indexer` y `outbox` comparten una imagen, pero usan comandos separados. Arquitectura por módulos: `domain` (invariantes), `application/service` (casos de uso), `application/repositories` (ports), `presentation/http` (controllers y DTOs Zod), `infrastructure/persistence/drizzle` (SQL, transacciones y adaptadores).

## Requisitos

Node 24.22.2, npm, npm registry y **package-lock.json auténtico**. No se incluye un lockfile fabricado. Dockerfiles y CI requieren `npm ci` y no ejecutan migraciones al iniciar API. PostgreSQL 16 + pgvector, Keycloak OIDC y NATS son autoalojados.

```bash
npm ci
npm run lint
npm run typecheck
npm run build
npm run test:unit
npm run test:coverage
npm run test:bdd
DATABASE_URL_TEST=postgres://... npm run test:integration
E2E_API_BASE_URL=http://localhost:3000 npm run test:e2e:api
npm run openapi:export
```

Los tests de integración **requieren PostgreSQL real migrado**, BDD compila reglas reales, E2E requiere un HTTP server real; ninguno puede reemplazarse por datos falsos. El cliente web debe generarse desde OpenAPI (pendiente real hasta ejecutar generador compatible). Se deben revalidar las dependencias y sus firmas con npm/SCA antes de desplegar.

**Alcance no aprobado:** integraciones OAuth externas, cancelación/reconciliación de efectos irreversibles, PDF/RAG full ingestion, OpenTelemetry tracing completo por worker, controles completos de producción, pruebas de carga y recuperación; ver informe raíz.
