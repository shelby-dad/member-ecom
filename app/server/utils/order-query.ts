export type SortOrder = 'asc' | 'desc'

export type AdminOrderSortColumn =
  | 'order_number'
  | 'status'
  | 'total'
  | 'created_at'
  | 'updated_at'
  | 'member_name'
  | 'member_email'

export type MemberOrderSortColumn =
  | 'order_number'
  | 'status'
  | 'payment_method_type'
  | 'payment_status'
  | 'discount_total'
  | 'total'
  | 'created_at'

const adminAllowedSort: AdminOrderSortColumn[] = ['order_number', 'status', 'total', 'created_at', 'updated_at', 'member_name', 'member_email']
const memberAllowedSort: MemberOrderSortColumn[] = ['order_number', 'status', 'payment_method_type', 'payment_status', 'discount_total', 'total', 'created_at']

export function escapeLike(input: string) {
  return input.replace(/[%_]/g, char => `\\${char}`)
}

export function normalizeSortOrder(input: unknown): SortOrder {
  return String(input ?? '').trim().toLowerCase() === 'asc' ? 'asc' : 'desc'
}

export function normalizePage(input: unknown) {
  return Math.max(1, Number(input ?? 1) || 1)
}

export function normalizePerPage(input: unknown, allowed: number[], fallback: number) {
  const raw = Number(input ?? fallback) || fallback
  return allowed.includes(raw) ? raw : fallback
}

export function normalizeAdminOrderSort(input: unknown): AdminOrderSortColumn {
  const value = String(input ?? '').trim()
  return adminAllowedSort.includes(value as AdminOrderSortColumn) ? (value as AdminOrderSortColumn) : 'created_at'
}

export function normalizeMemberOrderSort(input: unknown): MemberOrderSortColumn {
  const value = String(input ?? '').trim()
  return memberAllowedSort.includes(value as MemberOrderSortColumn) ? (value as MemberOrderSortColumn) : 'created_at'
}

export function isExactOrderNumber(value: string) {
  return /^ORD-[A-Z]{4}\d{4}$/.test(String(value ?? '').trim().toUpperCase())
}

export function toStartOfDayIso(value: string) {
  const trimmed = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed))
    return null
  const d = new Date(`${trimmed}T00:00:00.000Z`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function toEndOfDayIso(value: string) {
  const trimmed = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed))
    return null
  const d = new Date(`${trimmed}T23:59:59.999Z`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}
