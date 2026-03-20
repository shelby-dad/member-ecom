import { z } from 'zod'
import { getProfileOrThrow } from '~/server/utils/auth'
import {
  assertThreadAccess,
  canMemberSendWhileUnassigned,
  buildChatNotificationBody,
  getThreadOrThrow,
  isValidImageAttachmentPath,
  normalizeChatAttachmentMessage,
  normalizeMessagePreviewWithAttachment,
} from '~/server/utils/chat'
import { sendChatPushToRecipients, type ChatPushRecipient } from '~/server/utils/chat-push'
import { getServiceRoleClient } from '~/server/utils/supabase'

const bodySchema = z.object({
  message: z.string().max(2000).optional().default(''),
  attachment_path: z.string().trim().max(500).optional().nullable(),
  attachment_name: z.string().trim().max(255).optional().nullable(),
  attachment_mime_type: z.string().trim().max(100).optional().nullable(),
  attachment_size_bytes: z.coerce.number().int().min(1).max(5 * 1024 * 1024).optional().nullable(),
}).superRefine((input, ctx) => {
  const message = String(input.message ?? '').trim()
  const attachmentPath = String(input.attachment_path ?? '').trim()
  if (!message && !attachmentPath) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Message or attachment is required.',
    })
  }
  if (attachmentPath && !isValidImageAttachmentPath(attachmentPath)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Invalid attachment path.',
      path: ['attachment_path'],
    })
  }
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

  const attachmentPath = String(parsed.data.attachment_path ?? '').trim() || null
  const message = normalizeChatAttachmentMessage(parsed.data.message ?? '', Boolean(attachmentPath))

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      thread_id: threadId,
      sender_id: profile.id,
      message,
      attachment_path: attachmentPath,
      attachment_name: attachmentPath ? (String(parsed.data.attachment_name ?? '').trim() || null) : null,
      attachment_mime_type: attachmentPath ? (String(parsed.data.attachment_mime_type ?? '').trim() || null) : null,
      attachment_size_bytes: attachmentPath ? (parsed.data.attachment_size_bytes ?? null) : null,
    })
    .select('id, thread_id, sender_id, message, read_at, created_at, attachment_path, attachment_name, attachment_mime_type, attachment_size_bytes')
    .single()

  if (error || !data)
    throw createError({ statusCode: 500, message: error?.message ?? 'Failed to send message.' })

  const updatePayload: Record<string, unknown> = {
    last_message_at: data.created_at,
    last_message_preview: normalizeMessagePreviewWithAttachment(message, Boolean(attachmentPath)),
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
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', profile.id)
      .maybeSingle()
    const senderName = String((senderProfile as any)?.full_name ?? '').trim()
      || String((senderProfile as any)?.email ?? '').trim()
      || 'User'
    await sendChatPushToRecipients(event, {
      recipients,
      title: senderName,
      body: buildChatNotificationBody(message, Boolean(attachmentPath)),
      sentAt: String(data.created_at),
      threadId: String(threadId),
    })
  }

  return { item: data }
})
