import { z } from 'zod'
import { getProfileOrThrow } from '~/server/utils/auth'
import { assertThreadAccess, canMemberSendWhileUnassigned, getThreadOrThrow, normalizeMessagePreview } from '~/server/utils/chat'
import { sendChatPushToRecipients, type ChatPushRecipient } from '~/server/utils/chat-push'
import { getServiceRoleClient } from '~/server/utils/supabase'

const bodySchema = z.object({
  message: z.string().trim().min(1).max(2000),
})

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
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
  if (thread.status === 'banned')
    throw createError({ statusCode: 400, message: 'Conversation is banned.' })

  // Security rule for unassigned conversation:
  // Member can send when:
  // - there is no previous message yet, or
  // - last message was sent by an operator.
  // Member cannot send consecutive messages while unassigned.
  if (profile.role === 'member' && !thread.assigned_to) {
    const { data: lastMessage, error: lastMessageErr } = await supabase
      .from('chat_messages')
      .select('sender_id, created_at')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (lastMessageErr)
      throw createError({ statusCode: 500, message: lastMessageErr.message })
    const canSend = canMemberSendWhileUnassigned(String(lastMessage?.sender_id ?? '') || null, profile.id)
    if (!canSend) {
      throw createError({
        statusCode: 403,
        message: 'Conversation is currently unassigned. Please wait for shop reply or assignment.',
      })
    }
  }

  const message = parsed.data.message.trim()

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      thread_id: threadId,
      sender_id: profile.id,
      message,
    })
    .select('id, thread_id, sender_id, message, read_at, created_at')
    .single()

  if (error || !data)
    throw createError({ statusCode: 500, message: error?.message ?? 'Failed to send message.' })

  const updatePayload: Record<string, unknown> = {
    last_message_at: data.created_at,
    last_message_preview: normalizeMessagePreview(message),
  }
  if ((profile.role === 'staff' || profile.role === 'admin' || profile.role === 'superadmin') && !thread.assigned_to)
    updatePayload.assigned_to = profile.id

  const { error: threadUpdateErr } = await supabase
    .from('chat_threads')
    .update(updatePayload)
    .eq('id', threadId)
  if (threadUpdateErr)
    throw createError({ statusCode: 500, message: threadUpdateErr.message })

  const recipients: ChatPushRecipient[] = []
  if (profile.role === 'member') {
    if (thread.assigned_to) {
      const { data: assignedProfile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', thread.assigned_to)
        .maybeSingle()
      if (assignedProfile?.id && ['staff', 'admin', 'superadmin'].includes(String((assignedProfile as any).role))) {
        recipients.push({
          id: String((assignedProfile as any).id),
          role: String((assignedProfile as any).role) as ChatPushRecipient['role'],
        })
      }
    } else {
      const { data: operators } = await supabase
        .from('profiles')
        .select('id, role')
        .in('role', ['staff', 'admin', 'superadmin'])
        .eq('status', 'active')
      for (const operator of operators ?? []) {
        recipients.push({
          id: String((operator as any).id),
          role: String((operator as any).role) as ChatPushRecipient['role'],
        })
      }
    }
  } else {
    recipients.push({
      id: String(thread.member_id),
      role: 'member',
    })
  }

  if (recipients.length) {
    await sendChatPushToRecipients(event, {
      recipients,
      title: profile.role === 'member' ? 'New member message' : 'Shop message',
      body: message.slice(0, 160),
    })
  }

  return { item: data }
})
