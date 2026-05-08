# Contrato del proyecto y matriz de cobertura

## Arquitectura y ownership

- Cinco repos independientes coordinados por carpeta; no monorepo npm.
- `presentation/http/`: controller, Zod DTO y docs HTTP; `application/service/` coordina; `application/repositories/` declara ports; `infrastructure/persistence/drizzle` implementa; `domain/` contiene reglas puras.
- `errors/` y `policies/` solo se crean si hay reglas reales; archivos de dominio nunca importan Nest.
- API REST `api/v1`, snake_case JSON, paginación `count,next,previous,results`; Scalar es UI de OpenAPI y no autoridad del esquema.
- Autenticación por Keycloak OAuth 2.0/OIDC (Authorization Code + PKCE) con brokering Google/Facebook; cuenta local y restablecimiento por Keycloak, correo local Mailpit.
- Tenancy: claims OAuth no conceden acceso a un tenant; membership DB verifica la autorización. Create org crea dueño automáticamente en transacción.
- Docker Compose solo; sin AWS, Kubernetes, Preact. Keycloak y almacenamiento S3-compatible son servicios autoalojados.

## Implementado en este ZIP

Backend: Nest, AuthGuard JWKS, `GET /api/v1/me`, organizaciones crear/listar, agentes crear/listar/chat local Ollama opcional, workflows crear/listar/consultar/editar con optimista `If-Match`, PostgreSQL Drizzle y schema, Zod en controllers, swagger/Scalar local, health. Frontend: login/logout OIDC PKCE, callback, dashboard, workspace selector, agentes, workflows + editor estructurado, design system mínimo Tailwind, estados de error/loading. Compose: web, api, postgres, Keycloak, mailpit, valkey, nats, caddy. Tests: Vitest de dominio, ejemplo Gherkin, Python de verificación de archivos/compose.

## Fuera del alcance implementado (pendiente explícito)

- Worker real JetStream, outbox/inbox, checkpoints, retries y cancelación.
- Ejecución de herramientas, aprobaciones humanas, OAuth real con redes de Google/Facebook.
- Migraciones expand/contract probadas, PITR/restore probado, observabilidad completa, scans CI y firma de imágenes.
- E2E Playwright/BDD runnable, métricas y presupuesto IA, RAG, cargas, auditoría inmutable.
- BFF HttpOnly/CSRF en sustitución de tokens SPA.

## Definition of Done antes de producción

Compilación/tsc, instalación con lockfiles válidos, Vitest, integración PostgreSQL real, Cucumber, E2E Playwright, proveedor Keycloak HTTPS, SMTP real, token renewal y revocación, pruebas cross-tenant, SSRF para tools, SCA/SAST/SBOM, firma OCI, restore PITR, staging smoke y release por digest.

Optional storage/observability profiles have Compose services and minimal configurations, but application-level metrics, OTel instrumentation and object storage ports are **not implemented**.
