import { getProfileOrThrow } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  const supabase = await getServiceRoleClient(event)

  const { count, error } = await supabase
    .from('user_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', profile.id)
    .eq('is_read', false)

  if (error)
    throw createError({ statusCode: 500, message: error.message })

  return {
    unread: Number(count ?? 0),
  }
})
