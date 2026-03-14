import { z } from 'zod'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

const bodySchema = z.object({
  path: z.string().min(1),
  variant_id: z.string().uuid().optional().nullable(),
  alt: z.string().optional(),
  sort_order: z.number().int().optional(),
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

  const { data: maxOrder } = await supabase
    .from('product_images')
    .select('sort_order')
    .eq('product_id', productId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const sortOrder = parsed.data.sort_order ?? (maxOrder?.sort_order ?? -1) + 1

  const { data, error } = await supabase
    .from('product_images')
    .insert({
      product_id: productId,
      path: parsed.data.path,
      variant_id: parsed.data.variant_id ?? null,
      alt: parsed.data.alt ?? null,
      sort_order: sortOrder,
    })
    .select()
    .single()

  if (error)
    throw createError({ statusCode: 500, message: error.message })
  return data
})
