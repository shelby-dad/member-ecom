import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['member'])

  const supabase = await getServiceRoleClient(event)
  const { data: existing, error: existingErr } = await supabase
    .from('chat_threads')
    .select('id, member_id, assigned_to, assigned_by, status, banned_by, banned_at, last_message_at, last_message_preview, created_at, updated_at')
    .eq('member_id', profile.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingErr)
    throw createError({ statusCode: 500, message: existingErr.message })

  if (existing)
    return { thread: existing }

  const { data, error } = await supabase
    .from('chat_threads')
    .insert({ member_id: profile.id, status: 'open' })
    .select('id, member_id, assigned_to, assigned_by, status, banned_by, banned_at, last_message_at, last_message_preview, created_at, updated_at')
    .single()

  if (error || !data)
    throw createError({ statusCode: 500, message: error?.message ?? 'Failed to create chat thread.' })

  return { thread: data }
})
