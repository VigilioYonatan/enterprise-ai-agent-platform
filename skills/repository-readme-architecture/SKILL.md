---
name: repository-readme-architecture
description: Autoría y validación de README.md profesionales de producción con quickstart <10 min, arquitectura limpia, contratos, testing, env vars y runbooks para backend, frontend y monorepos.
owner: governance-platform
lifecycle: stable
introduced_in: 0.8.0
routing_ecosystems: "cross-stack"
routing_keywords: "readme, documentation, onboarding, project-overview, quick-start, architecture-overview, setup-guide, developer-checklist"
routing_files: "README.md, CONTRIBUTING.md, CHANGELOG.md, VERSION, package.json"
routing_capabilities: "documentation, architecture-governance, onboarding"
requires: []
optional: ["readme-visual-showcase-and-versioning"]
conflicts: []
supersedes: []
---

# repository-readme-architecture — Ejecución Senior/Staff

> **Lecturas Canónicas:**
> - [Estándar de README y Onboarding](../.vigilio-docs/standards/engineering/readme-standard.md)
> - [Playbook de Capturas Headless, Videos Cortos y Auditoría Visual](../.vigilio-docs/playbooks/readme-headless-showcase-and-visual-qa.md) *(obligatorio cuando el README incluye capturas Playwright/Puppeteer, videos `.gif`/`.webm`, logos Dark/Light o audiencia no técnica)*
> - [Estándar de Versionado de Repositorios y Releases (`0.1.0-beta`)](../.vigilio-docs/standards/engineering/repository-versioning-and-releases.md)
> - SuperSkill compañera: [readme-visual-showcase-and-versioning](../readme-visual-showcase-and-versioning/SKILL.md)

## Principios Auto-Senior del README

1. **Regla de los 10 Minutos y Audiencia Correcta**:
   - En repositorios de microservicios/librerías internas, cualquier desarrollador debe levantar el proyecto en menos de 10 minutos.
   - En repositorios de **productos o plataformas completas para cualquier usuario** (estilo *Craft Anything* o *Twenty*), redactar el cuerpo principal en **lenguaje humano claro y cero jerga críptica interna**, moviendo los comandos avanzados de ingeniería a un bloque desplegable `<details>` al final.
2. **Verdad Visual `1:1` en Capturas y Videos Cortos**:
   - Jamás tomar capturas con tablas en cero: ejecutar primero un **Super Seeder** determinista.
   - Inspeccionar visualmente cada imagen PNG y cada fotograma de los videos `.gif`/`.webm` para garantizar que su descripción coincida **100%** con lo que se ve en pantalla.
3. **Versionado Semántico Unificado y Descarga Directa (`0.1.0-beta`)**:
   - Alinear la versión en `VERSION`, `CHANGELOG.md`, `package.json`, OpenAPI, descripción "About" de GitHub (`<= 160` caracteres) y badges/botones de descarga en el Hero (`0.1.0--beta` en Shields.io).
4. **Cero Secretos Hardcodeados**: Ningún secreto, API key o contraseña en el README ni en git. Todo se documenta en `.env.example` con descripciones de formato.
5. **Flujo de API y Contratos sin Carpeta `contracts/` Global**:
   - Si el backend es **NestJS / TypeScript**: Documentar que cada módulo de dominio posee sus propios schemas Zod 4 (`domain/schemas/`) y DTOs HTTP (`presentation/http/dto/`), publicando la especificación OpenAPI verificada con `openapi diff` en CI (sin carpetas globales `contracts/` ni `packages/contracts/`).
   - Si el backend es **Laravel, Python, Go o API externa**: Documentar que el consumidor gestiona sus propias `interfaces/`, `types/` por feature o genera clientes tipados desde OpenAPI/Scalar.
6. **Testing Obligatorio antes de Deploy**: Comandos claros para unitarios, e2e y linting en local y en CI.
7. **Estructura de Carpetas Explicada**: No solo listar el árbol, sino explicar la responsabilidad arquitectónica de cada directorio.

## Estructura Anatómica Obligatoria (12 a 15 Secciones)

