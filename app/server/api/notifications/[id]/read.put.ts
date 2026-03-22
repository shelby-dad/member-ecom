import { getProfileOrThrow } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  const id = String(getRouterParam(event, 'id') ?? '').trim()
  if (!id)
    throw createError({ statusCode: 400, message: 'Missing notification id.' })

  const supabase = await getServiceRoleClient(event)
  const { data, error } = await supabase
    .from('user_notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', profile.id)
    .select('id, kind, title, message, target_url, payload, is_read, read_at, created_at')
    .maybeSingle()

  if (error)
    throw createError({ statusCode: 500, message: error.message })
  if (!data)
    throw createError({ statusCode: 404, message: 'Notification not found.' })

  return { item: data }
})
