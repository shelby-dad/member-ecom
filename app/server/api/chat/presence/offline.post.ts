import { defineSafeEventHandler } from '~/server/utils/api-error'
import { getProfileOrThrow } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

export default defineSafeEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  const supabase = await getServiceRoleClient(event)
  const offlineAt = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  const { error } = await supabase
    .from('chat_presence')
    .upsert(
      {
        user_id: profile.id,
        last_seen_at: offlineAt,
      },
      { onConflict: 'user_id' },
    )

  if (error)
    throw createError({ statusCode: 500, message: error.message })

  return { ok: true }
})
