# DEV Guide

This document defines engineering standards for production-grade delivery in this project.

## 1) Engineering Principles

- Apply SOLID in server and composable logic:
  - Single Responsibility: keep API handlers thin; move business logic to `app/server/utils`.
  - Open/Closed: extend via new utility modules instead of rewriting shared behavior.
  - Liskov + Interface Segregation: type contracts should be explicit and narrow.
  - Dependency Inversion: core logic should depend on function parameters, not global state.
- Prefer pure functions for pricing, export mapping, formatting, and validation transforms.
- Keep components focused on UI; avoid data/business coupling in templates.

## 2) Architecture Boundaries

- `app/pages/*`: rendering + user interactions only.
- `app/components/*`: reusable UI and local state.
- `app/composables/*`: client-side shared behavior.
- `app/server/api/*`: HTTP adapter layer; auth/validation + orchestration.
- `app/server/utils/*`: domain/business logic (unit-test-first).

## 3) Styling And Theme Rules

- Use Vuetify components first for consistency.
- Put design tokens and reusable theme values in SCSS tokens.
- Avoid ad-hoc inline style values when a token/class can be reused.
- Ensure light/dark mode readability:
  - contrast-safe text
  - icon visibility
  - table/skeleton consistency

## 4) Security Rules

- Every server mutation route must validate body input with Zod.
- Every protected route must call role/auth guards before data access.
- Never trust client role claims; always read role from server profile.
- No secrets in client code or public runtime config.
- Keep RLS enabled for all tenant-owned tables.
- Use parameterized Supabase filters; avoid dynamic SQL strings unless escaped.
- Apply endpoint-level rate limits for sensitive APIs (auth resolution, checkout, payment submission).
- Use centralized API error normalization (`defineSafeEventHandler`) for consistent and safe error payloads.
- Never log raw secrets, credentials, or tokens.

## 5) Performance Rules

- Avoid over-fetching columns from Supabase (`select` only needed fields).
- Batch requests in parallel (`Promise.all`) when independent.
- Keep list endpoints paginated and sortable.
- Debounce text search input on UI.
- Use cache where data is mostly static (for example address geo selectors).
- Prefer DB-level pagination/sort/filter when search is empty; avoid full in-memory list processing.
- Add targeted indexes for high-traffic query patterns and document each new index migration.

## 6) Testing Strategy

- Unit tests:
  - server utils
  - composables
  - pure format/transform logic
- Add regression tests for every production bug fix.
- Run locally before merge:
  ```bash
  pnpm lint
  pnpm typecheck
  pnpm test
  pnpm test:coverage
  ```

## 7) DX Rules

- Keep naming consistent and explicit.
- Prefer smaller modules with clear exports.
- Do not duplicate formatting/business logic across pages.
- Keep scripts discoverable in `package.json`.
- Keep docs updated when behavior or commands change.

## 7.2) Database Workflow Rules

- Canonical team DB commands:
  - `pnpm db:migrate`
  - `pnpm db:seed`
  - `pnpm db:setup:full`
- Use `pnpm db:setup` for daily onboarding/reset (migrate + seed).
- Use `pnpm db:setup:full` before releasing schema-sensitive changes to keep `supabase/full-schema.sql` current.
- Never manually edit migration history tables; use repair scripts only when absolutely required and document it in PR notes.

## 7.1) Logging Rules (Production)

- Server logs must be structured JSON via `pino`.
- Every request must include/request-propagate `x-request-id`.
- Request lifecycle logs are required:
  - `request.start`
  - `request.finish` or `request.close`
- Unhandled server errors must be captured by Nitro error hook.
- Sensitive values must be redacted:
  - authorization/cookie headers
  - passwords/tokens/secrets
  - SMTP encrypted parts (`smtp_password_iv`, `smtp_password_content`)
- Use `event.context.logger` (or helper wrappers) instead of `console.*` in server code.

## 8) Pull Request Checklist

- Feature behavior preserved (manual verification done).
- Typecheck and tests pass.
- New/changed logic has tests when practical.
- Security implications reviewed (auth, role checks, data exposure).
- README/DEV docs updated when needed.

