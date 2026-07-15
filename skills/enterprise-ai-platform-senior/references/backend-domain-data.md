# Módulos, lógica de negocio, persistencia y seguridad

## Módulos y ownership

| Módulo | Dominio y casos de uso | Datos y tests críticos |
|---|---|---|
| identity | sincronizar subject OIDC sin suplantación | `users` unique issuer/subject; JWT/claims |
| organizations | crear/editar organización y owner inicial en tx | `organizations`; aislamiento multi-tenant |
| memberships | invitar, cambiar rol, revocar, evitar último owner | `memberships, roles, permissions`; escalation |
| agents | crear/editar draft, publicar config inmutable | `agents, agent_versions`; snapshot immutability |
| workflows | grafo, edición con revisión, validar, publicar | `workflows, workflow_versions`; FK y 409/412 |
| runs | iniciar, ejecutar step, checkpoint, cancelar, reanudar | `runs, run_steps, run_checkpoints`; idempotency |
| tools | allowlist, validación args, sandbox, permisos | `tools, tool_executions`; SSRF y payload tamper |
| approvals | solicitud, expiry, aprobación/rechazo por actor apto | `approval_requests, approval_decisions`; one-shot decision |
| integrations | OAuth state+PKCE, revocar, permisos exactos | `integration_connections, credential_references`; no secrets |
| knowledge | subir/quarantine/chunk/embed/retrieve con ACL | `documents, document_chunks`; cross-tenant/user/doc |
| evaluations | suite/dataset versionado, correr y comparar | `evaluation_suites,cases,results`; regression |
| usage | reservar budget antes de LLM, reconciliar consumo | `usage_records,budget_reservations`; race |
| audit | append-only actor, resource, tenant, outcome | `audit_events`; redacción/retención |
| notifications | crear idempotente y despachar según preferencia | `notifications`; retry y routing |

## Patrones por archivo de cada módulo

`domain/schemas/<entity>.schema.ts` Zod estructural propio, enums derivados; `domain/entities/*.entity.ts` reglas/estado si aporta valor; `domain/policies/*.policy.ts` invariantes complejas sin Nest; `domain/exceptions/*.error.ts` errores de negocio puros; `application/service/*.service.ts` operación semántica, verifica actor/tenant/permissions y coordina transacción; `application/repositories/*.interface.ts` port de persistencia; `application/ports/*.port.ts` dependencia externa sólo donde exista; `presentation/http/controllers/*.controller.ts` transport, guards, DTO, status; `presentation/http/dto/*.dto.ts` Zod request/query/response; `infrastructure/persistence/drizzle/*.table.ts` schema e índices SQL; `*.repository.ts` SQL y mappers; `infrastructure/{messaging,ai,execution,storage}/` adapters de NATS/LLM/tool/storage; `*.module.ts` Nest DI tokens.

## Estructuras específicas

```text
runs/domain/schemas/run.schema.ts                        # queued/running/waiting_approval/failed/completed
runs/application/service/start-run.service.ts           # fija versión workflow y idempotency
runs/application/service/execute-run-step.service.ts    # lease, compare-and-swap, output seguro
runs/application/service/resume-run.service.ts          # checkpoint durable y versión fijada
runs/application/service/cancel-run.service.ts          # best-effort cancel sin reversión mágica
runs/application/ports/model-provider.port.ts            # infere con timeout/usage/abort
runs/infrastructure/messaging/run-consumer.adapter.ts     # ack post-commit/dedup/retry/DLQ
runs/infrastructure/persistence/drizzle/run-checkpoint.table.ts # reanudación real
tools/domain/policies/tool-execution.policy.ts          # allowlist, capabilities, approvals
tools/application/service/execute-tool.service.ts      # revalidar args/tenant/perms al ejecutar
tools/infrastructure/execution/http-tool.adapter.ts    # bloqueo SSRF/DNS redirect/private IP
approvals/domain/policies/approval-decision.policy.ts    # actor habilitado, TTL, digest payload
approvals/application/service/approve-execution.service.ts # decisión one-shot, auditoría
knowledge/application/service/search-knowledge.service.ts # ACL usuario+doc+tenant en retrieval
knowledge/infrastructure/retrieval/hybrid-search.adapter.ts # pgvector/hybrid, rerank, citations
usage/application/service/reserve-budget.service.ts     # reserva atómica antes del proveedor
```

## Reglas DB

- PostgreSQL 16 + pgvector bajo Drizzle; UUID, FKs, NOT NULL, UNIQUE/CHECK, índices compuestos observados con `EXPLAIN (ANALYZE, BUFFERS)`; transacciones cortas, isolation conforme operación; `numeric` para costes, UTC/timestamptz; cursor para grandes timelines y offset del contrato público inicial para listados.
- `tenant_id` determinado del actor, filtros en SQL y RLS como capa extra con rol sin bypass y `SET LOCAL` transaccional validado; `document ACL` adicional para RAG. Pruebas de lecturas/escrituras, caches, reportes y eventos cruzados.
- Outbox en la misma tx que estado de negocio; relay después de commit; consumers al menos-una-vez + processed_events inbox, idempotency keys y reconciliación de efectos externos. No prometer exactly-once.
- Migraciones sólo job `migration`, expand→backfill→contract; smoke y rollback compatibles, backup PITR comprobado fuera del host.
- Valkey cache no guarda verdad de negocio; invalidación por keys precisas y versionado de tenant/ACL. Nada de `DEL('prefix:*')`.
- LLM provider local/remoto agnóstico sin AWS, nunca permitir que prompt decida permisos. LLM salida como dato no fiable; prompt injection y tool outputs adversariales; budgets, eval datasets, traces sin PII, checkpoints.
