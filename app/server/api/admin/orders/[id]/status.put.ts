import { z } from 'zod'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'
import { applyOrderStock } from '~/server/utils/order-stock'

const bodySchema = z.object({
  status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']),
  estimate_delivery_start: z.string().optional().nullable(),
  estimate_delivery_end: z.string().optional().nullable(),
})

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin', 'staff'])

  const orderId = getRouterParam(event, 'id')
  if (!orderId)
    throw createError({ statusCode: 400, message: 'Missing order id' })

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const supabase = await getServiceRoleClient(event)
  const { data: order } = await supabase
    .from('orders')
    .select('status, deleted_at, stock_applied')
    .eq('id', orderId)
    .single()
  if (!order)
    throw createError({ statusCode: 404, message: 'Order not found' })
  if (order.deleted_at)
    throw createError({ statusCode: 400, message: 'Cannot update a deleted order' })

  let nextStockApplied = Boolean(order.stock_applied)
  if (parsed.data.status === 'cancelled' && order.stock_applied) {
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('variant_id, quantity, track_stock')
      .eq('order_id', orderId)
    if (itemsError)
      throw createError({ statusCode: 500, message: itemsError.message })
    await applyOrderStock(supabase, {
      orderId,
      actorId: profile.id,
      items: (items as any[]) ?? [],
      action: 'restore',
    })
    nextStockApplied = false
  }
  else if (order.status === 'cancelled' && parsed.data.status !== 'cancelled' && !order.stock_applied) {
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('variant_id, quantity, track_stock')
      .eq('order_id', orderId)
    if (itemsError)
      throw createError({ statusCode: 500, message: itemsError.message })
    try {
      await applyOrderStock(supabase, {
        orderId,
        actorId: profile.id,
        items: (items as any[]) ?? [],
        action: 'reserve',
      })
      nextStockApplied = true
    }
    catch (e: any) {
      throw createError({ statusCode: 409, message: e?.message ?? 'Failed to reserve stock while changing status' })
    }
  }

  await supabase.from('order_status_history').insert({
    order_id: orderId,
    from_status: order.status,
    to_status: parsed.data.status,
    created_by: profile.id,
  })

  const updates: Record<string, unknown> = { status: parsed.data.status, stock_applied: nextStockApplied }
  if (parsed.data.status === 'shipped') {
    updates.estimate_delivery_start = parsed.data.estimate_delivery_start || null
    updates.estimate_delivery_end = parsed.data.estimate_delivery_end || null
  } else {
    updates.estimate_delivery_start = null
    updates.estimate_delivery_end = null
  }

  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .select()
    .single()

  if (error)
    throw createError({ statusCode: 500, message: error.message })
  return data
})
