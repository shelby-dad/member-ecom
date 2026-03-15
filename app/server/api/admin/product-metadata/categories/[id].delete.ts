import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin'])

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const supabase = await getServiceRoleClient(event)
  const { data: children } = await supabase
    .from('categories')
    .select('id')
    .eq('parent_id', id)
    .limit(1)

  if ((children ?? []).length > 0)
    throw createError({ statusCode: 409, message: 'Cannot delete category with child categories' })

  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error)
    throw createError({ statusCode: 500, message: error.message })
  return { ok: true }
})

