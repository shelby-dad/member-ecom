import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin', 'staff'])

  const supabase = await getServiceRoleClient(event)
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, status')
    .in('role', ['superadmin', 'admin', 'staff'])
    .eq('status', 'active')
    .order('full_name', { ascending: true })

  if (error)
    throw createError({ statusCode: 500, message: error.message })

  return {
    items: (data ?? []).map((row: any) => ({
      id: row.id,
      full_name: row.full_name,
      email: row.email,
      role: row.role,
    })),
  }
})
