> **Extensión de arquitectura:** Knowledge e Integrations ahora separan `application/service`, `application/ports` e `infrastructure/persistence`. Nuevos módulos Notifications y worker `knowledge.main.ts`. Ver `AUDIT_EXTENSION_2026-11-07.md`.

# AgentOps — índice de arquitectura de los cinco repositorios

## Del navegador a la persistencia

`apps/enterprise-agents-web/src/app/routes.tsx` enrutará al componente propietario. Las features llaman a `src/services/http/api-client.ts` y los endpoints corresponden con los `controllers` en `apps/enterprise-agents-impl/src/modules/*/presentation/http/`. Los DTO Zod validan cuerpos y query strings antes de entrar a `application/service/`. El módulo `workflows` utiliza `application/repositories` (puertos) implementados en `infrastructure/persistence/drizzle` con ownership de tablas. PostgreSQL es la fuente autoritativa. Ningún controller debe emitir SQL directamente.

## Ciclo de ejecución real implementado

1. Crear un agente del workspace, configurarlo y publicar su versión; un runtime local de Ollama con modelo instalado es necesario para ejecutar nodos `agent`.
2. Crear un workflow borrador en React. El editor visual de nodos React Flow y su editor estructurado comparten el grafo Zod.
3. Validar aristas, transiciones, nodos, permisos sobre agentes y publicar. Una transacción guarda la versión inmutable, el evento outbox y el audit event.
4. Crear un run con una `Idempotency-Key`. El repositorio comprueba que la versión publicada pertenece al tenant.
5. El proceso `worker` reclama un run mediante PostgreSQL `FOR UPDATE SKIP LOCKED`, persiste avances y checkpoint tras cada paso, reintenta errores transitorios con límite. La cola durable real es PostgreSQL, no NATS.
6. Los nodos de aprobación detienen el run; la aprobación se vincula al hash exacto de la invocación y exige un aprobador distinto al solicitante.
7. El relay `outbox` publica eventos por NATS JetStream tras `COMMIT`. La UI muestra SSE persistido en PostgreSQL y puede reconectarse.
8. La UI ofrece runs, logs, approvals, evaluaciones exact-match, documentos textuales y uso; RAG vectorial y conectores externos completos NO están implementados.

## Distinción crítica por capas

- **Domain:** invariantes, grafos, estados, lógica pura, sin NestJS/HTTP/SQL.
- **Application:** casos de uso, comprobaciones de permisos, transacciones via ports.
- **Presentation/http:** controllers, DTO Zod, errores HTTP, Scalar y OpenAPI.
- **Infrastructure:** Drizzle, PostgreSQL, NATS, proveedor LLM local, HTTP y almacenamiento.
- **No carpetas ceremoniales:** `policies/`, `entities/`, `ports/` y `exceptions/` se crean solo por necesidades reales.

## Diseño UX/UI

React 19, Vite, Tailwind CSS 4 con tokens semánticos, UI de consola con sidebar de 11 apartados, accesibilidad básica, theme light/dark, states de loading/error/empty, feedback y validación. Las rutas `/app/agents`, `/app/workflows`, `/app/runs`, `/app/approvals`, `/app/tools`, `/app/knowledge`, `/app/evaluations`, `/app/usage`, `/app/audit` y `/app/settings/members` son implementaciones de UI. El canvas tiene un editor estructurado alternativo para usuarios que no pueden arrastrar nodos.

## Cinco repositorios sin Git artificial

- `apps/enterprise-agents-impl` — módulo NestJS, migraciones SQL, jobs, reglas y tests.
- `apps/enterprise-agents-web` — React/Tailwind, páginas por feature y tests browser.
- `enterprise-agents-deploy` — único Docker Compose por variables, proxy Caddy, Keycloak, PostgreSQL, NATS, Valkey y observabilidad opcional.
- `platform-ops` — scripts de operación de hosts y backups; NO se anuncian PITR restaurado.
- `prod-local` — laboratorio de smoke y verificación estática, pensado para la máquina del usuario.

## Sin AWS

Ni AWS, ni Kubernetes, ni Preact. Almacenamiento de objetos S3-compatible autoalojado es opcional en Compose; no implica uso de AWS. No equivale a un subsistema de objetos conectado por la API: está pendiente.
