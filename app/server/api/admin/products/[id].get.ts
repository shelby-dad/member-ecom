import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin', 'staff'])

  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, message: 'Missing id' })

  const supabase = await getServiceRoleClient(event)
  const { data: product, error: productError } = await supabase.from('products').select('*').eq('id', id).single()
  if (productError || !product)
    throw createError({ statusCode: 404, message: 'Product not found' })
  if (profile.role !== 'superadmin' && !product.is_active)
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
    stockByVariant[row.variant_id] = (stockByVariant[row.variant_id] ?? 0) + Number(row.quantity ?? 0)
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

  const [catRes, tagRes, brandRes] = await Promise.all([
    supabase.from('product_categories').select('category_id').eq('product_id', id),
    supabase.from('product_tags').select('tag_id').eq('product_id', id),
    product.brand_id
      ? supabase.from('brands').select('id, name, slug, image_path, is_active').eq('id', product.brand_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  return {
    ...product,
    brand: brandRes.data ?? null,
    category_ids: (catRes.data ?? []).map((x: any) => x.category_id),
    tag_ids: (tagRes.data ?? []).map((x: any) => x.tag_id),
    variants: variantsWithStock,
    images: images ?? [],
  }
})
