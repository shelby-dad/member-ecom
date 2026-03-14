import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin'])

  const supabase = await getServiceRoleClient(event)
  const { data: products, error } = await supabase.from('products').select('*').order('created_at', { ascending: false })
  if (error)
    throw createError({ statusCode: 500, message: error.message })

  const list = products ?? []
  if (list.length === 0)
    return list

  const ids = list.map((p: { id: string }) => p.id)
  const [varRes, imgRes] = await Promise.all([
    supabase.from('product_variants').select('product_id').in('product_id', ids),
    supabase.from('product_images').select('product_id').in('product_id', ids),
  ])
  const variantCount: Record<string, number> = {}
  const imageCount: Record<string, number> = {}
  for (const v of varRes.data ?? [])
    variantCount[v.product_id] = (variantCount[v.product_id] ?? 0) + 1
  for (const i of imgRes.data ?? [])
    imageCount[i.product_id] = (imageCount[i.product_id] ?? 0) + 1

  return list.map((p: any) => ({
    ...p,
    variant_count: variantCount[p.id] ?? 0,
    image_count: imageCount[p.id] ?? 0,
  }))
})
