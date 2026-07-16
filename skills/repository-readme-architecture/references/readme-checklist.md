# Checklist y Prevención de Pitfalls en README.md

Esta guía condensa los errores más comunes de desarrolladores y agentes de IA al redactar READMEs, junto con la lista de verificación para auditorías Senior/Staff.

---

## Los 6 Errores Críticos (Common Pitfalls)

### 1. Hardcodear Secretos o Claves Reales
- **Error**: Colocar `DATABASE_URL=postgres://root:p@ssword123@prod-db.aws.com` o `OPENAI_API_KEY=sk-proj-...` dentro del README.
- **Riesgo**: Filtración de credenciales en GitHub, auditorías fallidas y vulneración del supply chain.
- **Solución Senior**: Colocar valores de ejemplo sintéticos (`postgresql://user:password@localhost:5432/dbname`) y referenciar un archivo `.env.example` versionado.

### 2. Omitir el Quick Start o Suponer Conocimiento Previo
- **Error**: Poner solo `npm start` sin mencionar que se necesita Docker, una versión específica de Node o correr migraciones previas.
- **Impacto**: El nuevo desarrollador tarda horas depurando errores crípticos de base de datos.
- **Solución Senior**: Lista explícita de prerrequisitos, comandos paso a paso desde el `git clone`, y tiempo estimado menor a 10 minutos.

### 3. Explicar Carpetas sin su Rol Arquitectónico
- **Error**: Copiar un árbol de 80 carpetas sin explicar qué va en cada una.
- **Impacto**: Los desarrolladores y la IA terminan creando carpetas duplicadas o metiendo lógica de dominio en el controlador.
- **Solución Senior**: Limitar el árbol a las carpetas principales (Domain, Application, Infrastructure, Presentation) con un comentario de una línea que defina el ownership.

### 4. No Aclarar el Ownership Modular de Schemas y OpenAPI
- **Error**: Crear carpetas globales `contracts/` o `packages/contracts/` manuales que acoplan repositorios y duplican esquemas fuera de sus módulos propietarios.
- **Solución Senior**: Documentar que los schemas Zod 4 y DTOs viven dentro de cada módulo (`domain/schemas/`, `presentation/http/dto/`) y que la compatibilidad HTTP se protege mediante `openapi diff` automatizado en CI.

### 5. Omitir Pruebas antes de Desplegar
- **Error**: Describir cómo hacer `docker build` o `git push` sin documentar cómo correr la suite de tests unitarios y de integración.
- **Solución Senior**: Incluir siempre la sección de testing con comandos reproducibles y umbrales mínimos de cobertura.

### 6. Olvidar el Versionado Semántico y Changelog
- **Error**: Modificar APIs sin versionar ni documentar breaking changes.
- **Solución Senior**: Enlazar el archivo `CHANGELOG.md` y documentar la política de versionado (SemVer `MAJOR.MINOR.PATCH`).

### 7. Hardcodear Versiones de Runtime en el README
- **Error**: Colocar `Node.js 20+` o `pnpm 9+` en el texto del README mientras `package.json` o la plataforma exigen `Node 24` y `pnpm 11+`.
- **Riesgo**: Desfase de documentación (drift), desarrolladores instalando runtimes incompatibles y fallas en CI.
- **Solución Senior**: No duplicar números estáticos. Referenciar `package.json#engines`, `package.json#packageManager`, `docker-compose.yml` y la fuente canónica central `technology/versions.md`.

### 8. Lenguaje Críptico o Capturas / Videos que No Coinciden con su Descripción
- **Error**: Llenar un README orientado a usuarios finales con acrónimos internos (`MATERIALIZED CTE`, `TOCTOU`, `ts_rank_cd`), tomar capturas sobre bases de datos vacías (`0 rows`) o escribir pies de foto que describen pantallas que el GIF no muestra.
- **Solución Senior**: Ejecutar un Super Seeder realista antes de capturar con Playwright (`deviceScaleFactor: 2`), extraer una hoja de contacto de todos los frames de cada GIF para auditar correspondencia `1:1` imagen↔texto, redactar en lenguaje humano claro y alinear la versión (`VERSION`, `CHANGELOG.md`, `package.json`, `0.1.0-beta` badge y enlace de descarga).

---

## Developer Checklist Pre-Merge / Pre-Release

Antes de dar por completado un README o aprobar un PR, verifica:

- [ ] **Onboarding < 10 min y Lenguaje Adecuado**: ¿Cualquier persona entiende qué hace el producto sin jerga interna y puede descargarlo/levantarlo en minutos?
- [ ] **Auditoría Visual `1:1` (PNG + Frames de GIF)**: ¿Se inspeccionaron todas las capturas `2x` y todos los fotogramas de los videos cortos verificando que coinciden exactamente con sus descripciones y que el logo `<picture>` funciona en Dark y Light Mode?
- [ ] **Versionado SemVer y Descarga (`0.1.0-beta`)**: ¿Coincide la versión en `VERSION`, `CHANGELOG.md`, `package.json`, OpenAPI y el botón de descarga / descripción "About" de GitHub?
- [ ] **Cero Versiones Hardcodeadas**: ¿Los prerrequisitos referencian `package.json` (`engines`, `packageManager`), `docker-compose.yml` y `technology/versions.md` en vez de números fijos desfasados?
- [ ] **Cero Secretos**: ¿Todos los strings de conexión y tokens son valores dummy seguros?
- [ ] **.env.example Alineado**: ¿Todas las variables de la tabla del README existen en `.env.example`?
- [ ] **Comandos Probados**: ¿Todos los comandos (`pnpm install`, `pnpm test`, `pnpm build`) funcionan tal cual están escritos?
- [ ] **Ownership Claro**: ¿Se explica la regla de constantes de negocio (`constants/`) y el origen de los contratos?
- [ ] **Contratos y Tree-Shaking**: ¿Si el backend es TS/Nest, se documenta la importación por subpaths con tree-shaking para no inflar el bundle del frontend?
- [ ] **Troubleshooting Incluido**: ¿Se documentan los 2 o 3 errores más comunes que ocurren al iniciar?
