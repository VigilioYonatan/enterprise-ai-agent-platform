# AgentOps / Docker Compose (único runtime)

**Estado: código fuente NO APROBADO para producción.** La infraestructura, seguridad y calidad son gates de aceptación, no evidencia de que el despliegue haya pasado. No AWS, Kubernetes, Terraform, servicios gestionados ni versiones flotantes en release.

## Empezar en local (Docker Compose v2, Node 24 en los builds, acceso a registros)

```bash
cd enterprise-agents-deploy
./scripts/local-up.sh
# El script crea .env desde environments/local.env.example y materializa secretos locales
# Inicia Postgres, NATS y Keycloak, ejecuta migration una sola vez, y levanta la consola.
```

Entrar en **http://localhost:8080**. OIDC **http://localhost:8080/realms/agentops**, servido por Caddy (no hay puerto Keycloak público `8081`). Mailpit local (solo perfil dev) `http://localhost:8025`. No modificar una base de datos persistida suponiendo que una nueva importación del JSON realm sobrescribirá su configuración; hacer migración administrativa explícita.

## Antes de ejecutar

- Es obligatorio obtener `package-lock.json` auténticos para ambos repositorios con `scripts/generate-lockfiles.sh` ejecutado sobre Node 24.22.2 y conexión a npm. Los Dockerfiles exigen `npm ci`; sin lockfiles **deben fallar**.
- Los secretos locales se crean en `compose/secrets/` ignorada por Git. En un despliegue real deben provisionarse mediante archivos protegidos o mecanismo de secretos equivalente y verificar acceso real de UID/GID de cada contenedor. No incluir nunca secrets en ZIP/CI logs.
- No arrancar `api`, `worker` ni `outbox` antes de completar el job `migration`. El script local respeta el orden.
- Perfil `llm`: Ollama + indexador. Instalar manualmente el modelo local de embeddings y configurar `KNOWLEDGE_EMBED_MODEL`; un modelo ausente genera un error, no embeddings falsos.
- Perfil `observability`: Prometheus, Grafana, Tempo, OpenTelemetry Collector, Alertmanager y blackbox. **Sin un receptor real, el gate de observabilidad falla.**
- Perfil `storage`: MinIO autoalojado. La ingesta de PDF, escaneo de malware y uso extremo a extremo de este objeto storage **no están verificados**. Perfil `cache`: Valkey, no fuente autoritativa de runs.

## Verificar (secuencial, con evidencias)

```bash
python3 scripts/check-compose-security.py
scripts/check-observability.sh               # necesita promtool y amtool
scripts/security-gate.sh                     # necesita Node/npm, locks y herramientas SAST/SCA
scripts/check-release-gates.sh               # necesita evidencias firmadas
ALLOW_PRODUCTION_DEPLOY=YES scripts/deploy-production.sh /ruta/segura/production.env
```

El despliegue está **intencionalmente bloqueado** mientras falten lockfiles, evidencias ejecutadas, receptores de alertas, imágenes inmutables verificadas, configuración TLS y pruebas reales de backup/PITR. `environments/production.env.example` es plantilla, no una configuración para el mundo real.

Ver `docs/RELEASE_GATES.md`, `docs/OBSERVABILITY_RUNBOOK.md`, `compose/secrets/README.md` y `../PRODUCTION_READINESS_AUDIT.md`.
