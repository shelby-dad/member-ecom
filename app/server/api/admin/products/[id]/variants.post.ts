import { z } from 'zod'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'
import { generateVariantSku } from '~/server/utils/product-variants'
import { ensureStockRow } from '~/server/utils/stock'

const bodySchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  price: z.number().min(0),
  compare_at_price: z.number().min(0).optional().nullable(),
  track_stock: z.boolean().optional(),
  option_values: z.record(z.string(), z.string()).optional(),
  sort_order: z.number().int().optional(),
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
  const { data: product } = await supabase.from('products').select('slug, track_stock').eq('id', productId).single()
  if (!product)
    throw createError({ statusCode: 404, message: 'Product not found' })

  const { data, error } = await supabase
    .from('product_variants')
    .insert({
      product_id: productId,
      name: parsed.data.name,
      sku: parsed.data.sku?.trim() || generateVariantSku(product.slug, parsed.data.option_values ?? null),
      price: parsed.data.price,
      compare_at_price: parsed.data.compare_at_price ?? null,
      track_stock: parsed.data.track_stock ?? product.track_stock ?? true,
      option_values: parsed.data.option_values ?? null,
      sort_order: parsed.data.sort_order ?? 0,
    })
    .select()
    .single()

  if (error)
    throw createError({ statusCode: 500, message: error.message })
  await ensureStockRow(supabase, data.id, 0)
  return data
})
