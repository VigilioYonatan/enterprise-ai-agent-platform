> **Informe histórico:** este reporte refleja el ZIP anterior. Para el estado actualizado de las funcionalidades y controles consulta `AUDIT_EXTENSION_2026-11-07.md`. La extensión incluye RAG híbrido/OAuth/notificaciones, pero el release sigue NO APROBADO.

> **Actualización posterior:** la segunda auditoría y las correcciones del proyecto están documentadas en `AUDIT_ZERO_OMISSIONS_2026-11-07.md`. Este informe conserva el estado histórico anterior a esas correcciones.

# AUDITORÍA FINAL — AgentOps Enterprise AI Platform

**Fecha:** 2026-11-07  
**Estado:** **ENTREGA PARCIAL / NO VERIFICABLE COMO RELEASE DE PRODUCCIÓN**.  
**Norma:** `skills/auditoria-total-zero-omissions/SKILL.md` y SuperSkill `skills/enterprise-ai-platform-senior/SKILL.md`.

Este reporte **no certifica un producto completo**. La fuente implementa varias funcionalidades de extremo a extremo a nivel código, pero no se han instalado dependencias ni arrancado Docker, Keycloak, PostgreSQL, NATS ni navegador. Una prueba estática no significa un build correcto ni comportamiento verificado.

## Matriz trazable de requisitos

| ID | Requisito | Evidencia de implementación | Estado de fuente | Ejecución pertinente |
|---|---|---|---|---|
| R-01 | Cinco repositorios Git independientes coordinados | `apps/{enterprise-agents-impl,enterprise-agents-web}`, `enterprise-agents-deploy`, `platform-ops`, `prod-local` | ESTRUCTURA CREADA; repos sin `.git` | NOT_RUN init/remoto |
| R-02 | NestJS modular, DDD, controllers, DTO Zod y ports | `apps/enterprise-agents-impl/src/modules/`, `src/shared/http` | CÓDIGO | NOT_RUN build/e2e |
| R-03 | React 19, Tailwind 4, UX responsive, componentes por feature | `apps/enterprise-agents-web/src`, `src/app/routes.tsx` | CÓDIGO | NOT_RUN Playwright/axe/manual |
| R-04 | PostgreSQL, Drizzle, migraciones y multitenant | `src/database`, `src/modules/*/infrastructure`, `migrations/0001..0008` | CÓDIGO | NOT_RUN PostgreSQL real |
| R-05 | OIDC self-hosted JWT/PKCE | `shared/auth`, `services/auth/oidc-client.ts`, `compose/keycloak/` | CÓDIGO | NOT_RUN Keycloak |
| R-06 | Agents con versiones inmutables | `modules/agents/`, migración 0004 | CÓDIGO | NOT_RUN integración |
| R-07 | Workflow editor, validar, publicar y revisar | `modules/workflows/`, `features/workflows/` | CÓDIGO | NOT_RUN browser/DB |
| R-08 | Run durable, worker, checkpoints, reintentos, SSE | `src/worker.main.ts`, `modules/runs/`, `features/runs/runs.tsx` | CÓDIGO | NOT_RUN recuperación y concurrency |
| R-09 | Outbox confirmado y transporte JetStream | `src/outbox.main.ts`, `shared/messaging/outbox.table.ts` | CÓDIGO | NOT_RUN NATS |
| R-10 | Tool allowlist y aprobaciones vinculadas a argumentos | `modules/tools`, `modules/approvals`, `features/approvals` | CÓDIGO (tools locales) | NOT_RUN e2e de seguridad |
| R-11 | Auditoría, consumo y evaluaciones asíncronas | `modules/audit`, `modules/usage`, `modules/evaluations`, `src/evaluation.main.ts` | CÓDIGO (evaluación exact-match) | NOT_RUN |
| R-12 | Knowledge, embeddings, RAG hybrid y ACL granular | `modules/knowledge` tiene documentos y búsqueda textual tenant-scoped; **no RAG completo** | **INCOMPLETO** | NOT_RUN |
| R-13 | Integraciones OAuth externas, referencias a secretos, sandbox herramientas | Solo proveedor OIDC de usuario + herramientas locales permitidas | **INCOMPLETO** | NOT_RUN |
| R-14 | Scalar/OpenAPI derivado de Zod, SDK cliente generado | `bootstrap/openapi.bootstrap.ts` con esquema Zod; cliente React aún tiene tipos manuales | **PARCIAL** | NOT_RUN schema diff/build |
| R-15 | Docker Compose sin AWS/Kubernetes | `enterprise-agents-deploy/compose/compose.yaml`, 18 servicios declarados | CONFIGURACIÓN ESTÁTICA | NOT_RUN `docker compose config/up` |
| R-16 | DevSecOps completo, SBOM, firmas, SAST, SCA y secretos | CI básico, threat model, lectura del ZIP; no pipeline de firmado ni SAST completo | **INCOMPLETO** | NOT_RUN scans |
| R-17 | Backup PITR, restore, hardening producción | `platform-ops/` incluye script de backup y runbook | **INCOMPLETO** | NOT_RUN restore independiente |
| R-18 | Unit, BDD, integración, API/browser E2E y WCAG | Tests Vitest/BDD, una prueba Playwright, guías; coverage insuficiente | **INCOMPLETO** | NOT_RUN suites reales |
| R-19 | SuperSkills originales más auditoría Zero Omissions | `skills/` incluidas con `.vigilio-docs/` | INCLUIDO | PASS archivo/integridad ZIP únicamente |
| R-20 | Lockfiles reproducibles, `npm ci`, versiones digests OCI | Manifests presentes; lockfiles no pudieron obtenerse por falta de registro npm | **INCOMPLETO** | BLOCKED conectividad/install |

