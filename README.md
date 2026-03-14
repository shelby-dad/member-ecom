# Single-Tenant Shop

Enterprise single-tenant commerce MVP: Nuxt 3, Vuetify 3, Supabase (Auth, DB, Storage), with role-based access (superadmin, admin, member, staff).

## Requirements

- Node 20+
- pnpm (recommended) or npm

## Quick start (development)

1. Copy environment file and set your Supabase credentials:
   ```bash
   cp .env.example .env
   ```
   Edit `.env`: set `SUPABASE_URL` and `SUPABASE_ANON_KEY` for your **development** Supabase project.

2. Install and run:
   ```bash
   pnpm install
   pnpm dev
   ```
   Open http://localhost:3000.

3. (Optional) **Google sign-in**: In [Supabase Dashboard](https://supabase.com/dashboard) → Authentication → Providers → Google, enable Google and set your OAuth Client ID and Secret. Under Authentication → URL Configuration, add your app URLs to **Redirect URLs** (e.g. `http://localhost:3000/auth/callback` and your production callback URL). Ensure `NUXT_PUBLIC_APP_URL` in `.env` matches the URL users use so the OAuth redirect works.

4. (Optional) For local Supabase (DB, Auth, Storage):
   - Install [Supabase CLI](https://supabase.com/docs/guides/cli) and run `supabase start` in the project root.
   - Point `.env` to the local URLs printed by the CLI.

## Environments
`
- **Development**: Use `.env`; point to a development Supabase project (or local Supabase). Run `pnpm dev`.
- **Staging**: Use a separate Supabase project. Set `NUXT_PUBLIC_APP_ENV=staging` and staging `SUPABASE_*` / `NUXT_PUBLIC_*` in your CI/staging host. Build with `pnpm build`; deploy the output to a staging URL.
- **Production**: Use a production Supabase project only. Set `NUXT_PUBLIC_APP_ENV=production` and production secrets in your deployment pipeline. Never use dev/staging keys in production.

See `.env.example` for all supported variables. Public config is exposed via Nuxt `runtimeConfig` (`NUXT_PUBLIC_*`).

## Database migrations

- **One command (recommended)**: Link your project once, then push migrations:
  ```bash
  npx supabase login
  npx supabase link --project-ref YOUR_PROJECT_REF
  pnpm db:push
  ```
  Use the project ref from your Supabase URL (`https://YOUR_PROJECT_REF.supabase.co`). After that, `pnpm db:push` applies all pending migrations.

- **Single SQL file**: To generate one file you can run once in the Supabase SQL Editor (e.g. for a fresh project):
  ```bash
  pnpm db:full-schema
  ```
  This writes `supabase/full-schema.sql`. Open it in Dashboard → SQL Editor and run it. Do not run it twice (not idempotent).

- **Seed example users** (re-runnable): Create superadmin, admin, staff, and member logins with password `123456`:
  ```bash
  pnpm db:seed
  ```
  Requires `NUXT_SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`) in `.env`. Creates or updates:
  - `superadmin@tenat-shop.com` (role: superadmin)
  - `admin@tenat-shop.com` (role: admin)
  - `staff@tenat-shop.com` (role: staff)
  - `member@tenat-shop.com` (role: member)

## Scripts

| Command       | Description                |
|---------------|----------------------------|
| `pnpm dev`    | Start dev server           |
| `pnpm build`  | Production build           |
| `pnpm preview`| Preview production build   |
| `pnpm typecheck` | Run TypeScript check   |
| `pnpm lint`   | Run ESLint                 |
| `pnpm db:push` | Apply migrations (Supabase CLI) |
| `pnpm db:full-schema` | Generate single SQL file from migrations |
| `pnpm db:seed` | Seed example users (password 123456 for all) |

## Project structure

- `app/` – Nuxt application (pages, components, layouts, plugins, composables, middleware, server API)
- `app/assets/scss/` – Custom SCSS tokens and global styles
- `app/server/` – Server API routes and auth/role helpers
- `app/tests/` – Unit tests (Vitest)
- `supabase/migrations/` – SQL migrations and RLS policies
- `.env.example` – Environment variable template

## Security hardening

- **Auth**: All protected routes require authentication; role middleware restricts `/admin`, `/staff`, `/superadmin` by profile role.
- **API**: Admin and POS endpoints validate profile via session and require specific roles; mutations use service-role client only after checks.
- **RLS**: Supabase RLS policies enforce tenant-scoped reads and writes; members see only their orders, addresses, and payment submissions.
- **Input**: Server routes validate request bodies with Zod before writing to the database.
- **Secrets**: Never commit `.env`; use `NUXT_SUPABASE_SERVICE_ROLE_KEY` only on the server; use separate Supabase projects per environment.
- **Headers**: Security headers (X-Frame-Options, X-Content-Type-Options, etc.) are set in Nitro route rules.

## Tests and CI

- `pnpm test` – Run unit tests (Vitest).
- `pnpm lint` – ESLint.
- `pnpm typecheck` – Nuxt TypeScript check.
- GitHub Actions (`.github/workflows/ci.yml`) runs lint, typecheck, and build on push/PR to main, develop, and staging. Configure `SUPABASE_URL` and `SUPABASE_ANON_KEY` (and optionally `NUXT_SUPABASE_SERVICE_ROLE_KEY`) as repository secrets for the build job.

## License

Private / All rights reserved.
