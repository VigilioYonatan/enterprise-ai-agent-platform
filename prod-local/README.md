# Prod-local — Laboratorio de despliegue y resiliencia

Usa **el único Compose** de `../enterprise-agents-deploy/compose/compose.yaml`, no un fork con semántica divergente. `scripts/validate-static.py` detecta errores estructurales, y `scripts/smoke.mjs` comprueba la UI, la API y el issuer **solo cuando los contenedores estén ejecutándose**. Scripts de fault injection necesitan permisos y un entorno aislado sin datos reales.

**No hay evidencia aún** de pruebas de recuperación bajo carga, PITR, Keycloak real, NATS duplicados, BDD o UI E2E. Ejecutar y conservar resultados firmados antes de promoción. La validación estática NO habilita producción. Consultar `../PRODUCTION_READINESS_AUDIT.md`.
