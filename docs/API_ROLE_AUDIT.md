# API Role Audit

Audit date: **March 18, 2026**

This report enumerates current API authorization requirements at `app/server/api`.

## Legend

- `Public`: no authentication required
- `Auth`: authenticated user via `getProfileOrThrow`
- `Roles`: explicit `requireRoles(...)`

## Route Matrix

| Route | Method | Access |
|---|---|---|
| `/api/settings/public` | GET | Public |
| `/api/auth/resolve-identifier` | POST | Public (rate-limited) |
| `/api/auth/active-role` | PUT | Auth (role switch constrained by base role logic) |
| `/api/auth/on-behalf` | PUT | Auth (superadmin-only via in-handler checks) |
| `/api/auth/on-behalf` | DELETE | Auth (superadmin-only via in-handler checks) |
| `/api/orders` | POST | Auth (member checkout flow; rate-limited) |
| `/api/promotions/active` | GET | Roles: `superadmin, admin, staff, member` |
| `/api/print/orders/:id` | GET | Roles: `superadmin, admin, staff, member` + ownership gate for member |
| `/api/pos/barcode` | GET | Roles: `superadmin, admin, staff` |
| `/api/pos/members` | GET | Roles: `superadmin, admin, staff` |
| `/api/pos/orders` | POST | Roles: `superadmin, admin, staff` (rate-limited) |
| `/api/pos/variants` | GET | Roles: `superadmin, admin, staff` |
| `/api/superadmin/settings` | GET | Roles: `superadmin` |
| `/api/superadmin/settings` | PUT | Roles: `superadmin` |
| `/api/member/address-geo` | GET | Roles: `superadmin, admin, staff, member` |
| `/api/member/addresses` | GET | Roles: `superadmin, admin, staff, member` |
| `/api/member/addresses` | POST | Roles: `superadmin, admin, staff, member` |
| `/api/member/addresses/:id` | PUT | Roles: `superadmin, admin, staff, member` + `user_id` ownership filter |
| `/api/member/addresses/:id` | DELETE | Roles: `superadmin, admin, staff, member` + `user_id` ownership filter |
| `/api/member/catalog` | GET | Roles: `superadmin, admin, staff, member` |
| `/api/member/catalog/meta` | GET | Roles: `superadmin, admin, staff, member` |
| `/api/member/orders` | GET | Roles: `superadmin, admin, staff, member` (scoped by `profile.id`) |
| `/api/member/orders/:id` | GET | Roles: `superadmin, admin, staff, member` + `user_id` ownership filter |
| `/api/member/orders/:id/payment-submissions` | POST | Roles: `superadmin, admin, staff, member` + `user_id` ownership filter (rate-limited) |
| `/api/admin/orders` | GET | Roles: `superadmin, admin, staff` |
| `/api/admin/orders/export-xls` | POST | Roles: `superadmin, admin, staff` |
| `/api/admin/orders/:id` | GET | Roles: `superadmin, admin, staff` |
| `/api/admin/orders/:id` | DELETE | Roles: `superadmin` |
| `/api/admin/orders/:id/status` | PUT | Roles: `superadmin, admin, staff` |
| `/api/admin/payment-methods` | POST | Roles: `superadmin, admin` |
| `/api/admin/payment-methods/:id` | PUT | Roles: `superadmin, admin` |
| `/api/admin/payment-submissions/:id/verify` | PUT | Roles: `superadmin, admin, staff` |
| `/api/admin/product-metadata` | GET | Roles: `superadmin, admin, staff` |
| `/api/admin/product-metadata/brands` | POST | Roles: `superadmin, admin` |
| `/api/admin/product-metadata/brands/:id` | PUT | Roles: `superadmin, admin` |
| `/api/admin/product-metadata/brands/:id` | DELETE | Roles: `superadmin, admin` |
| `/api/admin/product-metadata/categories` | POST | Roles: `superadmin, admin` |
| `/api/admin/product-metadata/categories/:id` | PUT | Roles: `superadmin, admin` |
| `/api/admin/product-metadata/categories/:id` | DELETE | Roles: `superadmin, admin` |
| `/api/admin/product-metadata/tags` | POST | Roles: `superadmin, admin` |
| `/api/admin/product-metadata/tags/:id` | PUT | Roles: `superadmin, admin` |
| `/api/admin/product-metadata/tags/:id` | DELETE | Roles: `superadmin, admin` |
| `/api/admin/products` | GET | Roles: `superadmin, admin, staff` |
| `/api/admin/products` | POST | Roles: `superadmin, admin, staff` |
| `/api/admin/products/barcode/generate` | GET | Roles: `superadmin, admin, staff` |
| `/api/admin/products/:id` | GET | Roles: `superadmin, admin, staff` |
| `/api/admin/products/:id` | PUT | Roles: `superadmin, admin, staff` |
| `/api/admin/products/:id` | DELETE | Roles: `superadmin, admin` |
| `/api/admin/products/:id/images` | POST | Roles: `superadmin, admin, staff` |
| `/api/admin/products/:id/images/:imageId` | DELETE | Roles: `superadmin, admin, staff` |
| `/api/admin/products/:id/images/reorder` | PATCH | Roles: `superadmin, admin, staff` |
| `/api/admin/products/:id/variants` | POST | Roles: `superadmin, admin, staff` |
| `/api/admin/products/:id/variants/bulk` | PATCH | Roles: `superadmin, admin, staff` |
| `/api/admin/products/:id/variants/generate` | POST | Roles: `superadmin, admin, staff` |
| `/api/admin/promotions` | GET | Roles: `superadmin, admin` |
| `/api/admin/promotions` | POST | Roles: `superadmin, admin` |
| `/api/admin/promotions/:id` | PUT | Roles: `superadmin, admin` |
| `/api/admin/promotions/:id` | DELETE | Roles: `superadmin, admin` |
| `/api/admin/users` | GET | Roles: `superadmin, admin` |
| `/api/admin/users` | POST | Roles: `superadmin, admin` |
| `/api/admin/users/:id` | PUT | Roles: `superadmin, admin` |
| `/api/admin/users/:id/wallet` | PUT | Roles: `superadmin` |

## Findings

1. Endpoints without explicit `requireRoles` are intentional and currently controlled by:
   - Public endpoint: `/api/settings/public`
   - Public endpoint: `/api/auth/resolve-identifier` (now rate-limited)
   - Auth-constrained endpoint: `/api/orders` (uses `getProfileOrThrow`)
   - Auth-constrained endpoints with explicit in-handler superadmin checks: `/api/auth/on-behalf*`, `/api/auth/active-role`
2. Member-domain routes allow `superadmin/admin/staff/member` but data-level ownership checks are enforced using `user_id = profile.id` in query filters for write/read-sensitive resources.
3. Hard-delete authority is restricted where required:
   - Order delete: superadmin only
   - User wallet mutation: superadmin only

## Recommended Next Tightening (Optional)

1. Convert `auth/on-behalf*` and `auth/active-role` to `requireRoles` explicitly for consistency.
2. Consider narrowing some `/api/member/*` route role lists to `member` only if admin/staff access is not needed for operational workflows.
3. Add CI check to fail if new API routes are introduced without either:
   - `requireRoles(...)`, or
   - documented justification in this file.