## Controles de esta sesión

- **PASS estático** — 117 archivos TypeScript/TSX parseados con TypeScript global mediante `createSourceFile`; **0 errores de sintaxis**. Esto **no** fue `tsc --noEmit` ni resolución de dependencias.
- **PASS estático** — 284 referencias `from './...'` / `from '../...'` verificadas sobre el árbol; **0 rutas relativas faltantes**. Imports no relativos y runtime de paquetes externos no verificados.
- **PASS estático** — `python scripts/verify_bundle.py .`: JSON válido en manifests y realm; Compose parseado en modo estricto con **18 servicios**, sin claves YAML duplicadas; archivos críticos presentes; no `.env` privado detectado.
- **PASS estático** — `python prod-local/scripts/validate-static.py`: topología base Compose, puertos DB/NATS/Valkey sin publicar, realm con reset y PKCE.
- **PASS paquete** — integridad ZIP, extracción y comprobación de los archivos críticos **solo si adjunto en `PACKAGE_TEST_RESULT.md` está en PASS**. La copia extraída vuelve a ejecutar `scripts/verify_bundle.py`.
- **NOT_RUN** — `npm install`, TypeScript typecheck completo, NestJS/Vite build, Vitest, Cucumber, Playwright, ejecución SQL real, Compose CLI, pruebas de seguridad externas, subida de archivos, restauración, accesibilidad con dispositivos reales.

## Defectos corregidos durante inspección

- Compose contenía múltiples declaraciones YAML de `prometheus`, `grafana`, `otel-collector`, `tempo` y volúmenes; se consolidaron antes de empaquetar.
- La transición `draft → published` carecía del valor permitido en check constraint de la tabla original; migración `0005_workflow_status.sql` agrega la transición correspondiente.
- Añadida recuperación de evaluaciones `running` con lease en migración `0008_eval_lease.sql`.
- Añadida protección de flujo contra ciclos, salidas no terminales, ramas inválidas y nodos con salidas incorrectas.

## Hallazgos activos — No apto para producción

1. **P0 para producción:** autenticación SPA usa `sessionStorage`; no existe BFF con cookie HttpOnly/CSRF. Los tokens podrían exponerse por XSS. Keycloak en `start-dev` y HTTP local, sin TLS productivo.
2. **P0 para garantía de release:** no se pudieron ejecutar builds, tests reales o Docker. No se puede aprobar usabilidad, corrección de SQL ni consistencia de persistencia concurrente.
3. **P1:** faltan integraciones OAuth externas completas, almacenamiento de documentos con pipeline RAG vectorial, ACL fina, budget enforcement y políticas avanzadas de tools.
4. **P1:** faltan lockfiles y `npm ci`, pruebas unitarias/integración/BDD/E2E exhaustivas, pruebas WCAG manuales, SAST/SCA/SBOM/firma/restore PITR.
5. **P1:** OpenAPI presenta request DTO desde Zod, pero respuestas y SDK React generado no están completos. Requiere comparación de contratos y migración de tipos manuales.
6. **P2:** el worker utiliza PostgreSQL como cola autoritativa; JetStream transmite eventos del outbox, no ejecuta cada paso desde un consumer NATS.

## Uso y próximas comprobaciones obligatorias

Leer `README.md`, `QA_RUNBOOK.md`, `FUNCTIONAL_COVERAGE.md`, los 5 `AGENTS.md`, e instalar dependencias con Node 24 en un entorno conectado. Crear los lockfiles, corregir errores detectados por `tsc`, ejecutar `docker compose config`, arrancar la topología y correr tests reales antes de pensar en staging/producción. No publicar la instalación local `Keycloak start-dev` en Internet.

**Conclusión: ENTREGA PARCIAL / NO VERIFICABLE como release; un artefacto de código fuente amplio, con requisitos Senior/Staff implementados solo parcialmente y pendientes declarados.**
