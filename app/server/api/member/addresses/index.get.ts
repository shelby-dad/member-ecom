import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin', 'staff', 'member'])

  const supabase = await getServiceRoleClient(event)
  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', profile.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  if (error)
    throw createError({ statusCode: 500, message: error.message })

  return data ?? []
})
