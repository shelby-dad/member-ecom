import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin', 'staff', 'member'])

  const orderId = getRouterParam(event, 'id')
  if (!orderId)
    throw createError({ statusCode: 400, message: 'Missing order id' })

  const supabase = await getServiceRoleClient(event)

  let orderQuery = supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)

  if (profile.role === 'member')
    orderQuery = orderQuery.eq('user_id', profile.id)

  const { data: order, error: orderError } = await orderQuery.maybeSingle()

  if (orderError)
    throw createError({ statusCode: 500, message: orderError.message })
  if (!order)
    throw createError({ statusCode: 404, message: 'Order not found' })

  const [itemsRes, submissionsRes, memberRes] = await Promise.all([
    supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true }),
    supabase
      .from('payment_submissions')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('id, full_name, email, mobile_number')
      .eq('id', order.user_id)
      .maybeSingle(),
  ])

  if (itemsRes.error)
    throw createError({ statusCode: 500, message: itemsRes.error.message })
  if (submissionsRes.error)
    throw createError({ statusCode: 500, message: submissionsRes.error.message })
  if (memberRes.error)
    throw createError({ statusCode: 500, message: memberRes.error.message })

  return {
    order,
    items: itemsRes.data ?? [],
    submissions: submissionsRes.data ?? [],
    member: memberRes.data ?? null,
  }
})
