import { getProfileOrThrow } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  const supabase = await getServiceRoleClient(event)

  const { error } = await supabase
    .from('user_notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('user_id', profile.id)
    .eq('is_read', false)

  if (error)
    throw createError({ statusCode: 500, message: error.message })

  return { ok: true }
})
