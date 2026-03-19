import { z } from 'zod'
import { defineSafeEventHandler } from '~/server/utils/api-error'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'
import { aggregateStockByVariant } from '~/server/utils/order-checkout'

const bodySchema = z.object({
  items: z.array(z.object({
    variant_id: z.string().uuid(),
    quantity: z.number().int().min(1).optional(),
  })).default([]),
})

export default defineSafeEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin', 'staff', 'member'])

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const variantIds = [...new Set(parsed.data.items.map(i => i.variant_id))]
  if (!variantIds.length)
    return { remove_variant_ids: [] as string[] }

  const supabase = await getServiceRoleClient(event)
  const { data: variants, error: variantsError } = await supabase
    .from('product_variants')
    .select('id, track_stock, products!inner(track_stock, is_active)')
    .in('id', variantIds)
    .eq('products.is_active', true)
  if (variantsError)
    throw createError({ statusCode: 500, message: variantsError.message })

  const variantById = new Map(((variants as any[]) ?? []).map(v => [v.id, v]))
  const { data: stockRows, error: stockError } = await supabase
    .from('stock')
    .select('variant_id, quantity')
    .in('variant_id', variantIds)
  if (stockError)
    throw createError({ statusCode: 500, message: stockError.message })

  const stockByVariantId = aggregateStockByVariant((stockRows as any[]) ?? [])
  const removeVariantIds: string[] = []
  for (const variantId of variantIds) {
    const variant = variantById.get(variantId)
    if (!variant) {
      removeVariantIds.push(variantId)
      continue
    }
    const effectiveTrackStock = (variant.track_stock ?? variant.products?.track_stock ?? true) !== false
    if (!effectiveTrackStock)
      continue
    if ((stockByVariantId[variantId] ?? 0) <= 0)
      removeVariantIds.push(variantId)
  }

  return { remove_variant_ids: removeVariantIds }
})
