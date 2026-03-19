# Performance Guide

Last updated: **March 18, 2026**

This guide describes practical performance operations for this project.

## 1) Query Hotspots

High-traffic endpoints:

- `GET /api/admin/orders`
- `GET /api/member/orders`
- `GET /api/pos/members`
- `POST /api/orders`
- `POST /api/pos/orders`

## 2) Current Optimizations

- Member orders query path:
  - DB-level sort + pagination when no search keyword.
  - exact order-number shortcut (`ORD-XXXX1234`) path.
  - item-name search reduced to matched `order_id` lookup.
- Admin orders query path:
  - exact order-number fast path for direct lookup.
- Added trigram + composite indexes:
  - `20260318000008_performance_indexes.sql`
  - `20260318000009_performance_indexes_admin_and_members.sql`

## 3) How To Validate Query Performance

For any slow query in Postgres/Supabase SQL editor:

1. Use `EXPLAIN (ANALYZE, BUFFERS, VERBOSE)` with realistic filters.
2. Confirm planner is using expected indexes.
3. Check:
   - total execution time
   - rows removed by filter
   - sort method (avoid large in-memory sort where possible)
4. If needed, add targeted index in a new migration file.

## 4) Guardrails

- No broad `select('*')` on large list endpoints.
- Keep pagination mandatory for list APIs.
- Avoid loading full datasets into memory if DB can page/sort.
- Prefer exact-match fast paths for known identifier formats.

## 5) Production Checklist

1. Run `pnpm typecheck`, `pnpm test`, `pnpm lint`.
2. Apply migrations: `pnpm db:push`.
3. Spot-check:
   - admin orders list (with and without search)
   - member orders list (search + sort + date filter)
   - POS member search dropdown
4. Monitor Supabase query latency and p95 endpoint latency.

