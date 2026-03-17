import { z } from 'zod'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

const querySchema = z.object({
  code: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin', 'staff'])

  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const barcode = parsed.data.code.trim()
  const supabase = await getServiceRoleClient(event)

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, name, has_variants, track_stock, option_sets, is_active')
    .eq('barcode', barcode)
    .eq('is_active', true)
    .maybeSingle()
  if (productError)
    throw createError({ statusCode: 500, message: productError.message })
  if (!product)
    throw createError({ statusCode: 404, message: 'No active product found for this barcode.' })

  const { data: variants, error: variantsError } = await supabase
    .from('product_variants')
    .select('id, name, price, track_stock, sort_order')
    .eq('product_id', product.id)
    .order('sort_order', { ascending: true })
  if (variantsError)
    throw createError({ statusCode: 500, message: variantsError.message })

  const filtered = (variants ?? []).filter((v: any) => !product.has_variants || Number(v.price ?? 0) > 0)
  if (!filtered.length)
    throw createError({ statusCode: 404, message: 'No purchasable variant found for this barcode product.' })

  const variantIds = filtered.map((v: any) => v.id)
  const { data: stockRows, error: stockError } = await supabase
    .from('stock')
    .select('variant_id, quantity')
    .in('variant_id', variantIds)
  if (stockError)
    throw createError({ statusCode: 500, message: stockError.message })

  const stockByVariant: Record<string, number> = {}
  for (const row of stockRows ?? [])
    stockByVariant[row.variant_id] = (stockByVariant[row.variant_id] ?? 0) + Number(row.quantity ?? 0)

  const normalized = filtered.map((v: any) => ({
    id: v.id,
    name: v.name,
    price: Number(v.price ?? 0),
    track_stock: (v.track_stock ?? product.track_stock ?? true) !== false,
    available_stock: stockByVariant[v.id] ?? 0,
    products: {
      id: product.id,
      name: product.name,
      has_variants: product.has_variants,
      track_stock: product.track_stock,
      option_sets: product.option_sets,
    },
  }))
  return {
    product: {
      id: product.id,
      name: product.name,
      has_variants: product.has_variants,
      track_stock: product.track_stock,
      option_sets: product.option_sets,
    },
    variants: normalized,
  }
})
