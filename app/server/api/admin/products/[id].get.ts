import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin'])

  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, message: 'Missing id' })

  const supabase = await getServiceRoleClient(event)
  const { data: product, error: productError } = await supabase.from('products').select('*').eq('id', id).single()
  if (productError || !product)
    throw createError({ statusCode: 404, message: 'Product not found' })

  const { data: variants } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', id)
    .order('sort_order', { ascending: true })

  const { data: stockRows } = await supabase
    .from('stock')
    .select('variant_id, quantity, branch_id')
    .in('variant_id', (variants ?? []).map((v: { id: string }) => v.id))

  const stockByVariant: Record<string, number> = {}
  for (const row of stockRows ?? []) {
    if (row.branch_id == null)
      stockByVariant[row.variant_id] = row.quantity
    else if (stockByVariant[row.variant_id] == null)
      stockByVariant[row.variant_id] = 0
    stockByVariant[row.variant_id] += row.quantity
  }

  const variantsWithStock = (variants ?? []).map((v: any) => ({
    ...v,
    stock: stockByVariant[v.id] ?? 0,
  }))

  const { data: images } = await supabase
    .from('product_images')
    .select('*')
    .eq('product_id', id)
    .order('sort_order', { ascending: true })

  return {
    ...product,
    variants: variantsWithStock,
    images: images ?? [],
  }
})
