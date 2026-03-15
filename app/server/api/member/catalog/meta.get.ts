import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin', 'staff', 'member'])

  const supabase = await getServiceRoleClient(event)
  const [brandsRes, categoriesRes, tagsRes, productsRes, variantsRes] = await Promise.all([
    supabase.from('brands').select('id, name').eq('is_active', true).order('name'),
    supabase.from('categories').select('id, name, parent_id').eq('is_active', true).order('sort_order').order('name'),
    supabase.from('tags').select('id, name').order('name'),
    supabase.from('products').select('id, has_variants').eq('is_active', true),
    supabase.from('product_variants').select('product_id, price'),
  ])

  if (brandsRes.error) throw createError({ statusCode: 500, message: brandsRes.error.message })
  if (categoriesRes.error) throw createError({ statusCode: 500, message: categoriesRes.error.message })
  if (tagsRes.error) throw createError({ statusCode: 500, message: tagsRes.error.message })
  if (productsRes.error) throw createError({ statusCode: 500, message: productsRes.error.message })
  if (variantsRes.error) throw createError({ statusCode: 500, message: variantsRes.error.message })

  const productById = Object.fromEntries((productsRes.data ?? []).map((p: any) => [p.id, p])) as Record<string, any>
  let minPrice = Number.POSITIVE_INFINITY
  let maxPrice = 0
  for (const row of (variantsRes.data as any[]) ?? []) {
    const product = productById[row.product_id]
    if (!product) continue
    const price = Number(row.price ?? 0)
    if (product.has_variants && price <= 0) continue
    minPrice = Math.min(minPrice, price)
    maxPrice = Math.max(maxPrice, price)
  }
  if (!Number.isFinite(minPrice)) {
    minPrice = 0
    maxPrice = 0
  }

  return {
    brands: brandsRes.data ?? [],
    categories: categoriesRes.data ?? [],
    tags: tagsRes.data ?? [],
    price_bounds: { min: minPrice, max: maxPrice },
  }
})

