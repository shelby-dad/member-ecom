import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin', 'staff'])

  const supabase = await getServiceRoleClient(event)
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, wallet_balance')
    .eq('role', 'member')
    .eq('status', 'active')
    .order('email')

  if (error)
    throw createError({ statusCode: 500, message: error.message })
  return data ?? []
})
