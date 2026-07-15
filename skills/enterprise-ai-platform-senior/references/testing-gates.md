# Matriz de pruebas y gates de calidad

| Test / gate | Dónde y qué comprueba | Evidencia |
|---|---|---|
| Unit Vitest | Domain Zod, entities, policies, application con ports fake | PASS / FAIL / NOT_RUN / BLOCKED |
| Integration PostgreSQL | constraints, concurrency, RLS, tenants y outbox real | Resultado SQL no mocks |
| Integration NATS/Valkey | ack/redelivery, dedup/inbox, cache ACL | Contenedores realmente levantados |
| BDD Cucumber | workflow publish, approval, run lifecycle expresados en Gherkin | escenarios ejecutados |
| NestJS API E2E | auth JWT, 401/403/404, DTOs, conflictos, idempotency | HTTP real y DB test |
| OpenAPI contract | schemas, operationIds, generated SDK, breaking diff | diff contra versión anterior |
| React unit/component | RHF/Zod, keyboard, dialogs, table states, conflict | Testing Library/Vitest |
| Browser Playwright | Login, editor, approve, monitor SSE, mobile, theme | Browser real, screenshots cuando corresponda |
| A11y axe/manual | WCAG 2.2 AA, foco, etiquetas y lector pantalla | automatizado + revisión manual |
| Adversarial | cross-user/doc/tenant, SSRF, injection, credential leak | fixtures negativos |
| Perf/load | p50/p95, throughput, error, coste por run | límites predefinidos medidos |
| Chaos/restore | worker crash, NATS outage, PITR en entorno aislado | datos y resultados documentados |
| Supply chain | SAST/SCA, gitleaks, Trivy, SBOM, firma | reports por commit y digest |

## Gherkin ejemplo

```gherkin
Feature: Aprobación de herramientas críticas
  Scenario: Una ejecución sensible no avanza sin aprobación
    Given un run autorizado que solicita una herramienta sensible
    When el worker prepara argumentos verificados
    Then el run queda en waiting_approval
    And se registra una aprobación para ese payload exacto
    And el ejecutor no invoca la herramienta

  Scenario: El tenant B no puede aprobar operaciones del A
    Given una aprobación pendiente en la organización A
    When un aprobador de la organización B intenta aprobarla
    Then se rechaza la decisión
    And ningún efecto externo se ejecuta
```

## Evidencia real

Reportar `PASS | FAIL | NOT_RUN | BLOCKED`, comando exacto, commit/imagen digest, entorno, logs con redacción, artefactos reproducibles y próximos riesgos. Si no hay Docker disponible, Compose `config` y lint pueden ser `NOT_RUN`; YAML parse no equivale a runtime. No afirmar compatibilidad de Vite/Vitest sin build. Review read-only tras test; si se modifica código luego, repetir pruebas.
