> **Extensión de API implementada:** `GET/POST /api/v1/knowledge-bases`, `GET/POST /api/v1/documents`, `POST /api/v1/knowledge-searches`, `POST/DELETE /api/v1/documents/:id/grants`, `POST /api/v1/documents/:id/reindex`, `GET /api/v1/integrations`, `GET/POST /api/v1/integration-connections`, `GET /api/v1/integrations/oauth/callback`, `DELETE /api/v1/integration-connections/:id`, `GET/PATCH /api/v1/notifications`. Ver fuentes de los controllers.

# API implementada y contrato pendiente

Base `/api/v1`. Los endpoints listados abajo son los que se implementan en este ZIP. Requieren bearer JWT Keycloak excepto health y documentación local.

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/v1/me` | sí | Perfil JWT validado, subject y email |
| GET | `/api/v1/organizations` | sí | Organizaciones del actor |
| POST | `/api/v1/organizations` | sí | Crear organización y membresía owner atómica |
| GET | `/api/v1/agents?organization_id=` | sí + miembro | Listar agentes |
| POST | `/api/v1/agents` | sí + miembro | Crear agente draft |
| POST | `/api/v1/agents/:id/chat` | sí + miembro | Inferencia local Ollama opcional (modelo descargado manualmente) |
| GET | `/api/v1/workflows?organization_id=` | sí + miembro | Listar con `{count,next,previous,results}` |
| POST | `/api/v1/workflows` | sí + miembro | Crear workflow draft |
| GET | `/api/v1/workflows/:id?organization_id=` | sí + miembro | Obtener detalle |
| PATCH | `/api/v1/workflows/:id?organization_id=` | sí + owner | Editar nombre/grafo con `If-Match` revisión (conflicto 409) |
| GET | `/health/live` | no | Salud del proceso |
| GET | `/openapi.json`, `/reference` | local solamente | OpenAPI/Scalar |

**Pendientes**: publicar versiones, ejecuciones/Runs/SSE, tools, approvals, integrations, knowledge, evals, usage, audit y notificaciones. Sus especificaciones objetivo constan en la SuperSkill; todavía NO hay controllers.

## Errores

Nest responde status HTTP y mensaje sanitizado. El contrato homogéneo `code,message,status,trace_id` y el diff OpenAPI son un gate futuro, no una afirmación actual.
