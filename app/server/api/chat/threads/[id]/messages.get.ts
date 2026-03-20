import { z } from 'zod'
import { getProfileOrThrow } from '~/server/utils/auth'
import { assertThreadAccess, getThreadOrThrow } from '~/server/utils/chat'
import { getServiceRoleClient } from '~/server/utils/supabase'

const querySchema = z.object({
  limit: z.coerce.number().int().min(10).max(300).default(120),
})

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  const threadId = getRouterParam(event, 'id')
  if (!threadId)
    throw createError({ statusCode: 400, message: 'Missing chat thread id.' })

  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.message })

  const supabase = await getServiceRoleClient(event)
  const thread = await getThreadOrThrow(supabase, threadId)
  assertThreadAccess(profile, thread)

  const now = new Date().toISOString()
  const { error: readErr } = await supabase
    .from('chat_messages')
    .update({ read_at: now })
    .eq('thread_id', threadId)
    .neq('sender_id', profile.id)
    .is('read_at', null)
  if (readErr)
    throw createError({ statusCode: 500, message: readErr.message })

  const { data: messages, error } = await supabase
    .from('chat_messages')
    .select('id, thread_id, sender_id, message, read_at, created_at, attachment_path, attachment_name, attachment_mime_type, attachment_size_bytes')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
    .limit(parsed.data.limit)

  if (error)
    throw createError({ statusCode: 500, message: error.message })

  const senderIds = [...new Set((messages ?? []).map((m: any) => String(m.sender_id)).filter(Boolean))]
  const senderMap = new Map<string, any>()
  if (senderIds.length) {
    const { data: senders, error: sendersErr } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, role')
      .in('id', senderIds)
    if (sendersErr)
      throw createError({ statusCode: 500, message: sendersErr.message })
    for (const sender of senders ?? [])
      senderMap.set(String((sender as any).id), sender)
  }

  return {
    thread,
    items: (messages ?? []).map((message: any) => ({
      ...message,
      sender: senderMap.get(String(message.sender_id)) ?? null,
    })),
  }
})
