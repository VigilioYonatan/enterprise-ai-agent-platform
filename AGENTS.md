> **Senior Mode extendido:** aplicar el protocolo Zero Omissions de `AUDIT_EXTENSION_2026-11-07.md` y la SuperSkill. Los gates deben fallar si faltan lockfiles, builds, pruebas o evidencias; nunca presentar un chequeo estático como E2E.

# Senior mode — regla de ejecución
Leer `architecture/IMPLEMENTATION_CONTRACT.md` y la SuperSkill suministrada antes de cambios. No inferir funcionalidad de directorios proyectados. Usar READ→MAP→VERIFY→PLAN→BUILD→TEST→REVIEW→EVIDENCE. Contratos Zod en DTO; Domain no importa Nest/Drizzle; controllers sin SQL; queries delimitadas por tenant; auth por JWKS y autorización por recurso; nunca subir secretos. Si un test no se ejecuta, marcar NOT_RUN.

## Reglas estrictas de Tipado, Contratos (SSOT) y Nombres sin Abreviaturas
- **Tipos indexados estrictos (`Schema['campo']`)**: Usar siempre `ApprovalSchema['status']`, `MembershipSchema['role']`, `RunSchema['status']`, `OrganizationSchema['id']`, etc. **Prohibido** concatenar `| string`, usar `string` suelto para enums/estados o crear intersecciones redundantes `Partial<Omit<Schema, ...>>` (usar `Partial<Pick<Schema, ...>>`).
- **Cero Alias Triviales (`export type A = B`, `export const a = b`)**: Cada schema, DTO y tipo de dominio tiene un único nombre canónico (SSOT). **Prohibido** renombrar schemas/tipos en DTOs (`chatAnswerSchema = answerResultSchema`), puertos de repositorio (`OAuthState = OAuthStateRecord`) o en el frontend (`Org = OrganizationResponseDto`), ni duplicar Query DTOs idénticos.
- **Cero Abreviaturas ni Variables de 1 letra (Backend y Frontend)**: Todas las constantes (`DEFAULT_EMBEDDING_MODEL`, `MIN_DOCUMENT_TITLE_LENGTH`, `CHUNK_MAX_CHARACTERS`, `DOCUMENTS_POLL_INTERVAL_MS`), DTOs/schemas (`knowledgeBaseQueryDto`, `evaluationSuiteFormSchema`), tipos y variables/callbacks (`queryClient`, `agentsQuery`, `createAgentMutation`, `oauth_config`, `execution_context`, `(agent) =>`, `(event) =>`) deben tener nombres semánticos completos y con sentido lógico.