| # | Sección | Propósito Senior |
|---|---------|------------------|
| 1 | **Hero Visual & Badges (Estilo Flagship)** | Bloque centrado (`<div align="center">`), logo/icono (`<picture>` adaptable a dark/light mode), título, barra de navegación rápida/idiomas, pitch en negrita, fila de badges tecnológicos con logos (`shields.io`), botón CTA y captura/GIF principal del producto con pie de foto (`<sub>`). |
| 2 | **Table of Contents** | Enlaces directos a cada sección para navegación rápida (o barra horizontal en el Hero). |
| 3 | **Overview & Features (Bento / Tabla Visual)** | Problema de negocio que resuelve, callout `> [!NOTE]` y tabla o lista de capacidades clave. |
| 4 | **Tech Stack** | Runtime, lenguaje, framework, base de datos, colas, caching, testing. |
| 5 | **Architecture Overview** | Diagrama de flujo de datos (`mermaid` o ASCII) y boundaries. |
| 6 | **Repository Structure** | Árbol de carpetas anotado con el ownership arquitectónico. |
| 7 | **Quick Start (<10 min)** | Prerrequisitos, clonado, `.env` setup, instalación y dev server. |
| 8 | **Environment Variables** | Tabla completa con nombre, requerida (Sí/No), default y descripción. |
| 9 | **API & Contracts** | Endpoints clave, DTOs compartidos o interfaces locales según stack. |
| 10 | **Testing Strategy** | Comandos para unitarios, integración, e2e y cobertura mínima. |
| 11 | **CI/CD Pipeline** | Flujo de GitHub Actions/GitLab CI y gates de calidad. |
| 12 | **Deployment & Docker** | Instrucciones de Docker Compose, staging y producción. |
| 13 | **Developer Checklist** | Lista de chequeo previa a abrir un Pull Request. |
| 14 | **Troubleshooting & Common Pitfalls** | Errores típicos y sus soluciones inmediatas. |
| 15 | **Contributing & License** | Reglas de branching, commits semánticos y licencia. |

## Patrón Visual Flagship (Estilo NestJS / Twenty / Craft Anything)

Todo README principal debe abrir con un **Hero centrado de alto impacto visual** combinando HTML permitido por GitHub Flavored Markdown (`<div align="center">`, `<picture>`, `<sub>`) y alertas nativas (`> [!NOTE]`, `> [!IMPORTANT]`):

```markdown
<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/logo-dark.svg" />
    <source media="(prefers-color-scheme: light)" srcset="docs/assets/logo-light.svg" />
    <img alt="Project Logo" src="docs/assets/logo.png" width="110" />
  </picture>

  <h1>Nombre del Proyecto</h1>

  <p>
    <a href="#quick-start-10-min">Quick Start</a> ·
    <a href="#architecture-overview">Arquitectura</a> ·
    <a href="#api--contracts">Contratos & API</a> ·
    <a href="#testing-strategy">Testing</a>
  </p>

  <p><b>Frase de impacto en una línea que explica qué hace la plataforma y por qué su arquitectura es superior.</b></p>
  <p>Explicación concisa de 2 líneas detallando cómo el sistema resuelve el flujo de extremo a extremo con seguridad, observabilidad y tipado estricto.</p>

  <p>
    <img src="https://img.shields.io/badge/100%25-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Backend-NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white" alt="NestJS" />
    <img src="https://img.shields.io/badge/Database-PostgreSQL_16-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/Contracts-Zod_SSOT-3E67B1?style=flat-square&logo=zod&logoColor=white" alt="Zod" />
    <img src="https://img.shields.io/badge/status-production_ready-10B981?style=flat-square" alt="Status" />
  </p>

  <p>
    <a href="docs/ARCHITECTURE.md"><img src="https://img.shields.io/badge/EXPLORAR_ARQUITECTURA-18181B?style=for-the-badge&logo=gitbook&logoColor=white" alt="Docs" /></a>
  </p>

  <img src="docs/assets/hero-dashboard.png" alt="Vista general de la plataforma" width="100%" />
  <p><sub>Vista en vivo del panel de control: cada ejecución verifica políticas RBAC, aprobaciones humanas y trazabilidad de auditoría.</sub></p>
</div>

> [!NOTE]
> **Diseño orientado a producción:** Este repositorio aplica el estándar **Zero Omissions** — contratos tipados de extremo a extremo, aislamiento multi-tenant en PostgreSQL y verificación E2E real con Playwright.
```

## Lectura obligatoria de referencias

Read each linked reference completely before the work that depends on it:

- Read [readme-template-backend.md](references/readme-template-backend.md) para microservicios backend (NestJS / bus-impl / Laravel).
- Read [readme-template-frontend.md](references/readme-template-frontend.md) para aplicaciones y micro frontends (React / web-mfe / Vite).
- Read [readme-template-fullstack.md](references/readme-template-fullstack.md) para monorepos e-commerce fullstack con pnpm workspaces.
- Read [readme-checklist.md](references/readme-checklist.md) para el checklist de calidad pre-merge y prevención de pitfalls.

## Reglas Correcto / Incorrecto

✅ Instrucciones paso a paso reproducibles en terminal virgen.
✅ Explicar cómo cada módulo posee sus schemas/DTOs y cómo se valida compatibilidad OpenAPI (`openapi diff`) sin crear carpetas globales `contracts/`.
✅ Explicar cómo levantar dependencias auxiliares con `docker compose up -d`.
✅ Incluir tabla exhaustiva de variables de entorno con valores dummy seguros.

❌ Escribir "Configurar el .env con las credenciales que te pase el líder por Slack".
❌ READMEs desactualizados donde `npm run dev` falla por falta de migraciones previas no documentadas.
❌ Árboles de carpetas gigantes sin explicar la responsabilidad de cada módulo.
❌ Decir "TODO: completar después" en secciones de testing o despliegue.
