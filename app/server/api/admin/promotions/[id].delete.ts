import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin'])

  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, message: 'Missing id' })

  const supabase = await getServiceRoleClient(event)
  const { error } = await supabase
    .from('promotions')
    .update({ is_active: false })
    .eq('id', id)

  if (error)
    throw createError({ statusCode: 500, message: error.message })
  return { ok: true }
})

