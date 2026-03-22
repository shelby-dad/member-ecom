# Single-Tenant Shop

Single-tenant commerce system built with Nuxt 3, Vuetify 3, and Supabase (Auth, Database, Storage), with role-based access (`superadmin`, `admin`, `staff`, `member`).

## Requirements

- Node.js 20+
- pnpm 10+

## Quick Start

1. Prepare environment:
   ```bash
   cp .env.example .env
   ```
2. Set at minimum in `.env`:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `CRYPTO_KEY` (required to encrypt/decrypt SMTP secret at rest)
3. Install and run:
   ```bash
   pnpm install
   pnpm dev
   ```
4. Open `http://localhost:3000`.

## Environment Strategy

- `development`: local development and local/staging Supabase resources.
- `staging`: production-like validation with isolated Supabase project.
- `production`: isolated Supabase project and strict secret management.

Never share keys across environments.

## Database

- Apply migrations:
  ```bash
  pnpm db:migrate
  ```
- Seed default users:
  ```bash
  pnpm db:seed
  ```
- Generate full schema snapshot:
  ```bash
  pnpm db:full-schema
  ```
- One-shot setup (migrate + seed):
  ```bash
  pnpm db:setup
  ```
- One-shot setup with schema snapshot (migrate + seed + full schema):
  ```bash
  pnpm db:setup:full
  ```
- Clean non-user/role business data:
  ```bash
  pnpm clean:db
  ```

## Notification Queue (Nuxt Server)

User-created notification flow is now Nuxt-native:

- DB trigger inserts a queue job into `public.internal_job_queue` on `auth.users` insert.
- Nuxt server worker processes jobs and sends SMTP email to active `superadmin`/`admin` users.
- Processing is non-blocking for user creation and includes retry/backoff on transient failures.
- Email template orchestration uses `email_templates.user_add_notification` (inactive template skips send).

Optional internal endpoint for cron/ops queue drain:

```bash
POST /api/internal/jobs/user-created-notify/process
Header: x-internal-queue-token: <INTERNAL_QUEUE_TOKEN>
Body: { "limit": 25 }
```

## Scripts

| Command | Description |
|---|---|
| `pnpm build` | Production build |
| `pnpm clean:conversations` | Remove chat conversation data safely |
| `pnpm clean:db` | Purge business data safely |
| `pnpm clean:members` | Hard-delete member users and related data |
| `pnpm clean:notification` | Remove all notifications from DB (`-- --yes` to confirm) |
| `pnpm db:full-schema` | Generate SQL schema file |
| `pnpm db:migrate` | Alias for `db:push` |
| `pnpm db:migration:repair:applied` | Mark migration version(s) as applied in remote history |
| `pnpm db:migration:repair:reverted` | Mark migration version(s) as reverted in remote history |
| `pnpm db:migrations:list` | List local and remote migration status |
| `pnpm db:pull` | Pull remote schema into local migration snapshot |
| `pnpm preview` | Preview production build |
| `pnpm db:push` | Apply Supabase migrations |
| `pnpm db:seed` | Seed default users |
| `pnpm db:setup` | Run migrate + seed |
| `pnpm db:setup:full` | Run migrate + seed + full schema snapshot |
| `pnpm dev` | Start dev server |
| `pnpm generate` | Generate static output |
| `pnpm lint` | Run ESLint |
| `pnpm postinstall` | Run Nuxt prepare hook |
| `pnpm test` | Run unit tests |
| `pnpm test:coverage` | Run unit tests with coverage report |
| `pnpm test:e2e` | Run Playwright e2e suite |
| `pnpm test:e2e:ui` | Run Playwright in UI mode |
| `pnpm test:watch` | Run Vitest in watch mode |
| `pnpm typecheck` | Run Nuxt typecheck |

## Technology Docs Map

