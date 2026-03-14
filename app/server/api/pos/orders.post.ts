import { z } from 'zod'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

const bodySchema = z.object({
  user_id: z.string().uuid(),
  branch_id: z.string().uuid().optional(),
  items: z.array(z.object({
    variant_id: z.string().uuid(),
    product_name: z.string(),
    variant_name: z.string(),
    price: z.number().min(0),
    quantity: z.number().int().min(1),
  })),
  shipping_name: z.string().optional(),
  shipping_line1: z.string().optional(),
  shipping_line2: z.string().optional(),
  shipping_city: z.string().optional(),
  shipping_state: z.string().optional(),
  shipping_postal_code: z.string().optional(),
  shipping_country: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin', 'staff'])

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const subtotal = parsed.data.items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const orderNumber = 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 7)

  const supabase = await getServiceRoleClient(event)
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      user_id: parsed.data.user_id,
      branch_id: parsed.data.branch_id ?? null,
      status: 'pending',
      shipping_name: parsed.data.shipping_name ?? null,
      shipping_line1: parsed.data.shipping_line1 ?? null,
      shipping_line2: parsed.data.shipping_line2 ?? null,
      shipping_city: parsed.data.shipping_city ?? null,
      shipping_state: parsed.data.shipping_state ?? null,
      shipping_postal_code: parsed.data.shipping_postal_code ?? null,
      shipping_country: parsed.data.shipping_country ?? null,
      subtotal,
      total: subtotal,
      created_by_staff: profile.id,
    })
    .select()
    .single()

  if (orderError || !order)
    throw createError({ statusCode: 500, message: orderError?.message ?? 'Failed to create order' })

  const orderItems = parsed.data.items.map(i => ({
    order_id: order.id,
    variant_id: i.variant_id,
    product_name: i.product_name,
    variant_name: i.variant_name,
    price: i.price,
    quantity: i.quantity,
    total: i.price * i.quantity,
  }))

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
  if (itemsError)
    throw createError({ statusCode: 500, message: itemsError.message })

  return { ...order, items: orderItems }
})
