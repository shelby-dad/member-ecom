import type { H3Event } from 'h3'
import { getServiceRoleClient } from '~/server/utils/supabase'

interface OrderRow {
  id: string
  user_id: string
  status: string
  total: number
  payment_status: string | null
  payment_method_type: string | null
  source: string | null
  discount_total: number
  promo_id: string | null
  created_at: string
}

interface OrderItemRow {
  order_id: string
  product_name: string
  variant_name: string
  quantity: number
  total: number
}

interface ProfileRow {
  id: string
  created_at: string
}

interface VariantRow {
  id: string
  name: string
  track_stock: boolean
  products: {
    name: string
    track_stock: boolean
  } | null
}

interface StockRow {
  variant_id: string
  quantity: number
}

interface ChatThreadRow {
  id: string
  member_id: string
  assigned_to: string | null
  status: 'open' | 'banned'
  created_at: string
  banned_at: string | null
}

interface ChatMessageRow {
  thread_id: string
  sender_id: string
  created_at: string
  read_at: string | null
}

export interface DashboardSeriesPoint {
  label: string
  value: number
}

export interface DashboardDualSeriesPoint {
  label: string
  left: number
  right: number
}

export interface DashboardTopItem {
  label: string
  quantity: number
  revenue: number
}

export interface AdminDashboardAnalytics {
  range_days: number
  generated_at: string
  kpis: {
    total_revenue: number
    total_orders: number
    average_order_value: number
    paid_rate_percent: number
  }
  sales_trend: DashboardSeriesPoint[]
  orders_by_status: DashboardSeriesPoint[]
  payment_method_mix: Array<{ label: string; total: number; paid: number; pending: number }>
  source_trend: DashboardDualSeriesPoint[]
  top_products: DashboardTopItem[]
  top_variants: DashboardTopItem[]
  inventory_risk: {
    tracked_variants: number
    low_stock: number
    out_of_stock: number
    rows: Array<{ label: string; quantity: number }>
  }
  discount_impact: {
    by_day: DashboardSeriesPoint[]
    by_promotion: DashboardSeriesPoint[]
  }
  member_activity: {
    new_members_by_day: DashboardSeriesPoint[]
    buyers: number
    repeat_buyers: number
    repeat_ratio_percent: number
  }
  chat: {
    kpis: {
      open_conversations: number
      unassigned_conversations: number
      flagged_conversations: number
      avg_first_response_minutes: number
      p50_first_response_minutes: number
      p90_first_response_minutes: number
    }
    conversations_trend: DashboardDualSeriesPoint[]
    response_time_by_day: DashboardSeriesPoint[]
    queue_status: DashboardSeriesPoint[]
    operator_workload: DashboardSeriesPoint[]
  }
}

const ORDER_STATUS_ORDER = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
const PAYMENT_TYPE_ORDER = ['cash', 'bank_transfer', 'wallet', 'cod']
const DAY_MS = 86_400_000

