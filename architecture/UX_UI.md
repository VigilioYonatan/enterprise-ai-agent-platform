# Diseño UX/UI

React + Tailwind CSS 4, paleta neutra, fuente sistema, contraste AA y foco visible. Sidebar workspace-centric; topbar con usuario/logout; pantallas Dashboard, Agents, Workflows, Editor y estados vacíos. Se usa un editor estructurado accesible de workflows en este ZIP, NO un canvas React Flow ya terminado. Las páginas futuras de Runs, Approvals, Tools, Integrations, Knowledge, Evaluations, Usage, Audit y Settings permanecen en plan.

Estado mínimo por vista: loading, vacío (CTA), error (reintento), éxito (confirmación), forbidden (servidor), conflicto (revisión), responsive. Los componentes `Button`, `Card`, `Field`, `PageHeader`, `EmptyState` son reutilizables; la lógica específica queda en feature. Tailwind compone utilities, CSS vars tokens semánticos light/dark.

La accesibilidad requiere pruebas axe/Playwright y revisión manual para afirmar WCAG 2.2 AA; en este ZIP no se ejecutaron.
