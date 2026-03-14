import { z } from 'zod'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

const bodySchema = z.object({
  status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']),
})

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin'])

  const orderId = getRouterParam(event, 'id')
  if (!orderId)
    throw createError({ statusCode: 400, message: 'Missing order id' })

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const supabase = await getServiceRoleClient(event)
  const { data: order } = await supabase.from('orders').select('status').eq('id', orderId).single()
  if (!order)
    throw createError({ statusCode: 404, message: 'Order not found' })

  await supabase.from('order_status_history').insert({
    order_id: orderId,
    from_status: order.status,
    to_status: parsed.data.status,
    created_by: profile.id,
  })

  const { data, error } = await supabase
    .from('orders')
    .update({ status: parsed.data.status })
    .eq('id', orderId)
    .select()
    .single()

  if (error)
    throw createError({ statusCode: 500, message: error.message })
  return data
})
