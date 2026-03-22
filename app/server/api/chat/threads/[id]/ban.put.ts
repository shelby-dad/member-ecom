import { z } from 'zod'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { assertThreadAccess, getThreadOrThrow } from '~/server/utils/chat'
import { getServiceRoleClient } from '~/server/utils/supabase'
import { notifyUser } from '~/server/services/notifications/user-notifications'

const bodySchema = z.object({
  status: z.enum(['open', 'banned']),
})

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin', 'admin', 'staff'])

  const threadId = getRouterParam(event, 'id')
  if (!threadId)
    throw createError({ statusCode: 400, message: 'Missing chat thread id.' })

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const supabase = await getServiceRoleClient(event)
  const thread = await getThreadOrThrow(supabase, threadId)
  assertThreadAccess(profile, thread)

  const nextStatus = parsed.data.status
  if (nextStatus === 'open' && profile.role !== 'superadmin')
    throw createError({ statusCode: 403, message: 'Only superadmin can unflag a conversation.' })

  const payload = nextStatus === 'banned'
    ? { status: 'banned', banned_at: new Date().toISOString(), banned_by: profile.id }
    : { status: 'open', banned_at: null, banned_by: null }

  const { data, error } = await supabase
    .from('chat_threads')
    .update(payload)
    .eq('id', threadId)
    .select('id, member_id, assigned_to, assigned_by, status, banned_by, banned_at, last_message_at, last_message_preview, created_at, updated_at')
    .single()
  if (error || !data)
    throw createError({ statusCode: 500, message: error?.message ?? 'Failed to update thread status.' })

  if (String(thread.status) !== String(nextStatus)) {
    try {
      const message = nextStatus === 'banned'
        ? 'Your conversation was banned. Please contact the shop'
        : 'Your conversation was unflagged. You can continue chatting with support.'
      await notifyUser(event, {
        user_id: String(thread.member_id),
        actor_id: profile.id,
        kind: nextStatus === 'banned' ? 'chat_banned_to_member' : 'chat_unflagged_to_member',
        title: 'Your chat support',
        message,
        target_url: '/member/chat',
        payload: {
          thread_id: threadId,
          status: nextStatus,
        },
        send_push: true,
        recipient_role: 'member',
        push_title: 'Your chat support',
        push_body: message,
        push_tag: nextStatus === 'banned' ? 'chat-banned-member' : 'chat-unflagged-member',
      })
    }
    catch {
      // Notification is best-effort.
    }
  }

  return { thread: data }
})