function toDayKey(value: string | Date) {
  const d = new Date(value)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function toShortLabel(dayKey: string) {
  const d = new Date(`${dayKey}T00:00:00.000Z`)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function buildDayKeys(days: number) {
  const list: string[] = []
  const now = Date.now()
  for (let i = days - 1; i >= 0; i -= 1) {
    list.push(toDayKey(new Date(now - (i * DAY_MS))))
  }
  return list
}

function chunk<T>(items: T[], size: number) {
  const list: T[][] = []
  for (let i = 0; i < items.length; i += size)
    list.push(items.slice(i, i + size))
  return list
}

function toNumber(value: unknown) {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}

function round2(value: number) {
  return Math.round(value * 100) / 100
}

function percentile(sortedValues: number[], p: number) {
  if (!sortedValues.length)
    return 0
  if (sortedValues.length === 1)
    return sortedValues[0]
  const index = Math.ceil((p / 100) * sortedValues.length) - 1
  const bounded = Math.min(Math.max(index, 0), sortedValues.length - 1)
  return sortedValues[bounded]
}

async function buildChatAnalytics(
  supabase: Awaited<ReturnType<typeof getServiceRoleClient>>,
  dayKeys: string[],
  startIso: string,
) {
  const { data: chatThreadsRaw, error: chatThreadsErr } = await supabase
    .from('chat_threads')
    .select('id, member_id, assigned_to, status, created_at, banned_at')
  if (chatThreadsErr)
    throw createError({ statusCode: 500, message: chatThreadsErr.message })
  const chatThreads = (chatThreadsRaw ?? []) as ChatThreadRow[]

  const openConversations = chatThreads.filter(t => t.status !== 'banned').length
  const unassignedConversations = chatThreads.filter(t => t.status !== 'banned' && !t.assigned_to).length
  const flaggedConversations = chatThreads.filter(t => t.status === 'banned').length

  const newMap = Object.fromEntries(dayKeys.map(k => [k, 0])) as Record<string, number>
  const flaggedMap = Object.fromEntries(dayKeys.map(k => [k, 0])) as Record<string, number>
  for (const thread of chatThreads) {
    const createdDay = toDayKey(thread.created_at)
    if (newMap[createdDay] !== undefined)
      newMap[createdDay] += 1
    if (thread.banned_at) {
      const bannedDay = toDayKey(thread.banned_at)
      if (flaggedMap[bannedDay] !== undefined)
        flaggedMap[bannedDay] += 1
    }
  }

  const scopedThreadIds = chatThreads
    .filter(thread => new Date(thread.created_at).getTime() >= new Date(startIso).getTime())
    .map(thread => thread.id)
  const scopedThreadSet = new Set(scopedThreadIds)
  const threadById = new Map(chatThreads.map(thread => [thread.id, thread] as const))

  const messages: ChatMessageRow[] = []
  for (const ids of chunk(scopedThreadIds, 200)) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('thread_id, sender_id, created_at, read_at')
      .in('thread_id', ids)
      .order('created_at', { ascending: true })
    if (error)
      throw createError({ statusCode: 500, message: error.message })
    messages.push(...((data ?? []) as ChatMessageRow[]))
  }

  const firstMemberAtByThread = new Map<string, number>()
  const firstOperatorReplyAtByThread = new Map<string, number>()
  const unreadMemberByThread = new Map<string, number>()

  for (const message of messages) {
    const thread = threadById.get(String(message.thread_id))
    if (!thread)
      continue
    const createdAtMs = new Date(message.created_at).getTime()
    const isMemberMessage = String(message.sender_id) === String(thread.member_id)

    if (isMemberMessage && !firstMemberAtByThread.has(thread.id))
      firstMemberAtByThread.set(thread.id, createdAtMs)

    if (!isMemberMessage) {
      const firstMemberAt = firstMemberAtByThread.get(thread.id)
      if (firstMemberAt && createdAtMs >= firstMemberAt && !firstOperatorReplyAtByThread.has(thread.id))
        firstOperatorReplyAtByThread.set(thread.id, createdAtMs)
    }

    if (thread.assigned_to && isMemberMessage && !message.read_at)
      unreadMemberByThread.set(thread.id, (unreadMemberByThread.get(thread.id) ?? 0) + 1)
  }

  const responseMinutesByThread = new Map<string, number>()
  for (const threadId of scopedThreadIds) {
    const firstMemberAt = firstMemberAtByThread.get(threadId)
    const firstReplyAt = firstOperatorReplyAtByThread.get(threadId)
    if (!firstMemberAt || !firstReplyAt || firstReplyAt < firstMemberAt)
      continue
    const minutes = (firstReplyAt - firstMemberAt) / 60_000
    if (Number.isFinite(minutes) && minutes >= 0)
      responseMinutesByThread.set(threadId, round2(minutes))
  }

  const responseValues = [...responseMinutesByThread.values()].sort((a, b) => a - b)
  const avgFirstResponse = responseValues.length
    ? round2(responseValues.reduce((sum, value) => sum + value, 0) / responseValues.length)
    : 0
  const p50FirstResponse = round2(percentile(responseValues, 50))
  const p90FirstResponse = round2(percentile(responseValues, 90))

  const responseByDayMap = Object.fromEntries(dayKeys.map(k => [k, { total: 0, count: 0 }])) as Record<string, { total: number; count: number }>
  for (const [threadId, minutes] of responseMinutesByThread.entries()) {
    const thread = threadById.get(threadId)
    if (!thread)
      continue
    const day = toDayKey(thread.created_at)
    if (!responseByDayMap[day])
      continue
    responseByDayMap[day].total += minutes
    responseByDayMap[day].count += 1
  }

  const { data: operatorRows, error: operatorErr } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .in('role', ['staff', 'admin', 'superadmin'])
    .eq('status', 'active')
  if (operatorErr)
    throw createError({ statusCode: 500, message: operatorErr.message })

  const workloadMap = new Map<string, { label: string; active: number; unread: number }>()
  for (const operator of operatorRows ?? []) {
    const id = String((operator as any).id ?? '')
    if (!id)
      continue
    const label = String((operator as any).full_name ?? '').trim()
      || String((operator as any).email ?? '').trim()
      || 'Operator'
    workloadMap.set(id, { label, active: 0, unread: 0 })
  }

  for (const thread of chatThreads) {
    if (!thread.assigned_to || !workloadMap.has(String(thread.assigned_to)))
      continue
    if (thread.status !== 'banned')
      workloadMap.get(String(thread.assigned_to))!.active += 1
    if (scopedThreadSet.has(thread.id))
      workloadMap.get(String(thread.assigned_to))!.unread += unreadMemberByThread.get(thread.id) ?? 0
  }

  return {
    kpis: {
      open_conversations: openConversations,
      unassigned_conversations: unassignedConversations,
      flagged_conversations: flaggedConversations,
      avg_first_response_minutes: avgFirstResponse,
      p50_first_response_minutes: p50FirstResponse,
      p90_first_response_minutes: p90FirstResponse,
    },
    conversations_trend: dayKeys.map(day => ({
      label: toShortLabel(day),
      left: newMap[day],
      right: flaggedMap[day],
    })),
    response_time_by_day: dayKeys.map(day => ({
      label: toShortLabel(day),
      value: responseByDayMap[day].count ? round2(responseByDayMap[day].total / responseByDayMap[day].count) : 0,
    })),
    queue_status: [
      { label: 'Assigned', value: Math.max(0, openConversations - unassignedConversations) },
      { label: 'Unassigned', value: unassignedConversations },
      { label: 'Flagged', value: flaggedConversations },
    ],
    operator_workload: [...workloadMap.values()]
      .map(row => ({
        label: row.unread > 0 ? `${row.label} (${row.unread} unread)` : row.label,
        value: row.active,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10),
  }
}

export async function getAdminDashboardAnalytics(event: H3Event, rangeDays: number): Promise<AdminDashboardAnalytics> {
  const supabase = await getServiceRoleClient(event)
  const dayKeys = buildDayKeys(rangeDays)
  const startIso = new Date(`${dayKeys[0]}T00:00:00.000Z`).toISOString()

  const { data: ordersData, error: ordersError } = await supabase
    .from('orders')
    .select('id, user_id, status, total, payment_status, payment_method_type, source, discount_total, promo_id, created_at')
    .is('deleted_at', null)
    .gte('created_at', startIso)

  if (ordersError)
    throw createError({ statusCode: 500, message: ordersError.message })

  const orders = (ordersData ?? []) as OrderRow[]
  const orderIds = orders.map(o => o.id)

  const itemRows: OrderItemRow[] = []
  for (const ids of chunk(orderIds, 200)) {
    const { data, error } = await supabase
      .from('order_items')
      .select('order_id, product_name, variant_name, quantity, total')
      .in('order_id', ids)
    if (error)
      throw createError({ statusCode: 500, message: error.message })
    itemRows.push(...((data ?? []) as OrderItemRow[]))
  }

  const salesMap = Object.fromEntries(dayKeys.map(k => [k, 0])) as Record<string, number>
  const countMap = Object.fromEntries(dayKeys.map(k => [k, 0])) as Record<string, number>
  const discountDayMap = Object.fromEntries(dayKeys.map(k => [k, 0])) as Record<string, number>
  const sourceMap = Object.fromEntries(dayKeys.map(k => [k, { left: 0, right: 0 }])) as Record<string, { left: number; right: number }>

  const statusCounter = new Map<string, number>()
  const paymentCounter = new Map<string, { total: number; paid: number; pending: number }>()
  const promoTotals = new Map<string, number>()

  let totalRevenue = 0
  let paidOrders = 0

  for (const order of orders) {
    const day = toDayKey(order.created_at)
    if (salesMap[day] !== undefined) {
      salesMap[day] += toNumber(order.total)
      countMap[day] += 1
      discountDayMap[day] += toNumber(order.discount_total)
      const source = (order.source ?? 'Member Order') === 'POS Order' ? 'POS Order' : 'Member Order'
      if (source === 'Member Order')
        sourceMap[day].left += 1
      else
        sourceMap[day].right += 1
    }

    totalRevenue += toNumber(order.total)
    if ((order.payment_status ?? 'pending') === 'paid')
      paidOrders += 1

    statusCounter.set(order.status, (statusCounter.get(order.status) ?? 0) + 1)
    const paymentType = order.payment_method_type ?? 'unknown'
    const current = paymentCounter.get(paymentType) ?? { total: 0, paid: 0, pending: 0 }
    current.total += 1
    if ((order.payment_status ?? 'pending') === 'paid')
      current.paid += 1
    else
      current.pending += 1
    paymentCounter.set(paymentType, current)

    if (order.promo_id && toNumber(order.discount_total) > 0)
      promoTotals.set(order.promo_id, (promoTotals.get(order.promo_id) ?? 0) + toNumber(order.discount_total))
  }

  const productAgg = new Map<string, { quantity: number; revenue: number }>()
  const variantAgg = new Map<string, { quantity: number; revenue: number }>()
  for (const row of itemRows) {
    const productKey = row.product_name
    const variantKey = `${row.product_name} / ${row.variant_name}`

    const p = productAgg.get(productKey) ?? { quantity: 0, revenue: 0 }
    p.quantity += toNumber(row.quantity)
    p.revenue += toNumber(row.total)
    productAgg.set(productKey, p)

    const v = variantAgg.get(variantKey) ?? { quantity: 0, revenue: 0 }
    v.quantity += toNumber(row.quantity)
    v.revenue += toNumber(row.total)
    variantAgg.set(variantKey, v)
  }

  const promoIds = [...promoTotals.keys()]
  const promoNameById = new Map<string, string>()
  if (promoIds.length) {
    const { data: promos, error: promoErr } = await supabase
      .from('promotions')
      .select('id, name')
      .in('id', promoIds)
    if (promoErr)
      throw createError({ statusCode: 500, message: promoErr.message })
    for (const promo of promos ?? [])
      promoNameById.set(String((promo as any).id), String((promo as any).name ?? 'Promotion'))
  }

  const { data: variantsData, error: variantsError } = await supabase
    .from('product_variants')
    .select('id, name, track_stock, products(name, track_stock)')

  if (variantsError)
    throw createError({ statusCode: 500, message: variantsError.message })

  const { data: stockData, error: stockError } = await supabase
    .from('stock')
    .select('variant_id, quantity')

  if (stockError)
    throw createError({ statusCode: 500, message: stockError.message })

  const qtyByVariant = new Map<string, number>()
  for (const row of (stockData ?? []) as StockRow[]) {
    qtyByVariant.set(row.variant_id, (qtyByVariant.get(row.variant_id) ?? 0) + toNumber(row.quantity))
  }

  let trackedVariants = 0
  let lowStock = 0
  let outOfStock = 0
  const riskRows: Array<{ label: string; quantity: number }> = []

  for (const row of (variantsData ?? []) as VariantRow[]) {
    const variantTracked = row.track_stock !== false && row.products?.track_stock !== false
    if (!variantTracked)
      continue
    trackedVariants += 1
    const quantity = toNumber(qtyByVariant.get(row.id) ?? 0)
    if (quantity <= 0)
      outOfStock += 1
    else if (quantity <= 5)
      lowStock += 1
    if (quantity <= 5) {
      riskRows.push({
        label: `${row.products?.name ?? 'Product'} / ${row.name}`,
        quantity,
      })
    }
  }

  riskRows.sort((a, b) => a.quantity - b.quantity)

  const { data: membersData, error: membersError } = await supabase
    .from('profiles')
    .select('id, created_at')
    .eq('role', 'member')
    .gte('created_at', startIso)
  if (membersError)
    throw createError({ statusCode: 500, message: membersError.message })

  const newMembersMap = Object.fromEntries(dayKeys.map(k => [k, 0])) as Record<string, number>
  for (const member of (membersData ?? []) as ProfileRow[]) {
    const day = toDayKey(member.created_at)
    if (newMembersMap[day] !== undefined)
      newMembersMap[day] += 1
  }

  const { data: buyerRows, error: buyersError } = await supabase
    .from('orders')
    .select('user_id')
    .is('deleted_at', null)
  if (buyersError)
    throw createError({ statusCode: 500, message: buyersError.message })

  const buyerCount = new Map<string, number>()
  for (const row of buyerRows ?? []) {
    const uid = String((row as any).user_id ?? '')
    if (!uid) continue
    buyerCount.set(uid, (buyerCount.get(uid) ?? 0) + 1)
  }
  const buyers = [...buyerCount.keys()].length
  const repeatBuyers = [...buyerCount.values()].filter(v => v >= 2).length
  const chat = await buildChatAnalytics(supabase, dayKeys, startIso)

  return {
    range_days: rangeDays,
    generated_at: new Date().toISOString(),
    kpis: {
      total_revenue: round2(totalRevenue),
      total_orders: orders.length,
      average_order_value: orders.length ? round2(totalRevenue / orders.length) : 0,
      paid_rate_percent: orders.length ? round2((paidOrders / orders.length) * 100) : 0,
    },
    sales_trend: dayKeys.map(day => ({
      label: toShortLabel(day),
      value: round2(salesMap[day]),
    })),
    orders_by_status: ORDER_STATUS_ORDER
      .map(status => ({ label: status, value: statusCounter.get(status) ?? 0 }))
      .filter(item => item.value > 0),
    payment_method_mix: [...PAYMENT_TYPE_ORDER, ...[...paymentCounter.keys()].filter(t => !PAYMENT_TYPE_ORDER.includes(t))]
      .filter(type => paymentCounter.has(type))
      .map(type => {
        const row = paymentCounter.get(type) ?? { total: 0, paid: 0, pending: 0 }
        return { label: type, ...row }
      }),
    source_trend: dayKeys.map(day => ({
      label: toShortLabel(day),
      left: sourceMap[day].left,
      right: sourceMap[day].right,
    })),
    top_products: [...productAgg.entries()]
      .map(([label, agg]) => ({ label, quantity: agg.quantity, revenue: round2(agg.revenue) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8),
    top_variants: [...variantAgg.entries()]
      .map(([label, agg]) => ({ label, quantity: agg.quantity, revenue: round2(agg.revenue) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8),
    inventory_risk: {
      tracked_variants: trackedVariants,
      low_stock: lowStock,
      out_of_stock: outOfStock,
      rows: riskRows.slice(0, 8),
    },
    discount_impact: {
      by_day: dayKeys.map(day => ({
        label: toShortLabel(day),
        value: round2(discountDayMap[day]),
      })),
      by_promotion: [...promoTotals.entries()]
        .map(([promoId, value]) => ({
          label: promoNameById.get(promoId) ?? 'Promotion',
          value: round2(value),
        }))
        .sort((a, b) => b.value - a.value),
    },
    member_activity: {
      new_members_by_day: dayKeys.map(day => ({
        label: toShortLabel(day),
        value: newMembersMap[day],
      })),
      buyers,
      repeat_buyers: repeatBuyers,
      repeat_ratio_percent: buyers ? round2((repeatBuyers / buyers) * 100) : 0,
    },
    chat,
  }
}
