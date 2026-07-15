# Activación exacta de skills originales

**Preflight universal:** `vigilio-auto-senior` + `precision-skill-reading`, seleccionar en función del impacto; leer sus refs obligatorias completas. Nunca cargar toda la biblioteca en cada feature por ceremonia.

| Trabajo | Skills a leer completas + referencias aplicables |
|---|---|
| Arquitectura, ownership, plan | `architecture-traceability`, `symbol-ownership-architecture`, `platform-repository-workspace`, `repository-readme-architecture`, `complete-work-no-shortcuts` |
| README visual flagship, capturas/videos headless, logo Dark/Light y versionado (`0.1.0-beta`) | `readme-visual-showcase-and-versioning`, `repository-readme-architecture` + `../.vigilio-docs/playbooks/readme-headless-showcase-and-visual-qa.md` + `../.vigilio-docs/standards/engineering/repository-versioning-and-releases.md` |
| NestJS, controllers, DTOs, Scalar | `node-nest-technologies`, `node-nest-build-feature`, `node-nest-security` |
| Drizzle/Postgres/transacciones | `node-nest-persistence`, `platform-data-reliability` |
| Workers/NATS/outbox/SSE | `node-nest-async-workers`, `node-nest-realtime` |
| LLM, tools, evals, RAG, costos | `ai-rag-llmops-finops`, `platform-finops` |
| React, generated OpenAPI SDK | `web-mfe-build-feature`, `web-mfe-contracts`, `web-mfe-technologies`, `web-mfe-quality` (adaptar Preact a React por ADR) |
| UX/UI, Tailwind y accesibilidad | `ux-product-discovery`, `ux-information-architecture`, `ux-web-experience`, `ux-accessibility`, `ui-design-system`, `ui-art-direction`, `ui-interaction-motion`, `ui-quality-review` |
| Web SSE y browser auth | `web-mfe-realtime`, `web-mfe-security-delivery` (ignorar EKS/Preact) |
| BDD/Unit/E2E/contrato | `node-nest-testing`, `web-mfe-testing` |
| Compose e integración local | `platform-compose-vps-delivery`, `platform-local-production-lab` |
| Supply chain + CI/CD | `software-supply-chain-security`, `platform-cicd-factory`, `platform-environment-promotion`, `platform-validation-evidence` |
| Logs/metrics/tracing, backups | `platform-observability-sre`, `platform-data-reliability`, `platform-resilience-disaster-recovery`, `platform-scalability-capacity` |
| Specs/bug/refactor/revisión | `openspec-explore`, `openspec-propose`, `openspec-apply-change`, `openspec-sync-specs`, `openspec-archive-change`, `diagnosing-bugs`, `refactor-existing-code`, `review-code-change` selectivamente |

Las 52 skills fuentes incluidas se mantienen **sin modificar**. Su documentación fuente está en `skills/.vigilio-docs` para que `../.vigilio-docs` se resuelva desde cada skill. Leer refs `references/*.md` + documentos enlazados del caso; `routing_keywords` es inventario y NO evidencia de lectura.

## Conflictos explícitos resueltos

- `web-mfe-*` explica Preact, React seleccionado ⇒ **React puro**, conservar solo partes independientes del framework. 
- Docs de plataforma mencionan AWS/EKS/Terraform ⇒ excluir; proyecto **Compose autohospedado**.
- Dos estructuras HTTP en docs (`infrastructure/http` y `presentation/http`) ⇒ elegir `presentation/http` (ADR), no ambas.
- Ejemplos legacy worker SQS ⇒ usar NATS JetStream con la misma semántica de outbox/inbox.
- Guías antiguas de versionado pueden diferir ⇒ lockfiles/manifests reales + verificación de compatibilidad prevalecen.
- `S3 compatible` ≠ usar AWS; object storage local y backups remotos independientes sin dependencia AWS.
