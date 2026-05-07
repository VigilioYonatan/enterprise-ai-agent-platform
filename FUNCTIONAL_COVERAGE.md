> **Actualización:** la auditoría de extensión actual se encuentra en [`AUDIT_EXTENSION_2026-11-07.md`](AUDIT_EXTENSION_2026-11-07.md). RAG híbrido y OAuth genérico han sido implementados parcialmente en código; cualquier declaración previa que indicase ausencia completa de esos módulos ya no es vigente.

# Funcionalidad y estado de cobertura

| Capacidad | Estado en fuente | Prueba externa |
|---|---|---|
| OIDC Keycloak JWT JWKS + React PKCE | Implementada en código | NOT_RUN |
| Organizaciones, membresías, aislamiento de consultas | Implementada | NOT_RUN DB + E2E |
| Agentes CRUD, versiones publicadas | Implementada | NOT_RUN DB + E2E |
| Chat local Ollama y agentes en ejecución | Implementado condicional al runtime/modelo | BLOCKED modelo/servicio |
| Workflow visual + editor estructurado + validación | Implementado | NOT_RUN navegador |
| Snapshots inmutables + optimistic concurrency | Implementado | NOT_RUN PostgreSQL |
| Runs, steps, SSE, cancel y reintentos | Implementado | NOT_RUN E2E |
| Worker PostgreSQL queue, lease y checkpoints | Implementado | NOT_RUN crash/replay |
| JetStream outbox relay | Implementado | NOT_RUN NATS real |
| Tool registry de funciones locales seguras | Implementado (tres tools) | NOT_RUN runtime |
| Aprobaciones four-eyes, hash del payload | Implementado | NOT_RUN integración |
| Auditoría y contadores usage | Implementado | NOT_RUN DB |
| Documentos textuales aislados y search | Implementado | NOT_RUN DB |
| Evaluaciones exact-match asíncronas | Implementado | NOT_RUN worker |
| Scalar / Zod OpenAPI adapter | Implementado | NOT_RUN build/HTTP |
| Compose local, TLS externo no incluido | Configuración entregada | NOT_RUN Compose CLI |
| UI WCAG 2.2 AA completa | Parcial | NOT_VERIFIED revisión manual |
| External OAuth connectors y secretos por vault | Pendiente | NOT_RUN |
| RAG embeddings, chunking, híbrida y ACL fine-grained | Pendiente | NOT_RUN |
| Ejecutor remoto de tools en sandbox | Pendiente | NOT_RUN |
| Retención/PII workflows, DLQ avanzada, budgets estrictos | Pendiente | NOT_RUN |
| Pipelines CI build + scans + firmas + backups PITR | Parcial/falta pipeline completo | NOT_RUN |
| Autenticación browser reforzada BFF, CSRF | Pendiente | NOT_RUN |

El término **implementado** significa que existe código fuente, no que esté probado en producción ni que la funcionalidad haya pasado E2E.
