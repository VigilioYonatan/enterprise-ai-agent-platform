# Decisiones

ADR-001: Keycloak IdP autoalojado en vez de diseñar autenticación casera. Google/Facebook vía broker; las contraseñas de cuentas locales y su reset son responsabilidad de Keycloak.

ADR-002: JWT verificado por JWKS (issuer/audience/algoritmos), authorization por membership PostgreSQL. No confiar roles del frontend.

ADR-003: React SPA PKCE para primer vertical slice; BFF + cookie HttpOnly/CSRF es requisito de mejora antes de producción con datos regulados.

ADR-004: Estructura `presentation/http/`, contratos DTO con Zod, ports de DB en application, adapters Drizzle en infrastructure.

ADR-005: Solo Docker Compose autoalojado. NATS/Valkey disponibles pero no fingir ejecución de workers no implementados.

ADR-006: Instalación npm bloqueada offline, lockfiles ausentes. Docker construirá con npm install cuando haya conectividad; no afirmar builds reproducibles hasta generar lockfiles y pasar npm ci.

ADR-007: Versiones objetivo verificadas para noviembre 2026: NestJS 11.2.8, React 19.3.1, Vite 8.3.6, TypeScript 6.0.3, Tailwind 4.3.3, Vitest 5.0.5 y Keycloak 26.8.2. Sin instalación real no hay evidencia de compatibilidad de la combinación.
