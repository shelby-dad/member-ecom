import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getSupabasePlatformOverview } from '~/server/services/platform/supabase-overview'

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin'])
  return getSupabasePlatformOverview(event)
})
