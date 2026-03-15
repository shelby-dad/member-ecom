import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin', 'staff', 'member'])

  const supabase = await getServiceRoleClient(event)
  const { data, error } = await supabase
    .from('promotions')
    .select('id, name, code, description, discount_type, discount_value, min_subtotal, max_discount, starts_at, ends_at')
    .eq('is_active', true)
    .order('name')
  if (error)
    throw createError({ statusCode: 500, message: error.message })
  const now = Date.now()
  return (data ?? []).filter((p: any) => {
    const startsOk = !p.starts_at || new Date(p.starts_at).getTime() <= now
    const endsOk = !p.ends_at || new Date(p.ends_at).getTime() >= now
    return startsOk && endsOk
  })
})
