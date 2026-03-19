import { createError } from 'h3'
import { escapeLike, isExactOrderNumber, type MemberOrderSortColumn, type SortOrder } from '~/server/utils/order-query'

interface ListMemberOrdersParams {
  userId: string
  q: string
  status: string
  fromIso: string | null
  toIso: string | null
  page: number
  perPage: number
  sortBy: MemberOrderSortColumn
  sortOrder: SortOrder
}

export async function listMemberOrders(supabase: any, params: ListMemberOrdersParams) {
  const { userId, q, status, fromIso, toIso, page, perPage, sortBy, sortOrder } = params
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  let baseQuery = supabase
    .from('orders')
    .select('id, order_number, status, payment_status, payment_method_type, estimate_delivery_start, estimate_delivery_end, total, discount_total, created_at', { count: 'exact' })
    .eq('user_id', userId)

  if (status)
    baseQuery = baseQuery.eq('status', status)
  if (fromIso)
    baseQuery = baseQuery.gte('created_at', fromIso)
  if (toIso)
    baseQuery = baseQuery.lte('created_at', toIso)

  if (!q) {
    const { data, error, count } = await baseQuery
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to)

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
  }

  const normalized = q.toUpperCase()
  if (isExactOrderNumber(normalized)) {
    const { data, error } = await baseQuery
      .eq('order_number', normalized)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to)
    if (error)
      throw createError({ statusCode: 500, message: error.message })
    const items = data ?? []
    const total = items.length
    return {
      items,
      total,
      page,
      per_page: perPage,
      total_pages: Math.max(1, Math.ceil(total / perPage)),
    }
  }

  const { data: baseOrders, error: baseError } = await baseQuery
  if (baseError)
    throw createError({ statusCode: 500, message: baseError.message })

  let filtered = (baseOrders ?? []) as any[]
  const keyword = q.toLowerCase()
  const ids = filtered.map(order => String(order.id)).filter(Boolean)
  const matchedByItem = new Set<string>()

  if (ids.length) {
    const like = `%${escapeLike(keyword)}%`
    const { data: itemRows, error: itemError } = await supabase
      .from('order_items')
      .select('order_id')
      .in('order_id', ids)
      .or(`product_name.ilike.${like},variant_name.ilike.${like}`)
    if (itemError)
      throw createError({ statusCode: 500, message: itemError.message })
    for (const row of (itemRows ?? []) as any[]) {
      const id = String(row.order_id ?? '')
      if (id)
        matchedByItem.add(id)
    }
  }

  filtered = filtered.filter((order) => {
    const orderText = [
      order.order_number,
      order.status,
      order.payment_status,
      order.payment_method_type,
    ].map(value => String(value ?? '').toLowerCase()).join(' ')
    if (orderText.includes(keyword))
      return true
    return matchedByItem.has(String(order.id))
  })

  const sorted = filtered.sort((a, b) => {
    const av = a?.[sortBy]
    const bv = b?.[sortBy]
    let cmp = 0

    if (sortBy === 'total' || sortBy === 'discount_total') {
      const an = Number(av ?? 0)
      const bn = Number(bv ?? 0)
      cmp = an < bn ? -1 : an > bn ? 1 : 0
    }
    else if (sortBy === 'created_at') {
      const at = new Date(String(av ?? '')).getTime()
      const bt = new Date(String(bv ?? '')).getTime()
      cmp = at < bt ? -1 : at > bt ? 1 : 0
    }
    else {
      const as = String(av ?? '').toLowerCase()
      const bs = String(bv ?? '').toLowerCase()
      cmp = as.localeCompare(bs)
    }

    return sortOrder === 'asc' ? cmp : -cmp
  })

  const total = sorted.length
  const items = sorted.slice(from, to + 1)
  return {
    items,
    total,
    page,
    per_page: perPage,
    total_pages: Math.max(1, Math.ceil(total / perPage)),
  }
}
