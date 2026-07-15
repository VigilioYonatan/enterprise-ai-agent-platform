# APIs, DTOs y operación HTTP

Todos los endpoints privados usan prefijo `/api/v1`; `{id}` es UUID autorizado por tenant/recurso. `GET` lectura, `POST` creación/acción, `PATCH` actualización parcial, `DELETE` revocación. Para mutaciones críticas idempotency key; escritura concurrente `If-Match`, `409/412` según contrato. Códigos `401`, `403`, `404` antienumeración, `409`, `422`, `429` y `5xx` sin fugas; `trace_id` observable sin PII.

| Contexto | Endpoints | Reglas |
|---|---|---|
| Identity | `GET /me` | Claims OIDC firmados; no secrets en perfil |
| Organizations | `GET,POST /organizations`; `GET,PATCH /organizations/{id}` | Owner y pertenencia verificados |
| Memberships | `GET /memberships`; `POST /member-invitations`; `PATCH,DELETE /memberships/{id}` | No escalación ni eliminación último owner |
| Agents | `GET,POST /agents`; `GET,PATCH /agents/{id}`; `POST /agents/{id}/publish`; `GET /agents/{id}/versions`; `POST /agents/{id}/archive` | Versiones inmutables, secretos ocultos |
| Workflows | `GET,POST /workflows`; `GET,PATCH /workflows/{id}`; `POST /workflows/{id}/validate`; `POST /workflows/{id}/publish`; `GET /workflows/{id}/versions`; `POST /workflows/{id}/archive` | Grapho válido, concurrencia optimista, outbox atómico |
| Runs | `GET,POST /runs`; `GET /runs/{id}`; `GET /runs/{id}/steps`; `GET /runs/{id}/events` SSE; `POST /runs/{id}/cancel`; `POST /runs/{id}/resume` | Run anclado a versión, cancelación best-effort, SSE autorizado |
| Tools | `GET /tools`; `GET /tools/{id}`; `GET /tool-executions` | Sin tool arbitrary invoke, política/allowlist/sandbox |
| Integrations | `GET /integrations`; `GET,POST /integration-connections`; `DELETE /integration-connections/{id}` | OAuth state/PKCE, secretos fuera de respuesta |
| Approvals | `GET /approvals`; `GET /approvals/{id}`; `POST /approvals/{id}/approve`; `POST /approvals/{id}/reject` | Hash del payload y TTL; actor cualificado |
| Knowledge | `GET,POST /knowledge-bases`; `GET /documents`; `POST /document-uploads`; `GET /documents/{id}`; `POST /knowledge-searches` | ACL documento/usuario; ingesta segura |
| Evals | `GET,POST /evaluation-suites`; `POST /evaluation-runs`; `GET /evaluation-runs/{id}` | Dataset versionado; regression gates |
| Usage | `GET /usage`; `GET /budgets`; `PATCH /budgets/{id}` | Reserva atómica de presupuesto |
| Audit | `GET /audit-events` | Lectura restringida, append-only |
| Notifications | `GET /notifications`; `PATCH /notifications/{id}` | Usuario destinatario y tenant |

**Endpoints operativos fuera de API v1:** `/health/live`, `/health/ready`, `/openapi.json` y `/reference` solo en entornos autorizados, `/metrics` solo red interna.

### Flujo de contratos

`domain/schemas/*.schema.ts` (schema propietario) → `presentation/http/dto/*.dto.ts` (Zod ejecutable + tipo `z.input`/`z.output`) → pipe Nest → `OpenAPI` generado → `Scalar` interfaz → SDK browser-safe generado en `web/src/services/contracts/generated/` (no editar, no importar clases Nest). No `validators/` paralelos. Respuesta paginada `{count,next,previous,results}` con links seguros del mismo tenant. `schema.pick()` no reemplaza invocar Zod/pipe en runtime.

**Example salida error** `{ "code":"WORKFLOW_REVISION_CONFLICT", "message":"El workflow fue modificado", "status":409, "trace_id":"..." }`. Logs sanitizados. Compatibilidad OpenAPI diff en CI y operación `operationId` estable.

### Esquema de seguridad de SSE

`GET /runs/{id}/events`: actor+tenant verificados en la conexión, cursor de eventos con autorización en replay, heartbeats, `Last-Event-ID`/token de cursor validado, reconexión acotada; no transmitir prompts, credenciales o resultados clasificados sin su política. Si autenticación por cookies, aplicar SameSite/CSRF según flujo; EventSource nativo no permite añadir Authorization header arbitrario: seleccionar sesión cookie segura o cliente de streaming compatible y documentarlo en ADR.
