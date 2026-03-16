import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

type SortColumn =
  | 'order_number'
  | 'status'
  | 'payment_method_type'
  | 'payment_status'
  | 'discount_total'
  | 'total'
  | 'created_at'

function escLike(input: string) {
  return input.replace(/[%_]/g, char => `\\${char}`)
}

function normalizeSort(input: unknown): SortColumn {
  const value = String(input ?? '').trim()
  const allowed: SortColumn[] = ['order_number', 'status', 'payment_method_type', 'payment_status', 'discount_total', 'total', 'created_at']
  return allowed.includes(value as SortColumn) ? (value as SortColumn) : 'created_at'
}

function toStartOfDayIso(value: string) {
  const trimmed = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed))
    return null
  const d = new Date(`${trimmed}T00:00:00.000Z`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function toEndOfDayIso(value: string) {
  const trimmed = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed))
    return null
  const d = new Date(`${trimmed}T23:59:59.999Z`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin', 'staff', 'member'])

  const queryParams = getQuery(event)
  const q = String(queryParams.q ?? '').trim()
  const status = String(queryParams.status ?? '').trim()
  const dateFrom = String(queryParams.date_from ?? '').trim()
  const dateTo = String(queryParams.date_to ?? '').trim()
  const page = Math.max(1, Number(queryParams.page ?? 1) || 1)
  const perPageRaw = Number(queryParams.per_page ?? 25) || 25
  const perPage = [10, 25, 50, 100].includes(perPageRaw) ? perPageRaw : 25
  const sortBy = normalizeSort(queryParams.sort_by)
  const sortOrder = String(queryParams.sort_order ?? '').trim().toLowerCase() === 'asc' ? 'asc' : 'desc'
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  const supabase = await getServiceRoleClient(event)
  let query = supabase
    .from('orders')
    .select('id, order_number, status, payment_status, payment_method_type, estimate_delivery_start, estimate_delivery_end, total, discount_total, created_at', { count: 'exact' })
    .eq('user_id', profile.id)
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(from, to)

  if (q) {
    const like = `%${escLike(q)}%`
    query = query.or([
      `order_number.ilike.${like}`,
      `status.ilike.${like}`,
      `payment_status.ilike.${like}`,
      `payment_method_type.ilike.${like}`,
    ].join(','))
  }
  if (status)
    query = query.eq('status', status)

  const fromIso = dateFrom ? toStartOfDayIso(dateFrom) : null
  const toIso = dateTo ? toEndOfDayIso(dateTo) : null
  if (fromIso)
    query = query.gte('created_at', fromIso)
  if (toIso)
    query = query.lte('created_at', toIso)

  const { data, error, count } = await query

  if (error)
    throw createError({ statusCode: 500, message: error.message })

  const total = Number(count ?? 0)
  return {
    items: data ?? [],
    total,
    page,
    per_page: perPage,
    total_pages: Math.max(1, Math.ceil(total / perPage)),
  }
})