## 9) Step-by-Step Modernization Plan

1. Baseline and guardrails: docs, coverage, security headers, testable utilities.
2. Service extraction: move business logic from API handlers to domain services.
3. UI component hardening: shared reusable filter/table/modal patterns.
4. Performance pass: query optimization, payload trimming, and caching strategy.
5. Security pass: audit auth paths, role boundaries, and input validation coverage.
6. CI quality gates: coverage thresholds and stricter lint scope.

## 10) Current Security Controls (Implemented)

- Rate limiting via `app/server/utils/rate-limit.ts` on:
  - `POST /api/auth/resolve-identifier`
  - `POST /api/orders`
  - `POST /api/pos/orders`
  - `POST /api/member/orders/:id/payment-submissions`
- Centralized error shaping utility:
  - `app/server/utils/api-error.ts`
- Role audit report:
  - `docs/API_ROLE_AUDIT.md`

## 11) Performance Ops (Implemented)

- Performance operations guide:
  - `docs/PERFORMANCE.md`
- Index migrations for search/list hotspots:
  - `20260318000008_performance_indexes.sql`
  - `20260318000009_performance_indexes_admin_and_members.sql`

## 12) Frontend Architecture + Theme (Implemented)

- Reusable filter wrapper component:
  - `app/components/AppFilterCard.vue`
- Reusable data-table toolbar component:
  - `app/components/AppDataTableToolbar.vue`
- Shared filter styling primitives:
  - `.app-filter-card`
  - `.app-filter-grid`
  - `.app-filter-field`
- Theme-aware surface/background CSS variables in:
  - `app/assets/scss/main.scss`
- Applied reusable filter card pattern to:
  - admin orders page
  - admin products page
  - member orders page

## 13) Test Maturity (Implemented)

- Service-level tests added for critical order list services:
  - `app/tests/services/order-list.test.ts`
- Coverage scope includes:
  - `app/server/utils/**`
  - `app/server/services/**`
  - `app/composables/**`
- CI test job now runs:
  - `pnpm test:coverage`
- Coverage thresholds are enforced in `vitest.config.ts`.
- SMTP crypto iv/content handling is regression-tested in:
  - `app/tests/utils/secret-crypto.test.ts`

## 14) Latest Implementation Notes (March 20, 2026)

- Superadmin platform overview now supports Supabase Management API integration with server-only secrets:
  - `SUPABASE_MANAGEMENT_PAT`
  - `SUPABASE_ORG_ID`
  - `SUPABASE_PROJECT_REF` (optional, derived from `SUPABASE_URL` if omitted)
- Free-plan compatibility rule:
  - if analytics returns a single aggregated point, UI switches to current-usage mode and shows guidance instead of pretending historical buckets exist.
- SMTP settings security rule:
  - SMTP secret must be encrypted at rest with `CRYPTO_KEY` and stored as two columns: `smtp_password_iv` and `smtp_password_content`.
  - Legacy single-column `smtp_password` is removed from `app_settings`.
- Storage explorer upload rule:
  - client-side compression is allowed only when output materially reduces size; keep original when compression gain is negligible.
- Chat attachments rule:
  - chat supports image attachments for both member and operator; message payload may be text-only, file-only (`sent a file`), or text+file.
  - operator attachment selection uses Storage Explorer; member attachment uses local picker with preview before send.
  - notification preview for attachment messages must be `sent a file` for consistency across inbox and push alerts.
- Nuxt notification queue rule:
  - user-created notifications must be trigger -> queue -> server processor (non-blocking).
  - queue jobs live in `public.internal_job_queue` and must support retry/backoff and failure terminal state.
  - processing logic must stay in `app/server/services/queues/*` and `app/server/services/notifications/*`.
  - any internal processing endpoint must require explicit token guard (`INTERNAL_QUEUE_TOKEN`).
- Email template orchestration rule:
  - `email_templates` table is system-managed and non-deletable.
  - queue processor must load template first; when inactive, skip outbound email.
  - variable rendering uses explicit `{{variable_name}}` placeholders.
