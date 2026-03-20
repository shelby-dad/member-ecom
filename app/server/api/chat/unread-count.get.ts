import { getProfileOrThrow } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  const supabase = await getServiceRoleClient(event)

  const { data, error } = await supabase
    .from('chat_messages')
    .select('sender_id, thread:chat_threads!inner(member_id, assigned_to), read_at')
    .is('read_at', null)

  if (error)
    throw createError({ statusCode: 500, message: error.message })

  let unread = 0
  for (const row of data ?? []) {
    const senderId = String((row as any)?.sender_id ?? '')
    const thread = (row as any)?.thread
    const memberId = String(thread?.member_id ?? '')
    const assignedTo = String(thread?.assigned_to ?? '')

    if (profile.role === 'member') {
      if (memberId === profile.id && senderId && senderId !== profile.id)
        unread += 1
      continue
    }

    if (profile.role === 'staff') {
      if (assignedTo === profile.id && senderId === memberId)
        unread += 1
      continue
    }

    if ((profile.role === 'admin' || profile.role === 'superadmin') && senderId === memberId)
      unread += 1
  }

  return { unread }
})
