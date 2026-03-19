import { getProfileOrThrow } from '~/server/utils/auth'
import { getServiceRoleClient } from '~/server/utils/supabase'
import { canMemberSendWhileUnassigned, isOperator } from '~/server/utils/chat'
import { z } from 'zod'

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  offset: z.coerce.number().int().min(0).default(0),
  assignment: z.enum(['all', 'assigned', 'unassigned']).default('all'),
})

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  const parsedQuery = querySchema.safeParse(getQuery(event))
  if (!parsedQuery.success)
    throw createError({ statusCode: 400, message: parsedQuery.error.message })
  const { limit, offset, assignment } = parsedQuery.data
  const supabase = await getServiceRoleClient(event)

  let query = supabase
    .from('chat_threads')
    .select('id, member_id, assigned_to, assigned_by, status, banned_by, banned_at, last_message_at, last_message_preview, created_at, updated_at', { count: 'exact' })
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (profile.role === 'member') {
    query = query.eq('member_id', profile.id)
      .limit(1)
  } else if (profile.role === 'staff') {
    query = query.eq('assigned_to', profile.id)
  } else if (assignment === 'assigned') {
    query = query.not('assigned_to', 'is', null)
  } else if (assignment === 'unassigned') {
    query = query.is('assigned_to', null)
  }

  const { data, error, count } = await query
  if (error)
    throw createError({ statusCode: 500, message: error.message })

  const threads = data ?? []
  const memberMessageCountByThread = new Map<string, number>()
  const lastSenderByThread = new Map<string, string | null>()

  if (profile.role === 'member' && threads.length) {
    const threadIds = threads.map((thread: any) => String(thread.id)).filter(Boolean)
    if (threadIds.length) {
      const { data: memberMessages, error: countErr } = await supabase
        .from('chat_messages')
        .select('thread_id')
        .eq('sender_id', profile.id)
        .in('thread_id', threadIds)
      if (countErr)
        throw createError({ statusCode: 500, message: countErr.message })
      for (const row of memberMessages ?? []) {
        const threadId = String((row as any).thread_id ?? '')
        if (!threadId)
          continue
        memberMessageCountByThread.set(threadId, (memberMessageCountByThread.get(threadId) ?? 0) + 1)
      }
    }

    for (const threadId of threadIds) {
      const { data: lastMessage, error: lastErr } = await supabase
        .from('chat_messages')
        .select('sender_id, created_at')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (lastErr)
        throw createError({ statusCode: 500, message: lastErr.message })
      lastSenderByThread.set(threadId, String((lastMessage as any)?.sender_id ?? '') || null)
    }
  }

  const profileIds = [...new Set(threads.flatMap((thread: any) => [thread.member_id, thread.assigned_to]).filter(Boolean))]
  const profileMap = new Map<string, { id: string; full_name: string | null; email: string | null; avatar_url: string | null; role: string; is_online: boolean; presence_last_seen_at: string | null }>()
  const presenceMap = new Map<string, { isOnline: boolean; lastSeenAt: string | null }>()

  if (profileIds.length) {
    const { data: presenceRows, error: presenceErr } = await supabase
      .from('chat_presence')
      .select('user_id, last_seen_at')
      .in('user_id', profileIds)
    if (presenceErr)
      throw createError({ statusCode: 500, message: presenceErr.message })

    const now = Date.now()
    const onlineWindowMs = 60 * 1000
    for (const row of presenceRows ?? []) {
      const userId = String((row as any).user_id ?? '')
      const lastSeen = String((row as any).last_seen_at ?? '')
      if (!userId || !lastSeen)
        continue
      const delta = now - new Date(lastSeen).getTime()
      presenceMap.set(userId, {
        isOnline: Number.isFinite(delta) && delta >= 0 && delta <= onlineWindowMs,
        lastSeenAt: lastSeen,
      })
    }
  }

  if (profileIds.length) {
    const { data: people, error: peopleErr } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, role')
      .in('id', profileIds)
    if (peopleErr)
      throw createError({ statusCode: 500, message: peopleErr.message })
    for (const person of people ?? []) {
      const id = String((person as any).id ?? '')
      const presence = presenceMap.get(id)
      profileMap.set(id, {
        ...(person as any),
        is_online: presence?.isOnline ?? false,
        presence_last_seen_at: presence?.lastSeenAt ?? null,
      })
    }
  }

  return {
    scope: isOperator(profile) ? 'operator' : 'member',
    total: Number(count ?? threads.length),
    offset,
    limit,
    has_more: profile.role === 'member'
      ? false
      : (offset + threads.length) < Number(count ?? threads.length),
    items: threads.map((thread: any) => ({
      ...thread,
      member_message_count: profile.role === 'member' ? (memberMessageCountByThread.get(String(thread.id)) ?? 0) : null,
      member_can_send: profile.role === 'member'
        ? (Boolean(thread.assigned_to)
            || canMemberSendWhileUnassigned(lastSenderByThread.get(String(thread.id)) ?? null, profile.id))
        : null,
      member: profileMap.get(String(thread.member_id)) ?? null,
      assigned: thread.assigned_to ? (profileMap.get(String(thread.assigned_to)) ?? null) : null,
    })),
  }
})
