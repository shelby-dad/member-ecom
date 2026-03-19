import { z } from 'zod'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

const bodySchema = z.object({
  variant_ids: z.array(z.string().uuid()).min(1),
})

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin', 'staff'])

  const productId = getRouterParam(event, 'id')
  if (!productId)
    throw createError({ statusCode: 400, message: 'Missing product id' })

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const supabase = await getServiceRoleClient(event)
  const { data: product } = await supabase
    .from('products')
    .select('id')
    .eq('id', productId)
    .maybeSingle()

  if (!product?.id)
    throw createError({ statusCode: 404, message: 'Product not found' })

  const { error } = await supabase
    .from('product_variants')
    .delete()
    .eq('product_id', productId)
    .in('id', parsed.data.variant_ids)

  if (error)
    throw createError({ statusCode: 400, message: error.message })

  return { ok: true }
})
