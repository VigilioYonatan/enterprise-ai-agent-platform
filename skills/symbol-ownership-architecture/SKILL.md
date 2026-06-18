---
name: symbol-ownership-architecture
description: Revisión e implementación de ownership de constantes, tipos, interfaces, puertos, utilidades y shared por feature para cualquier stack.
owner: governance-platform
lifecycle: stable
introduced_in: 0.7.0
routing_ecosystems: "any"
routing_keywords: "const,constants,tipos,types,interfaces,libs,shared,carpetas,archivos,servicio,service,ownership,symbol,organizar codigo"
routing_files: "package.json"
routing_capabilities: "architecture,feature"
requires: []
optional: []
conflicts: []
supersedes: []
---

# symbol-ownership-architecture — ejecución Senior/Staff


## Lectura canónica

- [Ownership transversal](../.vigilio-docs/standards/engineering/file-and-symbol-ownership.md)
- [Naming y boundaries](../.vigilio-docs/standards/engineering/naming-and-boundaries.md)
- [Review de cambio](../.vigilio-docs/standards/engineering/change-impact-and-review-gates.md)
- Solo la **guía del stack detectado**: `stacks/backend/nestjs/architecture/module-symbol-ownership.md`, `stacks/backend/laravel/architecture/module-symbol-ownership.md`, `stacks/rust/core/module-symbol-ownership.md`, `stacks/cpp/core/module-symbol-ownership.md`, `stacks/godot/core/module-symbol-ownership.md`, `stacks/frontend/web-mfe/ui/component-symbol-ownership.md` o `stacks/mobile/expo/ui/component-symbol-ownership.md`.

## Regla de decisión

**Constantes de Negocio vs Variables Locales**:
- **OBLIGATORIO extraer a `constants/*.constants.ts` (o `config/`)**: Magic numbers, límites operativos, TTLs, regexes, políticas de retry y códigos de error del módulo. Jamás mantener constantes de negocio hardcodeadas dentro de los servicios.
- **Variables locales en función**: Variables temporales (`const total = a + b`, `const item = await ...`) permanecen dentro del scope de su método. NO crear carpetas por reflejo para variables locales efímeras.
- **NO crear carpetas vacías por reflejo**: `libs/`, `interfaces/`, `shared/` solo se crean cuando existe un segundo consumidor real o un boundary arquitectónico confirmado.

**Ownership de Schemas y Contratos HTTP (Cero carpeta `contracts/` global)**:
- **Backend TS + NestJS + Zod 4**: Cada módulo de negocio es dueño exclusivo de sus schemas (`src/modules/<modulo>/domain/schemas/*.schema.ts`) y DTOs HTTP (`src/modules/<modulo>/presentation/http/dto/*.dto.ts`). **Prohibido crear carpetas `contracts/` o `packages/contracts/` globales**: la interoperabilidad con frontend u otros servicios se valida mediante `openapi diff` automatizado en CI y generación tipada desde el artefacto OpenAPI publicado (o subpaths directos del módulo propietario cuando conviven en el mismo repo).
- **Backend NO TS / NO Nest (Laravel, Python, Go, API externa 3rd party)**: El frontend/consumer declara sus propias `interfaces/`, `types/` y DTOs locales por feature o los genera desde el artefacto OpenAPI/Scalar sin crear carpetas `contracts/` fantasma.

## Procedimiento

1. Inspeccionar archivos reales e imports afectados; distinguir código nuevo de API publicada.
2. Clasificar cada símbolo `LOCAL | FEATURE_POLICY | FEATURE_CONTRACT | CROSS_FEATURE | PUBLIC_API | SECRET_RUNTIME`.
3. Extraer constantes de módulo a `{feature}/constants/{feature}.constants.ts` y parámetros de runtime a `config/`.
4. En schemas y contratos HTTP: mantenerlos dentro del módulo propietario (`domain/schemas/`, `presentation/http/dto/`) sin carpetas `contracts/` ni `packages/contracts/`, verificando compatibilidad con `openapi diff`.
5. Solo extraer shared/libs cuando existe segundo consumidor verificado; no romper DI, circularidad, seguridad ni tests.
6. Probar unitarios, integración y contratos del stack; REVIEW read-only; reportar resultados.

## Correcto / Incorrecto

✅ `orders/constants/orders.constants.ts` (`MAX_ORDER_ITEMS = 50`, `ORDER_TIMEOUT_MS = 5000`, `DEFAULT_EMBEDDING_MODEL`, `MIN_DOCUMENT_TITLE_LENGTH`, `CHUNK_MAX_CHARACTERS`) con nombres semánticos completos sin abreviaturas, importados en el servicio o componente.
✅ Backend NestJS: schemas Zod 4 en `src/modules/orders/domain/schemas/` y DTOs en `src/modules/orders/presentation/http/dto/`, usando tipos indexados estrictos (`ApprovalSchema['status']`, `MembershipSchema['role']`, `OrganizationSchema['id']`) sin `| string`.
✅ Puertos de repositorio y servicios que importan y usan directamente los tipos propietarios (`OAuthStateRecord`, `StoredConnectionRecord`, `ConnectedAccountRecord`, `SaveConnectionInput`, `ApprovalRecord`) sin crear alias intermedios.
✅ Frontend que importa directamente los DTOs canónicos (`OrganizationResponseDto`, `AgentResponseDto`, `PaginatedResult`) y nombra sus variables y callbacks con sentido completo (`queryClient`, `agentsQuery`, `createAgentMutation`, `(agent) => ...`, `(event) => ...`).
✅ `const total = items.reduce(...)` como variable local dentro de un método de `OrdersService`.

❌ Hardcodear `if (items.length > 50)` o `await sleep(5000)` dentro de `OrdersService` sin extraer constante.
❌ Abreviar nombres de constantes, DTOs, tipos o variables (`DEFAULT_EMBED_MODEL`, `MIN_DOC_TITLE_LENGTH`, `CHUNK_MAX_CHARS`, `kbQuery`, `evalSuiteFormSchema`, `qc`, `q`, `m`, `c`, `d`, `(a) => ...`, `(e) => ...`).
❌ Usar `MembershipSchema['role'] | string` o `Partial<Omit<ApprovalSchema, ...>>` redundante cuando basta `MembershipSchema['role']`, `ApprovalSchema['status']` o `Partial<Pick<ApprovalSchema, ...>>`.
❌ Crear alias triviales (`export const chatAnswerSchema = answerResultSchema`, `export type OAuthState = OAuthStateRecord`, `export type Org = OrganizationResponseDto`).
❌ Mover variables locales temporales (`const result = ...`) a una carpeta `const/`.
❌ Crear `shared/` o `libs/` sin un segundo módulo consumidor real.

