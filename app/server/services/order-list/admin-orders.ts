import { createError } from 'h3'
import { type AdminOrderSortColumn, escapeLike, isExactOrderNumber, type SortOrder } from '~/server/utils/order-query'

interface ListAdminOrdersParams {
  q: string
  status: string
  createdFrom: string
  createdTo: string
  page: number
  perPage: number
  sortBy: AdminOrderSortColumn
  sortOrder: SortOrder
}

export async function listAdminOrders(supabase: any, params: ListAdminOrdersParams) {
  const { q, status, createdFrom, createdTo, page, perPage, sortBy, sortOrder } = params
  const memberSort = sortBy === 'member_name' || sortBy === 'member_email'
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  const normalizedQ = String(q ?? '').trim()
  if (normalizedQ && isExactOrderNumber(normalizedQ)) {
    async function fetchExact(trySoftDelete = true) {
      let query = supabase
        .from('orders')
        .select('id, order_number, user_id, source, status, total, payment_status, discount_total, created_at, updated_at, shipping_name, shipping_line1, shipping_line2, shipping_city, shipping_state, shipping_postal_code, shipping_country', { count: 'exact' })
        .eq('order_number', normalizedQ.toUpperCase())

      if (trySoftDelete)
        query = query.is('deleted_at', null)
      if (status)
        query = query.eq('status', status)
      if (createdFrom)
        query = query.gte('created_at', createdFrom)
      if (createdTo)
        query = query.lte('created_at', createdTo)
      return await query.range(from, to)
    }

    let exactResult = await fetchExact(true)
    if (exactResult.error?.message?.includes('deleted_at'))
      exactResult = await fetchExact(false)
    if (exactResult.error)
      throw createError({ statusCode: 500, message: exactResult.error.message })

    const list = exactResult.data ?? []
    if (!list.length) {
      return {
        items: [],
        total: 0,
        page,
        per_page: perPage,
        total_pages: 1,
      }
    }

    const userIds = [...new Set(list.map((o: any) => o.user_id).filter(Boolean))]
    let profileMap: Record<string, { email: string, full_name: string | null }> = {}
    if (userIds.length) {
      const { data: profiles, error: profileErr } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds)
      if (profileErr)
        throw createError({ statusCode: 500, message: profileErr.message })
      profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, { email: p.email, full_name: p.full_name }]))
    }

    const items = list.map((o: any) => ({
      ...o,
      member_email: profileMap[o.user_id]?.email ?? '',
      member_name: profileMap[o.user_id]?.full_name ?? '',
    }))

    const total = Number(exactResult.count ?? items.length)
    return {
      items,
      total,
      page,
      per_page: perPage,
      total_pages: Math.max(1, Math.ceil(total / perPage)),
    }
  }

  let eligibleOrderIds: string[] | null = null
  if (normalizedQ) {
    const like = `%${escapeLike(normalizedQ)}%`

    const [memberRes, orderRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id')
        .or(`email.ilike.${like},full_name.ilike.${like}`),
      supabase
        .from('orders')
        .select('id')
        .or([
          `order_number.ilike.${like}`,
          `shipping_name.ilike.${like}`,
          `shipping_line1.ilike.${like}`,
          `shipping_line2.ilike.${like}`,
          `shipping_city.ilike.${like}`,
          `shipping_state.ilike.${like}`,
          `shipping_postal_code.ilike.${like}`,
          `shipping_country.ilike.${like}`,
        ].join(',')),
    ])

    if (memberRes.error)
      throw createError({ statusCode: 500, message: memberRes.error.message })
    if (orderRes.error)
      throw createError({ statusCode: 500, message: orderRes.error.message })

    const memberIds = (memberRes.data ?? []).map((x: any) => x.id).filter(Boolean)
    let memberOrderIds: string[] = []
    if (memberIds.length) {
      const { data, error } = await supabase.from('orders').select('id').in('user_id', memberIds)
      if (error)
        throw createError({ statusCode: 500, message: error.message })
      memberOrderIds = (data ?? []).map((x: any) => x.id).filter(Boolean)
    }

    const directOrderIds = (orderRes.data ?? []).map((x: any) => x.id).filter(Boolean)
    eligibleOrderIds = [...new Set([...directOrderIds, ...memberOrderIds])]
    if (eligibleOrderIds.length === 0) {
      return {
        items: [],
        total: 0,
        page,
        per_page: perPage,
        total_pages: 1,
      }
    }
  }

  async function fetchOrders(trySoftDelete = true, withRange = true) {
    let query = supabase
      .from('orders')
      .select('id, order_number, user_id, source, status, total, payment_status, discount_total, created_at, updated_at, shipping_name, shipping_line1, shipping_line2, shipping_city, shipping_state, shipping_postal_code, shipping_country', { count: 'exact' })

    if (trySoftDelete)
      query = query.is('deleted_at', null)
    if (status)
      query = query.eq('status', status)
    if (createdFrom)
      query = query.gte('created_at', createdFrom)
    if (createdTo)
      query = query.lte('created_at', createdTo)
    if (eligibleOrderIds != null)
      query = query.in('id', eligibleOrderIds)

    if (!memberSort)
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })
    if (withRange)
      query = query.range(from, to)
    return await query
  }

  let result = await fetchOrders(true, !memberSort)
  if (result.error?.message?.includes('deleted_at'))
    result = await fetchOrders(false, !memberSort)
  if (result.error)
    throw createError({ statusCode: 500, message: result.error.message })

  const list = result.data ?? []
  if (list.length === 0) {
    return {
      items: [],
      total: result.count ?? 0,
      page,
      per_page: perPage,
      total_pages: Math.max(1, Math.ceil((result.count ?? 0) / perPage)),
    }
  }

  const userIds = [...new Set(list.map((o: any) => o.user_id).filter(Boolean))]
  let profileMap: Record<string, { email: string, full_name: string | null }> = {}
  if (userIds.length) {
    const { data: profiles, error: profileErr } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds)
    if (profileErr)
      throw createError({ statusCode: 500, message: profileErr.message })
    profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, { email: p.email, full_name: p.full_name }]))
  }

  let items = list.map((o: any) => ({
    ...o,
    member_email: profileMap[o.user_id]?.email ?? '',
    member_name: profileMap[o.user_id]?.full_name ?? '',
  }))

  if (memberSort) {
    const key = sortBy === 'member_email' ? 'member_email' : 'member_name'
    items = [...items].sort((a: any, b: any) => {
      const left = String(a?.[key] ?? '').toLowerCase()
      const right = String(b?.[key] ?? '').toLowerCase()
      if (left === right)
        return 0
      return sortOrder === 'asc' ? (left < right ? -1 : 1) : (left > right ? -1 : 1)
    })
    items = items.slice(from, to + 1)
  }

  const total = result.count ?? 0
  return {
    items,
    total,
    page,
    per_page: perPage,
    total_pages: Math.max(1, Math.ceil(total / perPage)),
  }
}
