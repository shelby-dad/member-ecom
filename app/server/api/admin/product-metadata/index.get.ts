import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin', 'staff'])

  const supabase = await getServiceRoleClient(event)
  const [brandsRes, categoriesRes, tagsRes] = await Promise.all([
    supabase.from('brands').select('*').order('name'),
    supabase.from('categories').select('*').order('sort_order').order('name'),
    supabase.from('tags').select('*').order('name'),
  ])

  if (brandsRes.error) throw createError({ statusCode: 500, message: brandsRes.error.message })
  if (categoriesRes.error) throw createError({ statusCode: 500, message: categoriesRes.error.message })
  if (tagsRes.error) throw createError({ statusCode: 500, message: tagsRes.error.message })

  return {
    brands: brandsRes.data ?? [],
    categories: categoriesRes.data ?? [],
    tags: tagsRes.data ?? [],
  }
})

