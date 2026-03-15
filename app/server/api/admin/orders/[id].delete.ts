import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'
import { applyOrderStock } from '~/server/utils/order-stock'

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin'])

  const orderId = getRouterParam(event, 'id')
  if (!orderId)
    throw createError({ statusCode: 400, message: 'Missing order id' })

  const supabase = await getServiceRoleClient(event)
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, status, stock_applied, deleted_at')
    .eq('id', orderId)
    .single()
  if (orderError || !order)
    throw createError({ statusCode: 404, message: 'Order not found' })
  if (order.deleted_at)
    throw createError({ statusCode: 400, message: 'Order already deleted' })

  if (order.stock_applied) {
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
  }

  await supabase.from('order_status_history').insert({
    order_id: orderId,
    from_status: order.status,
    to_status: 'cancelled',
    created_by: profile.id,
  })

  const { data, error } = await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      stock_applied: false,
      deleted_at: new Date().toISOString(),
      deleted_by: profile.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .is('deleted_at', null)
    .select('id, status, deleted_at, deleted_by')
    .single()

  if (error)
    throw createError({ statusCode: 500, message: error.message })
  if (!data)
    throw createError({ statusCode: 404, message: 'Order not found' })

  return {
    ok: true,
    order: data,
  }
})
