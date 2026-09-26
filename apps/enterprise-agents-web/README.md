# AgentOps Frontend · React 19 + Vite 8 + Tailwind 4 + Biome

UI funcional por features (`src/features/`), componentes compartidos (`src/libs`), estilos semánticos (`src/styles/tokens.css`, `globals.css`), identidad OIDC PKCE y cliente HTTP tipado de forma **manual** hasta que se implemente la generación desde OpenAPI. El frontend no autoriza recursos; el backend vuelve a verificar cada solicitud.

## Construcción y pruebas

```bash
# Node 24.22.2 y package-lock.json auténtico (npm ci, nunca npm install en CI)
npm ci
npm run lint                 # Biome, debe pasar sin deshabilitar reglas arbitrariamente
npm run typecheck
npm run build
npm run test:unit
npm run test:coverage
# Tras desplegar backend + Keycloak reales en un entorno de pruebas aislado:
npx playwright install --with-deps chromium
E2E_BASE_URL=http://localhost:8080 npm run test:e2e
E2E_BASE_URL=http://localhost:8080 npm run test:e2e:accessibility
```

**UX/UI:** navegación y teclado, estados de loading/error/empty, contraste/tema light/dark, Tailwind con tokens, React Flow con representación JSON alternativa; axe automatizado **no** sustituye revisión manual WCAG 2.2 AA. Las suites autenticadas requieren usuarios de laboratorio creados en el realm. Sin tests browser ejecutados no se declara accesibilidad aprobada. Las dependencias están declaradas, pero no instaladas ni verificadas aquí.
