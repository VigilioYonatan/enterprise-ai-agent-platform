# Arquitectura React, Tailwind 4 y diseño UX/UI

## Rutas UX

| Ruta | Página y tarea |
|---|---|
| `/login`, `/select-workspace` | OIDC y selección de tenant |
| `/app` | Overview KPI, estado de runs, tareas pendientes |
| `/app/agents`, `/app/agents/new`, `/app/agents/:id`, `/app/agents/:id/versions` | Agentes, edición, versiones |
| `/app/workflows`, `/app/workflows/new`, `/app/workflows/:id/editor`, `/app/workflows/:id/versions` | Listado, builder, historial |
| `/app/runs`, `/app/runs/:id` | Timeline, estados, coste, retry permitido |
| `/app/approvals`, `/app/approvals/:id` | Inbox y aprobación vinculada a payload |
| `/app/tools`, `/app/integrations` | Catálogo y conexiones |
| `/app/knowledge`, `/app/knowledge/:id` | Docs, indexación y resultados |
| `/app/evaluations`, `/app/evaluations/:id` | Evals, scores y regresiones |
| `/app/usage`, `/app/audit` | Costes, límites, auditoría |
| `/app/settings/{general,members,security,preferences}` | Configuración, roles, seguridad, tema |

## Arquitectura de archivos de la interfaz

```text
src/app/providers/app-providers.tsx                    # Ensambla Auth/Query/Theme/Router
src/app/providers/auth.provider.tsx                   # Sesión y tenant actual (no backend auth)
src/app/providers/query.provider.tsx                  # TanStack Query defaults
src/app/providers/theme.provider.tsx                  # Preferencia de tema y sistema
src/app/router/routes.tsx                            # Rutas lazy y guards UX
src/app/layouts/{auth,app,editor}-layout.tsx           # Login, consola y builder amplio
src/app/app-error-boundary.tsx                        # Error de render recuperable
src/services/http/api-client.ts                      # HTTP tipado, timeout y errores
src/services/http/api-error.mapper.ts                 # Error code API a UI segura
src/services/realtime/run-events.client.ts            # SSE resume, estados de reconexión
src/services/contracts/generated/                    # SDK OpenAPI; prohibido editar
src/styles/globals.css                               # @import 'tailwindcss'; variables
src/styles/tokens.css                                # Tokens semánticos --color-surface
src/styles/themes.css                                # Light, dark, high-contrast
src/styles/typography.css                            # Escala y jerarquía legible
src/libs/ui/button/{button,button.variants}.tsx       # CVA/variantes, focus/disabled/loading
src/libs/ui/forms/{form-field,form-error}.tsx         # Error asociado, hint y label
src/libs/ui/overlays/{dialog,alert-dialog,popover}.tsx # Focus management/Escape
src/libs/ui/navigation/{sidebar,breadcrumb,tabs}.tsx # IA y navegación adaptable
src/libs/ui/data-display/{data-table,status-badge,timeline,metric-card}.tsx # Patrones genéricos
src/libs/ui/feedback/{alert,toast,skeleton,empty-state,error-state}.tsx # Estados
src/features/workflows/pages/workflow-editor.page.tsx  # Load draft y permisos
src/features/workflows/components/workflow-canvas.tsx   # React Flow nodos/edges
src/features/workflows/components/workflow-inspector.tsx # Editar params del nodo
src/features/workflows/components/workflow-structured-editor.tsx # Accesibilidad sin drag/drop
src/features/workflows/components/workflow-validation-panel.tsx # Errores localizables
src/features/workflows/hooks/use-save-workflow.ts       # Mutación y If-Match
src/features/workflows/services/workflow-api.service.ts # Adaptador SDK
src/features/workflows/schemas/workflow-editor.schema.ts # Validación solo UI
src/features/workflows/types/workflow-canvas.type.ts  # Estado UI no persistente
```

Más features: agents (model selector, tools picker, version list); runs (timeline, step detail, cancel); approvals (payload diff, human decision); integrations (scope review); knowledge (uploads progress/search preview); evals (scorecards/compare); usage (budgets/charts); audit (filter/event detail); settings (membership/roles).

## Dirección visual y UX

- Profesional, sobria, neutral, alta densidad legible, inspiración productividad, sin copiar interfaces con copyright. Tipografía sans legible + mono IDs; contraste y tamaños legibles. Claro/oscuro diseñados con tokens, no inversión automática.
- Layout desktop: sidebar, topbar, content; builder tres paneles (paleta de nodos, canvas, inspector). En móvil, consola adaptable; builder con edición estructurada accesible.
- Tailwind 4: `@import 'tailwindcss'` y tokens CSS semánticos (`--color-surface`, `--color-text`, `--color-border`, `--color-focus`, `--color-danger`), no dispersión de hex ni `!important`; CVA para variantes cuando aporte valor. Tratar dark/high-contrast/reduced-motion como criterios de aceptación.
- Design system: `button`, `input`, `select`, `checkbox`, `dialog`, `alert-dialog`, `tabs`, `table`, `badge`, `form-field`, `toast`, `skeleton`, `empty-state`, `error-state`, `page-header`. Subir a `libs/ui/` solo componentes con ≥2 consumidores reales y sin lógica del dominio.
- Formularios RHF+Zod, errores en campo y resumen, foco al error; validación cliente de UX no sustituye servidor.
- Estados obligatorios loading, empty, error, retry, success, forbidden, offline, conflict, pending approval, running; nunca guardar silenciosamente un conflicto.
- WCAG 2.2 AA objetivo: teclado, foco, contrastes, semantic HTML, `aria-live`, `aria-describedby`, navegación, 44px cuando relevante; axe automatizado + revisión manual con lector de pantalla. No prometer AA sin auditoría.
- Performance con presupuesto LCP/INP/CLS y pruebas sobre datos representativos; lazy routes, cache keys estables, virtualización cuando se mida.