| Technology | Official Docs | Used For | Where In This Project |
|---|---|---|---|
| Nuxt 3 | https://nuxt.com/docs | App framework, SSR, routing, server APIs | `app/pages/*`, `app/layouts/*`, `app/server/api/*`, `nuxt.config.ts` |
| Vue 3 | https://vuejs.org/guide/introduction.html | Component/reactivity layer | `app/components/*`, `app/composables/*` |
| Vuetify 3 | https://vuetifyjs.com/en/getting-started/installation/ | UI components and responsive layout | `app/components/*`, `app/pages/*`, `app/plugins/vuetify.ts` |
| Supabase | https://supabase.com/docs | Auth, Postgres, Storage, Realtime | `app/server/utils/supabase.ts`, `supabase/migrations/*`, `app/plugins/*supabase*` |
| Supabase JS | https://supabase.com/docs/reference/javascript/introduction | Client/server DB and auth calls | `app/server/api/*`, `app/composables/*` |
| Zod | https://zod.dev/ | Runtime request validation | `app/server/api/**/*.ts` |
| TipTap | https://tiptap.dev/docs/editor/getting-started/overview | Rich editor for email templates/content editing | `app/components/EmailTemplateEditor.vue`, `app/components/RichTextField.vue` |
| Pino | https://getpino.io/#/ | Structured server logging | `app/server/utils/logger.ts`, `app/server/middleware/00.request-logger.ts` |
| web-push | https://github.com/web-push-libs/web-push | Browser push notification delivery | `app/server/utils/chat-push.ts`, `app/server/services/notifications/*` |
| Vitest | https://vitest.dev/guide/ | Unit testing | `app/tests/**/*.test.ts`, `vitest.config.ts` |
| Playwright | https://playwright.dev/docs/intro | End-to-end testing | `app/e2e/*.spec.ts`, `playwright.config.ts` |
| XLSX | https://docs.sheetjs.com/ | Export order XLS files | `app/server/api/admin/orders/export-xls.post.ts` |
| ZXing | https://github.com/zxing-js/library | Barcode scanning in POS | `app/pages/staff/pos/index.vue`, barcode scanner flows |
| JsBarcode | https://github.com/lindell/JsBarcode | Barcode image rendering | `app/components/BarcodeImage.vue` |

## Quality And Enterprise Baseline

- SOLID-oriented service extraction for reusable domain logic (`app/server/utils`).
- Zod validation for API mutation contracts.
- Strict TypeScript mode for application code.
- Unit tests for composables and server utilities (`app/tests`).
- CI pipeline for lint, typecheck, test, and build (`.github/workflows/ci.yml`).
- Security headers configured in Nitro route rules.
- Structured server logging with request IDs (`pino` + middleware + Nitro error hook).

See [DEV.md](/Users/benz/dev/single-tenat-shop/DEV.md) for coding rules, architecture boundaries, and production checklist.

## Security

- Authentication + role checks on protected pages and APIs.
- Supabase RLS for data ownership isolation.
- Service-role key only used server-side.
- SMTP secret is encrypted at rest using `CRYPTO_KEY` (AES-256-GCM) and stored in `smtp_password_iv` + `smtp_password_content`.
- Internal queue endpoint requires `INTERNAL_QUEUE_TOKEN` when called externally (cron/ops).
- Input validation and defensive parsing in server routes.
- Log redaction for sensitive fields (`authorization`, `cookie`, passwords, tokens, SMTP secret parts).
- Security headers:
  - `X-Frame-Options`
  - `X-Content-Type-Options`
  - `X-XSS-Protection`
  - `Referrer-Policy`
  - `Cross-Origin-Resource-Policy`
  - `Cross-Origin-Opener-Policy`
  - `Permissions-Policy`

## Project Structure

- `app/`: Nuxt source
- `app/server/`: backend API and domain utils
- `app/server/middleware/00.request-logger.ts`: request/response lifecycle logs
- `app/server/utils/logger.ts`: shared logger and error serialization
- `app/assets/scss/`: global styles + theme tokens
- `app/tests/`: unit tests
- `supabase/migrations/`: schema and policy migrations
- `scripts/`: operational scripts

## Recent Implementations (March 2026)

- Chat system hardening:
  - assignment/unassignment realtime consistency
  - banned/flagged conversation flow for operator + member
  - role-constrained unflag (superadmin)
- Chat inbox UX:
  - infinite scroll with pagination
  - assignment filter (`All`, `Assigned`, `Unassigned`)
  - unread behavior and ordered list updates
- Superadmin platform overview:
  - Supabase Management API integration (server-side PAT only)
  - plan/status/cost + traffic metrics with Free-plan graceful fallback
  - traffic range persistence (`7/30/90`) in local storage
- Storage explorer:
  - image size and file type shown in grid
  - smart upload compression for JPEG/WebP and PNG->WebP when beneficial

## License

Private / All rights reserved.
