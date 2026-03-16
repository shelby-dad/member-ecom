import { z } from 'zod'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

const bodySchema = z.object({
  payment_method_id: z.string().uuid(),
  transaction_id: z.string().trim().max(120).optional().nullable(),
})

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin', 'staff', 'member'])

  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, message: 'Missing order id' })

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const supabase = await getServiceRoleClient(event)

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, user_id, status, total')
    .eq('id', id)
    .eq('user_id', profile.id)
    .maybeSingle()

  if (orderError)
    throw createError({ statusCode: 500, message: orderError.message })
  if (!order)
    throw createError({ statusCode: 404, message: 'Order not found' })
  if (order.status !== 'pending')
    throw createError({ statusCode: 400, message: 'Payment can only be submitted for pending orders.' })

  const amount = Number(order.total ?? 0)
  if (!(amount > 0))
    throw createError({ statusCode: 400, message: 'Invalid order amount.' })

  const { data: paymentMethod, error: paymentMethodError } = await supabase
    .from('payment_methods')
    .select('id, is_active, type')
    .eq('id', parsed.data.payment_method_id)
    .maybeSingle()

  if (paymentMethodError)
    throw createError({ statusCode: 500, message: paymentMethodError.message })
  if (!paymentMethod || !paymentMethod.is_active || paymentMethod.type !== 'bank_transfer')
    throw createError({ statusCode: 400, message: 'Invalid payment method.' })

  const payload = {
    order_id: id,
    payment_method_id: parsed.data.payment_method_id,
    user_id: profile.id,
    amount,
    transaction_id: parsed.data.transaction_id?.trim() || null,
    status: 'pending' as const,
  }

  const { data, error } = await supabase
    .from('payment_submissions')
    .insert(payload)
    .select('*')
    .single()

  if (error)
    throw createError({ statusCode: 500, message: error.message })

  return data
})
