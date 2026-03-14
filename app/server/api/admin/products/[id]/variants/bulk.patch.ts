import { z } from 'zod'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'
import { setStock } from '~/server/utils/stock'

const bodySchema = z.object({
  updates: z.array(z.object({
    variant_id: z.string().uuid(),
    price: z.number().min(0).optional(),
    stock: z.number().int().min(0).optional(),
  })),
})

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin'])

  const productId = getRouterParam(event, 'id')
  if (!productId)
    throw createError({ statusCode: 400, message: 'Missing product id' })

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const supabase = await getServiceRoleClient(event)
  const { data: product } = await supabase.from('products').select('id').eq('id', productId).single()
  if (!product)
    throw createError({ statusCode: 404, message: 'Product not found' })

  for (const u of parsed.data.updates) {
    if (u.price !== undefined) {
      const { error } = await supabase
        .from('product_variants')
        .update({ price: u.price })
        .eq('id', u.variant_id)
        .eq('product_id', productId)
      if (error)
        throw createError({ statusCode: 500, message: error.message })
    }
    if (u.stock !== undefined)
      await setStock(supabase, u.variant_id, u.stock, null, profile.id)
  }
  return { ok: true }
})
