# Frontend ↔ API contract boundary

Source of truth: backend Zod DTOs exported as OpenAPI and shown in Scalar.

**Current status: INCOMPLETE.** `src/services/http/api-client.ts` contains legacy handwritten request/response types; they must be replaced by a generated, browser-safe SDK before production. A script at `scripts/generate-api-types.sh` fails closed until a reviewed, pinned generator is installed and OpenAPI is exported. Do not run an `npx` remote latest generator or edit generated models by hand.

Acceptance: generated client builds, all consumer imports point to its public exports, contract diff rejects breaking changes, authorization/error/pagination E2E verify wire formats, no server-only Node modules reach the browser bundle.
