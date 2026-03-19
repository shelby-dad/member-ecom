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
   - `CRYPTO_KEY` (required to encrypt/decrypt SMTP password at rest)
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

- Push migrations:
  ```bash
  pnpm db:push
  ```
- Generate single SQL schema:
  ```bash
  pnpm db:full-schema
  ```
- Seed base users:
  ```bash
  pnpm db:seed
  ```
- Clean non-user/role business data:
  ```bash
  pnpm clean:db
  ```

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build |
| `pnpm preview` | Preview production build |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run Nuxt typecheck |
| `pnpm test` | Run unit tests |
| `pnpm test:coverage` | Run unit tests with coverage report |
| `pnpm db:push` | Apply Supabase migrations |
| `pnpm db:full-schema` | Generate SQL schema file |
| `pnpm db:seed` | Seed default users |
| `pnpm clean:db` | Purge business data safely |
| `pnpm clean:conversations` | Remove chat conversation data safely |

## Quality And Enterprise Baseline

- SOLID-oriented service extraction for reusable domain logic (`app/server/utils`).
- Zod validation for API mutation contracts.
- Strict TypeScript mode for application code.
- Unit tests for composables and server utilities (`app/tests`).
- CI pipeline for lint, typecheck, test, and build (`.github/workflows/ci.yml`).
- Security headers configured in Nitro route rules.

See [DEV.md](/Users/benz/dev/single-tenat-shop/DEV.md) for coding rules, architecture boundaries, and production checklist.

## Security

- Authentication + role checks on protected pages and APIs.
- Supabase RLS for data ownership isolation.
- Service-role key only used server-side.
- SMTP password is encrypted at rest using `CRYPTO_KEY` (AES-256-GCM).
- Input validation and defensive parsing in server routes.
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
