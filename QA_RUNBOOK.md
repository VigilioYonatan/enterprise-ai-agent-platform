> **Extensión:** ejecutar `python scripts/check-contract-wiring.py`, `python enterprise-agents-deploy/scripts/check-compose-security.py`, `python prod-local/scripts/validate-static.py`, `node scripts/audit_ts_imports.cjs apps`, `node scripts/test_pure_rules.cjs`, y posteriormente `npm ci` + builds/tests/Playwright + `docker compose config` en un entorno apto. Consultar `AUDIT_EXTENSION_2026-11-07.md` para los bloqueos actuales.

# Auditoría de código y release gate — Zero Omissions

## Orden reproducible en un entorno conectado (Node 24 y Docker Compose V2)

1. Validar archivos del ZIP extraído: ejecutar `python3 scripts/verify_bundle.py .`.
2. Instalar dependencias backend y frontend y resolver lockfiles aprobados; hasta entonces usar `npm install` solo para desarrollo, NO tratar como build reproducible.
3. Construir frontend y backend: `npm run build` en cada aplicación. Regenerar el OpenAPI y verificar su compatibilidad con el SDK frontend.
4. Validar Compose sin iniciar: `cd enterprise-agents-deploy && cp environments/local.env.example .env && docker compose --env-file .env -f compose/compose.yaml config --quiet`.
5. Arrancar: `docker compose --env-file .env -f compose/compose.yaml up --build -d` desde `enterprise-agents-deploy`.
6. Probar `/health/live` y UI, registro/login, organización, roles y permisos, creación de agente, publicación, flujo, run, aprobación y reconexión SSE.
7. Unit `npm run test` backend y frontend; BDD `npm run test:bdd` backend; integración con PostgreSQL real; browser `npm run test:e2e` frontend después de instalar Playwright browsers.
8. Ejecutar escáner de secretos, SAST, SCA, SBOM, imagen OCI y accesibilidad, además de un ensayo de restore independiente.
9. Revisar P0/P1, pruebas FAIL/NOT_RUN y generar nuevo reporte con comandos y fechas reales. Una instalación nunca equivale a release validado.

**Seguridad:** contraseñas `change_this_local...` son EXCLUSIVAMENTE ejemplos locales. Nunca exponer Caddy/Keycloak dev en Internet; OIDC SPA almacena temporalmente tokens en sessionStorage; BFF HttpOnly/CSRF sigue pendiente. No se adjuntan `.env` reales ni claves privadas.

**Estado de esta entrega:** la auditoría ejecutada se documenta en `QUALITY_REPORT.md`; Docker, registries, E2E y Keycloak real no están disponibles en este entorno.
